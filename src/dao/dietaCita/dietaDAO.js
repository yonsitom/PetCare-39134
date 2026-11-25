
/**
 * ============================================================
 * PETCARE - DAO DE DIETAS
 * RF54: Registrar y consultar la dieta de una receta.
 *
 * Responsabilidad:
 * Acceder a Supabase para consultar tipos de dieta, recuperar
 * dietas y registrar todos sus campos dinámicos.
 *
 * Arquitectura:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase.
 * ============================================================
 */

import { supabase } from '../../services/supabase';

const TABLA_DIETAS = 'dietas';
const TABLA_RECETAS = 'recetas';
const TABLA_ACTIVIDADES = 'actividades';
const TABLA_CONSULTA = 'actividad_consulta';
const TABLA_TIPOS_DIETA = 'tipos_dieta';

function lanzarError(mensaje, error) {
  console.error(mensaje, {
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
    code: error?.code,
  });

  throw new Error(
    [
      mensaje,
      error?.message,
      error?.details,
      error?.hint,
      error?.code ? `Código: ${error.code}` : null,
    ].filter(Boolean).join(' | ')
  );
}

/**
 * RF54 - Consulta una dieta por receta.
 *
 * detalle_dieta es JSONB y contiene los campos dinámicos
 * correspondientes al tipo de dieta.
 *
 * Las columnas antiguas se conservan para compatibilidad.
 */
export async function consultarDietaPorRecetaDAO(recetaId) {
  const { data, error } = await supabase
    .from(TABLA_DIETAS)
    .select(`
      dieta_id,
      receta_id,
      tipo_dieta,
      opciones_proteina,
      opciones_vegetales,
      restriccion_nutricional,
      detalle_dieta
    `)
    .eq('receta_id', recetaId)
    .maybeSingle();

  if (error) {
    lanzarError('Error consultando dieta de la receta:', error);
  }

  if (!data) {
    return null;
  }

  const detalleGuardado =
    data.detalle_dieta &&
    typeof data.detalle_dieta === 'object' &&
    !Array.isArray(data.detalle_dieta)
      ? data.detalle_dieta
      : {};

  // Compatibilidad con registros que guardaron datos
  // en columnas antiguas y no dentro del JSONB.
  const detalleCompleto = {
    ...detalleGuardado,
    opciones_proteina:
      detalleGuardado.opciones_proteina ??
      data.opciones_proteina ??
      '',
    opciones_vegetales:
      detalleGuardado.opciones_vegetales ??
      data.opciones_vegetales ??
      '',
    restriccion_nutricional:
      detalleGuardado.restriccion_nutricional ??
      data.restriccion_nutricional ??
      '',
  };

  return {
    ...data,
    detalle_dieta: detalleCompleto,
  };
}

/**
 * RF54 - Consulta los tipos de dieta activos.
 */
export async function consultarTiposDietaDAO() {
  const { data, error } = await supabase
    .from(TABLA_TIPOS_DIETA)
    .select(`
      tipo_dieta_id,
      nombre,
      activo,
      fecha_registro
    `)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) {
    lanzarError('Error consultando tipos de dieta:', error);
  }

  return data ?? [];
}

/**
 * RF54 - Obtiene las recetas pertenecientes a una atención.
 *
 * Se realizan consultas por etapas para no depender de una
 * relación anidada que no está confirmada en el esquema.
 *
 * 1. Actividades de la atención.
 * 2. Registros de actividad_consulta.
 * 3. Recetas asociadas a esas consultas.
 */
export async function consultarRecetasDisponiblesParaDietaDAO(
  atencionId
) {
  const { data: actividades, error: errorActividades } =
    await supabase
      .from(TABLA_ACTIVIDADES)
      .select('actividad_id')
      .eq('atencion_id', atencionId)
      .eq('eliminado', false);

  if (errorActividades) {
    lanzarError(
      'Error consultando actividades de la atención:',
      errorActividades
    );
  }

  const actividadIds = (actividades ?? [])
    .map((item) => item.actividad_id)
    .filter(Boolean);

  if (actividadIds.length === 0) {
    return [];
  }

  const { data: consultas, error: errorConsultas } =
    await supabase
      .from(TABLA_CONSULTA)
      .select('actividad_id, sintomas, diagnostico, motivo_consulta, peso, temperatura')
      .in('actividad_id', actividadIds);

  if (errorConsultas) {
    lanzarError(
      'Error consultando datos clínicos:',
      errorConsultas
    );
  }

  const consultaIds = (consultas ?? [])
    .map((item) => item.actividad_id)
    .filter(Boolean);

  if (consultaIds.length === 0) {
    return [];
  }

  const { data: recetas, error: errorRecetas } =
    await supabase
      .from(TABLA_RECETAS)
      .select(`
        receta_id,
        actividad_id,
        diagnostico,
        recomendaciones,
        fecha_registro
      `)
      .in('actividad_id', consultaIds)
      .order('fecha_registro', { ascending: false });

  if (errorRecetas) {
    lanzarError('Error consultando recetas:', errorRecetas);
  }

  const consultasPorId = new Map(
    (consultas ?? []).map((consulta) => [
      String(consulta.actividad_id),
      consulta,
    ])
  );

  return (recetas ?? []).map((receta) => ({
    ...receta,
    actividad_consulta:
      consultasPorId.get(String(receta.actividad_id)) ?? null,
  }));
}

/**
 * RF54 - Registra una dieta asociada a una receta.
 *
 * Se conserva la estructura antigua de columnas y se guarda
 * el objeto completo en detalle_dieta (JSONB).
 *
 * La restricción UNIQUE de receta_id impide más de una dieta
 * por receta. No se reemplaza una dieta existente.
 */
export async function registrarDietaDAO(datos) {
  const detalle =
    datos.detalle_dieta &&
    typeof datos.detalle_dieta === 'object' &&
    !Array.isArray(datos.detalle_dieta)
      ? datos.detalle_dieta
      : {};

  const datosInsertar = {
    receta_id: datos.receta_id,
    tipo_dieta: datos.tipo_dieta,
    opciones_proteina:
      detalle.opciones_proteina || null,
    opciones_vegetales:
      detalle.opciones_vegetales || null,
    restriccion_nutricional:
      detalle.restriccion_nutricional || null,
    detalle_dieta: detalle,
  };

  const { data, error } = await supabase
    .from(TABLA_DIETAS)
    .insert(datosInsertar)
    .select(`
      dieta_id,
      receta_id,
      tipo_dieta,
      opciones_proteina,
      opciones_vegetales,
      restriccion_nutricional,
      detalle_dieta
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(
        'Esta receta ya tiene una dieta registrada. No se puede registrar otra.'
      );
    }

    lanzarError('Error registrando dieta:', error);
  }

  return data;
}
