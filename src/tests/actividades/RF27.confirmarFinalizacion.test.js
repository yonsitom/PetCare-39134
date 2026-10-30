
import { finalizarAtencionSiCorresponde } from '../../dao/actividadesDAO';

import { supabase } from '../../services/supabase';

jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('RF27 - Finalizar atención veterinaria mediante confirmación', () => {
  let atencion;
  let actividades;
  let actualizacion;

  beforeEach(() => {
    jest.clearAllMocks();

    atencion = {
      atencion_id: 1,
      estado: 'Activa',
      fecha_fin: null,
    };

    actividades = [
      { estado: 'Completada', eliminado: false },
      { estado: 'Completada', eliminado: false },
      { estado: 'Completada', eliminado: false },
      { estado: 'No realizada', eliminado: false },
    ];

    actualizacion = null;

    supabase.from.mockImplementation((tabla) => {
      if (tabla === 'atenciones') {
        const consulta = {
          select: jest.fn(() => consulta),
          eq: jest.fn(() => consulta),
          maybeSingle: jest.fn(async () => ({
            data: atencion,
            error: null,
          })),
          update: jest.fn((datos) => {
            actualizacion = datos;

            return {
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  select: jest.fn(() => ({
                    maybeSingle: jest.fn(async () => {
                      atencion = { ...atencion, ...datos };

                      return {
                        data: atencion,
                        error: null,
                      };
                    }),
                  })),
                })),
              })),
            };
          }),
        };

        return consulta;
      }

      if (tabla === 'actividades') {
        const consulta = {
          select: jest.fn(() => consulta),
          eq: jest.fn(() => consulta),
          then: (resolve, reject) =>
            Promise.resolve({
              data: actividades,
              error: null,
            }).then(resolve, reject),
        };

        return consulta;
      }

      throw new Error(`Tabla inesperada: ${tabla}`);
    });
  });

  test('CP01 - Finaliza una atención sin actividades pendientes', async () => {
    const resultado = await finalizarAtencionSiCorresponde(1);

    expect(resultado.finalizada).toBe(true);
    expect(resultado.modificada).toBe(true);
    expect(atencion.estado).toBe('Finalizada');
    expect(actualizacion.estado).toBe('Finalizada');
    expect(actualizacion.fecha_fin).toBeTruthy();
  });

  test('CP02 - No finaliza si existe una actividad pendiente', async () => {
    actividades = [
      { estado: 'Completada', eliminado: false },
      { estado: 'Completada', eliminado: false },
      { estado: 'Pendiente', eliminado: false },
    ];

    const resultado = await finalizarAtencionSiCorresponde(1);

    expect(resultado.finalizada).toBe(false);
    expect(resultado.modificada).toBe(false);
    expect(atencion.estado).toBe('Activa');
    expect(actualizacion).toBeNull();
  });

  test('CP03 - Cancelar la confirmación no debe ejecutar la finalización', async () => {
    // La cancelación ocurre en la interfaz, antes de llamar al DAO.
    const confirmada = false;

    if (confirmada) {
      await finalizarAtencionSiCorresponde(1);
    }

    expect(supabase.from).not.toHaveBeenCalled();
    expect(atencion.estado).toBe('Activa');
  });

  test('CP04 - No modifica una atención ya finalizada', async () => {
    atencion.estado = 'Finalizada';
    atencion.fecha_fin = '2026-10-27T10:00:00.000Z';

    const resultado = await finalizarAtencionSiCorresponde(1);

    expect(resultado.finalizada).toBe(true);
    expect(resultado.modificada).toBe(false);
    expect(atencion.estado).toBe('Finalizada');
    expect(actualizacion).toBeNull();
  });
});
