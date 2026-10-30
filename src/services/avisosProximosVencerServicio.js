
/**
 * ============================================================
 * PETCARE — SERVICIO RF11
 * MOSTRAR AVISOS DE ACTIVIDADES PRÓXIMAS A VENCER
 * ============================================================
 *
 * Regla:
 * - Solo actividades Pendientes.
 * - Solo actividades no eliminadas.
 * - Fecha prevista desde ahora hasta las próximas 24 horas.
 *
 * MVC:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase.
 *
 * SOLID:
 * - SRP: centraliza la regla de avisos próximos a vencer.
 * - DIP: permite inyectar el repositorio y las dependencias.
 *
 * TDD:
 * CP01: mostrar aviso correctamente.
 * CP02: error al aplicar el aviso visual.
 * CP03: fecha prevista inválida.
 * CP04: error al verificar el vencimiento.
 * ============================================================
 */

import {
  consultarActividadesProximasAVencer,
} from '../dao/actividadesDAO';
import { logger } from '../utils/logger';

const HORAS_PROXIMO_VENCIMIENTO = 24;
const MILISEGUNDOS_POR_HORA = 60 * 60 * 1000;

const MENSAJES = {
  aviso:
    'Actividad próxima a vencer',

  errorVisual:
    'No se pudo mostrar el aviso de actividad a vencer. Intente nuevamente',

  fechaInvalida:
    'No se pudo verificar la fecha prevista de la actividad',

  errorVencimiento:
    'No se pudo verificar el vencimiento de la actividad',
};

/**
 * Comprueba si una fecha es válida.
 */
function esFechaValida(fecha) {
  if (!fecha) {
    return false;
  }

  const tiempo = new Date(fecha).getTime();

  return Number.isFinite(tiempo);
}

/**
 * Convierte una fecha a ISO.
 */
function convertirAISO(fecha) {
  const resultado = new Date(fecha);

  if (!Number.isFinite(resultado.getTime())) {
    throw new Error(MENSAJES.errorVencimiento);
  }

  return resultado.toISOString();
}

/**
 * Calcula el límite de las próximas 24 horas.
 */
function calcularFechaLimite(fechaActual) {
  const limite = new Date(fechaActual);

  limite.setTime(
    limite.getTime() +
      HORAS_PROXIMO_VENCIMIENTO *
        MILISEGUNDOS_POR_HORA
  );

  return limite;
}

/**
 * Crea el servicio RF11.
 *
 * Dependencias:
 * - repositorio.consultarActividadesProximasAVencer
 * - aplicarAvisoVisual
 * - obtenerFechaActual
 */
export function crearAvisosProximosVencerService({
  repositorio,
  aplicarAvisoVisual = () => {},
  obtenerFechaActual = () => new Date(),
} = {}) {
  if (
    !repositorio ||
    typeof repositorio.consultarActividadesProximasAVencer !==
      'function'
  ) {
    throw new Error(
      'El repositorio de avisos próximos a vencer no es válido.'
    );
  }

  if (typeof aplicarAvisoVisual !== 'function') {
    throw new Error(
      'La función para aplicar el aviso visual no es válida.'
    );
  }

  if (typeof obtenerFechaActual !== 'function') {
    throw new Error(
      'La función para obtener la fecha actual no es válida.'
    );
  }

  /**
   * RF11:
   * Consulta y prepara los avisos de actividades próximas a vencer.
   */
  async function obtenerAvisosProximosVencer() {
    let ahora;
    let limite;

    try {
      ahora = obtenerFechaActual();

      if (!esFechaValida(ahora)) {
        throw new Error(MENSAJES.errorVencimiento);
      }

      limite = calcularFechaLimite(ahora);

      const fechaActualISO = convertirAISO(ahora);
      const fechaLimiteISO = convertirAISO(limite);

      const actividades =
        await repositorio.consultarActividadesProximasAVencer(
          fechaActualISO,
          fechaLimiteISO
        );

      if (!Array.isArray(actividades)) {
        throw new Error(MENSAJES.errorVencimiento);
      }

      const avisos = [];

      for (const actividad of actividades) {
        if (
          !actividad ||
          typeof actividad !== 'object' ||
          actividad.eliminado === true ||
          actividad.estado !== 'Pendiente'
        ) {
          continue;
        }

        if (!esFechaValida(actividad.fecha_prevista)) {
          return {
            ok: false,
            avisos: [],
            mensaje: MENSAJES.fechaInvalida,
          };
        }

        const fechaActividad = new Date(
          actividad.fecha_prevista
        );

        const tiempoActividad = fechaActividad.getTime();
        const tiempoActual = new Date(ahora).getTime();
        const tiempoLimite = limite.getTime();

        // Excluir actividades vencidas o fuera del plazo.
        if (
          tiempoActividad < tiempoActual ||
          tiempoActividad > tiempoLimite
        ) {
          continue;
        }

        const aviso = {
          ...actividad,
          destacar: true,
          aviso: MENSAJES.aviso,
          accion: 'Ver actividad',
        };

        avisos.push(aviso);
      }

      // Aplicar el aviso visual a cada actividad encontrada.
      try {
        for (const aviso of avisos) {
          aplicarAvisoVisual(aviso);
        }
      } catch (error) {
        logger.error(
          'RF11: error al aplicar el aviso visual:',
          error
        );

        return {
          ok: false,
          avisos: [],
          mensaje: MENSAJES.errorVisual,
        };
      }

      return {
        ok: true,
        avisos,
        total: avisos.length,
        mensaje:
          avisos.length > 0
            ? MENSAJES.aviso
            : null,
      };
    } catch (error) {
      logger.error(
        'RF11: error consultando avisos próximos a vencer:',
        error
      );

      return {
        ok: false,
        avisos: [],
        mensaje:
          error?.message === MENSAJES.fechaInvalida
            ? MENSAJES.fechaInvalida
            : MENSAJES.errorVencimiento,
      };
    }
  }

  return {
    obtenerAvisosProximosVencer,
  };
}

/**
 * ============================================================
 * RF11 — INSTANCIA REAL
 * ============================================================
 */

const avisosProximosVencerService =
  crearAvisosProximosVencerService({
    repositorio: {
      consultarActividadesProximasAVencer,
    },
  });

/**
 * RF11:
 * Función pública para consultar los avisos.
 */
export async function obtenerAvisosProximosVencer() {
  return avisosProximosVencerService
    .obtenerAvisosProximosVencer();
}
