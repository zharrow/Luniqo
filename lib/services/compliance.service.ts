import { createClient } from '@/lib/supabase/client'
import { formatDateLocal } from '@/lib/utils/date'

// ============================================================================
// TYPES
// ============================================================================

export interface RatioLog {
  id: string
  nursery_id: string
  room_id?: string
  section_id?: string
  log_timestamp: string
  log_date: string
  log_hour: number
  children_present: number
  children_under_18_months: number
  children_over_18_months: number
  staff_present: number
  qualified_staff_present: number
  actual_ratio?: number
  required_ratio?: number
  is_compliant: boolean
  non_compliance_severity?: string
  alert_triggered: boolean
  alert_sent_to?: string[]
  action_taken?: string
  notes?: string
  created_at: string
}

export interface CreateRatioLogInput {
  nursery_id: string
  room_id?: string
  section_id?: string
  children_present: number
  children_under_18_months: number
  children_over_18_months: number
  staff_present: number
  qualified_staff_present: number
  notes?: string
}

export interface RegulatoryReport {
  id: string
  nursery_id: string
  report_type: string
  report_date: string
  report_period_start?: string
  report_period_end?: string
  compliance_status: 'compliant' | 'non_compliant' | 'warning' | 'under_review'
  report_data?: any
  report_file_url?: string
  notes?: string
  corrective_actions_required?: string
  corrective_actions_taken?: string
  generated_by_id?: string
  verified_by_id?: string
  verified_at?: string
  created_at: string
  updated_at: string
}

export interface CreateReportInput {
  nursery_id: string
  report_type: string
  report_date: string
  report_period_start?: string
  report_period_end?: string
  compliance_status: 'compliant' | 'non_compliant' | 'warning' | 'under_review'
  report_data?: any
  notes?: string
  corrective_actions_required?: string
  generated_by_id?: string
}

export interface RatioCalculation {
  actual_ratio: number
  required_ratio: number
  qualified_percentage: number
  is_compliant: boolean
  severity?: string
  reason?: string
}

export interface ComplianceStatus {
  is_compliant: boolean
  current_ratio: number
  required_ratio: number
  qualified_staff_percentage: number
  issues: string[]
  warnings: string[]
  recommendations: string[]
}

export interface DailyComplianceSummary {
  date: string
  total_logs: number
  compliant_logs: number
  non_compliant_logs: number
  compliance_rate: number
  minor_issues: number
  moderate_issues: number
  critical_issues: number
  avg_actual_ratio: number
  avg_required_ratio: number
  avg_children_present: number
  avg_staff_present: number
  avg_qualified_staff_pct: number
}

// ============================================================================
// COMPLIANCE SERVICE
// Description: Manages regulatory compliance and staff-to-children ratios
// ============================================================================

export class ComplianceService {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  // ==========================================================================
  // RATIO CALCULATION METHODS
  // ==========================================================================

  /**
   * Calculate the required ratio based on age distribution
   * French regulations: 1:5 for <18mo, 1:8 for ≥18mo
   */
  calculateRequiredRatio(
    childrenUnder18Months: number,
    childrenOver18Months: number
  ): number {
    const totalChildren = childrenUnder18Months + childrenOver18Months

    if (totalChildren === 0) return 0

    // Required staff based on age mix
    const requiredStaff = Math.ceil(
      childrenUnder18Months / 5.0 + childrenOver18Months / 8.0
    )

    // Required ratio
    const requiredRatio = totalChildren / requiredStaff

    return Number(requiredRatio.toFixed(2))
  }

