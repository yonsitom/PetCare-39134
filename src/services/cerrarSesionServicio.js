/**
 * Servicio centralizado de cierre de sesión.
 * RF07: Cerrar sesión.
 */

export async function cerrarSesionServicio(clienteSupabase) {
  // Validar que el cliente esté disponible.
  if (
    !clienteSupabase ||
    !clienteSupabase.auth ||
    typeof clienteSupabase.auth.signOut !== 'function'
  ) {
    throw new Error(
      'El servicio de autenticación no está disponible.'
    );
  }

  // Solicitar el cierre de sesión a Supabase.
  const respuesta = await clienteSupabase.auth.signOut();

  // Gestionar los errores devueltos por Supabase.
  if (respuesta && respuesta.error) {
    throw new Error(
      respuesta.error.message || 'No se pudo cerrar la sesión.'
    );
  }

  return true;
}

export default cerrarSesionServicio;