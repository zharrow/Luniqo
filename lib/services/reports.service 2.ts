/**
 * Reports Service
 *
 * Generates, schedules, and exports reports for nurseries:
 * - Predefined reports (monthly, financial, staff, HACCP)
 * - Custom reports (user-defined metrics and filters)
 * - Export formats (PDF, Excel, CSV)
 * - Scheduled reports (automatic generation and email delivery)
 */

import { createClient } from '@/lib/supabase/client'
import { metricsService } from './metrics.service'
import { analyticsService } from './analytics.service'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ReportType =
  | 'monthly_summary'
  | 'financial'
  | 'staff'
  | 'haccp'
  | 'occupancy'
  | 'parent_engagement'
  | 'custom'

export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV' | 'JSON'

export type ReportScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

export type ReportExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface CustomReport {
  id: string
  nursery_id: string
  name: string
  description: string | null
  report_type: ReportType
  config: Record<string, any> // Flexible JSON config
  is_scheduled: boolean
  schedule_frequency: ReportScheduleFrequency | null
  schedule_day_of_week: number | null // 0-6 for WEEKLY
  schedule_day_of_month: number | null // 1-31 for MONTHLY
  next_execution_date: string | null
  is_template: boolean
  created_by_id: string
  execution_count: number
  last_executed_at: string | null
  created_at: string
  updated_at: string
}

export interface ReportExecutionLog {
  id: string
  report_id: string
  executed_at: string
  status: ReportExecutionStatus
  output_format: ReportFormat
  output_file_url: string | null
  execution_time_ms: number | null
  error_message: string | null
  metadata: Record<string, any> | null
}

export interface ReportConfig {
  title: string
  description?: string
  period: {
    startDate: string
    endDate: string
  }
  metrics: string[] // List of metric types to include
  filters?: {
    sections?: string[]
    contractTypes?: string[]
    employeeIds?: string[]
  }
  groupBy?: 'day' | 'week' | 'month'
  includeCharts?: boolean
}

export interface ReportData {
  metadata: {
    report_id: string
    report_name: string
    generated_at: string
    period: {
      start: string
      end: string
    }
    nursery_name?: string
  }
  summary: {
    [key: string]: number | string
  }
  sections: ReportSection[]
}

export interface ReportSection {
  title: string
  description?: string
  data: any[] | Record<string, any>
  chart?: {
    type: 'line' | 'bar' | 'pie' | 'area'
    data: any[]
  }
}

export interface CreateReportInput {
  name: string
  description?: string
  report_type: ReportType
  config: ReportConfig
  is_scheduled?: boolean
  schedule_frequency?: ReportScheduleFrequency
  schedule_day_of_week?: number
  schedule_day_of_month?: number
  is_template?: boolean
}

// ============================================================================
// REPORTS SERVICE
// ============================================================================

export class ReportsService {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  // ==========================================================================
  // PREDEFINED REPORTS
  // ==========================================================================

