
/**
 * ============================================================
 * PETCARE - SERVICIO DE CITAS
 * RF51: Programar y cancelar citas de atención veterinaria.
 *
 * Responsabilidad:
 * - Validar los datos de programación.
 * - Verificar que la mascota esté activa.
 * - Verificar que la atención esté activa.
 * - Evitar citas duplicadas.
 * - Registrar citas individuales (compatibilidad RF51).
 * - Registrar citas agrupando varias actividades.
 * - Validar las condiciones para cancelar.
 *
 * El servicio no accede directamente a Supabase.
 * Todas las operaciones de persistencia se realizan mediante citasDAO.
 * ============================================================
 */

import * as citasDAO from '../../dao/dietaCita/citasDAO';

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

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
 * RF51 - Comprobar si la mascota está activa.
 */
function mascotaEstaActiva(mascota) {
  if (!mascota) {
    return false;
  }

  const estado = normalizar(mascota.estado);

  return estado === 'activo' || estado === 'activa';
}

// ============================================================
// RF51 - PROGRAMAR UNA CITA INDIVIDUAL
// ============================================================

/**
 * Se conserva para mantener compatibilidad con el flujo anterior.
 * Para asociar varias actividades se debe utilizar
 * programarCitaConActividades().
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

    if (!mascotaEstaActiva(mascota)) {
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

    // CP01: guardar la cita individual.
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
    console.error(
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

// ============================================================
// RF51 - PROGRAMAR UNA CITA CON VARIAS ACTIVIDADES
// ============================================================

/**
 * Recibe:
 * {
 *   atencion_id: 12,
 *   actividad_ids: [25, 26, 27],
 *   fecha_programada: '2026-11-28',
 *   hora_cita: '10:30',
 *   motivo_cita: 'Seguimiento veterinario',
 *   descripcion_cita: 'Actividades de seguimiento'
 * }
 *
 * La asociación de las actividades se ejecuta mediante una
 * única función PostgreSQL transaccional.
 */
export async function programarCitaConActividades(datos = {}) {
  try {
    const atencionId = Number(datos.atencion_id);

    const actividadIds = Array.isArray(datos.actividad_ids)
      ? datos.actividad_ids.map(Number)
      : [];

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

    // CP01: validar identificador de atención.
    if (
      !Number.isSafeInteger(atencionId) ||
      atencionId <= 0
    ) {
      return {
        ok: false,
        mensaje: 'Seleccione una atención válida.',
        data: null,
      };
    }

    // CP02: validar que existan actividades seleccionadas.
    if (actividadIds.length === 0) {
      return {
        ok: false,
        mensaje: 'Seleccione al menos una actividad.',
        data: null,
      };
    }

    // CP03: validar identificadores de actividades.
    if (
      actividadIds.some(
        (id) => !Number.isSafeInteger(id) || id <= 0
      )
    ) {
      return {
        ok: false,
        mensaje: 'La selección contiene actividades no válidas.',
        data: null,
      };
    }

    // CP04: impedir identificadores repetidos.
    if (new Set(actividadIds).size !== actividadIds.length) {
      return {
        ok: false,
        mensaje: 'No puede seleccionar una actividad más de una vez.',
        data: null,
      };
    }

    // CP05: validar campos obligatorios.
    if (!fechaProgramada || !horaCita || !motivoCita) {
      return {
        ok: false,
        mensaje: 'Complete la fecha, hora y motivo de la cita.',
        data: null,
      };
    }

    // CP06: validar fecha y hora futuras.
    if (!fechaHoraEsFutura(fechaProgramada, horaCita)) {
      return {
        ok: false,
        mensaje:
          'Seleccione una fecha y hora posteriores a la actual.',
        data: null,
      };
    }

    // CP07: consultar la atención seleccionada.
    const atencion = await citasDAO.obtenerAtencionPorId(
      atencionId
    );

    if (!atencion) {
      return {
        ok: false,
        mensaje: 'No se encontró la atención seleccionada.',
        data: null,
      };
    }

    if (atencion.estado !== 'Activa') {
      return {
        ok: false,
        mensaje:
          'No se pueden programar actividades en una atención finalizada.',
        data: null,
      };
    }

    // CP08: verificar que la mascota de la atención esté activa.
    const mascota = await citasDAO.buscarMascotaPorHistoria(
      atencion.numero_historia
    );

    if (!mascotaEstaActiva(mascota)) {
      return {
        ok: false,
        mensaje:
          'No se pueden programar citas para una mascota inactiva.',
        data: null,
      };
    }

    // CP09: ejecutar la operación transaccional.
    // PostgreSQL verifica la pertenencia de las actividades,
    // evita asociaciones vigentes duplicadas y registra la cita.
    const resultado = await citasDAO.insertarCitaConActividades({
      atencion_id: atencionId,
      actividad_ids: actividadIds,
      fecha_programada: fechaProgramada,
      hora_cita: horaCita,
      motivo_cita: motivoCita,
      descripcion_cita: descripcionCita,
    });

    return {
      ok: true,
      mensaje:
        resultado.mensaje ||
        'La cita y sus actividades se programaron correctamente.',
      data: resultado,
    };
  } catch (error) {
    console.error(
      'RF51 - Error en programarCitaConActividades:',
      error?.message ?? error
    );

    return {
      ok: false,
      mensaje:
        error?.message ||
        'No fue posible programar la cita con sus actividades.',
      data: null,
    };
  }
}

// ============================================================
// RF51 - CANCELAR UNA CITA
// ============================================================

/**
 * No permite cancelar:
 * - Una cita inexistente.
 * - Una cita que ya no está Programada.
 * - Una cita que ya tiene una atención iniciada.
 *
 * La cancelación activa el trigger PostgreSQL que libera
 * las relaciones vigentes de detalle_cita.
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

    // CP10: no cancelar si ya existe una atención vinculada.
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
    console.error(
      'RF51 - Error en cancelarCita:',
      error?.message ?? error
    );

    return {
      ok: false,
      mensaje:
        error?.message ||
        'No fue posible completar la operación. Intente nuevamente',
      data: null,
    };
  }
}

/**
 * ============================================================
 * SEGUIMIENTO:
 * CONSULTAR TODAS LAS CITAS DE UNA MASCOTA
 * ============================================================
 */
export async function obtenerCitasPorMascotaServicio(
  numeroHistoria
) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia) {
    throw new Error(
      'Seleccione una mascota para consultar sus citas.'
    );
  }

  try {
    const citas = await citasDAO.consultarCitasPorMascota(
      historia
    );

    return Array.isArray(citas) ? citas : [];
  } catch (error) {
    console.error(
      'Error en servicio de citas de seguimiento:',
      error
    );

    throw new Error(
      error?.message ||
      'No se pudieron consultar las citas de la mascota.'
    );
  }
}
/**
 * ============================================================
 * SEGUIMIENTO - ACTIVIDADES PENDIENTES DE PROGRAMACIÓN
 * ============================================================
 *
 * Consulta las actividades pendientes de una mascota que
 * todavía no tienen una relación vigente con una cita.
 */
export async function obtenerActividadesPendientesProgramacionServicio(
  numeroHistoria
) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia) {
    throw new Error(
      'Seleccione una mascota para consultar sus actividades pendientes.'
    );
  }

  try {
    const actividades =
      await citasDAO.consultarActividadesPendientesProgramacion(
        historia
      );

    return Array.isArray(actividades) ? actividades : [];
  } catch (error) {
    console.error(
      'Error consultando actividades pendientes de programación:',
      error
    );

    throw new Error(
      error?.message ||
      'No se pudieron consultar las actividades pendientes de programación.'
    );
  }
}
