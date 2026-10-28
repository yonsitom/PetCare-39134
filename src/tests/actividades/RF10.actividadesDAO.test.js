
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '../../services/supabase';
import { consultarActividadesPorEstado } from '../../dao/actividadesDAO';

function crearConsulta(respuesta) {
  const consulta = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    respuesta,
    then(resolve, reject) {
      return Promise.resolve(this.respuesta).then(resolve, reject);
    },
  };

  consulta.select.mockImplementation(() => consulta);
  consulta.eq.mockImplementation(() => consulta);
  consulta.order.mockImplementation(() => consulta);

  return consulta;
}

describe('RF10: DAO de actividades por estado', () => {
  let consulta;

  beforeEach(() => {
    jest.clearAllMocks();

    consulta = crearConsulta({
      data: [
        {
          actividad_id: 1,
          estado: 'Pendiente',
          eliminado: false,
        },
        {
          actividad_id: 2,
          estado: 'Pendiente',
          eliminado: false,
        },
      ],
      error: null,
    });

    supabase.from.mockReturnValue(consulta);
  });

  test('CP01: consulta actividades pendientes y excluye las eliminadas', async () => {
    const resultado = await consultarActividadesPorEstado('Pendiente');

    expect(resultado).toHaveLength(2);
    expect(supabase.from).toHaveBeenCalledWith('actividades');
    expect(consulta.eq).toHaveBeenCalledWith('eliminado', false);
    expect(consulta.eq).toHaveBeenCalledWith('estado', 'Pendiente');
    expect(consulta.order).toHaveBeenCalledWith(
      'fecha_registro',
      { ascending: false }
    );
  });

  test('CP02: devuelve una lista vacía si no existen actividades', async () => {
    consulta.respuesta = {
      data: [],
      error: null,
    };

    const resultado = await consultarActividadesPorEstado('Completada');

    expect(resultado).toEqual([]);
    expect(consulta.eq).toHaveBeenCalledWith('eliminado', false);
    expect(consulta.eq).toHaveBeenCalledWith('estado', 'Completada');
  });

  test('CP03: permite consultar todos los estados cuando no se especifica filtro', async () => {
    await consultarActividadesPorEstado();

    expect(consulta.eq).toHaveBeenCalledWith('eliminado', false);
    expect(consulta.eq).not.toHaveBeenCalledWith(
      'estado',
      expect.anything()
    );
  });

  test('CP04: rechaza un estado no permitido', async () => {
    await expect(
      consultarActividadesPorEstado('En proceso')
    ).rejects.toThrow('El estado indicado no es válido.');

    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('CP05: propaga el error cuando Supabase falla', async () => {
    consulta.respuesta = {
      data: null,
      error: { message: 'Error simulado de Supabase' },
    };

    await expect(
      consultarActividadesPorEstado('Pendiente')
    ).rejects.toThrow();
  });
});
