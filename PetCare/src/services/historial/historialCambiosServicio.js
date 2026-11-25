
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

const ENTIDADES_VALIDAS = [
    "Todos",
    "propietarios",
    "mascotas",
    "atenciones",
    "actividades",
    "perfiles",
];

/**
 * Valida que una fecha exista realmente en el calendario.
 */
function esFechaValida(fecha) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return false;
    }

    const [anio, mes, dia] = fecha.split("-").map(Number);

    const fechaComprobacion = new Date(
        Date.UTC(anio, mes - 1, dia)
    );

    return (
        fechaComprobacion.getUTCFullYear() === anio &&
        fechaComprobacion.getUTCMonth() === mes - 1 &&
        fechaComprobacion.getUTCDate() === dia
    );
}

/**
 * Valida los filtros de búsqueda.
 */
export function validarFiltrosHistorial(filtros = {}) {
    const errores = [];

    const tipoAccion = filtros.tipoAccion || "Todos";
    const entidad = filtros.entidad || "Todos";

    if (!ACCIONES_VALIDAS.includes(tipoAccion)) {
        errores.push(
            "El tipo de acción seleccionado no es válido."
        );
    }

    if (!ENTIDADES_VALIDAS.includes(entidad)) {
        errores.push(
            "La entidad seleccionada no es válida."
        );
    }

    if (
        filtros.fechaDesde &&
        !esFechaValida(filtros.fechaDesde)
    ) {
        errores.push(
            "La fecha inicial no es válida."
        );
    }

    if (
        filtros.fechaHasta &&
        !esFechaValida(filtros.fechaHasta)
    ) {
        errores.push(
            "La fecha final no es válida."
        );
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

    if (
        filtros.pagina !== undefined &&
        (!Number.isInteger(Number(filtros.pagina)) ||
            Number(filtros.pagina) < 1)
    ) {
        errores.push("El número de página no es válido.");
    }

    if (
        filtros.limite !== undefined &&
        (!Number.isInteger(Number(filtros.limite)) ||
            Number(filtros.limite) < 1 ||
            Number(filtros.limite) > 100)
    ) {
        errores.push("El límite de registros no es válido.");
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

    return consultarHistorialCambios({
        tipoAccion: filtros.tipoAccion || "Todos",
        entidad: filtros.entidad || "Todos",
        fechaDesde: filtros.fechaDesde || null,
        fechaHasta: filtros.fechaHasta || null,
        usuarioId: filtros.usuarioId || null,
        pagina: Number(filtros.pagina) || 1,
        limite: Number(filtros.limite) || 20,
    });
}

/**
 * Obtiene el detalle de un cambio.
 */
export async function obtenerDetalleHistorial(historialCambioId) {
    const id = Number(historialCambioId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(
            "Debe seleccionar un registro válido del historial."
        );
    }

    const registro = await consultarDetalleHistorial(id);

    if (!registro) {
        throw new Error(
            "No se encontró el registro seleccionado."
        );
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

    return contarRegistrosHistorial({
        tipoAccion: filtros.tipoAccion || "Todos",
        entidad: filtros.entidad || "Todos",
        fechaDesde: filtros.fechaDesde || null,
        fechaHasta: filtros.fechaHasta || null,
        usuarioId: filtros.usuarioId || null,
    });
}
