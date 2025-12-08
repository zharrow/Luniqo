/**
 * Analytics Service
 * Service for Developer dashboard analytics and metrics
 * Updated for Unified Profiles Architecture (2025-12-07)
 */

import { createClient } from '@/lib/supabase/client';
import type { GlobalStats, EnterpriseStats } from '@/types/analytics.types';

export class AnalyticsService {
  private supabase: any = createClient();

  /**
   * Get global statistics for the developer dashboard
   */
  async getGlobalStats(): Promise<GlobalStats> {
    try {
      // Get total enterprises
      const { count: enterprisesCount, error: enterprisesError } = await this.supabase
        .from('enterprise')
        .select('*', { count: 'exact', head: true });

      if (enterprisesError) throw enterprisesError;

      // Get active owners (profiles where role='Owner' and is_active=true)
      const { count: ownersCount, error: ownersError } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'Owner')
        .eq('is_active', true);

      if (ownersError) throw ownersError;

      // Get total employees (profiles where role='Employee')
      const { count: employeesCount, error: employeesError } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'Employee')
        .eq('is_active', true);

      if (employeesError) throw employeesError;

      // Get sessions this month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const { count: sessionsCount, error: sessionsError } = await this.supabase
        .from('daily_cleaning_session')
        .select('*', { count: 'exact', head: true })
        .gte('date', firstDayOfMonth.toISOString())
        .lte('date', lastDayOfMonth.toISOString());

      if (sessionsError) throw sessionsError;

      return {
        total_enterprises: enterprisesCount || 0,
        active_owners: ownersCount || 0,
        total_employees: employeesCount || 0,
        sessions_this_month: sessionsCount || 0,
      };
    } catch (error) {
      console.error('Error fetching global stats:', error);
      throw error;
    }
  }

  /**
   * Get enterprise statistics with owner and employee info
   */
  async getEnterprises(): Promise<EnterpriseStats[]> {
    try {
      // Get all enterprises with their owners (from profiles table)
      const { data: enterprises, error: enterprisesError} = await this.supabase
        .from('enterprise')
        .select(`
          id,
          name,
          owner:profiles!owner_id (
            id,
            email,
            first_name,
            last_name
          )
        `)
        .order('name');

      if (enterprisesError) throw enterprisesError;
      if (!enterprises) return [];

      // For each enterprise, get employee count and sessions this month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const enterpriseStats = await Promise.all(
        enterprises.map(async (enterprise: any) => {
          // Get employee count (from profiles where role='Employee')
          const { count: employeeCount, error: employeeError } = await this.supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'Employee')
            .eq('enterprise_id', enterprise.id)
            .eq('is_active', true);

          if (employeeError) console.error('Error fetching employees:', employeeError);

          // Get sessions this month for this enterprise
          const { count: sessionsCount, error: sessionsError } = await this.supabase
            .from('daily_cleaning_session')
            .select('*', { count: 'exact', head: true })
            .eq('enterprise_id', enterprise.id)
            .gte('date', firstDayOfMonth.toISOString())
            .lte('date', lastDayOfMonth.toISOString());

          if (sessionsError) console.error('Error fetching sessions:', sessionsError);

          const owner = Array.isArray(enterprise.owner) ? enterprise.owner[0] : enterprise.owner;

          return {
            id: enterprise.id,
            name: enterprise.name,
            owner_name: owner
              ? `${owner.first_name || ''} ${owner.last_name || ''}`.trim() || 'N/A'
              : 'N/A',
            owner_email: owner?.email || 'N/A',
            employee_count: employeeCount || 0,
            sessions_this_month: sessionsCount || 0,
            last_owner_login: null, // TODO: Could be tracked via Supabase Auth logs
          };
        })
      );

      return enterpriseStats;
    } catch (error) {
      console.error('Error fetching enterprises:', error);
      throw error;
    }
  }

  /**
   * Get activity data for charts (sessions per enterprise)
   */
  async getActivityByEnterprise(): Promise<{ name: string; sessions: number }[]> {
    try {
      const enterprises = await this.getEnterprises();

      return enterprises.map((enterprise) => ({
        name: enterprise.name,
        sessions: enterprise.sessions_this_month,
      }));
    } catch (error) {
      console.error('Error fetching activity data:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
