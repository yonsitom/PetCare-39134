
/**
 * ============================================================
 * PETCARE - DAO DE CITAS
 * RF51: Programar y cancelar citas de atención veterinaria.
 * RF08: Consultar próximas citas con sus actividades asociadas.
 *
 * Responsabilidad:
 * - Consultar mascotas y atenciones.
 * - Verificar citas duplicadas.
 * - Registrar citas individuales.
 * - Registrar citas con varias actividades mediante RPC.
 * - Consultar citas y atenciones relacionadas.
 * - Consultar próximas citas con actividades vigentes.
 * - Actualizar el estado de una cita.
 *
 * Persistencia: Supabase / PostgreSQL.
 * ============================================================
 */

import { supabase } from '../../services/supabase';

function normalizarHistoria(valor) {
  return String(valor ?? '').trim().toUpperCase();
}

/**
 * RF51 - Consultar mascota por número de historia.
 */
export async function buscarMascotaPorHistoria(numeroHistoria) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia) {
    throw new Error('Debe indicar el número de historia de la mascota.');
  }

  const { data, error } = await supabase
    .from('mascotas')
    .select('numero_historia, nombre, estado')
    .eq('numero_historia', historia)
    .maybeSingle();

  if (error) {
    console.error('RF51 - Error consultando mascota:', error.message);
    throw error;
  }

  return data ?? null;
}

/**
 * RF51 - Consultar una atención por su identificador.
 */
export async function obtenerAtencionPorId(atencionId) {
  if (
    atencionId === undefined ||
    atencionId === null ||
    String(atencionId).trim() === ''
  ) {
    throw new Error('Debe indicar la atención que desea consultar.');
  }

  const { data, error } = await supabase
    .from('atenciones')
    .select(`
      atencion_id,
      numero_historia,
      estado,
      fecha_inicio,
      fecha_fin
    `)
    .eq('atencion_id', atencionId)
    .maybeSingle();

  if (error) {
    console.error('RF51 - Error consultando atención:', error.message);
    throw error;
  }

  return data ?? null;
}

/**
 * RF51 - Buscar una cita duplicada para la misma mascota,
 * fecha y hora.
 */
export async function buscarCitaDuplicada(
  numeroHistoria,
  fechaProgramada,
  horaCita
) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia || !fechaProgramada || !horaCita) {
    throw new Error('Los datos para verificar la cita están incompletos.');
  }

  const { data, error } = await supabase
    .from('citas')
    .select(`
      cita_id,
      numero_historia,
      fecha_programada,
      hora_cita,
      estado
    `)
    .eq('numero_historia', historia)
    .eq('fecha_programada', fechaProgramada)
    .eq('hora_cita', horaCita)
    .in('estado', ['Programada', 'Confirmada'])
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('RF51 - Error verificando cita duplicada:', error.message);
    throw error;
  }

  return data ?? null;
}

/**
 * RF51 - Registrar una cita individual.
 *
 * Se conserva para mantener compatibilidad con el flujo anterior.
 */
export async function insertarCita(datos) {
  if (!datos || typeof datos !== 'object') {
    throw new Error('No se recibieron los datos de la cita.');
  }

  const registro = {
    numero_historia: normalizarHistoria(datos.numero_historia),
    fecha_programada: datos.fecha_programada,
    hora_cita: datos.hora_cita,
    estado: 'Programada',
    motivo_cita: String(datos.motivo_cita ?? '').trim(),
    descripcion_cita:
      String(datos.descripcion_cita ?? '').trim() || null,
  };

  const { data, error } = await supabase
    .from('citas')
    .insert(registro)
    .select(`
      cita_id,
      numero_historia,
      fecha_programada,
      hora_cita,
      estado,
      fecha_registro,
      motivo_cita,
      descripcion_cita
    `)
    .single();

  if (error) {
    console.error('RF51 - Error registrando cita:', error.message);
    throw error;
  }

  return data;
}

/**
 * RF51 - Registrar una cita y asociar varias actividades
 * en una única transacción PostgreSQL.
 */
