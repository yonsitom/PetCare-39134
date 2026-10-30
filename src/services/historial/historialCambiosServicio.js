import {
    consultarHistorialCambios,
    consultarDetalleHistorial,
    contarRegistrosHistorial,
} from "../../dao/historial/historialCambiosDAO";

const ACCIONES_VALIDAS = [
    "Todos",
    "CREAR",
    "MODIFICAR",
    "CAMBIAR_ESTADO",
    "ELIMINAR",
];

/**
 * Valida los filtros de búsqueda.
 */
export function validarFiltrosHistorial(filtros = {}) {
    const errores = [];

    const tipoAccion = filtros.tipoAccion || "Todos";

    if (!ACCIONES_VALIDAS.includes(tipoAccion)) {
        errores.push("El tipo de acción seleccionado no es válido.");
    }

    if (
        filtros.fechaDesde &&
        !/^\d{4}-\d{2}-\d{2}$/.test(filtros.fechaDesde)
    ) {
        errores.push("La fecha inicial no tiene un formato válido.");
    }

    if (
        filtros.fechaHasta &&
        !/^\d{4}-\d{2}-\d{2}$/.test(filtros.fechaHasta)
    ) {
        errores.push("La fecha final no tiene un formato válido.");
    }

    if (
        filtros.fechaDesde &&
        filtros.fechaHasta &&
        filtros.fechaDesde > filtros.fechaHasta
    ) {
        errores.push(
            "La fecha inicial no puede ser posterior a la fecha final."
        );
    }

    return {
        valido: errores.length === 0,
        errores,
    };
}

/**
 * Obtiene los registros del historial.
 */
export async function obtenerHistorialCambios(filtros = {}) {
    const validacion = validarFiltrosHistorial(filtros);

    if (!validacion.valido) {
        throw new Error(validacion.errores.join("\n"));
    }

    return await consultarHistorialCambios({
        tipoAccion: filtros.tipoAccion || "Todos",
        fechaDesde: filtros.fechaDesde || null,
        fechaHasta: filtros.fechaHasta || null,
        usuarioId: filtros.usuarioId || null,
        pagina: filtros.pagina || 1,
        limite: filtros.limite || 20,
    });
}

/**
 * Obtiene el detalle de un cambio.
 */
export async function obtenerDetalleHistorial(historialCambioId) {
    if (!historialCambioId) {
        throw new Error("Debe seleccionar un registro del historial.");
    }

    const registro = await consultarDetalleHistorial(historialCambioId);

    if (!registro) {
        throw new Error("No se encontró el registro seleccionado.");
    }

    return registro;
}

/**
 * Obtiene el total de registros.
 */
export async function obtenerTotalHistorial(filtros = {}) {
    const validacion = validarFiltrosHistorial(filtros);

    if (!validacion.valido) {
        throw new Error(validacion.errores.join("\n"));
    }

    return await contarRegistrosHistorial(filtros);
}