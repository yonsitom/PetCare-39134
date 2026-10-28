
import { supabase } from './supabase';

/**
 * SERVICIO DEL PANEL PRINCIPAL — PETCARE
 *
 * RF08: Visualizar el panel principal con el resumen de atenciones
 *       y actividades.
 *
 * RF09: Visualizar la cantidad de atenciones activas.
 *
 * RF10: Visualizar la cantidad de actividades pendientes,
 *       completadas y no realizadas.
 *
 * SOLID — SRP:
 * Este servicio centraliza las consultas y reglas de negocio
 * del panel, evitando colocarlas directamente en la interfaz.
 *
 * MVC:
 * La vista consume este servicio y el servicio consulta Supabase.
 */

const MENSAJES_ERROR = {
  conexion:
    'No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.',

  atenciones:
    'No se pudieron cargar las atenciones. Intente nuevamente.',

  actividades:
    'No se pudo cargar el resumen de actividades. Intente nuevamente.',

  atencionesActivas:
    'No se pudo cargar la cantidad de atenciones activas. Intente nuevamente.',
};

/**
 * RF08, RF09 y RF10:
 * Identifica errores relacionados con la conexión.
 */
function esErrorDeConexion(error) {
  const mensaje = String(error?.message || error || '').toLowerCase();

  return (
    mensaje.includes('network request failed') ||
    mensaje.includes('failed to fetch') ||
    mensaje.includes('network error') ||
    mensaje.includes('fetch failed') ||
    mensaje.includes('connection refused') ||
    mensaje.includes('connection lost') ||
    mensaje.includes('timeout')
  );
}

/**
 * RF08 y RF10:
 * Consulta el resumen general del panel.
 *
 * Importante:
 * Las actividades con eliminado = true se excluyen.
 *
 * Los registros eliminados lógicamente no se borran físicamente
 * de la base de datos.
 */
export async function consultarResumenInicio() {
  let resultadoAtenciones;
  let resultadoActividades;

  try {
    [resultadoAtenciones, resultadoActividades] = await Promise.all([
      // RF08: contar las atenciones registradas.
      supabase
        .from('atenciones')
        .select('atencion_id', {
          count: 'exact',
          head: true,
        }),

      // RF10: consultar solamente las actividades no eliminadas.
      supabase
        .from('actividades')
        .select('actividad_id, estado')
        .eq('eliminado', false),
    ]);
  } catch (error) {
    console.error(
      'RF08/RF10: error al consultar el resumen del panel:',
      error
    );

    if (esErrorDeConexion(error)) {
      throw new Error(MENSAJES_ERROR.conexion);
    }

    throw new Error(MENSAJES_ERROR.actividades);
  }

  // RF08/RF10: verificar errores de conexión.
  if (
    esErrorDeConexion(resultadoAtenciones?.error) ||
    esErrorDeConexion(resultadoActividades?.error)
  ) {
    throw new Error(MENSAJES_ERROR.conexion);
  }

  // RF08: controlar errores de la consulta de atenciones.
  if (resultadoAtenciones?.error) {
    console.error(
      'RF08: error al consultar las atenciones:',
      resultadoAtenciones.error
    );

    throw new Error(MENSAJES_ERROR.atenciones);
  }

  // RF10: controlar errores de la consulta de actividades.
  if (resultadoActividades?.error) {
    console.error(
      'RF10: error al consultar las actividades:',
      resultadoActividades.error
    );

    throw new Error(MENSAJES_ERROR.actividades);
  }

  const actividades = Array.isArray(resultadoActividades?.data)
    ? resultadoActividades.data
    : [];

  /**
   * RF10:
   * Cuenta las actividades por estado.
   *
   * La consulta de Supabase ya excluyó los registros eliminados
   * mediante .eq('eliminado', false).
   */
  const contarEstado = (estadoBuscado) =>
    actividades.filter(
      (actividad) =>
        String(actividad?.estado || '').trim().toLowerCase() ===
        estadoBuscado.toLowerCase()
    ).length;

  return {
    // RF08
    atencionesRegistradas: resultadoAtenciones?.count ?? 0,

    // RF10
    pendientes: contarEstado('Pendiente'),
    completadas: contarEstado('Completada'),
    noRealizadas: contarEstado('No realizada'),
  };
}

