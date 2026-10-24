'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import {
  File,
  FileImage,
  FileText,
  FileVideo,
  Download,
  Trash2,
  Upload,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface ProjectFilesProps {
  projectId: string
  isMember: boolean
  currentUserId?: string
}

export function ProjectFiles({
  projectId,
  isMember,
  currentUserId,
}: ProjectFilesProps) {
  const supabase = createClient()
  const [files, setFiles] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadFiles()
  }, [projectId])

  const loadFiles = async () => {
    const { data } = await supabase
      .from('project_files')
      .select('*, users:uploaded_by(id, full_name, username, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    setFiles(data || [])
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    disabled: !isMember || uploading,
    maxSize: 10 * 1024 * 1024,
    onDrop: async (acceptedFiles) => {
      if (!currentUserId) return
      setUploading(true)

      for (const file of acceptedFiles) {
        const ext = file.name.split('.').pop()
        const path = `${projectId}/${Date.now()}-${file.name}`

        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(path, file, { cacheControl: '3600' })

        if (uploadError) {
          console.error(uploadError)
          continue
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('project-files').getPublicUrl(path)

        await supabase.from('project_files').insert({
          project_id: projectId,
          uploaded_by: currentUserId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
        })
      }

      setUploading(false)
      loadFiles()
    },
  })

  const deleteFile = async (fileId: string) => {
    if (!confirm('Delete this file?')) return
    await supabase.from('project_files').delete().eq('id', fileId)
    loadFiles()
  }

  const getFileIcon = (type: string | null) => {
    if (!type) return File
    if (type.startsWith('image/')) return FileImage
    if (type.startsWith('video/')) return FileVideo
    if (type.includes('text') || type.includes('pdf')) return FileText
    return File
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Files</h2>
        <p className="text-xs text-muted-foreground">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </p>
      </div>

      {isMember && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-border/40 hover:border-border'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm">
            {uploading
              ? 'Uploading...'
              : isDragActive
              ? 'Drop files here'
              : 'Drop files or click to upload'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Max 10MB per file
          </p>
        </div>
      )}

      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No files uploaded yet.
        </p>
      ) : (
        <div className="space-y-1">
          {files.map((f) => {
            const Icon = getFileIcon(f.file_type)
            return (
              <div
                key={f.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 group"
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.file_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Avatar className="w-3.5 h-3.5">
                      <AvatarImage src={f.users?.avatar_url} />
                      <AvatarFallback className="text-[8px]">
                        {f.users?.full_name?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{f.users?.full_name}</span>
                    <span>·</span>
                    <span>
                      {formatDistanceToNow(new Date(f.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                <a
                  href={f.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-muted rounded-lg transition-all"
                >
                  <Download className="w-4 h-4" />
                </a>
                {f.uploaded_by === currentUserId && (
                  <button
                    type="button"
                    onClick={() => deleteFile(f.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}