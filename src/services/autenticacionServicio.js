
/*
 * RF01 — Servicio de autenticación.
 *
 * Responsabilidad:
 * comunicarse con Supabase Auth para validar las credenciales.
 *
 * El controlador recibe esta función por inyección de dependencias,
 * por lo que sus pruebas unitarias no necesitan conectarse a Supabase.
 */

import { supabase } from './supabase';

export async function iniciarSesionConCorreo(correo, contrasena) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo.trim(),
    password: contrasena,
  });

  if (error) {
    throw error;
  }

  if (!data?.user) {
    throw new Error('No se recibió un usuario autenticado.');
  }

  return data.user;
}