/**
 * RF09:
 * Convierte una fecha en formato local YYYY-MM-DD.
 */
function obtenerFechaLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

/**
 * RF09 y los indicadores adicionales del panel.
 *
 * Consulta:
 * - Actividades pendientes.
 * - Actividades completadas.
 * - Actividades no realizadas.
 * - Actividades pendientes por vencer.
 * - Atenciones activas.
 *
 * Todas las consultas de actividades excluyen registros eliminados.
 */
export async function consultarIndicadoresInicio() {
  const hoy = new Date();
  const fechaHoy = obtenerFechaLocal(hoy);

  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + 3);

  const fechaLimite = obtenerFechaLocal(limite);

  let consultas;

  try {
    consultas = await Promise.all([
      // RF10: contar actividades pendientes no eliminadas.
      supabase
        .from('actividades')
        .select('actividad_id', {
          count: 'exact',
          head: true,
        })
        .eq('eliminado', false)
        .eq('estado', 'Pendiente'),

      // RF10: contar actividades completadas no eliminadas.
      supabase
        .from('actividades')
        .select('actividad_id', {
          count: 'exact',
          head: true,
        })
        .eq('eliminado', false)
        .eq('estado', 'Completada'),

      // RF10: contar actividades no realizadas no eliminadas.
      supabase
        .from('actividades')
        .select('actividad_id', {
          count: 'exact',
          head: true,
        })
        .eq('eliminado', false)
        .eq('estado', 'No realizada'),

      // Indicador: actividades pendientes para los próximos tres días.
      supabase
        .from('actividades')
        .select('actividad_id', {
          count: 'exact',
          head: true,
        })
        .eq('eliminado', false)
        .eq('estado', 'Pendiente')
        .gte('fecha_prevista', fechaHoy)
        .lte('fecha_prevista', fechaLimite),

      // RF09: contar atenciones activas.
      supabase
        .from('atenciones')
        .select('atencion_id', {
          count: 'exact',
          head: true,
        })
        .eq('estado', 'Activa'),
    ]);
  } catch (error) {
    console.error(
      'RF09/RF10: error de conexión al consultar los indicadores:',
      error
    );

    if (esErrorDeConexion(error)) {
      throw new Error(MENSAJES_ERROR.conexion);
    }

    throw new Error(MENSAJES_ERROR.actividades);
  }

  // RF09: la quinta consulta corresponde a las atenciones activas.
  if (consultas[4]?.error) {
    console.error(
      'RF09: error al consultar las atenciones activas:',
      consultas[4].error
    );

    if (esErrorDeConexion(consultas[4].error)) {
      throw new Error(MENSAJES_ERROR.conexion);
    }

    throw new Error(MENSAJES_ERROR.atencionesActivas);
  }

  // RF10: verificar errores en las consultas de actividades.
  const resultadoConError = consultas.find(
    (consulta, indice) => indice !== 4 && consulta?.error
  );

  if (resultadoConError) {
    console.error(
      'RF10: error al consultar los indicadores de actividades:',
      resultadoConError.error
    );

    if (esErrorDeConexion(resultadoConError.error)) {
      throw new Error(MENSAJES_ERROR.conexion);
    }

    throw new Error(MENSAJES_ERROR.actividades);
  }

  return {
    // RF10
    pendientes: consultas[0]?.count ?? 0,
    completadas: consultas[1]?.count ?? 0,
    noRealizadas: consultas[2]?.count ?? 0,

    // Indicador adicional del panel
    porVencer: consultas[3]?.count ?? 0,

    // RF09
    activas: consultas[4]?.count ?? 0,
  };
}
