
import { iniciarSesionConCorreo } from '../../services/autenticacionServicio';
import { supabase } from '../../services/supabase';

jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}));

describe('RF01 - Servicio de autenticación', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('CP01 - autentica correctamente y devuelve el usuario', async () => {
    // Arrange
    const correo = 'asistente@petcare.com';
    const contrasena = 'Prueba123';
    const usuarioSimulado = {
      id: 'usuario-prueba-001',
      email: correo,
    };

    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: usuarioSimulado },
      error: null,
    });

    // Act
    const resultado = await iniciarSesionConCorreo(
      correo,
      contrasena
    );

    // Assert
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: correo,
      password: contrasena,
    });
    expect(resultado).toEqual(usuarioSimulado);
  });

  test('CP01 - elimina espacios exteriores del correo antes de autenticar', async () => {
    // Arrange
    const correo = '  asistente@petcare.com  ';
    const contrasena = 'Prueba123';

    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: 'usuario-prueba-002',
          email: 'asistente@petcare.com',
        },
      },
      error: null,
    });

    // Act
    await iniciarSesionConCorreo(correo, contrasena);

    // Assert
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'asistente@petcare.com',
      password: contrasena,
    });
  });

  test('CP04 - propaga el error cuando Supabase rechaza las credenciales', async () => {
    // Arrange
    const correo = 'asistente@petcare.com';
    const contrasena = 'Incorrecta123';
    const errorSimulado = new Error('Invalid login credentials');

    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: errorSimulado,
    });

    // Act
    const accion = iniciarSesionConCorreo(correo, contrasena);

    // Assert
    await expect(accion).rejects.toBe(errorSimulado);
  });

  test('CP05 - rechaza la autenticación si Supabase no devuelve un usuario', async () => {
    // Arrange
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    // Act
    const accion = iniciarSesionConCorreo(
      'asistente@petcare.com',
      'Prueba123'
    );

    // Assert
    await expect(accion).rejects.toThrow(
      /usuario autenticado/i
    );
  });

  test('CP06 - propaga los errores inesperados de Supabase', async () => {
    // Arrange
    const errorSimulado = new Error('Error de conexión simulado');

    supabase.auth.signInWithPassword.mockRejectedValue(
      errorSimulado
    );

    // Act
    const accion = iniciarSesionConCorreo(
      'asistente@petcare.com',
      'Prueba123'
    );

    // Assert
    await expect(accion).rejects.toBe(errorSimulado);
  });
});

