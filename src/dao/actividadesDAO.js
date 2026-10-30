
/**
 * ============================================================
 * PETCARE — DAO DE ACTIVIDADES
 * ============================================================
 *
 * MVC:
 * - Vista: src/app/
 * - Controlador: src/controllers/
 * - Servicio: src/services/
 * - DAO: este archivo
 * - Persistencia: Supabase / PostgreSQL
 *
 * SOLID:
 * - SRP: centraliza las operaciones de persistencia.
 * - DIP: los controladores delegan las consultas y actualizaciones
 *   en este DAO.
 *
 * RF10: consultar actividades por estado.
 * RF24: consultar actividades de una atención.
 * RF25: cambiar el estado y finalizar automáticamente la atención.
 * RF26: comprobar si una atención está lista para finalizar.
 * RF29: registrar actividad.
 * RF43: suscripción a cambios en tiempo real.
 * RF53: registrar posología.
 *
 * IMPORTANTE:
 * - Una atención sin actividades no se finaliza automáticamente.
 * - Solo se finaliza si todas las actividades vigentes son terminales.
 * - Una atención ya finalizada no se modifica otra vez.
 * - Abrir el detalle de una atención no ejecuta su finalización.
 * ============================================================
 */

import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';

export const ESTADOS_ACTIVIDAD = [
  'Pendiente',
  'Completada',
  'No realizada',
];

export const ESTADOS_TERMINALES = [
  'Completada',
  'No realizada',
];

const ESTADOS_CONSULTABLES = [
  'Pendiente',
  'Completada',
  'No realizada',
];

const MENSAJE_ERROR_ACTIVIDADES =
  'No se pudieron consultar las actividades. Intente nuevamente.';

const MENSAJE_ERROR_ACTUALIZACION =
  'No se pudo actualizar la actividad. Intente nuevamente.';

/**
 * Normaliza texto para comparar valores sin depender de
 * mayúsculas, minúsculas o tildes.
 */
function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Valida que se haya recibido un identificador.
 */
function validarIdentificador(valor, mensaje) {
  if (
    valor === undefined ||
    valor === null ||
    String(valor).trim() === ''
  ) {
    throw new Error(mensaje);
  }
}

/**
 * Convierte una fecha a un valor numérico para ordenar.
 */
function obtenerTiempo(fecha) {
  if (!fecha) return 0;

  const tiempo = new Date(fecha).getTime();

  return Number.isNaN(tiempo) ? 0 : tiempo;
}

/**
 * RF10: consultar actividades por estado.
 *
 * Si estado es null, devuelve todas las actividades no eliminadas.
 * Los estados consultables son Pendiente, Completada y No realizada.
 */
export async function consultarActividadesPorEstado(estado = null) {
  if (
    estado !== null &&
    estado !== undefined &&
    estado !== '' &&
    !ESTADOS_CONSULTABLES.includes(estado)
  ) {
    throw new Error('El estado indicado no es válido.');
  }

  try {
    let consulta = supabase
      .from('actividades')
      .select('*')
      .eq('eliminado', false);

    if (estado) {
      consulta = consulta.eq('estado', estado);
    }

    consulta = consulta.order('fecha_registro', {
      ascending: false,
    });

    const { data, error } = await consulta;

    if (error) {
      logger.error(
        'RF10: error consultando actividades:',
        error.message
      );

      throw new Error(MENSAJE_ERROR_ACTIVIDADES);
    }

    return (data ?? [])
      .filter((actividad) => actividad?.eliminado !== true)
      .sort((a, b) => {
        const fechaA = obtenerTiempo(
          a.fecha_registro ?? a.fecha_prevista
        );

        const fechaB = obtenerTiempo(
          b.fecha_registro ?? b.fecha_prevista
        );

        return fechaB - fechaA;
      });
  } catch (error) {
    if (
      error?.message === 'El estado indicado no es válido.' ||
      error?.message === MENSAJE_ERROR_ACTIVIDADES
    ) {
      throw error;
    }

    logger.error(
      'RF10: error inesperado:',
      error?.message ?? error
    );

    throw new Error(MENSAJE_ERROR_ACTIVIDADES);
  }
}

