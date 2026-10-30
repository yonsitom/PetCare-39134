/**
 * PETCARE — SERVICIO DE INDICADORES
 * Archivo: src/services/indicadores/indicadoresServicio.js
 *
 * MVC:
 * - Vista: src/app/indicadores.jsx
 * - Controlador: src/controllers/indicadores/
 * - Servicio: este archivo
 * - DAO: src/dao/indicadores/indicadoresDAO.js
 *
 * SOLID:
 * - SRP: centraliza la preparación de indicadores.
 * - DIP: utiliza el DAO para obtener los datos persistidos.
 *
 * No consulta Supabase directamente y no contiene cifras ficticias.
 */

import {
  consultarTodosLosIndicadores,
} from '../../dao/indicadores/indicadoresDAO';

/**
 * Prepara los indicadores para que el controlador
 * pueda entregarlos a la interfaz.
 */
export async function obtenerIndicadores() {
  const datos = await consultarTodosLosIndicadores();

  return {
    atencionesActivas: Number(datos.atencionesActivas ?? 0),
    actividadesPendientes: Number(datos.actividadesPendientes ?? 0),
    actividadesCompletadas: Number(datos.actividadesCompletadas ?? 0),
    actividadesNoRealizadas: Number(datos.actividadesNoRealizadas ?? 0),
    actividadesPorVencer: Number(datos.actividadesPorVencer ?? 0),
    fechaConsulta: datos.fechaConsulta ?? new Date().toISOString(),
  };
}