
/**
 * RF48 - Gestionar estado del propietario.
 *
 * Casos de prueba definidos:
 * CP01: Éxito - activación o desactivación del propietario.
 * CP02: E1 - Propietario no encontrado.
 * CP03: E2 - Búsqueda sin datos.
 * CP04: E3 - Error al actualizar el estado.
 *
 * Metodología TDD: AAA
 * Arrange: preparar los datos y las dependencias.
 * Act: ejecutar la operación.
 * Assert: comprobar el resultado esperado.
 */

import {
  crearPropietarioEstadoServicio,
  MENSAJES_ESTADO_PROPIETARIO,
} from '../../services/propietarioEstadoServicio';

describe('RF48 - Gestionar estado del propietario', () => {
  let propietarioDAO;
  let servicio;

  const propietario = {
    propietario_id: 1,
    nombre_completo: 'Juan Pérez',
    documento_identidad: '12345678',
    estado: 'Activo',
  };

  beforeEach(() => {
    // Arrange: simular el acceso a los datos.
    propietarioDAO = {
      buscarPorCriterio: jest.fn(),
      actualizarEstado: jest.fn(),
    };

    servicio = crearPropietarioEstadoServicio(propietarioDAO);
  });

  test('CP01: debe activar o desactivar correctamente un propietario', async () => {
    // Arrange
    const propietarioActivado = {
      ...propietario,
      estado: 'Activo',
    };

    const propietarioDesactivado = {
      ...propietario,
      estado: 'Inactivo',
    };

    propietarioDAO.actualizarEstado
      .mockResolvedValueOnce(propietarioActivado)
      .mockResolvedValueOnce(propietarioDesactivado);

    // Act
    const resultadoActivar = await servicio.gestionarEstado(
      propietario.propietario_id,
      'Activo'
    );

    const resultadoDesactivar = await servicio.gestionarEstado(
      propietario.propietario_id,
      'Inactivo'
    );

    // Assert
    expect(resultadoActivar.exito).toBe(true);
    expect(resultadoActivar.propietario.estado).toBe('Activo');

    expect(resultadoDesactivar.exito).toBe(true);
    expect(resultadoDesactivar.propietario.estado).toBe('Inactivo');

    expect(propietarioDAO.actualizarEstado).toHaveBeenNthCalledWith(
      1,
      propietario.propietario_id,
      'Activo'
    );

    expect(propietarioDAO.actualizarEstado).toHaveBeenNthCalledWith(
      2,
      propietario.propietario_id,
      'Inactivo'
    );
  });

  test('CP02: E1 - debe informar cuando el propietario no es encontrado', async () => {
    // Arrange
    propietarioDAO.buscarPorCriterio.mockResolvedValue(null);

    // Act
    const resultado = await servicio.buscarPropietario('99999999');

    // Assert
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toBe(
      MENSAJES_ESTADO_PROPIETARIO.NO_ENCONTRADO
    );
    expect(resultado.propietario).toBeNull();

    expect(propietarioDAO.buscarPorCriterio).toHaveBeenCalledWith(
      '99999999'
    );
    expect(propietarioDAO.actualizarEstado).not.toHaveBeenCalled();
  });

  test('CP03: E2 - debe solicitar un dato cuando la búsqueda está vacía', async () => {
    // Arrange
    const criterio = '   ';

    // Act
    const resultado = await servicio.buscarPropietario(criterio);

    // Assert
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toBe(
      MENSAJES_ESTADO_PROPIETARIO.BUSQUEDA_VACIA
    );

    // No debe consultar ni actualizar la base de datos.
    expect(propietarioDAO.buscarPorCriterio).not.toHaveBeenCalled();
    expect(propietarioDAO.actualizarEstado).not.toHaveBeenCalled();
  });

  test('CP04: E3 - debe informar el error y conservar el estado anterior si falla la actualización', async () => {
    // Arrange
    const propietarioAnterior = {
      ...propietario,
      estado: 'Activo',
    };

    propietarioDAO.actualizarEstado.mockRejectedValue(
      new Error('Servicio de actualización no disponible')
    );

    // Act
    const resultado = await servicio.gestionarEstado(
      propietarioAnterior.propietario_id,
      'Inactivo'
    );

    // Assert
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toBe(
      MENSAJES_ESTADO_PROPIETARIO.ERROR_ACTUALIZAR
    );

    // El objeto que representa el estado previo no debe cambiar.
    expect(propietarioAnterior.estado).toBe('Activo');

    expect(propietarioDAO.actualizarEstado).toHaveBeenCalledWith(
      propietarioAnterior.propietario_id,
      'Inactivo'
    );
  });
});
