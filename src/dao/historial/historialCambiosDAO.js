
import { supabase } from "../../services/supabase";

const TABLA_HISTORIAL = "historial_cambios";

const COLUMNAS_HISTORIAL = `
    historial_cambio_id,
    usuario_id,
    rol_usuario,
    atencion_id,
    actividad_id,
    tipo_accion,
    datos_anteriores,
    datos_nuevos,
    fecha_cambio,
    entidad,
    registro_id
`;

/**
 * Aplica los filtros compartidos por las consultas del historial.
 */
function aplicarFiltrosHistorial(consulta, filtros = {}) {
    if (filtros.tipoAccion && filtros.tipoAccion !== "Todos") {
        consulta = consulta.eq("tipo_accion", filtros.tipoAccion);
    }

    if (filtros.usuarioId) {
        consulta = consulta.eq("usuario_id", filtros.usuarioId);
    }

    if (filtros.entidad && filtros.entidad !== "Todos") {
        consulta = consulta.eq("entidad", filtros.entidad);
    }

    if (filtros.fechaDesde) {
        consulta = consulta.gte(
            "fecha_cambio",
            `${filtros.fechaDesde}T00:00:00-05:00`
        );
    }

    if (filtros.fechaHasta) {
        consulta = consulta.lt(
            "fecha_cambio",
            obtenerInicioDiaSiguiente(filtros.fechaHasta)
        );
    }

    return consulta;
}

/**
 * Calcula el inicio del día siguiente para incluir
 * todas las horas de la fecha final seleccionada.
 */
function obtenerInicioDiaSiguiente(fecha) {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const siguiente = new Date(Date.UTC(anio, mes - 1, dia + 1));

    const fechaSiguiente = [
        siguiente.getUTCFullYear(),
        String(siguiente.getUTCMonth() + 1).padStart(2, "0"),
        String(siguiente.getUTCDate()).padStart(2, "0"),
    ].join("-");

    return `${fechaSiguiente}T00:00:00-05:00`;
}

/**
 * Consulta los registros del historial de cambios.
 */
export async function consultarHistorialCambios(filtros = {}) {
    const pagina = Math.max(Number(filtros.pagina) || 1, 1);

    const limite = Math.min(
        Math.max(Number(filtros.limite) || 20, 1),
        100
    );

    let consulta = supabase
        .from(TABLA_HISTORIAL)
        .select(COLUMNAS_HISTORIAL, { count: "exact" })
        .order("fecha_cambio", { ascending: false });

    consulta = aplicarFiltrosHistorial(consulta, filtros);

    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    consulta = consulta.range(desde, hasta);

    const { data, error, count } = await consulta;

    if (error) {
        throw new Error(
            `Error al consultar el historial: ${error.message}`
        );
    }

    return {
        registros: data || [],
        total: count || 0,
        pagina,
        limite,
        totalPaginas: Math.ceil((count || 0) / limite),
    };
}

/**
 * Consulta un registro específico del historial.
 */
export async function consultarDetalleHistorial(historialCambioId) {
    const { data, error } = await supabase
        .from(TABLA_HISTORIAL)
        .select(COLUMNAS_HISTORIAL)
        .eq("historial_cambio_id", historialCambioId)
        .maybeSingle();

    if (error) {
        throw new Error(
            `Error al consultar el detalle: ${error.message}`
        );
    }

    return data;
}

/**
 * Cuenta los registros del historial aplicando los mismos filtros.
 */
export async function contarRegistrosHistorial(filtros = {}) {
    let consulta = supabase
        .from(TABLA_HISTORIAL)
        .select("historial_cambio_id", {
            count: "exact",
            head: true,
        });

    consulta = aplicarFiltrosHistorial(consulta, filtros);

    const { count, error } = await consulta;

    if (error) {
        throw new Error(
            `Error al contar los registros: ${error.message}`
        );
    }

    return count || 0;
}
