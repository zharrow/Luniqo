/**
 * Dashboard Service
 *
 * Manages customizable dashboards with drag-and-drop widgets:
 * - Widget configuration (position, size, type)
 * - Widget data fetching (KPI cards, charts, tables)
 * - Dashboard templates (predefined layouts)
 * - Widget caching for performance
 */

import { createClient } from '@/lib/supabase/client'
import { metricsService } from './metrics.service'
import { analyticsService } from './analytics.service'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type WidgetType =
  | 'KPI_CARD'
  | 'LINE_CHART'
  | 'BAR_CHART'
  | 'PIE_CHART'
  | 'AREA_CHART'
  | 'GAUGE_CHART'
  | 'TABLE'
  | 'HEATMAP'
  | 'FUNNEL_CHART'
  | 'METRIC_COMPARISON'

export type WidgetSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE'

export type WidgetRefreshFrequency = 'REALTIME' | 'EVERY_5_MIN' | 'EVERY_15_MIN' | 'HOURLY' | 'DAILY' | 'MANUAL'

export interface DashboardWidget {
  id: string
  nursery_id: string
  owner_id: string
  widget_type: WidgetType
  title: string
  description: string | null
  config: Record<string, any> // Widget-specific configuration
  position_x: number
  position_y: number
  width: number
  height: number
  size: WidgetSize
  refresh_frequency: WidgetRefreshFrequency
  is_visible: boolean
  display_order: number
  cached_data: Record<string, any> | null
  cache_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface DashboardTemplate {
  id: string
  name: string
  description: string | null
  is_default: boolean
  widgets: WidgetConfig[]
  preview_image_url: string | null
  created_at: string
}

export interface WidgetConfig {
  widget_type: WidgetType
  title: string
  description?: string
  position_x: number
  position_y: number
  width: number
  height: number
  size: WidgetSize
  refresh_frequency: WidgetRefreshFrequency
  config: Record<string, any>
}

export interface WidgetData {
  widget_id: string
  data: any
  last_updated: string
  cached: boolean
}

export interface CreateWidgetInput {
  widget_type: WidgetType
  title: string
  description?: string
  position_x?: number
  position_y?: number
  width?: number
  height?: number
  size?: WidgetSize
  refresh_frequency?: WidgetRefreshFrequency
  config?: Record<string, any>
}

export interface UpdateWidgetPositionInput {
  position_x: number
  position_y: number
  width: number
  height: number
}

// ============================================================================
// DASHBOARD SERVICE
// ============================================================================

export class DashboardService {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  // ==========================================================================
  // DASHBOARD CONFIGURATION
  // ==========================================================================

  /**
   * Get dashboard configuration for an owner
   */
  async getDashboardConfig(ownerId: string, nurseryId: string): Promise<DashboardWidget[]> {
    try {
      const { data, error } = await this.supabase
        .from('dashboard_widget')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('nursery_id', nurseryId)
        .eq('is_visible', true)
        .order('display_order', { ascending: true })

      if (error) throw error

      // If no widgets exist, create default dashboard
      if (!data || data.length === 0) {
        return await this.createDefaultDashboard(ownerId, nurseryId)
      }

      return data
    } catch (error) {
      console.error('Error fetching dashboard config:', error)
      throw error
    }
  }

  /**
   * Create default dashboard for a new owner
   */
  async createDefaultDashboard(ownerId: string, nurseryId: string): Promise<DashboardWidget[]> {
    try {
      const { data, error } = await this.supabase.rpc('create_default_dashboard', {
        p_owner_id: ownerId,
        p_nursery_id: nurseryId
      })

      if (error) throw error

      // Fetch the created widgets
      return await this.getDashboardConfig(ownerId, nurseryId)
    } catch (error) {
      console.error('Error creating default dashboard:', error)
      throw error
    }
  }

