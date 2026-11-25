
/**
 * ============================================================
 * PETCARE - CONTROLADOR DE SEGUIMIENTO
 * ============================================================
 *
 * RF20: buscar mascotas y consultar su historial.
 * RF40: consultar actividades por estado y detalle.
 * RF41: visualizar línea de tiempo.
 * RF43: actualización en tiempo real.
 * RF51: consultar citas y programar actividades pendientes.
 *
 * MVC:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase.
 * ============================================================
 */

import {
  obtenerMascotasSeguimiento,
  buscarMascotasSeguimiento,
  obtenerHistorialMascota,
  obtenerCitasMascotaSeguimiento,
  obtenerActividadesPendientesSeguimiento,
  programarCitaSeguimiento,
  obtenerActividadesPorEstadoSeguimiento,
  obtenerDetalleActividadSeguimiento,
  obtenerHistorialSeguimiento,
  obtenerLineaTiempoSeguimiento,
  iniciarSeguimientoTiempoReal,
  obtenerEstadoSeguimientoTiempoReal,
  suscribirseEstadoSeguimientoTiempoReal,
  detenerSeguimientoTiempoReal,
} from '../../services/atencion/seguimientoServicio';

// ============================================================
// RF20 - BUSCAR MASCOTAS
// ============================================================

export async function buscarMascotasSeguimientoControlador(
  termino
) {
  try {
    return await buscarMascotasSeguimiento(termino);
  } catch (error) {
    console.error(
      'RF20: error en búsqueda de mascotas:',
      error
    );

    throw new Error(
      error?.message || 'No se pudieron buscar las mascotas.'
    );
  }
}

// ============================================================
// RF20 - LISTAR MASCOTAS PARA SEGUIMIENTO
// ============================================================

export async function listarMascotasSeguimientoControlador() {
  try {
    const mascotas = await obtenerMascotasSeguimiento();

    return Array.isArray(mascotas) ? mascotas : [];
  } catch (error) {
    console.error(
      'RF20: error listando mascotas:',
      error
    );

    throw new Error(
      error?.message ||
        'No se pudieron cargar las mascotas.'
    );
  }
}

// ============================================================
// RF20 - HISTORIAL COMPLETO DE UNA MASCOTA
// ============================================================

export async function consultarHistorialMascotaControlador(
  numeroHistoria
) {
  try {
    const historial = await obtenerHistorialMascota(
      numeroHistoria
    );

    if (!Array.isArray(historial)) {
      return [];
    }

    return await Promise.all(
      historial.map(async (atencion) => {
        const resultado =
          await obtenerActividadesPorEstadoSeguimiento(
            atencion.atencion_id,
            'Todas'
          );

        return {
          ...atencion,
          actividades: resultado?.actividades ?? [],
          total_actividades: resultado?.total ?? 0,
        };
      })
    );
  } catch (error) {
    console.error(
      'RF20: error consultando historial completo:',
      error
    );

    throw new Error(
      error?.message ||
        'No se pudo cargar el historial de la mascota.'
    );
  }
}

// ============================================================
// RF51 - CONSULTAR CITAS
// ============================================================

export async function consultarCitasMascotaControlador(
  numeroHistoria
) {
  try {
    const citas = await obtenerCitasMascotaSeguimiento(
      numeroHistoria
    );

    return Array.isArray(citas) ? citas : [];
  } catch (error) {
    console.error(
      'RF51: error consultando citas:',
      error
    );

    throw new Error(
      error?.message ||
        'No se pudieron consultar las citas de la mascota.'
    );
  }
}

// ============================================================
// RF51 - ACTIVIDADES PENDIENTES DE PROGRAMACIÓN
// ============================================================

export async function consultarActividadesPendientesControlador(
  numeroHistoria
) {
  try {
    const actividades =
      await obtenerActividadesPendientesSeguimiento(
        numeroHistoria
      );

    return Array.isArray(actividades) ? actividades : [];
  } catch (error) {
    console.error(
      'RF51: error consultando actividades pendientes:',
      error
    );

    throw new Error(
      error?.message ||
        'No se pudieron consultar las actividades pendientes de programación.'
    );
  }
}

