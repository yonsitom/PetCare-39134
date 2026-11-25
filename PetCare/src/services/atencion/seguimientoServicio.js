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
 * RF51: Consultar citas y actividades pendientes de programación.
 *
 * MVC:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase
 * ============================================================
 */

import {
  buscarMascotasParaHistorial,
  listarMascotasParaSeguimiento,
  consultarHistorialAtencionesPorMascota,
  consultarActividadesSeguimiento,
  consultarHistorialSeguimiento,
} from '../../dao/atencion/atencionesDAO';

import {
  consultarActividadesPorAtencion,
  suscribirCambiosAtencion,
  cancelarSuscripcionAtencion,
} from '../../dao/actividades/actividadesDAO';

import {
  obtenerLineaTiempo as consultarLineaTiempoDAO,
} from './lineaTiempoServicio';

import {
  obtenerCitasPorMascotaServicio,
  obtenerActividadesPendientesProgramacionServicio,
  programarCitaConActividades,
} from '../servicios/citasServicio';

// ============================================================
// CONSTANTES
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
  Pendiente: 'No hay actividades pendientes.',
  Completada: 'No hay actividades completadas.',
  'No realizada': 'No hay actividades no realizadas.',
};

function normalizarHistoria(valor) {
  return String(valor ?? '').trim().toUpperCase();
}

// ============================================================
// RF20 — BUSCAR MASCOTAS
// ============================================================

export async function buscarMascotasSeguimiento(termino) {
  if (typeof termino !== 'string') {
    throw new Error(
      'Ingrese un nombre o número de historia clínica válido.'
    );
  }

  const busqueda = termino.trim();

  if (!busqueda) return [];

  try {
    const mascotas =
      await buscarMascotasParaHistorial(busqueda);

    return Array.isArray(mascotas) ? mascotas : [];
  } catch (error) {
    console.error('RF20: error buscando mascotas:', error);
    throw new Error(MENSAJE_ERROR_BUSQUEDA);
  }
}
/**
 * RF20: cargar la lista inicial de mascotas activas.
 */
export async function obtenerMascotasSeguimiento() {
  try {
    const mascotas = await listarMascotasParaSeguimiento();

    return Array.isArray(mascotas) ? mascotas : [];
  } catch (error) {
    console.error(
      'RF20: error cargando mascotas para seguimiento:',
      error
    );

    throw new Error(
      error?.message ||
        'No se pudieron cargar las mascotas para seguimiento.'
    );
  }
}

export async function obtenerHistorialMascota(numeroHistoria) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia) {
    throw new Error(
      'Seleccione una mascota para consultar su historial.'
    );
  }

  try {
    const historial =
      await consultarHistorialAtencionesPorMascota(historia);

    return Array.isArray(historial) ? historial : [];
  } catch (error) {
    console.error('RF20: error consultando historial:', error);
    throw new Error(MENSAJE_ERROR_HISTORIAL);
  }
}

// ============================================================
// RF38-RF43 — CONSULTAS GENERALES
// ============================================================

export async function obtenerActividadesSeguimiento() {
  try {
    return await consultarActividadesSeguimiento();
  } catch (error) {
    console.error('Error en servicio de actividades:', error);

    throw new Error(
      'No se pudieron cargar las actividades de seguimiento.'
    );
  }
}

export async function obtenerHistorialSeguimiento() {
  try {
    return await consultarHistorialSeguimiento();
  } catch (error) {
    console.error('Error en servicio de historial:', error);

    throw new Error(
      'No se pudo cargar el historial de atención.'
    );
  }
}