/**
 * RF24: consultar actividades de una atención específica.
 *
 * El orden se aplica localmente para mantener compatibilidad
 * con los simuladores de Supabase de las pruebas.
 */
export async function consultarActividadesPorAtencion(atencionId) {
  validarIdentificador(
    atencionId,
    'No se indicó la atención que desea consultar.'
  );

  const { data, error } = await supabase
    .from('actividades')
    .select('*')
    .eq('atencion_id', atencionId)
    .eq('eliminado', false);

  if (error) {
    logger.error(
      'RF24: error consultando actividades de la atención:',
      error.message
    );

    throw new Error(
      'No se pudieron consultar las actividades de la atención. Intente nuevamente.'
    );
  }

  return (data ?? [])
    .filter((actividad) => actividad?.eliminado !== true)
    .sort((a, b) => {
      const fechaA = obtenerTiempo(
        a.fecha_prevista ?? a.fecha_registro
      );

      const fechaB = obtenerTiempo(
        b.fecha_prevista ?? b.fecha_registro
      );

      return fechaA - fechaB;
    });
}

/**
 * Comprueba si una mascota ya tiene una atención activa.
 */
export async function validarQueNoExistaActividadAbierta(
  numeroHistoria
) {
  validarIdentificador(
    numeroHistoria,
    'Debe indicar el número de historia de la mascota.'
  );

  const historia = String(numeroHistoria).trim().toUpperCase();

  const { data, error } = await supabase
    .from('atenciones')
    .select('atencion_id')
    .eq('numero_historia', historia)
    .eq('estado', 'Activa')
    .limit(1);

  if (error) {
    logger.error(
      'Error verificando atenciones activas:',
      error.message
    );

    throw new Error(
      'No se pudo verificar si la mascota tiene una atención activa. Intente nuevamente.'
    );
  }

  if (Array.isArray(data) && data.length > 0) {
    throw new Error(
      'La mascota ya tiene una atención activa. Finalice esa atención antes de registrar otra.'
    );
  }

  return true;
}

/**
 * RF26: comprueba si todas las actividades vigentes tienen
 * un estado terminal.
 *
 * No finaliza la atención ni modifica datos.
 */
export async function verificarAtencionListaParaFinalizar(
  atencionId
) {
  validarIdentificador(
    atencionId,
    'No se indicó la atención que desea verificar.'
  );

  const actividades =
    await consultarActividadesPorAtencion(atencionId);

  const lista = actividades.filter(
    (actividad) => actividad?.eliminado !== true
  );

  const listaParaFinalizar =
    lista.length > 0 &&
    lista.every((actividad) =>
      ESTADOS_TERMINALES.includes(actividad?.estado)
    );

  return {
    listaParaFinalizar,
    totalActividades: lista.length,
    pendientes: lista.filter(
      (actividad) => actividad.estado === 'Pendiente'
    ).length,
    completadas: lista.filter(
      (actividad) => actividad.estado === 'Completada'
    ).length,
    noRealizadas: lista.filter(
      (actividad) => actividad.estado === 'No realizada'
    ).length,
  };
}

/**
 * RF25: finaliza una atención si todas sus actividades vigentes
 * tienen un estado terminal y la atención continúa Activa.
 *
 * El orden de las validaciones importa:
 * 1. Comprueba si la atención existe.
 * 2. Si ya está finalizada, no la modifica.
 * 3. Comprueba las actividades vigentes.
 * 4. Actualiza la atención solo si corresponde.
 */
