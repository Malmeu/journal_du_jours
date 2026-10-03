import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://sybooimibrgdpeymbuvu.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5Ym9vaW1pYnJnZHBleW1idXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNTA1NTgsImV4cCI6MjEwNjYyNjU1OH0.AuUFPL5Q6aiLLW1sxp_jMZGXUSI88TsY1l_SGll95x0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});
