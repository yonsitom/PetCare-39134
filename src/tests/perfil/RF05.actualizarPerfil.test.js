
/**
 * ============================================================
 * CASOS DE PRUEBA — RF05
 * Consultar y actualizar la información del perfil.
 * ============================================================
 *
 * Pruebas unitarias con Supabase Auth y DAO simulados.
 *
 * Se comprueba:
 * - Actualización de datos personales.
 * - Validación de campos obligatorios.
 * - Validación del correo electrónico.
 * - Rechazo de correos duplicados.
 * - Validación del teléfono.
 * - Solicitud de cambio de correo con verificación.
 * - Control de errores al guardar.
 *
 * Cada caso contiene Arrange, Act y Assert.
 * ============================================================
 */

jest.mock('../../services/supabase', () => ({
  supabase: {},
}));

import {
  actualizarPerfilUsuario,
  MENSAJES_RF05 as MENSAJES_PERFIL,
} from '../../services/autentificacion/perfilServicio';

// ------------------------------------------------------------
// DATOS DE PRUEBA
// ------------------------------------------------------------

const PERFIL_ID = 'perfil-asistente-001';
const CORREO_ACTUAL = 'asistente@veterinaria.com';

const OPCIONES_CAMBIO_CORREO = {
  emailRedirectTo: 'petcare://usuario/confirmarCambioCorreo',
};

function datosValidos(overrides = {}) {
  return {
    nombres: 'María',
    apellidos: 'García',
    correo: CORREO_ACTUAL,
    telefono: '987654321',
    direccion: 'Av. Los Olivos 123',
    ...overrides,
  };
}

/**
 * Prepara el entorno simulado de autenticación y guardado.
 */
function crearEntorno({
  correoActual = CORREO_ACTUAL,
  errorCambioCorreo = null,
  errorGuardar = null,
} = {}) {
  const user = {
    id: PERFIL_ID,
    email: correoActual,
  };

  const cliente = {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user },
        error: null,
      }),

      updateUser: jest.fn().mockResolvedValue({
        data: { user },
        error: errorCambioCorreo,
      }),
    },
  };

  const guardarDatos = jest.fn().mockImplementation(async () => {
    if (errorGuardar) {
      throw errorGuardar;
    }

    return {
      perfil_id: PERFIL_ID,
    };
  });

  return {
    cliente,
    guardarDatos,
  };
}

// ------------------------------------------------------------
// SUITE DE PRUEBAS
// ------------------------------------------------------------