export async function finalizarAtencionSiCorresponde(atencionId) {
  validarIdentificador(
    atencionId,
    'No se indicó la atención que desea finalizar.'
  );

  const { data: atencion, error: errorAtencion } = await supabase
    .from('atenciones')
    .select('atencion_id, estado, fecha_fin')
    .eq('atencion_id', atencionId)
    .maybeSingle();

  if (errorAtencion) {
    logger.error(
      'RF25: error verificando la atención:',
      errorAtencion.message
    );

    throw new Error(
      'No se pudo verificar el estado de la atención. Intente nuevamente.'
    );
  }

  if (!atencion) {
    throw new Error('La atención solicitada no existe.');
  }

  // CP06: una atención ya finalizada no vuelve a actualizarse.
  if (atencion.estado === 'Finalizada') {
    return {
      finalizada: true,
      modificada: false,
      estado: 'Finalizada',
      fecha_fin: atencion.fecha_fin ?? null,
      totalActividades: 0,
      pendientes: 0,
      completadas: 0,
      noRealizadas: 0,
    };
  }

  if (atencion.estado !== 'Activa') {
    return {
      finalizada: false,
      modificada: false,
      estado: atencion.estado,
      totalActividades: 0,
      pendientes: 0,
      completadas: 0,
      noRealizadas: 0,
    };
  }

  const resultado =
    await verificarAtencionListaParaFinalizar(atencionId);

  if (!resultado.listaParaFinalizar) {
    return {
      finalizada: false,
      modificada: false,
      estado: 'Activa',
      ...resultado,
    };
  }

  let fechaFin;

  try {
    fechaFin = new Date().toISOString();
  } catch (error) {
    throw new Error(
      'No se pudo obtener la fecha y hora de finalización.'
    );
  }

  const {
    data: atencionActualizada,
    error: errorActualizacion,
  } = await supabase
    .from('atenciones')
    .update({
      estado: 'Finalizada',
      fecha_fin: fechaFin,
    })
    .eq('atencion_id', atencionId)
    .eq('estado', 'Activa')
    .select('atencion_id, estado, fecha_fin')
    .maybeSingle();

  if (errorActualizacion) {
    logger.error(
      'RF25: error finalizando atención:',
      errorActualizacion.message
    );

    throw new Error(
      'No se pudo finalizar la atención. Intente nuevamente.'
    );
  }

  if (!atencionActualizada) {
    return {
      finalizada: false,
      modificada: false,
      estado: 'Activa',
      ...resultado,
    };
  }

  return {
    finalizada: true,
    modificada: true,
    estado: atencionActualizada.estado ?? 'Finalizada',
    fecha_fin: atencionActualizada.fecha_fin ?? fechaFin,
    ...resultado,
  };
}

/**
 * RF25: actualiza el estado de una actividad y después comprueba
 * si corresponde finalizar automáticamente su atención.
 *
 * Reglas:
 * - Solo se modifican actividades Pendientes.
 * - La atención debe permanecer Activa.
 * - El nuevo estado debe ser Completada o No realizada.
 * - No realizada requiere un motivo.
 */
