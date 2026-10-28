
import { supabase } from '../services/supabase';

/*
 * ============================================================
 * PETCARE — DAO DE ATENCIONES
 * ============================================================
 *
 * MVC:
 * - Vista: src/app/
 * - Controlador: src/controllers/atenciones/
 * - DAO: este archivo
 * - Persistencia: Supabase / PostgreSQL
 *
 * SOLID:
 * - SRP: centraliza el acceso a datos de las atenciones.
 * - DIP: los controladores delegan la persistencia en este DAO.
 *
 * RF19-RF20: historial y consultas de atenciones.
 * RF21: consultar atenciones.
 * RF22: registrar atención veterinaria.
 * RF23: generar fecha y hora de inicio desde PostgreSQL.
 * RF24: consultar detalle de atención.
 * RF25: consultar el estado de una atención.
 *
 * IMPORTANTE:
 * Una atención finalizada no debe reabrirse automáticamente.
 * El cierre automático según el estado de las actividades se
 * implementará en el DAO de actividades, sin permitir reabrir
 * una atención finalizada.
 * ============================================================
 */

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

function textoOpcional(valor) {
  const texto = String(valor ?? '').trim();
  return texto || null;
}

/**
 * Valida números opcionales.
 *
 * Los valores vacíos se convierten en null.
 * Los valores no numéricos, cero o negativos se rechazan.
 * El parámetro nombre debe incluir el artículo correspondiente:
 * 'El peso' o 'La temperatura'.
 */
function normalizarNumero(valor, nombre) {
  if (
    valor === undefined ||
    valor === null ||
    String(valor).trim() === ''
  ) {
    return null;
  }

  const numero = Number(String(valor).trim().replace(',', '.'));

  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error(
      `${nombre} debe ser un número mayor que cero.`
    );
  }

  return numero;
}

/**
 * RF21: consultar mascotas activas para registrar atención.
 */
export async function consultarMascotasParaAtencion() {
  const { data, error } = await supabase
    .from('mascotas')
    .select(`
      numero_historia,
      nombre,
      especie,
      raza,
      estado,
      propietario_id,
      propietarios (
        propietario_id,
        nombre,
        apellido,
        documento_identidad,
        telefono
      )
    `)
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error consultando mascotas:', error.message);
    throw new Error('No se pudieron consultar las mascotas.');
  }

  return (data ?? []).filter((mascota) => {
    const estado = normalizar(mascota.estado);
    return estado === 'activo' || estado === 'activa';
  });
}

/**
 * RF21: consultar todas las atenciones.
 */
export async function consultarAtenciones() {
  const { data, error } = await supabase
    .from('atenciones')
    .select(`
      atencion_id,
      numero_historia,
      fecha_inicio,
      fecha_fin,
      estado,
      observaciones,
      mascotas (
        nombre,
        especie,
        raza,
        numero_historia
      )
    `)
    .order('fecha_inicio', { ascending: false });

  if (error) {
    console.error('Error consultando atenciones:', error.message);
    throw new Error('No se pudieron consultar las atenciones.');
  }

  return data ?? [];
}

/**
 * RF22/RF23: crear atención y actividad Consulta inicial.
 * La función PostgreSQL se encarga de generar fecha_inicio.
 */
