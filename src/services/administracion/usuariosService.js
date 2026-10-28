
import { supabase } from '../supabase';

export async function consultarUsuarios() {
  const { data, error } = await supabase
    .from('perfiles')
    .select(`
      perfil_id,
      nombre_completo,
      documento_identidad,
      telefono,
      direccion,
      rol,
      fecha_registro,
      estado_cuenta
    `)
    .order('fecha_registro', { ascending: false });

  if (error) {
    console.error(
      'Error al consultar perfiles:',
      error.message
    );
    throw error;
  }

  return (data || []).map((usuario) => ({
    ...usuario,
    nombre_completo: usuario.nombre_completo || 'Sin nombre',
    telefono: usuario.telefono || '',
    direccion: usuario.direccion || '',
    rol: usuario.rol || 'Sin rol',
    estado_cuenta: usuario.estado_cuenta || 'Inactivo',
  }));
}
