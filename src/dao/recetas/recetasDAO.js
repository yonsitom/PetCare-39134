
/**
 * ============================================================
 * PETCARE - DAO DE RECETAS
 * RF53: Registrar y consultar recetas médicas.
 *
 * Responsabilidad:
 * - Registrar recetas asociadas directamente a una atención.
 * - Consultar recetas por atención o identificador.
 * - Consultar y registrar medicamentos de una receta.
 *
 * Arquitectura:
 * Servicio -> DAO -> Supabase.
 *
 * IMPORTANTE:
 * La receta NO depende de actividades ni consultas.
 * ============================================================
 */

import { supabase } from '../../services/supabase';

const TABLA_RECETAS = 'recetas';
const TABLA_DETALLES = 'detalle_receta';
const TABLA_MEDICAMENTOS = 'medicamentos';

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
 * RF53:
 * Consultar medicamentos disponibles para registrar una receta.
 */
export async function consultarMedicamentosDAO() {
  const { data, error } = await supabase
    .from(TABLA_MEDICAMENTOS)
    .select(`
      medicamento_id,
      nombre_medicamento,
      concentracion,
      categoria
    `)
    .eq('activo', true)
    .order('nombre_medicamento', { ascending: true });

  if (error) {
    lanzarError('Error consultando medicamentos:', error);
  }

  return data ?? [];
}

/**
 * RF53:
 * Consultar los medicamentos indicados en una receta.
 */
export async function consultarDetalleRecetaDAO(recetaId) {
  const { data, error } = await supabase
    .from(TABLA_DETALLES)
    .select(`
      detalle_receta_id,
      receta_id,
      medicamento_id,
      condicion_ingesta,
      dosis,
      frecuencia,
      duracion_tratamiento,
      medicamentos (
        medicamento_id,
        nombre_medicamento,
        concentracion,
        categoria
      )
    `)
    .eq('receta_id', recetaId)
    .order('detalle_receta_id', { ascending: true });

  if (error) {
    lanzarError(
      'Error consultando medicamentos de la receta:',
      error
    );
  }

  return data ?? [];
}

/**
 * RF53:
 * Consultar una receta completa.
 *
 * La relación se realiza mediante receta_id.
 * No consulta actividad_consulta ni actividades.
 */
export async function consultarRecetaPorIdDAO(recetaId) {
  const { data, error } = await supabase
    .from(TABLA_RECETAS)
    .select(`
      receta_id,
      atencion_id,
      diagnostico,
      recomendaciones,
      fecha_registro,
      detalle_receta (
        detalle_receta_id,
        receta_id,
        medicamento_id,
        condicion_ingesta,
        dosis,
        frecuencia,
        duracion_tratamiento,
        medicamentos (
          medicamento_id,
          nombre_medicamento,
          concentracion,
          categoria
        )
      ),
      dietas (
        dieta_id,
        receta_id,
        tipo_dieta,
        opciones_proteina,
        opciones_vegetales,
        restriccion_nutricional,
        detalle_dieta
      )
    `)
    .eq('receta_id', recetaId)
    .maybeSingle();

  if (error) {
    lanzarError('Error consultando receta completa:', error);
  }

  if (!data) {
    return null;
  }

  const dieta = Array.isArray(data.dietas)
    ? data.dietas[0] ?? null
    : data.dietas ?? null;

  const detalleDieta =
    dieta?.detalle_dieta &&
    typeof dieta.detalle_dieta === 'object' &&
    !Array.isArray(dieta.detalle_dieta)
      ? dieta.detalle_dieta
      : {};

  const dietaNormalizada = dieta
    ? {
        ...dieta,
        detalle_dieta: {
          ...detalleDieta,
          opciones_proteina:
            detalleDieta.opciones_proteina ??
            dieta.opciones_proteina ??
            '',
          opciones_vegetales:
            detalleDieta.opciones_vegetales ??
            dieta.opciones_vegetales ??
            '',
          restriccion_nutricional:
            detalleDieta.restriccion_nutricional ??
            dieta.restriccion_nutricional ??
            '',
        },
      }
    : null;

  return {
    ...data,
    detalle_receta: data.detalle_receta ?? [],
    dietas: dietaNormalizada,
  };
}

/**
 * RF53:
 * Consultar todas las recetas de una atención.
 *
 * Relación directa:
 * recetas.atencion_id -> atenciones.atencion_id
 */
export async function consultarRecetasPorAtencionDAO(atencionId) {
  const { data, error } = await supabase
    .from(TABLA_RECETAS)
    .select(`
      receta_id,
      atencion_id,
      diagnostico,
      recomendaciones,
      fecha_registro
    `)
    .eq('atencion_id', atencionId)
    .order('fecha_registro', { ascending: false });

  if (error) {
    lanzarError(
      'Error consultando recetas de la atención:',
      error
    );
  }

  return data ?? [];
}

/**
 * RF53:
 * Registrar una receta directamente en una atención.
 *
 * No crea actividades ni consultas.
 */
export async function registrarRecetaDAO(datos) {
  const {
    atencion_id,
    diagnostico,
    recomendaciones,
    fecha_registro,
  } = datos;

  const { data, error } = await supabase
    .from(TABLA_RECETAS)
    .insert({
      atencion_id,
      diagnostico: diagnostico || null,
      recomendaciones: recomendaciones || null,
      ...(fecha_registro ? { fecha_registro } : {}),
    })
    .select(`
      receta_id,
      atencion_id,
      diagnostico,
      recomendaciones,
      fecha_registro
    `)
    .single();

  if (error) {
    lanzarError('Error registrando receta:', error);
  }

  return data;
}

/**
 * RF53:
 * Registrar los medicamentos de una receta.
 */
export async function registrarDetalleRecetaDAO(detalles) {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from(TABLA_DETALLES)
    .insert(detalles)
    .select(`
      detalle_receta_id,
      receta_id,
      medicamento_id,
      condicion_ingesta,
      dosis,
      frecuencia,
      duracion_tratamiento,
      medicamentos (
        nombre_medicamento,
        concentracion
      )
    `);

  if (error) {
    lanzarError(
      'Error registrando medicamentos de receta:',
      error
    );
  }

  return data ?? [];
}
