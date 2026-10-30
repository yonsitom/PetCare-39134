

/**
 * Proyecto: PetCare
 * Requerimiento: RF20 - Consultar historial de atención de una mascota
 * Enfoque: TDD
 *
 * Estas pruebas simulan Supabase para evitar modificar
 * la base de datos real durante la ejecución.
 */

jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '../../services/supabase';

import {
  buscarMascotasParaHistorial,
  consultarHistorialAtencionesPorMascota,
} from '../../dao/atencionesDAO';

/**
 * Simula la cadena de consultas de Supabase.
 */
function crearConsultaSimulada(respuesta) {
  const consulta = {
    select: jest.fn(() => consulta),
    eq: jest.fn(() => consulta),
    order: jest.fn(() => consulta),
    limit: jest.fn(() => consulta),
    or: jest.fn(() => consulta),

    then: (resolve, reject) =>
      Promise.resolve(respuesta).then(resolve, reject),
  };

  return consulta;
}

describe('RF20 - Consultar historial de atención de una mascota', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('CP01 - Devuelve el historial ordenado del más reciente al más antiguo', async () => {
    const atenciones = [
      {
        atencion_id: 3,
        numero_historia: 'HC001',
        fecha_inicio: '2026-10-20T10:00:00',
        estado: 'Activa',
        observaciones: 'Control general',
      },
      {
        atencion_id: 2,
        numero_historia: 'HC001',
        fecha_inicio: '2026-09-15T09:00:00',
        estado: 'Finalizada',
        observaciones: 'Vacunación',
      },
      {
        atencion_id: 1,
        numero_historia: 'HC001',
        fecha_inicio: '2026-08-10T08:00:00',
        estado: 'Finalizada',
        observaciones: 'Primera consulta',
      },
    ];

    const consulta = crearConsultaSimulada({
      data: atenciones,
      error: null,
    });

    supabase.from.mockReturnValue(consulta);

    const resultado =
      await consultarHistorialAtencionesPorMascota('HC001');

    expect(supabase.from).toHaveBeenCalledWith('atenciones');

    expect(consulta.eq).toHaveBeenCalledWith(
      'numero_historia',
      'HC001'
    );

    expect(consulta.order).toHaveBeenCalledWith(
      'fecha_inicio',
      { ascending: false }
    );

    expect(resultado).toEqual(atenciones);
    expect(resultado).toHaveLength(3);
    expect(resultado[0].atencion_id).toBe(3);
  });

  test('CP02 - Devuelve una lista vacía cuando no hay atenciones', async () => {
    const consulta = crearConsultaSimulada({
      data: [],
      error: null,
    });

    supabase.from.mockReturnValue(consulta);

    const resultado =
      await consultarHistorialAtencionesPorMascota('HC001');

    expect(resultado).toEqual([]);
    expect(resultado).toHaveLength(0);
  });

  test('CP03 - La búsqueda sin coincidencias devuelve una lista vacía', async () => {
    const consulta = crearConsultaSimulada({
      data: [],
      error: null,
    });

    supabase.from.mockReturnValue(consulta);

    const resultado =
      await buscarMascotasParaHistorial('MascotaInexistente');

    expect(supabase.from).toHaveBeenCalledWith('mascotas');
    expect(consulta.limit).toHaveBeenCalledWith(20);
    expect(resultado).toEqual([]);
  });

  test('CP04 - Controla los errores al consultar el historial', async () => {
    const consulta = crearConsultaSimulada({
      data: null,
      error: { message: 'Error simulado de Supabase' },
    });

    supabase.from.mockReturnValue(consulta);

    await expect(
      consultarHistorialAtencionesPorMascota('HC001')
    ).rejects.toThrow(
      'No se pudo cargar el historial de atención. Intente nuevamente.'
    );
  });

  test('CP04.1 - Controla los errores al buscar mascotas', async () => {
    const consulta = crearConsultaSimulada({
      data: null,
      error: { message: 'Error simulado de búsqueda' },
    });

    supabase.from.mockReturnValue(consulta);

    await expect(
      buscarMascotasParaHistorial('Firulais')
    ).rejects.toThrow(
      'No se pudo cargar el historial de atención. Intente nuevamente.'
    );
  });

  test('CP05 - No consulta Supabase cuando el número de historia está vacío', async () => {
    await expect(
      consultarHistorialAtencionesPorMascota('   ')
    ).rejects.toThrow(
      'No se pudo cargar el historial de atención. Intente nuevamente.'
    );

    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('CP05.1 - La búsqueda vacía devuelve una lista vacía sin consultar Supabase', async () => {
    const resultado = await buscarMascotasParaHistorial('   ');

    expect(resultado).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('CP06 - Normaliza el número de historia eliminando espacios y usando mayúsculas', async () => {
    const consulta = crearConsultaSimulada({
      data: [],
      error: null,
    });

    supabase.from.mockReturnValue(consulta);

    await consultarHistorialAtencionesPorMascota(' hc001 ');

    expect(consulta.eq).toHaveBeenCalledWith(
      'numero_historia',
      'HC001'
    );
  });
});
