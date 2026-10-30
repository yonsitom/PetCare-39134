
/**
 * ============================================================
 * PETCARE - SERVICIO DE ACTIVIDADES
 * ============================================================
 *
 * RF10: Consultar actividades por estado.
 * RF25: Cambiar el estado de una actividad.
 * RF29: Registrar una actividad.
 * RF39: Calcular porcentaje de avance.
 * RF55: Registrar hallazgos de ecografía por órgano.
 *
 * Arquitectura:
 * - El servicio valida las reglas de negocio.
 * - El DAO se encarga del acceso a datos.
 *
 * SOLID:
 * - SRP: concentra las reglas de negocio de actividades.
 * - DIP: delega la persistencia en el DAO.
 * ============================================================
 */

import {
  consultarActividadesPorEstado,
  consultarActividadesPorAtencion,
  actualizarEstadoActividad,
  registrarActividad,
} from '../dao/actividadesDAO';
import { logger } from '../utils/logger';

// ============================================================
// CONSTANTES
// ============================================================

const ESTADOS_PERMITIDOS = [
  'Pendiente',
  'Completada',
  'No realizada',
];

const ESTADOS_FINALES = [
  'Completada',
  'No realizada',
];

const MENSAJE_ERROR =
  'No se pudo cargar el resumen de actividades. Intente nuevamente.';

const MENSAJE_ERROR_REGISTRAR =
  'No se pudo registrar la actividad. Intenta nuevamente.';

const MENSAJE_RF55 = {
  SIN_ORGANOS:
    'Agregue al menos un órgano evaluado.',

  HALLAZGOS_VACIOS:
    'Ingrese los hallazgos del órgano seleccionado.',

  ORGANO_REPETIDO:
    'Este órgano ya fue agregado a la ecografía.',

  MEDICION_INVALIDA:
    'Ingrese mediciones con un formato válido.',

  ERROR_REGISTRAR:
    'No fue posible registrar la actividad. Intente nuevamente.',
};

// ============================================================
// FUNCIONES AUXILIARES RF55
// ============================================================

/**
 * Determina si la solicitud contiene la estructura
 * de hallazgos por órgano correspondiente a una ecografía.
 *
 * Se utiliza la propiedad organos para identificar este
 * formato, sin asumir un valor fijo de tipo_id.
 */
function esSolicitudEcografia(datos, detalle) {
  const tieneOrganos =
    Object.prototype.hasOwnProperty.call(detalle, 'organos');

  const tipo = String(
    datos.tipo ??
    datos.tipo_actividad ??
    datos.nombre_tipo ??
    ''
  ).trim().toLowerCase();

  return tieneOrganos || tipo.includes('ecograf');
}

/**
 * Valida los hallazgos registrados para cada órgano.
 */
function validarHallazgosEcografia(detalle) {
  const organos = detalle.organos;

  // CP02: sin órganos agregados.

  if (!Array.isArray(organos) || organos.length === 0) {
    throw new Error(MENSAJE_RF55.SIN_ORGANOS);
  }

  const organosRegistrados = new Set();

  for (const organo of organos) {
    if (!organo || typeof organo !== 'object') {
      throw new Error(MENSAJE_RF55.SIN_ORGANOS);
    }

    // CP03: hallazgos obligatorios.

    const hallazgos = String(
      organo.hallazgos ?? ''
    ).trim();

    if (!hallazgos) {
      throw new Error(
        MENSAJE_RF55.HALLAZGOS_VACIOS
      );
    }

    // CP04: impedir que el mismo órgano se agregue dos veces.

    const identificador = organo.organo_id;

    const nombre = String(
      organo.nombre_organo ?? ''
    ).trim().toLowerCase();

    const clave = (
      identificador !== undefined &&
      identificador !== null &&
      String(identificador).trim() !== ''
    )
      ? `id:${String(identificador).trim()}`
      : `nombre:${nombre}`;

    if (clave === 'nombre:') {
      throw new Error(MENSAJE_RF55.SIN_ORGANOS);
    }

    if (organosRegistrados.has(clave)) {
      throw new Error(
        MENSAJE_RF55.ORGANO_REPETIDO
      );
    }

    organosRegistrados.add(clave);

    // CP05: validar el formato de las mediciones.

    const mediciones = organo.mediciones_especificas;

    if (
      mediciones !== undefined &&
      mediciones !== null
    ) {
      if (!Array.isArray(mediciones)) {
        throw new Error(
          MENSAJE_RF55.MEDICION_INVALIDA
        );
      }

      for (const medicion of mediciones) {
        if (
          !medicion ||
          typeof medicion !== 'object'
        ) {
          throw new Error(
            MENSAJE_RF55.MEDICION_INVALIDA
          );
        }

        const valor = medicion.valor;

        let valorValido = false;

        if (typeof valor === 'number') {
          valorValido = Number.isFinite(valor);
        } else if (typeof valor === 'string') {
          const valorNormalizado = valor.trim();

          valorValido =
            valorNormalizado !== '' &&
            /^-?\d+(?:[.,]\d+)?$/.test(
              valorNormalizado
            );
        }

        if (!valorValido) {
          throw new Error(
            MENSAJE_RF55.MEDICION_INVALIDA
          );
        }
      }
    }
  }
}

