import {
    obtenerHistorialCambios,
    obtenerDetalleHistorial,
    obtenerTotalHistorial,
} from "../../services/historial/historialCambiosServicio";
import { logger } from '../../utils/logger';

/**
 * Controlador para cargar el historial de cambios.
 */
export async function cargarHistorialCambios(filtros = {}) {
    try {
        const resultado = await obtenerHistorialCambios(filtros);

        return {
            correcto: true,
            datos: resultado.registros,
            total: resultado.total,
            pagina: resultado.pagina,
            limite: resultado.limite,
            mensaje: "Historial consultado correctamente.",
        };
    } catch (error) {
        logger.error("Error en cargarHistorialCambios:", error);

        return {
            correcto: false,
            datos: [],
            total: 0,
            mensaje: error.message || "No se pudo cargar el historial.",
        };
    }
}

/**
 * Controlador para consultar el detalle de un cambio.
 */
export async function cargarDetalleHistorial(historialCambioId) {
    try {
        const registro = await obtenerDetalleHistorial(historialCambioId);

        return {
            correcto: true,
            datos: registro,
            mensaje: "Detalle consultado correctamente.",
        };
    } catch (error) {
        logger.error("Error en cargarDetalleHistorial:", error);

        return {
            correcto: false,
            datos: null,
            mensaje: error.message || "No se pudo consultar el detalle.",
        };
    }
}

/**
 * Controlador para contar los registros.
 */
export async function cargarTotalHistorial(filtros = {}) {
    try {
        const total = await obtenerTotalHistorial(filtros);

        return {
            correcto: true,
            total,
            mensaje: "Total consultado correctamente.",
        };
    } catch (error) {
        logger.error("Error en cargarTotalHistorial:", error);

        return {
            correcto: false,
            total: 0,
            mensaje: error.message || "No se pudo obtener el total.",
        };
    }
}