  /**
   * Generate complete monthly summary report
   */
  async generateMonthlyReport(nurseryId: string, month: string): Promise<ReportData> {
    try {
      const startDate = `${month}-01`
      const endDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0)
        .toISOString()
        .split('T')[0]

      // Get all metrics for the month
      const [
        dashboard,
        occupancyTrend,
        revenueByType,
        childrenBySection,
        haccpCompliance,
        parentEngagement
      ] = await Promise.all([
        metricsService.getDashboardSummary(nurseryId, endDate),
        analyticsService.getOccupancyTrend(nurseryId, 1),
        analyticsService.getRevenueByMonth(nurseryId, parseInt(month.split('-')[0])),
        analyticsService.getChildrenBySection(nurseryId),
        metricsService.calculateHACCPComplianceRate(nurseryId, startDate, endDate),
        metricsService.calculateParentEngagementRate(nurseryId, startDate, endDate)
      ])

      const reportData: ReportData = {
        metadata: {
          report_id: `monthly-${month}`,
          report_name: `Rapport Mensuel - ${month}`,
          generated_at: new Date().toISOString(),
          period: { start: startDate, end: endDate }
        },
        summary: {
          'Taux d\'occupation': `${dashboard.occupancy_rate.toFixed(1)}%`,
          'Chiffre d\'affaires': `${dashboard.monthly_revenue.toFixed(2)}€`,
          'Ratio encadrement': dashboard.staff_ratio.toFixed(2),
          'Conformité HACCP': `${dashboard.haccp_compliance.toFixed(1)}%`,
          'Engagement parents': `${parentEngagement.engagement_rate.toFixed(1)}%`
        },
        sections: [
          {
            title: 'Évolution de l\'occupation',
            data: occupancyTrend,
            chart: {
              type: 'line',
              data: occupancyTrend
            }
          },
          {
            title: 'Chiffre d\'affaires par type de contrat',
            data: revenueByType
          },
          {
            title: 'Répartition des enfants par section',
            data: childrenBySection,
            chart: {
              type: 'pie',
              data: childrenBySection.map(s => ({
                name: s.section,
                value: s.active_count
              }))
            }
          },
          {
            title: 'Conformité HACCP',
            data: haccpCompliance
          }
        ]
      }

      return reportData
    } catch (error) {
      console.error('Error generating monthly report:', error)
      throw error
    }
  }

  /**
   * Generate financial report
   */
  async generateFinancialReport(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<ReportData> {
    try {
      const [
        financialMetrics,
        revenueByMonth,
        agingReceivables
      ] = await Promise.all([
        metricsService.getFinancialMetrics(nurseryId, startDate, endDate),
        analyticsService.getRevenueTrend(nurseryId, 12),
        analyticsService.getInvoiceAgingReport(nurseryId)
      ])

      const reportData: ReportData = {
        metadata: {
          report_id: `financial-${startDate}-${endDate}`,
          report_name: 'Rapport Financier',
          generated_at: new Date().toISOString(),
          period: { start: startDate, end: endDate }
        },
        summary: {
          'MRR': `${financialMetrics.mrr.toFixed(2)}€`,
          'ARR': `${financialMetrics.arr.toFixed(2)}€`,
          'Taux de recouvrement': `${financialMetrics.collection_rate.toFixed(1)}%`,
          'Montant impayé': `${financialMetrics.outstanding_amount.toFixed(2)}€`
        },
        sections: [
          {
            title: 'Évolution du chiffre d\'affaires',
            description: '12 derniers mois',
            data: revenueByMonth,
            chart: {
              type: 'area',
              data: revenueByMonth
            }
          },
          {
            title: 'Aging des créances',
            description: 'Factures en retard par tranche d\'âge',
            data: agingReceivables,
            chart: {
              type: 'bar',
              data: agingReceivables.map(a => ({
                name: a.age_bucket,
                value: a.total_amount
              }))
            }
          }
        ]
      }

      return reportData
    } catch (error) {
      console.error('Error generating financial report:', error)
      throw error
    }
  }

  /**
   * Generate staff report
   */
  async generateStaffReport(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<ReportData> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const [
        staffMetrics,
        staffHours
      ] = await Promise.all([
        metricsService.getStaffMetrics(nurseryId, today, startDate, endDate),
        analyticsService.getStaffHoursByEmployee(nurseryId, startDate, endDate)
      ])

      const totalRegularHours = staffHours.reduce((sum, s) => sum + s.regular_hours, 0)
      const totalOvertimeHours = staffHours.reduce((sum, s) => sum + s.overtime_hours, 0)
      const totalHours = staffHours.reduce((sum, s) => sum + s.total_hours, 0)

      const reportData: ReportData = {
        metadata: {
          report_id: `staff-${startDate}-${endDate}`,
          report_name: 'Rapport Personnel',
          generated_at: new Date().toISOString(),
          period: { start: startDate, end: endDate }
        },
        summary: {
          'Taux d\'absentéisme': `${staffMetrics.absenteeism_rate.toFixed(1)}%`,
          'Ratio encadrement': staffMetrics.current_ratio.toFixed(2),
          'Conformité ratio': staffMetrics.is_compliant ? 'Oui' : 'Non',
          'Heures totales': totalHours.toFixed(1),
          'Heures supplémentaires': `${totalOvertimeHours.toFixed(1)} (${((totalOvertimeHours / totalHours) * 100).toFixed(1)}%)`
        },
        sections: [
          {
            title: 'Heures par employé',
            data: staffHours,
            chart: {
              type: 'bar',
              data: staffHours.map(s => ({
                name: s.employee_name,
                regular: s.regular_hours,
                overtime: s.overtime_hours
              }))
            }
          }
        ]
      }

      return reportData
    } catch (error) {
      console.error('Error generating staff report:', error)
      throw error
    }
  }

  /**
   * Generate HACCP compliance report
   */
  async generateHACCPReport(
    nurseryId: string,
    startDate: string,
    endDate: string
  ): Promise<ReportData> {
    try {
      const [
        haccpMetrics,
        incidentsByCategory
      ] = await Promise.all([
        metricsService.calculateHACCPComplianceRate(nurseryId, startDate, endDate),
        metricsService.getHACCPIncidentsByCategory(nurseryId, startDate, endDate)
      ])

      const totalIncidents = incidentsByCategory.reduce((sum, i) => sum + i.incident_count, 0)

      const reportData: ReportData = {
        metadata: {
          report_id: `haccp-${startDate}-${endDate}`,
          report_name: 'Rapport HACCP',
          generated_at: new Date().toISOString(),
          period: { start: startDate, end: endDate }
        },
        summary: {
          'Taux de conformité': `${haccpMetrics.compliance_rate.toFixed(1)}%`,
          'Contrôles effectués': haccpMetrics.total_checks,
          'Contrôles OK': haccpMetrics.passed_checks,
          'Non-conformités': haccpMetrics.failed_checks,
          'Total incidents': totalIncidents
        },
        sections: [
          {
            title: 'Incidents par catégorie',
            data: incidentsByCategory,
            chart: {
              type: 'pie',
              data: incidentsByCategory.map(i => ({
                name: i.category,
                value: i.incident_count
              }))
            }
          }
        ]
      }

      return reportData
    } catch (error) {
      console.error('Error generating HACCP report:', error)
      throw error
    }
  }

  // ==========================================================================
  // CUSTOM REPORTS
  // ==========================================================================

  /**
   * Create a custom report
   */
  async createCustomReport(
    nurseryId: string,
    input: CreateReportInput,
    createdById: string
  ): Promise<CustomReport> {
    try {
      const reportData: any = {
        nursery_id: nurseryId,
        name: input.name,
        description: input.description || null,
        report_type: input.report_type,
        config: input.config,
        is_scheduled: input.is_scheduled || false,
        schedule_frequency: input.schedule_frequency || null,
        schedule_day_of_week: input.schedule_day_of_week || null,
        schedule_day_of_month: input.schedule_day_of_month || null,
        is_template: input.is_template || false,
        created_by_id: createdById
      }

      // Calculate next execution date if scheduled
      if (input.is_scheduled && input.schedule_frequency) {
        reportData.next_execution_date = this.calculateNextExecutionDate(
          input.schedule_frequency,
          input.schedule_day_of_week,
          input.schedule_day_of_month
        )
      }

      const { data, error } = await this.supabase
        .from('custom_report')
        .insert(reportData)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating custom report:', error)
      throw error
    }
  }

  /**
   * Execute a custom report
   */
  async executeCustomReport(
    reportId: string,
    format: ReportFormat = 'JSON'
  ): Promise<ReportData> {
    try {
      // Get report config
      const { data: report, error } = await this.supabase
        .from('custom_report')
        .select('*')
        .eq('id', reportId)
        .single()

      if (error) throw error

      const config = report.config as ReportConfig

      // Execute based on report type
      let reportData: ReportData

      switch (report.report_type) {
        case 'monthly_summary':
          reportData = await this.generateMonthlyReport(
            report.nursery_id,
            config.period.startDate.substring(0, 7)
          )
          break
        case 'financial':
          reportData = await this.generateFinancialReport(
            report.nursery_id,
            config.period.startDate,
            config.period.endDate
          )
          break
        case 'staff':
          reportData = await this.generateStaffReport(
            report.nursery_id,
            config.period.startDate,
            config.period.endDate
          )
          break
        case 'haccp':
          reportData = await this.generateHACCPReport(
            report.nursery_id,
            config.period.startDate,
            config.period.endDate
          )
          break
        default:
          throw new Error(`Report type ${report.report_type} not implemented`)
      }

      // Log execution
      await this.logReportExecution(reportId, 'COMPLETED', format, null)

      return reportData
    } catch (error) {
      console.error('Error executing custom report:', error)
      await this.logReportExecution(reportId, 'FAILED', format, (error as Error).message)
      throw error
    }
  }

  /**
   * Schedule a report for automatic execution
   */
  async scheduleReport(
    reportId: string,
    frequency: ReportScheduleFrequency,
    dayOfWeek?: number,
    dayOfMonth?: number
  ): Promise<CustomReport> {
    try {
      const nextExecutionDate = this.calculateNextExecutionDate(frequency, dayOfWeek, dayOfMonth)

      const { data, error } = await this.supabase
        .from('custom_report')
        .update({
          is_scheduled: true,
          schedule_frequency: frequency,
          schedule_day_of_week: dayOfWeek || null,
          schedule_day_of_month: dayOfMonth || null,
          next_execution_date: nextExecutionDate
        })
        .eq('id', reportId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error scheduling report:', error)
      throw error
    }
  }

  /**
   * Get all reports for a nursery
   */
  async getReports(nurseryId: string): Promise<CustomReport[]> {
    try {
      const { data, error } = await this.supabase
        .from('custom_report')
        .select('*')
        .eq('nursery_id', nurseryId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching reports:', error)
      throw error
    }
  }

  /**
   * Get report templates
   */
  async getTemplates(): Promise<CustomReport[]> {
    try {
      const { data, error } = await this.supabase
        .from('custom_report')
        .select('*')
        .eq('is_template', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching templates:', error)
      throw error
    }
  }

  /**
   * Get execution history for a report
   */
  async getExecutionHistory(reportId: string): Promise<ReportExecutionLog[]> {
    try {
      const { data, error } = await this.supabase
        .from('report_execution_log')
        .select('*')
        .eq('report_id', reportId)
        .order('executed_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching execution history:', error)
      throw error
    }
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('custom_report')
        .delete()
        .eq('id', reportId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting report:', error)
      throw error
    }
  }

  // ==========================================================================
  // EXPORT METHODS
  // ==========================================================================

  /**
   * Export report to PDF (placeholder - requires PDF library)
   */
  async exportToPDF(reportData: ReportData): Promise<Blob> {
    try {
      // TODO: Implement PDF generation with jsPDF or similar
      // This is a placeholder that returns JSON as blob
      const json = JSON.stringify(reportData, null, 2)
      return new Blob([json], { type: 'application/json' })
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      throw error
    }
  }

  /**
   * Export report to Excel (placeholder - requires xlsx library)
   */
  async exportToExcel(reportData: ReportData): Promise<Blob> {
    try {
      // TODO: Implement Excel generation with xlsx library
      // This is a placeholder that returns JSON as blob
      const json = JSON.stringify(reportData, null, 2)
      return new Blob([json], { type: 'application/json' })
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      throw error
    }
  }

  /**
   * Export report to CSV
   */
  async exportToCSV(reportData: ReportData): Promise<Blob> {
    try {
      let csv = ''

      // Header
      csv += `Rapport: ${reportData.metadata.report_name}\n`
      csv += `Généré le: ${new Date(reportData.metadata.generated_at).toLocaleString('fr-FR')}\n`
      csv += `Période: ${reportData.metadata.period.start} - ${reportData.metadata.period.end}\n`
      csv += '\n'

      // Summary
      csv += 'RÉSUMÉ\n'
      for (const [key, value] of Object.entries(reportData.summary)) {
        csv += `${key},${value}\n`
      }
      csv += '\n'

      // Sections
      for (const section of reportData.sections) {
        csv += `${section.title}\n`
        if (section.description) {
          csv += `${section.description}\n`
        }

        // Convert data to CSV rows
        if (Array.isArray(section.data)) {
          if (section.data.length > 0) {
            const headers = Object.keys(section.data[0])
            csv += headers.join(',') + '\n'

            for (const row of section.data) {
              const values = headers.map(h => row[h] ?? '')
              csv += values.join(',') + '\n'
            }
          }
        } else {
          // Object data
          for (const [key, value] of Object.entries(section.data)) {
            csv += `${key},${value}\n`
          }
        }

        csv += '\n'
      }

      return new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    } catch (error) {
      console.error('Error exporting to CSV:', error)
      throw error
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Calculate next execution date for scheduled reports
   */
  private calculateNextExecutionDate(
    frequency: ReportScheduleFrequency,
    dayOfWeek?: number,
    dayOfMonth?: number
  ): string {
    const now = new Date()

    switch (frequency) {
      case 'DAILY':
        now.setDate(now.getDate() + 1)
        now.setHours(8, 0, 0, 0) // 8:00 AM
        break

      case 'WEEKLY':
        const targetDay = dayOfWeek ?? 1 // Default to Monday
        const currentDay = now.getDay()
        const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7
        now.setDate(now.getDate() + daysUntilTarget)
        now.setHours(8, 0, 0, 0)
        break

      case 'MONTHLY':
        const targetDate = dayOfMonth ?? 1 // Default to 1st of month
        now.setMonth(now.getMonth() + 1)
        now.setDate(targetDate)
        now.setHours(8, 0, 0, 0)
        break

      case 'QUARTERLY':
        now.setMonth(now.getMonth() + 3)
        now.setDate(1)
        now.setHours(8, 0, 0, 0)
        break

      case 'YEARLY':
        now.setFullYear(now.getFullYear() + 1)
        now.setMonth(0)
        now.setDate(1)
        now.setHours(8, 0, 0, 0)
        break
    }

    return now.toISOString()
  }

  /**
   * Log report execution
   */
  private async logReportExecution(
    reportId: string,
    status: ReportExecutionStatus,
    format: ReportFormat,
    errorMessage: string | null
  ): Promise<void> {
    try {
      await this.supabase.from('report_execution_log').insert({
        report_id: reportId,
        status,
        output_format: format,
        error_message: errorMessage
      })
    } catch (error) {
      console.error('Error logging report execution:', error)
    }
  }
}

export const reportsService = new ReportsService()