export async function insertarCitaConActividades(datos) {
  if (!datos || typeof datos !== 'object') {
    throw new Error('No se recibieron los datos de programación.');
  }

  if (!Array.isArray(datos.actividad_ids) || datos.actividad_ids.length === 0) {
    throw new Error('Debe seleccionar al menos una actividad.');
  }

  const parametros = {
    p_atencion_id: Number(datos.atencion_id),
    p_actividad_ids: datos.actividad_ids.map(Number),
    p_fecha_programada: datos.fecha_programada,
    p_hora_cita: datos.hora_cita,
    p_motivo_cita: String(datos.motivo_cita ?? '').trim(),
    p_descripcion_cita:
      String(datos.descripcion_cita ?? '').trim() || null,
  };

  const { data, error } = await supabase.rpc(
    'programar_cita_con_actividades',
    parametros
  );

  if (error) {
    console.error(
      'RF51 - Error registrando cita con actividades:',
      error.message
    );

    throw error;
  }

  if (!data || data.ok !== true) {
    throw new Error(
      data?.mensaje || 'No se pudo registrar la cita con sus actividades.'
    );
  }

  return data;
}

/**
 * RF08 - Consultar próximas citas con sus actividades.
 *
 * Relación confirmada:
 * citas.cita_id
 *   -> detalle_cita.cita_id
 *   -> detalle_cita.actividad_id
 *   -> actividades.actividad_id
 *
 * La mascota se obtiene mediante:
 * citas.numero_historia -> mascotas.numero_historia
 *
 * Solo se incluyen:
 * - Citas Programadas o Confirmadas.
 * - Relaciones Vigentes.
 * - Actividades Pendientes.
 * - Actividades no eliminadas.
 *
 * Es una consulta de solo lectura.
 */
export async function consultarProximasCitasConActividades(
  fechaInicio,
  fechaFin
) {
  if (!fechaInicio || !fechaFin) {
    throw new Error('Debe indicar el rango de fechas de las próximas citas.');
  }

  if (fechaInicio > fechaFin) {
    throw new Error('El rango de fechas de las próximas citas no es válido.');
  }

  const { data: citas, error: errorCitas } = await supabase
    .from('citas')
    .select(`
      cita_id,
      numero_historia,
      fecha_programada,
      hora_cita,
      estado,
      motivo_cita,
      descripcion_cita,
      mascota:mascotas (
        numero_historia,
        nombre,
        especie,
        raza
      )
    `)
    .gte('fecha_programada', fechaInicio)
    .lte('fecha_programada', fechaFin)
    .in('estado', ['Programada', 'Confirmada'])
    .order('fecha_programada', { ascending: true })
    .order('hora_cita', { ascending: true });

  if (errorCitas) {
    console.error(
      'RF08 - Error consultando próximas citas:',
      errorCitas.message
    );
    throw errorCitas;
  }

  if (!Array.isArray(citas) || citas.length === 0) {
    return [];
  }

  const idsCitas = citas.map((cita) => cita.cita_id);

  const { data: detalles, error: errorDetalles } = await supabase
    .from('detalle_cita')
    .select(`
      detalle_cita_id,
      cita_id,
      actividad_id,
      estado_relacion,
      actividad:actividades (
        actividad_id,
        atencion_id,
        tipo,
        estado,
        fecha_prevista,
        eliminado
      )
    `)
    .in('cita_id', idsCitas)
    .eq('estado_relacion', 'Vigente')
    .eq('actividad.eliminado', false)
    .eq('actividad.estado', 'Pendiente');

  if (errorDetalles) {
    console.error(
      'RF08 - Error consultando actividades de las citas:',
      errorDetalles.message
    );
    throw errorDetalles;
  }

  const actividadesPorCita = new Map();

  (detalles ?? []).forEach((detalle) => {
    const actividad = detalle.actividad;

    if (
      !actividad ||
      actividad.eliminado === true ||
      actividad.estado !== 'Pendiente'
    ) {
      return;
    }

    const lista = actividadesPorCita.get(detalle.cita_id) ?? [];

    lista.push({
      ...actividad,
      detalle_cita_id: detalle.detalle_cita_id,
      estado_relacion: detalle.estado_relacion,
    });

    actividadesPorCita.set(detalle.cita_id, lista);
  });

  /*
   * Se muestran únicamente las citas que tienen al menos
   * una actividad pendiente vinculada mediante una relación vigente.
   */
  return citas
    .map((cita) => ({
      ...cita,
      mascota: cita.mascota ?? null,
      actividades: actividadesPorCita.get(cita.cita_id) ?? [],
    }))
    .filter((cita) => cita.actividades.length > 0);
}

/**
 * RF51 - Consultar una cita por su identificador.
 */
