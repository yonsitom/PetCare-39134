
/**
 * PetCare - Controlador de actividades.
 * MVC: recibe las solicitudes de la vista y delega la lógica al servicio.
 * RF10: visualizar actividades por estado.
 */

import { obtenerActividadesPorEstado } from '../../services/actividadesServicio';

/**
 * Obtiene las actividades filtradas por estado.
 * La vista no consulta directamente al DAO.
 */
export async function listarActividadesPorEstado(estado) {
  if (typeof estado !== 'string' || !estado.trim()) {
    throw new Error('El estado indicado no es válido.');
  }

  return obtenerActividadesPorEstado(estado.trim());
}
