
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { supabase } from '../../services/supabase';
import { registrarAtencion } from '../../dao/atencionesDAO';

const obtenerMascota = jest.fn();
const obtenerActividad = jest.fn();
const guardarClinica = jest.fn();
const guardarObservaciones = jest.fn();

const mascotaActiva = {
  numero_historia: 'HC-0001',
  estado: 'Activo',
};

const actividadConsulta = {
  actividad_id: 10,
  tipo: 'Consulta',
  estado: 'Pendiente',
  eliminado: false,
  atencion_id: 1,
  atenciones: {
    atencion_id: 1,
    estado: 'Activa',
  },
};

const resultadoAtencion = {
  atencion_id: 1,
  actividad_id: 10,
  numero_historia: 'HC-0001',
  fecha_inicio: '2026-10-27T10:00:00.000Z',
  estado: 'Activa',
};

function configurarConsultas() {
  supabase.from.mockImplementation((tabla) => {
    if (tabla === 'mascotas') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: obtenerMascota,
          })),
        })),
      };
    }

    if (tabla === 'actividades') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: obtenerActividad,
            })),
          })),
        })),
      };
    }

    if (tabla === 'actividad_consulta') {
      return {
        upsert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: guardarClinica,
          })),
        })),
      };
    }

    if (tabla === 'atenciones') {
      return {
        update: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: guardarObservaciones,
          })),
        })),
      };
    }

    throw new Error(`Tabla inesperada: ${tabla}`);
  });
}

