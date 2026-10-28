
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '../../services/supabase';
import { consultarResumenInicio } from '../../services/panelInicioServicio';

/**
 * RF08 y RF10:
 * Simula una consulta encadenada de Supabase.
 *
 * Permite ejecutar:
 * .select(...)
 * .eq('eliminado', false)
 *
 * La respuesta simulada se devuelve al finalizar la cadena.
 */
const crearConsulta = () => {
  const consulta = {
    select: jest.fn(),
    eq: jest.fn(),
    respuesta: null,

    then(resolve, reject) {
      return Promise.resolve(this.respuesta).then(resolve, reject);
    },
  };

  consulta.select.mockImplementation(() => consulta);
  consulta.eq.mockImplementation(() => consulta);

  return consulta;
};

describe('RF08: Visualizar el panel principal', () => {
  let consultaAtenciones;
  let consultaActividades;

  beforeEach(() => {
    jest.clearAllMocks();

    consultaAtenciones = crearConsulta();
    consultaActividades = crearConsulta();

    supabase.from.mockImplementation((tabla) => {
      if (tabla === 'atenciones') {
        return consultaAtenciones;
      }

      if (tabla === 'actividades') {
        return consultaActividades;
      }

      throw new Error(`Tabla inesperada: ${tabla}`);
    });
  });

  test('CP01: carga el resumen de atenciones y actividades', async () => {
    consultaAtenciones.respuesta = {
      count: 3,
      error: null,
    };

    consultaActividades.respuesta = {
      data: [
        { actividad_id: 1, estado: 'Pendiente' },
        { actividad_id: 2, estado: 'Pendiente' },
        { actividad_id: 3, estado: 'Pendiente' },
        { actividad_id: 4, estado: 'Pendiente' },
        { actividad_id: 5, estado: 'Completada' },
        { actividad_id: 6, estado: 'Completada' },
        { actividad_id: 7, estado: 'No realizada' },
      ],
      error: null,
    };

    const resultado = await consultarResumenInicio();

    expect(resultado).toEqual({
      atencionesRegistradas: 3,
      pendientes: 4,
      completadas: 2,
      noRealizadas: 1,
    });

    expect(supabase.from).toHaveBeenCalledWith('atenciones');
    expect(supabase.from).toHaveBeenCalledWith('actividades');

    // RF10: verificar que las actividades eliminadas se excluyan.
    expect(consultaActividades.eq).toHaveBeenCalledWith(
      'eliminado',
      false
    );
  });

  test('CP02: informa el error al consultar las atenciones', async () => {
    consultaAtenciones.respuesta = {
      count: null,
      error: {
        message: 'Error simulado al consultar atenciones',
      },
    };

    consultaActividades.respuesta = {
      data: [
        { actividad_id: 1, estado: 'Pendiente' },
      ],
      error: null,
    };

    await expect(
      consultarResumenInicio()
    ).rejects.toThrow(
      'No se pudieron cargar las atenciones. Intente nuevamente.'
    );
  });

  test('CP03: informa el error al consultar las actividades', async () => {
    consultaAtenciones.respuesta = {
      count: 3,
      error: null,
    };

    consultaActividades.respuesta = {
      data: null,
      error: {
        message: 'Error simulado al consultar actividades',
      },
    };

    await expect(
      consultarResumenInicio()
    ).rejects.toThrow(
      'No se pudo cargar el resumen de actividades. Intente nuevamente.'
    );
  });

  test('CP04: informa el error cuando falla la conexión', async () => {
    consultaAtenciones.respuesta = {
      count: null,
      error: {
        message: 'Network request failed',
      },
    };

    consultaActividades.respuesta = {
      data: null,
      error: {
        message: 'Network request failed',
      },
    };

    await expect(
      consultarResumenInicio()
    ).rejects.toThrow(
      'No se pudo conectar con el servidor. Verifique su conexión e intente nuevamente.'
    );
  });
});