// ============================================================
// RF10: CONSULTAR ACTIVIDADES POR ESTADO
// ============================================================

export async function obtenerActividadesPorEstado(estado) {
  if (estado && !ESTADOS_PERMITIDOS.includes(estado)) {
    throw new Error(
      'El estado indicado no es válido.'
    );
  }

  try {
    const actividades = await consultarActividadesPorEstado(
      estado || null
    );

    return Array.isArray(actividades)
      ? actividades
      : [];
  } catch (error) {
    logger.error(
      'RF10: error al consultar actividades:',
      error
    );

    throw new Error(MENSAJE_ERROR);
  }
}

// ============================================================
// RF25: CAMBIAR ESTADO DE ACTIVIDAD
// ============================================================

export async function cambiarEstadoActividadServicio(
  actividadId,
  nuevoEstado,
  motivoNoRealizada = null
) {
  if (!actividadId) {
    throw new Error(
      'No se indicó la actividad que desea actualizar.'
    );
  }

  if (!ESTADOS_FINALES.includes(nuevoEstado)) {
    throw new Error(
      'El nuevo estado de la actividad no es válido.'
    );
  }

  if (
    nuevoEstado === 'No realizada' &&
    !String(motivoNoRealizada ?? '').trim()
  ) {
    throw new Error(
      'Debes indicar el motivo por el que no se realizó la actividad.'
    );
  }

  return actualizarEstadoActividad(
    actividadId,
    nuevoEstado,
    nuevoEstado === 'No realizada'
      ? String(motivoNoRealizada).trim()
      : null
  );
}

// ============================================================
// RF29 Y RF55: VALIDAR Y REGISTRAR ACTIVIDAD
// ============================================================

