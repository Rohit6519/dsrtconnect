'use client'

import { useState, useEffect } from 'react'
import { Lock, Plus, Shield, Key, Download, Upload, FileText, Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { generateDocKey, encryptContent, decryptContent, getUserKey, exportUserKey, importUserKey } from '@/lib/encryption'
import { DsrtPanel, DsrtSection, DsrtInput, DsrtTextarea, DsrtButton, DsrtModal } from '@/components/dsrt'
import { cn } from '@/lib/utils'

export function EncryptedVault() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string>('')
  const [docs, setDocs] = useState<any[]>([])
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [decryptedContent, setDecryptedContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        loadDocs()
      }
    }
    init()
  }, [])

  const loadDocs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/encrypted-docs')
      const data = await res.json()
      setDocs(data.docs || [])
    } catch (err) {
      toast.error('Failed to load docs')
    } finally {
      setLoading(false)
    }
  }

  const openDoc = async (doc: any) => {
    setSelectedDoc(doc)
    setEditing(false)
    
    try {
      const res = await fetch(`/api/encrypted-docs/${doc.id}`)
      const data = await res.json()
      
      if (data.doc) {
        const userKey = getUserKey(userId)
        const decrypted = await decryptContent(data.doc.encrypted_content, data.doc.iv, userKey)
        setDecryptedContent(decrypted)
        setContent(decrypted)
        setTitle(data.doc.title)
      }
    } catch (err) {
      toast.error('Failed to decrypt. Your encryption key may have changed.')
      console.error(err)
    }
  }

  const createNew = () => {
    setSelectedDoc(null)
    setEditing(true)
    setTitle('')
    setContent('')
    setDecryptedContent('')
  }

  const save = async () => {
    if (!title.trim() || !content.trim()) { toast.error('Title and content required'); return }
    setSaving(true)
    try {
      const userKey = getUserKey(userId)
      const { encrypted, iv } = await encryptContent(content, userKey)

      if (selectedDoc) {
        const res = await fetch(`/api/encrypted-docs/${selectedDoc.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, encrypted_content: encrypted, iv }),
        })
        if (!res.ok) throw new Error('Failed')
        toast.success('Document updated')
      } else {
        const res = await fetch('/api/encrypted-docs', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, encrypted_content: encrypted, iv }),
        })
        if (!res.ok) throw new Error('Failed')
        toast.success('Document created')
      }
      setEditing(false)
      loadDocs()
    } catch (err) {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const deleteDoc = async () => {
    if (!selectedDoc || !confirm('Delete this document permanently?')) return
    const res = await fetch(`/api/encrypted-docs/${selectedDoc.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Document deleted')
      setSelectedDoc(null)
      loadDocs()
    } else {
      toast.error('Failed to delete')
    }
  }

  const exportKey = () => {
    const key = exportUserKey(userId)
    if (!key) return
    const blob = new Blob([JSON.stringify({ 
      version: 1, user_id: userId, key, exported_at: new Date().toISOString(),
      warning: 'Keep this file secure. Anyone with this key can decrypt your documents.',
    }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dsrt-vault-key-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Key exported. Keep it safe!')
  }

  const importKey = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        if (data.key && data.user_id === userId) {
          importUserKey(userId, data.key)
          toast.success('Key imported. Reloading vault...')
          setTimeout(() => window.location.reload(), 1000)
        } else {
          toast.error('Invalid key file for this user')
        }
      } catch {
        toast.error('Failed to import key')
      }
    }
    input.click()
  }

  return (
    <div className="space-y-6">
      <DsrtSection
        title="Encrypted Vault"
        description="Your private notes, end-to-end encrypted with your device key."
        headerVariant="large"
        actions={
          <div className="flex gap-2">
            <DsrtButton variant="outline" size="sm" onClick={() => setShowKeyModal(true)}>
              <Key className="w-4 h-4 mr-1.5" /> Manage Key
            </DsrtButton>
            <DsrtButton variant="primary" size="sm" onClick={createNew}>
              <Plus className="w-4 h-4 mr-1.5" /> New Note
            </DsrtButton>
          </div>
        }
      />

      <DsrtPanel padding="sm" variant="inset" className="border-[#2c5282]/40 bg-[#1e3a5f]/10 flex items-start gap-3">
        <Shield className="w-5 h-5 text-[#93c5fd] flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[13px] font-bold text-white">End-to-End Encrypted</p>
          <p className="text-[12px] text-white/60 mt-0.5 leading-relaxed">
            Your notes are encrypted on your device using AES-256. DSRT servers only store encrypted data. If you lose your key or clear browser storage, your notes cannot be recovered.
          </p>
        </div>
      </DsrtPanel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <DsrtPanel padding="none" className="overflow-hidden h-[600px] flex flex-col">
          <div className="p-4 border-b border-white/[0.06]">
            <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/40">
              Documents ({docs.length})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {loading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
              </div>
            ) : docs.length === 0 ? (
              <div className="p-8 text-center text-white/40 text-[13px]">
                No encrypted documents yet.
              </div>
            ) : (
              docs.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => openDoc(doc)}
                  className={cn(
                    'w-full p-4 text-left hover:bg-white/[0.03] transition-colors',
                    selectedDoc?.id === doc.id && 'bg-[#1e3a5f]/30 border-l-2 border-[#93c5fd]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Lock className="w-3.5 h-3.5 text-[#93c5fd] flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-white truncate">{doc.title}</p>
                      <p className="text-[11px] font-mono text-white/40 mt-1 uppercase tracking-wider">
                        {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </DsrtPanel>

        <div className="lg:col-span-2">
          <DsrtPanel className="h-[600px] flex flex-col">
            {!selectedDoc && !editing ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Lock className="w-12 h-12 text-white/20 mb-4" />
                <p className="text-[14px] text-white/50">Select or create a document to view encrypted content.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 space-y-4">
                {editing ? (
                  <>
                    <DsrtInput
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Document title..."
                      sizeVariant="lg"
                    />
                    <DsrtTextarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Start typing... Your content is encrypted on your device."
                      className="flex-1 min-h-0"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                      <DsrtButton variant="ghost" onClick={() => { setEditing(false); if (selectedDoc) setContent(decryptedContent) }}>
                        Cancel
                      </DsrtButton>
                      <DsrtButton variant="primary" onClick={save} loading={saving}>
                        {saving ? 'Encrypting...' : 'Save & Encrypt'}
                      </DsrtButton>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-[20px] font-bold text-white">{selectedDoc.title}</h2>
                        <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mt-2">
                          Last updated {formatDistanceToNow(new Date(selectedDoc.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <DsrtButton variant="outline" size="sm" onClick={() => setEditing(true)}>
                          Edit
                        </DsrtButton>
                        <DsrtButton variant="danger" size="sm" onClick={deleteDoc}>
                          <Trash2 className="w-4 h-4" />
                        </DsrtButton>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-white/[0.06] flex-1 overflow-y-auto">
                      <p className="text-[14px] text-white/80 whitespace-pre-wrap leading-relaxed font-mono">
                        {decryptedContent}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </DsrtPanel>
        </div>
      </div>

      <DsrtModal
        open={showKeyModal}
        onOpenChange={setShowKeyModal}
        title="Encryption Key"
        description="Backup or import your device encryption key"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <p className="text-[12px] text-amber-200/80 leading-relaxed">
              <strong className="text-amber-400">Important:</strong> Your key is stored only on this device. 
              If you clear browser data or use another device, you cannot decrypt your notes without importing this key.
            </p>
          </div>

          <div className="space-y-2">
            <DsrtButton variant="outline" fullWidth onClick={exportKey}>
              <Download className="w-4 h-4 mr-2" /> Export Key (Backup)
            </DsrtButton>
            <DsrtButton variant="outline" fullWidth onClick={importKey}>
              <Upload className="w-4 h-4 mr-2" /> Import Key (From Backup)
            </DsrtButton>
          </div>
        </div>
      </DsrtModal>
    </div>
  )
}