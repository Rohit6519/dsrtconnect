'use client'

import { Editor } from '@tiptap/react'
import {
  TextB, TextItalic, TextUnderline, TextStrikethrough, Code,
  ListBullets, ListNumbers, ListChecks, Quotes, Link as LinkIcon,
  Image as ImageIcon, VideoCamera, TextHOne, TextHTwo, Minus,
} from '@phosphor-icons/react'

interface Props {
  editor: Editor
}

export function EditorToolbar({ editor }: Props) {
  if (!editor) return null

  const addLink = () => {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('Enter URL', prev || 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url, target: '_blank' }).run()
  }

  const addImage = () => {
    const url = window.prompt('Image URL')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  const addYoutube = () => {
    const url = window.prompt('YouTube URL')
    if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run()
  }

  return (
    <div className="flex items-center gap-0.5 py-2 flex-wrap border-b border-zinc-800/60">
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        label="Heading 2"
      >
        <TextHOne size={15} />
        <span className="text-[12px] font-bold">H2</span>
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        label="Heading 3"
      >
        <TextHTwo size={15} />
        <span className="text-[12px] font-bold">H3</span>
      </ToolButton>

      <Divider />

      <ToolButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        label="Bold (Ctrl+B)"
      >
        <TextB size={16} weight="bold" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        label="Italic (Ctrl+I)"
      >
        <TextItalic size={16} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive('underline')}
        label="Underline (Ctrl+U)"
      >
        <TextUnderline size={16} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        label="Strikethrough"
      >
        <TextStrikethrough size={16} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        label="Inline code"
      >
        <Code size={16} />
      </ToolButton>

      <Divider />

      <ToolButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        label="Bulleted list"
      >
        <ListBullets size={16} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        label="Numbered list"
      >
        <ListNumbers size={16} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive('taskList')}
        label="Checklist"
      >
        <ListChecks size={16} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        label="Quote"
      >
        <Quotes size={16} />
      </ToolButton>

      <Divider />

      <ToolButton onClick={addLink} active={editor.isActive('link')} label="Link (Ctrl+K)">
        <LinkIcon size={16} />
      </ToolButton>
      <ToolButton onClick={addImage} label="Image">
        <ImageIcon size={16} />
      </ToolButton>
      <ToolButton onClick={addYoutube} label="YouTube video">
        <VideoCamera size={16} />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        label="Divider"
      >
        <Minus size={16} />
      </ToolButton>
    </div>
  )
}

function ToolButton({
  children, onClick, active, label,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={
        'inline-flex items-center gap-1 h-9 min-w-[36px] px-2 rounded-md transition-colors ' +
        (active
          ? 'bg-zinc-800 text-white'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-900')
      }
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-zinc-800 mx-1.5" />
}
