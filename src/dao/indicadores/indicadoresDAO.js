/**
 * PetCare - DAO de Indicadores
 * Archivo: src/dao/indicadores/indicadoresDAO.js
 * Capa: DAO (Data Access Object).
 *
 * RF: consultar indicadores de atenciones y actividades.
 *
 * Responsabilidades:
 * - Consultar información real en Supabase.
 * - Calcular los indicadores generales.
 * - Devolver el detalle de atenciones con fecha y estado
 *   para permitir la visualización histórica.
 *
 * No contiene lógica de interfaz ni datos de demostración.
 */

import { supabase } from "../../services/supabase";
import { logger } from '../../utils/logger';

/**
 * Obtiene las atenciones y sus fechas para el historial.
 *
 * Se seleccionan únicamente columnas conocidas del modelo
 * de atenciones: atencion_id, fecha_inicio, fecha_fin y estado.
 */
async function consultarAtenciones() {
  const { data, error } = await supabase
    .from("atenciones")
    .select("atencion_id, fecha_inicio, fecha_fin, estado")
    .order("fecha_inicio", { ascending: true });

  if (error) {
    logger.error("Error al consultar atenciones:", error);
    throw error;
  }

  return data ?? [];
}

/**
 * Obtiene las actividades para calcular sus indicadores.
 *
 * Se utiliza el estado de la tabla actividades.
 */
async function consultarActividades() {
  const { data, error } = await supabase
    .from("actividades")
    .select("actividad_id, estado, fecha_prevista");

  if (error) {
    logger.error("Error al consultar actividades:", error);
    throw error;
  }

  return data ?? [];
}

/**
 * Determina si una actividad está pendiente.
 */
function estaPendiente(estado) {
  return String(estado ?? "").trim().toLowerCase() === "pendiente";
}

/**
 * Determina si una actividad está completada.
 */
function estaCompletada(estado) {
  return ["completada", "completado"].includes(
    String(estado ?? "").trim().toLowerCase()
  );
}

/**
 * Determina si una actividad no fue realizada.
 */
function noFueRealizada(estado) {
  return ["no realizada", "no_realizada"].includes(
    String(estado ?? "").trim().toLowerCase()
  );
}

/**
 * Comprueba si una actividad pendiente vence durante los
 * próximos siete días, contando desde el día actual.
 */
function estaPorVencer(fechaPrevista) {
  if (!fechaPrevista) return false;

  const fecha = new Date(`${String(fechaPrevista).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(fecha.getTime())) return false;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + 7);

  return fecha >= hoy && fecha <= limite;
}

/**
 * Consulta todos los indicadores que necesita la pantalla.
 *
 * Devuelve:
 * - Totales de actividades por estado.
 * - Total de atenciones activas.
 * - Detalle histórico de atenciones para el gráfico.
 */
export async function consultarTodosLosIndicadores() {
  const [atenciones, actividades] = await Promise.all([
    consultarAtenciones(),
    consultarActividades(),
  ]);

  const atencionesActivas = atenciones.filter((atencion) => {
    const estado = String(atencion.estado ?? "").trim().toLowerCase();
    return ["activa", "activo", "en proceso", "en_proceso"].includes(estado);
  }).length;

  const actividadesPendientes = actividades.filter((actividad) =>
    estaPendiente(actividad.estado)
  ).length;

  const actividadesCompletadas = actividades.filter((actividad) =>
    estaCompletada(actividad.estado)
  ).length;

  const actividadesNoRealizadas = actividades.filter((actividad) =>
    noFueRealizada(actividad.estado)
  ).length;

  const actividadesPorVencer = actividades.filter(
    (actividad) =>
      estaPendiente(actividad.estado) &&
      estaPorVencer(actividad.fecha_prevista)
  ).length;

  return {
    atencionesActivas,
    actividadesPendientes,
    actividadesCompletadas,
    actividadesNoRealizadas,
    actividadesPorVencer,

    // La pantalla utiliza estos registros para construir
    // el gráfico por fecha sin inventar cantidades.
    atenciones: atenciones.map((atencion) => ({
      atencion_id: atencion.atencion_id,
      fecha_inicio: atencion.fecha_inicio,
      fecha_fin: atencion.fecha_fin,
      estado: atencion.estado,
    })),

    totalAtenciones: atenciones.length,
    totalActividades: actividades.length,
  };
}
