/**
 * PETCARE - PRUEBAS CUS45
 * Requisito: Activar o desactivar la cuenta de un usuario.
 *
 * Archivo único de pruebas para CP01, CP02, CP03 y CP04.
 *
 * DIAGRAMA DE SECUENCIAS:
 * Actor Administrador -> Interfaz -> Control/Servicio -> Entidad/DAO.
 *
 * MVC:
 * - Vista: detalleUsuario.jsx.
 * - Control: servicio de administración de usuarios.
 * - Acceso a datos: usuariosDAO.js.
 *
 * TDD: estas pruebas se ejecutan antes de completar la implementación.
 */

jest.mock('../../dao/administracion/usuariosDAO', () => ({
  consultarUsuariosDAO: jest.fn(),
  actualizarEstadoCuentaDAO: jest.fn(),
}));

import {
  actualizarEstadoCuentaDAO,
} from '../../dao/administracion/usuariosDAO';

import {
  gestionarCambioEstadoCuenta,
} from '../../services/administracion/usuariosService';

describe('CUS45 - Activar o desactivar cuenta de usuario', () => {
  const perfilId = 'perfil-asistente-001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('CP01 - Cambia el estado de la cuenta correctamente', async () => {
    // ARRANGE:
    // El Administrador confirmó la operación en la interfaz.
    // El Control/Servicio solicita al DAO actualizar la entidad Usuario.
    actualizarEstadoCuentaDAO.mockResolvedValue({
      perfil_id: perfilId,
      estado_cuenta: 'Inactivo',
    });

    // ACT:
    const resultado = await gestionarCambioEstadoCuenta({
      perfilId,
      nuevoEstado: 'Inactivo',
      confirmado: true,
    });

    // ASSERT:
    expect(actualizarEstadoCuentaDAO).toHaveBeenCalledTimes(1);
    expect(actualizarEstadoCuentaDAO).toHaveBeenCalledWith(
      perfilId,
      'Inactivo'
    );
    expect(resultado).toEqual({
      ok: true,
      cancelado: false,
      usuario: {
        perfil_id: perfilId,
        estado_cuenta: 'Inactivo',
      },
    });
  });

  test('CP02 - Cancelar no modifica el estado de la cuenta', async () => {
    // ARRANGE:
    // El Administrador decide cancelar en el modal de confirmación.
    // El Control debe descartar la operación sin invocar al DAO.

    // ACT:
    const resultado = await gestionarCambioEstadoCuenta({
      perfilId,
      nuevoEstado: 'Inactivo',
      confirmado: false,
    });

    // ASSERT:
    expect(resultado).toEqual({
      ok: false,
      cancelado: true,
    });
    expect(actualizarEstadoCuentaDAO).not.toHaveBeenCalled();
  });

  test('CP03 - Informa cuando la cuenta ya no existe', async () => {
    // ARRANGE:
    // La cuenta desapareció o dejó de estar disponible
    // después de que el Administrador abrió su detalle.
    actualizarEstadoCuentaDAO.mockResolvedValue(null);

    // ACT:
    const resultado = await gestionarCambioEstadoCuenta({
      perfilId,
      nuevoEstado: 'Inactivo',
      confirmado: true,
    });

    // ASSERT:
    expect(actualizarEstadoCuentaDAO).toHaveBeenCalledTimes(1);
    expect(resultado.ok).toBe(false);
    expect(resultado.cancelado).toBe(false);
    expect(resultado.error).toMatch(/no existe|no fue posible|no se confirmó/i);
    expect(resultado.usuario).toBeUndefined();
  });

  test('CP04 - Conserva el estado anterior si falla la actualización', async () => {
    // ARRANGE:
    // El DAO simula un error de base de datos o de permisos RLS.
    actualizarEstadoCuentaDAO.mockRejectedValue(
      new Error('Error simulado de actualización')
    );

    // ACT:
    const resultado = await gestionarCambioEstadoCuenta({
      perfilId,
      nuevoEstado: 'Inactivo',
      confirmado: true,
    });

    // ASSERT:
    expect(actualizarEstadoCuentaDAO).toHaveBeenCalledTimes(1);
    expect(resultado.ok).toBe(false);
    expect(resultado.cancelado).toBe(false);
    expect(resultado.error).toBe('Error simulado de actualización');
    expect(resultado.usuario).toBeUndefined();
  });
});