export async function obtenerCitaPorId(citaId) {
  if (
    citaId === undefined ||
    citaId === null ||
    String(citaId).trim() === ''
  ) {
    throw new Error('Debe indicar la cita que desea consultar.');
  }

  const { data, error } = await supabase
    .from('citas')
    .select(`
      cita_id,
      numero_historia,
      fecha_programada,
      hora_cita,
      estado,
      fecha_registro,
      motivo_cita,
      descripcion_cita
    `)
    .eq('cita_id', citaId)
    .maybeSingle();

  if (error) {
    console.error('RF51 - Error consultando cita:', error.message);
    throw error;
  }

  return data ?? null;
}

/**
 * RF51 - Comprobar si una cita ya tiene una atención asociada.
 *
 * Se conserva la relación atenciones.cita_id para compatibilidad.
 */
export async function obtenerAtencionPorCita(citaId) {
  if (
    citaId === undefined ||
    citaId === null ||
    String(citaId).trim() === ''
  ) {
    throw new Error('Debe indicar la cita que desea verificar.');
  }

  const { data, error } = await supabase
    .from('atenciones')
    .select(`
      atencion_id,
      cita_id,
      numero_historia,
      estado,
      fecha_inicio,
      fecha_fin
    `)
    .eq('cita_id', citaId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      'RF51 - Error verificando atención de la cita:',
      error.message
    );
    throw error;
  }

  return data ?? null;
}

/**
 * RF51 - Actualizar el estado de una cita.
 */
export async function actualizarEstadoCita(citaId, nuevoEstado) {
  if (
    citaId === undefined ||
    citaId === null ||
    String(citaId).trim() === ''
  ) {
    throw new Error('Debe indicar la cita que desea actualizar.');
  }

  if (!['Programada', 'Cancelada'].includes(nuevoEstado)) {
    throw new Error('El estado indicado para la cita no es válido.');
  }

  const { data, error } = await supabase
    .from('citas')
    .update({ estado: nuevoEstado })
    .eq('cita_id', citaId)
    .select(`
      cita_id,
      numero_historia,
      fecha_programada,
      hora_cita,
      estado,
      fecha_registro,
      motivo_cita,
      descripcion_cita
    `)
    .single();

  if (error) {
    console.error(
      'RF51 - Error actualizando estado de cita:',
      error.message
    );
    throw error;
  }

  return data;
}

/**
 * ============================================================
 * RF20 / SEGUIMIENTO:
 * CONSULTAR TODAS LAS CITAS DE UNA MASCOTA
 * ============================================================
 *
 * Incluye:
 * - Citas programadas.
 * - Citas confirmadas.
 * - Citas canceladas.
 * - Citas pasadas.
 * - Actividades asociadas mediante detalle_cita.
 *
 * No filtra por estado_relacion para conservar
 * la trazabilidad de las citas canceladas.
 */
function primeraRelacionSeguimiento(valor) {
  return Array.isArray(valor)
    ? valor[0] ?? null
    : valor ?? null;
}

export async function consultarCitasPorMascota(numeroHistoria) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia) {
    throw new Error(
      'Debe indicar el número de historia de la mascota.'
    );
  }

  const { data: citas, error: errorCitas } = await supabase
    .from('citas')
    .select(`
      cita_id,
      numero_historia,
      fecha_programada,
      hora_cita,
      estado,
      fecha_registro,
      motivo_cita,
      descripcion_cita
    `)
    .eq('numero_historia', historia)
    .order('fecha_programada', { ascending: false })
    .order('hora_cita', { ascending: false });

  if (errorCitas) {
    console.error(
      'Seguimiento: error consultando citas:',
      errorCitas.message
    );

    throw new Error(
      'No se pudieron consultar las citas de la mascota.'
    );
  }

  if (!Array.isArray(citas) || citas.length === 0) {
    return [];
  }

  const idsCitas = citas.map((cita) => cita.cita_id);

  const { data: detalles, error: errorDetalles } = await supabase
    .from('detalle_cita')
    .select(`
      detalle_cita_id,
      cita_id,
      actividad_id,
      estado_relacion,
      actividad:actividades (
        actividad_id,
        atencion_id,
        tipo,
        estado,
        fecha_prevista,
        fecha_inicio,
        fecha_fin,
        fecha_registro,
        observaciones,
        motivo_no_realizada,
        eliminado
      )
    `)
    .in('cita_id', idsCitas);

  if (errorDetalles) {
    console.error(
      'Seguimiento: error consultando actividades de citas:',
      errorDetalles.message
    );

    throw new Error(
      'No se pudieron consultar las actividades asociadas a las citas.'
    );
  }

  const actividadesPorCita = new Map();

  (detalles ?? []).forEach((detalle) => {
    const actividad = primeraRelacionSeguimiento(
      detalle.actividad
    );

    const lista =
      actividadesPorCita.get(detalle.cita_id) ?? [];

    lista.push({
      ...(actividad ?? {}),
      detalle_cita_id: detalle.detalle_cita_id,
      actividad_id:
        actividad?.actividad_id ?? detalle.actividad_id,
      estado_relacion: detalle.estado_relacion,
      actividad_disponible: Boolean(actividad),
    });

    actividadesPorCita.set(detalle.cita_id, lista);
  });

  return citas.map((cita) => ({
    ...cita,
    actividades: actividadesPorCita.get(cita.cita_id) ?? [],
  }));
}

