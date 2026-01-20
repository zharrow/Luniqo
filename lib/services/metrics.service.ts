/**
 * Metrics Service
 *
 * Calculates and manages KPI metrics for nurseries:
 * - Occupancy rate
 * - Financial metrics (MRR, ARR, collection rate)
 * - Staff metrics (absenteeism, ratios)
 * - HACCP compliance
 * - Parent engagement
 * - Retention rates
 *
 * Uses SQL functions from migration 61 for performance
 */

import { createClient } from '@/lib/supabase/client'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type MetricType =
  | 'occupancy_rate'
  | 'monthly_revenue'
  | 'annual_revenue'
  | 'collection_rate'
  | 'staff_absenteeism'
  | 'staff_ratio'
  | 'haccp_compliance'
  | 'parent_engagement'
  | 'retention_rate'
  | 'conversion_rate'

export type MetricFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface MetricSnapshot {
  id: string
  nursery_id: string
  metric_type: MetricType
  metric_name: string
  metric_value: number
  metric_unit: string
  metric_frequency: MetricFrequency
  snapshot_date: string
  metadata: Record<string, any> | null
  change_percentage: number | null
  is_anomaly: boolean
  created_at: string
}

export interface OccupancyMetric {
  current_occupancy: number
  max_capacity: number
  occupancy_rate: number // Percentage
  date: string
}

export interface FinancialMetric {
  mrr: number // Monthly Recurring Revenue
  arr: number // Annual Recurring Revenue
  collection_rate: number // Percentage
  outstanding_amount: number
}

export interface StaffMetric {
  absenteeism_rate: number // Percentage
  current_ratio: number
  required_ratio: number
  is_compliant: boolean
}

export interface HACCPMetric {
  compliance_rate: number // Percentage
  total_checks: number
  passed_checks: number
  failed_checks: number
}

export interface ParentEngagementMetric {
  engagement_rate: number // Percentage
  active_parents: number
  total_parents: number
  avg_response_time_hours: number
}

export interface RetentionMetric {
  retention_rate: number // Percentage
  cohort_size: number
  retained_count: number
  departed_count: number
}

export interface DashboardSummary {
  occupancy_rate: number
  monthly_revenue: number
  staff_ratio: number
  haccp_compliance: number
  parent_engagement: number
  overdue_invoices_count: number
  overdue_invoices_amount: number
}

export interface MetricComparison {
  metric_type: MetricType
  period1_value: number
  period2_value: number
  change_percentage: number
  change_absolute: number
  is_improvement: boolean
}

export interface MetricTrend {
  date: string
  value: number
}

// ============================================================================
// METRICS SERVICE
// ============================================================================

export class MetricsService {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  // ==========================================================================
  // OCCUPANCY METRICS
  // ==========================================================================

  /**
   * Calculate current occupancy rate for a nursery
   */
  async calculateOccupancyRate(nurseryId: string, date: string): Promise<OccupancyMetric> {
    const { data, error } = await this.supabase.rpc('calculate_occupancy_rate', {
      p_nursery_id: nurseryId,
      p_date: date
    })

    if (error) throw error

    return {
      current_occupancy: data.current_occupancy || 0,
      max_capacity: data.max_capacity || 0,
      occupancy_rate: data.occupancy_rate || 0,
      date
    }
  }

