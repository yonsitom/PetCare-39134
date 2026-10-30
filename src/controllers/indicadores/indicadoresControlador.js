
/**
 * PETCARE - CONTROLADOR DE INDICADORES
 * Capa: Controller
 *
 * Coordina las consultas del DAO y entrega
 * los resultados a la interfaz.
 */

import {
  consultarTodosLosIndicadores,
} from "../../dao/indicadores/indicadoresDAO";
import { logger } from '../../utils/logger';

/**
 * RF: Consultar indicadores históricos.
 * RF: Obtener resumen de atenciones y actividades.
 */
export async function cargarIndicadores() {
  try {
    const datos = await consultarTodosLosIndicadores();

    return {
      correcto: true,
      datos: datos,
      mensaje: "Indicadores cargados correctamente.",
    };

  } catch (error) {
    logger.error(
      "Error en cargarIndicadores:",
      error
    );

    return {
      correcto: false,
      datos: null,
      mensaje:
        error?.message ||
        "No se pudieron cargar los indicadores. Intente nuevamente.",
    };
  }
}
