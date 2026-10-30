
/**
 * ============================================================
 * PETCARE — SERVICIO DE SEGUIMIENTO
 * ============================================================
 *
 * RF20: Consultar historial de atención de una mascota.
 * RF38-RF43: Consultas y seguimiento de atenciones.
 * RF40: Consultar actividades por estado y detalle.
 * RF41: Visualizar línea de tiempo.
 * RF43: Actualizar seguimiento en tiempo real.
 *
 * MVC:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase
 *
 * SOLID:
 * - SRP: coordina operaciones de seguimiento.
 * - DIP: permite inyectar repositorios en los servicios.
 * - DAO: delega el acceso a datos a los DAO.
 * ============================================================
 */

import {
  buscarMascotasParaHistorial,
  consultarHistorialAtencionesPorMascota,
  consultarActividadesSeguimiento,
  consultarHistorialSeguimiento,
} from '../dao/atencionesDAO';

import {
  consultarActividadesPorAtencion,
  suscribirCambiosAtencion,
  cancelarSuscripcionAtencion,
} from '../dao/actividadesDAO';

import {
  obtenerLineaTiempo as consultarLineaTiempoDAO,
} from './lineaTiempoServicio';
import { logger } from '../utils/logger';

// ============================================================
// CONSTANTES Y MENSAJES
// ============================================================

const MENSAJE_ERROR_BUSQUEDA =
  'No se pudo buscar las mascotas. Intente nuevamente.';

const MENSAJE_ERROR_HISTORIAL =
  'No se pudo cargar el historial de atención. Intente nuevamente.';

const ESTADOS_VISIBLES = [
  'Pendiente',
  'Completada',
  'No realizada',
];

const FILTROS_PERMITIDOS = [
  'Todas',
  ...ESTADOS_VISIBLES,
];

const MENSAJES_SIN_RESULTADOS = {
  Todas: 'No hay actividades registradas para esta atención.',
  Pendiente: 'No hay actividades pendientes',
  Completada: 'No hay actividades completadas',
  'No realizada': 'No hay actividades no realizadas',
};

// ============================================================
// RF20 — BUSCAR MASCOTAS PARA CONSULTAR HISTORIAL
// ============================================================

/**
 * RF20: buscar mascotas por nombre o historia clínica.
 */
export async function buscarMascotasSeguimiento(termino) {
  if (typeof termino !== 'string') {
    throw new Error(
      'Ingrese un nombre o número de historia clínica válido.'
    );
  }

  const busqueda = termino.trim();

  if (!busqueda) {
    return [];
  }

  try {
    const mascotas =
      await buscarMascotasParaHistorial(busqueda);

    return Array.isArray(mascotas) ? mascotas : [];
  } catch (error) {
    logger.error(
      'RF20: error buscando mascotas:',
      error
    );

    throw new Error(MENSAJE_ERROR_BUSQUEDA);
  }
}

/**
 * RF20: consultar las atenciones registradas
 * para una mascota.
 */
export async function obtenerHistorialMascota(
  numeroHistoria
) {
  if (
    typeof numeroHistoria !== 'string' ||
    !numeroHistoria.trim()
  ) {
    throw new Error(
      'Seleccione una mascota para consultar su historial.'
    );
  }

  try {
    const historial =
      await consultarHistorialAtencionesPorMascota(
        numeroHistoria.trim()
      );

    return Array.isArray(historial) ? historial : [];
  } catch (error) {
    logger.error(
      'RF20: error consultando historial:',
      error
    );

    throw new Error(MENSAJE_ERROR_HISTORIAL);
  }
}

// ============================================================
// RF38-RF43 — CONSULTAS GENERALES DE SEGUIMIENTO
// ============================================================

/**
 * RF38-RF43: cargar las actividades generales
 * utilizadas en el módulo de seguimiento.
 */
export async function obtenerActividadesSeguimiento() {
  try {
    return await consultarActividadesSeguimiento();
  } catch (error) {
    logger.error(
      'Error en servicio de actividades:',
      error
    );

    throw new Error(
      'No se pudieron cargar las actividades de seguimiento.'
    );
  }
}

/**
 * RF20/RF38-RF43: consultar el historial general
 * de seguimiento.
 */
export async function obtenerHistorialSeguimiento() {
  try {
    return await consultarHistorialSeguimiento();
  } catch (error) {
    logger.error(
      'Error en servicio de historial:',
      error
    );

    throw new Error(
      'No se pudo cargar el historial de atención.'
    );
  }
}

// ============================================================
// RF40 — CONSULTAR ACTIVIDADES POR ESTADO Y DETALLE
// ============================================================

