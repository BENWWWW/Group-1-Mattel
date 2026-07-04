// ============================================================
// signatures.ts — Helper functions untuk Digital Signatures
// Vendor & Supervisor bisa simpan tanda tangan digital mereka,
// lalu insert otomatis ke laporan/dokumen tanpa tanda tangan manual.
// ============================================================

import { createClient } from '@/lib/supabase/client'
import type { Signature } from '@/lib/types/database'

// ============================================================
// GET: Ambil semua signature milik user yang sedang login
// ============================================================
export async function getMySignatures(): Promise<Signature[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Gagal mengambil signatures: ${error.message}`)
  return data ?? []
}

// ============================================================
// GET: Ambil signature default milik user yang sedang login
// ============================================================
export async function getDefaultSignature(): Promise<Signature | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('is_default', true)
    .maybeSingle()

  if (error) throw new Error(`Gagal mengambil default signature: ${error.message}`)
  return data
}

// ============================================================
// GET: Ambil signature default milik user tertentu (by user_id)
// Dipakai supervisor untuk lihat tanda tangan vendor, atau sebaliknya
// ============================================================
export async function getSignatureByUserId(userId: string): Promise<Signature | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle()

  if (error) throw new Error(`Gagal mengambil signature user: ${error.message}`)
  return data
}

// ============================================================
// POST: Simpan signature baru
// signatureData: base64 data URL dari HTML canvas (e.g. canvas.toDataURL('image/png'))
// ============================================================
export async function saveSignature(params: {
  label?: string
  signatureData: string   // base64 PNG
  isDefault?: boolean
}): Promise<Signature> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User tidak terautentikasi')

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

  if (error) throw new Error(`Gagal menyimpan signature: ${error.message}`)
  return data
}

// ============================================================
// PATCH: Set signature tertentu sebagai default
// Trigger DB otomatis akan unset signature lain yang is_default = true
// ============================================================
export async function setDefaultSignature(signatureId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('signatures')
    .update({ is_default: true })
    .eq('id', signatureId)

  if (error) throw new Error(`Gagal set default signature: ${error.message}`)
}

// ============================================================
// PATCH: Update label atau data signature
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

  if (error) throw new Error(`Gagal mengupdate signature: ${error.message}`)
  return data
}

// ============================================================
// DELETE: Hapus signature tertentu
// ============================================================
export async function deleteSignature(signatureId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('signatures')
    .delete()
    .eq('id', signatureId)

  if (error) throw new Error(`Gagal menghapus signature: ${error.message}`)
}

// ============================================================
// UTIL: Konversi base64 data URL → Blob (untuk upload ke storage jika diperlukan)
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
