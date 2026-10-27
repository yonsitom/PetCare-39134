// ============================================================
// PETCARE - DAO DE PERFILES
// RF05: Consultar y actualizar la información del perfil.
//
// Responsabilidad:
// Centralizar las consultas y actualizaciones de la tabla
// perfiles. La validación de los datos corresponde al servicio.
// ============================================================

import { supabase } from '../services/supabase';

/**
 * Consulta los datos básicos de un perfil por su identificador.
 *
 * Se conserva la función porque también se utiliza en el control
 * de acceso y en la verificación de la cuenta activa de RF01/RF04.
 *
 * @param {string} usuarioId Identificador del usuario autenticado.
 * @returns {Promise<object>} Información básica del perfil.
 */
export async function consultarPerfilPorId(usuarioId) {
  if (!usuarioId) {
    throw new Error('No se encontró el identificador del usuario.');
  }

  const { data, error } = await supabase
    .from('perfiles')
    .select(
      'perfil_id, nombre_completo, rol, estado_cuenta'
    )
    .eq('perfil_id', usuarioId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('No se encontró el perfil del usuario.');
  }

  return data;
}

/**
 * RF05:
 * Actualiza los campos personales que el usuario tiene permiso
 * para modificar.
 *
 * Los campos DNI, rol, estado de cuenta y fecha de registro
 * no se modifican desde esta función.
 *
 * @param {string} usuarioId Identificador del perfil.
 * @param {object} datosActualizados Datos que se guardarán.
 * @returns {Promise<object>} Identificador del perfil actualizado.
 */
export async function actualizarDatosPerfil(
  usuarioId,
  datosActualizados
) {
  if (!usuarioId) {
    throw new Error('No se encontró el identificador del usuario.');
  }

  if (!datosActualizados || typeof datosActualizados !== 'object') {
    throw new Error('No se proporcionaron datos para actualizar.');
  }

  // Lista permitida para evitar que la pantalla modifique
  // accidentalmente campos protegidos del perfil.
  const camposPermitidos = [
    'nombre_completo',
    'telefono',
    'direccion',
  ];

  const datosSeguros = {};

  for (const campo of camposPermitidos) {
    if (
      Object.prototype.hasOwnProperty.call(
        datosActualizados,
        campo
      )
    ) {
      datosSeguros[campo] = datosActualizados[campo];
    }
  }

  if (Object.keys(datosSeguros).length === 0) {
    throw new Error('No hay campos válidos para actualizar.');
  }

  const { data, error } = await supabase
    .from('perfiles')
    .update(datosSeguros)
    .eq('perfil_id', usuarioId)
    .select('perfil_id')
    .maybeSingle();

  if (error) {
    throw error;
  }

  // No consideramos exitosa la operación si Supabase no devuelve
  // un perfil actualizado. Esto también permite detectar bloqueos
  // causados por las políticas RLS.
  if (!data) {
    throw new Error(
      'No se encontró el perfil del usuario para actualizar.'
    );
  }

  return data;
}