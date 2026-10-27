
import { supabase } from './supabase';

export async function iniciarSesionConCorreo(correo, contrasena) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo.trim(),
    password: contrasena,
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('No se recibió un usuario autenticado.');
  }

  return data.user;
}
