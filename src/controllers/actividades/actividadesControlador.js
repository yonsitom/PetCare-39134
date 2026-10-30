/**
 * Controlador de actividades.
 *
 * RF10: consultar actividades por estado.
 * RF25: actualizar el estado de una actividad.
 *
 * MVC:
 * - Vista: src/app/actividades.jsx y detalleActividad.jsx
 * - Controlador: este archivo
 * - Servicio: src/services/actividadesServicio.js
 * - DAO: src/dao/actividadesDAO.js
 *
 * SOLID:
 * - SRP: coordina las solicitudes de la vista.
 * - DIP: delega las operaciones en el servicio.
 */

import {
  obtenerActividadesPorEstado,
  cambiarEstadoActividadServicio,
} from '../../services/actividadesServicio';

/**
 * RF10: listar actividades de un estado válido.
 */
export async function listarActividadesPorEstado(estado) {
  const resultado = await obtenerActividadesPorEstado(estado);

  if (!Array.isArray(resultado)) {
    throw new Error(
      'No se pudo cargar el resumen de actividades. Intente nuevamente.'
    );
  }

  return resultado.filter(
    actividad => actividad?.eliminado !== true
  );
}

/**
 * Alias para mantener compatibilidad con otros módulos.
 */
export async function consultarActividadesPorEstado(estado) {
  return listarActividadesPorEstado(estado);
}

/**
 * RF25: cambiar el estado desde el detalle de una actividad.
 */
export async function cambiarEstadoActividad(
  actividadId,
  nuevoEstado,
  motivoNoRealizada = null
) {
  return cambiarEstadoActividadServicio(
    actividadId,
    nuevoEstado,
    motivoNoRealizada
  );
}
