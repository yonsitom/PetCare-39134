import {
  verificarAtencionListaParaFinalizar,
} from '../../dao/verificarAtencionDAO';

import {
  consultarActividadesPorAtencion,
} from '../../dao/actividadesDAO';

jest.mock('../../dao/actividadesDAO', () => {
  const original = jest.requireActual('../../dao/actividadesDAO');

  return {
    ...original,
    consultarActividadesPorAtencion: jest.fn(),
  };
});
describe('RF26: verificar si una atención está lista para finalizar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('CP01: todas las actividades completadas', async () => {
    consultarActividadesPorAtencion.mockResolvedValue([
      { actividad_id: 1, estado: 'Completada', eliminado: false },
      { actividad_id: 2, estado: 'Completada', eliminado: false },
    ]);

    const resultado = await verificarAtencionListaParaFinalizar(1);

    expect(resultado.listaParaFinalizar).toBe(true);
    expect(resultado.totalActividades).toBe(2);
    expect(resultado.completadas).toBe(2);
    expect(resultado.pendientes).toBe(0);
  });

  test('CP02: actividades completadas y no realizadas', async () => {
    consultarActividadesPorAtencion.mockResolvedValue([
      { actividad_id: 1, estado: 'Completada', eliminado: false },
      { actividad_id: 2, estado: 'No realizada', eliminado: false },
    ]);

    const resultado = await verificarAtencionListaParaFinalizar(1);

    expect(resultado.listaParaFinalizar).toBe(true);
    expect(resultado.completadas).toBe(1);
    expect(resultado.noRealizadas).toBe(1);
  });

  test('CP03: existe una actividad pendiente', async () => {
    consultarActividadesPorAtencion.mockResolvedValue([
      { actividad_id: 1, estado: 'Completada', eliminado: false },
      { actividad_id: 2, estado: 'Pendiente', eliminado: false },
    ]);

    const resultado = await verificarAtencionListaParaFinalizar(1);

    expect(resultado.listaParaFinalizar).toBe(false);
    expect(resultado.pendientes).toBe(1);
  });

  test('CP04: existe una actividad en proceso', async () => {
    consultarActividadesPorAtencion.mockResolvedValue([
      { actividad_id: 1, estado: 'En proceso', eliminado: false },
    ]);

    const resultado = await verificarAtencionListaParaFinalizar(1);

    expect(resultado.listaParaFinalizar).toBe(false);
    expect(resultado.totalActividades).toBe(1);
  });

  test('CP05: no existen actividades vigentes', async () => {
    consultarActividadesPorAtencion.mockResolvedValue([]);

    const resultado = await verificarAtencionListaParaFinalizar(1);

    expect(resultado.listaParaFinalizar).toBe(false);
    expect(resultado.totalActividades).toBe(0);
  });

  test('CP06: ignora las actividades eliminadas', async () => {
    consultarActividadesPorAtencion.mockResolvedValue([
      { actividad_id: 1, estado: 'Completada', eliminado: false },
      { actividad_id: 2, estado: 'Pendiente', eliminado: true },
    ]);

    const resultado = await verificarAtencionListaParaFinalizar(1);

    expect(resultado.listaParaFinalizar).toBe(true);
    expect(resultado.totalActividades).toBe(1);
    expect(resultado.completadas).toBe(1);
    expect(resultado.pendientes).toBe(0);
  });

  test('CP07: rechaza un identificador vacío', async () => {
    await expect(
      verificarAtencionListaParaFinalizar('')
    ).rejects.toThrow(
      'No se indicó la atención que desea verificar.'
    );

    expect(consultarActividadesPorAtencion).not.toHaveBeenCalled();
  });

  test('CP08: propaga errores de consulta', async () => {
    consultarActividadesPorAtencion.mockRejectedValue(
      new Error('Error simulado de consulta')
    );

    await expect(
      verificarAtencionListaParaFinalizar(1)
    ).rejects.toThrow('Error simulado de consulta');
  });
});
