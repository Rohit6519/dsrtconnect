import { MyOppsShell } from '@/components/looking-for/my-opps/shell/MyOppsShell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <MyOppsShell>{children}</MyOppsShell>
}