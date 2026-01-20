/**
 * Analytics Service
 *
 * Provides analytics for both Developer (platform-level) and Owner (nursery-level):
 * - Developer: Global stats, enterprise comparisons
 * - Owner: Revenue trends, enrollment funnels, insights, predictions
 *
 * Updated for Phase 7 (2026-01-14)
 */

import { createClient } from '@/lib/supabase/client';
import type { GlobalStats, EnterpriseStats } from '@/types/analytics.types';

// ============================================================================
// TYPES FOR OWNER ANALYTICS
// ============================================================================

export interface RevenueByMonth {
  month: string // YYYY-MM
  total_revenue: number
  psu_revenue: number
  paje_revenue: number
  private_revenue: number
  invoice_count: number
}

export interface ChildrenBySection {
  section: string
  active_count: number
  capacity: number
  occupancy_rate: number
}

export interface StaffHoursSummary {
  employee_id: string
  employee_name: string
  total_hours: number
  regular_hours: number
  overtime_hours: number
}

export interface InvoiceAging {
  age_bucket: string // '0-30', '31-60', '61-90', '90+'
  invoice_count: number
  total_amount: number
}

export interface TrendDataPoint {
  date: string
  value: number
}

export interface Insight {
  type: 'positive' | 'negative' | 'neutral' | 'warning'
  category: string
  title: string
  description: string
  value?: number
  change_percentage?: number
  detected_at: string
}

export interface Anomaly {
  metric_name: string
  current_value: number
  expected_value: number
  deviation_percentage: number
  severity: 'low' | 'medium' | 'high'
  date: string
}

export interface Recommendation {
  priority: 'low' | 'medium' | 'high'
  category: string
  title: string
  description: string
  action_items: string[]
  estimated_impact?: string
}

export interface Prediction {
  metric_name: string
  current_value: number
  predicted_value: number
  confidence: number // 0-100
  prediction_date: string
  method: string // 'moving_average' | 'linear_regression' | 'exponential_smoothing'
}

export class AnalyticsService {
  private supabase: any = createClient();

  // ==========================================================================
  // DEVELOPER ANALYTICS (Platform-Level)
  // ==========================================================================

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

  // ==========================================================================
  // OWNER ANALYTICS (Nursery-Level)
  // ==========================================================================

