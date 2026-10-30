
/**
 * RF46 / CUS46: Gestionar estado de mascotas.
 *
 * Casos de prueba definidos:
 * CP01: Éxito — activación o desactivación de mascota.
 * CP02: E1 — Mascota no encontrada.
 * CP03: E2 — Búsqueda sin datos.
 * CP04: E3 — Error al actualizar el estado.
 *
 * Arquitectura:
 * - Vista: gestionMascotas.jsx.
 * - Servicio: mascotasService.js.
 * - DAO: mascotaDAO.js.
 */

import {
  buscarMascotasAdministracionDAO,
  cambiarEstadoMascotaDAO,
} from '../../dao/mascotaDAO';

import {
  buscarMascotasAdministracion,
  gestionarEstadoMascota,
} from '../../services/administracion/mascotasService';

jest.mock('../../dao/mascotaDAO', () => ({
  buscarMascotasAdministracionDAO: jest.fn(),
  consultarMascotasAdministracionDAO: jest.fn(),
  cambiarEstadoMascotaDAO: jest.fn(),
}));

describe('RF46 / CUS46 — Gestionar estado de mascotas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('CP01 — Éxito: activación o desactivación de mascota', async () => {
    // ARRANGE
    const mascotaActiva = {
      numero_historia: 'HC-001',
      nombre: 'Luna',
      estado: 'Activo',
      motivo_desactivacion: null,
    };

    const mascotaInactiva = {
      numero_historia: 'HC-001',
      nombre: 'Luna',
      estado: 'Inactivo',
      motivo_desactivacion: 'Desactivación solicitada',
    };

    cambiarEstadoMascotaDAO
      .mockResolvedValueOnce(mascotaInactiva)
      .mockResolvedValueOnce(mascotaActiva);

    // ACT
    const resultadoDesactivacion = await gestionarEstadoMascota({
      numeroHistoria: 'HC-001',
      nuevoEstado: 'Inactivo',
      motivo: 'Desactivación solicitada',
      confirmado: true,
    });

    const resultadoActivacion = await gestionarEstadoMascota({
      numeroHistoria: 'HC-001',
      nuevoEstado: 'Activo',
      confirmado: true,
    });

    // ASSERT
    expect(cambiarEstadoMascotaDAO).toHaveBeenNthCalledWith(1, {
      numeroHistoria: 'HC-001',
      nuevoEstado: 'Inactivo',
      motivo: 'Desactivación solicitada',
    });

    expect(cambiarEstadoMascotaDAO).toHaveBeenNthCalledWith(2, {
      numeroHistoria: 'HC-001',
      nuevoEstado: 'Activo',
      motivo: '',
    });

    expect(resultadoDesactivacion.ok).toBe(true);
    expect(resultadoDesactivacion.mascota.estado).toBe('Inactivo');
    expect(resultadoDesactivacion.mascota.motivo_desactivacion).toBe(
      'Desactivación solicitada'
    );

    expect(resultadoActivacion.ok).toBe(true);
    expect(resultadoActivacion.mascota.estado).toBe('Activo');
  });

  test('CP02 — E1: Mascota no encontrada', async () => {
    // ARRANGE
    buscarMascotasAdministracionDAO.mockResolvedValue([]);

    // ACT
    const resultado = await buscarMascotasAdministracion(
      'MascotaInexistenteXYZ'
    );

    // ASSERT
    expect(buscarMascotasAdministracionDAO).toHaveBeenCalledWith(
      'MascotaInexistenteXYZ'
    );

    expect(resultado).toEqual([]);
    expect(resultado).toHaveLength(0);
    expect(cambiarEstadoMascotaDAO).not.toHaveBeenCalled();
  });

  test('CP03 — E2: Búsqueda sin datos', async () => {
    // ARRANGE
    const terminoBusqueda = '';

    // ACT
    const operacion = buscarMascotasAdministracion(terminoBusqueda);

    // ASSERT
    await expect(operacion).rejects.toThrow(
      'Ingresa un dato para realizar la búsqueda de la mascota.'
    );

    expect(buscarMascotasAdministracionDAO).not.toHaveBeenCalled();
    expect(cambiarEstadoMascotaDAO).not.toHaveBeenCalled();
  });

  test('CP04 — E3: Error al actualizar el estado', async () => {
    // ARRANGE
    const errorSimulado = new Error(
      'Servicio de actualización no disponible'
    );

    cambiarEstadoMascotaDAO.mockRejectedValue(errorSimulado);

    // ACT
    const resultado = await gestionarEstadoMascota({
      numeroHistoria: 'HC-001',
      nuevoEstado: 'Inactivo',
      motivo: 'Desactivación solicitada',
      confirmado: true,
    });

    // ASSERT
    expect(cambiarEstadoMascotaDAO).toHaveBeenCalledWith({
      numeroHistoria: 'HC-001',
      nuevoEstado: 'Inactivo',
      motivo: 'Desactivación solicitada',
    });

    expect(resultado.ok).toBe(false);

    expect(resultado.mensaje).toBe(
      'No se pudo actualizar el estado de la mascota. El estado anterior se mantiene.'
    );

    expect(resultado.error).toBe(errorSimulado);
  });
});
