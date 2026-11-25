
/**
 * ============================================================
 * PETCARE — DAO DE ACTIVIDADES
 * ============================================================
 *
 * RF10: Consultar actividades por estado.
 * RF24: Consultar actividades y sus datos específicos.
 * RF25: Cambiar estado y finalizar atención.
 * RF26: Verificar atención lista para finalizar.
 * RF29: Registrar actividad.
 * RF32: Editar actividad.
 * RF43: Suscripción a cambios en tiempo real.
 * RF53: Registrar posología y vacunación.
 *
 * Arquitectura: Servicio -> DAO -> Supabase.
 *
 * IMPORTANTE:
 * - Las actividades eliminadas no cuentan para finalizar.
 * - Los valores eliminado = false y NULL se consideran vigentes.
 * - Una atención requiere al menos una actividad vigente.
 * - Todas deben estar Completada o No realizada.
 * - Completar actividades NO finaliza automáticamente
 *   la atención.
 * - La atención solo se finaliza con confirmación expresa.
 * ============================================================
 */

import { supabase } from '../../services/supabase';

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

const SELECT_ACTIVIDAD_CON_TIPO =
  '*, tipos_actividad(tipo_id, codigo, nombre)';

const TIPOS_ACTIVIDAD_BD = {
  CONSULTA: 'Consulta',
  MEDICACION: 'Medicacion',
  VACUNACION: 'Vacunacion',
  ECOGRAFIA: 'Ecografia',
  ESTERILIZACION: 'Esterilizacion',
  OTRO: 'Otro actividad',
};

/* ============================================================
   UTILIDADES GENERALES
   ============================================================ */

function validarIdentificador(valor, mensaje) {
  if (
    valor === undefined ||
    valor === null ||
    String(valor).trim() === '' ||
    !Number.isInteger(Number(valor)) ||
    Number(valor) <= 0
  ) {
    throw new Error(mensaje);
  }
}

function obtenerTiempo(fecha) {
  if (!fecha) return 0;

  const tiempo = new Date(fecha).getTime();

  return Number.isNaN(tiempo) ? 0 : tiempo;
}

function normalizarCodigoTipo(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function normalizarEstadoActividad(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function esActividadVigente(actividad) {
  return actividad?.eliminado !== true;
}

function obtenerRelacionTipo(actividad) {
  const relacion = actividad?.tipos_actividad;

  if (Array.isArray(relacion)) {
    return relacion[0] ?? null;
  }

  return relacion ?? null;
}

function normalizarActividadConTipo(actividad) {
  if (!actividad || typeof actividad !== 'object') {
    return actividad;
  }

  const tipoCatalogo = obtenerRelacionTipo(actividad);

  return {
    ...actividad,
    tipo: tipoCatalogo?.nombre ?? actividad.tipo ?? null,
    tipo_codigo: tipoCatalogo?.codigo ?? null,
    tipos_actividad: tipoCatalogo,
  };
}

function normalizarListaActividades(actividades) {
  return (actividades ?? []).map(normalizarActividadConTipo);
}

function normalizarDetalle(detalle) {
  if (
    detalle &&
    typeof detalle === 'object' &&
    !Array.isArray(detalle)
  ) {
    return detalle;
  }

  if (typeof detalle === 'string') {
    try {
      const convertido = JSON.parse(detalle);

      if (
        convertido &&
        typeof convertido === 'object' &&
        !Array.isArray(convertido)
      ) {
        return convertido;
      }
    } catch (error) {
      console.warn(
        '[PetCare] No se pudo interpretar el detalle JSONB:',
        error
      );
    }
  }

  return {};
}

function normalizarTipoParaConsulta(actividad) {
  const relacion = obtenerRelacionTipo(actividad);

  const codigo = normalizarCodigoTipo(
    relacion?.codigo ??
    actividad?.tipo_codigo ??
    actividad?.tipo
  );

  if (codigo.includes('MEDICACION') || codigo.includes('MEDICAMENTO')) {
    return 'MEDICACION';
  }

  if (codigo.includes('VACUNACION') || codigo.includes('VACUNA')) {
    return 'VACUNACION';
  }

  if (codigo.includes('CONSULTA')) return 'CONSULTA';
  if (codigo.includes('ECOGRAFIA')) return 'ECOGRAFIA';
  if (codigo.includes('ESTERILIZACION')) return 'ESTERILIZACION';
  if (codigo.includes('OTRO')) return 'OTRO';

  return codigo;
}

/**
 * Consulta las actividades vigentes de una atención.
 *
 * No utiliza .eq('eliminado', false), porque eso excluye
 * los registros antiguos cuyo campo eliminado sea NULL.
 *
 * Se recuperan los registros de la atención y se filtran
 * en JavaScript, considerando vigente todo registro cuyo
 * eliminado no sea exactamente true.
 */
async function consultarActividadesVigentesSinEnriquecer(atencionId) {
  const { data, error } = await supabase
    .from('actividades')
    .select(SELECT_ACTIVIDAD_CON_TIPO)
    .eq('atencion_id', Number(atencionId))
    .order('fecha_prevista', { ascending: true });

  if (error) {
    console.error(
      'Error consultando actividades vigentes:',
      error
    );

    throw new Error(
      'No se pudieron consultar las actividades de la atención. Intente nuevamente.'
    );
  }

  return (data ?? [])
    .filter(esActividadVigente)
    .map(normalizarActividadConTipo);
}

/* ============================================================
   RESPONSABLE DE REGISTRO
   ============================================================ */

async function obtenerUsuarioAutenticado() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error(
      'Error obteniendo usuario autenticado:',
      error
    );

    throw new Error(
      'No se pudo identificar al usuario que registra la actividad.'
    );
  }

  const usuario = data?.user;

  if (!usuario?.id) {
    throw new Error(
      'La sesión ha expirado. Inicia sesión nuevamente para registrar la actividad.'
    );
  }

  return usuario;
}

async function enriquecerActividadConCreador(actividad) {
  if (!actividad) return actividad;

  const actividadNormalizada =
    normalizarActividadConTipo(actividad);

  const creadorId = actividadNormalizada.creado_por;

  if (!creadorId) {
    return {
      ...actividadNormalizada,
      creador: null,
      nombre_creador: null,
      rol_creador: null,
    };
  }

  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select('nombre_completo, rol')
    .eq('perfil_id', creadorId)
    .maybeSingle();

  if (error) {
    console.error(
      'RF24: no se pudo consultar el perfil del creador:',
      error
    );

    return {
      ...actividadNormalizada,
      creador: null,
      nombre_creador: null,
      rol_creador: null,
    };
  }

  return {
    ...actividadNormalizada,
    creador: perfil ?? null,
    nombre_creador: perfil?.nombre_completo ?? null,
    rol_creador: perfil?.rol ?? null,
  };
}

