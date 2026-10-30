/**
 * PETCARE - DAO DE CITAS
 * RF51: Programar y cancelar citas de atención veterinaria.
 *
 * Responsabilidad:
 * - Consultar mascotas.
 * - Verificar citas duplicadas.
 * - Registrar citas.
 * - Consultar citas.
 * - Comprobar si una cita ya tiene una atención iniciada.
 * - Actualizar el estado de una cita.
 *
 * Persistencia: Supabase / PostgreSQL.
 */

import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';

function normalizarHistoria(valor) {
  return String(valor ?? '').trim().toUpperCase();
}

/**
 * RF51 - Consultar mascota por número de historia.
 */
export async function buscarMascotaPorHistoria(numeroHistoria) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia) {
    throw new Error('Debe indicar el número de historia de la mascota.');
  }

  const { data, error } = await supabase
    .from('mascotas')
    .select('numero_historia, nombre, estado')
    .eq('numero_historia', historia)
    .maybeSingle();

  if (error) {
    logger.error(
      'RF51 - Error consultando mascota:',
      error.message
    );

    throw error;
  }

  return data ?? null;
}

/**
 * RF51 - Buscar una cita existente para la misma mascota,
 * fecha y hora.
 *
 * Solo se consideran duplicadas las citas con estado Programada.
 * Las citas Canceladas no bloquean una nueva programación.
 */
export async function buscarCitaDuplicada(
  numeroHistoria,
  fechaProgramada,
  horaCita
) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia || !fechaProgramada || !horaCita) {
    throw new Error('Los datos para verificar la cita están incompletos.');
  }

  const { data, error } = await supabase
    .from('citas')
    .select(`
      cita_id,
      numero_historia,
      fecha_programada,
      hora_cita,
      estado
    `)
    .eq('numero_historia', historia)
    .eq('fecha_programada', fechaProgramada)
    .eq('hora_cita', horaCita)
    .eq('estado', 'Programada')
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error(
      'RF51 - Error verificando cita duplicada:',
      error.message
    );

    throw error;
  }

  return data ?? null;
}

/**
 * RF51 - Insertar una cita.
 *
 * La tabla utiliza:
 * numero_historia, fecha_programada, hora_cita,
 * estado, motivo_cita y descripcion_cita.
 */
export async function insertarCita(datos) {
  if (!datos || typeof datos !== 'object') {
    throw new Error('No se recibieron los datos de la cita.');
  }

  const registro = {
    numero_historia: normalizarHistoria(datos.numero_historia),
    fecha_programada: datos.fecha_programada,
    hora_cita: datos.hora_cita,
    estado: 'Programada',
    motivo_cita: String(datos.motivo_cita ?? '').trim(),
    descripcion_cita:
      String(datos.descripcion_cita ?? '').trim() || null,
  };

  const { data, error } = await supabase
    .from('citas')
    .insert(registro)
    .select(`
      cita_id,
      numero_historia,
      fecha_programada,
      hora_cita,
      estado,
      fecha_registro,
      motivo_cita,
      descripcion_cita
    `)
    .single();

  if (error) {
    logger.error(
      'RF51 - Error registrando cita:',
      error.message
    );

    throw error;
  }

  return data;
}

/**
 * RF51 - Consultar una cita por su identificador.
 */
export async function obtenerCitaPorId(citaId) {
  if (
    citaId === undefined ||
    citaId === null ||
    String(citaId).trim() === ''
  ) {
    throw new Error('Debe indicar la cita que desea consultar.');
  }

  const { data, error } = await supabase
    .from('citas')
    .select(`
      cita_id,
      numero_historia,
      fecha_programada,
      hora_cita,
      estado,
      fecha_registro,
      motivo_cita,
      descripcion_cita
    `)
    .eq('cita_id', citaId)
    .maybeSingle();

  if (error) {
    logger.error(
      'RF51 - Error consultando cita:',
      error.message
    );

    throw error;
  }

  return data ?? null;
}

/**
 * RF51 - Comprobar si una cita ya tiene una atención asociada.
 *
 * atenciones.cita_id relaciona la atención con la cita.
 * Si existe un registro, la atención ya fue iniciada.
 */
export async function obtenerAtencionPorCita(citaId) {
  if (
    citaId === undefined ||
    citaId === null ||
    String(citaId).trim() === ''
  ) {
    throw new Error('Debe indicar la cita que desea verificar.');
  }

  const { data, error } = await supabase
    .from('atenciones')
    .select(`
      atencion_id,
      cita_id,
      numero_historia,
      estado,
      fecha_inicio,
      fecha_fin
    `)
    .eq('cita_id', citaId)
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error(
      'RF51 - Error verificando atención de la cita:',
      error.message
    );

    throw error;
  }

  return data ?? null;
}

/**
 * RF51 - Actualizar el estado de una cita.
 */
export async function actualizarEstadoCita(citaId, nuevoEstado) {
  if (
    citaId === undefined ||
    citaId === null ||
    String(citaId).trim() === ''
  ) {
    throw new Error('Debe indicar la cita que desea actualizar.');
  }

  if (!['Programada', 'Cancelada'].includes(nuevoEstado)) {
    throw new Error('El estado indicado para la cita no es válido.');
  }

  const { data, error } = await supabase
    .from('citas')
    .update({ estado: nuevoEstado })
    .eq('cita_id', citaId)
    .select(`
      cita_id,
      numero_historia,
      fecha_programada,
      hora_cita,
      estado,
      fecha_registro,
      motivo_cita,
      descripcion_cita
    `)
    .single();

  if (error) {
    logger.error(
      'RF51 - Error actualizando estado de cita:',
      error.message
    );

    throw error;
  }

  return data;
}