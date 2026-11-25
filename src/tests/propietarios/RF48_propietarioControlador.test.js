/**
 * RF48 - Pruebas unitarias del controlador de propietarios.
 *
 * Comprueba la comunicación:
 * Controlador -> Servicio -> DAO simulado.
 *
 * No modifica ni consulta la base de datos real.
 */

jest.mock('../../dao/propietario/propietarioDAO', () => ({
  buscarPorCriterio: jest.fn(),
  actualizarEstado: jest.fn(),
}));

import propietarioControlador from '../../controllers/propietarios/propietarioControlador';
import * as propietarioDAO from '../../dao/propietario/propietarioDAO';

describe('RF48 - Controlador de estado del propietario', () => {
  const propietarioPrueba = {
    propietario_id: 10,
    nombre: 'Carlos',
    apellido: 'Ramírez',
    documento_identidad: '12345678',
    estado: 'Activo',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buscarPropietario', () => {
    test('CP01: debe encontrar un propietario correctamente', async () => {
      propietarioDAO.buscarPorCriterio.mockResolvedValue(
        propietarioPrueba
      );

      const respuesta =
        await propietarioControlador.buscarPropietario('Carlos');

      expect(propietarioDAO.buscarPorCriterio)
        .toHaveBeenCalledWith('Carlos');

      expect(respuesta.exito).toBe(true);
      expect(respuesta.datos).toEqual(propietarioPrueba);
      expect(respuesta.error).toBeNull();
    });

    test('CP02: debe informar cuando el propietario no existe', async () => {
      propietarioDAO.buscarPorCriterio.mockResolvedValue(null);

      const respuesta =
        await propietarioControlador.buscarPropietario('Inexistente');

      expect(respuesta.exito).toBe(false);
      expect(respuesta.datos).toBeNull();
      expect(respuesta.mensaje).toBe(
        'No se encontró el propietario.'
      );
    });

    test('CP03: debe rechazar una búsqueda vacía', async () => {
      const respuesta =
        await propietarioControlador.buscarPropietario('   ');

      expect(respuesta.exito).toBe(false);
      expect(respuesta.datos).toBeNull();
      expect(propietarioDAO.buscarPorCriterio)
        .not.toHaveBeenCalled();
    });

    test('CP04: debe informar si ocurre un error durante la búsqueda', async () => {
      propietarioDAO.buscarPorCriterio.mockRejectedValue(
        new Error('Error de consulta')
      );

      const respuesta =
        await propietarioControlador.buscarPropietario('Carlos');

      expect(respuesta.exito).toBe(false);
      expect(respuesta.datos).toBeNull();
      expect(respuesta.mensaje).toBe(
        'No se pudo realizar la búsqueda del propietario.'
      );
    });
  });

  describe('gestionarEstado', () => {
    test('CP05: debe desactivar un propietario correctamente', async () => {
      const propietarioInactivo = {
        ...propietarioPrueba,
        estado: 'Inactivo',
      };

      propietarioDAO.actualizarEstado.mockResolvedValue(
        propietarioInactivo
      );

      const respuesta =
        await propietarioControlador.gestionarEstado(
          10,
          'Inactivo',
          'Incumplimiento de normas'
        );

      expect(propietarioDAO.actualizarEstado).toHaveBeenCalledWith(
        10,
        'Inactivo',
        'Incumplimiento de normas'
      );

      expect(respuesta.exito).toBe(true);
      expect(respuesta.datos).toEqual(propietarioInactivo);
      expect(respuesta.error).toBeNull();
    });

    test('CP06: debe activar un propietario correctamente', async () => {
      const propietarioActivo = {
        ...propietarioPrueba,
        estado: 'Activo',
      };

      propietarioDAO.actualizarEstado.mockResolvedValue(
        propietarioActivo
      );

      const respuesta =
        await propietarioControlador.gestionarEstado(
          10,
          'Activo'
        );

      expect(propietarioDAO.actualizarEstado).toHaveBeenCalledWith(
        10,
        'Activo',
        ''
      );

      expect(respuesta.exito).toBe(true);
      expect(respuesta.datos).toEqual(propietarioActivo);
    });

    test('CP07: debe rechazar la desactivación sin motivo', async () => {
      const respuesta =
        await propietarioControlador.gestionarEstado(
          10,
          'Inactivo',
          '   '
        );

      expect(respuesta.exito).toBe(false);
      expect(respuesta.datos).toBeNull();

      expect(propietarioDAO.actualizarEstado)
        .not.toHaveBeenCalled();
    });

    test('CP08: debe rechazar un identificador vacío', async () => {
      const respuesta =
        await propietarioControlador.gestionarEstado(
          '',
          'Inactivo',
          'Motivo de prueba'
        );

      expect(respuesta.exito).toBe(false);
      expect(respuesta.datos).toBeNull();

      expect(propietarioDAO.actualizarEstado)
        .not.toHaveBeenCalled();
    });

    test('CP09: debe informar si falla la actualización', async () => {
      propietarioDAO.actualizarEstado.mockRejectedValue(
        new Error('Error de actualización')
      );

      const respuesta =
        await propietarioControlador.gestionarEstado(
          10,
          'Inactivo',
          'Motivo de prueba'
        );

      expect(respuesta.exito).toBe(false);
      expect(respuesta.datos).toBeNull();
      expect(respuesta.mensaje).toBe(
        'La operación no pudo completarse. Se mantiene el estado anterior.'
      );
    });
  });
});