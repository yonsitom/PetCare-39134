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
    fecha_cambio
`;

/**
 * Consulta los registros del historial de cambios.
 */
export async function consultarHistorialCambios(filtros = {}) {
    let consulta = supabase
        .from(TABLA_HISTORIAL)
        .select(COLUMNAS_HISTORIAL, { count: "exact" })
        .order("fecha_cambio", { ascending: false });

    if (filtros.tipoAccion && filtros.tipoAccion !== "Todos") {
        consulta = consulta.eq("tipo_accion", filtros.tipoAccion);
    }

    if (filtros.usuarioId) {
        consulta = consulta.eq("usuario_id", filtros.usuarioId);
    }

    if (filtros.fechaDesde) {
        consulta = consulta.gte(
            "fecha_cambio",
            `${filtros.fechaDesde}T00:00:00`
        );
    }

    if (filtros.fechaHasta) {
        consulta = consulta.lte(
            "fecha_cambio",
            `${filtros.fechaHasta}T23:59:59`
        );
    }

    const pagina = Math.max(Number(filtros.pagina) || 1, 1);
    const limite = Math.min(
        Math.max(Number(filtros.limite) || 20, 1),
        100
    );

    const desde = (pagina - 1) * limite;
    const hasta = desde + limite - 1;

    consulta = consulta.range(desde, hasta);

    const { data, error, count } = await consulta;

    if (error) {
        throw new Error(`Error al consultar el historial: ${error.message}`);
    }

    return {
        registros: data || [],
        total: count || 0,
        pagina,
        limite,
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
 * Cuenta los registros del historial.
 */
export async function contarRegistrosHistorial(filtros = {}) {
    let consulta = supabase
        .from(TABLA_HISTORIAL)
        .select("historial_cambio_id", {
            count: "exact",
            head: true,
        });

    if (filtros.tipoAccion && filtros.tipoAccion !== "Todos") {
        consulta = consulta.eq("tipo_accion", filtros.tipoAccion);
    }

    if (filtros.fechaDesde) {
        consulta = consulta.gte(
            "fecha_cambio",
            `${filtros.fechaDesde}T00:00:00`
        );
    }

    if (filtros.fechaHasta) {
        consulta = consulta.lte(
            "fecha_cambio",
            `${filtros.fechaHasta}T23:59:59`
        );
    }

    const { count, error } = await consulta;

    if (error) {
        throw new Error(
            `Error al contar los registros: ${error.message}`
        );
    }

    return count || 0;
}