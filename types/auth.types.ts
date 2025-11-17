// Authentication types for multi-tier system

export type UserRole = 'Developer' | 'Admin' | 'User'

// Developer (Super admin)
export interface Developer {
  id: string
  email: string
  firebase_uid: string | null
  created_at: string
  updated_at: string
}

// Admin (Daycare manager)
export interface Admin {
  id: string
  email: string
  firebase_uid: string | null
  first_name: string
  last_name: string
  is_active: boolean
  created_by_id: string | null
  created_at: string
  updated_at: string
}

// Enterprise (Daycare)
export interface Enterprise {
  id: string
  admin_id: string
  name: string
  logo_url: string | null
  legal_form: string | null
  siret: string | null
  created_at: string
  updated_at: string
}

// User (Employee)
export interface User {
  id: string
  email: string | null
  first_name: string
  last_name: string
  pin_code: string // Hashed
  enterprise_id: string
  is_active: boolean
  created_by_id: string | null
  created_at: string
  updated_at: string
}

// Authentication session
export interface AuthSession {
  user: Developer | Admin | User
  role: UserRole
  enterprise?: Enterprise
  accessibleRooms?: string[] // For User type (room IDs)
}

// Login credentials
export interface EmailPasswordCredentials {
  email: string
  password: string
}

export interface PinCredentials {
  pin: string
  enterprise_id: string
}

// Auth responses
export interface AuthResponse<T = Developer | Admin | User> {
  success: boolean
  data?: T
  enterprise?: Enterprise
  role?: UserRole
  accessibleRooms?: string[]
  error?: string
}

// Auth context
export interface AuthContextType {
  session: AuthSession | null
  isLoading: boolean
  role: UserRole | null
  enterprise: Enterprise | null

  // Methods
  loginWithEmail: (credentials: EmailPasswordCredentials) => Promise<AuthResponse>
  loginWithPin: (credentials: PinCredentials) => Promise<AuthResponse>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}
