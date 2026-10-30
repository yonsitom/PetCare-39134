
import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';

/*
 * ============================================================
 * PETCARE — DAO DE ATENCIONES
 * ============================================================
 *
 * ARQUITECTURA MVC:
 * - Vista: src/app/
 * - Controlador: src/controllers/atenciones/
 * - DAO: este archivo.
 * - Persistencia: Supabase / PostgreSQL.
 *
 * PRINCIPIOS SOLID:
 * - SRP: centraliza las operaciones de persistencia de atenciones.
 * - DIP: los controladores consumen funciones del DAO.
 *
 * DISEÑO DAO:
 * - La interfaz no consulta directamente las tablas.
 * - El DAO normaliza los datos y gestiona errores de persistencia.
 *
 * RF19-RF20: historial y consultas de atenciones.
 * RF21: consultar atenciones y mascotas.
 * RF22: registrar una atención veterinaria.
 * RF23: generar fecha y hora desde PostgreSQL.
 * RF24: consultar detalle de atención.
 * RF25: consultar estado y evitar atenciones duplicadas.
 *
 * REGLAS:
 * - Una mascota no debe tener más de una atención activa.
 * - PostgreSQL debe impedir duplicados de forma atómica.
 * - Las atenciones finalizadas no se reabren automáticamente.
 * - Peso y temperatura son opcionales, pero se validan si se ingresan.
 * - Los síntomas y el diagnóstico pueden ser opcionales.
 * - El motivo de consulta es obligatorio.
 *
 * PRUEBAS:
 * - src/tests/atenciones/atencionesDAO.test.js
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
 * Convierte relaciones de Supabase que pueden llegar como
 * objeto o como arreglo en un único objeto.
 */
function primerRelacion(valor) {
  return Array.isArray(valor) ? valor[0] ?? null : valor ?? null;
}

/**
 * Construye un error identificable para una atención activa.
 */
function crearErrorAtencionActiva(atencion) {
  const mensaje = atencion?.atencion_id
    ? `La mascota ya tiene la atención N.º ${atencion.atencion_id} activa.`
    : 'La mascota ya tiene una atención activa.';

  const error = new Error(mensaje);
  error.code = 'ATENCION_ACTIVA_EXISTENTE';
  error.atencion = atencion ?? null;

  return error;
}

/**
 * Normaliza y valida valores numéricos opcionales.
 *
 * Peso: 0.01 a 500 kg.
 * Temperatura: 25 a 45 °C.
 *
 * Los valores vacíos se convierten en null.
 */
function normalizarNumero(valor, nombre) {
  if (
    valor === undefined ||
    valor === null ||
    String(valor).trim() === ''
  ) {
    return null;
  }

  const texto = String(valor).trim().replace(',', '.');
  const mensaje = `${nombre} debe ser un número mayor que cero.`;

  if (!/^\d+(\.\d+)?$/.test(texto)) {
    throw new Error(mensaje);
  }

  const numero = Number(texto);

  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error(mensaje);
  }

  if (
    nombre === 'El peso' &&
    (numero < 0.01 || numero > 500)
  ) {
    throw new Error(
      'El peso debe estar entre 0.01 y 500 kg.'
    );
  }

  if (
    nombre === 'La temperatura' &&
    (numero < 25 || numero > 45)
  ) {
    throw new Error(
      'La temperatura debe estar entre 25 y 45 °C.'
    );
  }

  return numero;
}

/**
 * RF21: consultar las mascotas activas para registrar atenciones.
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
    logger.error(
      'Error consultando mascotas:',
      error.message
    );

    throw new Error(
      'No se pudieron consultar las mascotas.'
    );
  }

  return (data ?? []).filter((mascota) => {
    const estado = normalizar(mascota.estado);
    return estado === 'activo' || estado === 'activa';
  });
}

/**
 * RF21: consultar las atenciones con sus mascotas y propietarios.
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
        numero_historia,
        nombre,
        especie,
        raza,
        propietarios (
          propietario_id,
          nombre,
          apellido,
          documento_identidad,
          telefono
        )
      )
    `)
    .order('fecha_inicio', { ascending: false });

  if (error) {
    logger.error(
      'Error consultando las atenciones:',
      error.message
    );

    throw new Error(
      'No se pudieron consultar las atenciones.'
    );
  }

  return (data ?? []).map((atencion) => {
    const mascota = primerRelacion(atencion.mascotas);
    const propietario = primerRelacion(mascota?.propietarios);

    const nombreCompleto = [
      propietario?.nombre,
      propietario?.apellido,
    ]
      .filter((parte) => String(parte ?? '').trim())
      .join(' ')
      .trim();

    return {
      ...atencion,
      mascota: mascota
        ? { ...mascota, propietarios: propietario }
        : null,
      propietario: propietario
        ? {
            ...propietario,
            nombre_completo: nombreCompleto,
          }
        : null,
      nombre_mascota: mascota?.nombre ?? '',
      nombre_propietario: nombreCompleto,
    };
  });
}

/**
 * RF22/RF25: consultar si una mascota tiene una atención activa.
 */
