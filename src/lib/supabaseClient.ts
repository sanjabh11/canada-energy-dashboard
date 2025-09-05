import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './config';

const { url, anonKey } = getSupabaseConfig();

export const supabase = createClient(url, anonKey);
