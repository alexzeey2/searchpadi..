import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fxjnbqymkdvuqfeagpur.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4am5icXlta2R2dXFmZWFncHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTE0NTUsImV4cCI6MjA4NjU4NzQ1NX0.qcQPStoxVPdJfAEDJ-f0xiu_EQkRnZd2c2uDIhMMAdg'

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})
