
/*
 * PetCare - RF06: Cambiar la contraseña del usuario
 *
 * CP01: Cambio exitoso.
 * CP02: Campos incompletos.
 * CP03: Contraseña actual incorrecta.
 * CP04: Contraseñas nuevas diferentes.
 * CP05: Nueva contraseña no válida.
 * CP06: Nueva contraseña igual a la actual.
 *
 * Las pruebas usan un Supabase simulado.
 * No cambian la contraseña de ninguna cuenta real.
 */

jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
      updateUser: jest.fn(),
    },
  },
}));

import { supabase } from '../../services/supabase';
import { cambiarContrasena } from '../../services/autenticacion';
const DATOS_VALIDOS = {
  contrasenaActual: 'Vet@2026',
  nuevaContrasena: 'Nueva@2026',
  confirmarContrasena: 'Nueva@2026',
};

describe('RF06 - Cambiar la contraseña del usuario', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    supabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'usuario-prueba-001',
          email: 'asistente@veterinaria.com',
        },
      },
      error: null,
    });

    supabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: {
          id: 'usuario-prueba-001',
          email: 'asistente@veterinaria.com',
        },
      },
      error: null,
    });

    supabase.auth.updateUser.mockResolvedValue({
      data: {
        user: {
          id: 'usuario-prueba-001',
          email: 'asistente@veterinaria.com',
        },
      },
      error: null,
    });
  });

  test('CP01 - cambia la contraseña correctamente', async () => {
    // ARRANGE: sesión activa y credenciales válidas.
    const datos = { ...DATOS_VALIDOS };

    // ACT: solicitar el cambio.
    const resultado = await cambiarContrasena(datos);

    // ASSERT: se verifica la contraseña actual y se actualiza la nueva.
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'asistente@veterinaria.com',
      password: 'Vet@2026',
    });
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      password: 'Nueva@2026',
    });
    expect(resultado).toBeTruthy();
  });

  test('CP02 - rechaza campos incompletos', async () => {
    // ARRANGE: falta la confirmación.
    const datos = {
      contrasenaActual: 'Vet@2026',
      nuevaContrasena: 'Nueva@2026',
      confirmarContrasena: '',
    };

    // ACT y ASSERT: no debe continuar con la autenticación ni actualizar.
    await expect(cambiarContrasena(datos)).rejects.toThrow(
      'Complete todos los campos para continuar.'
    );

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  test('CP03 - rechaza una contraseña actual incorrecta', async () => {
    // ARRANGE: la reautenticación indica credenciales incorrectas.
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    // ACT y ASSERT: el cambio debe rechazarse.
    await expect(
      cambiarContrasena({
        ...DATOS_VALIDOS,
        contrasenaActual: 'Incorrecta123',
      })
    ).rejects.toThrow('La contraseña actual es incorrecta.');

    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  test('CP04 - rechaza contraseñas nuevas diferentes', async () => {
    // ARRANGE: la confirmación no coincide con la nueva contraseña.
    const datos = {
      ...DATOS_VALIDOS,
      confirmarContrasena: 'Nueva@2027',
    };

    // ACT y ASSERT: debe detenerse antes de consultar credenciales.
    await expect(cambiarContrasena(datos)).rejects.toThrow(
      'Las contraseñas nuevas no coinciden. Verifique los datos ingresados.'
    );

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  test('CP05 - rechaza una nueva contraseña que no cumple los requisitos', async () => {
    // ARRANGE: contraseña demasiado corta y sin mayúscula.
    const datos = {
      contrasenaActual: 'Vet@2026',
      nuevaContrasena: 'abc123',
      confirmarContrasena: 'abc123',
    };

    // ACT y ASSERT: no debe actualizar la contraseña.
    await expect(cambiarContrasena(datos)).rejects.toThrow(
      'La contraseña debe tener mínimo 8 caracteres, incluyendo una mayúscula, una minúscula y un número.'
    );

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  test('CP06 - rechaza una nueva contraseña igual a la actual', async () => {
    // ARRANGE: la contraseña nueva es idéntica a la actual.
    const datos = {
      contrasenaActual: 'Vet@2026',
      nuevaContrasena: 'Vet@2026',
      confirmarContrasena: 'Vet@2026',
    };

    // ACT y ASSERT: no debe cambiar la contraseña.
    await expect(cambiarContrasena(datos)).rejects.toThrow(
      'La nueva contraseña debe ser diferente a la contraseña actual.'
    );

    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
});
