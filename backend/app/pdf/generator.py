import os
import sys
import jinja2
import asyncio
import threading
from playwright.async_api import async_playwright

class PDFGenerator:
    def __init__(self):
        self.template_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")
        os.makedirs(self.template_dir, exist_ok=True)
        self.env = jinja2.Environment(loader=jinja2.FileSystemLoader(self.template_dir))

    async def _generate_pdf_raw(self, html_content: str) -> bytes:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-setuid-sandbox"]
            )
            context = await browser.new_context()
            page = await context.new_page()
            await page.set_content(html_content)
            await page.wait_for_load_state("networkidle")
            
            pdf_bytes = await page.pdf(
                format="Letter",
                print_background=True,
                margin={
                    "top": "0.5in",
                    "bottom": "0.5in",
                    "left": "0.5in",
                    "right": "0.5in"
                }
            )
            await browser.close()
            return pdf_bytes

    async def generate_pdf_from_html(self, html_content: str) -> bytes:
        # If not running on Windows, we can use the default event loop
        if sys.platform != "win32":
            return await self._generate_pdf_raw(html_content)

        # On Windows, we run Playwright in a separate thread with a ProactorEventLoop
        # to bypass the SelectorEventLoop restriction forced by Uvicorn reloading.
        result_holder = []
        
        def thread_target():
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                pdf_bytes = loop.run_until_complete(self._generate_pdf_raw(html_content))
                result_holder.append(pdf_bytes)
            except Exception as e:
                result_holder.append(e)
            finally:
                loop.close()

        thread = threading.Thread(target=thread_target)
        thread.start()
        
        while thread.is_alive():
            await asyncio.sleep(0.05)
            
        if not result_holder:
            raise RuntimeError("PDF generation thread exited without a result.")
            
        result = result_holder[0]
        if isinstance(result, Exception):
            raise result
            
        return result

    async def generate_resume_pdf(self, resume_data: dict) -> bytes:
        template = self.env.get_template("resume.html")
        html_content = template.render(resume=resume_data)
        return await self.generate_pdf_from_html(html_content)

    async def generate_cover_letter_pdf(self, cover_letter_text: str, contact_info: dict) -> bytes:
        import datetime
        date_str = datetime.date.today().strftime("%B %d, %Y")
        template = self.env.get_template("cover_letter.html")
        html_content = template.render(
            cover_letter_text=cover_letter_text,
            contact_info=contact_info,
            date_str=date_str
        )
        return await self.generate_pdf_from_html(html_content)

pdf_generator = PDFGenerator()
