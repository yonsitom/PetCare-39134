
import {
  consultarAtencionesHistoricasDAO,
  consultarDetalleAtencionesHistoricasDAO,
} from '../../dao/administracion/indicadoresHistoricosDAO';
import { logger } from '../../utils/logger';

const MENSAJE_FILTROS_INVALIDOS =
  'Seleccione un periodo válido para realizar la consulta';

const MENSAJE_SIN_DATOS =
  'No existen datos para el periodo seleccionado';

const MENSAJE_ERROR =
  'No fue posible cargar los indicadores históricos. Intente nuevamente';

/**
 * Comprueba que una fecha tenga formato YYYY-MM-DD
 * y que represente una fecha real del calendario.
 */
const esFechaValida = (fecha) => {
  if (typeof fecha !== 'string') {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaConvertida = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fechaConvertida.getUTCFullYear() === anio &&
    fechaConvertida.getUTCMonth() === mes - 1 &&
    fechaConvertida.getUTCDate() === dia
  );
};

/**
 * Valida el periodo antes de consultar la base de datos.
 */
const validarFiltros = (filtros) => {
  if (!filtros || typeof filtros !== 'object') {
    return false;
  }

  const { fechaInicio, fechaFin } = filtros;

  if (!esFechaValida(fechaInicio) || !esFechaValida(fechaFin)) {
    return false;
  }

  return fechaInicio <= fechaFin;
};

/**
 * Construye la información agrupada por estado.
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
      ? atencion.fecha_inicio.substring(0, 10)
      : 'Fecha no disponible';

    cantidadesPorFecha[fecha] = (cantidadesPorFecha[fecha] || 0) + 1;
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
 * RF49 - Consulta los indicadores históricos de las atenciones.
 *
 * @param {Object} filtros
 * @param {string} filtros.fechaInicio Fecha inicial YYYY-MM-DD.
 * @param {string} filtros.fechaFin Fecha final YYYY-MM-DD.
 * @param {string} [filtros.estado] Estado opcional.
 */
export const consultarIndicadoresHistoricos = async (filtros) => {
  if (!validarFiltros(filtros)) {
    throw new Error(MENSAJE_FILTROS_INVALIDOS);
  }

  try {
    const { data, error } =
      await consultarAtencionesHistoricasDAO(filtros);

    if (error || !Array.isArray(data)) {
      throw new Error(MENSAJE_ERROR);
    }

    if (data.length === 0) {
      throw new Error(MENSAJE_SIN_DATOS);
    }

    return {
      totalAtenciones: data.length,
      porEstado: contarPorEstado(data),
      atenciones: data,
      grafico: construirGrafico(data),
      filtros: {
        fechaInicio: filtros.fechaInicio,
        fechaFin: filtros.fechaFin,
        estado: filtros.estado || null,
      },
    };
  } catch (error) {
    if (
      error.message === MENSAJE_SIN_DATOS ||
      error.message === MENSAJE_FILTROS_INVALIDOS
    ) {
      throw error;
    }

    logger.error('Error en consultarIndicadoresHistoricos:', error);

    throw new Error(MENSAJE_ERROR);
  }
};

/**
 * RF49 - Consulta el detalle de las atenciones relacionadas
 * con el indicador y los filtros seleccionados.
 *
 * Si se proporciona estado, se utiliza como filtro adicional.
 */
export const consultarDetalleIndicadorHistorico = async (
  filtros,
  estadoSeleccionado
) => {
  const filtrosDetalle = {
    ...filtros,
    estado: estadoSeleccionado || filtros?.estado || undefined,
  };

  if (!validarFiltros(filtrosDetalle)) {
    throw new Error(MENSAJE_FILTROS_INVALIDOS);
  }

  try {
    const { data, error } =
      await consultarDetalleAtencionesHistoricasDAO(filtrosDetalle);

    if (error || !Array.isArray(data)) {
      throw new Error(MENSAJE_ERROR);
    }

    if (data.length === 0) {
      throw new Error(MENSAJE_SIN_DATOS);
    }

    return data;
  } catch (error) {
    if (
      error.message === MENSAJE_SIN_DATOS ||
      error.message === MENSAJE_FILTROS_INVALIDOS
    ) {
      throw error;
    }

    logger.error('Error en consultarDetalleIndicadorHistorico:', error);

    throw new Error(MENSAJE_ERROR);
  }
};