export async function crearAtencionInicial(numeroHistoria) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia) {
    throw new Error(
      'Seleccione una mascota para registrar la atención.'
    );
  }

  const { data: mascota, error: errorMascota } = await supabase
    .from('mascotas')
    .select('numero_historia, estado')
    .eq('numero_historia', historia)
    .maybeSingle();

  if (errorMascota) {
    console.error('Error verificando mascota:', errorMascota.message);
    throw new Error(
      'No se pudo verificar la mascota. Intente nuevamente.'
    );
  }

  if (!mascota) {
    throw new Error(
      'No se pudo encontrar la mascota. Verifique la información e inténtelo nuevamente.'
    );
  }

  const estadoMascota = normalizar(mascota.estado);

  if (estadoMascota !== 'activo' && estadoMascota !== 'activa') {
    throw new Error(
      'No se puede registrar una atención para una mascota inactiva.'
    );
  }

  const { data, error } = await supabase.rpc(
    'crear_atencion_inicial',
    {
      p_numero_historia: mascota.numero_historia,
    }
  );

  if (error) {
    console.error('Error creando atención inicial:', error.message);

    const mensaje = normalizar(error.message);

    if (
      mensaje.includes(
        'no se pudo registrar la fecha y hora de inicio'
      )
    ) {
      throw new Error(
        'No se pudo registrar la fecha y hora de inicio. Intente nuevamente.'
      );
    }

    if (
      mensaje.includes(
        'no se pudo registrar el inicio de la atencion'
      )
    ) {
      throw new Error(
        'No se pudo registrar el inicio de la atención. Intente nuevamente.'
      );
    }

    if (
      mensaje.includes('no existe o no se encuentra activa') ||
      mensaje.includes('la mascota no existe o no esta activa')
    ) {
      throw new Error(
        'La mascota no existe o no se encuentra activa.'
      );
    }

    if (
      mensaje.includes(
        'tipo de actividad consulta no esta disponible'
      )
    ) {
      throw new Error(
        'El tipo de actividad Consulta no está disponible.'
      );
    }

    throw new Error(
      'No se pudo registrar la atención veterinaria. Intente nuevamente.'
    );
  }

  const resultado = Array.isArray(data) ? data[0] : data;

  if (
    !resultado?.atencion_id ||
    !resultado?.actividad_id ||
    !resultado?.fecha_inicio
  ) {
    throw new Error(
      'La atención no devolvió un identificador válido.'
    );
  }

  return {
    atencion_id: resultado.atencion_id,
    actividad_id: resultado.actividad_id,
    numero_historia:
      resultado.numero_historia ?? mascota.numero_historia,
    fecha_inicio: resultado.fecha_inicio,
    estado: resultado.estado ?? 'Activa',
  };
}

/**
 * RF23: guardar datos clínicos de una actividad Consulta existente.
 * Rechaza guardar datos si la atención ya está finalizada.
 */
