/**
 * Analytics Types
 * Types for the Developer analytics dashboard
 */

export interface GlobalStats {
  total_enterprises: number;
  active_admins: number;
  total_employees: number;
  sessions_this_month: number;
}

export interface EnterpriseStats {
  id: string;
  name: string;
  admin_name: string;
  admin_email: string;
  employee_count: number;
  sessions_this_month: number;
  last_admin_login: string | null;
}

export interface ActivityChartData {
  enterprise_name: string;
  session_count: number;
}

export interface UserGrowthData {
  month: string;
  users: number;
  enterprises: number;
}