  /**
   * Get average occupancy rate over a period
   */
  async getAverageOccupancyRate(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const { data, error } = await this.supabase.rpc('calculate_avg_occupancy_rate', {
      p_nursery_id: nurseryId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error
    return data || 0
  }

  /**
   * Get occupancy trend over time
   */
  async getOccupancyTrend(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<MetricTrend[]> {
    const { data, error } = await this.supabase.rpc('get_occupancy_trend', {
      p_nursery_id: nurseryId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error

    return (data || []).map((row: any) => ({
      date: row.date,
      value: row.occupancy_rate
    }))
  }

  // ==========================================================================
  // FINANCIAL METRICS
  // ==========================================================================

  /**
   * Calculate Monthly Recurring Revenue (MRR)
   */
  async calculateMRR(nurseryId: string, month: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('calculate_mrr', {
      p_nursery_id: nurseryId,
      p_month: month
    })

    if (error) throw error
    return data || 0
  }

  /**
   * Calculate Annual Recurring Revenue (ARR)
   */
  async calculateARR(nurseryId: string, year: number): Promise<number> {
    const { data, error } = await this.supabase.rpc('calculate_arr', {
      p_nursery_id: nurseryId,
      p_year: year
    })

    if (error) throw error
    return data || 0
  }

  /**
   * Get revenue breakdown by contract type
   */
  async getRevenueByContractType(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<Array<{ contract_type: string; total_revenue: number }>> {
    const { data, error } = await this.supabase.rpc('get_revenue_by_contract_type', {
      p_nursery_id: nurseryId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error
    return data || []
  }

  /**
   * Calculate payment collection rate
   */
  async calculateCollectionRate(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const { data, error } = await this.supabase.rpc('calculate_payment_collection_rate', {
      p_nursery_id: nurseryId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error
    return data || 0
  }

  /**
   * Get aging receivables (overdue invoices by age bucket)
   */
  async getAgingReceivables(nurseryId: string): Promise<Array<{
    age_bucket: string
    invoice_count: number
    total_amount: number
  }>> {
    const { data, error } = await this.supabase.rpc('get_aging_receivables', {
      p_nursery_id: nurseryId
    })

    if (error) throw error
    return data || []
  }

  /**
   * Get complete financial metrics
   */
  async getFinancialMetrics(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<FinancialMetric> {
    const [mrr, collectionRate, agingReceivables] = await Promise.all([
      this.calculateMRR(nurseryId, startDate.substring(0, 7)), // YYYY-MM
      this.calculateCollectionRate(nurseryId, startDate, endDate),
      this.getAgingReceivables(nurseryId)
    ])

    const outstandingAmount = agingReceivables.reduce(
      (sum, bucket) => sum + bucket.total_amount,
      0
    )

    // Calculate ARR from MRR
    const arr = mrr * 12

    return {
      mrr,
      arr,
      collection_rate: collectionRate,
      outstanding_amount: outstandingAmount
    }
  }

  // ==========================================================================
  // STAFF METRICS
  // ==========================================================================

  /**
   * Calculate staff absenteeism rate
   */
  async calculateStaffAbsenteeismRate(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const { data, error } = await this.supabase.rpc('calculate_staff_absenteeism_rate', {
      p_nursery_id: nurseryId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error
    return data || 0
  }

  /**
   * Calculate current staff ratio
   */
  async calculateStaffRatio(nurseryId: string, date: string): Promise<StaffMetric> {
    const { data, error } = await this.supabase.rpc('calculate_current_staff_ratio', {
      p_nursery_id: nurseryId,
      p_date: date
    })

    if (error) throw error

    const currentRatio = data?.current_ratio || 0
    const requiredRatio = data?.required_ratio || 0

    return {
      absenteeism_rate: 0, // Will be filled separately
      current_ratio: currentRatio,
      required_ratio: requiredRatio,
      is_compliant: currentRatio >= requiredRatio
    }
  }

  /**
   * Get complete staff metrics
   */
  async getStaffMetrics(
    nurseryId: string,
    date: string,
    startDate: string,
    endDate: string
  ): Promise<StaffMetric> {
    const [ratio, absenteeismRate] = await Promise.all([
      this.calculateStaffRatio(nurseryId, date),
      this.calculateStaffAbsenteeismRate(nurseryId, startDate, endDate)
    ])

    return {
      ...ratio,
      absenteeism_rate: absenteeismRate
    }
  }

  // ==========================================================================
  // HACCP METRICS
  // ==========================================================================

  /**
   * Calculate HACCP compliance rate
   */
  async calculateHACCPComplianceRate(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<HACCPMetric> {
    const { data, error } = await this.supabase.rpc('calculate_haccp_compliance_rate', {
      p_nursery_id: nurseryId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error

    return {
      compliance_rate: data?.compliance_rate || 0,
      total_checks: data?.total_checks || 0,
      passed_checks: data?.passed_checks || 0,
      failed_checks: data?.failed_checks || 0
    }
  }

  /**
   * Get HACCP incidents by category
   */
  async getHACCPIncidentsByCategory(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<Array<{ category: string; incident_count: number }>> {
    const { data, error } = await this.supabase.rpc('get_haccp_incidents_by_category', {
      p_nursery_id: nurseryId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error
    return data || []
  }

  // ==========================================================================
  // PARENT ENGAGEMENT METRICS
  // ==========================================================================

  /**
   * Calculate parent engagement rate
   */
  async calculateParentEngagementRate(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<ParentEngagementMetric> {
    const { data, error } = await this.supabase.rpc('calculate_parent_engagement_rate', {
      p_nursery_id: nurseryId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error

    const responseTime = await this.calculateAvgMessageResponseTime(
      nurseryId,
      startDate,
      endDate
    )

    return {
      engagement_rate: data?.engagement_rate || 0,
      active_parents: data?.active_parents || 0,
      total_parents: data?.total_parents || 0,
      avg_response_time_hours: responseTime
    }
  }

  /**
   * Calculate average message response time (in hours)
   */
  async calculateAvgMessageResponseTime(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<number> {
    const { data, error } = await this.supabase.rpc('calculate_avg_message_response_time', {
      p_nursery_id: nurseryId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error
    return data || 0
  }

  /**
   * Get timeline engagement stats
   */
  async getTimelineEngagementStats(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    total_posts: number
    total_reactions: number
    total_comments: number
    avg_reactions_per_post: number
  }> {
    const { data, error } = await this.supabase.rpc('get_timeline_engagement_stats', {
      p_nursery_id: nurseryId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error
    return data || {
      total_posts: 0,
      total_reactions: 0,
      total_comments: 0,
      avg_reactions_per_post: 0
    }
  }

  // ==========================================================================
  // CHILDREN & RETENTION METRICS
  // ==========================================================================

  /**
   * Calculate retention rate for a cohort
   */
  async calculateRetentionRate(
    nurseryId: string,
    cohortDate: string,
    periodMonths: number
  ): Promise<RetentionMetric> {
    const { data, error } = await this.supabase.rpc('calculate_retention_rate', {
      p_nursery_id: nurseryId,
      p_cohort_date: cohortDate,
      p_period_months: periodMonths
    })

    if (error) throw error

    return {
      retention_rate: data?.retention_rate || 0,
      cohort_size: data?.cohort_size || 0,
      retained_count: data?.retained_count || 0,
      departed_count: data?.departed_count || 0
    }
  }

  /**
   * Get enrollment funnel (application → admission → enrollment)
   */
  async getEnrollmentFunnel(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    applications: number
    admissions: number
    enrollments: number
    conversion_rate: number
  }> {
    const { data, error } = await this.supabase.rpc('get_enrollment_funnel', {
      p_nursery_id: nurseryId,
      p_start_date: startDate,
      p_end_date: endDate
    })

    if (error) throw error
    return data || {
      applications: 0,
      admissions: 0,
      enrollments: 0,
      conversion_rate: 0
    }
  }

  // ==========================================================================
  // DASHBOARD SUMMARY
  // ==========================================================================

  /**
   * Get complete dashboard summary (all KPIs in one call)
   */
  async getDashboardSummary(nurseryId: string, date: string): Promise<DashboardSummary> {
    const { data, error } = await this.supabase.rpc('get_dashboard_summary', {
      p_nursery_id: nurseryId,
      p_date: date
    })

    if (error) throw error

    return {
      occupancy_rate: data?.occupancy_rate || 0,
      monthly_revenue: data?.monthly_revenue || 0,
      staff_ratio: data?.staff_ratio || 0,
      haccp_compliance: data?.haccp_compliance || 0,
      parent_engagement: data?.parent_engagement || 0,
      overdue_invoices_count: data?.overdue_invoices_count || 0,
      overdue_invoices_amount: data?.overdue_invoices_amount || 0
    }
  }

  // ==========================================================================
  // METRIC SNAPSHOTS
  // ==========================================================================

  /**
   * Create a daily metric snapshot (should be run via cron job)
   */
  async createDailySnapshot(nurseryId: string, date: string): Promise<void> {
    try {
      // Get all metrics for the day
      const summary = await this.getDashboardSummary(nurseryId, date)

      // Create snapshots for each metric
      const snapshots: Partial<MetricSnapshot>[] = [
        {
          nursery_id: nurseryId,
          metric_type: 'occupancy_rate',
          metric_name: 'Taux d\'occupation',
          metric_value: summary.occupancy_rate,
          metric_unit: '%',
          metric_frequency: 'daily',
          snapshot_date: date
        },
        {
          nursery_id: nurseryId,
          metric_type: 'monthly_revenue',
          metric_name: 'Chiffre d\'affaires mensuel',
          metric_value: summary.monthly_revenue,
          metric_unit: '€',
          metric_frequency: 'daily',
          snapshot_date: date
        },
        {
          nursery_id: nurseryId,
          metric_type: 'staff_ratio',
          metric_name: 'Ratio d\'encadrement',
          metric_value: summary.staff_ratio,
          metric_unit: 'ratio',
          metric_frequency: 'daily',
          snapshot_date: date
        },
        {
          nursery_id: nurseryId,
          metric_type: 'haccp_compliance',
          metric_name: 'Conformité HACCP',
          metric_value: summary.haccp_compliance,
          metric_unit: '%',
          metric_frequency: 'daily',
          snapshot_date: date
        },
        {
          nursery_id: nurseryId,
          metric_type: 'parent_engagement',
          metric_name: 'Engagement parents',
          metric_value: summary.parent_engagement,
          metric_unit: '%',
          metric_frequency: 'daily',
          snapshot_date: date
        }
      ]

      // Insert all snapshots
      const { error } = await this.supabase
        .from('metric_snapshot')
        .insert(snapshots)

      if (error) throw error
    } catch (error) {
      console.error('Error creating daily snapshot:', error)
      throw error
    }
  }

  /**
   * Get snapshot history for a metric
   */
  async getSnapshotHistory(
    nurseryId: string,
    metricType: MetricType,
    startDate: string,
    endDate: string
  ): Promise<MetricSnapshot[]> {
    const { data, error } = await this.supabase
      .from('metric_snapshot')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('metric_type', metricType)
      .gte('snapshot_date', startDate)
      .lte('snapshot_date', endDate)
      .order('snapshot_date', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get latest snapshot for a metric
   */
  async getLatestSnapshot(
    nurseryId: string,
    metricType: MetricType
  ): Promise<MetricSnapshot | null> {
    const { data, error } = await this.supabase
      .from('metric_snapshot')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('metric_type', metricType)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  }

  /**
   * Get anomaly alerts (metrics flagged as anomalies)
   */
  async getAnomalyAlerts(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<MetricSnapshot[]> {
    const { data, error } = await this.supabase
      .from('metric_snapshot')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('is_anomaly', true)
      .gte('snapshot_date', startDate)
      .lte('snapshot_date', endDate)
      .order('snapshot_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  // ==========================================================================
  // METRIC COMPARISONS
  // ==========================================================================

  /**
   * Compare a metric between two periods
   */
  async compareMetrics(
    nurseryId: string,
    metricType: MetricType,
    period1Start: string,
    period1End: string,
    period2Start: string,
    period2End: string
  ): Promise<MetricComparison> {
    const [period1Data, period2Data] = await Promise.all([
      this.getSnapshotHistory(nurseryId, metricType, period1Start, period1End),
      this.getSnapshotHistory(nurseryId, metricType, period2Start, period2End)
    ])

    // Calculate average for each period
    const period1Avg = period1Data.length > 0
      ? period1Data.reduce((sum, s) => sum + s.metric_value, 0) / period1Data.length
      : 0

    const period2Avg = period2Data.length > 0
      ? period2Data.reduce((sum, s) => sum + s.metric_value, 0) / period2Data.length
      : 0

    const changeAbsolute = period2Avg - period1Avg
    const changePercentage = period1Avg !== 0
      ? (changeAbsolute / period1Avg) * 100
      : 0

    // Determine if change is an improvement (depends on metric type)
    const improvementMetrics: MetricType[] = [
      'occupancy_rate',
      'monthly_revenue',
      'annual_revenue',
      'collection_rate',
      'staff_ratio',
      'haccp_compliance',
      'parent_engagement',
      'retention_rate',
      'conversion_rate'
    ]
    const isImprovement = improvementMetrics.includes(metricType)
      ? changePercentage > 0
      : changePercentage < 0 // For absenteeism, lower is better

    return {
      metric_type: metricType,
      period1_value: period1Avg,
      period2_value: period2Avg,
      change_percentage: changePercentage,
      change_absolute: changeAbsolute,
      is_improvement: isImprovement
    }
  }
}

export const metricsService = new MetricsService()
