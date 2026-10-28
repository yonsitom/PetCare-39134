
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '../../services/supabase';
import { registrarAtencion } from '../../dao/atencionesDAO';

const buscarMascota = jest.fn();
const filtrarPorHistoria = jest.fn();
const obtenerMascota = jest.fn();
const insertarAtencion = jest.fn();
const seleccionarAtencion = jest.fn();
const guardarAtencion = jest.fn();

describe('Registro de atenciones - RF22 y RF23', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    buscarMascota.mockReturnValue({
      eq: filtrarPorHistoria,
    });

    filtrarPorHistoria.mockReturnValue({
      maybeSingle: obtenerMascota,
    });

    insertarAtencion.mockReturnValue({
      select: seleccionarAtencion,
    });

    seleccionarAtencion.mockReturnValue({
      single: guardarAtencion,
    });

    supabase.from.mockImplementation((tabla) => {
      if (tabla === 'mascotas') {
        return { select: buscarMascota };
      }

      if (tabla === 'atenciones') {
        return { insert: insertarAtencion };
      }

      throw new Error(`Tabla inesperada: ${tabla}`);
    });
  });

  test('RF22 CP02: rechaza el registro sin mascota', async () => {
    await expect(
      registrarAtencion({ numero_historia: '' })
    ).rejects.toThrow(
      'Seleccione una mascota para registrar la atención.'
    );

    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('RF22 CP03: informa cuando la mascota no existe', async () => {
    obtenerMascota.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(
      registrarAtencion({ numero_historia: 'HC-9999' })
    ).rejects.toThrow(
      'No se pudo encontrar la mascota. Verifique la información e inténtelo nuevamente.'
    );

    expect(insertarAtencion).not.toHaveBeenCalled();
  });

  test('Maneja un error técnico al consultar la mascota', async () => {
    obtenerMascota.mockResolvedValue({
      data: null,
      error: { message: 'Error simulado de consulta' },
    });

    await expect(
      registrarAtencion({ numero_historia: 'HC-0001' })
    ).rejects.toThrow(
      'No se pudo verificar la mascota. Intente nuevamente.'
    );

    expect(insertarAtencion).not.toHaveBeenCalled();
  });

  test('Normaliza el número de historia antes de consultar', async () => {
    obtenerMascota.mockResolvedValue({
      data: {
        numero_historia: 'HC-0001',
        estado: 'Activo',
      },
      error: null,
    });

    guardarAtencion.mockResolvedValue({
      data: {
        atencion_id: 1,
        numero_historia: 'HC-0001',
        estado: 'Activa',
      },
      error: null,
    });

    await registrarAtencion({
      numero_historia: '  HC-0001  ',
    });

    expect(filtrarPorHistoria).toHaveBeenCalledWith(
      'numero_historia',
      'HC-0001'
    );
  });

  test('Rechaza una mascota inactiva', async () => {
    obtenerMascota.mockResolvedValue({
      data: {
        numero_historia: 'HC-0001',
        estado: 'Inactivo',
      },
      error: null,
    });

    await expect(
      registrarAtencion({ numero_historia: 'HC-0001' })
    ).rejects.toThrow(
      'No se puede registrar una atención para una mascota inactiva.'
    );

    expect(insertarAtencion).not.toHaveBeenCalled();
  });

  test('RF22 CP04: informa cuando falla el guardado', async () => {
    obtenerMascota.mockResolvedValue({
      data: {
        numero_historia: 'HC-0001',
        estado: 'Activo',
      },
      error: null,
    });

    guardarAtencion.mockResolvedValue({
      data: null,
      error: { message: 'Error simulado de Supabase' },
    });

    await expect(
      registrarAtencion({ numero_historia: 'HC-0001' })
    ).rejects.toThrow(
      'No se pudo registrar la atención veterinaria. Intente nuevamente.'
    );
  });

  test('RF22 y RF23: registra la atención con fecha automática', async () => {
    const atencionGuardada = {
      atencion_id: 1,
      numero_historia: 'HC-0001',
      fecha_inicio: '2026-10-26T10:00:00.000Z',
      estado: 'Activa',
    };

    obtenerMascota.mockResolvedValue({
      data: {
        numero_historia: 'HC-0001',
        estado: 'Activo',
      },
      error: null,
    });

    guardarAtencion.mockResolvedValue({
      data: atencionGuardada,
      error: null,
    });

    const resultado = await registrarAtencion({
      numero_historia: 'HC-0001',
      observaciones: '',
    });

    expect(resultado).toEqual(atencionGuardada);

    expect(insertarAtencion).toHaveBeenCalledWith(
      expect.objectContaining({
        numero_historia: 'HC-0001',
        estado: 'Activa',
        fecha_inicio: expect.any(String),
        observaciones: null,
      })
    );

    const datosInsertados = insertarAtencion.mock.calls[0][0];

    expect(
      Number.isNaN(Date.parse(datosInsertados.fecha_inicio))
    ).toBe(false);
  });
});
