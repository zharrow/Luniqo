/**
 * Analytics Service
 * Service for Developer dashboard analytics and metrics
 */

import { createClient } from '@/lib/supabase/client';
import type { GlobalStats, EnterpriseStats } from '@/types/analytics.types';

export class AnalyticsService {
  private supabase = createClient();

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

      // Get active admins (admins with is_active = true)
      const { count: adminsCount, error: adminsError } = await this.supabase
        .from('admin')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (adminsError) throw adminsError;

      // Get total employees across all enterprises
      const { count: employeesCount, error: employeesError } = await this.supabase
        .from('employee')
        .select('*', { count: 'exact', head: true })
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
        active_admins: adminsCount || 0,
        total_employees: employeesCount || 0,
        sessions_this_month: sessionsCount || 0,
      };
    } catch (error) {
      console.error('Error fetching global stats:', error);
      throw error;
    }
  }

  /**
   * Get enterprise statistics with admin and employee info
   */
  async getEnterprises(): Promise<EnterpriseStats[]> {
    try {
      // Get all enterprises with their admins
      const { data: enterprises, error: enterprisesError } = await this.supabase
        .from('enterprise')
        .select(`
          id,
          name,
          admin:admin!admin_id (
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
          // Get employee count
          const { count: employeeCount, error: employeeError } = await this.supabase
            .from('employee')
            .select('*', { count: 'exact', head: true })
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

          const admin = Array.isArray(enterprise.admin) ? enterprise.admin[0] : enterprise.admin;

          return {
            id: enterprise.id,
            name: enterprise.name,
            admin_name: admin
              ? `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'N/A'
              : 'N/A',
            admin_email: admin?.email || 'N/A',
            employee_count: employeeCount || 0,
            sessions_this_month: sessionsCount || 0,
            last_admin_login: null, // Removed last_login field (not in schema)
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
