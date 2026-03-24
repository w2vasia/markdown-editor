'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
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
  const documentIdRef = useRef(documentId)
  // eslint-disable-next-line react-hooks/refs
  documentIdRef.current = documentId

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Markdown],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'max-w-none min-h-[60vh] focus:outline-none p-4',
      },
    },
  })

  /* eslint-disable react-hooks/refs */
  const saveRef = useRef(
    debounce(async (title: string, markdown: string) => {
      try {
        await updateDocument(
          documentIdRef.current,
          { title, updated_at: new Date().toISOString() },
          markdown
        )
      } catch {
        toast.error('Failed to save document')
      }
    }, 1000)
  )
  /* eslint-enable react-hooks/refs */

  // Cancel pending save on unmount
  useEffect(() => {
    const save = saveRef.current
    return () => { save.cancel() }
  }, [])

  useEffect(() => {
    if (!editor) return
    const handler = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markdown = (editor as any).getMarkdown() as string
      const title = titleRef.current?.value ?? 'Untitled'
      saveRef.current(title, markdown)
    }
    editor.on('update', handler)
    return () => { editor.off('update', handler) }
  }, [editor])

  return (
    <div className="space-y-4">
      <input
        ref={titleRef}
        defaultValue={initialTitle}
        onChange={() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const markdown = (editor as any)?.getMarkdown() as string ?? ''
          saveRef.current(titleRef.current?.value ?? 'Untitled', markdown)
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
