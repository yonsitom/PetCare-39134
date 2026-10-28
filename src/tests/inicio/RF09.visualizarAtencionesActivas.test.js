
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '../../services/supabase';
import { consultarIndicadoresInicio } from '../../services/panelInicioServicio';

const crearConsulta = (resultado) => {
  const consulta = {
    select: jest.fn(),
    eq: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
  };

  consulta.select.mockReturnValue(consulta);
  consulta.eq.mockReturnValue(consulta);
  consulta.gte.mockReturnValue(consulta);
  consulta.lte.mockReturnValue(consulta);

  consulta.then = (resolve, reject) =>
    Promise.resolve(resultado).then(resolve, reject);

  return consulta;
};

describe('RF09: Consultar el contador de atenciones activas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('CP01: devuelve 2 cuando existen dos atenciones activas', async () => {
    const resultados = [
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 2, error: null },
    ];

    const consultas = resultados.map((resultado) =>
      crearConsulta(resultado)
    );

    supabase.from.mockImplementation(() => {
      const consulta = consultas.shift();
      return consulta;
    });

    const resultado = await consultarIndicadoresInicio();

    expect(resultado.activas).toBe(2);
    expect(supabase.from).toHaveBeenCalledWith('atenciones');
  });

  test('CP02: devuelve 0 cuando no existen atenciones activas', async () => {
    const resultados = [
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
    ];

    const consultas = resultados.map((resultado) =>
      crearConsulta(resultado)
    );

    supabase.from.mockImplementation(() => consultas.shift());

    const resultado = await consultarIndicadoresInicio();

    expect(resultado.activas).toBe(0);
  });

  test('CP03: informa un error si falla la consulta de atenciones activas', async () => {
    const resultados = [
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      { count: 0, error: null },
      {
        count: null,
        error: { message: 'Error simulado de atenciones activas' },
      },
    ];

    const consultas = resultados.map((resultado) =>
      crearConsulta(resultado)
    );

    supabase.from.mockImplementation(() => consultas.shift());

    await expect(consultarIndicadoresInicio()).rejects.toThrow(
      'No se pudo cargar la cantidad de atenciones activas. Intente nuevamente.'
    );
  });
});
