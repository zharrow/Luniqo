import { DashboardSkeleton } from '@/components/shared/DashboardSkeleton'

export default function EmployeeLoading() {
  return <DashboardSkeleton statsCount={3} cardsCount={4} />
}
