jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '../../services/supabase';
import { finalizarAtencionSiCorresponde } from '../../dao/actividadesDAO';

describe('RF25 — Finalización automática de atención', () => {
  let atencion;
  let actividades;
  let actualizacion;
  let actualizarAtencion;
  let consultarActividades;

  beforeEach(() => {
    jest.clearAllMocks();

    atencion = {
      atencion_id: 1,
      estado: 'Activa',
      fecha_fin: null,
    };

    actividades = [];

    actualizacion = {
      atencion_id: 1,
      estado: 'Finalizada',
      fecha_fin: '2026-10-28T10:00:00.000Z',
    };

    actualizarAtencion = jest.fn(() => ({
      eq: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            maybeSingle: jest.fn().mockResolvedValue({
              data: actualizacion,
              error: null,
            }),
          })),
        })),
      })),
    }));

    consultarActividades = jest.fn(() => {
      const consulta = {
        eq: jest.fn(),
        order: jest.fn(),
        then: (resolve, reject) =>
          Promise.resolve({
            data: actividades,
            error: null,
          }).then(resolve, reject),
      };

      consulta.eq.mockImplementation(() => consulta);
      consulta.order.mockImplementation(() => consulta);

      return consulta;
    });

    supabase.from.mockImplementation((tabla) => {
      if (tabla === 'atenciones') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: atencion,
                error: null,
              }),
            })),
          })),

          update: actualizarAtencion,
        };
      }

      if (tabla === 'actividades') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => consultarActividades()),
            })),
          })),
        };
      }

      throw new Error(`Tabla inesperada: ${tabla}`);
    });
  });

  test('CP01: finaliza si todas las actividades están Completada', async () => {
    actividades = [
      { actividad_id: 1, estado: 'Completada' },
      { actividad_id: 2, estado: 'Completada' },
    ];

    const resultado = await finalizarAtencionSiCorresponde(1);

    expect(resultado.finalizada).toBe(true);
    expect(resultado.estado).toBe('Finalizada');
  });

  test('CP02: finaliza con actividades Completada y No realizada', async () => {
    actividades = [
      { actividad_id: 1, estado: 'Completada' },
      { actividad_id: 2, estado: 'No realizada' },
    ];

    const resultado = await finalizarAtencionSiCorresponde(1);

    expect(resultado.finalizada).toBe(true);
    expect(resultado.estado).toBe('Finalizada');
  });

  test('CP03: no finaliza si hay actividades Pendiente', async () => {
    actividades = [
      { actividad_id: 1, estado: 'Completada' },
      { actividad_id: 2, estado: 'Pendiente' },
    ];

    const resultado = await finalizarAtencionSiCorresponde(1);

    expect(resultado.finalizada).toBe(false);
    expect(resultado.estado).toBe('Activa');
  });

  test('CP04: no finaliza si hay actividades En proceso', async () => {
    actividades = [
      { actividad_id: 1, estado: 'En proceso' },
    ];

    const resultado = await finalizarAtencionSiCorresponde(1);

    expect(resultado.finalizada).toBe(false);
    expect(resultado.estado).toBe('Activa');
  });

  test('CP05: no finaliza una atención sin actividades vigentes', async () => {
    actividades = [];

    const resultado = await finalizarAtencionSiCorresponde(1);

    expect(resultado.finalizada).toBe(false);
    expect(resultado.estado).toBe('Activa');
  });

  test('CP06: nunca modifica una atención ya Finalizada', async () => {
    atencion.estado = 'Finalizada';
    atencion.fecha_fin = '2026-10-27T11:00:00.000Z';

    const resultado = await finalizarAtencionSiCorresponde(1);

    expect(resultado.finalizada).toBe(true);
    expect(resultado.modificada).toBe(false);
    expect(actualizarAtencion).not.toHaveBeenCalled();
  });
});
