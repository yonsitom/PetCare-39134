
import {
  consultarAtencionesHistoricasDAO,
  consultarDetalleAtencionesHistoricasDAO,
} from '../../dao/administracion/indicadoresHistoricosDAO';

const MENSAJE_FILTROS_INVALIDOS =
  'Seleccione un periodo válido para realizar la consulta';

const MENSAJE_SIN_DATOS =
  'No existen datos para el periodo seleccionado';

const MENSAJE_ERROR =
  'No fue posible cargar los indicadores históricos. Intente nuevamente';

/**
 * Comprueba el formato y la existencia real de una fecha.
 */
const esFechaValida = (fecha) => {
  if (
    typeof fecha !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
  ) {
    return false;
  }

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaUTC = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fechaUTC.getUTCFullYear() === anio &&
    fechaUTC.getUTCMonth() === mes - 1 &&
    fechaUTC.getUTCDate() === dia
  );
};

/**
 * Normaliza y valida los filtros.
 * Admite objeto o dos fechas como argumentos.
 */
const normalizarFiltros = (filtros, fechaFinParametro) => {
  let filtrosNormalizados;

  if (typeof filtros === 'string') {
    filtrosNormalizados = {
      fechaInicio: filtros,
      fechaFin: fechaFinParametro,
    };
  } else if (
    filtros &&
    typeof filtros === 'object' &&
    !Array.isArray(filtros)
  ) {
    filtrosNormalizados = {
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      estado: filtros.estado,
    };
  } else {
    filtrosNormalizados = {};
  }

  const fechaInicio =
    typeof filtrosNormalizados.fechaInicio === 'string'
      ? filtrosNormalizados.fechaInicio.trim()
      : '';

  const fechaFin =
    typeof filtrosNormalizados.fechaFin === 'string'
      ? filtrosNormalizados.fechaFin.trim()
      : '';

  if (
    !esFechaValida(fechaInicio) ||
    !esFechaValida(fechaFin) ||
    fechaInicio > fechaFin
  ) {
    throw new Error(MENSAJE_FILTROS_INVALIDOS);
  }

  return {
    fechaInicio,
    fechaFin,
    estado:
      typeof filtrosNormalizados.estado === 'string' &&
      filtrosNormalizados.estado.trim()
        ? filtrosNormalizados.estado.trim()
        : null,
  };
};

/**
 * Agrupa las atenciones por estado.
 */
const contarPorEstado = (atenciones) => {
  return atenciones.reduce((resultado, atencion) => {
    const estado = atencion.estado || 'Sin estado';

    resultado[estado] = (resultado[estado] || 0) + 1;

    return resultado;
  }, {});
};

/**
 * Construye los datos del gráfico agrupados por fecha.
 */
const construirGrafico = (atenciones) => {
  const cantidadesPorFecha = {};

  atenciones.forEach((atencion) => {
    const fecha = atencion.fecha_inicio
      ? String(atencion.fecha_inicio).substring(0, 10)
      : 'Fecha no disponible';

    cantidadesPorFecha[fecha] =
      (cantidadesPorFecha[fecha] || 0) + 1;
  });

  const fechas = Object.keys(cantidadesPorFecha).sort();

  return {
    labels: fechas,
    datasets: [
      {
        data: fechas.map((fecha) => cantidadesPorFecha[fecha]),
      },
    ],
  };
};

/**
 * Valida la respuesta del DAO.
 */
const validarResultadoDAO = (resultado) => {
  if (
    !resultado ||
    resultado.error ||
    !Array.isArray(resultado.data)
  ) {
    throw new Error(MENSAJE_ERROR);
  }

  if (resultado.data.length === 0) {
    throw new Error(MENSAJE_SIN_DATOS);
  }

  return resultado.data;
};

/**
 * RF49: consultar indicadores históricos.
 */
export const consultarIndicadoresHistoricos = async (
  filtros,
  fechaFinParametro
) => {
  const filtrosValidados = normalizarFiltros(
    filtros,
    fechaFinParametro
  );

  try {
    const filtrosDAO = {
      fechaInicio: filtrosValidados.fechaInicio,
      fechaFin: filtrosValidados.fechaFin,
    };

    if (filtrosValidados.estado) {
      filtrosDAO.estado = filtrosValidados.estado;
    }

    const resultado = await consultarAtencionesHistoricasDAO(
      filtrosDAO
    );

    const atenciones = validarResultadoDAO(resultado);

    return {
      totalAtenciones: atenciones.length,
      porEstado: contarPorEstado(atenciones),
      atenciones,
      grafico: construirGrafico(atenciones),
      filtros: {
        fechaInicio: filtrosValidados.fechaInicio,
        fechaFin: filtrosValidados.fechaFin,
        estado: filtrosValidados.estado,
      },
    };
  } catch (error) {
    if (
      error?.message === MENSAJE_SIN_DATOS ||
      error?.message === MENSAJE_FILTROS_INVALIDOS
    ) {
      throw error;
    }

    console.error(
      'Error en consultarIndicadoresHistoricos:',
      error
    );

    throw new Error(MENSAJE_ERROR);
  }
};

/**
 * RF49: consultar el detalle de un indicador.
 */
export const consultarDetalleIndicadorHistorico = async (
  filtros,
  estadoSeleccionado
) => {
  const filtrosBase = normalizarFiltros(filtros);

  const filtrosDetalle = {
    ...filtrosBase,
    estado:
      typeof estadoSeleccionado === 'string' &&
      estadoSeleccionado.trim()
        ? estadoSeleccionado.trim()
        : filtrosBase.estado,
  };

  try {
    const resultado =
      await consultarDetalleAtencionesHistoricasDAO(
        filtrosDetalle
      );

    return validarResultadoDAO(resultado);
  } catch (error) {
    if (
      error?.message === MENSAJE_SIN_DATOS ||
      error?.message === MENSAJE_FILTROS_INVALIDOS
    ) {
      throw error;
    }

    console.error(
      'Error en consultarDetalleIndicadorHistorico:',
      error
    );

    throw new Error(MENSAJE_ERROR);
  }
};
