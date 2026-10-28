/**
 * RF07: Pruebas unitarias del servicio de cierre de sesión.
 * Casos:
 * CP01: cierre exitoso.
 * CP02: la operación puede ser cancelada antes de llamar al servicio.
 * CP03: sesión expirada o inválida.
 * CP04: error al cerrar sesión.
 *
 * Nota: CP02 se prueba en el componente del menú;
 * aquí se prueba exclusivamente el servicio.
 */

import { cerrarSesionServicio } from '../../services/cerrarSesionServicio';

describe('RF07 - Servicio de cierre de sesión', () => {
  let clienteSupabase;

  beforeEach(() => {
    clienteSupabase = {
      auth: {
        signOut: jest.fn(),
      },
    };
  });

  test('CP01 - Cierra la sesión correctamente', async () => {
    clienteSupabase.auth.signOut.mockResolvedValue({
      error: null,
    });

    const resultado = await cerrarSesionServicio(clienteSupabase);

    expect(clienteSupabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(resultado).toBe(true);
  });

  test('CP03 - Gestiona el error cuando la sesión ya no es válida', async () => {
    clienteSupabase.auth.signOut.mockResolvedValue({
      error: {
        message: 'La sesión ya no es válida.',
      },
    });

    await expect(
      cerrarSesionServicio(clienteSupabase)
    ).rejects.toThrow('La sesión ya no es válida.');

    expect(clienteSupabase.auth.signOut).toHaveBeenCalledTimes(1);
  });

  test('CP04 - Informa un error si Supabase no puede cerrar la sesión', async () => {
    clienteSupabase.auth.signOut.mockResolvedValue({
      error: {
        message: 'No se pudo cerrar la sesión.',
      },
    });

    await expect(
      cerrarSesionServicio(clienteSupabase)
    ).rejects.toThrow('No se pudo cerrar la sesión.');
  });

  test('Controla la ausencia del cliente de Supabase', async () => {
    await expect(
      cerrarSesionServicio(null)
    ).rejects.toThrow(
      'El servicio de autenticación no está disponible.'
    );
  });

  test('Controla la ausencia del método signOut', async () => {
    await expect(
      cerrarSesionServicio({})
    ).rejects.toThrow(
      'El servicio de autenticación no está disponible.'
    );
  });
});