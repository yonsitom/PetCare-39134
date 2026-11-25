
/**
 * ============================================================
 * PETCARE - CONTROLADOR DE INDICADORES
 * Archivo: src/controllers/indicadores/indicadoresControlador.js
 * Capa: Controller
 *
 * Responsabilidad:
 * - Validar los filtros recibidos desde la vista.
 * - Coordinar la consulta del DAO.
 * - Entregar una respuesta uniforme a la interfaz.
 *
 * Arquitectura:
 * Vista -> Controlador -> DAO -> Supabase
 * ============================================================
 */

import {
  consultarTodosLosIndicadores,
} from "../../dao/indicadores/indicadoresDAO";

const MENSAJE_FILTROS_INVALIDOS =
  "El periodo seleccionado no es válido.";

const MENSAJE_ERROR =
  "No fue posible cargar los indicadores. Intente nuevamente.";

/**
 * Valida que una fecha tenga formato YYYY-MM-DD
 * y corresponda a un día real del calendario.
 */
function esFechaValida(fecha) {
  if (fecha === null || fecha === undefined || fecha === "") {
    return true;
  }

  if (typeof fecha !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);

  const fechaConvertida = new Date(
    Date.UTC(anio, mes - 1, dia)
  );

  return (
    fechaConvertida.getUTCFullYear() === anio &&
    fechaConvertida.getUTCMonth() === mes - 1 &&
    fechaConvertida.getUTCDate() === dia
  );
}

/**
 * Valida los filtros de fecha.
 */
function validarFiltros(filtros = {}) {
  const fechaInicio = filtros.fechaInicio || null;
  const fechaFin = filtros.fechaFin || null;

  if (
    !esFechaValida(fechaInicio) ||
    !esFechaValida(fechaFin)
  ) {
    return false;
  }

  if (
    fechaInicio &&
    fechaFin &&
    fechaInicio > fechaFin
  ) {
    return false;
  }

  return true;
}

/**
 * RF - Consultar indicadores generales e históricos.
 *
 * Consulta:
 * - Atenciones.
 * - Actividades.
 * - Seguimiento.
 * - Mascotas.
 * - Usuarios.
 *
 * @param {Object} filtros
 * @param {string|null} filtros.fechaInicio
 * @param {string|null} filtros.fechaFin
 */
export async function cargarIndicadores(filtros = {}) {
  try {
    if (!validarFiltros(filtros)) {
      return {
        correcto: false,
        datos: null,
        mensaje: MENSAJE_FILTROS_INVALIDOS,
      };
    }

    const datos = await consultarTodosLosIndicadores({
      fechaInicio: filtros.fechaInicio || null,
      fechaFin: filtros.fechaFin || null,
    });

    return {
      correcto: true,
      datos,
      mensaje: "Indicadores cargados correctamente.",
    };
  } catch (error) {
    console.error(
      "Error en cargarIndicadores:",
      error
    );

    return {
      correcto: false,
      datos: null,
      mensaje:
        error?.message || MENSAJE_ERROR,
    };
  }
}
