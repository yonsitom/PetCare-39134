
/**
 * ============================================================
 * PETCARE — TDD RF43
 * Actualizar en tiempo real el seguimiento de una atención.
 * ============================================================
 *
 * CP01: Actualización automática.
 * CP02: No se detecta el cambio.
 * CP03: Error de actualización.
 * CP04: Atención no disponible.
 *
 * Repositorio simulado para pruebas unitarias.
 * ============================================================
 */

import {
  crearActualizacionTiempoRealService,
} from '../../services/seguimientoServicio';

describe('RF43 - Actualizar en tiempo real el seguimiento de una atención', () => {
  let repositorio;
  let servicio;

  const actividadesIniciales = [
    {
      actividad_id: 1,
      atencion_id: 100,
      tipo: 'Consulta',
      estado: 'Pendiente',
      eliminado: false,
    },
    {
      actividad_id: 2,
      atencion_id: 100,
      tipo: 'Medicación',
      estado: 'Pendiente',
      eliminado: false,
    },
  ];

  const actividadesActualizadas = [
    {
      actividad_id: 1,
      atencion_id: 100,
      tipo: 'Consulta',
      estado: 'Completada',
      eliminado: false,
    },
    {
      actividad_id: 2,
      atencion_id: 100,
      tipo: 'Medicación',
      estado: 'Pendiente',
      eliminado: false,
    },
  ];

  beforeEach(() => {
    repositorio = {
      consultarActividadesPorAtencion: jest.fn(),
      suscribirCambiosAtencion: jest.fn(),
      consultarHistorialSeguimiento: jest.fn(),
      cancelarSuscripcion: jest.fn(),
    };

    servicio = crearActualizacionTiempoRealService(repositorio);
  });

  // ==========================================================
  // CP01: ACTUALIZACIÓN AUTOMÁTICA
  // ==========================================================

  test('CP01: Debe actualizar automáticamente las actividades cuando se detecta un cambio', async () => {
    let recibirCambio;

    repositorio.consultarActividadesPorAtencion
      .mockResolvedValueOnce(actividadesIniciales)
      .mockResolvedValueOnce(actividadesActualizadas);

    repositorio.suscribirCambiosAtencion.mockImplementation(
      (atencionId, callback) => {
        recibirCambio = callback;
        return { id: 'suscripcion-100' };
      }
    );

    const resultadoInicial =
      await servicio.iniciarSeguimiento(100);

    await recibirCambio({
      eventType: 'UPDATE',
      table: 'actividades',
      new: {
        actividad_id: 1,
        atencion_id: 100,
        estado: 'Completada',
      },
    });

    expect(resultadoInicial.exito).toBe(true);

    expect(resultadoInicial.actividades).toEqual(
      actividadesIniciales
    );

    expect(repositorio.suscribirCambiosAtencion)
      .toHaveBeenCalledWith(100, expect.any(Function));

    expect(repositorio.consultarActividadesPorAtencion)
      .toHaveBeenCalledTimes(2);

    const estadoActual = servicio.obtenerEstadoActual();

    expect(estadoActual.actividades).toEqual(
      actividadesActualizadas
    );

    expect(estadoActual.actualizado).toBe(true);
  });

  // ==========================================================
  // CP02: NO SE DETECTA EL CAMBIO
  // ==========================================================

  test('CP02: Debe informar cuando no se recibe correctamente la actualización realizada', async () => {
    repositorio.consultarActividadesPorAtencion
      .mockResolvedValue(actividadesIniciales);

    repositorio.suscribirCambiosAtencion
      .mockReturnValue(null);

    const resultado =
      await servicio.iniciarSeguimiento(100);

    expect(resultado.exito).toBe(false);

    expect(resultado.actividades).toEqual(
      actividadesIniciales
    );

    expect(resultado.mensaje).toBe(
      'No recibe correctamente la actualización realizada'
    );

    expect(resultado.actualizado).toBe(false);
  });

  // ==========================================================
  // CP03: ERROR DE ACTUALIZACIÓN
  // ==========================================================

  test('CP03: Debe conservar la información anterior cuando ocurre un error al consultar los datos actualizados', async () => {
    let recibirCambio;

    repositorio.consultarActividadesPorAtencion
      .mockResolvedValueOnce(actividadesIniciales)
      .mockRejectedValueOnce(
        new Error('Error de conexión con Supabase')
      );

    repositorio.suscribirCambiosAtencion.mockImplementation(
      (atencionId, callback) => {
        recibirCambio = callback;
        return { id: 'suscripcion-100' };
      }
    );

    await servicio.iniciarSeguimiento(100);

    await recibirCambio({
      eventType: 'UPDATE',
      table: 'actividades',
      new: {
        actividad_id: 1,
        atencion_id: 100,
        estado: 'Completada',
      },
    });

    const estadoActual = servicio.obtenerEstadoActual();

    expect(estadoActual.actividades).toEqual(
      actividadesIniciales
    );

    expect(estadoActual.actualizado).toBe(false);

    expect(estadoActual.mensaje).toBe(
      'No se pudo completar la actualización de la información.'
    );
  });

  // ==========================================================
  // CP04: ATENCIÓN NO DISPONIBLE
  // ==========================================================

  test('CP04: Debe informar que la atención no está disponible y actualizar la lista de seguimientos', async () => {
    let recibirCambio;

    repositorio.consultarActividadesPorAtencion
      .mockResolvedValueOnce(actividadesIniciales);

    repositorio.suscribirCambiosAtencion.mockImplementation(
      (atencionId, callback) => {
        recibirCambio = callback;
        return { id: 'suscripcion-100' };
      }
    );

    repositorio.consultarHistorialSeguimiento
      .mockResolvedValue([
        {
          atencion_id: 101,
          estado: 'Activa',
        },
      ]);

    await servicio.iniciarSeguimiento(100);

    await recibirCambio({
      eventType: 'DELETE',
      table: 'atenciones',
      old: {
        atencion_id: 100,
      },
    });

    const estadoActual = servicio.obtenerEstadoActual();

    expect(estadoActual.atencionDisponible).toBe(false);

    expect(estadoActual.mensaje).toBe(
      'La atención ya no se encuentra disponible.'
    );

    expect(estadoActual.historial).toEqual([
      {
        atencion_id: 101,
        estado: 'Activa',
      },
    ]);

    expect(repositorio.consultarHistorialSeguimiento)
      .toHaveBeenCalledTimes(1);
  });
});