async function enriquecerListaConCreadores(actividades) {
  const lista = normalizarListaActividades(actividades);

  const ids = [
    ...new Set(
      lista
        .map((actividad) => actividad?.creado_por)
        .filter(Boolean)
    ),
  ];

  if (ids.length === 0) {
    return lista.map((actividad) => ({
      ...actividad,
      creador: null,
      nombre_creador: null,
      rol_creador: null,
    }));
  }

  const { data: perfiles, error } = await supabase
    .from('perfiles')
    .select('nombre_completo, rol')
    .in('perfil_id', ids);

  if (error) {
    console.error(
      'No se pudieron recuperar los responsables de las actividades:',
      error
    );

    return lista.map((actividad) => ({
      ...actividad,
      creador: null,
      nombre_creador: null,
      rol_creador: null,
    }));
  }

const mapaPerfiles = new Map(
  (perfiles ?? []).map((perfil, indice) => [
    String(ids[indice]),
    perfil,
  ])
);
  return lista.map((actividad) => {
    const perfil = actividad.creado_por
      ? mapaPerfiles.get(String(actividad.creado_por)) ?? null
      : null;

    return {
      ...actividad,
      creador: perfil,
      nombre_creador: perfil?.nombre_completo ?? null,
      rol_creador: perfil?.rol ?? null,
    };
  });
}

/* ============================================================
   RF24 — DATOS DE ATENCIÓN Y MASCOTA
   ============================================================ */

async function consultarDatosAtencionYMascota(actividad) {
  const atencionId = actividad?.atencion_id;

  if (!atencionId) {
    return {
      atenciones: null,
      mascota: null,
      nombre_mascota: null,
      numero_historia: null,
      estado_atencion: null,
    };
  }

  const { data: atencion, error: errorAtencion } = await supabase
    .from('atenciones')
    .select(
      'atencion_id, numero_historia, estado, fecha_inicio, fecha_fin'
    )
    .eq('atencion_id', atencionId)
    .maybeSingle();

  if (errorAtencion) {
    console.error(
      'RF24: error consultando la atención asociada:',
      errorAtencion
    );

    throw new Error(
      'No se pudieron recuperar los datos de la atención asociada a la actividad.'
    );
  }

  if (!atencion) {
    return {
      atenciones: null,
      mascota: null,
      nombre_mascota: null,
      numero_historia: null,
      estado_atencion: null,
    };
  }

  const numeroHistoria = atencion.numero_historia;

  if (!numeroHistoria) {
    return {
      atenciones: atencion,
      mascota: null,
      nombre_mascota: null,
      numero_historia: null,
      estado_atencion: atencion.estado ?? null,
    };
  }

  const { data: mascota, error: errorMascota } = await supabase
    .from('mascotas')
    .select('numero_historia, nombre, especie, raza, sexo')
    .eq('numero_historia', numeroHistoria)
    .maybeSingle();

  if (errorMascota) {
    console.error(
      'RF24: error consultando la mascota asociada:',
      errorMascota
    );

    throw new Error(
      'No se pudo recuperar la información de la mascota asociada a la actividad.'
    );
  }

  return {
    atenciones: {
      ...atencion,
      mascotas: mascota ?? null,
    },
    mascota: mascota ?? null,
    nombre_mascota: mascota?.nombre ?? null,
    numero_historia: numeroHistoria,
    estado_atencion: atencion.estado ?? null,
  };
}

/* ============================================================
   OBTENER TIPO COMPATIBLE CON LA BASE DE DATOS
   ============================================================ */

async function obtenerTipoCompatibleBD(datos) {
  let codigo = normalizarCodigoTipo(datos.tipo_codigo);

  if (!codigo) {
    const { data: tipoCatalogo, error } = await supabase
      .from('tipos_actividad')
      .select('tipo_id, codigo, nombre')
      .eq('tipo_id', datos.tipo_id)
      .maybeSingle();

    if (error) {
      console.error(
        'RF29: error consultando el tipo de actividad:',
        error
      );

      throw new Error(
        'No se pudo verificar el tipo de actividad seleccionado.'
      );
    }

    if (!tipoCatalogo) {
      throw new Error(
        'El tipo de actividad seleccionado no existe en el catálogo.'
      );
    }

    codigo = normalizarCodigoTipo(tipoCatalogo.codigo);
  }

  if (
    codigo.includes('MEDICACION') ||
    codigo.includes('MEDICAMENTO')
  ) {
    codigo = 'MEDICACION';
  } else if (
    codigo.includes('VACUNACION') ||
    codigo.includes('VACUNA')
  ) {
    codigo = 'VACUNACION';
  } else if (codigo.includes('CONSULTA')) {
    codigo = 'CONSULTA';
  } else if (codigo.includes('ECOGRAFIA')) {
    codigo = 'ECOGRAFIA';
  } else if (codigo.includes('ESTERILIZACION')) {
    codigo = 'ESTERILIZACION';
  } else if (
    codigo === 'OTRO' ||
    codigo === 'OTROS' ||
    codigo.startsWith('OTRO ')
  ) {
    codigo = 'OTRO';
  }

  const tipoBD = TIPOS_ACTIVIDAD_BD[codigo];

  if (!tipoBD) {
    console.error(
      'RF29: código de tipo de actividad no reconocido:',
      {
        tipo_id: datos.tipo_id,
        tipo_codigo: datos.tipo_codigo,
        tipo: datos.tipo,
        codigo_normalizado: codigo,
      }
    );

    throw new Error(
      'El tipo de actividad seleccionado no tiene una correspondencia válida en la base de datos.'
    );
  }

  return { codigo, tipoBD };
}

/* ============================================================
   RF24 — MEDICAMENTOS ASOCIADOS
   ============================================================ */

