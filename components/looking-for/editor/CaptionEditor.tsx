'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import LinkExt from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import { useEffect } from 'react'
import {
  TextB, TextItalic, TextUnderline, Link as LinkIcon, TextStrikethrough,
} from '@phosphor-icons/react'

interface Props {
  value: string
  valueHtml: string
  onChange: (text: string, html: string) => void
  placeholder?: string
}

export function CaptionEditor({ value, valueHtml, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
      }),
      Underline,
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-400 underline' },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Write a caption...',
      }),
    ],
    content: valueHtml || value || '',
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[70px] max-h-[240px] overflow-y-auto text-[13px] text-zinc-200 leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getText(), editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && valueHtml && valueHtml !== editor.getHTML()) {
      editor.commands.setContent(valueHtml, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueHtml, editor])

  if (!editor) return null

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-zinc-800/60">
        <TinyBtn active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold">
          <TextB size={11} weight="bold" />
        </TinyBtn>
        <TinyBtn active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic">
          <TextItalic size={11} />
        </TinyBtn>
        <TinyBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Underline">
          <TextUnderline size={11} />
        </TinyBtn>
        <TinyBtn active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strikethrough">
          <TextStrikethrough size={11} />
        </TinyBtn>
        <TinyBtn
          active={editor.isActive('link')}
          onClick={() => {
            const url = window.prompt('URL', editor.getAttributes('link').href || 'https://')
            if (url === null) return
            if (url === '') editor.chain().focus().unsetLink().run()
            else editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run()
          }}
          label="Link"
        >
          <LinkIcon size={11} />
        </TinyBtn>
      </div>
      <div className="px-2.5 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

function TinyBtn({
  children, active, onClick, label,
}: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={
        'inline-flex items-center justify-center w-6 h-6 rounded transition-colors ' +
        (active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900')
      }
    >
      {children}
    </button>
  )
}
