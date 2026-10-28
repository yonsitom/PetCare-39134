
import { supabase } from '../supabase';

export async function consultarUsuarios() {
  const {
    data: { session },
    error: errorSesion,
  } = await supabase.auth.getSession();

  if (errorSesion) throw errorSesion;

  if (!session) {
    throw new Error(
      'Tu sesión ha expirado. Inicia sesión nuevamente.'
    );
  }

  const { data, error } = await supabase.functions.invoke(
    'administrar-usuarios',
    {
      body: {
        accion: 'listar',
      },
    }
  );

  if (error) {
    throw new Error(
      error.message || 'No fue posible consultar los usuarios.'
    );
  }

  if (!Array.isArray(data?.usuarios)) {
    throw new Error(
      data?.error || 'La respuesta de usuarios no es válida.'
    );
  }

  return data.usuarios;
}

export async function crearUsuario(datos) {
  const {
    data: { session },
    error: errorSesion,
  } = await supabase.auth.getSession();

  if (errorSesion) throw errorSesion;

  if (!session) {
    throw new Error(
      'Tu sesión ha expirado. Inicia sesión nuevamente.'
    );
  }

  const { data, error } = await supabase.functions.invoke(
    'administrar-usuarios',
    {
      body: {
        accion: 'crear',
        ...datos,
      },
    }
  );

  if (error) {
    throw new Error(
      data?.error ||
        error.message ||
        'No fue posible registrar al usuario.'
    );
  }

  if (!data?.usuario) {
    throw new Error(
      data?.error || 'No fue posible registrar al usuario.'
    );
  }

  return data.usuario;
}
