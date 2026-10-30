
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase } from '../../services/supabase';
import { consultarEstadoAtencion } from '../../dao/atencionesDAO';

const consultarUnaAtencion = jest.fn();
const filtrarPorId = jest.fn();

function configurarConsulta() {
  filtrarPorId.mockReturnValue({
    maybeSingle: consultarUnaAtencion,
  });

  supabase.from.mockImplementation((tabla) => {
    if (tabla !== 'atenciones') {
      throw new Error(`Tabla inesperada: ${tabla}`);
    }

    return {
      select: jest.fn(() => ({
        eq: filtrarPorId,
      })),
    };
  });
}

describe('RF25 — Identificar si una atención está activa o finalizada', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configurarConsulta();
  });

  test('CP01: consulta correctamente una atención Activa', async () => {
    const atencion = {
      atencion_id: 1,
      estado: 'Activa',
      fecha_inicio: '2026-10-27T10:00:00.000Z',
      fecha_fin: null,
    };

    consultarUnaAtencion.mockResolvedValue({
      data: atencion,
      error: null,
    });

    await expect(consultarEstadoAtencion(1)).resolves.toEqual(
      atencion
    );

    expect(supabase.from).toHaveBeenCalledWith('atenciones');
    expect(filtrarPorId).toHaveBeenCalledWith('atencion_id', 1);
  });

  test('CP01: consulta correctamente una atención Finalizada', async () => {
    const atencion = {
      atencion_id: 2,
      estado: 'Finalizada',
      fecha_inicio: '2026-10-27T10:00:00.000Z',
      fecha_fin: '2026-10-27T11:00:00.000Z',
    };

    consultarUnaAtencion.mockResolvedValue({
      data: atencion,
      error: null,
    });

    await expect(consultarEstadoAtencion(2)).resolves.toEqual(
      atencion
    );
  });

  test('CP02: rechaza un identificador vacío', async () => {
    await expect(
      consultarEstadoAtencion('')
    ).rejects.toThrow(
      'No se pudo determinar el estado de esta atención.'
    );

    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('CP02: rechaza un estado ausente o inválido', async () => {
    consultarUnaAtencion.mockResolvedValue({
      data: {
        atencion_id: 3,
        estado: null,
        fecha_inicio: '2026-10-27T10:00:00.000Z',
        fecha_fin: null,
      },
      error: null,
    });

    await expect(
      consultarEstadoAtencion(3)
    ).rejects.toThrow(
      'No se pudo determinar el estado de esta atención.'
    );
  });

  test('CP03: informa cuando Supabase devuelve un error', async () => {
    consultarUnaAtencion.mockResolvedValue({
      data: null,
      error: {
        message: 'Error simulado de Supabase',
      },
    });

    await expect(
      consultarEstadoAtencion(4)
    ).rejects.toThrow(
      'No se pudo cargar el estado de la atención.'
    );
  });

  test('CP04: informa cuando la atención no existe', async () => {
    consultarUnaAtencion.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(
      consultarEstadoAtencion(999)
    ).rejects.toThrow(
      'La atención veterinaria no se encuentra disponible.'
    );
  });
});
