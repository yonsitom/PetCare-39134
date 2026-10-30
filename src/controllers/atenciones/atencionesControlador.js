import {
  consultarAtenciones,
  consultarMascotasParaAtencion,
  crearAtencionInicial,
  guardarDatosConsulta,
  consultarAtencionPorId,
  consultarDatosConsulta,
} from '../../dao/atencionesDAO';

import {
  programarCita as programarCitaServicio,
  cancelarCita as cancelarCitaServicio,
} from '../../services/citasServicio';

import {
  consultarActividadesPorAtencion,
  validarQueNoExistaActividadAbierta,
} from '../../dao/actividadesDAO';

import {
  cambiarEstadoActividadServicio,
} from '../../services/actividadesServicio';
import { logger } from '../../utils/logger';
/**
 * RF22: listar mascotas disponibles para registrar una atención.
 */
export async function listarMascotasParaRegistro() {
  return consultarMascotasParaAtencion();
}

/**
 * RF21: listar las atenciones registradas.
 */
export async function listarAtenciones() {
  return consultarAtenciones();
}

/**
 * RF22 / RF23: iniciar una atención.
 * La fecha y hora de inicio proceden de PostgreSQL.
 */
export async function confirmarAtencion(numeroHistoria) {
  if (
    typeof numeroHistoria !== 'string' ||
    numeroHistoria.trim() === ''
  ) {
    throw new Error(
      'Seleccione una mascota para registrar la atención.'
    );
  }

  const historiaNormalizada = numeroHistoria
    .trim()
    .toUpperCase();

  await validarQueNoExistaActividadAbierta(
    historiaNormalizada
  );

  const atencion = await crearAtencionInicial(
    historiaNormalizada
  );

  if (
    !atencion ||
    !atencion.atencion_id ||
    !atencion.actividad_id ||
    !atencion.fecha_inicio
  ) {
    throw new Error(
      'No se pudo registrar el inicio de la atención. Intente nuevamente.'
    );
  }

  return atencion;
}

/**
 * Guarda datos clínicos en una actividad Consulta existente.
 */
export async function guardarConsulta(actividadId, datos) {
  if (
    actividadId === undefined ||
    actividadId === null ||
    String(actividadId).trim() === ''
  ) {
    throw new Error(
      'No se encontró la actividad asociada a la consulta.'
    );
  }

  if (!datos || typeof datos !== 'object') {
    throw new Error('Ingrese los datos de la consulta.');
  }

  const motivoConsulta =
    typeof datos.motivo_consulta === 'string'
      ? datos.motivo_consulta.trim()
      : typeof datos.motivo === 'string'
        ? datos.motivo.trim()
        : '';

  if (!motivoConsulta) {
    throw new Error('El motivo de consulta es obligatorio.');
  }

  return guardarDatosConsulta(actividadId, {
    ...datos,
    motivo_consulta: motivoConsulta,
  });
}

/**
 * RF24: consultar información general de una atención.
 */
export async function obtenerDetalleAtencion(atencionId) {
  if (
    atencionId === undefined ||
    atencionId === null ||
    String(atencionId).trim() === ''
  ) {
    throw new Error('No se encontró la atención solicitada.');
  }

  try {
    const atencion = await consultarAtencionPorId(atencionId);

    if (!atencion || !atencion.atencion_id) {
      throw new Error('No se encontró la atención solicitada.');
    }

    return atencion;
  } catch (error) {
    const mensaje = String(error?.message ?? '').toLowerCase();

    if (
      mensaje.includes('no se encuentra disponible') ||
      mensaje.includes('no se encontró') ||
      mensaje.includes('no existe') ||
      mensaje.includes('no encontrada')
    ) {
      throw new Error('No se encontró la atención solicitada.');
    }

    throw new Error(
      'No se pudo cargar el detalle de la atención. Intente nuevamente.'
    );
  }
}

/**
 * RF24: listar las actividades de una atención.
 */
export async function listarActividadesDeAtencion(atencionId) {
  if (
    atencionId === undefined ||
    atencionId === null ||
    String(atencionId).trim() === ''
  ) {
    throw new Error('No se encontró la atención solicitada.');
  }

  try {
    const actividades =
      await consultarActividadesPorAtencion(atencionId);

    if (!Array.isArray(actividades)) {
      throw new Error('La respuesta de actividades no es válida.');
    }

    return actividades.filter(
      (actividad) => actividad?.eliminado !== true
    );
  } catch (error) {
    throw new Error(
      'No se pudo cargar toda la información de la atención. Intente nuevamente.'
    );
  }
}

