
/**
 * RF48 - Gestionar estado del propietario.
 *
 * Casos de prueba:
 * CP01: Éxito - activar o desactivar al propietario.
 * CP02: E1 - Propietario no encontrado.
 * CP03: E2 - Búsqueda sin datos.
 * CP04: E3 - Error al actualizar el estado.
 * CP05: E4 - Motivo obligatorio para desactivar.
 *
 * Metodología TDD: AAA
 * Arrange: preparar los datos y las dependencias.
 * Act: ejecutar la operación.
 * Assert: comprobar el resultado esperado.
 */

import {
  crearPropietarioEstadoServicio,
  MENSAJES_ESTADO_PROPIETARIO,
} from '../../services/propietario/propietarioEstadoServicio';

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

    const motivo = 'Cambio de condición del propietario';

    // Act
    const resultadoActivar = await servicio.gestionarEstado(
      propietario.propietario_id,
      'Activo'
    );

    const resultadoDesactivar = await servicio.gestionarEstado(
      propietario.propietario_id,
      'Inactivo',
      motivo
    );

    // Assert
    expect(resultadoActivar.exito).toBe(true);
    expect(resultadoActivar.propietario.estado).toBe('Activo');

    expect(resultadoDesactivar.exito).toBe(true);
    expect(resultadoDesactivar.propietario.estado).toBe('Inactivo');

    expect(propietarioDAO.actualizarEstado).toHaveBeenNthCalledWith(
      1,
      propietario.propietario_id,
      'Activo',
      ''
    );

    expect(propietarioDAO.actualizarEstado).toHaveBeenNthCalledWith(
      2,
      propietario.propietario_id,
      'Inactivo',
      motivo
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

    expect(propietarioDAO.buscarPorCriterio).not.toHaveBeenCalled();
    expect(propietarioDAO.actualizarEstado).not.toHaveBeenCalled();
  });

  test('CP04: E3 - debe informar el error si falla la actualización', async () => {
    // Arrange
    const propietarioAnterior = {
      ...propietario,
      estado: 'Activo',
    };

    const motivo = 'Motivo de prueba';

    propietarioDAO.actualizarEstado.mockRejectedValue(
      new Error('Servicio de actualización no disponible')
    );

    // Act
    const resultado = await servicio.gestionarEstado(
      propietarioAnterior.propietario_id,
      'Inactivo',
      motivo
    );

    // Assert
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toBe(
      MENSAJES_ESTADO_PROPIETARIO.ERROR_ACTUALIZAR
    );

    expect(propietarioAnterior.estado).toBe('Activo');

    expect(propietarioDAO.actualizarEstado).toHaveBeenCalledWith(
      propietarioAnterior.propietario_id,
      'Inactivo',
      motivo
    );
  });

  test('CP05: debe exigir un motivo para desactivar al propietario', async () => {
    // Arrange
    const motivo = '';

    // Act
    const resultado = await servicio.gestionarEstado(
      propietario.propietario_id,
      'Inactivo',
      motivo
    );

    // Assert
    expect(resultado.exito).toBe(false);

    expect(resultado.mensaje).toBe(
      MENSAJES_ESTADO_PROPIETARIO.MOTIVO_REQUERIDO
    );

    expect(propietarioDAO.actualizarEstado).not.toHaveBeenCalled();
  });

  test('CP06: debe rechazar un motivo compuesto únicamente por espacios', async () => {
    // Arrange
    const motivo = '     ';

    // Act
    const resultado = await servicio.gestionarEstado(
      propietario.propietario_id,
      'Inactivo',
      motivo
    );

    // Assert
    expect(resultado.exito).toBe(false);

    expect(resultado.mensaje).toBe(
      MENSAJES_ESTADO_PROPIETARIO.MOTIVO_REQUERIDO
    );

    expect(propietarioDAO.actualizarEstado).not.toHaveBeenCalled();
  });
});