  /**
   * Apply a template to dashboard
   */
  async applyTemplate(
    ownerId: string,
    nurseryId: string,
    templateId: string
  ): Promise<DashboardWidget[]> {
    try {
      // Get template
      const { data: template, error: templateError } = await this.supabase
        .from('dashboard_template')
        .select('*')
        .eq('id', templateId)
        .single()

      if (templateError) throw templateError

      // Delete existing widgets
      await this.supabase
        .from('dashboard_widget')
        .delete()
        .eq('owner_id', ownerId)
        .eq('nursery_id', nurseryId)

      // Create widgets from template
      const widgetsToCreate = (template.widgets as WidgetConfig[]).map((widget, index) => ({
        nursery_id: nurseryId,
        owner_id: ownerId,
        widget_type: widget.widget_type,
        title: widget.title,
        description: widget.description || null,
        config: widget.config,
        position_x: widget.position_x,
        position_y: widget.position_y,
        width: widget.width,
        height: widget.height,
        size: widget.size,
        refresh_frequency: widget.refresh_frequency,
        is_visible: true,
        display_order: index
      }))

      const { data, error } = await this.supabase
        .from('dashboard_widget')
        .insert(widgetsToCreate)
        .select()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error applying template:', error)
      throw error
    }
  }

  // ==========================================================================
  // WIDGET MANAGEMENT
  // ==========================================================================

  /**
   * Add a new widget to dashboard
   */
  async addWidget(
    ownerId: string,
    nurseryId: string,
    input: CreateWidgetInput
  ): Promise<DashboardWidget> {
    try {
      // Get next display order
      const { count } = await this.supabase
        .from('dashboard_widget')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', ownerId)
        .eq('nursery_id', nurseryId)

      const widgetData: any = {
        nursery_id: nurseryId,
        owner_id: ownerId,
        widget_type: input.widget_type,
        title: input.title,
        description: input.description || null,
        config: input.config || {},
        position_x: input.position_x ?? 0,
        position_y: input.position_y ?? 0,
        width: input.width ?? this.getDefaultWidthForType(input.widget_type),
        height: input.height ?? this.getDefaultHeightForType(input.widget_type),
        size: input.size || 'MEDIUM',
        refresh_frequency: input.refresh_frequency || 'EVERY_5_MIN',
        is_visible: true,
        display_order: (count || 0)
      }

      const { data, error } = await this.supabase
        .from('dashboard_widget')
        .insert(widgetData)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error adding widget:', error)
      throw error
    }
  }

  /**
   * Remove a widget from dashboard
   */
  async removeWidget(widgetId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('dashboard_widget')
        .delete()
        .eq('id', widgetId)

      if (error) throw error
    } catch (error) {
      console.error('Error removing widget:', error)
      throw error
    }
  }

