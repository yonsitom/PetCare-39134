/**
 * PETCARE - SERVICIO DE CITAS
 * RF51: Programar y cancelar citas de atención veterinaria.
 *
 * Responsabilidad:
 * - Validar los datos de programación.
 * - Verificar que la mascota esté activa.
 * - Evitar citas duplicadas.
 * - Registrar citas.
 * - Validar las condiciones para cancelar.
 *
 * El servicio no accede directamente a Supabase.
 * Todas las operaciones de persistencia se realizan mediante citasDAO.
 */

import * as citasDAO from '../dao/citasDAO';
import { logger } from '../utils/logger';

function normalizar(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizarHistoria(valor) {
  return String(valor ?? '').trim().toUpperCase();
}

/**
 * Comprueba que la fecha tenga formato YYYY-MM-DD
 * y que corresponda a una fecha real.
 */
function fechaValida(fecha) {
  if (
    typeof fecha !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
  ) {
    return false;
  }

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaComprobacion = new Date(anio, mes - 1, dia);

  return (
    fechaComprobacion.getFullYear() === anio &&
    fechaComprobacion.getMonth() === mes - 1 &&
    fechaComprobacion.getDate() === dia
  );
}

/**
 * Comprueba que la hora tenga formato HH:mm o HH:mm:ss.
 */
function horaValida(hora) {
  if (typeof hora !== 'string') {
    return false;
  }

  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(hora);
}

/**
 * Comprueba que la fecha y hora sean posteriores al momento actual.
 * Se utiliza la hora local del dispositivo.
 */
function fechaHoraEsFutura(fecha, hora) {
  if (!fechaValida(fecha) || !horaValida(hora)) {
    return false;
  }

  const horaNormalizada =
    hora.length === 5 ? `${hora}:00` : hora;

  const fechaHoraCita = new Date(
    `${fecha}T${horaNormalizada}`
  );

  if (Number.isNaN(fechaHoraCita.getTime())) {
    return false;
  }

  return fechaHoraCita.getTime() > Date.now();
}

/**
 * RF51 - Programar una cita.
 *
 * Resultado exitoso:
 * {
 *   ok: true,
 *   mensaje: 'La cita se programó correctamente.',
 *   data: cita
 * }
 *
 * Resultado no exitoso:
 * {
 *   ok: false,
 *   mensaje: '...',
 *   data: null
 * }
 */
export async function programarCita(datos = {}) {
  try {
    const numeroHistoria = normalizarHistoria(
      datos.numero_historia
    );

    const fechaProgramada = String(
      datos.fecha_programada ?? ''
    ).trim();

    const horaCita = String(
      datos.hora_cita ?? ''
    ).trim();

    const motivoCita = String(
      datos.motivo_cita ?? ''
    ).trim();

    const descripcionCita = String(
      datos.descripcion_cita ?? ''
    ).trim();

    // CP02: validar campos obligatorios.
    if (
      !numeroHistoria ||
      !fechaProgramada ||
      !horaCita ||
      !motivoCita
    ) {
      return {
        ok: false,
        mensaje: 'Complete los campos obligatorios',
        data: null,
      };
    }

    // CP03: validar fecha y hora futuras.
    if (!fechaHoraEsFutura(fechaProgramada, horaCita)) {
      return {
        ok: false,
        mensaje:
          'Seleccione una fecha y hora posteriores a la actual',
        data: null,
      };
    }

    // CP05: verificar que la mascota exista y esté activa.
    const mascota = await citasDAO.buscarMascotaPorHistoria(
      numeroHistoria
    );

    if (!mascota) {
      return {
        ok: false,
        mensaje:
          'No se puede programar una cita para una mascota inactiva',
        data: null,
      };
    }

    const estadoMascota = normalizar(mascota.estado);

    if (
      estadoMascota !== 'activo' &&
      estadoMascota !== 'activa'
    ) {
      return {
        ok: false,
        mensaje:
          'No se puede programar una cita para una mascota inactiva',
        data: null,
      };
    }

    // CP04: comprobar que no exista otra cita en el mismo horario.
    const citaDuplicada = await citasDAO.buscarCitaDuplicada(
      numeroHistoria,
      fechaProgramada,
      horaCita
    );

    if (citaDuplicada) {
      return {
        ok: false,
        mensaje:
          'La mascota ya tiene una cita programada en ese horario',
        data: null,
      };
    }

    // CP01: guardar la cita.
    const cita = await citasDAO.insertarCita({
      numero_historia: numeroHistoria,
      fecha_programada: fechaProgramada,
      hora_cita: horaCita,
      motivo_cita: motivoCita,
      descripcion_cita: descripcionCita,
      estado: 'Programada',
    });

    if (!cita || !cita.cita_id) {
      throw new Error('No se recibió la cita registrada.');
    }

    return {
      ok: true,
      mensaje: 'La cita se programó correctamente.',
      data: cita,
    };
  } catch (error) {
    logger.error(
      'RF51 - Error en programarCita:',
      error?.message ?? error
    );

    return {
      ok: false,
      mensaje:
        'No fue posible completar la operación. Intente nuevamente',
      data: null,
    };
  }
}

/**
 * RF51 - Cancelar una cita.
 *
 * No permite cancelar:
 * - Una cita inexistente.
 * - Una cita que ya no está Programada.
 * - Una cita que ya tiene una atención iniciada.
 *
 * La confirmación visual "¿Deseas cancelar esta cita?"
 * corresponde a la interfaz, antes de llamar a este servicio.
 */
export async function cancelarCita(citaId) {
  try {
    if (
      citaId === undefined ||
      citaId === null ||
      String(citaId).trim() === ''
    ) {
      return {
        ok: false,
        mensaje: 'Seleccione una cita para cancelar.',
        data: null,
      };
    }

    const cita = await citasDAO.obtenerCitaPorId(citaId);

    if (!cita) {
      return {
        ok: false,
        mensaje: 'No se encontró la cita seleccionada.',
        data: null,
      };
    }

    if (cita.estado !== 'Programada') {
      return {
        ok: false,
        mensaje: 'La cita seleccionada no se puede cancelar.',
        data: null,
      };
    }

    // CP06: no cancelar si ya existe una atención vinculada.
    const atencion = await citasDAO.obtenerAtencionPorCita(
      citaId
    );

    if (atencion) {
      return {
        ok: false,
        mensaje:
          'No se puede cancelar una cita cuya atención ya se inició.',
        data: null,
      };
    }

    const citaActualizada =
      await citasDAO.actualizarEstadoCita(
        citaId,
        'Cancelada'
      );

    if (
      !citaActualizada ||
      citaActualizada.estado !== 'Cancelada'
    ) {
      throw new Error('No se pudo actualizar el estado de la cita.');
    }

    return {
      ok: true,
      mensaje: 'La cita se canceló correctamente.',
      data: citaActualizada,
    };
  } catch (error) {
    logger.error(
      'RF51 - Error en cancelarCita:',
      error?.message ?? error
    );

    return {
      ok: false,
      mensaje:
        'No fue posible completar la operación. Intente nuevamente',
      data: null,
    };
  }
}