
/**
 * ============================================================
 * PETCARE - SERVICIO DE HISTORIAL DE CAMBIOS
 * ============================================================
 *
 * RF42: Registrar automáticamente los cambios realizados
 *       en la información.
 *
 * ESCENARIOS TDD:
 *
 * CP01: Éxito - Trazabilidad registrada.
 * CP02: E1 - Error al registrar trazabilidad.
 * CP03: E2 - Usuario no identificado.
 * CP04: E3 - Información incompleta del cambio.
 *
 * Entidades:
 * - Propietarios
 * - Mascotas
 * - Atenciones
 * - Actividades
 *
 * Arquitectura:
 * Controlador -> Servicio -> DAO -> Supabase
 *
 * ============================================================
 */

const ACCIONES_VALIDAS = [
    "CREAR",
    "MODIFICAR",
    "CAMBIAR_ESTADO",
    "ELIMINAR",
];

const ENTIDADES_VALIDAS = [
    "propietarios",
    "mascotas",
    "atenciones",
    "actividades",
];

const ROLES_VALIDOS = [
    "Administrador",
    "Asistente",
];

const MENSAJES = {
    EXITO: "Cambio registrado correctamente.",

    ERROR_REGISTRO:
        "No fue posible registrar la trazabilidad. La operación no se completó.",

    USUARIO_NO_IDENTIFICADO:
        "No fue posible identificar al usuario. La operación no se completó.",

    INFORMACION_INCOMPLETA:
        "La información del cambio está incompleta. No se pudo registrar la trazabilidad.",
};

// ============================================================
// VALIDACIÓN DE INFORMACIÓN
// ============================================================

function tieneValor(valor) {
    return (
        valor !== null &&
        valor !== undefined &&
        String(valor).trim() !== ""
    );
}

function esObjetoValido(datos) {
    return (
        datos !== null &&
        typeof datos === "object" &&
        !Array.isArray(datos)
    );
}

/**
 * CP04:
 * Comprueba que se pueda determinar el tipo de acción
 * y la información afectada.
 */
export function validarCambio(cambio = {}) {
    const errores = [];

    if (!tieneValor(cambio.tipo_accion)) {
        errores.push("No se pudo determinar el tipo de acción.");
    } else if (!ACCIONES_VALIDAS.includes(cambio.tipo_accion)) {
        errores.push("El tipo de acción no es válido.");
    }

    if (!tieneValor(cambio.entidad)) {
        errores.push("No se pudo determinar la entidad afectada.");
    } else if (!ENTIDADES_VALIDAS.includes(cambio.entidad)) {
        errores.push("La entidad afectada no es válida.");
    }

    if (!tieneValor(cambio.registro_id)) {
        errores.push("No se pudo determinar el registro afectado.");
    }

    const tieneDatosAnteriores = esObjetoValido(
        cambio.datos_anteriores
    );

    const tieneDatosNuevos = esObjetoValido(
        cambio.datos_nuevos
    );

    if (!tieneDatosAnteriores && !tieneDatosNuevos) {
        errores.push("No se pudo determinar la información afectada.");
    }

    if (
        cambio.datos_anteriores !== null &&
        cambio.datos_anteriores !== undefined &&
        !tieneDatosAnteriores
    ) {
        errores.push("Los datos anteriores son inválidos.");
    }

    if (
        cambio.datos_nuevos !== null &&
        cambio.datos_nuevos !== undefined &&
        !tieneDatosNuevos
    ) {
        errores.push("Los datos nuevos son inválidos.");
    }

    return {
        valido: errores.length === 0,
        errores,
    };
}

// ============================================================
// IDENTIFICACIÓN DEL USUARIO
// ============================================================

/**
 * CP03:
 * Comprueba que se identifique al usuario que realiza
 * la operación y que tenga un rol permitido.
 */
