
/**
 * PETCARE
 * DAO - Indicadores de Administración
 *
 * RF48: Consultar resumen general.
 *
 * Responsabilidad:
 * Consultar los registros necesarios de las cinco categorías.
 * No calcula indicadores ni modifica información.
 */

import { supabase } from '../../services/supabase';

const TAMANO_PAGINA = 1000;

/**
 * Consulta todos los registros de una tabla mediante paginación.
 *
 * La paginación evita depender del límite predeterminado
 * de registros que puede devolver Supabase.
 */
async function consultarRegistros(tabla, columnas, configurarConsulta = null) {
  try {
    let registros = [];
    let desde = 0;
    let continuar = true;

    while (continuar) {
      let consulta = supabase
        .from(tabla)
        .select(columnas)
        .range(desde, desde + TAMANO_PAGINA - 1);

      if (configurarConsulta) {
        consulta = configurarConsulta(consulta);
      }

      const { data, error } = await consulta;

      if (error) {
        return {
          data: null,
          error,
        };
      }

      const pagina = Array.isArray(data) ? data : [];

      registros = registros.concat(pagina);

      continuar = pagina.length === TAMANO_PAGINA;
      desde += TAMANO_PAGINA;
    }

    return {
      data: registros,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error,
    };
  }
}

/**
 * Consulta los registros de las cinco categorías de RF48.
 *
 * Las consultas son independientes: el fallo de una categoría
 * no impide obtener los datos de las demás.
 *
 * No consulta historial_cambios porque RF48 no incluye históricos.
 */
export async function consultarConteosAdministracionDAO() {
  const [
    usuarios,
    mascotas,
    propietarios,
    atenciones,
    actividades,
  ] = await Promise.all([
    consultarRegistros(
      'perfiles',
      'estado_cuenta'
    ),

    consultarRegistros(
      'mascotas',
      'estado'
    ),

    consultarRegistros(
      'propietarios',
      'estado'
    ),

    consultarRegistros(
      'atenciones',
      'estado'
    ),

    consultarRegistros(
      'actividades',
      'estado,tipo,eliminado',
      (consulta) => consulta.eq('eliminado', false)
    ),
  ]);

  return {
    usuarios,
    mascotas,
    propietarios,
    atenciones,
    actividades,
  };
}