export async function consultarAtencionActivaPorMascota(
  numeroHistoria
) {
  const historia = normalizarHistoria(numeroHistoria);

  if (!historia) {
    throw new Error('Debe seleccionar una mascota.');
  }

  const { data, error } = await supabase
    .from('atenciones')
    .select(`
      atencion_id,
      numero_historia,
      fecha_inicio,
      fecha_fin,
      estado
    `)
    .eq('numero_historia', historia)
    .eq('estado', 'Activa')
    .order('fecha_inicio', { ascending: false })
    .limit(1);

  if (error) {
    logger.error(
      'Error verificando atención activa:',
      error.message
    );

    throw new Error(
      'No se pudo comprobar si la mascota tiene una atención activa.'
    );
  }

  return data?.[0] ?? null;
}

/**
 * RF22/RF23:
 * crear una atención inicial mediante PostgreSQL.
 *
 * La fecha de inicio y la creación de la actividad inicial
 * corresponden a la función SQL crear_atencion_inicial.
 *
 * IMPORTANTE:
 * La función SQL debe impedir duplicados de manera atómica.
 * Una consulta previa en JavaScript no evita por sí sola
 * solicitudes simultáneas.
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
    logger.error(
      'Error verificando mascota:',
      errorMascota.message
    );

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

  if (
    estadoMascota !== 'activo' &&
    estadoMascota !== 'activa'
  ) {
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
    logger.error(
      'Error creando atención inicial:',
      error.message
    );

    const mensaje = normalizar([
      error.message,
      error.details,
      error.hint,
      error.code,
    ].filter(Boolean).join(' '));

    if (
      mensaje.includes('atencion_activa_existente') ||
      mensaje.includes('atencion activa existente')
    ) {
      let atencionActual = null;

      try {
        atencionActual =
          await consultarAtencionActivaPorMascota(
            mascota.numero_historia
          );
      } catch (errorConsulta) {
        logger.error(
          'No se pudo recuperar la atención activa:',
          errorConsulta.message
        );
      }

      throw crearErrorAtencionActiva(atencionActual);
    }

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
      mensaje.includes('no se pudo registrar el inicio de la atencion')
    ) {
      throw new Error(
        'No se pudo registrar el inicio de la atención. Intente nuevamente.'
      );
    }

    if (
      mensaje.includes('la mascota no existe o no esta activa') ||
      mensaje.includes('no existe o no se encuentra activa')
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

    if (
      mensaje.includes(
        'seleccione una mascota para registrar la atencion'
      )
    ) {
      throw new Error(
        'Seleccione una mascota para registrar la atención.'
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
 * RF23: guardar los datos clínicos de una actividad Consulta.
 *
 * El motivo es obligatorio.
 * Los síntomas, el diagnóstico, el peso y la temperatura
 * son opcionales; si se ingresan, las medidas se validan.
 */
