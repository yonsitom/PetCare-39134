
/**
 * ============================================================
 * PETCARE - CONTROLADOR DE DETALLES DEL SEGUIMIENTO
 * RF20: Historial y detalle de atención.
 * RF40: Detalle de actividades.
 * ============================================================
 */

import {
  consultarHistorialMascotaControlador,
} from './seguimientoControlador';

import {
  enriquecerAtencionSeguimiento,
  obtenerDetalleCompletoActividad,
} from '../../services/atencion/seguimientoDetalleServicio';

/**
 * Consulta el historial y complementa cada atención con
 * los datos específicos de sus actividades de consulta.
 */
export async function consultarHistorialCompletoControlador(
  numeroHistoria
) {
  if (!numeroHistoria) {
    throw new Error('El número de historia es obligatorio.');
  }

  const historial = await consultarHistorialMascotaControlador(
    String(numeroHistoria)
  );

  if (!Array.isArray(historial)) {
    return [];
  }

  return Promise.all(
    historial.map((atencion) =>
      enriquecerAtencionSeguimiento(atencion)
    )
  );
}

/**
 * Consulta una actividad con todos los datos disponibles.
 */
export async function consultarDetalleActividadCompletoControlador(
  actividadId
) {
  return obtenerDetalleCompletoActividad(actividadId);
}

/**
 * Busca una atención específica dentro del historial completo.
 */
export async function consultarDetalleAtencionCompletoControlador(
  numeroHistoria,
  atencionId
) {
  const historial = await consultarHistorialCompletoControlador(
    numeroHistoria
  );

  const atencion = historial.find(
    (item) =>
      String(item.atencion_id) === String(atencionId)
  );

  if (!atencion) {
    throw new Error('No se encontró la atención solicitada.');
  }

  return atencion;
}
