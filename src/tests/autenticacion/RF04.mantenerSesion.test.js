// ============================================================
// CASOS DE PRUEBA — RF04
// Mantener activa la sesión mientras las credenciales sean válidas.
//
// Objetivo:
// Comprobar que PetCare restaure una sesión válida y que invalide
// una sesión ausente, expirada o cuyo token sea inválido.
//
// Metodología TDD:
// ARRANGE: preparar las precondiciones y dependencias.
// ACT: ejecutar el servicio que verifica la sesión.
// ASSERT: comprobar que el resultado cumpla el comportamiento esperado.
// ============================================================

import { verificarSesionPersistida } from '../../services/sesionPersistenciaServicio';

describe('RF04 - Mantener activa la sesión', () => {

  // ----------------------------------------------------------
  // DATOS COMUNES PARA LOS CASOS DE PRUEBA
  // ----------------------------------------------------------

  // Usuario de prueba que representa a un asistente activo.
  // Este usuario es ficticio y solo se utiliza en las pruebas.
  const usuario = {
    id: 'usuario-001',
    email: 'asistente@veterinaria.com',
  };

  // Función auxiliar para preparar una sesión válida y sus
  // dependencias simuladas. No utiliza el servidor real.
  const crearDependencias = () => {

    // Sesión guardada con un token que todavía no ha expirado.
    const sesion = {
      access_token: 'token-acceso-prueba',
      refresh_token: 'token-renovacion-prueba',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: usuario,
    };

    // Simulamos las funciones de Supabase Auth.
    // Los resultados se controlan desde cada caso de prueba.
    const auth = {
      // Simula la lectura de la sesión persistida en el dispositivo.
      getSession: jest.fn().mockResolvedValue({
        data: { session: sesion },
        error: null,
      }),

      // Simula la validación del usuario contra el servidor.
      getUser: jest.fn().mockResolvedValue({
        data: { user: usuario },
        error: null,
      }),

      // Simula la renovación del token cuando sea necesario.
      refreshSession: jest.fn().mockResolvedValue({
        data: { session: sesion },
        error: null,
      }),

      // Simula el cierre de la sesión local.
      signOut: jest.fn().mockResolvedValue({
        error: null,
      }),
    };

    // Simula la comprobación de que el perfil del usuario
    // existe y que la cuenta se encuentra activa.
    const verificarCuentaActiva = jest.fn().mockResolvedValue({
      autorizada: true,
    });

    // Se devuelven todas las dependencias para poder
    // utilizarlas y verificarlas en cada caso.
    return {
      auth,
      verificarCuentaActiva,
      sesion,
    };
  };


  // ==========================================================
  // CP01 - ÉXITO: SESIÓN VIGENTE
  // ==========================================================

  test('CP01 - Sesión vigente: permite continuar al panel', async () => {

    // ARRANGE — PRECONDICIONES
    // 1. Existe una sesión guardada en el dispositivo.
    // 2. El token todavía se encuentra vigente.
    // 3. El servidor reconoce al usuario.
    // 4. El perfil del usuario está activo.
    const dependencias = crearDependencias();

    // ACT — ACCIÓN DEL SISTEMA
    // Se solicita al servicio que verifique la sesión guardada.
    const resultado = await verificarSesionPersistida({
      auth: dependencias.auth,
      verificarCuentaActiva:
        dependencias.verificarCuentaActiva,
    });

    // ASSERT — RESULTADOS ESPERADOS
    // El sistema autoriza la sesión.
    expect(resultado.autorizada).toBe(true);

    // El usuario validado corresponde al usuario de la sesión.
    expect(resultado.usuario.id).toBe(usuario.id);

    // No se cierra una sesión que es válida.
    expect(
      dependencias.auth.signOut
    ).not.toHaveBeenCalled();

    // Se verifica que se haya comprobado el estado de la cuenta.
    expect(
      dependencias.verificarCuentaActiva
    ).toHaveBeenCalledWith(usuario.id);
  });


  // ==========================================================
  // CP02 - E1: SESIÓN NO ENCONTRADA
  // ==========================================================

  test('CP02 - Sesión no encontrada: solicita autenticación', async () => {

    // ARRANGE — PRECONDICIONES
    // 1. No existe una sesión guardada en el dispositivo.
    // 2. El servicio de autenticación responde correctamente.
    // 3. No se necesita validar un usuario porque no hay sesión.
    const dependencias = crearDependencias();

    // Se modifica la respuesta simulada para representar
    // el primer acceso o la eliminación de los datos de sesión.
    dependencias.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    // ACT — ACCIÓN DEL SISTEMA
    // Se comprueba si hay una sesión persistida.
    const resultado = await verificarSesionPersistida({
      auth: dependencias.auth,
      verificarCuentaActiva:
        dependencias.verificarCuentaActiva,
    });

    // ASSERT — RESULTADOS ESPERADOS
    // El sistema no autoriza el acceso al panel.
    expect(resultado.autorizada).toBe(false);

    // El motivo identifica que no se encontró una sesión.
    expect(resultado.motivo).toBe('sin-sesion');

    // No se consulta al servidor por un usuario sin sesión.
    expect(
      dependencias.auth.getUser
    ).not.toHaveBeenCalled();

    // Tampoco se consulta el estado del perfil.
    expect(
      dependencias.verificarCuentaActiva
    ).not.toHaveBeenCalled();
  });


  // ==========================================================
  // CP03 - E2: SESIÓN EXPIRADA
  // ==========================================================

  test('CP03 - Sesión expirada no renovable: invalida la sesión', async () => {

    // ARRANGE — PRECONDICIONES
    // 1. Existe una sesión guardada en el dispositivo.
    // 2. La fecha de expiración del token ya pasó.
    // 3. El token de renovación también ha expirado.
    // 4. Supabase no puede renovar la sesión.
    const dependencias = crearDependencias();

    // Se simula un token de acceso cuya fecha de expiración
    // se encuentra en el pasado.
    dependencias.auth.getSession.mockResolvedValue({
      data: {
        session: {
          ...dependencias.sesion,
          expires_at: Math.floor(Date.now() / 1000) - 60,
        },
      },
      error: null,
    });

    // Se simula el rechazo de la renovación por parte
    // del servicio de autenticación.
    dependencias.auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: new Error('Refresh token expired'),
    });

    // ACT — ACCIÓN DEL SISTEMA
    // El servicio detecta la expiración e intenta renovar
    // la sesión antes de decidir si debe invalidarla.
    const resultado = await verificarSesionPersistida({
      auth: dependencias.auth,
      verificarCuentaActiva:
        dependencias.verificarCuentaActiva,
    });

    // ASSERT — RESULTADOS ESPERADOS
    // No se autoriza el acceso con una sesión no renovable.
    expect(resultado.autorizada).toBe(false);

    // El sistema identifica la sesión como expirada.
    expect(resultado.motivo).toBe('sesion-expirada');

    // Se comprueba que realmente se intentó renovar el token.
    expect(
      dependencias.auth.refreshSession
    ).toHaveBeenCalled();

    // La sesión local se limpia al no poder renovarse.
    expect(
      dependencias.auth.signOut
    ).toHaveBeenCalledWith({ scope: 'local' });

    // No se valida el perfil de una sesión que ya es inválida.
    expect(
      dependencias.verificarCuentaActiva
    ).not.toHaveBeenCalled();
  });


  // ==========================================================
  // CP04 - E3: SESIÓN INVÁLIDA
  // ==========================================================

  test('CP04 - Token inválido o revocado: invalida la sesión', async () => {

    // ARRANGE — PRECONDICIONES
    // 1. Existe una sesión guardada en el dispositivo.
    // 2. La sesión no parece expirada según su fecha local.
    // 3. Sin embargo, el servidor rechaza el token.
    // 4. Puede tratarse de un token alterado o de una
    //    sesión que ya no es aceptada por el servidor.
    const dependencias = crearDependencias();

    // Se simula el rechazo de la validación del usuario.
    dependencias.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid JWT or revoked session'),
    });

    // ACT — ACCIÓN DEL SISTEMA
    // El servicio intenta verificar el usuario en Supabase.
    const resultado = await verificarSesionPersistida({
      auth: dependencias.auth,
      verificarCuentaActiva:
        dependencias.verificarCuentaActiva,
    });

    // ASSERT — RESULTADOS ESPERADOS
    // El sistema no debe autorizar una sesión rechazada.
    expect(resultado.autorizada).toBe(false);

    // Se elimina la sesión almacenada localmente.
    expect(
      dependencias.auth.signOut
    ).toHaveBeenCalledWith({ scope: 'local' });

    // No se consulta el perfil si el servidor no valida al usuario.
    expect(
      dependencias.verificarCuentaActiva
    ).not.toHaveBeenCalled();
  });

});