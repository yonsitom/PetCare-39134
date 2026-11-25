
/**
 * ============================================================
 * PETCARE - DAO DE INDICADORES
 * Archivo: src/dao/indicadores/indicadoresDAO.js
 * Capa: DAO
 *
 * Responsabilidad:
 * - Consultar los indicadores mediante la función RPC de Supabase.
 * - Enviar el periodo de consulta.
 * - Entregar los datos reales al controlador.
 *
 * Arquitectura:
 * Vista -> Controlador -> DAO -> Supabase
 *
 * Función SQL:
 * public.petcare_obtener_indicadores_v1
 * ============================================================
 */

import { supabase } from "../../services/supabase";

/**
 * Consulta los indicadores generales de PetCare.
 *
 * @param {Object} filtros
 * @param {string|null} filtros.fechaInicio Fecha YYYY-MM-DD.
 * @param {string|null} filtros.fechaFin Fecha YYYY-MM-DD.
 *
 * @returns {Promise<Object>} Indicadores devueltos por PostgreSQL.
 */
export async function consultarTodosLosIndicadores(filtros = {}) {
  const fechaInicio = filtros.fechaInicio || null;
  const fechaFin = filtros.fechaFin || null;

  const { data, error } = await supabase.rpc(
    "petcare_obtener_indicadores_v1",
    {
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin,
    }
  );

  if (error) {
    console.error(
      "Error al consultar la función de indicadores de Supabase:",
      error
    );

    throw new Error(
      error.message ||
      "No fue posible consultar los indicadores en Supabase."
    );
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(
      "Supabase no devolvió una estructura válida de indicadores."
    );
  }

  return data;
}
