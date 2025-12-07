'use client'

import { useEffect, useState } from 'react'
import { useRequireAuth } from '@/lib/contexts/AuthContext'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DebugPage() {
  const { session, isLoading: authLoading } = useRequireAuth(['Owner'])
  const [diagnostics, setDiagnostics] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (session) {
      runDiagnostics()
    }
  }, [session])

  async function runDiagnostics() {
    setLoading(true)
    const results: any = {}

    try {
      // Check session
      results.session = {
        role: session?.role,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        hasEnterprise: !!session?.enterprise,
        enterpriseId: session?.enterprise?.id,
        enterpriseName: session?.enterprise?.name
      }

      // Count rooms in database
      const { count: totalRooms, error: roomsError } = await supabase
        .from('room')
        .select('*', { count: 'exact', head: true })

      results.totalRooms = {
        count: totalRooms,
        error: roomsError?.message
      }

      // Count rooms for this enterprise if exists
      if (session?.enterprise?.id) {
        const { count: enterpriseRooms, error: entRoomsError } = await supabase
          .from('room')
          .select('*', { count: 'exact', head: true })
          .eq('enterprise_id', session.enterprise.id)

        results.enterpriseRooms = {
          count: enterpriseRooms,
          error: entRoomsError?.message
        }

        // Get actual rooms
        const { data: rooms, error: getRoomsError } = await supabase
          .from('room')
          .select('id, name, enterprise_id, is_active')
          .eq('enterprise_id', session.enterprise.id)

        results.rooms = {
          data: rooms,
          error: getRoomsError?.message
        }
      }

      // Check enterprise table
      const { data: enterprises, error: entError } = await supabase
        .from('enterprise')
        .select('id, name, admin_id')

      results.enterprises = {
        data: enterprises,
        error: entError?.message
      }

      // Check admin
      if (session?.user?.id) {
        const { data: adminData, error: adminError } = await supabase
          .from('admin')
          .select('id, email, first_name, last_name')
          .eq('id', session.user.id)
          .single()

        results.admin = {
          data: adminData,
          error: adminError?.message
        }
      }

    } catch (error: any) {
      results.error = error.message
    }

    setDiagnostics(results)
    setLoading(false)
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Diagnostics de la base de données</h1>

        <div className="space-y-6">
          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle>Session Info</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                {JSON.stringify(diagnostics.session, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Total Rooms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Total Rooms (All Enterprises)
                {diagnostics.totalRooms?.count && (
                  <Badge variant="neutral">{diagnostics.totalRooms.count}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                {JSON.stringify(diagnostics.totalRooms, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Enterprise Rooms */}
          {diagnostics.enterpriseRooms && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Rooms for Current Enterprise
                  {diagnostics.enterpriseRooms?.count !== undefined && (
                    <Badge variant="primary">{diagnostics.enterpriseRooms.count}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                  {JSON.stringify(diagnostics.enterpriseRooms, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Rooms Data */}
          {diagnostics.rooms && (
            <Card>
              <CardHeader>
                <CardTitle>Rooms Data</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(diagnostics.rooms, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Enterprises */}
          <Card>
            <CardHeader>
              <CardTitle>All Enterprises</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(diagnostics.enterprises, null, 2)}
              </pre>
            </CardContent>
          </Card>

          {/* Admin */}
          {diagnostics.admin && (
            <Card>
              <CardHeader>
                <CardTitle>Current Admin</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted p-4 rounded overflow-auto">
                  {JSON.stringify(diagnostics.admin, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