/**
 * ============================================================
 * SEGUIMIENTO - CONSULTAR ACTIVIDADES PENDIENTES DE PROGRAMACIÓN
 * ============================================================
 *
 * Obtiene las actividades pendientes de una mascota que todavía
 * no tienen una relación vigente en detalle_cita.
 *
 * Una actividad vinculada únicamente a una cita cancelada,
 * cuya relación ya no esté vigente, puede volver a programarse.
 *
 * No crea actividades ni modifica sus atenciones.
 */
export async function consultarActividadesPendientesProgramacion(
  numeroHistoria
) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia) {
    throw new Error(
      'Debe indicar el número de historia de la mascota.'
    );
  }

  // 1. Consultar actividades pendientes de las atenciones
  // pertenecientes a la mascota seleccionada.
  const { data: actividades, error: errorActividades } =
    await supabase
      .from('actividades')
      .select(`
        actividad_id,
        atencion_id,
        tipo,
        tipo_id,
        estado,
        fecha_prevista,
        fecha_inicio,
        fecha_fin,
        fecha_registro,
        observaciones,
        motivo_no_realizada,
        detalle,
        eliminado,
        atencion:atenciones!inner (
          atencion_id,
          numero_historia,
          estado
        )
      `)
      .eq('atencion.numero_historia', historia)
      .eq('estado', 'Pendiente')
      .order('fecha_prevista', { ascending: true });

  if (errorActividades) {
    console.error(
      'Seguimiento: error consultando actividades pendientes:',
      errorActividades.message
    );

    throw errorActividades;
  }

  if (!Array.isArray(actividades) || actividades.length === 0) {
    return [];
  }

  // 2. Excluir actividades eliminadas y pertenecientes
  // a atenciones que no estén activas.
  const actividadesValidas = actividades.filter((actividad) => {
    const atencion = Array.isArray(actividad.atencion)
      ? actividad.atencion[0]
      : actividad.atencion;

    return (
      actividad.eliminado !== true &&
      actividad.estado === 'Pendiente' &&
      atencion &&
      atencion.estado === 'Activa'
    );
  });

  if (actividadesValidas.length === 0) {
    return [];
  }

  // 3. Consultar las relaciones de cita de esas actividades.
  const idsActividades = actividadesValidas.map(
    (actividad) => actividad.actividad_id
  );

  const { data: relaciones, error: errorRelaciones } =
    await supabase
      .from('detalle_cita')
      .select(`
        detalle_cita_id,
        cita_id,
        actividad_id,
        estado_relacion
      `)
      .in('actividad_id', idsActividades);

  if (errorRelaciones) {
    console.error(
      'Seguimiento: error consultando relaciones de citas:',
      errorRelaciones.message
    );

    throw errorRelaciones;
  }

  // 4. Identificar actividades que ya tienen una relación
  // vigente para no permitir programarlas dos veces.
  const actividadesConCitaVigente = new Set(
    (relaciones ?? [])
      .filter(
        (relacion) =>
          relacion.estado_relacion === 'Vigente'
      )
      .map((relacion) => Number(relacion.actividad_id))
  );

  // 5. Devolver exclusivamente las actividades disponibles.
  return actividadesValidas
    .filter(
      (actividad) =>
        !actividadesConCitaVigente.has(
          Number(actividad.actividad_id)
        )
    )
    .map((actividad) => {
      const atencion = Array.isArray(actividad.atencion)
        ? actividad.atencion[0]
        : actividad.atencion;

      return {
        ...actividad,
        atencion,
        atencion_id: actividad.atencion_id,
        actividad_id: actividad.actividad_id,
      };
    });
}
