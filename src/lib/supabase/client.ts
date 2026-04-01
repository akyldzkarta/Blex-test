'use client'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'Supabase ortam değişkenleri yok. .env.local içinde NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlayın, ardından `npm run dev` ile yeniden başlatın (gerekirse proje kökündeki .next klasörünü silin).'
    )
  }
  return createBrowserClient<Database>(url, anonKey)
}
