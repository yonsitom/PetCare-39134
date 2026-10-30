
import { createClient } from '@supabase/supabase-js';
// La sesión se guarda cifrada (expo-secure-store) y no en AsyncStorage.
import { almacenamientoSeguro } from './almacenamientoSeguro';

const supabaseUrl = 'https://eiaupodrnxbmxmurmfqo.supabase.co';

const supabaseKey =
  'sb_publishable_KwE4-VJ2K1d1mDiviFA07g_NzAQKXGg';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      storage: almacenamientoSeguro,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
