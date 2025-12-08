/**
 * Analytics Dashboard Page
 * Developer-only dashboard showing global metrics and enterprise statistics
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { analyticsService } from '@/lib/services/analytics.service';
import type { GlobalStats, EnterpriseStats } from '@/types/analytics.types';
import KpiCard from '@/components/analytics/KpiCard';
import EnterprisesList from '@/components/analytics/EnterprisesList';
import DeveloperLayout from '@/components/layout/DeveloperLayout';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  UsersIcon,
  ChartBarIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function AnalyticsPage() {
  const { session, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    total_enterprises: 0,
    active_owners: 0,
    total_employees: 0,
    sessions_this_month: 0,
  });
  const [enterprises, setEnterprises] = useState<EnterpriseStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is Developer
    if (!authLoading && session) {
      if (session.role !== 'Developer') {
        router.push('/dashboard');
        return;
      }

      loadData();
    }
  }, [session, authLoading, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, enterprisesData] = await Promise.all([
        analyticsService.getGlobalStats(),
        analyticsService.getEnterprises(),
      ]);

      setGlobalStats(statsData);
      setEnterprises(enterprisesData);
    } catch (err) {
      console.error('Error loading analytics data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <DeveloperLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des analytics...</p>
          </div>
        </div>
      </DeveloperLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DeveloperLayout>
        <div className="p-6">
          <div className="card bg-red-50 border border-red-200 p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button onClick={loadData} className="btn-primary mt-4">
              Réessayer
            </button>
          </div>
        </div>
      </DeveloperLayout>
    );
  }

  // Prepare chart data
  const enterpriseActivityData = enterprises.slice(0, 8).map(e => ({
    name: e.name.substring(0, 15),
    sessions: e.sessions_this_month,
    employees: e.employee_count
  }));

  const monthlyData = [
    { month: 'Jan', users: 45, sessions: 120 },
    { month: 'Fév', users: 52, sessions: 145 },
    { month: 'Mar', users: 58, sessions: 168 },
    { month: 'Avr', users: 65, sessions: 192 },
    { month: 'Mai', users: globalStats.total_employees || 72, sessions: globalStats.sessions_this_month || 215 },
  ];

  return (
    <DeveloperLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">Vue d'ensemble des métriques globales</p>
        </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard
          title="Entreprises"
          value={globalStats.total_enterprises}
          icon={<BuildingOfficeIcon className="w-10 h-10" />}
          gradient="blue"
        />
        <KpiCard
          title="Propriétaires Actifs"
          value={globalStats.active_owners}
          icon={<UserGroupIcon className="w-10 h-10" />}
          gradient="green"
        />
        <KpiCard
          title="Employés"
          value={globalStats.total_employees}
          icon={<UsersIcon className="w-10 h-10" />}
          gradient="purple"
        />
        <KpiCard
          title="Sessions ce mois"
          value={globalStats.sessions_this_month}
          icon={<ChartBarIcon className="w-10 h-10" />}
          gradient="orange"
        />
      </div>

      {/* Security Notice */}
      <Card className="bg-blue-50 border-blue-200 mb-8">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Accès Limité - Developer</h3>
              <p className="text-blue-800 text-sm">
                En tant que Developer, vous avez accès uniquement aux métriques globales et à la
                liste des entreprises. Vous n'avez pas accès aux données métier (enfants, repas,
                tâches) pour respecter la confidentialité de chaque crèche.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enterprises Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Entreprises Enregistrées</h2>
        <EnterprisesList enterprises={enterprises} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Activité par Crèche</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                sessions: {
                  label: "Sessions",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enterpriseActivityData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="sessions" fill="hsl(var(--chart-1))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Évolution Utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                users: {
                  label: "Utilisateurs",
                  color: "hsl(var(--chart-2))",
                },
                sessions: {
                  label: "Sessions",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="users" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="sessions" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
      </div>
    </DeveloperLayout>
  );
}