export function validarUsuario(usuario) {
    if (
        !usuario ||
        !tieneValor(usuario.usuario_id) ||
        !ROLES_VALIDOS.includes(usuario.rol_usuario)
    ) {
        return {
            valido: false,
            mensaje: MENSAJES.USUARIO_NO_IDENTIFICADO,
        };
    }

    return {
        valido: true,
        mensaje: "",
    };
}

// ============================================================
// SERVICIO RF42
// ============================================================

/**
 * Servicio de registro automático de trazabilidad.
 *
 * Dependencias del repositorio:
 *
 * obtenerUsuarioActual()
 * ejecutarOperacionConAuditoria(datos)
 *
 * El segundo método debe ejecutar la operación original
 * y guardar el historial dentro de una misma transacción
 * en PostgreSQL.
 */
export function crearHistorialCambiosServicio(repositorio) {
    if (
        !repositorio ||
        typeof repositorio.obtenerUsuarioActual !== "function" ||
        typeof repositorio.ejecutarOperacionConAuditoria !== "function"
    ) {
        throw new Error(
            "El repositorio no implementa los métodos necesarios para RF42."
        );
    }

    /**
     * Registra la operación y su trazabilidad.
     *
     * CP01: operación exitosa.
     * CP02: error al guardar trazabilidad.
     * CP03: usuario no identificado.
     * CP04: información incompleta.
     */
    async function registrarCambio(cambio = {}) {

        // ----------------------------------------------------
        // CP04: validar información del cambio
        // ----------------------------------------------------

        const validacion = validarCambio(cambio);

        if (!validacion.valido) {
            return {
                exito: false,
                mensaje: MENSAJES.INFORMACION_INCOMPLETA,
                errores: validacion.errores,
                datos: null,
            };
        }

        // ----------------------------------------------------
        // CP03: identificar usuario
        // ----------------------------------------------------

        let usuario;

        try {
            usuario = await repositorio.obtenerUsuarioActual();
        } catch (error) {
            return {
                exito: false,
                mensaje: MENSAJES.USUARIO_NO_IDENTIFICADO,
                errores: [],
                datos: null,
            };
        }

        const validacionUsuario = validarUsuario(usuario);

        if (!validacionUsuario.valido) {
            return {
                exito: false,
                mensaje: MENSAJES.USUARIO_NO_IDENTIFICADO,
                errores: [],
                datos: null,
            };
        }

        // ----------------------------------------------------
        // Preparar información de trazabilidad
        // ----------------------------------------------------

        const datosAuditoria = {
            usuario_id: usuario.usuario_id,
            rol_usuario: usuario.rol_usuario,
            tipo_accion: cambio.tipo_accion,
            entidad: cambio.entidad,
            registro_id: cambio.registro_id,
            datos_anteriores: cambio.datos_anteriores ?? null,
            datos_nuevos: cambio.datos_nuevos ?? null,
            fecha_cambio: new Date().toISOString(),
        };

        // ----------------------------------------------------
        // CP01 y CP02: ejecutar operación con auditoría
        // ----------------------------------------------------

        try {
            const resultado =
                await repositorio.ejecutarOperacionConAuditoria(
                    datosAuditoria
                );

            if (!resultado || resultado.exito !== true) {
                return {
                    exito: false,
                    mensaje: MENSAJES.ERROR_REGISTRO,
                    errores: [],
                    datos: null,
                };
            }

            return {
                exito: true,
                mensaje: MENSAJES.EXITO,
                errores: [],
                datos: resultado.historial ?? resultado,
            };

        } catch (error) {
            return {
                exito: false,
                mensaje: MENSAJES.ERROR_REGISTRO,
                errores: [],
                datos: null,
            };
        }
    }

    return {
        registrarCambio,
    };
}

// ============================================================
// EXPORTACIONES
// ============================================================

export {
    ACCIONES_VALIDAS,
    ENTIDADES_VALIDAS,
    ROLES_VALIDOS,
    MENSAJES,
};