  /**
   * Check if current staffing is compliant
   */
  checkCompliance(
    childrenPresent: number,
    childrenUnder18Months: number,
    childrenOver18Months: number,
    staffPresent: number,
    qualifiedStaffPresent: number
  ): RatioCalculation {
    // No children = compliant
    if (childrenPresent === 0) {
      return {
        actual_ratio: 0,
        required_ratio: 0,
        qualified_percentage: 100,
        is_compliant: true
      }
    }

    // No staff = non-compliant
    if (staffPresent === 0) {
      return {
        actual_ratio: 999,
        required_ratio: 0,
        qualified_percentage: 0,
        is_compliant: false,
        severity: 'critical',
        reason: 'No staff present'
      }
    }

    // Calculate ratios
    const actualRatio = Number((childrenPresent / staffPresent).toFixed(2))
    const requiredRatio = this.calculateRequiredRatio(
      childrenUnder18Months,
      childrenOver18Months
    )

    // Calculate qualified staff percentage
    const qualifiedPercentage = Number(
      ((qualifiedStaffPresent / staffPresent) * 100).toFixed(2)
    )

    let isCompliant = true
    const reasons: string[] = []
    let severity: string | undefined

    // Check ratio compliance
    if (actualRatio > requiredRatio) {
      isCompliant = false
      reasons.push(
        `Ratio exceeded: ${actualRatio}:1 (required: ${requiredRatio}:1)`
      )

      // Determine severity
      if (actualRatio > requiredRatio * 1.5) {
        severity = 'critical'
      } else if (actualRatio > requiredRatio * 1.2) {
        severity = 'moderate'
      } else {
        severity = 'minor'
      }
    }

    // Check qualified staff requirement (must be >= 50%)
    if (qualifiedPercentage < 50) {
      isCompliant = false
      reasons.push(
        `Insufficient qualified staff: ${qualifiedPercentage}% (required: ≥50%)`
      )

      if (!severity || severity === 'minor') {
        severity = 'moderate'
      }
    }

    return {
      actual_ratio: actualRatio,
      required_ratio: requiredRatio,
      qualified_percentage: qualifiedPercentage,
      is_compliant: isCompliant,
      severity,
      reason: reasons.join('; ')
    }
  }

  // ==========================================================================
  // RATIO LOGGING METHODS
  // ==========================================================================

  /**
   * Log the current ratio
   */
  async logRatio(data: CreateRatioLogInput): Promise<RatioLog> {
    // Use the database function to log the ratio
    const { data: result, error } = await this.supabase.rpc('log_current_ratio', {
      p_nursery_id: data.nursery_id,
      p_room_id: data.room_id || null,
      p_section_id: data.section_id || null,
      p_children_present: data.children_present,
      p_children_under_18_months: data.children_under_18_months,
      p_children_over_18_months: data.children_over_18_months,
      p_staff_present: data.staff_present,
      p_qualified_staff_present: data.qualified_staff_present
    })

    if (error) throw error

    // Fetch the created log
    const { data: log, error: fetchError } = await this.supabase
      .from('ratio_log')
      .select('*')
      .eq('id', result)
      .single()

    if (fetchError) throw fetchError
    return log
  }

