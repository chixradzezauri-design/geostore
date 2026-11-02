
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xmtnszxtnfxnrojionoa.supabase.co';

// ჩასვი შენი Supabase Project Settings → API Keys-დან
// Publishable (anon) key.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdG5zenh0bmZ4bnJvamlvbm9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3MzQ0NDksImV4cCI6MjEwODMxMDQ0OX0.RtYgfVKkzW2KHNR6r9snMhTKIm16kyyDLJXr5BoVAJM';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