  /**
   * Update widget position (for drag & drop)
   */
  async updateWidgetPosition(
    widgetId: string,
    position: UpdateWidgetPositionInput
  ): Promise<DashboardWidget> {
    try {
      const { data, error } = await this.supabase
        .from('dashboard_widget')
        .update(position)
        .eq('id', widgetId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating widget position:', error)
      throw error
    }
  }

  /**
   * Update widget configuration
   */
  async updateWidgetConfig(
    widgetId: string,
    config: Record<string, any>
  ): Promise<DashboardWidget> {
    try {
      const { data, error } = await this.supabase
        .from('dashboard_widget')
        .update({ config })
        .eq('id', widgetId)
        .select()
        .single()

      if (error) throw error

      // Invalidate cache
      await this.invalidateWidgetCache(widgetId)

      return data
    } catch (error) {
      console.error('Error updating widget config:', error)
      throw error
    }
  }

  /**
   * Toggle widget visibility
   */
  async toggleWidgetVisibility(widgetId: string, isVisible: boolean): Promise<DashboardWidget> {
    try {
      const { data, error } = await this.supabase
        .from('dashboard_widget')
        .update({ is_visible: isVisible })
        .eq('id', widgetId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error toggling widget visibility:', error)
      throw error
    }
  }

  // ==========================================================================
  // WIDGET DATA
  // ==========================================================================

  /**
   * Get data for a specific widget
   */
  async getWidgetData(widgetId: string, forceRefresh: boolean = false): Promise<WidgetData> {
    try {
      // Get widget config
      const { data: widget, error } = await this.supabase
        .from('dashboard_widget')
        .select('*')
        .eq('id', widgetId)
        .single()

      if (error) throw error

      // Check if cache is valid
      const cacheValid = !forceRefresh && widget.cache_expires_at &&
        new Date(widget.cache_expires_at) > new Date()

      if (cacheValid && widget.cached_data) {
        return {
          widget_id: widgetId,
          data: widget.cached_data,
          last_updated: widget.updated_at,
          cached: true
        }
      }

      // Fetch fresh data based on widget type
      const freshData = await this.fetchWidgetData(widget)

      // Update cache
      await this.updateWidgetCache(widgetId, freshData, widget.refresh_frequency)

      return {
        widget_id: widgetId,
        data: freshData,
        last_updated: new Date().toISOString(),
        cached: false
      }
    } catch (error) {
      console.error('Error getting widget data:', error)
      throw error
    }
  }

  /**
   * Refresh all widgets for a dashboard
   */
  async refreshAllWidgets(ownerId: string, nurseryId: string): Promise<WidgetData[]> {
    try {
      const widgets = await this.getDashboardConfig(ownerId, nurseryId)

      const widgetDataPromises = widgets.map(widget =>
        this.getWidgetData(widget.id, true)
      )

      return await Promise.all(widgetDataPromises)
    } catch (error) {
      console.error('Error refreshing all widgets:', error)
      throw error
    }
  }

  /**
   * Fetch data for a widget based on its type and config
   */
  private async fetchWidgetData(widget: DashboardWidget): Promise<any> {
    const { widget_type, nursery_id, config } = widget
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    switch (widget_type) {
      case 'KPI_CARD':
        return await this.fetchKPICardData(nursery_id, config)

      case 'LINE_CHART':
        return await this.fetchLineChartData(nursery_id, config)

      case 'BAR_CHART':
        return await this.fetchBarChartData(nursery_id, config)

      case 'PIE_CHART':
        return await this.fetchPieChartData(nursery_id, config)

      case 'AREA_CHART':
        return await this.fetchAreaChartData(nursery_id, config)

      case 'GAUGE_CHART':
        return await this.fetchGaugeChartData(nursery_id, config)

      case 'TABLE':
        return await this.fetchTableData(nursery_id, config)

      case 'METRIC_COMPARISON':
        return await this.fetchMetricComparisonData(nursery_id, config)

      default:
        return {}
    }
  }

  /**
   * Fetch KPI card data
   */
  private async fetchKPICardData(nurseryId: string, config: any): Promise<any> {
    const metricType = config.metric_type || 'occupancy_rate'
    const today = new Date().toISOString().split('T')[0]

    switch (metricType) {
      case 'occupancy_rate':
        const occupancy = await metricsService.calculateOccupancyRate(nurseryId, today)
        return {
          value: occupancy.occupancy_rate,
          unit: '%',
          label: 'Taux d\'occupation'
        }

      case 'monthly_revenue':
        const month = today.substring(0, 7)
        const mrr = await metricsService.calculateMRR(nurseryId, month)
        return {
          value: mrr,
          unit: '€',
          label: 'Chiffre d\'affaires mensuel'
        }

      case 'haccp_compliance':
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const haccp = await metricsService.calculateHACCPComplianceRate(
          nurseryId,
          sevenDaysAgo.toISOString().split('T')[0],
          today
        )
        return {
          value: haccp.compliance_rate,
          unit: '%',
          label: 'Conformité HACCP'
        }

      default:
        return { value: 0, unit: '', label: 'N/A' }
    }
  }

  /**
   * Fetch line chart data
   */
  private async fetchLineChartData(nurseryId: string, config: any): Promise<any> {
    const metricType = config.metric_type || 'occupancy'
    const months = config.months || 6

    const trend = metricType === 'occupancy'
      ? await analyticsService.getOccupancyTrend(nurseryId, months)
      : await analyticsService.getRevenueTrend(nurseryId, months)

    return trend
  }

  /**
   * Fetch bar chart data
   */
  private async fetchBarChartData(nurseryId: string, config: any): Promise<any> {
    const dataType = config.data_type || 'children_by_section'

    if (dataType === 'children_by_section') {
      return await analyticsService.getChildrenBySection(nurseryId)
    }

    return []
  }

  /**
   * Fetch pie chart data
   */
  private async fetchPieChartData(nurseryId: string, config: any): Promise<any> {
    const dataType = config.data_type || 'children_by_section'

    if (dataType === 'children_by_section') {
      const sections = await analyticsService.getChildrenBySection(nurseryId)
      return sections.map(s => ({
        name: s.section,
        value: s.active_count
      }))
    }

    return []
  }

  /**
   * Fetch area chart data
   */
  private async fetchAreaChartData(nurseryId: string, config: any): Promise<any> {
    return await this.fetchLineChartData(nurseryId, config)
  }

  /**
   * Fetch gauge chart data
   */
  private async fetchGaugeChartData(nurseryId: string, config: any): Promise<any> {
    const today = new Date().toISOString().split('T')[0]
    const occupancy = await metricsService.calculateOccupancyRate(nurseryId, today)

    return {
      value: occupancy.occupancy_rate,
      max: 100,
      label: 'Taux d\'occupation'
    }
  }

  /**
   * Fetch table data
   */
  private async fetchTableData(nurseryId: string, config: any): Promise<any> {
    const dataType = config.data_type || 'aging_receivables'

    if (dataType === 'aging_receivables') {
      return await analyticsService.getInvoiceAgingReport(nurseryId)
    }

    return []
  }

  /**
   * Fetch metric comparison data
   */
  private async fetchMetricComparisonData(nurseryId: string, config: any): Promise<any> {
    const metricType = config.metric_type || 'occupancy_rate'
    const today = new Date()
    const lastMonth = new Date(today)
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const todayStr = today.toISOString().split('T')[0]
    const lastMonthStr = lastMonth.toISOString().split('T')[0]

    const latest = await metricsService.getLatestSnapshot(nurseryId, metricType as any)
    const history = await metricsService.getSnapshotHistory(
      nurseryId,
      metricType as any,
      lastMonthStr,
      todayStr
    )

    const previousValue = history.length > 0 ? history[0].metric_value : 0
    const currentValue = latest?.metric_value || 0
    const change = previousValue !== 0
      ? ((currentValue - previousValue) / previousValue) * 100
      : 0

    return {
      current_value: currentValue,
      previous_value: previousValue,
      change_percentage: change,
      is_improvement: change > 0
    }
  }

  // ==========================================================================
  // WIDGET CACHE MANAGEMENT
  // ==========================================================================

  /**
   * Update widget cache
   */
  private async updateWidgetCache(
    widgetId: string,
    data: any,
    refreshFrequency: WidgetRefreshFrequency
  ): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('update_widget_cache', {
        p_widget_id: widgetId,
        p_cached_data: data,
        p_refresh_frequency: refreshFrequency
      })

      if (error) throw error
    } catch (error) {
      console.error('Error updating widget cache:', error)
    }
  }