export async function actualizarEstadoActividad(
  actividadId,
  nuevoEstado,
  motivoNoRealizada = null
) {
  validarIdentificador(
    actividadId,
    'No se indicó la actividad que desea actualizar.'
  );

  if (!ESTADOS_TERMINALES.includes(nuevoEstado)) {
    throw new Error(
      'El nuevo estado de la actividad no es válido.'
    );
  }

  const motivo = String(motivoNoRealizada ?? '').trim();

  if (nuevoEstado === 'No realizada' && !motivo) {
    throw new Error(
      'Debes indicar el motivo por el que no se realizó la actividad.'
    );
  }

  const { data: actividad, error: errorActividad } = await supabase
    .from('actividades')
    .select('actividad_id, atencion_id, estado, eliminado')
    .eq('actividad_id', actividadId)
    .eq('eliminado', false)
    .maybeSingle();

  if (errorActividad) {
    logger.error(
      'RF25: error verificando actividad:',
      errorActividad.message
    );

    throw new Error(
      'No se pudo verificar la actividad. Intente nuevamente.'
    );
  }

  if (!actividad) {
    throw new Error(
      'La actividad no existe o ya no está disponible.'
    );
  }

  if (actividad.estado !== 'Pendiente') {
    throw new Error(
      'Solo se pueden modificar actividades pendientes.'
    );
  }

  const { data: atencion, error: errorEstadoAtencion } =
    await supabase
      .from('atenciones')
      .select('atencion_id, estado')
      .eq('atencion_id', actividad.atencion_id)
      .maybeSingle();

  if (errorEstadoAtencion) {
    logger.error(
      'RF25: error verificando estado de atención:',
      errorEstadoAtencion.message
    );

    throw new Error(
      'No se pudo verificar el estado de la atención. Intente nuevamente.'
    );
  }

  if (!atencion || atencion.estado !== 'Activa') {
    throw new Error(
      'No se pueden modificar actividades de una atención finalizada.'
    );
  }

  const datosActualizacion = {
    estado: nuevoEstado,
  };

  if (nuevoEstado === 'No realizada') {
    datosActualizacion.motivo_no_realizada = motivo;
  }

  const {
    data: actividadActualizada,
    error: errorActualizacion,
  } = await supabase
    .from('actividades')
    .update(datosActualizacion)
    .eq('actividad_id', actividadId)
    .eq('estado', 'Pendiente')
    .eq('eliminado', false)
    .select('*')
    .maybeSingle();

  if (errorActualizacion) {
    logger.error(
      'RF25: error actualizando actividad:',
      errorActualizacion.message
    );

    throw new Error(MENSAJE_ERROR_ACTUALIZACION);
  }

  if (!actividadActualizada) {
    throw new Error(
      'La actividad cambió mientras se procesaba la solicitud. Actualiza la pantalla e inténtalo nuevamente.'
    );
  }

  let resultadoFinalizacion;

  try {
    resultadoFinalizacion =
      await finalizarAtencionSiCorresponde(actividad.atencion_id);
  } catch (error) {
    logger.error(
      'RF25: la actividad se actualizó, pero no se pudo comprobar el cierre:',
      error?.message ?? error
    );

    throw new Error(
      'La actividad se actualizó, pero no se pudo verificar si la atención debe finalizar. Actualiza el detalle e inténtalo nuevamente.'
    );
  }

  return {
    ...actividadActualizada,
    resultadoFinalizacion,
  };
}

/**
 * Alias de compatibilidad para controladores que utilicen
 * el nombre consultarEstadoActividad.
 */
export async function consultarEstadoActividad(actividadId) {
  validarIdentificador(
    actividadId,
    'No se indicó la actividad que desea consultar.'
  );

  const { data, error } = await supabase
    .from('actividades')
    .select('actividad_id, atencion_id, estado, eliminado')
    .eq('actividad_id', actividadId)
    .eq('eliminado', false)
    .maybeSingle();

  if (error) {
    logger.error(
      'Error consultando estado de actividad:',
      error.message
    );

    throw new Error(
      'No se pudo consultar el estado de la actividad.'
    );
  }

  if (!data) {
    throw new Error(
      'La actividad no existe o ya no está disponible.'
    );
  }

  return data;
}

/**
 * RF29: registrar una nueva actividad y sus datos específicos.
 */
export async function registrarActividad(datos) {
  if (!datos || typeof datos !== 'object') {
    throw new Error('Debes proporcionar los datos de la actividad.');
  }

  validarIdentificador(
    datos.atencion_id,
    'Debes seleccionar una atención.'
  );

  validarIdentificador(
    datos.tipo_id,
    'Debes seleccionar el tipo de actividad.'
  );

  const registro = {
    atencion_id: datos.atencion_id,
    tipo_id: datos.tipo_id,
    tipo: datos.tipo,
    fecha_prevista: datos.fecha_prevista,
    observaciones: String(datos.observaciones ?? '').trim(),
    estado: 'Pendiente',
    eliminado: false,
    detalle: datos.detalle ?? {},
  };

  const { data, error } = await supabase
    .from('actividades')
    .insert(registro)
    .select()
    .single();

  if (error) {
    logger.error('Error al registrar actividad:', error);
    throw error;
  }

  return data;
}

/**
 * ============================================================
 * RF53: REGISTRAR POSOLOGÍA
 * ============================================================
 *
 * Registra una actividad de medicación y todos sus medicamentos
 * mediante una función PostgreSQL transaccional.
 *
 * La duración y condición de ingesta se almacenan en detalle
 * (JSONB) de la actividad.
 */
