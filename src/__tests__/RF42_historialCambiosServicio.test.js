
/**
 * ============================================================
 * PETCARE - PRUEBAS UNITARIAS TDD
 * ============================================================
 *
 * RF42: Registrar automáticamente los cambios realizados
 *       en la información.
 *
 * ESCENARIOS:
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
 * ============================================================
 */

const {
    crearHistorialCambiosServicio,
} = require('../services/historial/RF42_historialCambiosServicio');

describe('RF42 - Registro automático de cambios', () => {

    let repositorio;
    let servicio;

    // --------------------------------------------------------
    // DATOS DE PRUEBA
    // --------------------------------------------------------

    const usuarioAdministrador = {
        usuario_id: 'usuario-001',
        rol_usuario: 'Administrador',
    };

    const cambioValido = {
        tipo_accion: 'MODIFICAR',
        entidad: 'propietarios',
        registro_id: 10,

        datos_anteriores: {
            telefono: '999111222',
            direccion: 'Calle antigua',
        },

        datos_nuevos: {
            telefono: '988111222',
            direccion: 'Calle nueva',
        },
    };

    // --------------------------------------------------------
    // CONFIGURACIÓN ANTES DE CADA ESCENARIO
    // --------------------------------------------------------

    beforeEach(() => {

        repositorio = {
            obtenerUsuarioActual: jest.fn(),

            ejecutarOperacionConAuditoria: jest.fn(),
        };

        repositorio.obtenerUsuarioActual.mockResolvedValue(
            usuarioAdministrador
        );

        repositorio.ejecutarOperacionConAuditoria.mockResolvedValue({
            exito: true,

            historial: {
                historial_cambio_id: 1,
                usuario_id: 'usuario-001',
                rol_usuario: 'Administrador',
                tipo_accion: 'MODIFICAR',
                entidad: 'propietarios',
                registro_id: 10,
            },
        });

        servicio = crearHistorialCambiosServicio(repositorio);
    });

    // ========================================================
    // CP01: ÉXITO - TRAZABILIDAD REGISTRADA
    // ========================================================

    test('CP01: registra correctamente la trazabilidad del cambio realizado', async () => {

        const resultado = await servicio.registrarCambio(
            cambioValido
        );

        // Verifica identificación del usuario.
        expect(
            repositorio.obtenerUsuarioActual
        ).toHaveBeenCalledTimes(1);

        // Verifica ejecución de la operación con auditoría.
        expect(
            repositorio.ejecutarOperacionConAuditoria
        ).toHaveBeenCalledTimes(1);

        // Verifica resultado exitoso.
        expect(resultado.exito).toBe(true);

        expect(resultado.mensaje).toBe(
            'Cambio registrado correctamente.'
        );

        // Verifica información registrada.
        const datosRegistrados =
            repositorio.ejecutarOperacionConAuditoria.mock.calls[0][0];

        expect(datosRegistrados).toMatchObject({
            usuario_id: 'usuario-001',
            rol_usuario: 'Administrador',
            tipo_accion: 'MODIFICAR',
            entidad: 'propietarios',
            registro_id: 10,

            datos_anteriores: {
                telefono: '999111222',
                direccion: 'Calle antigua',
            },

            datos_nuevos: {
                telefono: '988111222',
                direccion: 'Calle nueva',
            },
        });

        // Verifica que exista fecha y hora del cambio.
        expect(datosRegistrados.fecha_cambio).toBeDefined();

        expect(
            new Date(datosRegistrados.fecha_cambio).toString()
        ).not.toBe('Invalid Date');
    });

    // ========================================================
    // CP02: E1 - ERROR AL REGISTRAR TRAZABILIDAD
    // ========================================================

    test('CP02: impide completar la operación cuando ocurre un error al registrar la trazabilidad', async () => {

        repositorio.ejecutarOperacionConAuditoria.mockRejectedValue(
            new Error('Error al guardar el historial.')
        );

        const resultado = await servicio.registrarCambio(
            cambioValido
        );

        expect(resultado.exito).toBe(false);

        expect(resultado.mensaje).toBe(
            'No fue posible registrar la trazabilidad. La operación no se completó.'
        );

        expect(resultado.datos).toBeNull();

        // Se intentó registrar la operación con auditoría.
        expect(
            repositorio.ejecutarOperacionConAuditoria
        ).toHaveBeenCalledTimes(1);
    });

    // ========================================================
    // CP03: E2 - USUARIO NO IDENTIFICADO
    // ========================================================

    test('CP03: impide completar la operación cuando el sistema no identifica al usuario', async () => {

        repositorio.obtenerUsuarioActual.mockResolvedValue(null);

        const resultado = await servicio.registrarCambio(
            cambioValido
        );

        expect(resultado.exito).toBe(false);

        expect(resultado.mensaje).toBe(
            'No fue posible identificar al usuario. La operación no se completó.'
        );

        expect(resultado.datos).toBeNull();

        // No debe ejecutar la operación sin identificar al usuario.
        expect(
            repositorio.ejecutarOperacionConAuditoria
        ).not.toHaveBeenCalled();
    });

    // ========================================================
    // CP04: E3 - INFORMACIÓN INCOMPLETA DEL CAMBIO
    // ========================================================

    test('CP04: impide registrar la trazabilidad cuando no se puede determinar el tipo de cambio o la información afectada', async () => {

        // Primera situación:
        // No se puede determinar el tipo de acción.

        const cambioSinTipoAccion = {
            ...cambioValido,
            tipo_accion: null,
        };

        const resultadoSinTipo =
            await servicio.registrarCambio(cambioSinTipoAccion);

        expect(resultadoSinTipo.exito).toBe(false);

        expect(resultadoSinTipo.mensaje).toBe(
            'La información del cambio está incompleta. No se pudo registrar la trazabilidad.'
        );

        expect(resultadoSinTipo.datos).toBeNull();

        // Segunda situación:
        // No se puede determinar la información afectada.

        const cambioSinInformacion = {
            ...cambioValido,
            datos_anteriores: null,
            datos_nuevos: null,
        };

        const resultadoSinInformacion =
            await servicio.registrarCambio(cambioSinInformacion);

        expect(resultadoSinInformacion.exito).toBe(false);

        expect(resultadoSinInformacion.mensaje).toBe(
            'La información del cambio está incompleta. No se pudo registrar la trazabilidad.'
        );

        expect(resultadoSinInformacion.datos).toBeNull();

        // Ninguna de las dos situaciones debe ejecutar
        // la operación ni registrar la trazabilidad.

        expect(
            repositorio.ejecutarOperacionConAuditoria
        ).not.toHaveBeenCalled();
    });

});
