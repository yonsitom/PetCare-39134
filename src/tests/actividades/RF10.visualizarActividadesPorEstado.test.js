
jest.mock('../../dao/actividadesDAO', () => ({
  consultarActividadesPorEstado: jest.fn(),
}));

import { consultarActividadesPorEstado } from '../../dao/actividadesDAO';
import { obtenerActividadesPorEstado } from '../../services/actividadesServicio';

describe('RF10: Visualizar actividades por estado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('CP01: consulta las actividades pendientes', async () => {
    const actividades = [
      { actividad_id: 1, estado: 'Pendiente', eliminado: false },
      { actividad_id: 2, estado: 'Pendiente', eliminado: false },
      { actividad_id: 3, estado: 'Pendiente', eliminado: false },
      { actividad_id: 4, estado: 'Pendiente', eliminado: false },
    ];

    consultarActividadesPorEstado.mockResolvedValue(actividades);

    const resultado = await obtenerActividadesPorEstado('Pendiente');

    expect(resultado).toHaveLength(4);
    expect(resultado.every((item) => item.estado === 'Pendiente')).toBe(true);
    expect(consultarActividadesPorEstado).toHaveBeenCalledWith('Pendiente');
  });

  test('CP02: devuelve una lista vacía cuando no hay actividades', async () => {
    consultarActividadesPorEstado.mockResolvedValue([]);

    const resultado = await obtenerActividadesPorEstado('Pendiente');

    expect(resultado).toEqual([]);
    expect(consultarActividadesPorEstado).toHaveBeenCalledWith('Pendiente');
  });

  test('CP03: permite consultar actividades no realizadas sin resultados', async () => {
    consultarActividadesPorEstado.mockResolvedValue([]);

    const resultado = await obtenerActividadesPorEstado('No realizada');

    expect(resultado).toEqual([]);
    expect(consultarActividadesPorEstado).toHaveBeenCalledWith('No realizada');
  });

  test('CP04: comunica el error de consulta y permite que la vista reintente', async () => {
    consultarActividadesPorEstado.mockRejectedValue(
      new Error('Error simulado de base de datos')
    );

    await expect(
      obtenerActividadesPorEstado('Pendiente')
    ).rejects.toThrow(
      'No se pudo cargar el resumen de actividades. Intente nuevamente.'
    );

    expect(consultarActividadesPorEstado).toHaveBeenCalledTimes(1);
  });

  test('rechaza un estado que no está permitido', async () => {
    await expect(
      obtenerActividadesPorEstado('En proceso')
    ).rejects.toThrow('El estado indicado no es válido.');

    expect(consultarActividadesPorEstado).not.toHaveBeenCalled();
  });
});