export async function registrarActividadServicio(datos) {
  if (!datos || typeof datos !== 'object') {
    throw new Error(
      'Debes proporcionar los datos de la actividad.'
    );
  }

  if (!datos.atencion_id) {
    throw new Error(
      'Debes seleccionar una atención.'
    );
  }

  if (
    datos.tipo_id === null ||
    datos.tipo_id === undefined ||
    datos.tipo_id === ''
  ) {
    throw new Error(
      'Debes seleccionar el tipo de actividad.'
    );
  }

  const observaciones = String(
    datos.observaciones ?? ''
  ).trim();

  const detalle =
    datos.detalle &&
    typeof datos.detalle === 'object' &&
    !Array.isArray(datos.detalle)
      ? datos.detalle
      : {};

  const esEcografia = esSolicitudEcografia(
    datos,
    detalle
  );

  // Mantener la validación general de RF29.

  const tieneDetalle = Object.values(detalle).some(
    (valor) => {
      if (Array.isArray(valor)) {
        return valor.length > 0;
      }

      if (valor && typeof valor === 'object') {
        return Object.keys(valor).length > 0;
      }

      return String(valor ?? '').trim() !== '';
    }
  );

  if (!observaciones && !tieneDetalle) {
    throw new Error(
      'Debes ingresar observaciones o completar los datos de la actividad.'
    );
  }

  // Validaciones específicas de RF55.

  if (esEcografia) {
    validarHallazgosEcografia(detalle);
  }

  // Validar la fecha prevista.

  const fecha = String(
    datos.fecha_prevista ?? ''
  ).trim();

  const formatoISO = /^(\d{4})-(\d{2})-(\d{2})$/;
  const formatoVisible = /^(\d{2})\/(\d{2})\/(\d{4})$/;

  let anio;
  let mes;
  let dia;
  let fechaISO;

  let coincidencia = fecha.match(formatoISO);

  if (coincidencia) {
    anio = Number(coincidencia[1]);
    mes = Number(coincidencia[2]);
    dia = Number(coincidencia[3]);
    fechaISO = fecha;
  } else {
    coincidencia = fecha.match(formatoVisible);

    if (!coincidencia) {
      throw new Error(
        'La fecha prevista no es válida.'
      );
    }

    dia = Number(coincidencia[1]);
    mes = Number(coincidencia[2]);
    anio = Number(coincidencia[3]);

    fechaISO =
      `${coincidencia[3]}-${coincidencia[2]}-${coincidencia[1]}`;
  }

  const fechaComprobacion = new Date(
    Date.UTC(anio, mes - 1, dia)
  );

  if (
    !anio ||
    mes < 1 ||
    mes > 12 ||
    dia < 1 ||
    fechaComprobacion.getUTCFullYear() !== anio ||
    fechaComprobacion.getUTCMonth() !== mes - 1 ||
    fechaComprobacion.getUTCDate() !== dia
  ) {
    throw new Error(
      'La fecha prevista no es válida.'
    );
  }

  // Preparar datos para el DAO.

  const datosRegistro = {
    ...datos,
    fecha_prevista: fechaISO,
    observaciones,
    detalle,
  };

  /*
   * RF55:
   * La ecografía debe registrarse siempre con estado Pendiente.
   *
   * Se conserva el comportamiento anterior de RF29 para
   * los demás tipos de actividad.
   */

  if (esEcografia) {
    datosRegistro.estado = 'Pendiente';
  }

  try {
    return await registrarActividad(datosRegistro);
  } catch (error) {
    logger.error(
      'Error al registrar la actividad:',
      error
    );

    if (esEcografia) {
      throw new Error(
        MENSAJE_RF55.ERROR_REGISTRAR
      );
    }

    // Mantener el mensaje que ya utilizaba RF29.

    throw new Error(
      MENSAJE_ERROR_REGISTRAR
    );
  }
}

// ============================================================
// RF39: CONSULTAR ACTIVIDADES Y PORCENTAJE DE AVANCE
// ============================================================

export async function obtenerActividadesYPorcentajeAvance(
  atencionId
) {
  if (
    atencionId === undefined ||
    atencionId === null ||
    String(atencionId).trim() === ''
  ) {
    throw new Error(
      'Debes indicar una atención válida.'
    );
  }

  let actividades;

  try {
    actividades = await consultarActividadesPorAtencion(
      atencionId
    );
  } catch (error) {
    logger.error(
      'RF39: error consultando actividades:',
      error
    );

    throw new Error(
      'No se pudieron consultar las actividades para calcular el avance.'
    );
  }

  if (!Array.isArray(actividades)) {
    throw new Error(
      'La información de las actividades está incompleta.'
    );
  }

  const vigentes = actividades.filter(
    (actividad) => actividad?.eliminado !== true
  );

  const estadosValidos = [
    'Pendiente',
    'Completada',
    'No realizada',
  ];

  for (const actividad of vigentes) {
    if (
      !actividad ||
      typeof actividad !== 'object' ||
      !estadosValidos.includes(actividad.estado)
    ) {
      throw new Error(
        'La información de las actividades está incompleta o contiene estados inválidos.'
      );
    }
  }

  const total = vigentes.length;

  const completadas = vigentes.filter(
    (actividad) => actividad.estado === 'Completada'
  ).length;

  const porcentaje =
    total === 0
      ? 0
      : Math.round((completadas / total) * 100);

  return {
    actividades: vigentes,
    total,
    completadas,
    porcentaje,
  };
}
