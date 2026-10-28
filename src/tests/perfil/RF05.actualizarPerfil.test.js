/**
 * ============================================================
 * CASOS DE PRUEBA — RF05
 * Consultar y actualizar la información del perfil.
 * ============================================================
 *
 * Estas son pruebas unitarias.
 *
 * Se simula Supabase Auth y la función DAO para:
 * - Evitar modificar datos reales.
 * - Evitar enviar correos reales.
 * - Comprobar los mensajes establecidos en RF05.
 * - Verificar que no se guarden datos inválidos.
 *
 * Cada caso contiene Arrange, Act y Assert:
 * Arrange: preparar las precondiciones.
 * Act: ejecutar la operación.
 * Assert: verificar el resultado obtenido.
 * ============================================================
 */

// Simular el cliente Supabase para que Jest no contacte
// con el proyecto real durante las pruebas.
jest.mock('../../services/supabase', () => ({
  supabase: {},
}));

import {
  actualizarPerfilUsuario,
  MENSAJES_RF05 as MENSAJES_PERFIL,
} from '../../services/perfilServicio';

// ------------------------------------------------------------
// DATOS DE PRUEBA
// ------------------------------------------------------------

const PERFIL_ID = 'perfil-asistente-001';
const CORREO_ACTUAL = 'asistente@veterinaria.com';

/**
 * Construye datos válidos para reutilizarlos en cada escenario.
 * Cada prueba puede sobrescribir uno o varios campos.
 */
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
 * Prepara un entorno simulado de autenticación y guardado.
 *
 * errorCambioCorreo permite simular un correo duplicado
 * u otro error al solicitar el cambio de correo.
 *
 * errorGuardar permite simular un fallo de la base de datos.
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
        // ARRANGE:
        // Existe un perfil autenticado.
        // El usuario tiene cuenta activa.
        // Los datos del formulario tienen formato válido.
        // El servicio DAO está disponible.
        const { cliente, guardarDatos } = crearEntorno();

        const datos = datosValidos({
          telefono: '912345678',
        });

        // ACT:
        // Se actualiza el teléfono sin cambiar el correo.
        const resultado = await actualizarPerfilUsuario({
          perfilId: PERFIL_ID,
          correoOriginal: CORREO_ACTUAL,
          datos,
          cliente,
          guardarDatos,
        });

        // ASSERT:
        // La operación debe completarse.
        // El correo no debe cambiar.
        // No se debe solicitar una actualización de correo.
        // El DAO debe recibir los datos personales correctos.
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
        // ARRANGE:
        // Existe un usuario autenticado.
        // El resto de los datos es válido.
        // El campo Nombres contiene únicamente espacios.
        const { cliente, guardarDatos } = crearEntorno();

        const datos = datosValidos({
          nombres: '   ',
        });

        // ACT / ASSERT:
        // El servicio debe rechazar la petición con el mensaje
        // exacto establecido para los campos obligatorios.
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

        // No debe consultar la sesión ni guardar datos
        // porque la validación se realiza primero.
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
        // ARRANGE:
        // Los campos obligatorios están completos.
        // El correo ingresado es asistente@., que no tiene
        // un dominio válido.
        const { cliente, guardarDatos } = crearEntorno();

        const datos = datosValidos({
          correo: 'asistente@.',
        });

        // ACT / ASSERT:
        // Debe rechazarse el correo antes de contactar
        // con Auth o de modificar la tabla perfiles.
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
        // ARRANGE:
        // El usuario está autenticado con su correo actual.
        // El nuevo correo tiene formato válido, pero Supabase
        // Auth comunica que ya pertenece a otra cuenta.
        const { cliente, guardarDatos } = crearEntorno({
          errorCambioCorreo: {
            code: 'email_exists',
            message: 'User already registered',
          },
        });

        const datos = datosValidos({
          correo: 'admin@veterinaria.com',
        });

        // ACT / ASSERT:
        // El servicio debe traducir el error al mensaje
        // establecido y no guardar los datos personales.
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

        expect(cliente.auth.updateUser).toHaveBeenCalledWith({
          email: 'admin@veterinaria.com',
        });

        expect(guardarDatos).not.toHaveBeenCalled();
      }
    );

    // --------------------------------------------------------
    // CP05 - TELÉFONO INVÁLIDO
    // --------------------------------------------------------

    test(
      'CP05 - rechaza un teléfono que contiene caracteres no válidos',
      async () => {
        // ARRANGE:
        // Los demás datos son válidos.
        // El teléfono contiene letras y no satisface el formato.
        const { cliente, guardarDatos } = crearEntorno();

        const datos = datosValidos({
          telefono: '12ab',
        });

        // ACT / ASSERT:
        // Debe mostrarse el mensaje exacto y no guardar.
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
        // ARRANGE:
        // El usuario tiene una sesión autenticada.
        // Su correo actual es asistente@veterinaria.com.
        // El nuevo correo tiene formato válido y no está duplicado.
        // Supabase Auth acepta la solicitud de cambio.
        const { cliente, guardarDatos } = crearEntorno();

        const correoNuevo =
          'nuevo.asistente@veterinaria.com';

        const datos = datosValidos({
          correo: correoNuevo,
        });

        // ACT:
        // Se solicita el cambio de correo y se guardan
        // los datos personales válidos.
        const resultado = await actualizarPerfilUsuario({
          perfilId: PERFIL_ID,
          correoOriginal: CORREO_ACTUAL,
          datos,
          cliente,
          guardarDatos,
        });

        // ASSERT:
        // Debe solicitarse el cambio a Supabase Auth.
        // La pantalla debe recibir el indicador de verificación.
        // El usuario autenticado simulado sigue teniendo
        // el correo anterior hasta completar la confirmación.
        expect(cliente.auth.updateUser).toHaveBeenCalledWith({
          email: correoNuevo,
        });

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
        // ARRANGE:
        // La sesión es válida.
        // Los datos ingresados son correctos.
        // El correo no cambia.
        // La función DAO simula un fallo de base de datos.
        const { cliente, guardarDatos } = crearEntorno({
          errorGuardar: new Error(
            'Error simulado de base de datos'
          ),
        });

        const datos = datosValidos({
          telefono: '912345678',
        });

        // ACT / ASSERT:
        // El servicio debe devolver el mensaje establecido
        // sin revelar detalles técnicos a la interfaz.
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

        // El guardado se intentó, pero no se reportó éxito.
        expect(guardarDatos).toHaveBeenCalledWith(
          PERFIL_ID,
          {
            nombre_completo: 'María García',
            telefono: '912345678',
            direccion: 'Av. Los Olivos 123',
          }
        );

        // Como el correo no cambió, no se solicitó
        // ninguna modificación de Supabase Auth.
        expect(cliente.auth.updateUser).not.toHaveBeenCalled();
      }
    );
  }
);