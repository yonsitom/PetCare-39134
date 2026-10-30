
// RF39 - Visualizar progreso de atención
// Pruebas TDD basadas únicamente en los 4 escenarios definidos.

jest.mock('../../dao/actividadesDAO', () => ({
  consultarActividadesPorEstado: jest.fn(),
  consultarActividadesPorAtencion: jest.fn(),
  actualizarEstadoActividad: jest.fn(),
  registrarActividad: jest.fn(),
}));

import { consultarActividadesPorAtencion } from '../../dao/actividadesDAO';
import { obtenerActividadesYPorcentajeAvance } from '../../services/actividadesServicio';

describe('RF39 - Visualizar progreso de atención', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // CP01: Atención con 4 actividades, de las cuales 2 están completadas.
  test('CP01 - Debe calcular un avance del 50% cuando 2 de 4 actividades están completadas', async () => {
    consultarActividadesPorAtencion.mockResolvedValue([
      { actividad_id: 1, estado: 'Completada', eliminado: false },
      { actividad_id: 2, estado: 'Completada', eliminado: false },
      { actividad_id: 3, estado: 'Pendiente', eliminado: false },
      { actividad_id: 4, estado: 'Pendiente', eliminado: false },
    ]);

    const resultado = await obtenerActividadesYPorcentajeAvance(10);

    expect(resultado.total).toBe(4);
    expect(resultado.completadas).toBe(2);
    expect(resultado.porcentaje).toBe(50);
  });

  // CP02: Atención sin actividades registradas.
  test('CP02 - Debe devolver 0% cuando la atención no tiene actividades registradas', async () => {
    consultarActividadesPorAtencion.mockResolvedValue([]);

    const resultado = await obtenerActividadesYPorcentajeAvance(10);

    expect(resultado.total).toBe(0);
    expect(resultado.completadas).toBe(0);
    expect(resultado.porcentaje).toBe(0);
    expect(resultado.actividades).toEqual([]);
  });

  // CP03: Todas las actividades de la atención están completadas.
  test('CP03 - Debe calcular un avance del 100% cuando todas las actividades están completadas', async () => {
    consultarActividadesPorAtencion.mockResolvedValue([
      { actividad_id: 1, estado: 'Completada', eliminado: false },
      { actividad_id: 2, estado: 'Completada', eliminado: false },
      { actividad_id: 3, estado: 'Completada', eliminado: false },
      { actividad_id: 4, estado: 'Completada', eliminado: false },
    ]);

    const resultado = await obtenerActividadesYPorcentajeAvance(10);

    expect(resultado.total).toBe(4);
    expect(resultado.completadas).toBe(4);
    expect(resultado.porcentaje).toBe(100);
  });

  // CP04: Error al consultar las actividades de la atención.
  test('CP04 - Debe mostrar el mensaje correspondiente cuando falla la consulta de actividades', async () => {
    consultarActividadesPorAtencion.mockRejectedValue(
      new Error('Error de conexión con la base de datos')
    );

    await expect(
      obtenerActividadesYPorcentajeAvance(10)
    ).rejects.toThrow(
      'No se pudieron consultar las actividades para calcular el avance.'
    );
  });
});
