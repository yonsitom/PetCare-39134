
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://eiaupodrnxbmxmurmfqo.supabase.co';

const supabaseKey =
  'sb_publishable_KwE4-VJ2K1d1mDiviFA07g_NzAQKXGg';

// Almacenamiento para navegador.
// La comprobación evita acceder a window durante SSR.
const almacenamientoWeb = {
  getItem: async (clave) => {
    if (typeof window === 'undefined') return null;

    try {
      return window.localStorage.getItem(clave);
    } catch (error) {
      console.error('Error al leer la sesión web:', error);
      return null;
    }
  },

  setItem: async (clave, valor) => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(clave, valor);
    } catch (error) {
      console.error('Error al guardar la sesión web:', error);
    }
  },

  removeItem: async (clave) => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(clave);
    } catch (error) {
      console.error('Error al eliminar la sesión web:', error);
    }
  },
};

// Android utiliza AsyncStorage.
// Web utiliza localStorage.
const almacenamientoSesion =
  Platform.OS === 'web'
    ? almacenamientoWeb
    : AsyncStorage;

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      storage: almacenamientoSesion,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