export async function guardarDatosConsulta(actividadId, datos = {}) {
  if (
    actividadId === undefined ||
    actividadId === null ||
    String(actividadId).trim() === ''
  ) {
    throw new Error(
      'No se encontró la actividad de consulta asociada.'
    );
  }

  const motivoConsulta = String(
    datos.motivo_consulta ?? ''
  ).trim();

  if (!motivoConsulta) {
    throw new Error('El motivo de consulta es obligatorio.');
  }

  const peso = normalizarNumero(datos.peso, 'El peso');
  const temperatura = normalizarNumero(
    datos.temperatura,
    'La temperatura'
  );

  const { data: actividad, error: errorActividad } = await supabase
    .from('actividades')
    .select(`
      actividad_id,
      tipo,
      estado,
      eliminado,
      atencion_id,
      atenciones (
        atencion_id,
        estado
      )
    `)
    .eq('actividad_id', actividadId)
    .eq('eliminado', false)
    .maybeSingle();

  if (errorActividad) {
    console.error(
      'Error verificando actividad de consulta:',
      errorActividad.message
    );
    throw new Error(
      'No se pudo verificar la actividad de consulta.'
    );
  }

  if (!actividad) {
    throw new Error(
      'La actividad de consulta no se encuentra disponible.'
    );
  }

  if (normalizar(actividad.tipo) !== 'consulta') {
    throw new Error(
      'Los datos clínicos solo se pueden guardar en una actividad de Consulta.'
    );
  }

  const atencion = Array.isArray(actividad.atenciones)
    ? actividad.atenciones[0]
    : actividad.atenciones;

  if (
    !atencion ||
    normalizar(atencion.estado) !== 'activa'
  ) {
    throw new Error(
      'No se pueden guardar datos en una atención finalizada.'
    );
  }

  const registroClinico = {
    actividad_id: actividad.actividad_id,
    motivo_consulta: motivoConsulta,
    sintomas: textoOpcional(datos.sintomas),
    peso,
    temperatura,
    diagnostico: textoOpcional(datos.diagnostico),
  };

  const { data, error } = await supabase
    .from('actividad_consulta')
    .upsert(registroClinico, {
      onConflict: 'actividad_id',
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error guardando datos clínicos:', error.message);
    throw new Error(
      'No se pudieron guardar los datos clínicos. Intente nuevamente.'
    );
  }

  if (datos.observaciones !== undefined) {
    const { error: errorObservaciones } = await supabase
      .from('atenciones')
      .update({
        observaciones: textoOpcional(datos.observaciones),
      })
      .eq('atencion_id', actividad.atencion_id)
      .eq('estado', 'Activa');

    if (errorObservaciones) {
      console.error(
        'Error guardando observaciones:',
        errorObservaciones.message
      );
      throw new Error(
        'Los datos clínicos se guardaron, pero no se pudieron guardar las observaciones generales.'
      );
    }
  }

  return data;
}

/**
 * Compatibilidad con formularios que llaman registrarAtencion().
 */
export async function registrarAtencion(datos = {}) {
  const numeroHistoria = normalizarHistoria(datos.numero_historia);

  if (!numeroHistoria) {
    throw new Error(
      'Seleccione una mascota para registrar la atención.'
    );
  }

  const motivo = String(datos.motivo_consulta ?? '').trim();

  if (!motivo) {
    throw new Error('El motivo de consulta es obligatorio.');
  }

  // Validar antes de crear cualquier registro.
  const peso = normalizarNumero(datos.peso, 'El peso');
  const temperatura = normalizarNumero(
    datos.temperatura,
    'La temperatura'
  );

  const atencion = await crearAtencionInicial(numeroHistoria);

  const consulta = await guardarDatosConsulta(
    atencion.actividad_id,
    {
      motivo_consulta: motivo,
      sintomas: textoOpcional(datos.sintomas),
      peso,
      temperatura,
      diagnostico: textoOpcional(datos.diagnostico),
      observaciones: datos.observaciones,
    }
  );

  return {
    ...atencion,
    datos_consulta: consulta,
  };
}

/**
 * RF24: consultar detalle de una atención.
 */
export async function consultarAtencionPorId(atencionId) {
  if (
    atencionId === undefined ||
    atencionId === null ||
    String(atencionId).trim() === ''
  ) {
    throw new Error(
      'Debe indicar la atención que desea consultar.'
    );
  }

  const { data, error } = await supabase
    .from('atenciones')
    .select(`
      *,
      mascotas (
        nombre,
        especie,
        raza,
        numero_historia,
        propietarios (
          propietario_id,
          nombre,
          apellido,
          telefono
        )
      )
    `)
    .eq('atencion_id', atencionId)
    .maybeSingle();

  if (error) {
    console.error('Error consultando detalle:', error.message);
    throw new Error(
      'No se pudo consultar el detalle de la atención.'
    );
  }

  if (!data) {
    throw new Error(
      'La atención seleccionada no se encuentra disponible.'
    );
  }

  return data;
}

/**
 * Consultar los datos clínicos de una actividad Consulta.
 */
export async function consultarDatosConsulta(actividadId) {
  if (
    actividadId === undefined ||
    actividadId === null ||
    String(actividadId).trim() === ''
  ) {
    throw new Error(
      'Debe indicar la actividad de consulta.'
    );
  }

  const { data, error } = await supabase
    .from('actividad_consulta')
    .select('*')
    .eq('actividad_id', actividadId)
    .maybeSingle();

  if (error) {
    console.error('Error consultando datos clínicos:', error.message);
    throw new Error(
      'No se pudieron consultar los datos clínicos.'
    );
  }

  return data;
}

/**
 * RF25: consultar estado de una atención.
 */
export async function consultarEstadoAtencion(atencionId) {
  if (
    atencionId === undefined ||
    atencionId === null ||
    String(atencionId).trim() === ''
  ) {
    throw new Error(
      'No se pudo determinar el estado de esta atención.'
    );
  }

  const { data, error } = await supabase
    .from('atenciones')
    .select('atencion_id, estado, fecha_inicio, fecha_fin')
    .eq('atencion_id', atencionId)
    .maybeSingle();

  if (error) {
    console.error('Error consultando estado:', error.message);
    throw new Error(
      'No se pudo cargar el estado de la atención.'
    );
  }

  if (!data) {
    throw new Error(
      'La atención veterinaria no se encuentra disponible.'
    );
  }

  const estado = normalizar(data.estado);

  if (estado !== 'activa' && estado !== 'finalizada') {
    throw new Error(
      'No se pudo determinar el estado de esta atención.'
    );
  }

  return data;
}

/**
 * RF19: consultar atenciones asociadas a una mascota.
 */
export async function consultarAtencionesPorMascota(numeroHistoria) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia) {
    throw new Error(
      'Debe indicar el número de historia de la mascota.'
    );
  }

  const { data, error } = await supabase
    .from('atenciones')
    .select(`
      atencion_id,
      numero_historia,
      fecha_inicio,
      fecha_fin,
      estado,
      observaciones
    `)
    .eq('numero_historia', historia)
    .order('fecha_inicio', { ascending: false });

  if (error) {
    console.error(
      'Error consultando atenciones de la mascota:',
      error.message
    );
    throw new Error(
      'No se pudo consultar la información de la mascota. Intente nuevamente.'
    );
  }

  return data ?? [];
}

