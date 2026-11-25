
import { supabase } from '../supabase';

import {
  consultarActividadesProximasAVencer,
} from '../../dao/actividades/actividadesDAO';

import {
  consultarProximasCitasConActividades,
} from '../../dao/dietaCita/citasDAO';

/**
 * ============================================================
 * PETCARE — SERVICIO DEL PANEL PRINCIPAL
 * ============================================================
 *
 * RF08: Resumen, próximas citas y próximas actividades.
 * RF09: Cantidad de atenciones activas.
 * RF10: Indicadores de actividades.
 *
 * Arquitectura:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase.
 */

const MENSAJES_ERROR = {
  conexion:
    'No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.',
  atenciones:
    'No se pudieron cargar las atenciones. Intente nuevamente.',
  actividades:
    'No se pudo cargar el resumen de actividades. Intente nuevamente.',
  actividadesProximas:
    'No se pudieron consultar las próximas actividades.',
  atencionesActivas:
    'No se pudo cargar la cantidad de atenciones activas. Intente nuevamente.',
  citas:
    'No se pudieron consultar las próximas citas y sus actividades.',
};

function esErrorDeConexion(error) {
  const mensaje = String(
    error?.message || error || ''
  ).toLowerCase();

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

function obtenerFechaLocal(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

function obtenerRangoProximosTresDias() {
  const hoy = new Date();
  const limite = new Date(hoy);

  limite.setDate(limite.getDate() + 3);

  return {
    fechaInicio: obtenerFechaLocal(hoy),
    fechaFin: obtenerFechaLocal(limite),
  };
}

/**
 * RF08:
 * Consulta el resumen general del panel.
 */
export async function consultarResumenInicio() {
  let resultadoAtenciones;
  let resultadoActividades;

  try {
    [resultadoAtenciones, resultadoActividades] =
      await Promise.all([
        supabase
          .from('atenciones')
          .select('atencion_id', {
            count: 'exact',
            head: true,
          }),

        supabase
          .from('actividades')
          .select('actividad_id, estado')
          .eq('eliminado', false),
      ]);
  } catch (error) {
    console.error('RF08: error consultando resumen:', error);

    if (esErrorDeConexion(error)) {
      throw new Error(MENSAJES_ERROR.conexion);
    }

    throw new Error(MENSAJES_ERROR.actividades);
  }

  if (
    esErrorDeConexion(resultadoAtenciones?.error) ||
    esErrorDeConexion(resultadoActividades?.error)
  ) {
    throw new Error(MENSAJES_ERROR.conexion);
  }

  if (resultadoAtenciones?.error) {
    console.error(resultadoAtenciones.error);
    throw new Error(MENSAJES_ERROR.atenciones);
  }

  if (resultadoActividades?.error) {
    console.error(resultadoActividades.error);
    throw new Error(MENSAJES_ERROR.actividades);
  }

  const actividades = Array.isArray(resultadoActividades?.data)
    ? resultadoActividades.data
    : [];

  const contarEstado = (estadoBuscado) =>
    actividades.filter(
      (actividad) =>
        String(actividad?.estado || '').trim().toLowerCase() ===
        estadoBuscado.toLowerCase()
    ).length;

  return {
    atencionesRegistradas: resultadoAtenciones?.count ?? 0,
    pendientes: contarEstado('Pendiente'),
    completadas: contarEstado('Completada'),
    noRealizadas: contarEstado('No realizada'),
  };
}

/**
 * RF08:
 * Consulta actividades próximas y agrega la información de su cita.
 *
 * La asociación se realiza usando:
 * actividades.actividad_id
 * detalle_cita.actividad_id
 * detalle_cita.cita_id
 * citas.cita_id
 *
 * Si no existe una relación vigente con una cita,
 * la propiedad cita será null.
 */
export async function consultarProximasActividadesInicio() {
  const { fechaInicio, fechaFin } =
    obtenerRangoProximosTresDias();

  try {
    const [actividades, citas] = await Promise.all([
      consultarActividadesProximasAVencer(
        fechaInicio,
        fechaFin
      ),
      consultarProximasCitasConActividades(
        fechaInicio,
        fechaFin
      ),
    ]);

    const listaActividades = Array.isArray(actividades)
      ? actividades
      : [];

    const listaCitas = Array.isArray(citas)
      ? citas
      : [];

    // Crear un índice de citas por identificador de actividad.
    const citasPorActividad = new Map();

    listaCitas.forEach((cita) => {
      (cita.actividades ?? []).forEach((actividad) => {
        const idActividad = Number(actividad.actividad_id);

        if (!Number.isNaN(idActividad)) {
          citasPorActividad.set(idActividad, cita);
        }
      });
    });

    // Agregar a cada actividad los datos de su cita,
    // si tiene una relación vigente.
    return listaActividades.map((actividad) => {
      const idActividad = Number(actividad.actividad_id);

      const cita = citasPorActividad.get(idActividad) ?? null;

      return {
        ...actividad,
        cita,
        pendienteProgramacion: cita === null,
      };
    });
  } catch (error) {
    console.error(
      'RF08: error consultando próximas actividades:',
      error
    );

    if (esErrorDeConexion(error)) {
      throw new Error(MENSAJES_ERROR.conexion);
    }

    throw new Error(
      error?.message || MENSAJES_ERROR.actividadesProximas
    );
  }
}

/**
 * RF08:
 * Consulta citas próximas con sus actividades.
 */
export async function consultarProximasCitasInicio() {
  const { fechaInicio, fechaFin } =
    obtenerRangoProximosTresDias();

  try {
    const citas =
      await consultarProximasCitasConActividades(
        fechaInicio,
        fechaFin
      );

    return Array.isArray(citas) ? citas : [];
  } catch (error) {
    console.error(
      'RF08: error consultando próximas citas:',
      error
    );

    if (esErrorDeConexion(error)) {
      throw new Error(MENSAJES_ERROR.conexion);
    }

    throw new Error(
      error?.message || MENSAJES_ERROR.citas
    );
  }
}

/**
 * RF09 y RF10:
 * Consulta indicadores de actividades y atenciones.
 */
export async function consultarIndicadoresInicio() {
  const { fechaInicio, fechaFin } =
    obtenerRangoProximosTresDias();

  let consultas;

  try {
    consultas = await Promise.all([
      supabase
        .from('actividades')
        .select('actividad_id', {
          count: 'exact',
          head: true,
        })
        .eq('eliminado', false)
        .eq('estado', 'Pendiente'),

      supabase
        .from('actividades')
        .select('actividad_id', {
          count: 'exact',
          head: true,
        })
        .eq('eliminado', false)
        .eq('estado', 'Completada'),

      supabase
        .from('actividades')
        .select('actividad_id', {
          count: 'exact',
          head: true,
        })
        .eq('eliminado', false)
        .eq('estado', 'No realizada'),

      supabase
        .from('actividades')
        .select('actividad_id', {
          count: 'exact',
          head: true,
        })
        .eq('eliminado', false)
        .eq('estado', 'Pendiente')
        .gte('fecha_prevista', fechaInicio)
        .lte('fecha_prevista', fechaFin),

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
      'RF09/RF10: error consultando indicadores:',
      error
    );

    if (esErrorDeConexion(error)) {
      throw new Error(MENSAJES_ERROR.conexion);
    }

    throw new Error(MENSAJES_ERROR.actividades);
  }

  if (consultas[4]?.error) {
    console.error(
      'RF09: error consultando atenciones activas:',
      consultas[4].error
    );

    if (esErrorDeConexion(consultas[4].error)) {
      throw new Error(MENSAJES_ERROR.conexion);
    }

    throw new Error(MENSAJES_ERROR.atencionesActivas);
  }

  const resultadoConError = consultas.find(
    (consulta, indice) =>
      indice !== 4 && consulta?.error
  );

  if (resultadoConError) {
    console.error(
      'RF10: error consultando indicadores:',
      resultadoConError.error
    );

    if (esErrorDeConexion(resultadoConError.error)) {
      throw new Error(MENSAJES_ERROR.conexion);
    }

    throw new Error(MENSAJES_ERROR.actividades);
  }

  return {
    pendientes: consultas[0]?.count ?? 0,
    completadas: consultas[1]?.count ?? 0,
    noRealizadas: consultas[2]?.count ?? 0,
    porVencer: consultas[3]?.count ?? 0,
    activas: consultas[4]?.count ?? 0,
  };
}
