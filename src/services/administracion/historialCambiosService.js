
/**
 * PETCARE - RF50
 * Servicio: Consultar los cambios realizados en la información registrada.
 *
 * Responsabilidad:
 * - Validar los filtros de consulta.
 * - Procesar los resultados del DAO.
 * - Gestionar los escenarios CP01, CP02, CP03 y CP04.
 * - Consultar el detalle de un cambio.
 *
 * Arquitectura: Capa de servicios - MVC + DAO.
 */

import {
  obtenerHistorialCambios,
  obtenerDetalleHistorial,
} from "../../dao/administracion/historialCambiosDAO";
import { logger } from '../../utils/logger';

// ============================================================
// MENSAJES DEL RF50
// ============================================================

const MENSAJES = {
  FILTROS_INVALIDOS:
    "Seleccione filtros válidos para realizar la consulta",

  SIN_RESULTADOS:
    "No existen cambios que coincidan con los filtros seleccionados",

  ERROR_HISTORIAL:
    "No fue posible cargar el historial de cambios. Intente nuevamente",
};

// ============================================================
// VALIDACIONES
// ============================================================

/**
 * Comprueba que una fecha tenga formato YYYY-MM-DD
 * y que represente una fecha real del calendario.
 */
const esFechaValida = (fecha) => {
  if (typeof fecha !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return false;
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);

  const fechaConstruida = new Date(
    Date.UTC(anio, mes - 1, dia)
  );

  return (
    fechaConstruida.getUTCFullYear() === anio &&
    fechaConstruida.getUTCMonth() === mes - 1 &&
    fechaConstruida.getUTCDate() === dia
  );
};

/**
 * Valida los filtros definidos para RF50.
 *
 * Se permite consultar sin filtros.
 * Si se indica una fecha, ambas fechas son obligatorias.
 */
const validarFiltros = (filtros) => {
  if (!filtros || typeof filtros !== "object" || Array.isArray(filtros)) {
    return false;
  }

  const {
    usuario = "",
    tipoInformacion = "Todos",
    tipoAccion = "Todos",
    fechaDesde = "",
    fechaHasta = "",
  } = filtros;

  if (
    typeof usuario !== "string" ||
    typeof tipoInformacion !== "string" ||
    typeof tipoAccion !== "string" ||
    typeof fechaDesde !== "string" ||
    typeof fechaHasta !== "string"
  ) {
    return false;
  }

  const tiposInformacionPermitidos = [
    "Todos",
    "Atención",
    "Actividad",
  ];

  const accionesPermitidas = [
    "Todos",
    "CREAR",
    "MODIFICAR",
    "CAMBIAR_ESTADO",
    "ELIMINAR",
  ];

  if (!tiposInformacionPermitidos.includes(tipoInformacion)) {
    return false;
  }

  if (!accionesPermitidas.includes(tipoAccion)) {
    return false;
  }

  // No se permite indicar solamente una de las fechas.
  if (
    (fechaDesde.trim() === "" && fechaHasta.trim() !== "") ||
    (fechaDesde.trim() !== "" && fechaHasta.trim() === "")
  ) {
    return false;
  }

  // Si ambas fechas están vacías, se permite la consulta general.
  if (fechaDesde.trim() === "" && fechaHasta.trim() === "") {
    return true;
  }

  if (!esFechaValida(fechaDesde) || !esFechaValida(fechaHasta)) {
    return false;
  }

  // La fecha inicial no puede ser posterior a la fecha final.
  if (fechaDesde > fechaHasta) {
    return false;
  }

  return true;
};

// ============================================================
// RF50 - CONSULTAR HISTORIAL DE CAMBIOS
// ============================================================

/**
 * Consulta los cambios realizados aplicando los filtros.
 *
 * CP01: devuelve los registros coincidentes.
 * CP02: informa cuando no existen coincidencias.
 * CP03: rechaza filtros inválidos antes de acceder al DAO.
 * CP04: controla errores técnicos.
 *
 * @param {Object} filtros Filtros de búsqueda.
 * @returns {Promise<Object>} Resultado de la consulta.
 */
export const consultarHistorialCambios = async (filtros = {}) => {
  // CP03: validar antes de consultar la base de datos.
  if (!validarFiltros(filtros)) {
    return {
      correcto: false,
      mensaje: MENSAJES.FILTROS_INVALIDOS,
      datos: [],
    };
  }

  try {
    // CP01 y CP02: consultar mediante el DAO.
    const registros = await obtenerHistorialCambios(filtros);

    if (!Array.isArray(registros) || registros.length === 0) {
      return {
        correcto: false,
        mensaje: MENSAJES.SIN_RESULTADOS,
        datos: [],
      };
    }

    return {
      correcto: true,
      mensaje: "Historial de cambios consultado correctamente",
      datos: registros,
    };
  } catch (error) {
    // CP04: controlar errores técnicos.
    logger.error("Error en RF50 al consultar el historial:", error);

    return {
      correcto: false,
      mensaje: MENSAJES.ERROR_HISTORIAL,
      datos: [],
    };
  }
};

// ============================================================
// RF50 - CONSULTAR DETALLE DE UN CAMBIO
// ============================================================

/**
 * Consulta el detalle de un registro del historial.
 *
 * Permite visualizar:
 * - Información anterior y posterior en modificaciones.
 * - Información anterior en eliminaciones.
 *
 * @param {number|string} historialCambioId Identificador del cambio.
 * @returns {Promise<Object>} Resultado de la consulta.
 */
export const consultarDetalleHistorial = async (historialCambioId) => {
  const identificador = Number(historialCambioId);

  if (
    historialCambioId === null ||
    historialCambioId === undefined ||
    historialCambioId === "" ||
    !Number.isInteger(identificador) ||
    identificador <= 0
  ) {
    return {
      correcto: false,
      mensaje: "Seleccione un cambio válido para consultar su detalle",
      datos: null,
    };
  }

  try {
    const registro = await obtenerDetalleHistorial(identificador);

    if (!registro) {
      return {
        correcto: false,
        mensaje: "No se encontró el detalle del cambio seleccionado",
        datos: null,
      };
    }

    return {
      correcto: true,
      mensaje: "Detalle del cambio consultado correctamente",
      datos: registro,
    };
  } catch (error) {
    logger.error("Error en RF50 al consultar el detalle:", error);

    return {
      correcto: false,
      mensaje:
        "No fue posible cargar el detalle del cambio. Intente nuevamente",
      datos: null,
    };
  }
};

// ============================================================
// EXPORTACIÓN DE VALIDACIONES PARA PRUEBAS UNITARIAS
// ============================================================

export const validarFiltrosHistorial = validarFiltros;
export const validarFechaHistorial = esFechaValida;
