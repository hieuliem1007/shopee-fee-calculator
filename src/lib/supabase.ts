// Supabase client — configure with your project URL + anon key
// Add to .env.local:
//   VITE_SUPABASE_URL=https://your-project.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key

// Uncomment after: npm install @supabase/supabase-js
// import { createClient } from '@supabase/supabase-js'
// import type { Database } from './supabase-types'

// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
// const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// export const supabase = createClient<Database>(supabaseUrl, supabaseKey)

// ── Database types (generated from supabase gen types) ────────────
// Run: npx supabase gen types typescript --project-id <id> > src/lib/supabase-types.ts
//
// Expected schema:
//
// Table: calculations
//   id          uuid PK
//   user_id     uuid FK → auth.users
//   name        text
//   cost_price  integer
//   sell_price  integer
//   shop_type   text
//   category    text
//   tax_mode    text
//   fixed_fees  jsonb
//   var_fees    jsonb
//   profit      integer
//   profit_pct  numeric
//   created_at  timestamptz

export const SUPABASE_TODO = 'Install @supabase/supabase-js and uncomment the client above'
