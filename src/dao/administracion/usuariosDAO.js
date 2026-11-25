
/**
 * PETCARE - DAO DE USUARIOS
 *
 * CUS44: consultar usuarios.
 * CUS45: actualizar el estado de una cuenta.
 *
 * DAO: acceso a datos de la entidad Usuario en Supabase.
 */

import { supabase } from '../../services/supabase';

/**
 * CUS44: consulta los perfiles registrados.
 */
export async function consultarUsuariosDAO() {
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
    console.error('[CUS44] Error consultando perfiles:', error);
    throw error;
  }

  const usuarios = data || [];

  const conteosEstado = usuarios.reduce((conteos, usuario) => {
    const estado = String(usuario.estado_cuenta ?? 'NULL');
    conteos[estado] = (conteos[estado] || 0) + 1;
    return conteos;
  }, {});

  console.log('========== DIAGNÓSTICO CUS44 ==========');
  console.log('Total de usuarios recibidos:', usuarios.length);
  console.log('Conteo por estado original:', conteosEstado);
  console.log('Estados recibidos:', usuarios.map(
    (usuario) => usuario.estado_cuenta
  ));
  console.log('=======================================');

  return usuarios;
}

/**
 * CUS45: actualiza el estado de una cuenta.
 */
export async function actualizarEstadoCuentaDAO(
  perfilId,
  nuevoEstado
) {
  const { data, error } = await supabase
    .from('perfiles')
    .update({
      estado_cuenta: nuevoEstado,
    })
    .eq('perfil_id', perfilId)
    .select('perfil_id, estado_cuenta')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}