/**
 * RF24: obtener la atención y sus actividades.
 *
 * CP01: devuelve los datos completos.
 * CP02: atención inexistente o no disponible.
 * CP03: falla o respuesta inválida al consultar actividades.
 * CP04: falla la consulta del detalle general.
 *
 * Una lista vacía de actividades es un resultado válido.
 */
export async function obtenerDetalleCompletoAtencion(atencionId) {
  const atencion = await obtenerDetalleAtencion(atencionId);
  const actividades = await listarActividadesDeAtencion(atencionId);

  return {
    atencion,
    actividades,
  };
}

/**
 * Consultar los datos clínicos de una actividad.
 */
export async function obtenerDatosConsulta(actividadId) {
  if (
    actividadId === undefined ||
    actividadId === null ||
    String(actividadId).trim() === ''
  ) {
    throw new Error(
      'No se indicó la actividad que desea consultar.'
    );
  }

  return consultarDatosConsulta(actividadId);
}

/**
 * Compatibilidad con componentes que usan crearAtencion(datos).
 *
 * Crea una atención una sola vez y guarda la consulta en la
 * actividad que se creó al iniciar la atención.
 */
export async function crearAtencion(datos) {
  if (
    !datos ||
    typeof datos.numero_historia !== 'string' ||
    datos.numero_historia.trim() === ''
  ) {
    throw new Error(
      'Complete los campos obligatorios para iniciar la atención.'
    );
  }

  const motivoConsulta =
    typeof datos.motivo_consulta === 'string'
      ? datos.motivo_consulta.trim()
      : typeof datos.motivo === 'string'
        ? datos.motivo.trim()
        : '';

  if (!motivoConsulta) {
    throw new Error('El motivo de consulta es obligatorio.');
  }

  const atencion = await confirmarAtencion(
    datos.numero_historia
  );

  await guardarConsulta(atencion.actividad_id, {
    ...datos,
    motivo_consulta: motivoConsulta,
  });

  return atencion;
}

/**
 * RF25: cambiar el estado de una actividad y comprobar
 * la finalización automática de su atención.
 *
 * La validación de estados, las transiciones permitidas,
 * el motivo de una actividad no realizada y la actualización
 * de la atención corresponden al DAO.
 */


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
/**
 * RF26: determinar si una atención está lista para finalizar.
 *
 * Se consulta al abrir el detalle.
 * Esta función solamente determina qué aviso mostrar:
 * NO finaliza la atención ni modifica registros.
 */

/**
 * RF26: determinar si una atención está lista para finalizar.
 *
 * Se consulta al abrir el detalle.
 * Esta función solamente determina qué aviso mostrar:
 * NO finaliza la atención ni modifica registros.
 */
export async function verificarEstadoActividadesAtencion(atencionId) {
  if (
    atencionId === undefined ||
    atencionId === null ||
    String(atencionId).trim() === ''
  ) {
    throw new Error('No se encontró la atención solicitada.');
  }

  let actividades;

  try {
    actividades = await consultarActividadesPorAtencion(atencionId);
  } catch (error) {
    logger.error(
      'RF26: no se pudo verificar el estado de las actividades:',
      error?.message ?? error
    );

    throw new Error(
      'No se pudo verificar el estado de las actividades.'
    );
  }

  if (!Array.isArray(actividades)) {
    throw new Error(
      'No se pudo verificar el estado de las actividades.'
    );
  }

  const vigentes = actividades.filter(
    (actividad) => actividad?.eliminado !== true
  );

  // CP04: la atención no tiene actividades registradas.
  if (vigentes.length === 0) {
    return {
      listaParaFinalizar: false,
      sinActividades: true,
      mensaje: 'Esta atención no tiene actividades registradas.',
      actividades: [],
    };
  }

  // RF26: Completada y No realizada son estados terminales.
  const estadosTerminales = ['Completada', 'No realizada'];

  const listaParaFinalizar = vigentes.every(
    (actividad) => estadosTerminales.includes(actividad?.estado)
  );

  return {
    listaParaFinalizar,
    sinActividades: false,
    mensaje: listaParaFinalizar
      ? 'La atención está lista para finalizar.'
      : null,
    actividades: vigentes,
  };
}
/**
 * RF51: programar una cita de atención veterinaria.
 */
export async function programarCita(datos) {
  return programarCitaServicio(datos);
}

/**
 * RF51: cancelar una cita de atención veterinaria.
 */
export async function cancelarCita(citaId) {
  return cancelarCitaServicio(citaId);
}