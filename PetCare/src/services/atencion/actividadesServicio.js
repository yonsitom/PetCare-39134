
/**
 * PETCARE - SERVICIO DE ACTIVIDADES
 * Arquitectura: Vista -> Controlador -> Servicio -> DAO -> Supabase.
 * RF10, RF24, RF25, RF26, RF29, RF32, RF39, RF53 y RF55.
 */

import {
  consultarActividadesPorEstado,
  consultarActividadesPorAtencion,
  consultarActividadPorId,
  actualizarEstadoActividad,
  reactivarActividad,
  registrarActividad,
  consultarCatalogoMedicamentos,
  registrarVacunacionActividad,
  registrarPosologiaActividad,
  consultarTiposActividad,
  editarActividad as editarActividadDAO,
  eliminarActividad as eliminarActividadDAO,
  verificarAtencionListaParaFinalizar,
  finalizarAtencionSiCorresponde,
} from '../../dao/actividades/actividadesDAO';

import {
  consultarDatosConsulta as consultarDatosConsultaDAO,
  actualizarDatosConsulta as actualizarDatosConsultaDAO,
} from '../../dao/atencion/atencionesDAO';

/* ============================================================
   UTILIDADES
   ============================================================ */

function validarIdentificador(valor, nombre = 'Identificador') {
  const id = Number(valor);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${nombre} no válido.`);
  }

  return id;
}

function normalizarFechaPrevista(valor) {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw new Error('La fecha prevista es obligatoria.');
  }

  const fecha = valor.trim();
  let anio;
  let mes;
  let dia;

  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    [anio, mes, dia] = fecha.split('-').map(Number);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)) {
    [dia, mes, anio] = fecha.split('/').map(Number);
  } else {
    throw new Error('La fecha prevista no es válida.');
  }

  const comprobacion = new Date(Date.UTC(anio, mes - 1, dia));

  if (
    comprobacion.getUTCFullYear() !== anio ||
    comprobacion.getUTCMonth() !== mes - 1 ||
    comprobacion.getUTCDate() !== dia
  ) {
    throw new Error('La fecha prevista no es válida.');
  }

  return [
    String(anio).padStart(4, '0'),
    String(mes).padStart(2, '0'),
    String(dia).padStart(2, '0'),
  ].join('-');
}

function obtenerFechaActualLima() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const valores = Object.fromEntries(
    partes
      .filter((parte) => parte.type !== 'literal')
      .map((parte) => [parte.type, parte.value])
  );

  return `${valores.year}-${valores.month}-${valores.day}`;
}

function validarModoProgramacion(datos, fechaPrevista) {
  if (datos.modo_programacion === undefined) return;

  const modo = String(datos.modo_programacion).trim().toUpperCase();
  const hoy = obtenerFechaActualLima();

  if (modo === 'HOY') {
    if (fechaPrevista !== hoy) {
      throw new Error(
        'La actividad configurada para realizar hoy debe tener la fecha actual.'
      );
    }
    return;
  }

  if (modo === 'FUTURA') {
    if (fechaPrevista <= hoy) {
      throw new Error(
        'La fecha programada debe ser posterior al día de hoy.'
      );
    }
    return;
  }

  throw new Error('El modo de programación no es válido.');
}

function normalizarCodigoTipo(datos) {
  const texto = String(datos.tipo_codigo ?? datos.tipo ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (texto.includes('CONSULTA')) return 'CONSULTA';

  if (texto.includes('MEDICACION') || texto.includes('MEDICAMENTO')) {
    return 'MEDICACION';
  }

  if (texto.includes('VACUNACION') || texto.includes('VACUNA')) {
    return 'VACUNACION';
  }

  if (texto.includes('ECOGRAFIA')) return 'ECOGRAFIA';
  if (texto.includes('ESTERILIZACION')) return 'ESTERILIZACION';

  if (
    texto === 'OTRO' ||
    texto === 'OTROS' ||
    texto.startsWith('OTRO ')
  ) {
    return 'OTRO';
  }

  return texto;
}

function validarDescripcionActividad(valor) {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw new Error('La descripción es obligatoria.');
  }

  return valor.trim();
}

function validarEstadoActividad(estado) {
  const permitidos = ['Pendiente', 'Completada', 'No realizada'];

  if (!permitidos.includes(estado)) {
    throw new Error('El estado indicado no es válido.');
  }

  return estado;
}

function validarObjeto(
  datos,
  mensaje = 'Los datos proporcionados no son válidos.'
) {
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new Error(mensaje);
  }

  return datos;
}

function normalizarDetalle(datos) {
  if (datos && typeof datos === 'object' && !Array.isArray(datos)) {
    return datos;
  }

  if (typeof datos === 'string') {
    try {
      const convertido = JSON.parse(datos);

      if (
        convertido &&
        typeof convertido === 'object' &&
        !Array.isArray(convertido)
      ) {
        return convertido;
      }
    } catch (error) {
      console.warn('[PetCare] No se pudo interpretar el detalle:', error);
    }
  }

  return {};
}

function validarListaAsociaciones(lista, nombre) {
  if (lista === undefined) return undefined;

  if (!Array.isArray(lista)) {
    throw new Error(`La lista de ${nombre} no es válida.`);
  }

  if (lista.length === 0) {
    throw new Error(`Debe agregar al menos un elemento de ${nombre}.`);
  }

  return lista.map((elemento) => {
    validarObjeto(elemento, `Los datos de ${nombre} no son válidos.`);

    return {
      ...elemento,
      medicamento_id: validarIdentificador(
        elemento.medicamento_id,
        'El medicamento'
      ),
      dosis: String(elemento.dosis ?? '').trim(),
    };
  });
}

/**
 * Normaliza los datos clínicos editables.
 *
 * El diagnóstico y las recomendaciones pertenecen a recetas.
 * proxima_cita ya no forma parte del modelo de recetas.
 */
function normalizarDatosConsultaEdicion(datos) {
  validarObjeto(datos, 'Los datos de la consulta no son válidos.');

  const resultado = {};
  const equivalencias = [
    ['motivo_consulta', 'motivoConsulta'],
    ['sintomas', 'sintomas'],
    ['peso', 'peso'],
    ['temperatura', 'temperatura'],
    ['diagnostico', 'diagnostico'],
    ['recomendaciones', 'recomendaciones'],
    ['observaciones', 'observaciones'],
  ];

  for (const [campoBD, campoVista] of equivalencias) {
    if (datos[campoBD] !== undefined) {
      resultado[campoBD] = datos[campoBD];
    } else if (datos[campoVista] !== undefined) {
      resultado[campoBD] = datos[campoVista];
    }
  }

  if (Object.keys(resultado).length === 0) {
    throw new Error('No se recibieron campos clínicos para actualizar.');
  }

  return resultado;
}

/* ============================================================
   RF10 - CONSULTAR ACTIVIDADES
   ============================================================ */

export async function obtenerActividadesPorEstado(estado) {
  validarEstadoActividad(estado);

  try {
    const actividades = await consultarActividadesPorEstado(estado);

    if (!Array.isArray(actividades)) {
      throw new Error('Respuesta inválida del DAO.');
    }

    return actividades.filter(
      (actividad) => actividad && actividad.eliminado !== true
    );
  } catch (error) {
    if (error?.message === 'El estado indicado no es válido.') {
      throw error;
    }

    throw new Error(
      'No se pudo cargar el resumen de actividades. Intente nuevamente.'
    );
  }
}

export async function obtenerActividadesPorAtencion(atencionId) {
  const id = validarIdentificador(atencionId, 'La atención');
  const actividades = await consultarActividadesPorAtencion(id);

  if (!Array.isArray(actividades)) {
    throw new Error(
      'No se pudieron consultar las actividades de la atención.'
    );
  }

  return actividades.filter(
    (actividad) => actividad && actividad.eliminado !== true
  );
}

/* ============================================================
   RF24 - DETALLE DE ACTIVIDAD Y CONSULTA
   ============================================================ */

export async function consultarDatosConsultaServicio(actividadId) {
  const id = validarIdentificador(actividadId, 'La actividad');
  return consultarDatosConsultaDAO(id);
}

export async function obtenerDetalleActividadServicio(actividadId) {
  const id = validarIdentificador(actividadId, 'La actividad');

  try {
    const actividad = await consultarActividadPorId(id);

    if (!actividad) {
      throw new Error('No se encontró la actividad solicitada.');
    }

    const detalle = normalizarDetalle(actividad.detalle);

    const codigoTipo = normalizarCodigoTipo({
      tipo_codigo:
        actividad.tipo_codigo ?? actividad.tipos_actividad?.codigo,
      tipo: actividad.tipo,
    });

    let datosConsulta = null;

    if (codigoTipo === 'CONSULTA') {
      datosConsulta = await consultarDatosConsultaDAO(id);
    }

    const medicamentosAsociados = Array.isArray(
      actividad.medicamentos_asociados
    )
      ? actividad.medicamentos_asociados
      : [];

    const vacunasAsociadas = Array.isArray(
      actividad.vacunas_asociadas
    )
      ? actividad.vacunas_asociadas
      : [];

    const datosEspecificos = {
      ...detalle,
      medicamentos_asociados: medicamentosAsociados,
      vacunas_asociadas: vacunasAsociadas,
    };

    if (codigoTipo === 'CONSULTA') {
      datosEspecificos.datos_consulta = datosConsulta;
    }

    return {
      ...actividad,
      fecha_registro:
        actividad.fecha_registro ?? actividad.created_at ?? null,
      fecha_completada: actividad.fecha_completada ?? null,
      detalle,
      tipo_codigo: codigoTipo,
      datos_consulta: datosConsulta,
      medicamentos_asociados: medicamentosAsociados,
      vacunas_asociadas: vacunasAsociadas,
      datos_especificos: datosEspecificos,
    };
  } catch (error) {
    console.error('[PetCare] Error obteniendo detalle de actividad:', error);
    throw error;
  }
}

/* ============================================================
   RF25 - CAMBIAR ESTADO Y REACTIVAR ACTIVIDAD
   ============================================================ */

export async function cambiarEstadoActividadServicio(
  actividadId,
  nuevoEstado,
  motivoNoRealizada = null
) {
  const id = validarIdentificador(actividadId, 'La actividad');

  if (!['Completada', 'No realizada'].includes(nuevoEstado)) {
    throw new Error('El nuevo estado de la actividad no es válido.');
  }

  const motivo = String(motivoNoRealizada ?? '').trim();

  if (nuevoEstado === 'No realizada' && !motivo) {
    throw new Error(
      'Debes indicar el motivo por el que no se realizó la actividad.'
    );
  }

  try {
    // Este cambio de estado NO finaliza automáticamente la atención.
    const resultado = await actualizarEstadoActividad(
      id,
      nuevoEstado,
      nuevoEstado === 'No realizada' ? motivo : null
    );

    if (!resultado) {
      throw new Error('No se pudo actualizar la actividad.');
    }

    return {
      ...resultado,
      fecha_completada:
        nuevoEstado === 'Completada'
          ? resultado.fecha_completada ?? null
          : null,
    };
  } catch (error) {
    console.error('[PetCare] Error cambiando estado de actividad:', error);
    throw error;
  }
}

export async function reactivarActividadServicio(actividadId) {
  const id = validarIdentificador(actividadId, 'La actividad');
  const resultado = await reactivarActividad(id);

  if (!resultado) {
    throw new Error('No se pudo reactivar la actividad.');
  }

  return { ...resultado, fecha_completada: null };
}

/* ============================================================
   RF26 - VERIFICAR Y FINALIZAR ATENCIÓN
   ============================================================ */

export async function verificarAtencionListaParaFinalizarServicio(
  atencionId
) {
  const id = validarIdentificador(atencionId, 'La atención');

  try {
    const resultado = await verificarAtencionListaParaFinalizar(id);

    if (
      !resultado ||
      typeof resultado.listaParaFinalizar !== 'boolean'
    ) {
      throw new Error(
        'No se pudo determinar si la atención está lista para finalizar.'
      );
    }

    return resultado;
  } catch (error) {
    console.error('[PetCare RF26] Error verificando atención:', error);
    throw error;
  }
}

export async function finalizarAtencionServicio(atencionId) {
  const id = validarIdentificador(atencionId, 'La atención');

  try {
    // El DAO vuelve a comprobar las condiciones antes de actualizar.
    const resultado = await finalizarAtencionSiCorresponde(id);

    if (!resultado) {
      throw new Error(
        'No se pudo obtener el resultado de la finalización.'
      );
    }

    if (resultado.finalizada !== true) {
      throw new Error(
        'La atención no se puede finalizar. Verifica que esté activa, que tenga al menos una actividad vigente y que todas estén Completadas o No realizadas.'
      );
    }

    return resultado;
  } catch (error) {
    console.error('[PetCare RF25] Error finalizando atención:', error);
    throw error;
  }
}

/* ============================================================
   RF55 - VALIDACIONES DE ECOGRAFÍA
   ============================================================ */

function normalizarClaveNombre(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function validarMedicionesEcografia(mediciones) {
  if (mediciones === undefined || mediciones === null) {
    return [];
  }

  if (!Array.isArray(mediciones)) {
    throw new Error('Ingrese mediciones con un formato válido.');
  }

  return mediciones.map((medicion) => {
    if (
      !medicion ||
      typeof medicion !== 'object' ||
      Array.isArray(medicion)
    ) {
      throw new Error('Ingrese mediciones con un formato válido.');
    }

    const valorRecibido = medicion.valor;

    const valor =
      valorRecibido === '' ||
      valorRecibido === null ||
      valorRecibido === undefined
        ? NaN
        : Number(valorRecibido);

    if (!Number.isFinite(valor)) {
      throw new Error('Ingrese mediciones con un formato válido.');
    }

    const nombreMedicion = String(
      medicion.nombre_medicion ??
      medicion.nombreMedicion ??
      ''
    ).trim();

    const unidad = String(medicion.unidad ?? '').trim();

    if (!nombreMedicion) {
      throw new Error('Ingrese el nombre de cada medición.');
    }

    return {
      ...medicion,
      nombre_medicion: nombreMedicion,
      valor,
      unidad,
    };
  });
}

function validarOrganosEcografia(organosRecibidos) {
  if (
    !Array.isArray(organosRecibidos) ||
    organosRecibidos.length === 0
  ) {
    throw new Error('Agregue al menos un órgano evaluado.');
  }

  const idsRegistrados = new Set();
  const nombresRegistrados = new Set();

  return organosRecibidos.map((organo) => {
    validarObjeto(
      organo,
      'Los datos del órgano seleccionado no son válidos.'
    );

    const nombreOrgano = String(
      organo.nombre_organo ??
      organo.nombreOrgano ??
      ''
    )
      .trim()
      .replace(/\s+/g, ' ');

    if (!nombreOrgano) {
      throw new Error(
        'El nombre del órgano seleccionado no es válido.'
      );
    }

    const tieneId =
      organo.organo_id !== undefined &&
      organo.organo_id !== null &&
      organo.organo_id !== '';

    const organoId = tieneId
      ? validarIdentificador(organo.organo_id, 'El órgano')
      : null;

    const nombreNormalizado =
      normalizarClaveNombre(nombreOrgano);

    if (
      nombresRegistrados.has(nombreNormalizado) ||
      (
        organoId !== null &&
        idsRegistrados.has(organoId)
      )
    ) {
      throw new Error(
        'Este órgano ya fue agregado a la ecografía.'
      );
    }

    nombresRegistrados.add(nombreNormalizado);

    if (organoId !== null) {
      idsRegistrados.add(organoId);
    }

    return {
      ...organo,
      ...(organoId !== null
        ? { organo_id: organoId }
        : {}),
      nombre_organo: nombreOrgano,
    };
  });
}

function validarDetalleEcografia(detalle) {
  validarObjeto(
    detalle,
    'Los datos de la ecografía no son válidos.'
  );

  const organos = validarOrganosEcografia(
    detalle.organos
  );

  const hallazgos = String(
    detalle.hallazgos ?? ''
  ).trim();

  if (!hallazgos) {
    throw new Error(
      'Ingrese los hallazgos de la ecografía.'
    );
  }

  const medicionesEspecificas =
    validarMedicionesEcografia(
      detalle.mediciones_especificas
    );

  const detalleNormalizado = {
    ...detalle,
    hallazgos,
    organos,
    mediciones_especificas: medicionesEspecificas,
  };

  for (const campo of ['motivo', 'indicaciones']) {
    if (detalle[campo] !== undefined) {
      const valor = String(
        detalle[campo] ?? ''
      ).trim();

      if (!valor) {
        const mensajes = {
          motivo: 'Ingrese el motivo de la ecografía.',
          indicaciones:
            'Ingrese las indicaciones de la ecografía.',
        };

        throw new Error(mensajes[campo]);
      }

      detalleNormalizado[campo] = valor;
    }
  }

  return detalleNormalizado;
}

async function prepararActividadEcografia(datos) {
  const tipos = await consultarTiposActividad();

  if (!Array.isArray(tipos)) {
    throw new Error(
      'No se pudo consultar el catálogo de tipos de actividad.'
    );
  }

  const tipoEcografia = tipos.find(
    (tipo) =>
      Number(tipo.tipo_id) === Number(datos.tipo_id) &&
      String(tipo.codigo ?? '').trim().toUpperCase() === 'ECOGRAFIA'
  );

  if (!tipoEcografia) {
    throw new Error(
      'El tipo de actividad seleccionado no corresponde a una ecografía.'
    );
  }

  return {
    ...datos,
    atencion_id: validarIdentificador(datos.atencion_id, 'La atención'),
    tipo_id: validarIdentificador(datos.tipo_id, 'El tipo de actividad'),
    tipo_codigo: tipoEcografia.codigo,
    tipo: tipoEcografia.nombre,
    fecha_prevista: normalizarFechaPrevista(datos.fecha_prevista),
    observaciones: String(datos.observaciones ?? '').trim(),
    estado: 'Pendiente',
    eliminado: false,
    detalle: validarDetalleEcografia(
      normalizarDetalle(datos.detalle)
    ),
  };
}

/* ============================================================
   RF29 - REGISTRAR ACTIVIDAD
   ============================================================ */

export async function registrarActividadServicio(datos) {
  validarObjeto(datos, 'Debe proporcionar los datos de la actividad.');

  const atencionId = validarIdentificador(
    datos.atencion_id,
    'Debes seleccionar una atención.'
  );

  const tipoId = validarIdentificador(
    datos.tipo_id,
    'Debes seleccionar el tipo de actividad.'
  );

  const fechaPrevista = normalizarFechaPrevista(datos.fecha_prevista);
  validarModoProgramacion(datos, fechaPrevista);

  const codigoTipo = normalizarCodigoTipo(datos);
  const detalleRecibido = normalizarDetalle(datos.detalle);

  const esEcografia =
    codigoTipo === 'ECOGRAFIA' ||
    Object.prototype.hasOwnProperty.call(detalleRecibido, 'organos');

  let datosNormalizados;

  if (esEcografia) {
    datosNormalizados = await prepararActividadEcografia({
      ...datos,
      atencion_id: atencionId,
      tipo_id: tipoId,
      fecha_prevista: fechaPrevista,
      estado: 'Pendiente',
      eliminado: false,
      detalle: detalleRecibido,
    });
  } else {
    datosNormalizados = {
      ...datos,
      atencion_id: atencionId,
      tipo_id: tipoId,
      tipo_codigo: codigoTipo,
      fecha_prevista: fechaPrevista,
      estado: 'Pendiente',
      eliminado: false,
    };

    if (
      datosNormalizados.observaciones !== undefined &&
      datosNormalizados.observaciones !== null
    ) {
      if (typeof datosNormalizados.observaciones !== 'string') {
        throw new Error('Las observaciones no son válidas.');
      }

      datosNormalizados.observaciones =
        datosNormalizados.observaciones.trim();
    }
  }

  try {
    let resultado;

    if (codigoTipo === 'MEDICACION') {
      const detalleMedicacion = datosNormalizados.detalle ?? {};

      resultado = await registrarPosologiaActividad({
        ...datosNormalizados,
        duracion:
          datosNormalizados.duracion ??
          detalleMedicacion.duracion ??
          null,
        condicion_ingesta:
          datosNormalizados.condicion_ingesta ??
          detalleMedicacion.condicion_ingesta ??
          null,
        detalle: detalleMedicacion,
      });
    } else if (codigoTipo === 'VACUNACION') {
      resultado = await registrarVacunacionActividad(
        datosNormalizados
      );
    } else {
      resultado = await registrarActividad(datosNormalizados);
    }

    if (
      codigoTipo !== 'MEDICACION' &&
      codigoTipo !== 'VACUNACION' &&
      (
        resultado === null ||
        resultado === undefined ||
        resultado === false
      )
    ) {
      throw new Error('No se pudo registrar la actividad.');
    }

    if (
      codigoTipo === 'MEDICACION' &&
      (!resultado || resultado.success !== true || !resultado.actividad_id)
    ) {
      throw new Error(
        'No se confirmó el registro de la medicación.'
      );
    }

    if (
      codigoTipo === 'VACUNACION' &&
      (!resultado || resultado.success !== true || !resultado.actividad_id)
    ) {
      throw new Error(
        'No se confirmó el registro de la vacunación.'
      );
    }

    return resultado;
  } catch (error) {
    console.error('[PetCare] Error al registrar actividad:', error);

    if (esEcografia) {
      const erroresValidacion = [
        'Agregue al menos un órgano evaluado.',
        'Este órgano ya fue agregado a la ecografía.',
        'Ingrese mediciones con un formato válido.',
        'Ingrese el nombre de cada medición.',
        'El nombre del órgano seleccionado no es válido.',
        'El tipo del órgano seleccionado no es válido.',
        'Ingrese el motivo de la ecografía.',
        'Ingrese las indicaciones de la ecografía.',
      ];

      if (erroresValidacion.includes(error?.message)) {
        throw error;
      }

      throw new Error(
        'No fue posible registrar la actividad. Intente nuevamente.'
      );
    }

    throw error;
  }
}

/* ============================================================
   RF39 - PORCENTAJE DE AVANCE
   ============================================================ */

function calcularPorcentajeProcesado(
  completadas,
  noRealizadas,
  total
) {
  if (total === 0) return 0;

  return Number(
    (((completadas + noRealizadas) / total) * 100).toFixed(2)
  );
}

export async function calcularPorcentajeAvanceServicio(atencionId) {
  const id = validarIdentificador(atencionId, 'La atención');
  const actividades = await obtenerActividadesPorAtencion(id);

  const total = actividades.length;
  const completadas = actividades.filter(
    (actividad) => actividad.estado === 'Completada'
  ).length;
  const pendientes = actividades.filter(
    (actividad) => actividad.estado === 'Pendiente'
  ).length;
  const noRealizadas = actividades.filter(
    (actividad) => actividad.estado === 'No realizada'
  ).length;

  return {
    actividades,
    total,
    completadas,
    pendientes,
    noRealizadas,
    porcentaje: calcularPorcentajeProcesado(
      completadas,
      noRealizadas,
      total
    ),
  };
}

export async function obtenerActividadesYPorcentajeAvance(atencionId) {
  const id = validarIdentificador(atencionId, 'La atención');

  try {
    const actividades = await consultarActividadesPorAtencion(id);

    if (!Array.isArray(actividades)) {
      throw new Error('Respuesta inválida del DAO.');
    }

    const validas = actividades.filter(
      (actividad) => actividad && actividad.eliminado !== true
    );

    const total = validas.length;
    const completadas = validas.filter(
      (actividad) => actividad.estado === 'Completada'
    ).length;
    const pendientes = validas.filter(
      (actividad) => actividad.estado === 'Pendiente'
    ).length;
    const noRealizadas = validas.filter(
      (actividad) => actividad.estado === 'No realizada'
    ).length;

    return {
      actividades: validas,
      total,
      completadas,
      pendientes,
      noRealizadas,
      porcentaje: calcularPorcentajeProcesado(
        completadas,
        noRealizadas,
        total
      ),
    };
  } catch (error) {
    console.error('[PetCare] Error al calcular avance:', error);

    throw new Error(
      'No se pudieron consultar las actividades para calcular el avance.'
    );
  }
}

/* ============================================================
   RF53 - CATÁLOGO Y VACUNACIÓN
   ============================================================ */

export async function consultarCatalogoMedicamentosServicio(categoria) {
  const medicamentos = await consultarCatalogoMedicamentos(categoria);

  if (!Array.isArray(medicamentos)) {
    throw new Error(
      'No se pudo consultar el catálogo de medicamentos.'
    );
  }

  return medicamentos;
}

export async function obtenerCatalogoMedicamentosServicio(categoria) {
  return consultarCatalogoMedicamentosServicio(categoria);
}

export async function registrarVacunacionActividadServicio(datos) {
  validarObjeto(datos, 'Debe proporcionar los datos de la vacunación.');

  const datosNormalizados = { ...datos };

  if (
    datosNormalizados.actividad_id !== undefined &&
    datosNormalizados.actividad_id !== null
  ) {
    datosNormalizados.actividad_id = validarIdentificador(
      datosNormalizados.actividad_id,
      'La actividad'
    );
  }

  if (
    datosNormalizados.medicamento_id !== undefined &&
    datosNormalizados.medicamento_id !== null
  ) {
    datosNormalizados.medicamento_id = validarIdentificador(
      datosNormalizados.medicamento_id,
      'El medicamento'
    );
  }

  const resultado = await registrarVacunacionActividad(
    datosNormalizados
  );

  if (resultado === false || resultado?.error) {
    throw new Error('No se pudo registrar la vacunación.');
  }

  return resultado ?? {
    ...datosNormalizados,
    registrado: true,
  };
}

/* ============================================================
   RF55 - TIPOS Y HALLAZGOS DE ECOGRAFÍA
   ============================================================ */

export async function consultarTiposActividadServicio() {
  const tipos = await consultarTiposActividad();

  if (!Array.isArray(tipos)) {
    throw new Error(
      'No se pudieron consultar los tipos de actividad.'
    );
  }

  return tipos;
}

export async function registrarHallazgosEcografiaServicio(
  actividadId,
  hallazgos,
  registrarHallazgosDAO
) {
  const id = validarIdentificador(actividadId, 'La actividad');
  const hallazgosNormalizados = String(hallazgos ?? '').trim();

  if (!hallazgosNormalizados) {
    throw new Error('Ingrese los hallazgos de la ecografía.');
  }

  if (typeof registrarHallazgosDAO !== 'function') {
    throw new Error(
      'No se configuró la operación de registro de hallazgos.'
    );
  }

  const resultado = await registrarHallazgosDAO(
    id,
    hallazgosNormalizados
  );

  if (!resultado) {
    throw new Error(
      'No se pudieron registrar los hallazgos de ecografía.'
    );
  }

  return resultado;
}

/* ============================================================
   RF32 - MODIFICAR ACTIVIDAD
   ============================================================ */

export async function editarActividadServicio(actividadId, datos) {
  const id = validarIdentificador(actividadId, 'La actividad');

  validarObjeto(
    datos,
    'Debe proporcionar los datos que desea modificar.'
  );

  const actividadActual = await consultarActividadPorId(id);

  if (!actividadActual) {
    throw new Error('No se encontró la actividad que desea editar.');
  }

  const codigoTipo = normalizarCodigoTipo({
    tipo_codigo:
      actividadActual.tipo_codigo ??
      actividadActual.tipos_actividad?.codigo,
    tipo: actividadActual.tipo,
  });

  const datosActualizacion = {};

  const descripcionRecibida =
    datos.descripcion ?? datos.observaciones;

  if (descripcionRecibida !== undefined) {
    datosActualizacion.observaciones =
      validarDescripcionActividad(descripcionRecibida);
  }

  const fechaRecibida =
    datos.fechaPrevista ?? datos.fecha_prevista;

  if (fechaRecibida !== undefined) {
    const fechaPrevista = normalizarFechaPrevista(fechaRecibida);
    validarModoProgramacion(datos, fechaPrevista);
    datosActualizacion.fecha_prevista = fechaPrevista;
  } else if (datos.modo_programacion !== undefined) {
    const fechaActual = normalizarFechaPrevista(
      actividadActual.fecha_prevista
    );
    validarModoProgramacion(datos, fechaActual);
  }

  if (datos.detalle !== undefined) {
    const detalleActual = normalizarDetalle(actividadActual.detalle);
    const detalleNuevo = normalizarDetalle(datos.detalle);

    const detalleCombinado = {
      ...detalleActual,
      ...detalleNuevo,
    };

    datosActualizacion.detalle =
      codigoTipo === 'ECOGRAFIA'
        ? validarDetalleEcografia(detalleCombinado)
        : detalleCombinado;
  }

  if (datos.medicamentos !== undefined) {
    if (codigoTipo !== 'MEDICACION') {
      throw new Error(
        'Esta actividad no corresponde a un registro de medicación.'
      );
    }

    datosActualizacion.medicamentos = validarListaAsociaciones(
      datos.medicamentos,
      'medicamentos'
    );
  }

  if (datos.vacunas !== undefined) {
    if (codigoTipo !== 'VACUNACION') {
      throw new Error(
        'Esta actividad no corresponde a un registro de vacunación.'
      );
    }

    datosActualizacion.vacunas = validarListaAsociaciones(
      datos.vacunas,
      'vacunas'
    );
  }

  let datosConsultaNormalizados = null;

  if (datos.datosConsulta !== undefined) {
    if (codigoTipo !== 'CONSULTA') {
      throw new Error(
        'Los datos clínicos solo se pueden modificar en una actividad de Consulta.'
      );
    }

    datosConsultaNormalizados =
      normalizarDatosConsultaEdicion(datos.datosConsulta);
  }

  const hayActualizacionActividad =
    Object.keys(datosActualizacion).length > 0;

  const hayActualizacionConsulta =
    datosConsultaNormalizados !== null;

  if (!hayActualizacionActividad && !hayActualizacionConsulta) {
    throw new Error('No se detectaron cambios para guardar.');
  }

  try {
    if (hayActualizacionActividad) {
      const resultadoActividad = await editarActividadDAO(
        id,
        datosActualizacion
      );

      if (!resultadoActividad) {
        throw new Error(
          'No se pudieron actualizar los datos generales de la actividad.'
        );
      }
    }

    if (hayActualizacionConsulta) {
      const resultadoConsulta = await actualizarDatosConsultaDAO(
        id,
        datosConsultaNormalizados
      );

      if (!resultadoConsulta) {
        throw new Error(
          'No se pudieron actualizar los datos clínicos de la Consulta.'
        );
      }
    }

    const actividadActualizada = await consultarActividadPorId(id);

    if (!actividadActualizada) {
      throw new Error(
        'La actividad se actualizó, pero no se pudo recuperar su información.'
      );
    }

    return actividadActualizada;
  } catch (error) {
    console.error('[PetCare] Error al editar actividad:', error);
    throw error;
  }
}

/* ============================================================
   ELIMINACIÓN LÓGICA Y ALIAS
   ============================================================ */

export async function eliminarActividadServicio(actividadId) {
  const id = validarIdentificador(actividadId, 'La actividad');
  const resultado = await eliminarActividadDAO(id);

  if (!resultado) {
    throw new Error('No se pudo eliminar la actividad.');
  }

  return resultado;
}

export async function consultarActividadesPorEstadoServicio(estado) {
  return obtenerActividadesPorEstado(estado);
}

export async function consultarActividadesPorAtencionServicio(atencionId) {
  return obtenerActividadesPorAtencion(atencionId);
}

export async function obtenerDatosConsultaServicio(actividadId) {
  return consultarDatosConsultaServicio(actividadId);
}