/**
 * RF40: servicio de consulta de actividades.
 *
 * Se utiliza inyección de dependencias para permitir
 * pruebas unitarias mediante un repositorio simulado.
 */
export function crearSeguimientoService(repositorio) {
  if (
    !repositorio ||
    typeof repositorio.consultarActividadesPorAtencion !==
      'function'
  ) {
    throw new Error(
      'El repositorio de seguimiento no es válido.'
    );
  }

  /**
   * Consultar actividades filtradas por estado.
   */
  async function obtenerActividadesPorEstado(
    atencionId,
    estado = 'Todas'
  ) {
    if (
      atencionId === undefined ||
      atencionId === null ||
      String(atencionId).trim() === ''
    ) {
      throw new Error(
        'Debes indicar una atención válida.'
      );
    }

    if (!FILTROS_PERMITIDOS.includes(estado)) {
      throw new Error(
        'El estado indicado no es válido.'
      );
    }

    let actividades;

    try {
      actividades =
        await repositorio.consultarActividadesPorAtencion(
          atencionId
        );
    } catch (error) {
      logger.error(
        'RF40: error consultando actividades:',
        error
      );

      throw new Error(
        'No se pudieron consultar las actividades de la atención. Intente nuevamente.'
      );
    }

    if (!Array.isArray(actividades)) {
      throw new Error(
        'La información de las actividades está incompleta.'
      );
    }

    const actividadesVigentes = actividades.filter(
      (actividad) =>
        actividad &&
        typeof actividad === 'object' &&
        actividad.eliminado !== true
    );

    const actividadesVisibles =
      actividadesVigentes.filter(
        (actividad) =>
          ESTADOS_VISIBLES.includes(actividad.estado)
      );

    const resultado =
      estado === 'Todas'
        ? actividadesVisibles
        : actividadesVisibles.filter(
            (actividad) =>
              actividad.estado === estado
          );

    return {
      atencionId,
      estado,
      actividades: resultado,
      total: resultado.length,
      mensaje:
        resultado.length === 0
          ? MENSAJES_SIN_RESULTADOS[estado]
          : null,
    };
  }

  /**
   * Consultar el detalle de una actividad específica.
   */
  async function obtenerDetalleActividad(
    atencionId,
    actividadId
  ) {
    if (
      atencionId === undefined ||
      atencionId === null ||
      String(atencionId).trim() === ''
    ) {
      throw new Error(
        'Debes indicar una atención válida.'
      );
    }

    if (
      actividadId === undefined ||
      actividadId === null ||
      String(actividadId).trim() === ''
    ) {
      throw new Error(
        'Debes indicar una actividad válida.'
      );
    }

    let actividades;

    try {
      actividades =
        await repositorio.consultarActividadesPorAtencion(
          atencionId
        );
    } catch (error) {
      logger.error(
        'RF40: error consultando detalle:',
        error
      );

      throw new Error(
        'No se pudo consultar el detalle de la actividad. Intente nuevamente.'
      );
    }

    if (!Array.isArray(actividades)) {
      throw new Error(
        'La información de las actividades está incompleta.'
      );
    }

    const actividad = actividades.find(
      (item) =>
        item &&
        item.eliminado !== true &&
        String(item.actividad_id) ===
          String(actividadId) &&
        ESTADOS_VISIBLES.includes(item.estado)
    );

    if (!actividad) {
      throw new Error(
        'La actividad no existe en la atención seleccionada.'
      );
    }

    return { ...actividad };
  }

  return {
    obtenerActividadesPorEstado,
    obtenerDetalleActividad,
  };
}

// ============================================================
// RF40 — INSTANCIA REAL DEL SERVICIO
// ============================================================

const seguimientoServiceReal = crearSeguimientoService({
  consultarActividadesPorAtencion,
});

/**
 * RF40: consultar actividades por estado.
 */
export async function obtenerActividadesPorEstadoSeguimiento(
  atencionId,
  estado = 'Todas'
) {
  return seguimientoServiceReal.obtenerActividadesPorEstado(
    atencionId,
    estado
  );
}

/**
 * RF40: consultar detalle de actividad.
 */
export async function obtenerDetalleActividadSeguimiento(
  atencionId,
  actividadId
) {
  return seguimientoServiceReal.obtenerDetalleActividad(
    atencionId,
    actividadId
  );
}

// ============================================================
// RF41 — VISUALIZAR LÍNEA DE TIEMPO
// ============================================================

/**
 * RF41: delegar la consulta de la línea de tiempo
 * al servicio correspondiente.
 */
