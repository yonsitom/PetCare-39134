
import { supabase } from '../../services/supabase';
import { finalizarAtencionSiCorresponde } from '../../dao/actividadesDAO';

jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('RF28 - Registrar fecha y hora de finalización', () => {
  let mockAtencion;
  let mockActividades;
  let mockResultadoUpdate;
  let mockErrorUpdate;
  let mockUpdate;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAtencion = {
      atencion_id: 1,
      estado: 'Activa',
      fecha_fin: null,
    };

    mockActividades = [
      { actividad_id: 1, estado: 'Completada', eliminado: false },
      { actividad_id: 2, estado: 'Completada', eliminado: false },
      { actividad_id: 3, estado: 'No realizada', eliminado: false },
    ];

    mockResultadoUpdate = {
      data: {
        atencion_id: 1,
        estado: 'Finalizada',
        fecha_fin: null,
      },
      error: null,
    };

    mockErrorUpdate = null;
    mockUpdate = jest.fn();

    supabase.from.mockImplementation((tabla) => {
      let modo = 'select';

      const consulta = {
        select: jest.fn(() => consulta),

        update: jest.fn((datos) => {
          modo = 'update';
          mockUpdate(datos);
          return consulta;
        }),

        eq: jest.fn(() => consulta),

        maybeSingle: jest.fn(async () => {
          if (tabla === 'atenciones' && modo === 'select') {
            return {
              data: mockAtencion,
              error: null,
            };
          }

          if (tabla === 'atenciones' && modo === 'update') {
            if (mockErrorUpdate) {
              return {
                data: null,
                error: mockErrorUpdate,
              };
            }

            return mockResultadoUpdate;
          }

          return { data: null, error: null };
        }),

        then: (resolve, reject) => {
          return Promise.resolve({
            data: mockActividades,
            error: null,
          }).then(resolve, reject);
        },
      };

      return consulta;
    });
  });

  test('CP01 - Registra automáticamente la fecha y hora al finalizar', async () => {
    const antes = Date.now();

    const resultado = await finalizarAtencionSiCorresponde(1);

    const despues = Date.now();

    expect(resultado.finalizada).toBe(true);
    expect(resultado.modificada).toBe(true);
    expect(resultado.estado).toBe('Finalizada');

    expect(mockUpdate).toHaveBeenCalledTimes(1);

    const datosActualizacion = mockUpdate.mock.calls[0][0];

    expect(datosActualizacion.estado).toBe('Finalizada');
    expect(typeof datosActualizacion.fecha_fin).toBe('string');
    expect(Number.isNaN(Date.parse(datosActualizacion.fecha_fin))).toBe(false);

    const fechaRegistrada = Date.parse(datosActualizacion.fecha_fin);

    expect(fechaRegistrada).toBeGreaterThanOrEqual(antes);
    expect(fechaRegistrada).toBeLessThanOrEqual(despues);
  });

  test('CP02 - No finaliza si existen actividades pendientes', async () => {
    mockActividades = [
      { actividad_id: 1, estado: 'Completada', eliminado: false },
      { actividad_id: 2, estado: 'Pendiente', eliminado: false },
    ];

    const resultado = await finalizarAtencionSiCorresponde(1);

    expect(resultado.finalizada).toBe(false);
    expect(resultado.modificada).toBe(false);
    expect(resultado.estado).toBe('Activa');
    expect(resultado.pendientes).toBe(1);

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('CP03 - Informa un error si falla el registro de la fecha y hora', async () => {
    mockErrorUpdate = {
      message: 'Error al guardar fecha_fin',
    };

    await expect(
      finalizarAtencionSiCorresponde(1)
    ).rejects.toThrow(
      'No se pudo finalizar la atención. Intente nuevamente.'
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: 'Finalizada',
        fecha_fin: expect.any(String),
      })
    );
  });

  test('CP04 - Informa un error si falla la actualización de la atención', async () => {
    mockErrorUpdate = {
      message: 'Error al actualizar atención',
    };

    await expect(
      finalizarAtencionSiCorresponde(1)
    ).rejects.toThrow(
      'No se pudo finalizar la atención. Intente nuevamente.'
    );

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
