
/**
 * ============================================================
 * PETCARE - CONTROLADOR DE ACTIVIDADES
 * ============================================================
 *
 * RF10: Consultar actividades por estado.
 * RF24: Consultar el detalle completo de una actividad.
 * RF25: Cambiar y reactivar estado.
 * RF32: Modificar actividad.
 * Eliminación lógica de actividades.
 *
 * Arquitectura:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase.
 * ============================================================
 */

import {
  obtenerActividadesPorEstado,
  obtenerActividadesPorAtencion,
  obtenerDetalleActividadServicio,
  cambiarEstadoActividadServicio,
  reactivarActividadServicio,
  editarActividadServicio,
  eliminarActividadServicio,
  verificarAtencionListaParaFinalizarServicio,
  finalizarAtencionServicio,
} from '../../services/atencion/actividadesServicio';

/* ============================================================
   RF10 - CONSULTAR ACTIVIDADES
   ============================================================ */

export async function listarActividadesPorEstado(estado) {
  const resultado = await obtenerActividadesPorEstado(estado);

  if (!Array.isArray(resultado)) {
    throw new Error(
      'No se pudo cargar el resumen de actividades. Intente nuevamente.'
    );
  }

  return resultado.filter(
    (actividad) => actividad && actividad.eliminado !== true
  );
}

export async function consultarActividadesPorEstado(estado) {
  return listarActividadesPorEstado(estado);
}

export async function consultarActividadesPorAtencion(atencionId) {
  const resultado = await obtenerActividadesPorAtencion(atencionId);

  if (!Array.isArray(resultado)) {
    throw new Error(
      'No se pudieron consultar las actividades de la atención.'
    );
  }

  return resultado.filter(
    (actividad) => actividad && actividad.eliminado !== true
  );
}

/* ============================================================
   RF24 - CONSULTAR DETALLE COMPLETO
   ============================================================ */

export async function obtenerDetalleActividad(actividadId) {
  const resultado = await obtenerDetalleActividadServicio(actividadId);

  if (!resultado) {
    throw new Error('No se encontró la actividad solicitada.');
  }

  return resultado;
}

/**
 * Nombre utilizado por la pantalla editarActividad.jsx.
 */
export async function consultarActividadPorId(actividadId) {
  return obtenerDetalleActividad(actividadId);
}

export async function consultarDetalleActividad(actividadId) {
  return obtenerDetalleActividad(actividadId);
}

/* ============================================================
   RF25 - CAMBIAR ESTADO
   ============================================================ */

export async function cambiarEstadoActividad(
  actividadId,
  nuevoEstado,
  motivoNoRealizada = null
) {
  return cambiarEstadoActividadServicio(
    actividadId,
    nuevoEstado,
    motivoNoRealizada
  );
}

export async function reactivarActividad(actividadId) {
  return reactivarActividadServicio(actividadId);
}

/* ============================================================
   RF32 - EDITAR ACTIVIDAD
   ============================================================ */

export async function editarActividad(
  actividadId,
  datosActualizacion
) {
  return editarActividadServicio(
    actividadId,
    datosActualizacion
  );
}

/* ============================================================
   ELIMINACIÓN LÓGICA
   ============================================================ */

export async function eliminarActividad(actividadId) {
  return eliminarActividadServicio(actividadId);
}
/* ============================================================
   RF26 — VERIFICAR ATENCIÓN LISTA PARA FINALIZAR
   ============================================================ */

export async function verificarAtencionListaParaFinalizar(atencionId) {
  return verificarAtencionListaParaFinalizarServicio(atencionId);
}

/* ============================================================
   RF25 — FINALIZAR ATENCIÓN
   ============================================================ */

export async function finalizarAtencion(atencionId) {
  return finalizarAtencionServicio(atencionId);
}