export async function obtenerLineaTiempoSeguimiento(
  atencionId
) {
  return consultarLineaTiempoDAO(atencionId);
}
// ============================================================
// RF43 — ACTUALIZACIÓN EN TIEMPO REAL
// ============================================================

/**
 * RF43:
 * Crear servicio para actualizar automáticamente
 * las actividades cuando se reciben cambios de Supabase.
 *
 * CP01: actualización automática.
 * CP02: error al establecer la suscripción.
 * CP03: error al recuperar información actualizada.
 * CP04: atención no disponible.
 *
 * SOLID:
 * - SRP: administra el seguimiento en tiempo real.
 * - DIP: recibe el repositorio mediante inyección.
 * - OCP: permite incorporar nuevos mecanismos de notificación.
 */
export function crearActualizacionTiempoRealService(
  repositorio
) {
  if (
    !repositorio ||
    typeof repositorio.consultarActividadesPorAtencion !==
      'function' ||
    typeof repositorio.suscribirCambiosAtencion !==
      'function'
  ) {
    throw new Error(
      'El repositorio de actualización en tiempo real no es válido.'
    );
  }

  // Estado privado de RF43.
  let estadoActual = {
    atencionId: null,
    actividades: [],
    actualizado: false,
    atencionDisponible: true,
    historial: [],
    mensaje: null,
    suscripcion: null,
  };

  // Suscriptores de la interfaz.
  const listeners = new Set();

  /**
   * Notificar a los componentes que consumen el servicio.
   */
  function notificarEstado() {
    const estado = obtenerEstadoActual();

    listeners.forEach((listener) => {
      try {
        listener(estado);
      } catch (error) {
        logger.error(
          'RF43: error notificando actualización:',
          error
        );
      }
    });
  }

  /**
   * Permitir que la pantalla se suscriba
   * a los cambios del estado del servicio.
   */
  function suscribirseAEstado(callback) {
    if (typeof callback !== 'function') {
      throw new Error(
        'El callback de estado no es válido.'
      );
    }

    listeners.add(callback);

    // Entregar inmediatamente el estado actual.
    callback(obtenerEstadoActual());

    // Retornar función para cancelar la escucha.
    return () => {
      listeners.delete(callback);
    };
  }

  /**
   * Consultar nuevamente las actividades.
   */
  async function consultarDatos(atencionId) {
    return repositorio.consultarActividadesPorAtencion(
      atencionId
    );
  }

  /**
   * CP04:
   * Actualizar el historial cuando una atención
   * deja de estar disponible.
   */
  async function marcarAtencionNoDisponible() {
    let historial = [];

    if (
      typeof repositorio.consultarHistorialSeguimiento ===
      'function'
    ) {
      try {
        const resultado =
          await repositorio.consultarHistorialSeguimiento();

        historial = Array.isArray(resultado)
          ? resultado
          : [];
      } catch (error) {
        logger.error(
          'RF43: error actualizando historial:',
          error
        );
      }
    }

    estadoActual = {
      ...estadoActual,
      actividades: [],
      actualizado: false,
      atencionDisponible: false,
      historial,
      mensaje:
        'La atención ya no se encuentra disponible.',
    };

    notificarEstado();

    return obtenerEstadoActual();
  }

  /**
   * CP01, CP03 y CP04:
   * Procesar eventos recibidos desde Supabase.
   */
  async function procesarCambio(cambio) {
    try {
      // CP04: la atención fue eliminada.
      if (
        cambio?.table === 'atenciones' &&
        cambio?.eventType === 'DELETE'
      ) {
        return await marcarAtencionNoDisponible();
      }

      if (
        estadoActual.atencionId === null ||
        estadoActual.atencionId === undefined
      ) {
        return obtenerEstadoActual();
      }

      const actividades = await consultarDatos(
        estadoActual.atencionId
      );

      // CP04: la atención ya no está disponible.
      if (
        actividades === null ||
        actividades === undefined
      ) {
        return await marcarAtencionNoDisponible();
      }

      if (!Array.isArray(actividades)) {
        throw new Error(
          'La información actualizada no es válida.'
        );
      }

      // CP01: actualizar automáticamente los datos.
      estadoActual = {
        ...estadoActual,
        actividades,
        actualizado: true,
        atencionDisponible: true,
        mensaje: null,
      };

      notificarEstado();

      return obtenerEstadoActual();
    } catch (error) {
      // CP03: conservar las actividades anteriores.
      estadoActual = {
        ...estadoActual,
        actualizado: false,
        mensaje:
          'No se pudo completar la actualización de la información.',
      };

      logger.error(
        'RF43: error procesando actualización:',
        error
      );

      notificarEstado();

      return obtenerEstadoActual();
    }
  }

  /**
   * Iniciar el seguimiento de una atención.
   */
  async function iniciarSeguimiento(atencionId) {
    if (
      atencionId === undefined ||
      atencionId === null ||
      String(atencionId).trim() === ''
    ) {
      throw new Error(
        'Debes indicar una atención válida.'
      );
    }

    // Evitar mantener una suscripción anterior.
    await detenerSeguimiento();

    let actividades;

    try {
      actividades = await consultarDatos(atencionId);
    } catch (error) {
      throw new Error(
        'No se pudo cargar la información de la atención.'
      );
    }

    if (!Array.isArray(actividades)) {
      throw new Error(
        'La atención no está disponible.'
      );
    }

    estadoActual = {
      atencionId,
      actividades,
      actualizado: false,
      atencionDisponible: true,
      historial: [],
      mensaje: null,
      suscripcion: null,
    };

    notificarEstado();

    let suscripcion = null;

    try {
      suscripcion =
        repositorio.suscribirCambiosAtencion(
          atencionId,
          procesarCambio
        );

      // La suscripción real de Supabase proporciona
      // una promesa que confirma el estado SUBSCRIBED.
      // Los repositorios simulados de las pruebas
      // pueden no implementar esta propiedad.
      if (
        suscripcion?.ready &&
        typeof suscripcion.ready.then === 'function'
      ) {
        await suscripcion.ready;
      }
    } catch (error) {
      logger.error(
        'RF43: no se pudo establecer la suscripción:',
        error
      );

      if (
        suscripcion &&
        typeof repositorio.cancelarSuscripcion ===
          'function'
      ) {
        try {
          await repositorio.cancelarSuscripcion(
            suscripcion
          );
        } catch (errorCancelacion) {
          logger.error(
            'RF43: error cancelando suscripción fallida:',
            errorCancelacion
          );
        }
      }

      suscripcion = null;
    }

    // CP02: no se estableció correctamente Realtime.
    if (!suscripcion) {
      estadoActual = {
        ...estadoActual,
        suscripcion: null,
        mensaje:
          'No recibe correctamente la actualización realizada',
      };

      notificarEstado();

      return {
        ...obtenerEstadoActual(),
        exito: false,
      };
    }

    estadoActual = {
      ...estadoActual,
      suscripcion,
      mensaje: null,
    };

    notificarEstado();

    return {
      ...obtenerEstadoActual(),
      exito: true,
    };
  }

  /**
   * Obtener una copia del estado actual.
   */
  function obtenerEstadoActual() {
    return {
      ...estadoActual,
      actividades: [...estadoActual.actividades],
      historial: [...estadoActual.historial],
    };
  }

  /**
   * Detener la suscripción de Supabase.
   */
  async function detenerSeguimiento() {
    const suscripcion = estadoActual.suscripcion;

    if (
      suscripcion &&
      typeof repositorio.cancelarSuscripcion ===
        'function'
    ) {
      try {
        await repositorio.cancelarSuscripcion(
          suscripcion
        );
      } catch (error) {
        logger.error(
          'RF43: error cancelando suscripción:',
          error
        );
      }
    }

    estadoActual = {
      ...estadoActual,
      suscripcion: null,
    };

    return obtenerEstadoActual();
  }

  return {
    iniciarSeguimiento,
    obtenerEstadoActual,
    procesarCambio,
    detenerSeguimiento,
    suscribirseAEstado,
  };
}

// ============================================================
// RF43 — INSTANCIA REAL CON SUPABASE
// ============================================================

const actualizacionTiempoRealService =
  crearActualizacionTiempoRealService({
    consultarActividadesPorAtencion,
    suscribirCambiosAtencion,
    cancelarSuscripcion: cancelarSuscripcionAtencion,
    consultarHistorialSeguimiento,
  });

/**
 * RF43: iniciar la actualización en tiempo real.
 */
export async function iniciarSeguimientoTiempoReal(
  atencionId
) {
  return actualizacionTiempoRealService.iniciarSeguimiento(
    atencionId
  );
}

/**
 * RF43: obtener el estado actual del seguimiento.
 */
export function obtenerEstadoSeguimientoTiempoReal() {
  return actualizacionTiempoRealService.obtenerEstadoActual();
}

/**
 * RF43: escuchar las actualizaciones para la interfaz.
 */
export function suscribirseEstadoSeguimientoTiempoReal(
  callback
) {
  return actualizacionTiempoRealService.suscribirseAEstado(
    callback
  );
}

/**
 * RF43: detener las actualizaciones en tiempo real.
 */
export async function detenerSeguimientoTiempoReal() {
  return actualizacionTiempoRealService.detenerSeguimiento();
}
