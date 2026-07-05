// ============================================================
// signatures.ts — Helper functions for Digital Signatures
// Vendors & Supervisors can store their digital signatures,
// then automatically insert them into reports/documents.
// ============================================================

import { createClient } from '@/lib/supabase/client'
import type { Signature } from '@/lib/types/database'

// ============================================================
// GET: Retrieve all signatures belonging to the logged-in user
// ============================================================
export async function getMySignatures(): Promise<Signature[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to retrieve signatures: ${error.message}`)
  return data ?? []
}

// ============================================================
// GET: Retrieve default signature of the logged-in user
// ============================================================
export async function getDefaultSignature(): Promise<Signature | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('is_default', true)
    .maybeSingle()

  if (error) throw new Error(`Failed to retrieve default signature: ${error.message}`)
  return data
}

// ============================================================
// GET: Retrieve default signature of a specific user (by user_id)
// Used by supervisors to view vendor signature, or vice versa
// ============================================================
export async function getSignatureByUserId(userId: string): Promise<Signature | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle()

  if (error) throw new Error(`Failed to retrieve user signature: ${error.message}`)
  return data
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

  const { data, error } = await supabase
    .from('signatures')
    .insert({
      user_id: user.id,
      label: params.label ?? 'Default',
      signature_data: params.signatureData,
      is_default: params.isDefault ?? false,
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
  const { error } = await supabase
    .from('signatures')
    .update({ is_default: true })
    .eq('id', signatureId)

  if (error) throw new Error(`Failed to set default signature: ${error.message}`)
}

// ============================================================
// PATCH: Update label or signature data
// ============================================================
export async function updateSignature(
  signatureId: string,
  params: { label?: string; signatureData?: string }
): Promise<Signature> {
  const supabase = createClient()

  const updatePayload: Record<string, string> = {}
  if (params.label) updatePayload.label = params.label
  if (params.signatureData) updatePayload.signature_data = params.signatureData

  const { data, error } = await supabase
    .from('signatures')
    .update(updatePayload)
    .eq('id', signatureId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update signature: ${error.message}`)
  return data
}

// ============================================================
// DELETE: Delete specific signature
// ============================================================
export async function deleteSignature(signatureId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('signatures')
    .delete()
    .eq('id', signatureId)

  if (error) throw new Error(`Failed to delete signature: ${error.message}`)
}

// ============================================================
// UTIL: Convert base64 data URL → Blob (for upload to storage if needed)
// ============================================================
export function dataURLtoBlob(dataURL: string): Blob {
  const [header, base64] = dataURL.split(',')
  const mimeMatch = header.match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i)
  }
  return new Blob([array], { type: mime })
}