  /**
   * Get ratio logs for a specific date
   */
  async getRatioHistory(nurseryId: string, date: string): Promise<RatioLog[]> {
    const { data, error } = await this.supabase
      .from('ratio_log')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('log_date', date)
      .order('log_hour', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get ratio logs for a date range
   */
  async getRatioHistoryRange(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<RatioLog[]> {
    const { data, error } = await this.supabase
      .from('ratio_log')
      .select('*')
      .eq('nursery_id', nurseryId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_timestamp', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get non-compliant ratio logs (alerts)
   */
  async getRatioAlerts(nurseryId: string, date: string): Promise<RatioLog[]> {
    const { data, error } = await this.supabase
      .from('ratio_log')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('log_date', date)
      .eq('is_compliant', false)
      .order('log_hour', { ascending: true })

    if (error) throw error
    return data || []
  }

  /**
   * Get recent non-compliant logs (last 7 days)
   */
  async getRecentAlerts(nurseryId: string, daysBack: number = 7): Promise<RatioLog[]> {
    const endDate = formatDateLocal(new Date())
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysBack)
    const startDateStr = formatDateLocal(startDate)

    const { data, error } = await this.supabase
      .from('ratio_log')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('is_compliant', false)
      .gte('log_date', startDateStr)
      .lte('log_date', endDate)
      .order('log_timestamp', { ascending: false })

    if (error) throw error
    return data || []
  }

  /**
   * Get daily compliance summary
   */
  async getDailyComplianceSummary(
    nurseryId: string,
    date: string
  ): Promise<DailyComplianceSummary | null> {
    const { data, error } = await this.supabase
      .from('compliance_summary_daily')
      .select('*')
      .eq('nursery_id', nurseryId)
      .eq('log_date', date)
      .single()

    if (error && error.code !== 'PGRST116') throw error // Ignore "not found"
    return data || null
  }

  /**
   * Get compliance summary for a date range
   */
  async getComplianceSummaryRange(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<DailyComplianceSummary[]> {
    const { data, error } = await this.supabase
      .from('compliance_summary_daily')
      .select('*')
      .eq('nursery_id', nurseryId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: false })

    if (error) throw error
    return data || []
  }

  // ==========================================================================
  // REGULATORY REPORTS METHODS
  // ==========================================================================

  /**
   * Create a regulatory report
   */
  async createReport(data: CreateReportInput): Promise<RegulatoryReport> {
    const { data: report, error } = await this.supabase
      .from('regulatory_report')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return report
  }

  /**
   * Generate daily ratio report
   */
  async generateDailyReport(
    nurseryId: string,
    date: string,
    generatedById: string
  ): Promise<RegulatoryReport> {
    // Get compliance summary for the day
    const summary = await this.getDailyComplianceSummary(nurseryId, date)
    const alerts = await this.getRatioAlerts(nurseryId, date)

    // Determine compliance status
    let complianceStatus: 'compliant' | 'non_compliant' | 'warning' | 'under_review'
    if (!summary) {
      complianceStatus = 'under_review'
    } else if (summary.compliance_rate === 100) {
      complianceStatus = 'compliant'
    } else if (summary.critical_issues > 0) {
      complianceStatus = 'non_compliant'
    } else if (summary.moderate_issues > 0 || summary.minor_issues > 0) {
      complianceStatus = 'warning'
    } else {
      complianceStatus = 'compliant'
    }

    // Build report data
    const reportData = {
      summary,
      alerts: alerts.map((a) => ({
        hour: a.log_hour,
        severity: a.non_compliance_severity,
        actual_ratio: a.actual_ratio,
        required_ratio: a.required_ratio,
        children_present: a.children_present,
        staff_present: a.staff_present,
        notes: a.notes
      }))
    }

    // Create the report
    return this.createReport({
      nursery_id: nurseryId,
      report_type: 'daily_ratio',
      report_date: date,
      report_period_start: date,
      report_period_end: date,
      compliance_status: complianceStatus,
      report_data: reportData,
      generated_by_id: generatedById
    })
  }

  /**
   * Generate monthly summary report
   */
  async generateMonthlyReport(
    nurseryId: string,
    year: number,
    month: number,
    generatedById: string
  ): Promise<RegulatoryReport> {
    // Calculate date range
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // Get summary for the period
    const summaries = await this.getComplianceSummaryRange(nurseryId, startDate, endDate)

    // Calculate aggregate statistics
    const totalLogs = summaries.reduce((sum, s) => sum + s.total_logs, 0)
    const compliantLogs = summaries.reduce((sum, s) => sum + s.compliant_logs, 0)
    const nonCompliantLogs = summaries.reduce((sum, s) => sum + s.non_compliant_logs, 0)
    const criticalIssues = summaries.reduce((sum, s) => sum + s.critical_issues, 0)
    const moderateIssues = summaries.reduce((sum, s) => sum + s.moderate_issues, 0)
    const minorIssues = summaries.reduce((sum, s) => sum + s.minor_issues, 0)

    const complianceRate = totalLogs > 0 ? Number(((compliantLogs / totalLogs) * 100).toFixed(2)) : 100

    // Determine compliance status
    let complianceStatus: 'compliant' | 'non_compliant' | 'warning' | 'under_review'
    if (complianceRate >= 95 && criticalIssues === 0) {
      complianceStatus = 'compliant'
    } else if (criticalIssues > 0 || complianceRate < 80) {
      complianceStatus = 'non_compliant'
    } else {
      complianceStatus = 'warning'
    }

    // Build report data
    const reportData = {
      total_logs: totalLogs,
      compliant_logs: compliantLogs,
      non_compliant_logs: nonCompliantLogs,
      compliance_rate: complianceRate,
      critical_issues: criticalIssues,
      moderate_issues: moderateIssues,
      minor_issues: minorIssues,
      daily_summaries: summaries
    }

    // Create the report
    const reportDate = formatDateLocal(new Date())
    return this.createReport({
      nursery_id: nurseryId,
      report_type: 'monthly_summary',
      report_date: reportDate,
      report_period_start: startDate,
      report_period_end: endDate,
      compliance_status: complianceStatus,
      report_data: reportData,
      generated_by_id: generatedById
    })
  }

  /**
   * Get all reports for a nursery
   */
  async getReports(nurseryId: string, reportType?: string): Promise<RegulatoryReport[]> {
    let query = this.supabase
      .from('regulatory_report')
      .select('*')
      .eq('nursery_id', nurseryId)
      .order('report_date', { ascending: false })

    if (reportType) {
      query = query.eq('report_type', reportType)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Get a report by ID
   */
  async getReportById(reportId: string): Promise<RegulatoryReport> {
    const { data, error } = await this.supabase
      .from('regulatory_report')
      .select('*')
      .eq('id', reportId)
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update a report
   */
  async updateReport(
    reportId: string,
    updates: Partial<CreateReportInput>
  ): Promise<RegulatoryReport> {
    const { data, error } = await this.supabase
      .from('regulatory_report')
      .update(updates)
      .eq('id', reportId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Verify a report
   */
  async verifyReport(reportId: string, verifiedById: string): Promise<RegulatoryReport> {
    return this.updateReport(reportId, {
      verified_by_id: verifiedById,
      verified_at: new Date().toISOString()
    } as any)
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId: string): Promise<void> {
    const { error } = await this.supabase
      .from('regulatory_report')
      .delete()
      .eq('id', reportId)

    if (error) throw error
  }

  // ==========================================================================
  // QUALIFICATION COMPLIANCE METHODS
  // ==========================================================================

  /**
   * Get the percentage of qualified staff at a nursery
   */
  async getQualifiedStaffPercentage(nurseryId: string): Promise<number> {
    // Get all active employees for the nursery's enterprise
    const { data: nurseryData } = await this.supabase
      .from('nursery')
      .select('enterprise_id')
      .eq('id', nurseryId)
      .single()

    if (!nurseryData) return 0

    // Get all employees
    const { data: employees } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('role', 'Employee')
      .eq('enterprise_id', nurseryData.enterprise_id)
      .eq('is_active', true)

    if (!employees || employees.length === 0) return 0

    // Get employees with active, verified qualifications
    const { data: qualifications } = await this.supabase
      .from('staff_qualification')
      .select('employee_id')
      .in('employee_id', employees.map((e: any) => e.id))
      .eq('is_active', true)
      .eq('is_verified', true)
      .in('qualification_type', ['diploma', 'certification'])

    const uniqueQualifiedEmployees = new Set(
      (qualifications || []).map((q: any) => q.employee_id)
    )

    const percentage = (uniqueQualifiedEmployees.size / employees.length) * 100
    return Number(percentage.toFixed(2))
  }
}
