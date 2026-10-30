/**
 * PETCARE - DAO DE USUARIOS
 *
 * Requisitos:
 * - CUS44: consultar usuarios.
 * - CUS45: actualizar el estado de una cuenta.
 *
 * MVC / DAO:
 * Este archivo representa el acceso a datos de la entidad Usuario.
 * La vista no debe ejecutar directamente la actualización del estado.
 *
 * DIAGRAMA DE SECUENCIAS CUS45:
 * Control/Servicio -> Entidad/DAO -> tabla perfiles de Supabase.
 *
 * Las decisiones de negocio y el tratamiento de cancelaciones
 * corresponden a usuariosService.js.
 */

import { supabase } from '../../services/supabase';

/**
 * CUS44: consulta los perfiles registrados, ordenados por fecha.
 *
 * @returns {Promise<Array>} Lista de perfiles.
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
    throw error;
  }

  return data || [];
}

/**
 * CUS45: actualiza el estado de una cuenta.
 *
 * @param {string} perfilId Identificador del usuario.
 * @param {'Activo'|'Inactivo'} nuevoEstado Estado solicitado.
 * @returns {Promise<Object|null>} Perfil actualizado o null si
 * Supabase no devuelve ninguna fila.
 *
 * El Administrador confirma la operación en la vista.
 * El servicio valida la solicitud y delega la persistencia aquí.
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