/**
 * RF20: buscar mascotas por nombre o historia clínica.
 */
export async function buscarMascotasParaHistorial(termino) {
  const busqueda = String(termino ?? '').trim();

  if (!busqueda) {
    return [];
  }

  const terminoSeguro = busqueda.replace(/[%_,()]/g, ' ').trim();

  if (!terminoSeguro) {
    return [];
  }

  const { data, error } = await supabase
    .from('mascotas')
    .select(`
      numero_historia,
      nombre,
      especie,
      raza,
      sexo,
      propietarios (
        nombre,
        apellido,
        telefono
      )
    `)
    .or(
      `nombre.ilike.%${terminoSeguro}%,numero_historia.ilike.%${terminoSeguro}%`
    )
    .limit(20);

  if (error) {
    console.error(
      'RF20: Error buscando mascotas para el historial:',
      error.message
    );
    throw new Error(
      'No se pudo cargar el historial de atención. Intente nuevamente.'
    );
  }

  return data ?? [];
}

/**
 * RF20: consultar historial de atenciones de una mascota.
 */
export async function consultarHistorialAtencionesPorMascota(
  numeroHistoria
) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia) {
    throw new Error(
      'No se pudo cargar el historial de atención. Intente nuevamente.'
    );
  }

  const { data, error } = await supabase
    .from('atenciones')
    .select(`
      atencion_id,
      numero_historia,
      fecha_inicio,
      fecha_fin,
      estado,
      observaciones
    `)
    .eq('numero_historia', historia)
    .order('fecha_inicio', { ascending: false });

  if (error) {
    console.error(
      'RF20: Error consultando el historial:',
      error.message
    );
    throw new Error(
      'No se pudo cargar el historial de atención. Intente nuevamente.'
    );
  }

  return data ?? [];
}

/**
 * Consultar actividades para la pantalla Seguimiento.
 */
export async function consultarActividadesSeguimiento() {
  const { data, error } = await supabase
    .from('actividades')
    .select(`
      actividad_id,
      atencion_id,
      tipo,
      estado,
      fecha_prevista,
      fecha_registro,
      fecha_fin,
      observaciones,
      detalle,
      eliminado,
      atenciones!inner (
        atencion_id,
        numero_historia,
        fecha_inicio,
        fecha_fin,
        estado,
        mascotas!inner (
          numero_historia,
          nombre,
          especie,
          raza,
          propietario_id,
          propietarios (
            propietario_id,
            nombre,
            apellido,
            documento_identidad
          )
        )
      )
    `)
    .eq('eliminado', false)
    .order('fecha_registro', { ascending: false });

  if (error) {
    console.error(
      'Error consultando actividades de seguimiento:',
      error.message
    );
    throw new Error(
      'No se pudieron consultar las actividades de seguimiento.'
    );
  }

  return (data ?? []).map((item) => {
    const atencion = item.atenciones || {};
    const mascota = atencion.mascotas || {};
    const propietario = mascota.propietarios || {};

    return {
      ...item,
      mascota,
      propietario,
      estadoAtencion: atencion.estado,
      fechaMostrar:
        item.fecha_prevista ||
        item.fecha_registro ||
        atencion.fecha_inicio,
    };
  });
}

/**
 * RF20: consultar historial general de atenciones.
 */
export async function consultarHistorialSeguimiento() {
  const { data, error } = await supabase
    .from('atenciones')
    .select(`
      atencion_id,
      numero_historia,
      fecha_inicio,
      fecha_fin,
      estado,
      observaciones,
      mascotas!inner (
        numero_historia,
        nombre,
        especie,
        raza,
        propietarios (
          propietario_id,
          nombre,
          apellido,
          documento_identidad
        )
      )
    `)
    .order('fecha_inicio', { ascending: false });

  if (error) {
    console.error(
      'Error consultando historial de seguimiento:',
      error.message
    );
    throw new Error(
      'No se pudo consultar el historial de atención.'
    );
  }

  return (data ?? []).map((atencion) => ({
    ...atencion,
    mascota: atencion.mascotas || {},
    propietario: atencion.mascotas?.propietarios || {},
  }));
}
