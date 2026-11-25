
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

import { verificarSesionPersistida } from '../../services/persistencia/sesionPersistenciaServicio';

describe('RF04 - Mantener activa la sesión', () => {

  const usuario = {
    id: 'usuario-001',
    email: 'asistente@veterinaria.com',
  };

  const crearDependencias = () => {
    const sesion = {
      access_token: 'token-acceso-prueba',
      refresh_token: 'token-renovacion-prueba',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: usuario,
    };

    const auth = {
      getSession: jest.fn().mockResolvedValue({
        data: { session: sesion },
        error: null,
      }),

      getUser: jest.fn().mockResolvedValue({
        data: { user: usuario },
        error: null,
      }),

      refreshSession: jest.fn().mockResolvedValue({
        data: { session: sesion },
        error: null,
      }),

      signOut: jest.fn().mockResolvedValue({
        error: null,
      }),
    };

    const verificarCuentaActiva = jest.fn().mockResolvedValue({
      autorizada: true,
    });

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
    const dependencias = crearDependencias();

    const resultado = await verificarSesionPersistida({
      auth: dependencias.auth,
      verificarCuentaActiva:
        dependencias.verificarCuentaActiva,
    });

    expect(resultado.autorizada).toBe(true);
    expect(resultado.usuario.id).toBe(usuario.id);

    expect(
      dependencias.auth.signOut
    ).not.toHaveBeenCalled();

    expect(
      dependencias.verificarCuentaActiva
    ).toHaveBeenCalledWith(usuario.id);
  });

  // ==========================================================
  // CP02 - E1: SESIÓN NO ENCONTRADA
  // ==========================================================

  test('CP02 - Sesión no encontrada: solicita autenticación', async () => {
    // ARRANGE
    const dependencias = crearDependencias();

    dependencias.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    // ACT
    const resultado = await verificarSesionPersistida({
      auth: dependencias.auth,
      verificarCuentaActiva:
        dependencias.verificarCuentaActiva,
    });

    // ASSERT
    expect(resultado.autorizada).toBe(false);
    expect(resultado.motivo).toBe('sin-sesion');

    expect(
      dependencias.auth.getUser
    ).not.toHaveBeenCalled();

    expect(
      dependencias.verificarCuentaActiva
    ).not.toHaveBeenCalled();
  });

  // ==========================================================
  // CP03 - E2: SESIÓN EXPIRADA
  // ==========================================================

  test('CP03 - Sesión expirada no renovable: invalida la sesión', async () => {
    // ARRANGE
    const dependencias = crearDependencias();

    dependencias.auth.getSession.mockResolvedValue({
      data: {
        session: {
          ...dependencias.sesion,
          expires_at: Math.floor(Date.now() / 1000) - 60,
        },
      },
      error: null,
    });

    dependencias.auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: new Error('Refresh token expired'),
    });

    // ACT
    const resultado = await verificarSesionPersistida({
      auth: dependencias.auth,
      verificarCuentaActiva:
        dependencias.verificarCuentaActiva,
    });

    // ASSERT
    expect(resultado.autorizada).toBe(false);
    expect(resultado.motivo).toBe('sesion-expirada');

    expect(
      dependencias.auth.refreshSession
    ).toHaveBeenCalled();

    expect(
      dependencias.auth.signOut
    ).toHaveBeenCalledWith({ scope: 'local' });

    expect(
      dependencias.verificarCuentaActiva
    ).not.toHaveBeenCalled();
  });

  // ==========================================================
  // CP04 - E3: SESIÓN INVÁLIDA
  // ==========================================================

  test('CP04 - Token inválido o revocado: invalida la sesión', async () => {
    // ARRANGE
    const dependencias = crearDependencias();

    dependencias.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid JWT or revoked session'),
    });

    // ACT
    const resultado = await verificarSesionPersistida({
      auth: dependencias.auth,
      verificarCuentaActiva:
        dependencias.verificarCuentaActiva,
    });

    // ASSERT
    expect(resultado.autorizada).toBe(false);

    expect(
      dependencias.auth.signOut
    ).toHaveBeenCalledWith({ scope: 'local' });

    expect(
      dependencias.verificarCuentaActiva
    ).not.toHaveBeenCalled();
  });

});