async function consultarMedicamentosAsociados(actividadId) {
  const { data: asociaciones, error } = await supabase
    .from('actividad_medicacion')
    .select(
      'actividad_id, medicamento_id, dosis, frecuencia, via_administracion'
    )
    .eq('actividad_id', actividadId);

  if (error) {
    console.error(
      'RF24: error consultando medicamentos asociados:',
      error
    );

    throw new Error(
      'No se pudieron consultar los medicamentos registrados para esta actividad.'
    );
  }

  const lista = Array.isArray(asociaciones)
    ? asociaciones
    : [];

  if (lista.length === 0) return [];

  const ids = [
    ...new Set(
      lista
        .map((item) => Number(item.medicamento_id))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];

  if (ids.length === 0) {
    return lista.map((item) => ({
      ...item,
      nombre_medicamento: 'Medicamento no identificado',
      concentracion: null,
      categoria: 'Medicamento',
    }));
  }

  const { data: catalogo, error: errorCatalogo } =
    await supabase
      .from('medicamentos')
      .select(
        'medicamento_id, nombre_medicamento, concentracion, categoria'
      )
      .in('medicamento_id', ids);

  if (errorCatalogo) {
    console.error(
      'RF24: error consultando catálogo de medicamentos asociados:',
      errorCatalogo
    );

    throw new Error(
      'No se pudo recuperar la información del catálogo de medicamentos.'
    );
  }

  const mapa = new Map(
    (catalogo ?? []).map((medicamento) => [
      Number(medicamento.medicamento_id),
      medicamento,
    ])
  );

  return lista.map((asociacion) => {
    const medicamento = mapa.get(
      Number(asociacion.medicamento_id)
    );

    return {
      ...asociacion,
      nombre_medicamento:
        medicamento?.nombre_medicamento ??
        'Medicamento no identificado',
      concentracion: medicamento?.concentracion ?? null,
      categoria: medicamento?.categoria ?? 'Medicamento',
    };
  });
}

/* ============================================================
   RF24 — VACUNAS ASOCIADAS
   ============================================================ */

async function consultarVacunasAsociadas(actividadId) {
  const { data: asociaciones, error } = await supabase
    .from('actividad_vacunacion')
    .select('actividad_id, medicamento_id, dosis')
    .eq('actividad_id', actividadId);

  if (error) {
    console.error(
      'RF24: error consultando vacunas asociadas:',
      error
    );

    throw new Error(
      'No se pudieron consultar las vacunas registradas para esta actividad.'
    );
  }

  const lista = Array.isArray(asociaciones)
    ? asociaciones
    : [];

  if (lista.length === 0) return [];

  const ids = [
    ...new Set(
      lista
        .map((item) => Number(item.medicamento_id))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];

  if (ids.length === 0) {
    return lista.map((item) => ({
      ...item,
      nombre_medicamento: 'Vacuna no identificada',
      concentracion: null,
      categoria: 'Vacuna',
    }));
  }

  const { data: catalogo, error: errorCatalogo } =
    await supabase
      .from('medicamentos')
      .select(
        'medicamento_id, nombre_medicamento, concentracion, categoria'
      )
      .in('medicamento_id', ids);

  if (errorCatalogo) {
    console.error(
      'RF24: error consultando catálogo de vacunas asociadas:',
      errorCatalogo
    );

    throw new Error(
      'No se pudo recuperar la información del catálogo de vacunas.'
    );
  }

  const mapa = new Map(
    (catalogo ?? []).map((medicamento) => [
      Number(medicamento.medicamento_id),
      medicamento,
    ])
  );

  return lista.map((asociacion) => {
    const vacuna = mapa.get(
      Number(asociacion.medicamento_id)
    );

    return {
      ...asociacion,
      nombre_medicamento:
        vacuna?.nombre_medicamento ??
        'Vacuna no identificada',
      concentracion: vacuna?.concentracion ?? null,
      categoria: vacuna?.categoria ?? 'Vacuna',
    };
  });
}

/* ============================================================
   RF10 — CONSULTAR ACTIVIDADES POR ESTADO
   ============================================================ */

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
      .select(SELECT_ACTIVIDAD_CON_TIPO);

    if (estado) {
      consulta = consulta.eq('estado', estado);
    }

    consulta = consulta.order('fecha_registro', {
      ascending: false,
    });

    const { data, error } = await consulta;

    if (error) {
      console.error('RF10: error consultando actividades:', error);
      throw new Error(MENSAJE_ERROR_ACTIVIDADES);
    }

    const vigentes = (data ?? []).filter(esActividadVigente);

    const enriquecidas =
      await enriquecerListaConCreadores(vigentes);

    return enriquecidas.sort((a, b) => {
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

    console.error('RF10: error inesperado:', error);
    throw new Error(MENSAJE_ERROR_ACTIVIDADES);
  }
}

/* ============================================================
   RF24 — CONSULTAR ACTIVIDADES DE UNA ATENCIÓN
   ============================================================ */

export async function consultarActividadesPorAtencion(atencionId) {
  validarIdentificador(
    atencionId,
    'No se indicó la atención que desea consultar.'
  );

  const actividades =
    await consultarActividadesVigentesSinEnriquecer(atencionId);

  return await enriquecerListaConCreadores(actividades);
}

/* ============================================================
   RF24 — CONSULTAR UNA ACTIVIDAD POR ID
   ============================================================ */

export async function consultarActividadPorId(actividadId) {
  validarIdentificador(
    actividadId,
    'No se indicó la actividad que desea consultar.'
  );

  try {
    const id = Number(actividadId);

    const { data, error } = await supabase
      .from('actividades')
      .select(SELECT_ACTIVIDAD_CON_TIPO)
      .eq('actividad_id', id)
      .maybeSingle();

    if (error) {
      console.error(
        'RF24: error consultando detalle de actividad:',
        error
      );

      throw new Error(
        'No se pudo consultar el detalle de la actividad.'
      );
    }

    if (!data || !esActividadVigente(data)) {
      throw new Error(
        'La actividad no existe o ya fue eliminada.'
      );
    }

    const actividad = normalizarActividadConTipo(data);
    const tipoCodigo = normalizarTipoParaConsulta(actividad);

    const datosAtencionMascota =
      await consultarDatosAtencionYMascota(actividad);

    let medicamentosAsociados = [];
    let vacunasAsociadas = [];

    if (tipoCodigo === 'MEDICACION') {
      medicamentosAsociados =
        await consultarMedicamentosAsociados(id);
    }

    if (tipoCodigo === 'VACUNACION') {
      vacunasAsociadas =
        await consultarVacunasAsociadas(id);
    }

    const actividadConCreador =
      await enriquecerActividadConCreador(actividad);

    return {
      ...actividadConCreador,
      mascota: datosAtencionMascota.mascota,
      nombre_mascota: datosAtencionMascota.nombre_mascota,
      numero_historia: datosAtencionMascota.numero_historia,
      atenciones: datosAtencionMascota.atenciones,
      estado_atencion: datosAtencionMascota.estado_atencion,
      detalle: normalizarDetalle(actividad.detalle),
      medicamentos_asociados: medicamentosAsociados,
      vacunas_asociadas: vacunasAsociadas,
    };
  } catch (error) {
    console.error(
      'RF24: error obteniendo actividad:',
      error
    );

    throw error;
  }
}

/* ============================================================
   VALIDAR ACTIVIDAD ABIERTA
   ============================================================ */

export async function validarQueNoExistaActividadAbierta(
  numeroHistoria
) {
  const historia = String(numeroHistoria ?? '')
    .trim()
    .toUpperCase();

  if (!historia) {
    throw new Error(
      'Debe indicar el número de historia de la mascota.'
    );
  }

  const { data, error } = await supabase
    .from('atenciones')
    .select('atencion_id')
    .eq('numero_historia', historia)
    .eq('estado', 'Activa')
    .limit(1);

  if (error) {
    console.error(
      'Error verificando atenciones activas:',
      error
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

/* ============================================================
   RF26 — VERIFICAR ATENCIÓN LISTA PARA FINALIZAR
   ============================================================ */

/**
 * Regla de negocio:
 *
 * 1. La atención debe existir.
 * 2. La atención debe estar Activa.
 * 3. Debe existir al menos una actividad vigente.
 * 4. Todas las actividades vigentes deben estar:
 *    - Completada
 *    - No realizada
 *
 * Las actividades eliminadas no participan en la validación.
 *
 * Esta función NO modifica la atención.
 */
export async function verificarAtencionListaParaFinalizar(
  atencionId
) {
  validarIdentificador(
    atencionId,
    'No se indicó la atención que desea verificar.'
  );

  const id = Number(atencionId);

  const { data: atencion, error: errorAtencion } = await supabase
    .from('atenciones')
    .select('atencion_id, estado, fecha_fin')
    .eq('atencion_id', id)
    .maybeSingle();

  if (errorAtencion) {
    console.error(
      'RF26: error verificando el estado de la atención:',
      errorAtencion
    );

    throw new Error(
      'No se pudo verificar el estado de la atención. Intente nuevamente.'
    );
  }

  if (!atencion) {
    throw new Error('La atención solicitada no existe.');
  }

  if (atencion.estado !== 'Activa') {
    return {
      listaParaFinalizar: false,
      atencionExiste: true,
      estadoAtencion: atencion.estado,
      fecha_fin: atencion.fecha_fin ?? null,
      totalActividades: 0,
      pendientes: 0,
      completadas: 0,
      noRealizadas: 0,
      estadosNoValidos: 0,
    };
  }

  const actividades =
    await consultarActividadesVigentesSinEnriquecer(id);

  const lista = actividades.filter(esActividadVigente);

  const pendientes = lista.filter(
    (actividad) =>
      normalizarEstadoActividad(actividad.estado) === 'pendiente'
  ).length;

  const completadas = lista.filter(
    (actividad) =>
      normalizarEstadoActividad(actividad.estado) === 'completada'
  ).length;

  const noRealizadas = lista.filter(
    (actividad) =>
      normalizarEstadoActividad(actividad.estado) === 'no realizada'
  ).length;

  const estadosNoValidos = lista.filter(
    (actividad) =>
      !ESTADOS_TERMINALES.some(
        (estado) =>
          normalizarEstadoActividad(estado) ===
          normalizarEstadoActividad(actividad.estado)
      )
  ).length;

  const listaParaFinalizar =
    lista.length > 0 &&
    estadosNoValidos === 0 &&
    pendientes === 0 &&
    lista.every((actividad) =>
      ESTADOS_TERMINALES.some(
        (estado) =>
          normalizarEstadoActividad(estado) ===
          normalizarEstadoActividad(actividad.estado)
      )
    );

  return {
    listaParaFinalizar,
    atencionExiste: true,
    estadoAtencion: atencion.estado,
    fecha_fin: atencion.fecha_fin ?? null,
    totalActividades: lista.length,
    pendientes,
    completadas,
    noRealizadas,
    estadosNoValidos,
  };
}

/* ============================================================
   RF25 — FINALIZAR ATENCIÓN SI CORRESPONDE
   ============================================================ */

/**
 * Esta función se ejecuta únicamente después de que el usuario
 * confirma la finalización desde la pantalla.
 *
 * No se invoca al completar la última actividad.
 */
export async function finalizarAtencionSiCorresponde(atencionId) {
  validarIdentificador(
    atencionId,
    'No se indicó la atención que desea finalizar.'
  );

  const id = Number(atencionId);

  const { data: atencion, error: errorAtencion } = await supabase
    .from('atenciones')
    .select('atencion_id, estado, fecha_fin')
    .eq('atencion_id', id)
    .maybeSingle();

  if (errorAtencion) {
    console.error(
      'RF25: error verificando la atención:',
      errorAtencion
    );

    throw new Error(
      'No se pudo verificar el estado de la atención. Intente nuevamente.'
    );
  }

  if (!atencion) {
    throw new Error('La atención solicitada no existe.');
  }

  if (atencion.estado === 'Finalizada') {
    return {
      finalizada: false,
      modificada: false,
      estado: 'Finalizada',
      fecha_fin: atencion.fecha_fin ?? null,
      listaParaFinalizar: false,
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
      fecha_fin: atencion.fecha_fin ?? null,
      listaParaFinalizar: false,
      totalActividades: 0,
      pendientes: 0,
      completadas: 0,
      noRealizadas: 0,
    };
  }

  // Revalidar en el servidor antes de modificar la atención.
  const resultado =
    await verificarAtencionListaParaFinalizar(id);

  if (!resultado.listaParaFinalizar) {
    return {
      finalizada: false,
      modificada: false,
      estado: 'Activa',
      ...resultado,
    };
  }

  const fechaFin = new Date().toISOString();

  const {
    data: atencionActualizada,
    error: errorActualizacion,
  } = await supabase
    .from('atenciones')
    .update({
      estado: 'Finalizada',
      fecha_fin: fechaFin,
    })
    .eq('atencion_id', id)
    .eq('estado', 'Activa')
    .select('atencion_id, estado, fecha_fin')
    .maybeSingle();

  if (errorActualizacion) {
    console.error(
      'RF25: error finalizando atención:',
      errorActualizacion
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
      fecha_fin: null,
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

/* ============================================================
   RF25 — ACTUALIZAR ESTADO DE ACTIVIDAD
   ============================================================ */

/**
 * Solo cambia el estado de la actividad.
 * No finaliza automáticamente la atención.
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

  const id = Number(actividadId);

  const { data: actividad, error: errorActividad } = await supabase
    .from('actividades')
    .select('actividad_id, atencion_id, estado, eliminado')
    .eq('actividad_id', id)
    .maybeSingle();

  if (errorActividad) {
    console.error(
      'RF25: error verificando actividad:',
      errorActividad
    );

    throw new Error(
      'No se pudo verificar la actividad. Intente nuevamente.'
    );
  }

  if (!actividad || !esActividadVigente(actividad)) {
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
      errorEstadoAtencion
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

  const fechaCompletada =
    nuevoEstado === 'Completada'
      ? new Date().toISOString()
      : null;

  const datosActualizacion = {
    estado: nuevoEstado,
    fecha_completada: fechaCompletada,
    motivo_no_realizada:
      nuevoEstado === 'No realizada' ? motivo : null,
  };

  const {
    data: actividadActualizada,
    error: errorActualizacion,
  } = await supabase
    .from('actividades')
    .update(datosActualizacion)
    .eq('actividad_id', id)
    .eq('estado', 'Pendiente')
    .select(SELECT_ACTIVIDAD_CON_TIPO)
    .maybeSingle();

  if (errorActualizacion) {
    console.error(
      'RF25: error actualizando actividad:',
      errorActualizacion
    );

    throw new Error(MENSAJE_ERROR_ACTUALIZACION);
  }

  if (
    !actividadActualizada ||
    !esActividadVigente(actividadActualizada)
  ) {
    throw new Error(
      'La actividad cambió mientras se procesaba la solicitud. Actualiza la pantalla e inténtalo nuevamente.'
    );
  }

  return {
    ...normalizarActividadConTipo(actividadActualizada),
    fecha_completada:
      actividadActualizada.fecha_completada ?? null,
    atencion_id: actividad.atencion_id,
    atencion_finalizada: false,
  };
}

/* ============================================================
   CONSULTAR ESTADO DE ACTIVIDAD
   ============================================================ */

export async function consultarEstadoActividad(actividadId) {
  validarIdentificador(
    actividadId,
    'No se indicó la actividad que desea consultar.'
  );

  const { data, error } = await supabase
    .from('actividades')
    .select('actividad_id, atencion_id, estado, eliminado')
    .eq('actividad_id', Number(actividadId))
    .maybeSingle();

  if (error) {
    console.error(
      'Error consultando estado de actividad:',
      error
    );

    throw new Error(
      'No se pudo consultar el estado de la actividad.'
    );
  }

  if (!data || !esActividadVigente(data)) {
    throw new Error(
      'La actividad no existe o ya no está disponible.'
    );
  }

  return data;
}

/* ============================================================
   RF29 — REGISTRAR ACTIVIDAD
   ============================================================ */

export async function registrarActividad(datos) {
  if (
    !datos ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    throw new Error(
      'Debes proporcionar los datos de la actividad.'
    );
  }

  validarIdentificador(
    datos.atencion_id,
    'Debes seleccionar una atención.'
  );

  validarIdentificador(
    datos.tipo_id,
    'Debes seleccionar el tipo de actividad.'
  );

  const usuario = await obtenerUsuarioAutenticado();

  const { codigo, tipoBD } =
    await obtenerTipoCompatibleBD(datos);

  const registro = {
    atencion_id: Number(datos.atencion_id),
    tipo_id: Number(datos.tipo_id),
    tipo: tipoBD,
    fecha_prevista: datos.fecha_prevista ?? null,
    observaciones: String(datos.observaciones ?? '').trim(),
    estado: 'Pendiente',
    eliminado: false,
    detalle: datos.detalle ?? {},
    creado_por: usuario.id,
  };

  const { data, error } = await supabase
    .from('actividades')
    .insert(registro)
    .select(SELECT_ACTIVIDAD_CON_TIPO)
    .single();

  if (error) {
    console.error(
      'RF29: error al registrar actividad:',
      {
        error,
        codigoTipo: codigo,
        tipoEnviadoBD: tipoBD,
        registro,
      }
    );

    throw error;
  }

  return await enriquecerActividadConCreador(data);
}

/* ============================================================
   CATÁLOGO DE MEDICAMENTOS Y VACUNAS
   ============================================================ */

export async function consultarCatalogoMedicamentos(categoria) {
  const categoriasPermitidas = ['Medicamento', 'Vacuna'];

  if (!categoriasPermitidas.includes(categoria)) {
    throw new Error('La categoría del catálogo no es válida.');
  }

  const { data, error } = await supabase
    .from('medicamentos')
    .select(
      'medicamento_id, nombre_medicamento, concentracion, categoria'
    )
    .eq('categoria', categoria)
    .eq('activo', true)
    .order('nombre_medicamento', { ascending: true });

  if (error) {
    console.error(
      'Error consultando catálogo de medicamentos:',
      error
    );

    throw new Error(
      `No se pudo consultar el catálogo de ${categoria.toLowerCase()}s.`
    );
  }

  return Array.isArray(data) ? data : [];
}

/* ============================================================
   RF29 — REGISTRAR ACTIVIDAD DE VACUNACIÓN
   ============================================================ */

export async function registrarVacunacionActividad(datos) {
  if (
    !datos ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    throw new Error(
      'Debes proporcionar los datos de la vacunación.'
    );
  }

  validarIdentificador(
    datos.atencion_id,
    'Debes seleccionar una atención.'
  );

  validarIdentificador(
    datos.tipo_id,
    'Debes seleccionar el tipo de actividad.'
  );

  if (!Array.isArray(datos.vacunas) || datos.vacunas.length === 0) {
    throw new Error('Seleccione al menos una vacuna.');
  }

  const vacunas = datos.vacunas.map((vacuna) => ({
    medicamento_id: vacuna.medicamento_id,
    dosis: String(vacuna.dosis ?? '').trim(),
  }));

  const identificadores = vacunas.map(
    (vacuna) => String(vacuna.medicamento_id ?? '')
  );

  if (
    identificadores.some((id) => !id) ||
    new Set(identificadores).size !== identificadores.length
  ) {
    throw new Error(
      'Seleccione vacunas válidas y no repita una misma vacuna.'
    );
  }

  for (const vacuna of vacunas) {
    if (!vacuna.dosis) {
      throw new Error('Ingrese la dosis de cada vacuna.');
    }
  }

  const { data, error } = await supabase.rpc(
    'registrar_vacunacion_actividad',
    {
      p_atencion_id: Number(datos.atencion_id),
      p_tipo_id: Number(datos.tipo_id),
      p_fecha_prevista: datos.fecha_prevista ?? null,
      p_observaciones: String(datos.observaciones ?? '').trim(),
      p_detalle: datos.detalle ?? {},
      p_vacunas: vacunas,
    }
  );

  if (error) {
    console.error(
      'Error registrando actividad de vacunación:',
      error
    );

    throw error;
  }

  return data;
}

/* ============================================================
   RF53 — REGISTRAR POSOLOGÍA
   ============================================================ */

export async function registrarPosologiaActividad(datos) {
  if (
    !datos ||
    typeof datos !== 'object' ||
    Array.isArray(datos)
  ) {
    throw new Error(
      'Debes proporcionar los datos de la posología.'
    );
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
    throw new Error('Seleccione un medicamento.');
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

  if (
    medicamentoIds.some((id) => !id) ||
    new Set(medicamentoIds).size !== medicamentoIds.length
  ) {
    throw new Error(
      'Seleccione medicamentos válidos sin repetirlos.'
    );
  }

  for (const medicamento of medicamentos) {
    if (!medicamento.dosis) {
      throw new Error('Ingrese la dosis del medicamento.');
    }

    if (!medicamento.frecuencia) {
      throw new Error('Ingrese la frecuencia del medicamento.');
    }

    if (!medicamento.via_administracion) {
      throw new Error(
        'Ingrese la vía de administración del medicamento.'
      );
    }
  }

  const { data, error } = await supabase.rpc(
    'registrar_posologia_actividad',
    {
      p_atencion_id: Number(datos.atencion_id),
      p_tipo_id: Number(datos.tipo_id),
      p_fecha_prevista: datos.fecha_prevista ?? null,
      p_observaciones: String(datos.observaciones ?? '').trim(),
      p_detalle: {
        ...(datos.detalle ?? {}),
        duracion: datos.duracion ?? null,
        condicion_ingesta: datos.condicion_ingesta ?? null,
      },
      p_medicamentos: medicamentos,
    }
  );

  if (error) {
    console.error(
      '[RF53] Error de Supabase al registrar posología:',
      error
    );

    throw new Error(error.message);
  }

  if (!data || data.success !== true || !data.actividad_id) {
    console.error(
      '[RF53] Respuesta inesperada de registrar_posologia_actividad:',
      data
    );

    throw new Error(
      'Supabase no confirmó el registro de la medicación.'
    );
  }

  console.log(
    '[RF53] Posología registrada correctamente:',
    data
  );

  return data;
}

/* ============================================================
   RF43 — SUSCRIPCIÓN A CAMBIOS EN TIEMPO REAL
   ============================================================ */

export function suscribirCambiosAtencion(atencionId, callback) {
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

  function procesarEvento(payload, tabla, tipoEvento) {
    try {
      callback({
        ...payload,
        table: tabla,
        eventType: tipoEvento,
      });
    } catch (error) {
      console.error(
        `RF43: error procesando evento ${tipoEvento} de ${tabla}:`,
        error
      );
    }
  }

  canal.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'actividades',
      filter: `atencion_id=eq.${identificador}`,
    },
    (payload) =>
      procesarEvento(payload, 'actividades', 'INSERT')
  );

  canal.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'actividades',
      filter: `atencion_id=eq.${identificador}`,
    },
    (payload) =>
      procesarEvento(payload, 'actividades', 'UPDATE')
  );

  canal.on(
    'postgres_changes',
    {
      event: 'DELETE',
      schema: 'public',
      table: 'actividades',
    },
    (payload) => {
      if (String(payload?.old?.atencion_id) === identificador) {
        procesarEvento(payload, 'actividades', 'DELETE');
      }
    }
  );

  canal.on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'atenciones',
      filter: `atencion_id=eq.${identificador}`,
    },
    (payload) =>
      procesarEvento(payload, 'atenciones', 'INSERT')
  );

  canal.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'atenciones',
      filter: `atencion_id=eq.${identificador}`,
    },
    (payload) =>
      procesarEvento(payload, 'atenciones', 'UPDATE')
  );

  canal.on(
    'postgres_changes',
    {
      event: 'DELETE',
      schema: 'public',
      table: 'atenciones',
    },
    (payload) => {
      if (String(payload?.old?.atencion_id) === identificador) {
        procesarEvento(payload, 'atenciones', 'DELETE');
      }
    }
  );

  let resolverReady;
  let rechazarReady;
  let conexionFinalizada = false;

  const ready = new Promise((resolve, reject) => {
    resolverReady = resolve;
    rechazarReady = reject;
  });

  canal.subscribe((estado, error) => {
    if (estado === 'SUBSCRIBED' && !conexionFinalizada) {
      conexionFinalizada = true;

      console.log(
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

      console.error(
        'RF43: no se pudo establecer la conexión:',
        error || estado
      );

      rechazarReady(
        error ||
        new Error(`No se pudo establecer Realtime: ${estado}`)
      );
    }
  });

  return {
    channel: canal,
    ready,
  };
}

export async function cancelarSuscripcionAtencion(suscripcion) {
  if (!suscripcion) return false;

  const canal = suscripcion.channel || suscripcion;

  try {
    return await supabase.removeChannel(canal);
  } catch (error) {
    console.error(
      'RF43: error cancelando la suscripción:',
      error
    );

    throw new Error(
      'No se pudo cerrar la suscripción de seguimiento.'
    );
  }
}

/* ============================================================
   RF11 — ACTIVIDADES PRÓXIMAS A VENCER
   ============================================================ */

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
    .select(SELECT_ACTIVIDAD_CON_TIPO)
    .eq('estado', 'Pendiente')
    .gte('fecha_prevista', fechaActual)
    .lte('fecha_prevista', fechaLimite)
    .order('fecha_prevista', { ascending: true });

  if (error) {
    console.error(
      'RF11: error consultando actividades próximas a vencer:',
      error
    );

    throw new Error(
      'No se pudo verificar el vencimiento de la actividad.'
    );
  }

  const vigentes = (data ?? []).filter(esActividadVigente);

  return await enriquecerListaConCreadores(vigentes);
}

/* ============================================================
   RF30 — CONSULTAR TIPOS DE ACTIVIDAD
   ============================================================ */

export async function consultarTiposActividad() {
  const { data, error } = await supabase
    .from('tipos_actividad')
    .select('tipo_id, codigo, nombre')
    .order('tipo_id', { ascending: true });

  if (error) {
    console.error(
      'Error consultando tipos de actividad:',
      error
    );

    throw error;
  }

  return Array.isArray(data) ? data : [];
}

/* ============================================================
   RF25 — REACTIVAR ACTIVIDAD
   ============================================================ */

export async function reactivarActividad(actividadId) {
  validarIdentificador(
    actividadId,
    'No se indicó la actividad que desea reactivar.'
  );

  const id = Number(actividadId);

  const { data: actividad, error: errorActividad } =
    await supabase
      .from('actividades')
      .select('actividad_id, atencion_id, estado, eliminado')
      .eq('actividad_id', id)
      .maybeSingle();

  if (errorActividad) {
    console.error(
      'RF25: error verificando actividad para reactivación:',
      errorActividad
    );

    throw new Error(
      'No se pudo verificar la actividad. Intente nuevamente.'
    );
  }

  if (!actividad || !esActividadVigente(actividad)) {
    throw new Error(
      'La actividad no existe o ya no está disponible.'
    );
  }

  if (actividad.estado !== 'No realizada') {
    throw new Error(
      'Solo se pueden reactivar actividades marcadas como No realizada.'
    );
  }

  const { data: atencion, error: errorAtencion } =
    await supabase
      .from('atenciones')
      .select('atencion_id, estado')
      .eq('atencion_id', actividad.atencion_id)
      .maybeSingle();

  if (errorAtencion) {
    console.error(
      'RF25: error verificando atención para reactivación:',
      errorAtencion
    );

    throw new Error(
      'No se pudo verificar el estado de la atención. Intente nuevamente.'
    );
  }

  if (!atencion || atencion.estado !== 'Activa') {
    throw new Error(
      'No se pueden reactivar actividades de una atención finalizada.'
    );
  }

  const {
    data: actividadActualizada,
    error: errorActualizacion,
  } = await supabase
    .from('actividades')
    .update({
      estado: 'Pendiente',
      motivo_no_realizada: null,
      fecha_completada: null,
    })
    .eq('actividad_id', id)
    .eq('estado', 'No realizada')
    .select(SELECT_ACTIVIDAD_CON_TIPO)
    .maybeSingle();

  if (errorActualizacion) {
    console.error(
      'RF25: error reactivando actividad:',
      errorActualizacion
    );

    throw new Error(
      'No se pudo reactivar la actividad. Intente nuevamente.'
    );
  }

  if (
    !actividadActualizada ||
    !esActividadVigente(actividadActualizada)
  ) {
    throw new Error(
      'La actividad cambió mientras se procesaba la solicitud. Actualiza la pantalla e inténtalo nuevamente.'
    );
  }

  return await enriquecerActividadConCreador({
    ...normalizarActividadConTipo(actividadActualizada),
    fecha_completada: null,
  });
}

/* ============================================================
   RF32 — EDITAR ACTIVIDAD
   ============================================================ */

export async function editarActividad(
  actividadId,
  datosActualizacion
) {
  validarIdentificador(
    actividadId,
    'No se indicó la actividad que desea editar.'
  );

  if (
    !datosActualizacion ||
    typeof datosActualizacion !== 'object' ||
    Array.isArray(datosActualizacion)
  ) {
    throw new Error(
      'Los datos de actualización no tienen un formato válido.'
    );
  }

  const camposPermitidos = [
    'fecha_prevista',
    'observaciones',
    'detalle',
    'medicamentos',
    'vacunas',
  ];

  const camposRecibidos = Object.keys(datosActualizacion);

  const camposNoPermitidos = camposRecibidos.filter(
    (campo) => !camposPermitidos.includes(campo)
  );

  if (camposNoPermitidos.length > 0) {
    throw new Error(
      `No está permitido modificar estos campos: ${camposNoPermitidos.join(', ')}.`
    );
  }

  if (camposRecibidos.length === 0) {
    throw new Error(
      'No se proporcionaron campos para actualizar.'
    );
  }

  const id = Number(actividadId);

  const { data: actividad, error: errorActividad } =
    await supabase
      .from('actividades')
      .select(`
        actividad_id,
        atencion_id,
        tipo,
        tipo_id,
        estado,
        fecha_prevista,
        observaciones,
        detalle,
        eliminado,
        tipos_actividad (
          tipo_id,
          codigo,
          nombre
        )
      `)
      .eq('actividad_id', id)
      .maybeSingle();

  if (errorActividad) {
    console.error(
      'RF32: error consultando actividad:',
      errorActividad
    );

    throw new Error(
      'No se pudo verificar la actividad. Intente nuevamente.'
    );
  }

  if (!actividad || !esActividadVigente(actividad)) {
    throw new Error(
      'La actividad no existe o ya no está disponible.'
    );
  }

  if (
    !['Pendiente', 'No realizada'].includes(actividad.estado)
  ) {
    throw new Error(
      'Solo se pueden editar actividades Pendientes o No realizadas.'
    );
  }

  const { data: atencion, error: errorAtencion } =
    await supabase
      .from('atenciones')
      .select('atencion_id, estado')
      .eq('atencion_id', actividad.atencion_id)
      .maybeSingle();

  if (errorAtencion) {
    console.error(
      'RF32: error verificando atención:',
      errorAtencion
    );

    throw new Error(
      'No se pudo verificar el estado de la atención.'
    );
  }

  if (!atencion || atencion.estado !== 'Activa') {
    throw new Error(
      'No se pueden editar actividades de una atención finalizada.'
    );
  }

  const tipoCodigo = normalizarTipoParaConsulta(actividad);
  const actualizacion = {};

  if (
    Object.prototype.hasOwnProperty.call(
      datosActualizacion,
      'fecha_prevista'
    )
  ) {
    const fecha = String(
      datosActualizacion.fecha_prevista ?? ''
    ).trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new Error(
        'La fecha prevista no tiene un formato válido.'
      );
    }

    const [anio, mes, dia] = fecha.split('-').map(Number);

    const comprobacion = new Date(
      Date.UTC(anio, mes - 1, dia)
    );

    if (
      !anio ||
      comprobacion.getUTCFullYear() !== anio ||
      comprobacion.getUTCMonth() !== mes - 1 ||
      comprobacion.getUTCDate() !== dia
    ) {
      throw new Error(
        'La fecha prevista no es válida.'
      );
    }

    actualizacion.fecha_prevista = fecha;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      datosActualizacion,
      'observaciones'
    )
  ) {
    if (
      typeof datosActualizacion.observaciones !== 'string'
    ) {
      throw new Error(
        'La descripción de la actividad debe ser texto.'
      );
    }

    const descripcion =
      datosActualizacion.observaciones.trim();

    if (!descripcion) {
      throw new Error(
        'La descripción de la actividad es obligatoria.'
      );
    }

    actualizacion.observaciones = descripcion;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      datosActualizacion,
      'detalle'
    )
  ) {
    const detalleNuevo = datosActualizacion.detalle;

    if (
      !detalleNuevo ||
      typeof detalleNuevo !== 'object' ||
      Array.isArray(detalleNuevo)
    ) {
      throw new Error(
        'El detalle de la actividad no tiene un formato válido.'
      );
    }

    actualizacion.detalle = {
      ...normalizarDetalle(actividad.detalle),
      ...detalleNuevo,
    };
  }

  let medicamentoValidado = null;

  if (
    Object.prototype.hasOwnProperty.call(
      datosActualizacion,
      'medicamentos'
    )
  ) {
    if (tipoCodigo !== 'MEDICACION') {
      throw new Error(
        'Los medicamentos solo se pueden modificar en actividades de Medicación.'
      );
    }

    const medicamentos = datosActualizacion.medicamentos;

    if (
      !Array.isArray(medicamentos) ||
      medicamentos.length !== 1
    ) {
      throw new Error(
        'La edición debe contener exactamente el medicamento registrado en la actividad.'
      );
    }

    const item = medicamentos[0];

    medicamentoValidado = {
      medicamento_id: Number(item.medicamento_id),
      dosis: String(item.dosis ?? '').trim(),
      frecuencia: String(item.frecuencia ?? '').trim(),
      via_administracion: String(
        item.via_administracion ?? ''
      ).trim(),
    };

    if (
      !Number.isInteger(medicamentoValidado.medicamento_id) ||
      medicamentoValidado.medicamento_id <= 0
    ) {
      throw new Error(
        'El medicamento seleccionado no es válido.'
      );
    }

    if (
      !medicamentoValidado.dosis ||
      !medicamentoValidado.frecuencia ||
      !medicamentoValidado.via_administracion
    ) {
      throw new Error(
        'Complete la dosis, frecuencia y vía de administración.'
      );
    }

    const {
      data: medicamentoCatalogo,
      error: errorCatalogo,
    } = await supabase
      .from('medicamentos')
      .select('medicamento_id')
      .eq(
        'medicamento_id',
        medicamentoValidado.medicamento_id
      )
      .maybeSingle();

    if (errorCatalogo) {
      console.error(
        'RF32: error verificando catálogo de medicamentos:',
        errorCatalogo
      );

      throw new Error(
        'No se pudo verificar el medicamento seleccionado.'
      );
    }

    if (!medicamentoCatalogo) {
      throw new Error(
        'El medicamento seleccionado no existe en el catálogo.'
      );
    }
  }

  let vacunasValidadas = null;

  if (
    Object.prototype.hasOwnProperty.call(
      datosActualizacion,
      'vacunas'
    )
  ) {
    if (tipoCodigo !== 'VACUNACION') {
      throw new Error(
        'Las vacunas solo se pueden modificar en actividades de Vacunación.'
      );
    }

    const vacunas = datosActualizacion.vacunas;

    if (!Array.isArray(vacunas) || vacunas.length === 0) {
      throw new Error(
        'Debe registrar al menos una vacuna.'
      );
    }

    vacunasValidadas = vacunas.map((item) => ({
      medicamento_id: Number(item.medicamento_id),
      dosis: String(item.dosis ?? '').trim(),
    }));

    const ids = vacunasValidadas.map(
      (item) => item.medicamento_id
    );

    if (
      ids.some(
        (itemId) =>
          !Number.isInteger(itemId) || itemId <= 0
      ) ||
      new Set(ids).size !== ids.length
    ) {
      throw new Error(
        'Seleccione vacunas válidas sin repetirlas.'
      );
    }

    if (
      vacunasValidadas.some((vacuna) => !vacuna.dosis)
    ) {
      throw new Error(
        'Ingrese la dosis de cada vacuna.'
      );
    }
  }

  if (medicamentoValidado !== null) {
    const {
      data: medicamentoExistente,
      error: errorConsultarMedicamento,
    } = await supabase
      .from('actividad_medicacion')
      .select(
        'actividad_id, medicamento_id, dosis, frecuencia, via_administracion'
      )
      .eq('actividad_id', id);

    if (errorConsultarMedicamento) {
      console.error(
        'RF32: error consultando asociación de medicamento:',
        errorConsultarMedicamento
      );

      throw new Error(
        'No se pudo consultar el medicamento registrado en la actividad.'
      );
    }

    if (
      !Array.isArray(medicamentoExistente) ||
      medicamentoExistente.length !== 1
    ) {
      throw new Error(
        'La actividad debe tener exactamente un medicamento registrado para poder editarlo.'
      );
    }

    const asociacionActual = medicamentoExistente[0];

    if (
      Number(asociacionActual.medicamento_id) !==
      medicamentoValidado.medicamento_id
    ) {
      throw new Error(
        'No se puede cambiar el medicamento asociado durante la edición. Solo puedes modificar su dosis, frecuencia y vía de administración.'
      );
    }

    const {
      data: medicamentoActualizado,
      error: errorActualizarMedicamento,
    } = await supabase
      .from('actividad_medicacion')
      .update({
        dosis: medicamentoValidado.dosis,
        frecuencia: medicamentoValidado.frecuencia,
        via_administracion:
          medicamentoValidado.via_administracion,
      })
      .eq('actividad_id', id)
      .eq(
        'medicamento_id',
        asociacionActual.medicamento_id
      )
      .select(
        'actividad_id, medicamento_id, dosis, frecuencia, via_administracion'
      )
      .maybeSingle();

    if (errorActualizarMedicamento) {
      console.error(
        '[PetCare RF32] Error actualizando medicamento:',
        errorActualizarMedicamento
      );

      throw new Error(
        `No se pudo actualizar el medicamento: ${errorActualizarMedicamento.message}`
      );
    }

    if (!medicamentoActualizado) {
      throw new Error(
        'No se actualizó el medicamento. Verifica los permisos de modificación de la tabla actividad_medicacion.'
      );
    }
  }

  if (vacunasValidadas !== null) {
    const {
      data: vacunasExistentes,
      error: errorConsultarVacunas,
    } = await supabase
      .from('actividad_vacunacion')
      .select('actividad_id, medicamento_id, dosis')
      .eq('actividad_id', id);

    if (errorConsultarVacunas) {
      console.error(
        'RF32: error consultando vacunas existentes:',
        errorConsultarVacunas
      );

      throw new Error(
        'No se pudieron consultar las vacunas registradas.'
      );
    }

    const idsExistentes = (vacunasExistentes ?? [])
      .map((item) => Number(item.medicamento_id))
      .sort((a, b) => a - b);

    const idsNuevos = vacunasValidadas
      .map((item) => item.medicamento_id)
      .sort((a, b) => a - b);

    if (
      idsExistentes.length !== idsNuevos.length ||
      idsExistentes.some(
        (itemId, indice) => itemId !== idsNuevos[indice]
      )
    ) {
      throw new Error(
        'Durante la edición solo se pueden modificar las dosis de las vacunas ya registradas. No se pueden agregar ni sustituir vacunas.'
      );
    }

    for (const vacuna of vacunasValidadas) {
      const {
        data: vacunaActualizada,
        error: errorActualizarVacuna,
      } = await supabase
        .from('actividad_vacunacion')
        .update({
          dosis: vacuna.dosis,
        })
        .eq('actividad_id', id)
        .eq('medicamento_id', vacuna.medicamento_id)
        .select(
          'actividad_id, medicamento_id, dosis'
        )
        .maybeSingle();

      if (errorActualizarVacuna) {
        console.error(
          'RF32: error actualizando vacuna:',
          errorActualizarVacuna
        );

        throw new Error(
          `No se pudo actualizar la vacuna: ${errorActualizarVacuna.message}`
        );
      }

      if (!vacunaActualizada) {
        throw new Error(
          'No se pudo actualizar una de las vacunas. Verifica los permisos de modificación.'
        );
      }
    }
  }

  if (Object.keys(actualizacion).length > 0) {
    const {
      data: actividadActualizada,
      error: errorActualizarActividad,
    } = await supabase
      .from('actividades')
      .update(actualizacion)
      .eq('actividad_id', id)
      .eq('estado', actividad.estado)
      .select(SELECT_ACTIVIDAD_CON_TIPO)
      .maybeSingle();

    if (errorActualizarActividad) {
      console.error(
        'RF32: error actualizando datos generales:',
        errorActualizarActividad
      );

      throw new Error(
        'No se pudieron actualizar los datos de la actividad.'
      );
    }

    if (
      !actividadActualizada ||
      !esActividadVigente(actividadActualizada)
    ) {
      throw new Error(
        'La actividad cambió mientras se procesaba la solicitud. Actualiza la pantalla e inténtalo nuevamente.'
      );
    }
  }

  return await consultarActividadPorId(id);
}