describe('Registro de atenciones — RF22 y RF23', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    configurarConsultas();

    obtenerMascota.mockResolvedValue({
      data: mascotaActiva,
      error: null,
    });

    obtenerActividad.mockResolvedValue({
      data: actividadConsulta,
      error: null,
    });

    guardarClinica.mockResolvedValue({
      data: {
        actividad_id: 10,
        motivo_consulta: 'Control veterinario',
        sintomas: 'Poco apetito',
        peso: 4.5,
        temperatura: 38.5,
        diagnostico: null,
      },
      error: null,
    });

    guardarObservaciones.mockResolvedValue({
      error: null,
    });

    supabase.rpc.mockResolvedValue({
      data: [resultadoAtencion],
      error: null,
    });
  });

  test('RF22 CP02: rechaza el registro sin mascota', async () => {
    await expect(
      registrarAtencion({
        numero_historia: '',
        motivo_consulta: 'Consulta general',
      })
    ).rejects.toThrow(
      'Seleccione una mascota para registrar la atención.'
    );

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  test('Rechaza el registro si falta el motivo de consulta', async () => {
    await expect(
      registrarAtencion({
        numero_historia: 'HC-0001',
        motivo_consulta: '   ',
      })
    ).rejects.toThrow(
      'El motivo de consulta es obligatorio.'
    );

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  test('RF22 CP03: informa cuando la mascota no existe', async () => {
    obtenerMascota.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(
      registrarAtencion({
        numero_historia: 'HC-9999',
        motivo_consulta: 'Consulta general',
      })
    ).rejects.toThrow(
      'No se pudo encontrar la mascota. Verifique la información e inténtelo nuevamente.'
    );

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  test('Maneja un error técnico al consultar la mascota', async () => {
    obtenerMascota.mockResolvedValue({
      data: null,
      error: {
        message: 'Error simulado de consulta',
      },
    });

    await expect(
      registrarAtencion({
        numero_historia: 'HC-0001',
        motivo_consulta: 'Consulta general',
      })
    ).rejects.toThrow(
      'No se pudo verificar la mascota. Intente nuevamente.'
    );

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  test('Normaliza la historia clínica y crea la atención inicial', async () => {
    const resultado = await registrarAtencion({
      numero_historia: '  HC-0001  ',
      motivo_consulta: 'Consulta general',
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      'crear_atencion_inicial',
      {
        p_numero_historia: 'HC-0001',
      }
    );

    expect(resultado).toEqual(
      expect.objectContaining({
        atencion_id: 1,
        actividad_id: 10,
        numero_historia: 'HC-0001',
        estado: 'Activa',
      })
    );

    expect(
      Number.isNaN(Date.parse(resultado.fecha_inicio))
    ).toBe(false);
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
      registrarAtencion({
        numero_historia: 'HC-0001',
        motivo_consulta: 'Consulta general',
      })
    ).rejects.toThrow(
      'No se puede registrar una atención para una mascota inactiva.'
    );

    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  test('RF22 CP04: informa cuando falla la creación de la atención', async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: {
        message: 'Error simulado de Supabase',
      },
    });

    await expect(
      registrarAtencion({
        numero_historia: 'HC-0001',
        motivo_consulta: 'Consulta general',
      })
    ).rejects.toThrow(
      'No se pudo registrar la atención veterinaria. Intente nuevamente.'
    );
  });

  test('RF22 y RF23: registra la atención y guarda la consulta clínica', async () => {
    const resultado = await registrarAtencion({
      numero_historia: 'HC-0001',
      motivo_consulta: 'Control veterinario',
      sintomas: 'Poco apetito',
      peso: '4.5',
      temperatura: '38.5',
      observaciones: 'Paciente tranquilo',
    });

    expect(supabase.rpc).toHaveBeenCalledWith(
      'crear_atencion_inicial',
      {
        p_numero_historia: 'HC-0001',
      }
    );

    expect(supabase.from).toHaveBeenCalledWith(
      'actividad_consulta'
    );

    expect(resultado).toEqual(
      expect.objectContaining({
        atencion_id: 1,
        actividad_id: 10,
        numero_historia: 'HC-0001',
        estado: 'Activa',
        datos_consulta: expect.objectContaining({
          actividad_id: 10,
          motivo_consulta: 'Control veterinario',
          sintomas: 'Poco apetito',
          peso: 4.5,
          temperatura: 38.5,
        }),
      })
    );

    expect(guardarClinica).toHaveBeenCalledWith();

    expect(guardarObservaciones).toHaveBeenCalledWith(
  'estado',
  'Activa'
);
  });

  test('Convierte los campos clínicos vacíos en null', async () => {
    guardarClinica.mockResolvedValue({
      data: {
        actividad_id: 10,
        motivo_consulta: 'Revisión',
        sintomas: null,
        peso: null,
        temperatura: null,
        diagnostico: null,
      },
      error: null,
    });

    const resultado = await registrarAtencion({
      numero_historia: 'HC-0001',
      motivo_consulta: 'Revisión',
      sintomas: '  ',
      peso: '',
      temperatura: '',
      observaciones: '',
    });

    expect(resultado.datos_consulta).toEqual(
      expect.objectContaining({
        sintomas: null,
        peso: null,
        temperatura: null,
      })
    );

    expect(guardarClinica).toHaveBeenCalled();
  });

  test('Rechaza un peso igual a cero', async () => {
    await expect(
      registrarAtencion({
        numero_historia: 'HC-0001',
        motivo_consulta: 'Revisión',
        peso: '0',
      })
    ).rejects.toThrow(
      'El peso debe ser un número mayor que cero.'
    );

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  test('Rechaza una temperatura no numérica', async () => {
    await expect(
      registrarAtencion({
        numero_historia: 'HC-0001',
        motivo_consulta: 'Revisión',
        temperatura: 'abc',
      })
    ).rejects.toThrow(
      'La temperatura debe ser un número mayor que cero.'
    );

    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  test('Informa si el RPC no devuelve un identificador válido', async () => {
    supabase.rpc.mockResolvedValue({
      data: [],
      error: null,
    });

    await expect(
      registrarAtencion({
        numero_historia: 'HC-0001',
        motivo_consulta: 'Revisión',
      })
    ).rejects.toThrow(
      'La atención no devolvió un identificador válido.'
    );
  });
});
