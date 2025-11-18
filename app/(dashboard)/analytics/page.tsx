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
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  UsersIcon,
  ChartBarIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

export default function AnalyticsPage() {
  const { session, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    total_enterprises: 0,
    active_admins: 0,
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des analytics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="card bg-red-50 border border-red-200 p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={loadData} className="btn-primary mt-4">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-600">Vue d'ensemble des métriques globales</p>
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
          title="Admins Actifs"
          value={globalStats.active_admins}
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
      <div className="card bg-blue-50 border border-blue-200 p-6 mb-8">
        <div className="flex items-start gap-3">
          <InformationCircleIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Accès Limité - Developer</h3>
            <p className="text-blue-800 text-sm">
              En tant que Developer, vous avez accès uniquement aux métriques globales et à la
              liste des entreprises. Vous n'avez pas accès aux données métier (enfants, repas,
              tâches) pour respecter la confidentialité de chaque crèche.
            </p>
          </div>
        </div>
      </div>

      {/* Enterprises Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Entreprises Enregistrées</h2>
        <EnterprisesList enterprises={enterprises} />
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité par Crèche</h3>
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Graphique à venir</p>
              <p className="text-gray-400 text-xs mt-1">Recharts - Bar Chart</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution Utilisateurs</h3>
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Graphique à venir</p>
              <p className="text-gray-400 text-xs mt-1">Recharts - Line Chart</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