export async function registrarPosologiaActividad(datos) {
  if (!datos || typeof datos !== 'object') {
    throw new Error('Debes proporcionar los datos de la posología.');
  }

  validarIdentificador(
    datos.atencion_id,
    'Debes seleccionar una atención.'
  );

  validarIdentificador(
    datos.tipo_id,
    'Debes seleccionar el tipo de actividad.'
  );

  if (
    !Array.isArray(datos.medicamentos) ||
    datos.medicamentos.length === 0
  ) {
    throw new Error('Seleccione un medicamento');
  }

  const medicamentos = datos.medicamentos.map((medicamento) => ({
    medicamento_id: medicamento.medicamento_id,
    dosis: String(medicamento.dosis ?? '').trim(),
    frecuencia: String(medicamento.frecuencia ?? '').trim(),
    via_administracion: String(
      medicamento.via_administracion ?? ''
    ).trim(),
  }));

  const medicamentoIds = medicamentos.map(
    (medicamento) => String(medicamento.medicamento_id ?? '')
  );

  if (new Set(medicamentoIds).size !== medicamentoIds.length) {
    throw new Error(
      'Este medicamento ya fue agregado a la actividad'
    );
  }

  const { data, error } = await supabase.rpc(
    'registrar_posologia_actividad',
    {
      p_atencion_id: datos.atencion_id,
      p_tipo_id: datos.tipo_id,
      p_fecha_prevista: datos.fecha_prevista,
      p_observaciones: String(datos.observaciones ?? '').trim(),
      p_detalle: {
        ...(datos.detalle ?? {}),
        duracion: datos.duracion,
        condicion_ingesta: datos.condicion_ingesta,
      },
      p_medicamentos: medicamentos,
    }
  );

  if (error) {
    logger.error('RF53: error registrando posología:', error);
    throw error;
  }

  return data;
}

/**
 * ============================================================
 * RF43: SUSCRIPCIÓN A CAMBIOS EN TIEMPO REAL
 * ============================================================
 *
 * Escucha cambios en:
 * - actividades: INSERT, UPDATE y DELETE.
 * - atenciones: INSERT, UPDATE y DELETE.
 *
 * Devuelve:
 * - channel: canal Realtime de Supabase.
 * - ready: promesa que confirma la conexión.
 *
 * Para identificar correctamente los DELETE se requiere
 * REPLICA IDENTITY FULL en ambas tablas.
 */

/**
 * RF43: crear una suscripción Realtime para una atención.
 *
 * @param {number|string} atencionId
 * @param {Function} callback
 * @returns {{ channel: Object, ready: Promise }}
 */
