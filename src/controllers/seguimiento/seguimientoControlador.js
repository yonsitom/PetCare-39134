
/**
 * ============================================================
 * PETCARE - CONTROLADOR DE SEGUIMIENTO
 * ============================================================
 *
 * RF20: consultar historial de mascotas y atenciones.
 * RF40: consultar actividades por estado y detalle.
 * RF41: visualizar línea de tiempo de una atención.
 * RF43: actualizar seguimiento en tiempo real.
 *
 * MVC:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase
 * ============================================================
 */

import {
  obtenerHistorialSeguimiento,
  obtenerActividadesPorEstadoSeguimiento,
  obtenerDetalleActividadSeguimiento,
  obtenerLineaTiempoSeguimiento,

  // RF43
  iniciarSeguimientoTiempoReal,
  obtenerEstadoSeguimientoTiempoReal,
  suscribirseEstadoSeguimientoTiempoReal,
  detenerSeguimientoTiempoReal,
} from '../../services/seguimientoServicio';
import { logger } from '../../utils/logger';

/**
 * RF38-RF43:
 * Consultar el historial general de atenciones.
 */
export async function listarHistorialSeguimiento() {
  try {
    return await obtenerHistorialSeguimiento();
  } catch (error) {
    logger.error('Error consultando historial:', error);

    throw new Error(
      error?.message ||
      'No se pudo cargar el historial de atención.'
    );
  }
}

/**
 * RF40:
 * Consultar actividades de una atención por estado.
 */
export async function consultarActividadesPorEstadoControlador(
  atencionId,
  estado = 'Todas'
) {
  try {
    return await obtenerActividadesPorEstadoSeguimiento(
      atencionId,
      estado
    );
  } catch (error) {
    throw new Error(
      error?.message ||
      'No se pudieron consultar las actividades.'
    );
  }
}

/**
 * RF40:
 * Consultar detalle de una actividad.
 */
export async function consultarDetalleActividadControlador(
  atencionId,
  actividadId
) {
  try {
    return await obtenerDetalleActividadSeguimiento(
      atencionId,
      actividadId
    );
  } catch (error) {
    throw new Error(
      error?.message ||
      'No se pudo consultar el detalle de la actividad.'
    );
  }
}

/**
 * RF41:
 * Consultar línea de tiempo de una atención.
 */
export async function consultarLineaTiempoControlador(
  atencionId
) {
  try {
    return await obtenerLineaTiempoSeguimiento(atencionId);
  } catch (error) {
    logger.error('RF41: error en controlador:', error);

    return {
      exito: false,
      eventos: [],
      mensaje:
        'No fue posible cargar la línea de tiempo. Inténtelo nuevamente.',
      datosIncompletos: false,
      advertencia: '',
    };
  }
}

/**
 * ============================================================
 * RF43: ACTUALIZACIÓN EN TIEMPO REAL
 * ============================================================
 */

/**
 * Iniciar la consulta y suscripción de una atención.
 */
export async function iniciarSeguimientoTiempoRealControlador(
  atencionId
) {
  try {
    return await iniciarSeguimientoTiempoReal(atencionId);
  } catch (error) {
    logger.error('RF43: error iniciando seguimiento:', error);

    return {
      exito: false,
      actividades: [],
      mensaje:
        'No recibe correctamente la actualización realizada',
    };
  }
}

/**
 * Obtener el estado actual del seguimiento.
 */
export function obtenerEstadoTiempoRealControlador() {
  return obtenerEstadoSeguimientoTiempoReal();
}

/**
 * Escuchar los cambios del estado del seguimiento.
 */
export function suscribirseEstadoTiempoRealControlador(
  callback
) {
  return suscribirseEstadoSeguimientoTiempoReal(callback);
}

/**
 * Cancelar la suscripción de una atención.
 */
export async function detenerSeguimientoTiempoRealControlador() {
  try {
    await detenerSeguimientoTiempoReal();
  } catch (error) {
    logger.error('RF43: error cancelando suscripción:', error);
  }
}

/**
 * ============================================================
 * COMPATIBILIDAD CON seguimiento.jsx
 * ============================================================
 */

export async function consultarActividadesPorEstado(
  atencionId,
  estado = 'Todas'
) {
  return consultarActividadesPorEstadoControlador(
    atencionId,
    estado
  );
}

export async function consultarDetalleActividad(
  atencionId,
  actividadId
) {
  return consultarDetalleActividadControlador(
    atencionId,
    actividadId
  );
}
