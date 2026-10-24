'use client'

import { useEffect, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import ImageExt from '@tiptap/extension-image'
import LinkExt from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Typography from '@tiptap/extension-typography'
import CharacterCount from '@tiptap/extension-character-count'
import Youtube from '@tiptap/extension-youtube'
import { EditorToolbar } from './EditorToolbar'
import { SlashMenu } from './SlashMenu'

interface Props {
  content: string
  onChange: (html: string, text: string) => void
  editable?: boolean
}

export function BlockEditor({ content, onChange, editable = true }: Props) {
  const extensions = useMemo(() => ([
    StarterKit.configure({
      heading: { levels: [2, 3] },
      codeBlock: { HTMLAttributes: { class: 'code-block' } },
      bulletList: { HTMLAttributes: { class: 'list-disc pl-6' } },
      orderedList: { HTMLAttributes: { class: 'list-decimal pl-6' } },
      blockquote: { HTMLAttributes: { class: 'border-l-2 border-zinc-700 pl-4 italic text-zinc-400' } },
    }),
    Underline,
    Typography,
    Placeholder.configure({
      placeholder: ({ node, pos, editor }: any) => {
        if (node.type.name === 'heading') return 'Heading'
        // Only show the long placeholder on the first paragraph
        if (pos === 0) {
          return "Tell builders what you're building, why it matters, and who you're looking for.\nBe as detailed as you want.  Type / to insert blocks (headings, lists, quotes, images, videos, and more)."
        }
        return ''
      },
      showOnlyWhenEditable: true,
      showOnlyCurrent: false,
      includeChildren: true,
    }),
    ImageExt.configure({
      HTMLAttributes: { class: 'rounded-lg my-4 max-w-full' },
    }),
    LinkExt.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'text-blue-400 underline hover:text-blue-300' },
    }),
    TaskList.configure({ HTMLAttributes: { class: 'space-y-1 not-prose' } }),
    TaskItem.configure({ nested: true, HTMLAttributes: { class: 'flex items-start gap-2' } }),
    Youtube.configure({
      HTMLAttributes: { class: 'w-full aspect-video rounded-lg my-4' },
      controls: true,
      nocookie: true,
    }),
    CharacterCount,
  ]), [])

  const editor = useEditor({
    extensions,
    content: content || '',
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[520px] prose prose-invert prose-zinc max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-h2:text-[26px] prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-[20px] prose-h3:mt-7 prose-h3:mb-3 prose-p:text-[16px] prose-p:leading-[1.75] prose-p:text-zinc-200 prose-p:my-3.5 prose-li:text-[15.5px] prose-li:text-zinc-200 prose-li:my-1 prose-strong:text-white prose-code:text-blue-300 prose-code:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[14px] prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML(), editor.getText())
    },
  })

  useEffect(() => {
    if (!editor) return
    if (content && content !== editor.getHTML()) {
      editor.commands.setContent(content, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, editor])

  if (!editor) return null

  const wordCount = editor.storage.characterCount?.words?.() ?? 0
  const charCount = editor.storage.characterCount?.characters?.() ?? 0

  return (
    <div className="w-full">
      <EditorToolbar editor={editor} />
      <div className="mt-4 relative">
        <EditorContent editor={editor} />
        <SlashMenu editor={editor} />
      </div>
      <div className="mt-8 pt-4 border-t border-zinc-800/60 text-[11.5px] text-zinc-600 font-mono">
        {wordCount} words · {charCount} characters
      </div>
    </div>
  )
}
