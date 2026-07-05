// ============================================================
// Database Types for MAINTAIN.AI - PM Verification System
// ============================================================

export type RoleType = 'admin' | 'supervisor' | 'vendor'

// --- Profiles (extends Supabase auth.users) ---
export interface Profile {
  id: string                   // matches auth.users.id (UUID)
  role: RoleType
  employee_id: string          // e.g. ADM-001-Z, ENT-992-X, VND-772-K
  full_name: string
  email: string
  phone?: string | null
  avatar_url?: string | null
  department?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// --- Assets (Machines / Equipment) ---
export interface Asset {
  id: string
  asset_code: string           // e.g. MACH-001
  name: string
  type: string                 // e.g. 'CNC Machine', 'Conveyor Belt'
  location: string
  status: 'operational' | 'under_maintenance' | 'offline' | 'retired'
  last_pm_date?: string | null
  next_pm_date?: string | null
  created_by: string           // Profile.id
  created_at: string
  updated_at: string
}

// --- PM Templates (Checklist Protocols) ---
export interface PMTemplate {
  id: string
  title: string
  description?: string | null
  asset_type: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual'
  checklist_items: ChecklistItem[]
  created_by: string           // Profile.id (Admin)
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  label: string
  required: boolean
}

// --- PM Tasks ---
export interface PMTask {
  id: string
  task_code: string            // e.g. TASK-2024-001
  template_id?: string | null  // PMTemplate.id
  asset_id: string             // Asset.id
  assigned_vendor_id: string   // Profile.id (Vendor)
  assigned_supervisor_id: string // Profile.id (Supervisor)
  created_by: string           // Profile.id (Admin)
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected'
  priority: 'low' | 'medium' | 'high' | 'critical'
  due_date: string
  scheduled_date?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

// --- PM Reports (submitted by Vendor) ---
export interface PMReport {
  id: string
  task_id: string              // PMTask.id
  submitted_by: string         // Profile.id (Vendor)
  checklist_results: ChecklistResult[]
  findings?: string | null
  recommendations?: string | null
  photos_urls?: string[] | null
  submitted_at: string
  status: 'pending_review' | 'approved' | 'rejected' | 'revision_requested'
  reviewed_by?: string | null  // Profile.id (Supervisor)
  reviewed_at?: string | null
  review_notes?: string | null
}

// --- Digital Signatures ---
export type SignatureFormat = 'base64' | 'storage_url'

export interface Signature {
  id: string
  user_id: string              // Profile.id (Vendor or Supervisor)
  label: string                // e.g. "Default", "Formal", "Initials"
  signature_data: string       // base64 data URL (image/png) OR storage path
  is_default: boolean          // main/active signature of user
  created_at: string
  updated_at: string
}

export interface ChecklistResult {
  item_id: string
  label: string
  checked: boolean
  notes?: string
}

// ============================================================
// Supabase DB helper type
// ============================================================
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      assets: {
        Row: Asset
        Insert: Omit<Asset, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Asset, 'id' | 'created_at'>>
      }
      pm_templates: {
        Row: PMTemplate
        Insert: Omit<PMTemplate, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PMTemplate, 'id' | 'created_at'>>
      }
      pm_tasks: {
        Row: PMTask
        Insert: Omit<PMTask, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PMTask, 'id' | 'created_at'>>
      }
      pm_reports: {
        Row: PMReport
        Insert: Omit<PMReport, 'id' | 'submitted_at'>
        Update: Partial<Omit<PMReport, 'id' | 'submitted_at'>>
      }
      signatures: {
        Row: Signature
        Insert: Omit<Signature, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Signature, 'id' | 'user_id' | 'created_at'>>
      }
    }
  }
}