export function suscribirCambiosAtencion(
  atencionId,
  callback
) {
  validarIdentificador(
    atencionId,
    'Debe indicar una atención válida para activar el seguimiento.'
  );

  if (typeof callback !== 'function') {
    throw new Error(
      'Debe proporcionar una función para recibir las actualizaciones.'
    );
  }

  const identificador = String(atencionId).trim();

  const canal = supabase.channel(
    `seguimiento-atencion-${identificador}`
  );

  /**
   * Entrega el evento al servicio RF43.
   */
  function procesarEvento(payload, tabla, tipoEvento) {
    try {
      callback({
        ...payload,
        table: tabla,
        eventType: tipoEvento,
      });
    } catch (error) {
      logger.error(
        `RF43: error procesando evento ${tipoEvento} de ${tabla}:`,
        error
      );
    }
  }

  // ACTIVIDADES: INSERT.
  canal.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'actividades',
      filter: `atencion_id=eq.${identificador}`,
    },
    (payload) => {
      procesarEvento(payload, 'actividades', 'INSERT');
    }
  );

  // ACTIVIDADES: UPDATE.
  canal.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'actividades',
      filter: `atencion_id=eq.${identificador}`,
    },
    (payload) => {
      procesarEvento(payload, 'actividades', 'UPDATE');
    }
  );

  // ACTIVIDADES: DELETE.
  // Se filtra localmente porque Postgres Changes no admite
  // el filtro habitual para eventos DELETE.
  canal.on(
    'postgres_changes',
    {
      event: 'DELETE',
      schema: 'public',
      table: 'actividades',
    },
    (payload) => {
      const registro = payload?.old;

      if (
        String(registro?.atencion_id) === identificador
      ) {
        procesarEvento(payload, 'actividades', 'DELETE');
      }
    }
  );

  // ATENCIONES: INSERT.
  canal.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'atenciones',
      filter: `atencion_id=eq.${identificador}`,
    },
    (payload) => {
      procesarEvento(payload, 'atenciones', 'INSERT');
    }
  );

  // ATENCIONES: UPDATE.
  canal.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'atenciones',
      filter: `atencion_id=eq.${identificador}`,
    },
    (payload) => {
      procesarEvento(payload, 'atenciones', 'UPDATE');
    }
  );

  // ATENCIONES: DELETE.
  canal.on(
    'postgres_changes',
    {
      event: 'DELETE',
      schema: 'public',
      table: 'atenciones',
    },
    (payload) => {
      const registro = payload?.old;

      if (
        String(registro?.atencion_id) === identificador
      ) {
        procesarEvento(payload, 'atenciones', 'DELETE');
      }
    }
  );

  // Confirmación de conexión Realtime.
  let resolverReady;
  let rechazarReady;
  let conexionFinalizada = false;

  const ready = new Promise((resolve, reject) => {
    resolverReady = resolve;
    rechazarReady = reject;
  });

  canal.subscribe((estado, error) => {
    if (
      estado === 'SUBSCRIBED' &&
      !conexionFinalizada
    ) {
      conexionFinalizada = true;

      logger.info(
        `RF43: Realtime activo para atención ${identificador}.`
      );

      resolverReady(true);
      return;
    }

    if (
      ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(estado) &&
      !conexionFinalizada
    ) {
      conexionFinalizada = true;

      logger.error(
        'RF43: no se pudo establecer la conexión:',
        error || estado
      );

      rechazarReady(
        error ||
          new Error(
            `No se pudo establecer Realtime: ${estado}`
          )
      );
    }
  });

  return {
    channel: canal,
    ready,
  };
}

/**
 * RF43: cancelar la suscripción de una atención.
 *
 * Acepta el objeto { channel, ready } y también un canal
 * directo por compatibilidad.
 */
export async function cancelarSuscripcionAtencion(
  suscripcion
) {
  if (!suscripcion) {
    return false;
  }

  const canal = suscripcion.channel || suscripcion;

  try {
    const resultado = await supabase.removeChannel(canal);

    return resultado;
  } catch (error) {
    logger.error(
      'RF43: error cancelando la suscripción:',
      error
    );

    throw new Error(
      'No se pudo cerrar la suscripción de seguimiento.'
    );
  }
}

/**
 * ============================================================
 * RF11: CONSULTAR ACTIVIDADES PRÓXIMAS A VENCER
 * ============================================================
 *
 * Consulta actividades:
 * - No eliminadas.
 * - Con estado Pendiente.
 * - Con fecha prevista entre la fecha actual y el límite recibido.
 *
 * La regla de las 24 horas se calcula en el servicio.
 */
export async function consultarActividadesProximasAVencer(
  fechaActual,
  fechaLimite
) {
  if (!fechaActual || !fechaLimite) {
    throw new Error(
      'Debe proporcionar el rango de fechas para consultar los avisos.'
    );
  }

  const { data, error } = await supabase
    .from('actividades')
    .select('*')
    .eq('eliminado', false)
    .eq('estado', 'Pendiente')
    .gte('fecha_prevista', fechaActual)
    .lte('fecha_prevista', fechaLimite)
    .order('fecha_prevista', {
      ascending: true,
    });

  if (error) {
    logger.error(
      'RF11: error consultando actividades próximas a vencer:',
      error.message
    );

    throw new Error(
      'No se pudo verificar el vencimiento de la actividad'
    );
  }

  return Array.isArray(data) ? data : [];
}

