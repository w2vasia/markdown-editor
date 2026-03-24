'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { updateDocument } from '@/actions/documents'
import { debounce } from '@/lib/utils'

interface TipTapEditorProps {
  documentId: string
  initialTitle: string
  initialContent: string
}

export function TipTapEditor({
  documentId,
  initialTitle,
  initialContent,
}: TipTapEditorProps) {
  const titleRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'max-w-none min-h-[60vh] focus:outline-none p-4',
      },
    },
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const save = useCallback(
    debounce(async (title: string, markdown: string) => {
      await updateDocument(
        documentId,
        { title, updated_at: new Date().toISOString() },
        markdown
      )
    }, 1000),
    [documentId]
  )

  useEffect(() => {
    if (!editor) return
    const handler = () => {
      const markdown = editor.getMarkdown()
      const title = titleRef.current?.value ?? 'Untitled'
      save(title, markdown)
    }
    editor.on('update', handler)
    return () => { editor.off('update', handler) }
  }, [editor, save])

  return (
    <div className="space-y-4">
      <input
        ref={titleRef}
        defaultValue={initialTitle}
        onChange={() => {
          const markdown = editor?.getMarkdown() ?? ''
          save(titleRef.current?.value ?? 'Untitled', markdown)
        }}
        placeholder="Document title"
        className="w-full text-3xl font-bold border-none outline-none bg-transparent placeholder:text-muted-foreground"
      />
      <div className="border rounded-lg overflow-hidden">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
