import { createClient } from '@/lib/supabase/client'

export async function uploadCreativeFile(file: File, creativeName: string): Promise<string | null> {
  const supabase = createClient()
  const fileExt = file.name.split('.').pop()
  const fileName = `${creativeName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.${fileExt}`
  const filePath = `creatives/${fileName}`

  const { error } = await supabase.storage
    .from('creatives')
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  const { data: { publicUrl } } = supabase.storage
    .from('creatives')
    .getPublicUrl(filePath)

  return publicUrl
}
