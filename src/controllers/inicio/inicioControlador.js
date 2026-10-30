
/**
 * CONTROLADOR DEL PANEL PRINCIPAL — PETCARE
 *
 * RF08: Coordinar la consulta del resumen del panel principal.
 * RF09: Coordinar la consulta de atenciones activas.
 * RF10: Coordinar la consulta de indicadores de actividades.
 *
 * ARQUITECTURA MVC
 * - Modelo / acceso a datos: DAO y Supabase.
 * - Servicio: src/services/panelInicioServicio.js
 * - Controlador: este archivo.
 * - Vista: src/app/inicio.jsx
 *
 * PRINCIPIOS SOLID
 * - SRP: coordina las operaciones del panel principal.
 * - DIP: recibe las funciones de consulta como dependencias.
 *
 * TDD
 * Las dependencias pueden sustituirse por funciones simuladas
 * para comprobar el comportamiento del controlador sin consultar
 * directamente la base de datos.
 */

import {
  consultarResumenInicio,
  consultarIndicadoresInicio,
} from '../../services/panelInicioServicio';

/**
 * Crea el controlador del panel principal.
 *
 * Las dependencias predeterminadas utilizan el servicio real.
 * En las pruebas se pueden inyectar funciones simuladas.
 */
export function crearControladorInicio({
  obtenerResumen = consultarResumenInicio,
  obtenerIndicadores = consultarIndicadoresInicio,
} = {}) {
  /**
   * RF08: obtiene el resumen del panel principal.
   */
  async function cargarResumen() {
    return obtenerResumen();
  }

  /**
   * RF09 y RF10: obtiene los indicadores del panel.
   * El servicio consulta los estados de actividades y atenciones.
   */
  async function cargarIndicadores() {
    return obtenerIndicadores();
  }

  return {
    cargarResumen,
    cargarIndicadores,
  };
}

/**
 * Controlador predeterminado para utilizar desde la vista.
 */
const controladorInicio = crearControladorInicio();

export default controladorInicio;
