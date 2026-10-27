
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://eiaupodrnxbmxmurmfqo.supabase.co';

const supabaseKey =
  'sb_publishable_KwE4-VJ2K1d1mDiviFA07g_NzAQKXGg';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