// ============================================================
// RF40 — ACTIVIDADES POR ESTADO Y DETALLE
// ============================================================

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

  async function obtenerActividadesPorEstado(
    atencionId,
    estado = 'Todas'
  ) {
    if (
      atencionId === undefined ||
      atencionId === null ||
      String(atencionId).trim() === ''
    ) {
      throw new Error('Debes indicar una atención válida.');
    }

    if (!FILTROS_PERMITIDOS.includes(estado)) {
      throw new Error('El estado indicado no es válido.');
    }

    let actividades;

    try {
      actividades =
        await repositorio.consultarActividadesPorAtencion(
          atencionId
        );
    } catch (error) {
      console.error('RF40: error consultando actividades:', error);

      throw new Error(
        'No se pudieron consultar las actividades de la atención. Intente nuevamente.'
      );
    }

    if (!Array.isArray(actividades)) {
      throw new Error(
        'La información de las actividades está incompleta.'
      );
    }

    const actividadesVisibles = actividades.filter(
      (actividad) =>
        actividad &&
        actividad.eliminado !== true &&
        ESTADOS_VISIBLES.includes(actividad.estado)
    );

    const resultado =
      estado === 'Todas'
        ? actividadesVisibles
        : actividadesVisibles.filter(
            (actividad) => actividad.estado === estado
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

  async function obtenerDetalleActividad(
    atencionId,
    actividadId
  ) {
    if (
      atencionId === undefined ||
      atencionId === null ||
      String(atencionId).trim() === ''
    ) {
      throw new Error('Debes indicar una atención válida.');
    }

    if (
      actividadId === undefined ||
      actividadId === null ||
      String(actividadId).trim() === ''
    ) {
      throw new Error('Debes indicar una actividad válida.');
    }

    let actividades;

    try {
      actividades =
        await repositorio.consultarActividadesPorAtencion(
          atencionId
        );
    } catch (error) {
      console.error('RF40: error consultando detalle:', error);

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
        String(item.actividad_id) === String(actividadId) &&
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

const seguimientoServiceReal = crearSeguimientoService({
  consultarActividadesPorAtencion,
});

export async function obtenerActividadesPorEstadoSeguimiento(
  atencionId,
  estado = 'Todas'
) {
  return seguimientoServiceReal.obtenerActividadesPorEstado(
    atencionId,
    estado
  );
}

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
// RF41 — LÍNEA DE TIEMPO
// ============================================================

export async function obtenerLineaTiempoSeguimiento(
  atencionId
) {
  return consultarLineaTiempoDAO(atencionId);
}

// ============================================================
// RF43 — ACTUALIZACIÓN EN TIEMPO REAL
// ============================================================

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

  let estadoActual = {
    atencionId: null,
    actividades: [],
    actualizado: false,
    atencionDisponible: true,
    historial: [],
    mensaje: null,
    suscripcion: null,
  };

  const listeners = new Set();

  function obtenerEstadoActual() {
    return {
      ...estadoActual,
      actividades: [...estadoActual.actividades],
      historial: [...estadoActual.historial],
    };
  }

  function notificarEstado() {
    const estado = obtenerEstadoActual();

    listeners.forEach((listener) => {
      try {
        listener(estado);
      } catch (error) {
        console.error(
          'RF43: error notificando actualización:',
          error
        );
      }
    });
  }

  function suscribirseAEstado(callback) {
    if (typeof callback !== 'function') {
      throw new Error('El callback de estado no es válido.');
    }

    listeners.add(callback);
    callback(obtenerEstadoActual());

    return () => listeners.delete(callback);
  }

  async function consultarDatos(atencionId) {
    return repositorio.consultarActividadesPorAtencion(
      atencionId
    );
  }

  async function marcarAtencionNoDisponible() {
    let historial = [];

    if (
      typeof repositorio.consultarHistorialSeguimiento ===
      'function'
    ) {
      try {
        const resultado =
          await repositorio.consultarHistorialSeguimiento();

        historial = Array.isArray(resultado) ? resultado : [];
      } catch (error) {
        console.error(
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
      mensaje: 'La atención ya no se encuentra disponible.',
    };

    notificarEstado();
    return obtenerEstadoActual();
  }

  async function procesarCambio(cambio) {
    try {
      if (
        cambio?.table === 'atenciones' &&
        cambio?.eventType === 'DELETE'
      ) {
        return marcarAtencionNoDisponible();
      }

      if (estadoActual.atencionId == null) {
        return obtenerEstadoActual();
      }

      const actividades = await consultarDatos(
        estadoActual.atencionId
      );

      if (actividades == null) {
        return marcarAtencionNoDisponible();
      }

      if (!Array.isArray(actividades)) {
        throw new Error(
          'La información actualizada no es válida.'
        );
      }

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
      estadoActual = {
        ...estadoActual,
        actualizado: false,
        mensaje:
          'No se pudo completar la actualización de la información.',
      };

      console.error(
        'RF43: error procesando actualización:',
        error
      );

      notificarEstado();
      return obtenerEstadoActual();
    }
  }

  async function detenerSeguimiento() {
    const suscripcion = estadoActual.suscripcion;

    if (
      suscripcion &&
      typeof repositorio.cancelarSuscripcion === 'function'
    ) {
      try {
        await repositorio.cancelarSuscripcion(suscripcion);
      } catch (error) {
        console.error(
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

  async function iniciarSeguimiento(atencionId) {
    if (
      atencionId === undefined ||
      atencionId === null ||
      String(atencionId).trim() === ''
    ) {
      throw new Error('Debes indicar una atención válida.');
    }

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
      throw new Error('La atención no está disponible.');
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

      if (
        suscripcion?.ready &&
        typeof suscripcion.ready.then === 'function'
      ) {
        await suscripcion.ready;
      }
    } catch (error) {
      console.error(
        'RF43: no se pudo establecer la suscripción:',
        error
      );

      if (
        suscripcion &&
        typeof repositorio.cancelarSuscripcion === 'function'
      ) {
        try {
          await repositorio.cancelarSuscripcion(suscripcion);
        } catch (errorCancelacion) {
          console.error(
            'RF43: error cancelando suscripción fallida:',
            errorCancelacion
          );
        }
      }

      suscripcion = null;
    }

    if (!suscripcion) {
      estadoActual = {
        ...estadoActual,
        suscripcion: null,
        mensaje:
          'No se pudo establecer correctamente la actualización en tiempo real.',
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

  return {
    iniciarSeguimiento,
    obtenerEstadoActual,
    procesarCambio,
    detenerSeguimiento,
    suscribirseAEstado,
  };
}

const actualizacionTiempoRealService =
  crearActualizacionTiempoRealService({
    consultarActividadesPorAtencion,
    suscribirCambiosAtencion,
    cancelarSuscripcion: cancelarSuscripcionAtencion,
    consultarHistorialSeguimiento,
  });

export async function iniciarSeguimientoTiempoReal(atencionId) {
  return actualizacionTiempoRealService.iniciarSeguimiento(
    atencionId
  );
}

export function obtenerEstadoSeguimientoTiempoReal() {
  return actualizacionTiempoRealService.obtenerEstadoActual();
}

export function suscribirseEstadoSeguimientoTiempoReal(
  callback
) {
  return actualizacionTiempoRealService.suscribirseAEstado(
    callback
  );
}

export async function detenerSeguimientoTiempoReal() {
  return actualizacionTiempoRealService.detenerSeguimiento();
}

// ============================================================
// RF51 — CITAS Y ACTIVIDADES PENDIENTES DE PROGRAMACIÓN
// ============================================================

export async function obtenerCitasMascotaSeguimiento(
  numeroHistoria
) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia) {
    throw new Error(
      'Seleccione una mascota para consultar sus citas.'
    );
  }

  return obtenerCitasPorMascotaServicio(historia);
}

/**
 * Consulta directamente las actividades pendientes que todavía
 * no tienen una relación vigente con una cita.
 */
export async function obtenerActividadesPendientesSeguimiento(
  numeroHistoria
) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia) {
    throw new Error(
      'Seleccione una mascota para consultar sus actividades pendientes.'
    );
  }

  const resultado =
    await obtenerActividadesPendientesProgramacionServicio(
      historia
    );

  return Array.isArray(resultado) ? resultado : [];
}

/**
 * Programa actividades existentes dentro de una misma cita.
 * No registra actividades nuevas ni duplica las existentes.
 */
export async function programarCitaSeguimiento(datos = {}) {
  const historia = normalizarHistoria(datos.numero_historia);
  const actividadIds = Array.isArray(datos.actividad_ids)
    ? datos.actividad_ids
    : [];

  if (!historia) {
    throw new Error('No se identificó la mascota.');
  }

  if (
    datos.atencion_id === undefined ||
    datos.atencion_id === null ||
    String(datos.atencion_id).trim() === ''
  ) {
    throw new Error('No se identificó la atención.');
  }

  if (actividadIds.length === 0) {
    throw new Error(
      'Seleccione al menos una actividad para programar.'
    );
  }

  return programarCitaConActividades({
    ...datos,
    numero_historia: historia,
    actividad_ids: actividadIds,
  });
}