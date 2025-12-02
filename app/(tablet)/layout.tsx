import { TabletAuthProvider } from '@/lib/contexts/TabletAuthContext'

export const dynamic = 'force-dynamic'

export default function TabletGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <TabletAuthProvider>{children}</TabletAuthProvider>
}
