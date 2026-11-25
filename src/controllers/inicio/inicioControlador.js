
/**
 * ============================================================
 * PETCARE — CONTROLADOR DEL PANEL PRINCIPAL
 * ============================================================
 *
 * RF08: Coordinar resumen, próximas citas y próximas actividades.
 * RF09: Coordinar consulta de atenciones activas.
 * RF10: Coordinar consulta de indicadores de actividades.
 *
 * ARQUITECTURA MVC:
 * - Vista: src/app/indicadores/paginaPrincipal.jsx
 * - Controlador: este archivo.
 * - Servicio: src/services/autentificacion/panelInicioServicio.js
 * - DAO: acceso a Supabase.
 *
 * SOLID:
 * - SRP: coordina las operaciones solicitadas por la vista.
 * - DIP: permite inyectar dependencias para las pruebas unitarias.
 *
 * SECUENCIA:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase.
 * La vista no accede directamente a la base de datos.
 */

import {
  consultarResumenInicio,
  consultarIndicadoresInicio,
  consultarProximasCitasInicio,
  consultarProximasActividadesInicio,
} from '../../services/autentificacion/panelInicioServicio';

/**
 * Crea el controlador del panel principal.
 *
 * Las dependencias pueden reemplazarse durante las pruebas.
 */
export function crearControladorInicio({
  obtenerResumen = consultarResumenInicio,
  obtenerIndicadores = consultarIndicadoresInicio,
  obtenerProximasCitas = consultarProximasCitasInicio,
  obtenerProximasActividades = consultarProximasActividadesInicio,
} = {}) {
  /**
   * RF08:
   * Consulta los datos generales del panel.
   */
  async function cargarResumen() {
    return await obtenerResumen();
  }

  /**
   * RF09 y RF10:
   * Consulta los indicadores del panel.
   */
  async function cargarIndicadores() {
    return await obtenerIndicadores();
  }

  /**
   * RF08:
   * Consulta las citas próximas y sus actividades asociadas.
   */
  async function cargarProximasCitas() {
    return await obtenerProximasCitas();
  }

  /**
   * RF08:
   * Consulta actividades pendientes según su fecha prevista,
   * tengan o no una cita asociada.
   *
   * "Pendiente de programación" debe determinarse a partir
   * de la ausencia de una cita, no como estado de actividad.
   */
  async function cargarProximasActividades() {
    return await obtenerProximasActividades();
  }

  return {
    cargarResumen,
    cargarIndicadores,
    cargarProximasCitas,
    cargarProximasActividades,
  };
}

/**
 * Instancia predeterminada para las vistas que la necesiten.
 */
const controladorInicio = crearControladorInicio();

export default controladorInicio;