describe(
  'RF05 - Consultar y actualizar la información del perfil',
  () => {
    // --------------------------------------------------------
    // CP01 - ACTUALIZACIÓN EXITOSA
    // --------------------------------------------------------

    test(
      'CP01 - actualiza el teléfono y conserva el correo actual',
      async () => {
        // ARRANGE
        const { cliente, guardarDatos } = crearEntorno();

        const datos = datosValidos({
          telefono: '912345678',
        });

        // ACT
        const resultado = await actualizarPerfilUsuario({
          perfilId: PERFIL_ID,
          correoOriginal: CORREO_ACTUAL,
          datos,
          cliente,
          guardarDatos,
        });

        // ASSERT
        expect(resultado.actualizado).toBe(true);

        expect(
          resultado.correoPendienteConfirmacion
        ).toBe(false);

        expect(resultado.correoActual).toBe(CORREO_ACTUAL);

        expect(cliente.auth.updateUser).not.toHaveBeenCalled();

        expect(guardarDatos).toHaveBeenCalledWith(
          PERFIL_ID,
          {
            nombre_completo: 'María García',
            telefono: '912345678',
            direccion: 'Av. Los Olivos 123',
          }
        );
      }
    );

    // --------------------------------------------------------
    // CP02 - CAMPO OBLIGATORIO VACÍO
    // --------------------------------------------------------

    test(
      'CP02 - rechaza los nombres vacíos y no guarda los datos',
      async () => {
        // ARRANGE
        const { cliente, guardarDatos } = crearEntorno();

        const datos = datosValidos({
          nombres: '   ',
        });

        // ACT / ASSERT
        await expect(
          actualizarPerfilUsuario({
            perfilId: PERFIL_ID,
            correoOriginal: CORREO_ACTUAL,
            datos,
            cliente,
            guardarDatos,
          })
        ).rejects.toThrow(
          'Complete los campos obligatorios para continuar.'
        );

        expect(cliente.auth.getUser).not.toHaveBeenCalled();
        expect(cliente.auth.updateUser).not.toHaveBeenCalled();
        expect(guardarDatos).not.toHaveBeenCalled();
      }
    );

    // --------------------------------------------------------
    // CP03 - CORREO CON FORMATO INCORRECTO
    // --------------------------------------------------------

    test(
      'CP03 - rechaza un correo con formato incorrecto',
      async () => {
        // ARRANGE
        const { cliente, guardarDatos } = crearEntorno();

        const datos = datosValidos({
          correo: 'asistente@.',
        });

        // ACT / ASSERT
        await expect(
          actualizarPerfilUsuario({
            perfilId: PERFIL_ID,
            correoOriginal: CORREO_ACTUAL,
            datos,
            cliente,
            guardarDatos,
          })
        ).rejects.toThrow(
          'Ingrese un formato de correo electrónico válido.'
        );

        expect(cliente.auth.getUser).not.toHaveBeenCalled();
        expect(cliente.auth.updateUser).not.toHaveBeenCalled();
        expect(guardarDatos).not.toHaveBeenCalled();
      }
    );

    // --------------------------------------------------------
    // CP04 - CORREO ELECTRÓNICO DUPLICADO
    // --------------------------------------------------------

    test(
      'CP04 - rechaza un correo que ya está registrado',
      async () => {
        // ARRANGE
        const { cliente, guardarDatos } = crearEntorno({
          errorCambioCorreo: {
            code: 'email_exists',
            message: 'User already registered',
          },
        });

        const correoNuevo = 'admin@veterinaria.com';

        const datos = datosValidos({
          correo: correoNuevo,
        });

        // ACT / ASSERT
        await expect(
          actualizarPerfilUsuario({
            perfilId: PERFIL_ID,
            correoOriginal: CORREO_ACTUAL,
            datos,
            cliente,
            guardarDatos,
          })
        ).rejects.toThrow(
          'El correo electrónico ya se encuentra registrado.'
        );

        expect(cliente.auth.updateUser).toHaveBeenCalledWith(
          {
            email: correoNuevo,
          },
          OPCIONES_CAMBIO_CORREO
        );

        expect(guardarDatos).not.toHaveBeenCalled();
      }
    );

    // --------------------------------------------------------
    // CP05 - TELÉFONO INVÁLIDO
    // --------------------------------------------------------

    test(
      'CP05 - rechaza un teléfono que contiene caracteres no válidos',
      async () => {
        // ARRANGE
        const { cliente, guardarDatos } = crearEntorno();

        const datos = datosValidos({
          telefono: '12ab',
        });

        // ACT / ASSERT
        await expect(
          actualizarPerfilUsuario({
            perfilId: PERFIL_ID,
            correoOriginal: CORREO_ACTUAL,
            datos,
            cliente,
            guardarDatos,
          })
        ).rejects.toThrow(
          'Ingrese un número de teléfono válido.'
        );

        expect(cliente.auth.getUser).not.toHaveBeenCalled();
        expect(cliente.auth.updateUser).not.toHaveBeenCalled();
        expect(guardarDatos).not.toHaveBeenCalled();
      }
    );

    // --------------------------------------------------------
    // CP06 - CAMBIO DE CORREO CON VERIFICACIÓN
    // --------------------------------------------------------

    test(
      'CP06 - solicita verificar el nuevo correo antes de sustituir el actual',
      async () => {
        // ARRANGE
        const { cliente, guardarDatos } = crearEntorno();

        const correoNuevo =
          'nuevo.asistente@veterinaria.com';

        const datos = datosValidos({
          correo: correoNuevo,
        });

        // ACT
        const resultado = await actualizarPerfilUsuario({
          perfilId: PERFIL_ID,
          correoOriginal: CORREO_ACTUAL,
          datos,
          cliente,
          guardarDatos,
        });

        // ASSERT
        expect(cliente.auth.updateUser).toHaveBeenCalledWith(
          {
            email: correoNuevo,
          },
          OPCIONES_CAMBIO_CORREO
        );

        expect(
          resultado.correoPendienteConfirmacion
        ).toBe(true);

        expect(resultado.correoActual).toBe(CORREO_ACTUAL);
        expect(resultado.correoNuevo).toBe(correoNuevo);

        expect(guardarDatos).toHaveBeenCalledWith(
          PERFIL_ID,
          {
            nombre_completo: 'María García',
            telefono: '987654321',
            direccion: 'Av. Los Olivos 123',
          }
        );
      }
    );

    // --------------------------------------------------------
    // CP07 - ERROR AL GUARDAR
    // --------------------------------------------------------

    test(
      'CP07 - informa del error al guardar y no reporta éxito',
      async () => {
        // ARRANGE
        const { cliente, guardarDatos } = crearEntorno({
          errorGuardar: new Error(
            'Error simulado de base de datos'
          ),
        });

        const datos = datosValidos({
          telefono: '912345678',
        });

        // ACT / ASSERT
        await expect(
          actualizarPerfilUsuario({
            perfilId: PERFIL_ID,
            correoOriginal: CORREO_ACTUAL,
            datos,
            cliente,
            guardarDatos,
          })
        ).rejects.toThrow(
          MENSAJES_PERFIL.guardar
        );

        expect(guardarDatos).toHaveBeenCalledWith(
          PERFIL_ID,
          {
            nombre_completo: 'María García',
            telefono: '912345678',
            direccion: 'Av. Los Olivos 123',
          }
        );

        expect(cliente.auth.updateUser).not.toHaveBeenCalled();
      }
    );
  }
);
