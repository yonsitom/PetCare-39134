
/**
 * ============================================================
 * PETCARE - SERVICIO DE DETALLE DEL SEGUIMIENTO
 * RF20: Información completa de la atención.
 * RF40: Información específica de las actividades.
 * ============================================================
 *
 * Arquitectura:
 * Controlador -> Servicio -> DAO -> Supabase.
 *
 * Este servicio complementa los datos del historial con la
 * información registrada en actividad_consulta.
 * ============================================================
 */

import {
  consultarDatosConsulta,
} from '../../dao/atencion/atencionesDAO';

import {
  consultarActividadPorId,
} from '../../dao/actividades/actividadesDAO';

function texto(valor) {
  return String(valor ?? '').trim();
}

function esConsulta(actividad) {
  const tipo = texto(
    actividad?.tipo ||
    actividad?.tipos_actividad?.nombre ||
    actividad?.tipos_actividad?.codigo
  ).toLowerCase();

  return (
    tipo.includes('consulta') ||
    texto(actividad?.tipos_actividad?.codigo).toUpperCase() ===
      'CONSULTA'
  );
}

function obtenerDetalleConsulta(consulta) {
  if (!consulta) return null;

  return {
    motivo_consulta: consulta.motivo_consulta ?? null,
    sintomas: consulta.sintomas ?? null,
    peso: consulta.peso ?? null,
    temperatura: consulta.temperatura ?? null,
    receta: consulta.receta ?? null,
  };
}

/**
 * Enriquece una actividad de consulta con los datos específicos
 * almacenados en actividad_consulta.
 */
export async function enriquecerActividadSeguimiento(actividad) {
  if (!actividad?.actividad_id) {
    return actividad;
  }

  if (!esConsulta(actividad)) {
    return actividad;
  }

  const consulta = await consultarDatosConsulta(
    actividad.actividad_id
  );

  return {
    ...actividad,
    datos_consulta: obtenerDetalleConsulta(consulta),
    motivo_consulta:
      consulta?.motivo_consulta ??
      actividad?.motivo_consulta ??
      null,
  };
}

/**
 * Enriquece todas las actividades de una atención y obtiene
 * el motivo de consulta para mostrarlo en el historial.
 */
export async function enriquecerAtencionSeguimiento(atencion) {
  const actividadesOriginales = Array.isArray(
    atencion?.actividades
  )
    ? atencion.actividades
    : [];

  const actividades = await Promise.all(
    actividadesOriginales.map((actividad) =>
      enriquecerActividadSeguimiento(actividad)
    )
  );

  const actividadConsulta = actividades.find(esConsulta);

  const motivoConsulta =
    actividadConsulta?.datos_consulta?.motivo_consulta ??
    actividadConsulta?.motivo_consulta ??
    atencion?.motivo_consulta ??
    null;

  return {
    ...atencion,
    actividades,
    motivo_consulta: motivoConsulta,
    total_actividades: actividades.length,
  };
}

/**
 * Devuelve una actividad con sus datos generales y específicos.
 */
export async function obtenerDetalleCompletoActividad(
  actividadId
) {
  if (!actividadId) {
    throw new Error('No se recibió el identificador de la actividad.');
  }

  const actividad = await consultarActividadPorId(
    actividadId
  );

  if (!actividad) {
    throw new Error('No se encontró la actividad solicitada.');
  }

  let datosConsulta = null;

  if (esConsulta(actividad)) {
    const consulta = await consultarDatosConsulta(
      actividadId
    );

    datosConsulta = obtenerDetalleConsulta(consulta);
  }

  return {
    ...actividad,
    datos_consulta: datosConsulta,
  };
}
