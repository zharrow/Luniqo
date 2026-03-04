// Authentication types for Luniqo - Unified Profiles Architecture
// Updated 2025-12-07

import { Profile, Enterprise, UserRole } from './database.types'

// Re-export UserRole for convenience
export type { UserRole } from './database.types'

// ============================================================================
// PROFILE TYPE ALIASES (for backwards compatibility and convenience)
// ============================================================================

// Profile represents any user (Developer, Owner, or Employee)
export type { Profile } from './database.types'

// Role-specific profile types (same structure, just for type clarity)
export type Developer = Profile & { role: 'Developer' }
export type Owner = Profile & { role: 'Owner' }
export type Employee = Profile & { role: 'Employee' }

// ============================================================================
// AUTHENTICATION SESSION
// ============================================================================

// Full authentication session with profile and enterprise
export interface AuthSession {
  user: Profile
  role: UserRole
  enterprise?: Enterprise | null
  accessibleRooms?: string[]  // Room IDs for Employees
  accessibleModules?: string[]  // Module IDs for Owners (permissions system)
}

// ============================================================================
// LOGIN CREDENTIALS
// ============================================================================

// Email/Password login (for all roles: Developer, Owner, Employee dashboard)
export interface EmailPasswordCredentials {
  email: string
  password: string
}

// Email/PIN login (for Employee tablet only)
export interface UsernameCredentials {
  email: string
  pin: string
}

// Legacy PIN credentials (kept for backwards compatibility with tablet flow)
export interface PinCredentials {
  pin: string
  enterprise_id: string
}

// ============================================================================
// AUTH RESPONSES
// ============================================================================

export interface AuthResponse {
  success: boolean
  data?: Profile
  enterprise?: Enterprise | null
  role?: UserRole
  accessibleRooms?: string[]
  accessibleModules?: string[]  // Module IDs for Owners (permissions system)
  error?: string
}

// ============================================================================
// AUTH CONTEXT
// ============================================================================

export interface AuthContextType {
  // State
  session: AuthSession | null
  isLoading: boolean
  role: UserRole | null
  enterprise: Enterprise | null

  // Email/Password methods (Developer, Owner, Employee dashboard)
  loginWithEmail: (credentials: EmailPasswordCredentials) => Promise<AuthResponse>

  // Username/PIN methods (Employee tablet)
  loginWithPin: (credentials: UsernameCredentials) => Promise<AuthResponse>

  // Common methods
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

// ============================================================================
// EMPLOYEE SETUP (First login flow)
// ============================================================================

export interface EmployeeSetupData {
  pin: string  // 4 digits chosen by employee
  confirmPin: string
}

export interface EmployeeFirstLoginResponse {
  success: boolean
  username?: string  // Auto-generated username to show
  error?: string
}

// ============================================================================
// USER CREATION (by Developer/Owner)
// ============================================================================

export interface CreateUserData {
  email: string
  password: string
  first_name: string
  last_name: string
  role: UserRole
  enterprise_id?: string  // Required for Employee, ignored for others
}

export interface CreateUserResponse {
  success: boolean
  user?: Profile
  username?: string  // For Employees: auto-generated username
  error?: string
}
