
/**
 * ============================================================
 * PETCARE - DAO DE EVENTOS DE ATENCION
 * RF41: Visualizar linea de tiempo
 * ============================================================
 *
 * Responsabilidad:
 * Consultar los eventos registrados para una atención.
 *
 * Tabla:
 * public.eventos_atencion
 *
 * SOLID:
 * - SRP: administra exclusivamente la persistencia de eventos.
 * - DIP: el servicio recibe el repositorio mediante inyección.
 * ============================================================
 */

import { supabase } from '../services/supabase';
import { logger } from '../utils/logger';

/**
 * RF41: consultar eventos de una atención.
 *
 * Devuelve los eventos ordenados cronológicamente.
 */
export async function consultarEventosPorAtencion(atencionId) {
  const id = Number(atencionId);

  if (
    atencionId === null ||
    atencionId === undefined ||
    String(atencionId).trim() === '' ||
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new Error(
      'El identificador de atención no es válido.'
    );
  }

  const { data, error } = await supabase
    .from('eventos_atencion')
    .select(`
      evento_id,
      atencion_id,
      actividad_id,
      usuario_id,
      tipo_evento,
      descripcion,
      fecha_evento,
      estado_anterior,
      estado_nuevo,
      datos_adicionales
    `)
    .eq('atencion_id', id)
    .order('fecha_evento', { ascending: true })
    .order('evento_id', { ascending: true });

  if (error) {
    logger.error(
      'RF41: error consultando eventos:',
      error.message
    );

    throw new Error(
      'No fue posible consultar los eventos de la atención.'
    );
  }

  return Array.isArray(data) ? data : [];
}
