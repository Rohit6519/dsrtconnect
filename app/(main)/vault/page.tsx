import { EncryptedVault } from '@/components/vault/EncryptedVault'
import { DsrtPage } from '@/components/dsrt'

export default function VaultPage() {
  return (
    <DsrtPage width="wide" className="py-8">
      <EncryptedVault />
    </DsrtPage>
  )
}