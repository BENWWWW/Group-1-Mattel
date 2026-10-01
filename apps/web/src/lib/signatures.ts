// ============================================================
// signatures.ts — Helper functions for Digital Signatures
// Vendors & Supervisors can store their digital signatures,
// then automatically insert them into reports/documents.
// ============================================================

import { createClient } from '@/lib/supabase/client'

export interface Signature {
  id: string
  user_id: string              // Profile.id (Vendor or Supervisor)
  label: string                // e.g. "Default"
  signature_data: string       // base64 data URL (image/png)
  is_default: boolean          // main/active signature of user
  created_at: string
  updated_at: string
}

// ============================================================
// GET: Retrieve all signatures belonging to the logged-in user
// ============================================================
export async function getMySignatures(): Promise<Signature[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to retrieve signatures: ${error.message}`)
  return data ?? []
}

// ============================================================
// POST: Save new signature
// signatureData: base64 data URL from HTML canvas (e.g. canvas.toDataURL('image/png'))
// ============================================================
export async function saveSignature(params: {
  label?: string
  signatureData: string   // base64 PNG
  isDefault?: boolean
}): Promise<Signature> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User is not authenticated')

  // Security enforcement: delete all pre-existing signatures for this user
  await supabase
    .from('signatures')
    .delete()
    .eq('user_id', user.id);

  const { data, error } = await supabase
    .from('signatures')
    .insert({
      user_id: user.id,
      label: params.label ?? 'Default',
      signature_data: params.signatureData,
      is_default: true, // It is the only signature, hence always default
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save signature: ${error.message}`)
  return data
}

// ============================================================
// PATCH: Set specific signature as default
// Database trigger will automatically unset other signatures where is_default = true
// ============================================================
export async function setDefaultSignature(signatureId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User is not authenticated')

  const { error } = await supabase
    .from('signatures')
    .update({ is_default: true })
    .eq('id', signatureId)
    .eq('user_id', user.id)

  if (error) throw new Error(`Failed to set default signature: ${error.message}`)
}

// ============================================================
// DELETE: Delete specific signature
// ============================================================
export async function deleteSignature(signatureId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User is not authenticated')

  const { error } = await supabase
    .from('signatures')
    .delete()
    .eq('id', signatureId)
    .eq('user_id', user.id)

  if (error) throw new Error(`Failed to delete signature: ${error.message}`)
}
