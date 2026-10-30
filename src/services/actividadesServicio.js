
import { consultarActividadesPorEstado } from '../dao/actividadesDAO';

/**
 * RF10: consultar actividades por estado.
 *
 * MVC: separa las reglas de negocio de la interfaz.
 * DAO: delega las consultas a actividadesDAO.
 * SOLID - SRP: valida el estado y gestiona los errores
 * de la consulta de actividades.
 */

const ESTADOS_PERMITIDOS = [
  'Pendiente',
  'Completada',
  'No realizada',
];

const MENSAJE_ERROR =
  'No se pudo cargar el resumen de actividades. Intente nuevamente.';

/**
 * RF10:
 * Obtiene actividades por estado.
 * El DAO excluye las actividades con eliminado = true.
 */
export async function obtenerActividadesPorEstado(estado) {
  if (estado && !ESTADOS_PERMITIDOS.includes(estado)) {
    throw new Error('El estado indicado no es válido.');
  }

  try {
    const actividades = await consultarActividadesPorEstado(
      estado || null
    );

    return Array.isArray(actividades) ? actividades : [];
  } catch (error) {
    console.error('RF10: error al consultar actividades:', error);

    if (error?.message === 'El estado indicado no es válido.') {
      throw error;
    }

    throw new Error(MENSAJE_ERROR);
  }
}
