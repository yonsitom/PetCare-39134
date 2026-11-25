import { supabase } from '../../services/supabase';

const TAMANO_PAGINA = 1000;

const MENSAJE_FECHAS_INVALIDAS =
  'El DAO recibió un periodo de fechas inválido.';

/**
 * Valida que la fecha exista realmente en el calendario.
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
 * Convierte la fecha final inclusiva al día siguiente.
 * Permite consultar todo el último día del periodo.
 */
const obtenerDiaSiguiente = (fecha) => {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const siguiente = new Date(Date.UTC(anio, mes - 1, dia + 1));

  return [
    siguiente.getUTCFullYear(),
    String(siguiente.getUTCMonth() + 1).padStart(2, '0'),
    String(siguiente.getUTCDate()).padStart(2, '0'),
  ].join('-');
};

/**
 * Valida y normaliza los filtros que recibe el DAO.
 */
const normalizarFiltros = (filtros = {}) => {
  const fechaInicio =
    typeof filtros.fechaInicio === 'string'
      ? filtros.fechaInicio.trim()
      : '';

  const fechaFin =
    typeof filtros.fechaFin === 'string'
      ? filtros.fechaFin.trim()
      : '';

  if (
    !esFechaValida(fechaInicio) ||
    !esFechaValida(fechaFin) ||
    fechaInicio > fechaFin
  ) {
    throw new Error(MENSAJE_FECHAS_INVALIDAS);
  }

  return {
    fechaInicio,
    fechaFin,
    estado:
      typeof filtros.estado === 'string' && filtros.estado.trim()
        ? filtros.estado.trim()
        : null,
  };
};

/**
 * Consulta todas las atenciones de un periodo.
 *
 * Columnas utilizadas:
 * atencion_id, fecha_inicio, fecha_fin, estado,
 * observaciones, numero_historia y cita_id.
 *
 * La consulta utiliza paginación para no limitar
 * los resultados a los primeros 1000 registros.
 */
const consultarAtencionesPorPeriodo = async (filtros) => {
  const filtrosValidos = normalizarFiltros(filtros);

  const {
    fechaInicio,
    fechaFin,
    estado,
  } = filtrosValidos;

  const registros = [];
  let desde = 0;

  while (true) {
    let consulta = supabase
      .from('atenciones')
      .select(
        [
          'atencion_id',
          'fecha_inicio',
          'fecha_fin',
          'estado',
          'observaciones',
          'numero_historia',
          'cita_id',
        ].join(', ')
      )
      .gte('fecha_inicio', `${fechaInicio}T00:00:00`)
      .lt(
        'fecha_inicio',
        `${obtenerDiaSiguiente(fechaFin)}T00:00:00`
      )
      .order('fecha_inicio', { ascending: true })
      .range(desde, desde + TAMANO_PAGINA - 1);

    if (estado) {
      consulta = consulta.eq('estado', estado);
    }

    const { data, error } = await consulta;

    if (error) {
      return {
        data: null,
        error,
      };
    }

    registros.push(...(data || []));

    if (!data || data.length < TAMANO_PAGINA) {
      break;
    }

    desde += TAMANO_PAGINA;
  }

  return {
    data: registros,
    error: null,
  };
};

/**
 * DAO principal de indicadores históricos.
 *
 * Responsabilidad:
 * consultar las atenciones del periodo solicitado.
 */
export const consultarAtencionesHistoricasDAO = async (filtros) => {
  try {
    return await consultarAtencionesPorPeriodo(filtros);
  } catch (error) {
    return {
      data: null,
      error,
    };
  }
};

/**
 * DAO del detalle de atenciones por indicador.
 *
 * Si se recibe un estado, filtra las atenciones
 * por dicho estado.
 */
export const consultarDetalleAtencionesHistoricasDAO = async (
  filtros
) => {
  try {
    return await consultarAtencionesPorPeriodo(filtros);
  } catch (error) {
    return {
      data: null,
      error,
    };
  }
};