/* ============================================================
   GESTIÓN — ELIMINAR ACTIVIDAD LÓGICAMENTE
   ============================================================ */

export async function eliminarActividad(actividadId) {
  validarIdentificador(
    actividadId,
    'No se indicó la actividad que desea eliminar.'
  );

  const id = Number(actividadId);

  const { data: actividad, error: errorActividad } =
    await supabase
      .from('actividades')
      .select('actividad_id, atencion_id, estado, eliminado')
      .eq('actividad_id', id)
      .maybeSingle();

  if (errorActividad) {
    console.error(
      'Error verificando actividad para eliminación:',
      errorActividad
    );

    throw new Error(
      'No se pudo verificar la actividad. Intente nuevamente.'
    );
  }

  if (!actividad || !esActividadVigente(actividad)) {
    throw new Error(
      'La actividad no existe o ya fue eliminada.'
    );
  }

  const {
    data: actividadEliminada,
    error: errorEliminacion,
  } = await supabase
    .from('actividades')
    .update({ eliminado: true })
    .eq('actividad_id', id)
    .eq('estado', actividad.estado)
    .select('actividad_id, atencion_id, estado, eliminado')
    .maybeSingle();

  if (errorEliminacion) {
    console.error(
      'Error realizando eliminación lógica de actividad:',
      errorEliminacion
    );

    throw new Error(
      'No se pudo eliminar la actividad. Intente nuevamente.'
    );
  }

  if (!actividadEliminada) {
    throw new Error(
      'La actividad cambió mientras se procesaba la solicitud. Actualiza la pantalla e inténtalo nuevamente.'
    );
  }

  return {
    ...actividadEliminada,
    eliminacion_logica: true,
    registros_clinicos_conservados: true,
  };
}
