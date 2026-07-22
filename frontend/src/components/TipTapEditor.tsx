import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
import { Bold, Italic, List, ListOrdered, Undo, Redo } from 'lucide-react';

interface TipTapEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function TipTapEditor({ value, onChange }: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none text-slate-200 tiptap p-3 border border-slate-700 bg-slate-900/50 rounded-lg min-h-[200px] outline-none focus:border-brand-500 transition-colors',
      },
    },
  });

  // Sync content from outside
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);


  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-col w-full border border-slate-700/80 bg-slate-950/40 rounded-xl overflow-hidden focus-within:border-brand-500/50 transition-colors">
      {/* Menu Bar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-700/80 bg-slate-900/80 p-2 text-slate-400">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors ${editor.isActive('bold') ? 'bg-slate-800 text-brand-500' : ''}`}
          title="Bold"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors ${editor.isActive('italic') ? 'bg-slate-800 text-brand-500' : ''}`}
          title="Italic"
        >
          <Italic size={16} />
        </button>
        <div className="w-px h-5 bg-slate-800 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors ${editor.isActive('bulletList') ? 'bg-slate-800 text-brand-500' : ''}`}
          title="Bullet List"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors ${editor.isActive('orderedList') ? 'bg-slate-800 text-brand-500' : ''}`}
          title="Numbered List"
        >
          <ListOrdered size={16} />
        </button>
        <div className="w-px h-5 bg-slate-800 mx-1" />
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors disabled:opacity-40"
          title="Undo"
        >
          <Undo size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors disabled:opacity-40"
          title="Redo"
        >
          <Redo size={16} />
        </button>
      </div>

      {/* Editor Content Area */}
      <EditorContent editor={editor} />
    </div>
  );
}