  /**
   * Invalidate widget cache
   */
  private async invalidateWidgetCache(widgetId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('dashboard_widget')
        .update({
          cached_data: null,
          cache_expires_at: null
        })
        .eq('id', widgetId)

      if (error) throw error
    } catch (error) {
      console.error('Error invalidating widget cache:', error)
    }
  }

  // ==========================================================================
  // TEMPLATES
  // ==========================================================================

  /**
   * Get all available dashboard templates
   */
  async getTemplates(): Promise<DashboardTemplate[]> {
    try {
      const { data, error } = await this.supabase
        .from('dashboard_template')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name')

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching templates:', error)
      throw error
    }
  }

  /**
   * Get default template
   */
  async getDefaultTemplate(): Promise<DashboardTemplate | null> {
    try {
      const { data, error } = await this.supabase
        .from('dashboard_template')
        .select('*')
        .eq('is_default', true)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data || null
    } catch (error) {
      console.error('Error fetching default template:', error)
      throw error
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Get default width for widget type (grid units)
   */
  private getDefaultWidthForType(type: WidgetType): number {
    switch (type) {
      case 'KPI_CARD':
        return 1
      case 'GAUGE_CHART':
        return 1
      case 'PIE_CHART':
        return 2
      case 'LINE_CHART':
      case 'BAR_CHART':
      case 'AREA_CHART':
        return 2
      case 'TABLE':
        return 3
      case 'HEATMAP':
        return 3
      default:
        return 2
    }
  }

  /**
   * Get default height for widget type (grid units)
   */
  private getDefaultHeightForType(type: WidgetType): number {
    switch (type) {
      case 'KPI_CARD':
        return 1
      case 'GAUGE_CHART':
        return 1
      case 'PIE_CHART':
        return 2
      case 'LINE_CHART':
      case 'BAR_CHART':
      case 'AREA_CHART':
        return 2
      case 'TABLE':
        return 3
      case 'HEATMAP':
        return 2
      default:
        return 2
    }
  }
}

export const dashboardService = new DashboardService()
