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
 *
 * IMPORTANTE:
 * - Una atención sin actividades no se finaliza automáticamente.
 * - Solo se finaliza si todas las actividades vigentes son terminales.
 * - Una atención ya finalizada no se modifica otra vez.
 * - Abrir el detalle de una atención no ejecuta su finalización.
 * ============================================================
 */

import { supabase } from '../services/supabase';

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
      console.error(
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

    console.error(
      'RF10: error inesperado:',
      error?.message ?? error
    );

    throw new Error(MENSAJE_ERROR_ACTIVIDADES);
  }
}

/**
 * RF24: consultar actividades de una atención específica.
 *
 * No se usa .order() en esta consulta para mantener compatibilidad
 * con los simuladores de Supabase de las pruebas.
 * El orden se aplica localmente.
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
    console.error(
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
    console.error(
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

  // Primero comprobar el estado actual de la atención.
  const { data: atencion, error: errorAtencion } = await supabase
    .from('atenciones')
    .select('atencion_id, estado, fecha_fin')
    .eq('atencion_id', atencionId)
    .maybeSingle();

  if (errorAtencion) {
    console.error(
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

  // Una atención que no está Activa no se debe finalizar aquí.
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

  // CP03, CP04 y CP05: no finalizar si hay actividades abiertas
  // o si no hay ninguna actividad vigente.
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

  const { data: atencionActualizada, error: errorActualizacion } =
    await supabase
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
    console.error(
      'RF25: error finalizando atención:',
      errorActualizacion.message
    );

    throw new Error(
      'No se pudo finalizar la atención. Intente nuevamente.'
    );
  }

  // Evita afirmar que se actualizó si la condición estado = Activa
  // ya no coincidía al momento de ejecutar la actualización.
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
    console.error(
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
    console.error(
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
    console.error(
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
    console.error(
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
    console.error(
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
 * RF29: registrar una nueva actividad.
 */
export async function registrarActividad(datos) {
  if (!datos || typeof datos !== 'object') {
    throw new Error('Debes proporcionar los datos de la actividad.');
  }

  const registro = {
    atencion_id: datos.atencion_id,
    tipo_id: datos.tipo_id,
    fecha_prevista: datos.fecha_prevista,
    observaciones: String(datos.observaciones ?? '').trim(),
    estado: 'Pendiente',
    eliminado: false,
  };

  const { data, error } = await supabase
    .from('actividades')
    .insert(registro)
    .select()
    .single();

  if (error) {
    console.error('RF29: error al registrar actividad:', error);
    throw error;
  }

  return data;
}