export async function guardarDatosConsulta(
  actividadId,
  datos = {}
) {
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
    throw new Error(
      'El motivo de consulta es obligatorio.'
    );
  }

  const peso = normalizarNumero(datos.peso, 'El peso');
  const temperatura = normalizarNumero(
    datos.temperatura,
    'La temperatura'
  );

  const { data: actividad, error: errorActividad } =
    await supabase
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
    logger.error(
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

  const atencion = primerRelacion(actividad.atenciones);

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
    logger.error(
      'Error guardando datos clínicos:',
      error.message
    );

    throw new Error(
      'No se pudieron guardar los datos clínicos. Intente nuevamente.'
    );
  }

  /*
   * RF23: actualizar las observaciones generales de la atención
   * solo cuando el formulario haya enviado ese campo.
   */
  if (datos.observaciones !== undefined) {
    const { error: errorObservaciones } = await supabase
      .from('atenciones')
      .update({
        observaciones: textoOpcional(datos.observaciones),
      })
      .eq('atencion_id', actividad.atencion_id)
      .eq('estado', 'Activa');

    if (errorObservaciones) {
      logger.error(
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
 * RF22/RF23:
 * registrar la atención y guardar los datos de la consulta inicial.
 *
 * Responsabilidades:
 * 1. Validar los datos recibidos.
 * 2. Crear la atención y su actividad inicial mediante PostgreSQL.
 * 3. Guardar los datos clínicos de la consulta.
 * 4. Guardar las observaciones generales cuando se proporcionen.
 */
export async function registrarAtencion(datos = {}) {
  const numeroHistoria = normalizarHistoria(
    datos.numero_historia
  );

  if (!numeroHistoria) {
    throw new Error(
      'Seleccione una mascota para registrar la atención.'
    );
  }

  const motivo = String(
    datos.motivo_consulta ?? ''
  ).trim();

  if (!motivo) {
    throw new Error(
      'El motivo de consulta es obligatorio.'
    );
  }

  // Los síntomas son opcionales en el DAO.
  const sintomas = textoOpcional(datos.sintomas);
  const diagnostico = textoOpcional(datos.diagnostico);

  // Validar antes de crear registros en PostgreSQL.
  const peso = normalizarNumero(datos.peso, 'El peso');
  const temperatura = normalizarNumero(
    datos.temperatura,
    'La temperatura'
  );

  // La función SQL debe garantizar que no existan duplicados.
  const atencion = await crearAtencionInicial(numeroHistoria);

  const consulta = await guardarDatosConsulta(
    atencion.actividad_id,
    {
      motivo_consulta: motivo,
      sintomas,
      peso,
      temperatura,
      diagnostico,
      observaciones: datos.observaciones,
    }
  );

  return {
    ...atencion,
    datos_consulta: consulta,
  };
}

/**
 * RF24: consultar el detalle de una atención.
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
    logger.error(
      'Error consultando detalle:',
      error.message
    );

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
 * RF23: consultar los datos clínicos de una actividad Consulta.
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
    logger.error(
      'Error consultando datos clínicos:',
      error.message
    );

    throw new Error(
      'No se pudieron consultar los datos clínicos.'
    );
  }

  return data;
}

/**
 * RF25: consultar el estado actual de una atención.
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
    logger.error(
      'Error consultando estado:',
      error.message
    );

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
 * RF19: consultar todas las atenciones de una mascota.
 */
export async function consultarAtencionesPorMascota(
  numeroHistoria
) {
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
    logger.error(
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
 * RF20: buscar mascotas por nombre o número de historia.
 */
export async function buscarMascotasParaHistorial(termino) {
  const busqueda = String(termino ?? '').trim();

  if (!busqueda) {
    return [];
  }

  // Evitar que caracteres especiales alteren la expresión de búsqueda.
  const terminoSeguro = busqueda
    .replace(/[%_,()]/g, ' ')
    .trim();

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
    logger.error(
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
 * RF20: consultar el historial de atenciones de una mascota.
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
    logger.error(
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
 * RF38-RF43: consultar las actividades para Seguimiento.
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
    logger.error(
      'Error consultando actividades de seguimiento:',
      error.message
    );

    throw new Error(
      'No se pudieron consultar las actividades de seguimiento.'
    );
  }

  return (data ?? []).map((item) => {
    const atencion = primerRelacion(item.atenciones) ?? {};
    const mascota = primerRelacion(atencion.mascotas) ?? {};
    const propietario = primerRelacion(mascota.propietarios);

    return {
      ...item,
      atenciones: atencion,
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
 * RF20/RF38-RF43: consultar el historial general de seguimiento.
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
    logger.error(
      'Error consultando historial de seguimiento:',
      error.message
    );

    throw new Error(
      'No se pudo consultar el historial de atención.'
    );
  }

  return (data ?? []).map((atencion) => {
    const mascota = primerRelacion(atencion.mascotas) ?? {};
    const propietario = primerRelacion(mascota.propietarios);

    return {
      ...atencion,
      mascotas: mascota,
      mascota,
      propietario,
    };
  });
}