  /**
   * Get revenue breakdown by month for a nursery
   */
  async getRevenueByMonth(nurseryId: string, year: number): Promise<RevenueByMonth[]> {
    try {
      const { data, error } = await this.supabase
        .from('invoice')
        .select(`
          id,
          total_amount,
          issue_date,
          contract:contract_id (
            contract_type
          )
        `)
        .eq('nursery_id', nurseryId)
        .gte('issue_date', `${year}-01-01`)
        .lte('issue_date', `${year}-12-31`)
        .eq('status', 'PAID')
        .order('issue_date', { ascending: true })

      if (error) throw error

      // Group by month and contract type
      const monthlyData: { [key: string]: RevenueByMonth } = {}

      for (const invoice of data || []) {
        const month = invoice.issue_date.substring(0, 7) // YYYY-MM
        const contractType = invoice.contract?.contract_type || 'PRIVATE'

        if (!monthlyData[month]) {
          monthlyData[month] = {
            month,
            total_revenue: 0,
            psu_revenue: 0,
            paje_revenue: 0,
            private_revenue: 0,
            invoice_count: 0
          }
        }

        monthlyData[month].total_revenue += invoice.total_amount
        monthlyData[month].invoice_count += 1

        if (contractType === 'PSU') {
          monthlyData[month].psu_revenue += invoice.total_amount
        } else if (contractType === 'PAJE') {
          monthlyData[month].paje_revenue += invoice.total_amount
        } else {
          monthlyData[month].private_revenue += invoice.total_amount
        }
      }

      return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month))
    } catch (error) {
      console.error('Error fetching revenue by month:', error)
      throw error
    }
  }

  /**
   * Get children distribution by section
   */
  async getChildrenBySection(nurseryId: string): Promise<ChildrenBySection[]> {
    try {
      // Get active children by section
      const { data: children, error: childrenError } = await this.supabase
        .from('child')
        .select('section')
        .eq('nursery_id', nurseryId)
        .eq('is_active', true)

      if (childrenError) throw childrenError

      // Get section capacity from rooms
      const { data: rooms, error: roomsError } = await this.supabase
        .from('room')
        .select('section, capacity')
        .eq('nursery_id', nurseryId)
        .eq('is_active', true)

      if (roomsError) throw roomsError

      // Calculate capacity by section
      const sectionCapacity: { [key: string]: number } = {}
      for (const room of rooms || []) {
        if (!sectionCapacity[room.section]) {
          sectionCapacity[room.section] = 0
        }
        sectionCapacity[room.section] += room.capacity
      }

      // Count children by section
      const sectionCounts: { [key: string]: number } = {}
      for (const child of children || []) {
        if (!sectionCounts[child.section]) {
          sectionCounts[child.section] = 0
        }
        sectionCounts[child.section] += 1
      }

      // Build result
      const sections = ['Babies', 'Toddlers', 'Preschoolers']
      return sections.map(section => {
        const activeCount = sectionCounts[section] || 0
        const capacity = sectionCapacity[section] || 0
        const occupancyRate = capacity > 0 ? (activeCount / capacity) * 100 : 0

        return {
          section,
          active_count: activeCount,
          capacity,
          occupancy_rate: Math.round(occupancyRate * 100) / 100
        }
      })
    } catch (error) {
      console.error('Error fetching children by section:', error)
      throw error
    }
  }

  /**
   * Get staff hours summary for a period
   */
  async getStaffHoursByEmployee(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<StaffHoursSummary[]> {
    try {
      const { data, error } = await this.supabase
        .from('staff_shift')
        .select(`
          id,
          start_time,
          end_time,
          is_overtime,
          staff:staff_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq('nursery_id', nurseryId)
        .gte('start_time', startDate)
        .lte('end_time', endDate)
        .order('start_time', { ascending: true })

      if (error) throw error

      // Group by employee
      const employeeHours: { [key: string]: StaffHoursSummary } = {}

      for (const shift of data || []) {
        const staff = shift.staff
        if (!staff) continue

        const employeeId = staff.id
        const employeeName = `${staff.first_name} ${staff.last_name}`

        if (!employeeHours[employeeId]) {
          employeeHours[employeeId] = {
            employee_id: employeeId,
            employee_name: employeeName,
            total_hours: 0,
            regular_hours: 0,
            overtime_hours: 0
          }
        }

        // Calculate hours
        const startTime = new Date(shift.start_time)
        const endTime = new Date(shift.end_time)
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)

        employeeHours[employeeId].total_hours += hours
        if (shift.is_overtime) {
          employeeHours[employeeId].overtime_hours += hours
        } else {
          employeeHours[employeeId].regular_hours += hours
        }
      }

      return Object.values(employeeHours).sort((a, b) =>
        a.employee_name.localeCompare(b.employee_name)
      )
    } catch (error) {
      console.error('Error fetching staff hours:', error)
      throw error
    }
  }

  /**
   * Get invoice aging report (overdue invoices by age bucket)
   */
  async getInvoiceAgingReport(nurseryId: string): Promise<InvoiceAging[]> {
    try {
      const { data, error } = await this.supabase
        .from('invoice')
        .select('id, total_amount, due_date, status')
        .eq('nursery_id', nurseryId)
        .in('status', ['PENDING', 'OVERDUE'])
        .order('due_date', { ascending: true })

      if (error) throw error

      const now = new Date()
      const aging = {
        '0-30': { invoice_count: 0, total_amount: 0 },
        '31-60': { invoice_count: 0, total_amount: 0 },
        '61-90': { invoice_count: 0, total_amount: 0 },
        '90+': { invoice_count: 0, total_amount: 0 }
      }

      for (const invoice of data || []) {
        const dueDate = new Date(invoice.due_date)
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

        if (daysOverdue < 0) continue // Not overdue yet

        let bucket: '0-30' | '31-60' | '61-90' | '90+'
        if (daysOverdue <= 30) bucket = '0-30'
        else if (daysOverdue <= 60) bucket = '31-60'
        else if (daysOverdue <= 90) bucket = '61-90'
        else bucket = '90+'

        aging[bucket].invoice_count += 1
        aging[bucket].total_amount += invoice.total_amount
      }

      return Object.entries(aging).map(([bucket, data]) => ({
        age_bucket: bucket,
        invoice_count: data.invoice_count,
        total_amount: data.total_amount
      }))
    } catch (error) {
      console.error('Error fetching invoice aging:', error)
      throw error
    }
  }

  // ==========================================================================
  // TRENDS & PREDICTIONS
  // ==========================================================================

  /**
   * Get occupancy trend over time
   */
  async getOccupancyTrend(
    nurseryId: string,
    months: number = 12
  ): Promise<TrendDataPoint[]> {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)

      const { data, error } = await this.supabase.rpc('get_occupancy_trend', {
        p_nursery_id: nurseryId,
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      })

      if (error) throw error

      return (data || []).map((row: any) => ({
        date: row.date,
        value: row.occupancy_rate
      }))
    } catch (error) {
      console.error('Error fetching occupancy trend:', error)
      throw error
    }
  }

  /**
   * Get revenue trend over time
   */
  async getRevenueTrend(
    nurseryId: string,
    months: number = 12
  ): Promise<TrendDataPoint[]> {
    try {
      const year = new Date().getFullYear()
      const revenueData = await this.getRevenueByMonth(nurseryId, year)

      // Take last N months
      const trend = revenueData.slice(-months).map(month => ({
        date: month.month,
        value: month.total_revenue
      }))

      return trend
    } catch (error) {
      console.error('Error fetching revenue trend:', error)
      throw error
    }
  }

  /**
   * Simple prediction using moving average
   */
  async getPrediction(
    nurseryId: string,
    metricType: 'occupancy' | 'revenue',
    horizon: number = 3 // months ahead
  ): Promise<Prediction[]> {
    try {
      // Get historical data (last 12 months)
      const historicalData = metricType === 'occupancy'
        ? await this.getOccupancyTrend(nurseryId, 12)
        : await this.getRevenueTrend(nurseryId, 12)

      if (historicalData.length < 3) {
        return [] // Not enough data for prediction
      }

      // Simple moving average (last 3 months)
      const lastThreeValues = historicalData.slice(-3).map(d => d.value)
      const movingAverage = lastThreeValues.reduce((a, b) => a + b, 0) / lastThreeValues.length

      // Calculate confidence based on variance
      const variance = lastThreeValues.reduce((sum, val) =>
        sum + Math.pow(val - movingAverage, 2), 0
      ) / lastThreeValues.length
      const stdDev = Math.sqrt(variance)
      const confidence = Math.max(0, Math.min(100, 100 - (stdDev / movingAverage) * 100))

      // Generate predictions
      const predictions: Prediction[] = []
      const lastDate = new Date(historicalData[historicalData.length - 1].date)

      for (let i = 1; i <= horizon; i++) {
        const predictionDate = new Date(lastDate)
        predictionDate.setMonth(predictionDate.getMonth() + i)

        predictions.push({
          metric_name: metricType === 'occupancy' ? 'Taux d\'occupation' : 'Chiffre d\'affaires',
          current_value: lastThreeValues[lastThreeValues.length - 1],
          predicted_value: movingAverage,
          confidence: Math.round(confidence),
          prediction_date: predictionDate.toISOString().split('T')[0],
          method: 'moving_average'
        })
      }

      return predictions
    } catch (error) {
      console.error('Error generating prediction:', error)
      throw error
    }
  }

  // ==========================================================================
  // INSIGHTS & RECOMMENDATIONS
  // ==========================================================================

  /**
   * Generate automatic insights based on recent data
   */
  async getInsights(nurseryId: string): Promise<Insight[]> {
    try {
      const insights: Insight[] = []
      const now = new Date()
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Occupancy trend insight
      const occupancyTrend = await this.getOccupancyTrend(nurseryId, 2)
      if (occupancyTrend.length >= 2) {
        const current = occupancyTrend[occupancyTrend.length - 1].value
        const previous = occupancyTrend[occupancyTrend.length - 2].value
        const change = ((current - previous) / previous) * 100

        if (Math.abs(change) >= 5) {
          insights.push({
            type: change > 0 ? 'positive' : 'negative',
            category: 'Occupation',
            title: change > 0 ? 'Hausse du taux d\'occupation' : 'Baisse du taux d\'occupation',
            description: `Le taux d'occupation a ${change > 0 ? 'augmenté' : 'diminué'} de ${Math.abs(change).toFixed(1)}% ce mois-ci.`,
            value: current,
            change_percentage: change,
            detected_at: now.toISOString()
          })
        }
      }

      // Revenue trend insight
      const revenueTrend = await this.getRevenueTrend(nurseryId, 2)
      if (revenueTrend.length >= 2) {
        const current = revenueTrend[revenueTrend.length - 1].value
        const previous = revenueTrend[revenueTrend.length - 2].value
        const change = ((current - previous) / previous) * 100

        if (Math.abs(change) >= 10) {
          insights.push({
            type: change > 0 ? 'positive' : 'warning',
            category: 'Finance',
            title: change > 0 ? 'Croissance du chiffre d\'affaires' : 'Baisse du chiffre d\'affaires',
            description: `Le CA a ${change > 0 ? 'progressé' : 'reculé'} de ${Math.abs(change).toFixed(1)}% par rapport au mois dernier.`,
            value: current,
            change_percentage: change,
            detected_at: now.toISOString()
          })
        }
      }

      // Overdue invoices insight
      const aging = await this.getInvoiceAgingReport(nurseryId)
      const totalOverdue = aging.reduce((sum, bucket) => sum + bucket.total_amount, 0)
      if (totalOverdue > 1000) {
        insights.push({
          type: 'warning',
          category: 'Finance',
          title: 'Factures impayées importantes',
          description: `${totalOverdue.toFixed(2)}€ de factures en retard de paiement nécessitent un suivi.`,
          value: totalOverdue,
          detected_at: now.toISOString()
        })
      }

      return insights
    } catch (error) {
      console.error('Error generating insights:', error)
      throw error
    }
  }

  /**
   * Detect anomalies in metrics
   */
  async getAnomalies(nurseryId: string): Promise<Anomaly[]> {
    try {
      const anomalies: Anomaly[] = []
      const today = new Date().toISOString().split('T')[0]
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

      // Get metric snapshots marked as anomalies
      const { data, error } = await this.supabase
        .from('metric_snapshot')
        .select('*')
        .eq('nursery_id', nurseryId)
        .eq('is_anomaly', true)
        .gte('snapshot_date', sevenDaysAgoStr)
        .lte('snapshot_date', today)
        .order('snapshot_date', { ascending: false })

      if (error) throw error

      for (const snapshot of data || []) {
        const changePercentage = Math.abs(snapshot.change_percentage || 0)
        let severity: 'low' | 'medium' | 'high' = 'low'
        if (changePercentage > 30) severity = 'high'
        else if (changePercentage > 15) severity = 'medium'

        anomalies.push({
          metric_name: snapshot.metric_name,
          current_value: snapshot.metric_value,
          expected_value: snapshot.metadata?.expected_value || snapshot.metric_value,
          deviation_percentage: snapshot.change_percentage || 0,
          severity,
          date: snapshot.snapshot_date
        })
      }

      return anomalies
    } catch (error) {
      console.error('Error detecting anomalies:', error)
      throw error
    }
  }

  /**
   * Generate actionable recommendations
   */
  async getRecommendations(nurseryId: string): Promise<Recommendation[]> {
    try {
      const recommendations: Recommendation[] = []

      // Get insights to base recommendations on
      const insights = await this.getInsights(nurseryId)

      for (const insight of insights) {
        if (insight.category === 'Occupation' && insight.type === 'negative') {
          recommendations.push({
            priority: 'high',
            category: 'Marketing',
            title: 'Augmenter la visibilité de la crèche',
            description: 'Le taux d\'occupation est en baisse. Actions recommandées pour attirer de nouvelles familles.',
            action_items: [
              'Organiser une journée portes ouvertes',
              'Mettre à jour les photos sur le site web',
              'Publier des témoignages de parents satisfaits',
              'Optimiser le référencement local (Google My Business)'
            ],
            estimated_impact: '+5-10% d\'occupation en 2-3 mois'
          })
        }

        if (insight.category === 'Finance' && insight.title.includes('impayées')) {
          recommendations.push({
            priority: 'high',
            category: 'Finance',
            title: 'Améliorer le recouvrement des créances',
            description: 'Des factures importantes sont en retard. Mettre en place un processus de relance structuré.',
            action_items: [
              'Envoyer des rappels automatiques à J+7 et J+15',
              'Proposer des plans de paiement aux familles en difficulté',
              'Contacter personnellement les familles avec 60+ jours de retard',
              'Envisager un mandat SEPA pour les paiements récurrents'
            ],
            estimated_impact: 'Réduction du délai moyen de paiement de 30%'
          })
        }
      }

      // Always recommend reviewing staff planning if no specific issues
      if (recommendations.length === 0) {
        recommendations.push({
          priority: 'low',
          category: 'Opérations',
          title: 'Optimisation continue',
          description: 'Tout fonctionne bien ! Voici quelques suggestions pour maintenir la qualité.',
          action_items: [
            'Planifier les formations obligatoires du personnel',
            'Réviser les menus de la semaine prochaine',
            'Vérifier les dates d\'expiration des produits',
            'Solliciter les retours des parents via enquête'
          ],
          estimated_impact: 'Maintien de la qualité et satisfaction'
        })
      }

      return recommendations
    } catch (error) {
      console.error('Error generating recommendations:', error)
      throw error
    }
  }
}

export const analyticsService = new AnalyticsService();