// ============================================================
// RF51 - PROGRAMAR CITA CON ACTIVIDADES EXISTENTES
// ============================================================

export async function programarCitaSeguimientoControlador(
  datos
) {
  try {
    return await programarCitaSeguimiento(datos);
  } catch (error) {
    console.error(
      'RF51: error programando cita:',
      error
    );

    throw new Error(
      error?.message || 'No se pudo programar la cita.'
    );
  }
}

// ============================================================
// RF38-RF43 - HISTORIAL GENERAL
// ============================================================

export async function listarHistorialSeguimiento() {
  try {
    const historial = await obtenerHistorialSeguimiento();

    return Array.isArray(historial) ? historial : [];
  } catch (error) {
    console.error(
      'Error consultando historial:',
      error
    );

    throw new Error(
      error?.message ||
        'No se pudo cargar el historial de atención.'
    );
  }
}

// ============================================================
// RF40 - CONSULTAR ACTIVIDADES POR ESTADO
// ============================================================

export async function consultarActividadesPorEstadoControlador(
  atencionId,
  estado = 'Todas'
) {
  try {
    return await obtenerActividadesPorEstadoSeguimiento(
      atencionId,
      estado
    );
  } catch (error) {
    console.error(
      'RF40: error consultando actividades por estado:',
      error
    );

    throw new Error(
      error?.message ||
        'No se pudieron consultar las actividades.'
    );
  }
}

// ============================================================
// RF40 - CONSULTAR DETALLE DE ACTIVIDAD
// ============================================================

export async function consultarDetalleActividadControlador(
  atencionId,
  actividadId
) {
  try {
    return await obtenerDetalleActividadSeguimiento(
      atencionId,
      actividadId
    );
  } catch (error) {
    console.error(
      'RF40: error consultando detalle de actividad:',
      error
    );

    throw new Error(
      error?.message ||
        'No se pudo consultar el detalle de la actividad.'
    );
  }
}

// ============================================================
// RF41 - LÍNEA DE TIEMPO
// ============================================================

export async function consultarLineaTiempoControlador(
  atencionId
) {
  try {
    return await obtenerLineaTiempoSeguimiento(atencionId);
  } catch (error) {
    console.error(
      'RF41: error en controlador:',
      error
    );

    return {
      exito: false,
      eventos: [],
      mensaje:
        'No fue posible cargar la línea de tiempo. Inténtelo nuevamente.',
      datosIncompletos: false,
      advertencia: '',
    };
  }
}

// ============================================================
// RF43 - ACTUALIZACIÓN EN TIEMPO REAL
// ============================================================

export async function iniciarSeguimientoTiempoRealControlador(
  atencionId
) {
  try {
    return await iniciarSeguimientoTiempoReal(atencionId);
  } catch (error) {
    console.error(
      'RF43: error iniciando seguimiento:',
      error
    );

    return {
      exito: false,
      actividades: [],
      mensaje:
        'No se pudo iniciar la actualización del seguimiento.',
    };
  }
}

export function obtenerEstadoTiempoRealControlador() {
  return obtenerEstadoSeguimientoTiempoReal();
}

export function suscribirseEstadoTiempoRealControlador(
  callback
) {
  return suscribirseEstadoSeguimientoTiempoReal(callback);
}

export async function detenerSeguimientoTiempoRealControlador() {
  try {
    await detenerSeguimientoTiempoReal();
  } catch (error) {
    console.error(
      'RF43: error cancelando suscripción:',
      error
    );
  }
}

// ============================================================
// COMPATIBILIDAD CON LOS NOMBRES ANTERIORES
// ============================================================

export async function consultarActividadesPorEstado(
  atencionId,
  estado = 'Todas'
) {
  return consultarActividadesPorEstadoControlador(
    atencionId,
    estado
  );
}

export async function consultarDetalleActividad(
  atencionId,
  actividadId
) {
  return consultarDetalleActividadControlador(
    atencionId,
    actividadId
  );
}
