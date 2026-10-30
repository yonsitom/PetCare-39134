
/**
 * ============================================================
 * PETCARE - DAO DE TIPOS DE ACTIVIDAD
 * ============================================================
 *
 * RF56: Gestionar el catálogo de tipos de actividad.
 *
 * Tabla: public.tipos_actividad
 *
 * Responsabilidades:
 * - Consultar tipos de actividad.
 * - Consultar un tipo por identificador.
 * - Registrar tipos.
 * - Editar tipos.
 * - Activar y desactivar tipos.
 *
 * Las actividades históricas no se eliminan cuando
 * un tipo de actividad se desactiva.
 * ============================================================
 */

import { supabase } from '../../services/supabase';

const TABLA = 'tipos_actividad';

const COLUMNAS =
  'tipo_id, codigo, nombre, descripcion, requiere_medicamento, activo, fecha_registro';

// ============================================================
// RF56 - CONSULTAR CATÁLOGO
// ============================================================

export async function listarTiposActividadDAO({
  soloActivos = false,
} = {}) {
  let consulta = supabase
    .from(TABLA)
    .select(COLUMNAS)
    .order('nombre', { ascending: true });

  if (soloActivos) {
    consulta = consulta.eq('activo', true);
  }

  const { data, error } = await consulta;

  if (error) {
    throw new Error(
      `No se pudo consultar el catálogo de tipos de actividad: ${error.message}`
    );
  }

  return data ?? [];
}

// ============================================================
// RF56 - CONSULTAR TIPO POR IDENTIFICADOR
// ============================================================

export async function obtenerTipoActividadPorIdDAO(tipoId) {
  const { data, error } = await supabase
    .from(TABLA)
    .select(COLUMNAS)
    .eq('tipo_id', tipoId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo consultar el tipo de actividad: ${error.message}`
    );
  }

  return data;
}

// ============================================================
// RF56 - REGISTRAR TIPO DE ACTIVIDAD
// ============================================================

export async function crearTipoActividadDAO(datos) {
  const { data, error } = await supabase
    .from(TABLA)
    .insert({
      codigo: datos.codigo,
      nombre: datos.nombre,
      descripcion: datos.descripcion || null,
      requiere_medicamento: datos.requiere_medicamento,
      activo: true,
    })
    .select(COLUMNAS)
    .single();

  if (error) {
    throw new Error(
      `No se pudo registrar el tipo de actividad: ${error.message}`
    );
  }

  return data;
}

// ============================================================
// RF56 - ACTUALIZAR TIPO DE ACTIVIDAD
// ============================================================

export async function actualizarTipoActividadDAO(
  tipoId,
  datos
) {
  const { data, error } = await supabase
    .from(TABLA)
    .update({
      nombre: datos.nombre,
      descripcion: datos.descripcion || null,
      requiere_medicamento: datos.requiere_medicamento,
    })
    .eq('tipo_id', tipoId)
    .select(COLUMNAS)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo actualizar el tipo de actividad: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      'No se encontró el tipo de actividad que desea actualizar.'
    );
  }

  return data;
}

// ============================================================
// RF56 - CAMBIAR DISPONIBILIDAD
// ============================================================

export async function cambiarEstadoTipoActividadDAO(
  tipoId,
  activo
) {
  const { data, error } = await supabase
    .from(TABLA)
    .update({ activo })
    .eq('tipo_id', tipoId)
    .select(COLUMNAS)
    .maybeSingle();

  if (error) {
    throw new Error(
      `No se pudo cambiar la disponibilidad del tipo de actividad: ${error.message}`
    );
  }

  if (!data) {
    throw new Error(
      'No se encontró el tipo de actividad que desea modificar.'
    );
  }

  return data;
}
