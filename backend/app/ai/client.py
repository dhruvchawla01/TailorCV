import base64
from typing import List, Optional
from pydantic import BaseModel, Field
from openai import AsyncOpenAI
from app.config import settings
from app.schemas import (
    ResumeSchema, JDExtractedSchema, ATSEvaluationSchema, 
    ContactInfoSchema, ExperienceSchema, ProjectSchema, 
    SkillSchema, CertificationSchema, AchievementSchema,
    ATSChecklistItem, KeywordGroupSchema, MissingKeywordCategorized,
    RewriteSuggestion, RecommendationItem, SectionScoreItem,
    RedundancyCheckItem, ValidationFlag
)

class AIClient:
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        if self.api_key:
            self.client = AsyncOpenAI(api_key=self.api_key)
        else:
            self.client = None

    def is_configured(self) -> bool:
        return self.client is not None

    async def parse_resume_text(self, text: str) -> ResumeSchema:
        if not self.is_configured():
            return self._get_mock_resume("Parsed from PDF Text (Local Mock)")

        prompt = f"""
        You are an expert resume parsing engine. Analyze the following raw text from a resume and extract the contact info, professional summary, work experience, projects, skills, certifications, and achievements into the specified JSON format.
        Do not truncate details, keep descriptions accurate to the text.
        
        Raw Text:
        {text}
        """
        
        response = await self.client.beta.chat.completions.parse(
            model=settings.OPENAI_PARSER_MODEL,
            messages=[
                {"role": "system", "content": "You are a professional resume parser."},
                {"role": "user", "content": prompt}
            ],
            response_format=ResumeSchema
        )
        return response.choices[0].message.parsed

    async def parse_resume_image(self, image_bytes: bytes, mime_type: str) -> ResumeSchema:
        if not self.is_configured():
            return self._get_mock_resume("Parsed from Screenshot (Local Mock)")

        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        
        response = await self.client.beta.chat.completions.parse(
            model=settings.OPENAI_TAILOR_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": "You are a professional resume parsing engine that processes resume images."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract all fields from this resume image into the structured schema."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            response_format=ResumeSchema
        )
        return response.choices[0].message.parsed

    async def analyze_job_description(self, raw_jd: str) -> JDExtractedSchema:
        if not self.is_configured():
            return JDExtractedSchema(
                job_title="Software Engineer (Local Mock)",
                company="MockTech Corp",
                responsibilities=["Develop web services", "Collaborate with product teams", "Optimize DB queries"],
                required_skills=["Python", "FastAPI", "React", "TypeScript"],
                preferred_skills=["Docker", "AWS", "PostgreSQL"],
                keywords=["FastAPI", "React", "PostgreSQL", "REST API"],
                experience_level="Mid-Level (3-5 years)",
                certifications=["AWS Certified Solutions Architect"],
                soft_skills=["Communication", "Teamwork", "Problem Solving"]
            )

        prompt = f"""
        Analyze the job description below. Extract the job title, company, key responsibilities, required skills, preferred skills, keywords for ATS, required experience level, certifications, and soft skills.
        
        Job Description:
        {raw_jd}
        """

        response = await self.client.beta.chat.completions.parse(
            model=settings.OPENAI_PARSER_MODEL,
            messages=[
                {"role": "system", "content": "You are a specialized recruiter and technical job analyzer."},
                {"role": "user", "content": prompt}
            ],
            response_format=JDExtractedSchema
        )
        return response.choices[0].message.parsed

    async def tailor_resume(self, profile_data: dict, parsed_jd: dict) -> ResumeSchema:
        if not self.is_configured():
            # Return same profile with slightly re-written title/summary for mock purposes
            experiences = [ExperienceSchema(**exp) for exp in profile_data.get("experiences", [])]
            projects = [ProjectSchema(**proj) for proj in profile_data.get("projects", [])]
            education = [EducationSchema(**edu) for edu in profile_data.get("education", [])]
            skills = [SkillSchema(**s) for s in profile_data.get("skills", [])]
            certifications = [CertificationSchema(**c) for c in profile_data.get("certifications", [])]
            achievements = [AchievementSchema(**a) for a in profile_data.get("achievements", [])]
            
            return ResumeSchema(
                contact_info=ContactInfoSchema(**profile_data.get("contact_info", {})),
                summary="[Tailored Summary Mock] An experienced engineer with proven track record in Python and React, matching the target position.",
                experiences=experiences,
                projects=projects,
                education=education,
                skills=skills,
                certifications=certifications,
                achievements=achievements
            )

        prompt = f"""
        You are an expert resume tailoring assistant. You will take the user's Master Profile (source of truth) and customize it for a target Job Description.
        
        CRITICAL RULES:
        1. Maintain factual accuracy. NEVER invent experiences, projects, dates, degrees, certifications, or bullet points.
        2. Focus on rephrasing and optimization. Rewrite descriptions, summaries, and projects to align with the target job's language, keywords, and requirements.
        3. Prioritize relevant achievements. If certain projects or experiences are highly relevant, elaborate on them using facts from the master profile.
        4. Reorder skills so that the skills matching the job description appear first.
        5. Return the customized profile in the structured ResumeSchema format.

        Master Profile:
        {profile_data}
        
        Target Job Details:
        {parsed_jd}
        """

        response = await self.client.beta.chat.completions.parse(
            model=settings.OPENAI_TAILOR_MODEL,
            messages=[
                {"role": "system", "content": "You are a professional ATS-optimizing resume tailor. You help highlight the candidate's actual matching accomplishments without fabricating any facts."},
                {"role": "user", "content": prompt}
            ],
            response_format=ResumeSchema
        )
        return response.choices[0].message.parsed

    async def evaluate_ats(self, tailored_resume: dict, parsed_jd: dict) -> ATSEvaluationSchema:
        if not self.is_configured():
            mock_eval = ATSEvaluationSchema(
                ats_compliance_score=95,
                job_match_score=85,
                content_quality_score=80,
                writing_quality_score=90,
                # overall_score will be computed deterministically below
                ats_compliance_explanation="Calculated by checking standard structural indicators, layout simplicity, and font readability. It evaluates parsability and excludes keyword mismatch deductions.",
                job_match_explanation="Calculated by measuring keyword overlap, required and preferred skills match, and tech stack alignment.",
                content_quality_explanation="Calculated by assessing achievement quantification, metrics usage, and technical scope depth.",
                writing_quality_explanation="Calculated by checking for active verb usage, redundancy, grammar issues, and formatting consistency.",
                compliance_checklist=[
                    ATSChecklistItem(check_name="Standard Section Headings", passed=True, details="Found Experience, Education, Projects, and Skills."),
                    ATSChecklistItem(check_name="Contact Info Present", passed=True, details="Name, email, and phone coordinates are valid."),
                    ATSChecklistItem(check_name="Single Column Layout", passed=True, details="No sidebars or complex column overlays detected."),
                    ATSChecklistItem(check_name="No Tables or Text Boxes", passed=True, details="Document layout uses standard block formatting."),
                    ATSChecklistItem(check_name="Consistent Date Formatting", passed=True, details="Dates are consistently formatted as YYYY-MM or Present.")
                ],
                keyword_coverage_groups=[
                    KeywordGroupSchema(
                        category="Programming Languages",
                        required_keywords=["Python", "TypeScript", "JavaScript"],
                        matched_keywords=["Python", "TypeScript"],
                        missing_keywords=["JavaScript"],
                        percentage=66
                    ),
                    KeywordGroupSchema(
                        category="Frameworks & Databases",
                        required_keywords=["FastAPI", "React", "PostgreSQL"],
                        matched_keywords=["FastAPI", "React"],
                        missing_keywords=["PostgreSQL"],
                        percentage=66
                    ),
                    KeywordGroupSchema(
                        category="DevOps & Cloud",
                        required_keywords=["Docker", "AWS"],
                        matched_keywords=[],
                        missing_keywords=["Docker", "AWS"],
                        percentage=0
                    )
                ],
                missing_keywords_categorized=MissingKeywordCategorized(
                    critical=["JavaScript", "PostgreSQL"],
                    recommended=["AWS"],
                    contextual=["Docker"]
                ),
                strengths=[
                    "Excellent core programming language match with Python and TypeScript.",
                    "Consistent bullet structure with action-driven metrics.",
                    "Clean single-column formatting which is highly machine-readable."
                ],
                recommendations=[
                    RecommendationItem(
                        priority="high",
                        reason="Missing critical database framework (PostgreSQL) required for backend operations.",
                        expected_impact="High probability of passing automated database engineering screens.",
                        suggested_action="Incorporate PostgreSQL database expertise under your projects if applicable.",
                        one_click_fix_type="none"
                    ),
                    RecommendationItem(
                        priority="medium",
                        reason="Passive description found in experience bullet point.",
                        expected_impact="Improves content score and technical ownership representation.",
                        suggested_action="Convert passive responsibility descriptors to active metrics.",
                        one_click_fix_type="apply_rewrite",
                        target_rewrite_id="rew-exp-0-0"
                    )
                ],
                rewrite_suggestions=[
                    RewriteSuggestion(
                        suggestion_id="rew-exp-0-0",
                        section_type="experience",
                        item_index=0,
                        bullet_index=0,
                        original_text="Was responsible for developing microservices handling transaction payments.",
                        suggested_text="Architected and deployed high-throughput payment microservices handling 10k+ daily transactions.",
                        explanation="Employs strong action verb 'Architected' and details quantifiable achievements."
                    )
                ],
                section_scores=[
                    SectionScoreItem(
                        section_name="Summary",
                        score=95,
                        strengths=["Concise, ATS-friendly paragraph style."],
                        weaknesses=[],
                        suggestions=[]
                    ),
                    SectionScoreItem(
                        section_name="Experience",
                        score=85,
                        strengths=["Good use of key achievements and project context."],
                        weaknesses=["Minor passive tone in early bullets."],
                        suggestions=["Use the provided one-click rewrite suggestion for your first position."]
                    ),
                    SectionScoreItem(
                        section_name="Skills",
                        score=90,
                        strengths=["Categorized skills make indexing simple."],
                        weaknesses=[],
                        suggestions=[]
                    )
                ],
                strongest_section="Summary",
                weakest_section="Experience",
                seniority_estimate="Senior (5+ years)",
                recruiter_match_estimate="Strong Match (87%)",
                redundancy_checks=[
                    RedundancyCheckItem(
                        type="repeated_technology",
                        content="React is listed redundantly across several bullets.",
                        suggestion="Consolidate technology keywords in descriptions to avoid keyword stuffing flags."
                    )
                ],
                profile_validation_flags=[
                    ValidationFlag(
                        severity="warning",
                        field="skills",
                        unsupported_statement="Docker is listed in skills.",
                        suggested_fix="The master profile does not show Docker. Your profile currently does not demonstrate Docker experience."
                    )
                ]
            )
            # Calculate overall score: 30% ATS, 40% Job Match, 20% Content, 10% Writing
            mock_eval.overall_score = int(
                mock_eval.ats_compliance_score * 0.3 +
                mock_eval.job_match_score * 0.4 +
                mock_eval.content_quality_score * 0.2 +
                mock_eval.writing_quality_score * 0.1
            )
            return mock_eval

        prompt = f"""
        You are a professional ATS and resume performance auditor. Evaluate the tailored resume against the target parsed job description.
        
        Tailored Resume:
        {tailored_resume}
        
        Target Job Description:
        {parsed_jd}

        Evaluate the resume across 4 independent dimensions, returning a score (0-100) for each:
        1. ATS Compliance: Score ONLY layout, structure, and formatting. Do not deduct points because of missing keywords. Checks must include: standard headings, contact info, machine-readable text, single-column layout, chronological order, date formatting, no tables/icons/text boxes/sidebars, proper spacing. Return a pass/fail checklist of these checks.
        2. Job Match: Compare the tailored resume against the job description. Score based on matched vs missing keywords, required skills coverage, responsibilities coverage, and tech stack overlap.
           Categorize missing keywords into:
           - critical: required technologies, skills, or certifications in the JD.
           - recommended: nice-to-have, preferred tools, or frameworks in the JD.
           - contextual: industry terminology or domain-specific phrases in the JD.
        3. Content Quality: Score based on achievement quantification (percentages, metrics), business impact, technical depth, ownership, and leadership.
        4. Writing Quality: Score based on grammar, readability, action verbs, active voice, sentence length, and redundancy.

        CRITICAL CONSTRAINTS:
        - NEVER suggest adding skills or experiences the user does not have. If a missing keyword is not in their profile, recommend: "This role values [Keyword]. Your profile currently does not demonstrate [Keyword] experience."
        - Identify resume strengths (quantified accomplishments, action verbs, cloud/production scale, clear format).
        - Prioritize recommendations by priority ('high', 'medium', 'low') with fields: reason, expected_impact, suggested_action, one_click_fix_type, target_rewrite_id.
        - Generate dynamic AI Rewrite Suggestions for bullet points (max 3 suggestions). Link each to a recommendation using 'target_rewrite_id'. Specify 'suggestion_id', 'section_type' (summary, experience, or project), 'item_index', 'bullet_index' (if experience/project), 'original_text', 'suggested_text', and 'explanation'.
        - Provide scores (0-100), strengths, and weaknesses for each section (Summary, Experience, Projects, Skills, Education, etc.).
        - Detect redundancy (repeated bullets, overused phrases, repeated projects).
        - Cross-reference statements against the user's master profile. Flag any unsupported statements or fabricated facts as warning/error validation flags.

        Ensure that the entire response strictly conforms to the ATSEvaluationSchema.
        """

        response = await self.client.beta.chat.completions.parse(
            model=settings.OPENAI_PARSER_MODEL,
            messages=[
                {"role": "system", "content": "You are a professional resume optimization advisor and ATS auditor."},
                {"role": "user", "content": prompt}
            ],
            response_format=ATSEvaluationSchema
        )
        evaluation = response.choices[0].message.parsed
        
        # Calculate overall score: 30% ATS, 40% Job Match, 20% Content, 10% Writing
        evaluation.overall_score = int(
            evaluation.ats_compliance_score * 0.3 +
            evaluation.job_match_score * 0.4 +
            evaluation.content_quality_score * 0.2 +
            evaluation.writing_quality_score * 0.1
        )
        return evaluation

    async def generate_cover_letter(self, profile_data: dict, parsed_jd: dict) -> str:
        if not self.is_configured():
            name = profile_data.get("contact_info", {}).get("name", "John Doe")
            company = parsed_jd.get("company", "Target Company")
            title = parsed_jd.get("job_title", "Software Engineer")
            return f"""Dear Hiring Manager at {company},

I am writing to express my strong interest in the {title} position. Based on my background in building backend and frontend applications, I am confident I will bring immediate value to your team.

My profile demonstrates a track record of developing scalable applications and driving development cycles. I look forward to discussing how my skills align with your expectations.

Sincerely,
{name}"""

        prompt = f"""
        Write a professional, compelling, and customized cover letter for a job application.
        Use details from the Candidate's Resume to address the requirements in the target Job Description.
        Maintain a confident and matching tone, emphasizing why the candidate's achievements fit this role.
        Keep the response strictly to the written cover letter (plain text).
        
        Candidate's Resume/Profile:
        {profile_data}
        
        Target Job Details:
        {parsed_jd}
        """

        response = await self.client.chat.completions.create(
            model=settings.OPENAI_TAILOR_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert cover letter writer. Create professional letters that directly map skills to roles."},
                {"role": "user", "content": prompt}
            ]
        )
        return response.choices[0].message.content

    async def regenerate_bullet_points(self, bullet: str, job_desc: str, instructions: str = "") -> List[str]:
        if not self.is_configured():
            return [
                f"{bullet} - optimized to match job description keywords",
                f"Successfully utilized key skills to deliver {bullet.lower()}",
                f"Led efforts resulting in achievement of key metrics: {bullet.lower()}"
            ]

        prompt = f"""
        Rewrite the following resume bullet point to make it more professional, highlight achievements, incorporate relevant keywords from the job description, and use action verbs.
        Generate 3 distinct, high-quality variations. Keep the core facts identical; do not fabricate achievements.
        
        Original Bullet:
        {bullet}
        
        Job Description context:
        {job_desc}
        
        Additional candidate instructions:
        {instructions}
        """

        class BulletList(BaseModel):
            variations: List[str] = Field(..., min_items=3, max_items=3)

        response = await self.client.beta.chat.completions.parse(
            model=settings.OPENAI_PARSER_MODEL,
            messages=[
                {"role": "system", "content": "You are a professional resume writer and copyeditor."},
                {"role": "user", "content": prompt}
            ],
            response_format=BulletList
        )
        return response.choices[0].message.parsed.variations

    def _get_mock_resume(self, source_label: str) -> ResumeSchema:
        return ResumeSchema(
            contact_info=ContactInfoSchema(
                name="John Doe",
                email="john.doe@example.com",
                phone="+1 (555) 123-4567",
                location="San Francisco, CA",
                website="https://johndoe.dev",
                linkedin="https://linkedin.com/in/johndoe",
                github="https://github.com/johndoe"
            ),
            summary=f"Experienced Software Engineer with a passion for building scalable web apps. ({source_label})",
            experiences=[
                ExperienceSchema(
                    company="Tech Innovations Inc.",
                    position="Senior Developer",
                    location="San Francisco, CA",
                    start_date="2021-06",
                    end_date="Present",
                    description_bullets=[
                        "Architected and deployed microservices handling 10k+ daily transactions.",
                        "Mentored 5 junior engineers and improved team shipping velocity by 25%."
                    ],
                    current=True
                )
            ],
            projects=[
                ProjectSchema(
                    title="Portfolio Builder Platform",
                    role="Creator / Solo Developer",
                    description_bullets=[
                        "Built a custom resume tailor engine that integrates with multiple systems."
                    ],
                    technologies=["Python", "FastAPI", "React", "SQLite"],
                    link="https://github.com/johndoe/portfolio"
                )
            ],
            skills=[
                SkillSchema(name="Python", category="Backend"),
                SkillSchema(name="FastAPI", category="Backend"),
                SkillSchema(name="React", category="Frontend"),
                SkillSchema(name="TypeScript", category="Frontend")
            ],
            certifications=[
                CertificationSchema(name="AWS Certified Developer", issuer="Amazon Web Services", date="2023-08")
            ],
            achievements=[
                AchievementSchema(title="Hackathon Winner", description="Won 1st place in the TechCrunch hackathon.", date="2022-10")
            ]
        )

ai_client = AIClient()
