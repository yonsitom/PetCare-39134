
import {
    obtenerHistorialCambios,
    obtenerDetalleHistorial,
    obtenerTotalHistorial
} from "../../services/historial/historialCambiosServicio";

/**
 * PETCARE - CONTROLADOR DE HISTORIAL DE CAMBIOS
 * RF42: Consultar historial de cambios.
 *
 * Arquitectura:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase.
 */

export async function cargarHistorialCambios(filtros = {}) {
    try {
        const resultado = await obtenerHistorialCambios(filtros);

        return {
            correcto: true,
            datos: resultado.registros || [],
            total: resultado.total || 0,
            pagina: resultado.pagina || 1,
            limite: resultado.limite || 20,
            mensaje: "Historial consultado correctamente."
        };
    } catch (error) {
        console.error("Error en cargarHistorialCambios:", error);

        return {
            correcto: false,
            datos: [],
            total: 0,
            pagina: 1,
            limite: 20,
            mensaje: error.message || "No fue posible consultar el historial."
        };
    }
}

export async function cargarDetalleHistorial(historialCambioId) {
    try {
        const resultado = await obtenerDetalleHistorial(historialCambioId);

        if (!resultado) {
            return {
                correcto: false,
                datos: null,
                mensaje: "No se encontró el registro del historial."
            };
        }

        return {
            correcto: true,
            datos: resultado,
            mensaje: "Detalle consultado correctamente."
        };
    } catch (error) {
        console.error("Error en cargarDetalleHistorial:", error);

        return {
            correcto: false,
            datos: null,
            mensaje: error.message || "No fue posible consultar el detalle."
        };
    }
}

export async function cargarTotalHistorial(filtros = {}) {
    try {
        const total = await obtenerTotalHistorial(filtros);

        return {
            correcto: true,
            total: total || 0,
            mensaje: "Total consultado correctamente."
        };
    } catch (error) {
        console.error("Error en cargarTotalHistorial:", error);

        return {
            correcto: false,
            total: 0,
            mensaje: error.message || "No fue posible contar los registros."
        };
    }
}
