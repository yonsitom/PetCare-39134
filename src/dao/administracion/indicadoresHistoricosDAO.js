
import { supabase } from '../../services/supabase';

const TAMANO_PAGINA = 1000;

/**
 * Convierte una fecha final inclusiva en el inicio del día siguiente.
 * Esto permite incluir todos los registros del último día seleccionado.
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
 * Consulta las atenciones comprendidas en el periodo indicado.
 *
 * Columnas verificadas en Supabase:
 * atencion_id, fecha_inicio, fecha_fin, estado,
 * observaciones, numero_historia y cita_id.
 *
 * No modifica registros.
 */
const consultarAtencionesPorPeriodo = async (filtros = {}) => {
  const { fechaInicio, fechaFin, estado } = filtros;
  const registros = [];
  let desde = 0;

  while (true) {
    let consulta = supabase
      .from('atenciones')
      .select(
        'atencion_id, fecha_inicio, fecha_fin, estado, observaciones, numero_historia, cita_id'
      )
      .gte('fecha_inicio', `${fechaInicio}T00:00:00`)
      .lt('fecha_inicio', `${obtenerDiaSiguiente(fechaFin)}T00:00:00`)
      .order('fecha_inicio', { ascending: true })
      .range(desde, desde + TAMANO_PAGINA - 1);

    if (estado) {
      consulta = consulta.eq('estado', estado);
    }

    const { data, error } = await consulta;

    if (error) {
      return { data: null, error };
    }

    registros.push(...(data || []));

    if (!data || data.length < TAMANO_PAGINA) {
      break;
    }

    desde += TAMANO_PAGINA;
  }

  return { data: registros, error: null };
};

/**
 * DAO principal para los indicadores históricos.
 */
export const consultarAtencionesHistoricasDAO = async (filtros) => {
  try {
    return await consultarAtencionesPorPeriodo(filtros);
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * DAO para consultar el detalle de las atenciones de un indicador.
 * El estado es opcional; si se recibe, filtra por ese estado.
 */
export const consultarDetalleAtencionesHistoricasDAO = async (filtros) => {
  try {
    return await consultarAtencionesPorPeriodo(filtros);
  } catch (error) {
    return { data: null, error };
  }
};
