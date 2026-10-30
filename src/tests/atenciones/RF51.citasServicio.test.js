
/**
 * PETCARE - TDD
 * RF51: Programar y cancelar citas de atención veterinaria.
 *
 * Actores: Administrador y Asistente.
 *
 * Casos de prueba:
 * CP01: Programar cita correctamente.
 * CP02: Validar campos obligatorios.
 * CP03: Rechazar fecha y hora pasadas.
 * CP04: Evitar citas duplicadas para la misma mascota y horario.
 * CP05: Rechazar mascotas inactivas.
 * CP06: Impedir cancelar una cita cuya atención ya se inició.
 * CP07: Manejar errores al guardar la cita.
 *
 * Contrato esperado del servicio:
 * programarCita(datos) => { ok, mensaje, data }
 * cancelarCita(citaId) => { ok, mensaje, data }
 */

import {
  programarCita,
  cancelarCita,
} from '../../services/citasServicio';

import * as citasDAO from '../../dao/citasDAO';

jest.mock('../../dao/citasDAO', () => ({
  buscarMascotaPorHistoria: jest.fn(),
  buscarCitaDuplicada: jest.fn(),
  insertarCita: jest.fn(),
  obtenerCitaPorId: jest.fn(),
  obtenerAtencionPorCita: jest.fn(),
  actualizarEstadoCita: jest.fn(),
}));

describe('RF51 - Programar y cancelar citas', () => {
  const AHORA = new Date('2026-10-29T15:00:00');

  const citaValida = {
    numero_historia: 'HC000001',
    fecha_programada: '2026-10-30',
    hora_cita: '10:30:00',
    motivo_cita: 'Control veterinario',
    descripcion_cita: 'Revisión general de la mascota',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    jest.useFakeTimers();
    jest.setSystemTime(AHORA);

    citasDAO.buscarMascotaPorHistoria.mockResolvedValue({
      numero_historia: 'HC000001',
      estado: 'Activo',
    });

    citasDAO.buscarCitaDuplicada.mockResolvedValue(null);

    citasDAO.insertarCita.mockResolvedValue({
      cita_id: 1,
      ...citaValida,
      estado: 'Programada',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---------------------------------------------------------
  // CP01 - PROGRAMAR CITA CORRECTAMENTE
  // ---------------------------------------------------------
  test('CP01: debe programar una cita para una mascota activa', async () => {
    const resultado = await programarCita(citaValida);

    expect(citasDAO.buscarMascotaPorHistoria)
      .toHaveBeenCalledWith('HC000001');

    expect(citasDAO.buscarCitaDuplicada)
      .toHaveBeenCalledWith(
        'HC000001',
        '2026-10-30',
        '10:30:00'
      );

    expect(citasDAO.insertarCita).toHaveBeenCalledWith(
      expect.objectContaining({
        numero_historia: 'HC000001',
        fecha_programada: '2026-10-30',
        hora_cita: '10:30:00',
        motivo_cita: 'Control veterinario',
        estado: 'Programada',
      })
    );

    expect(resultado).toEqual(
      expect.objectContaining({
        ok: true,
        mensaje: 'La cita se programó correctamente.',
      })
    );
  });

  // ---------------------------------------------------------
  // CP02 - CAMPOS OBLIGATORIOS INCOMPLETOS
  // ---------------------------------------------------------
  test('CP02: debe rechazar la programación si faltan campos obligatorios', async () => {
    const datosIncompletos = {
      numero_historia: '',
      fecha_programada: '',
      hora_cita: '',
      motivo_cita: '',
    };

    const resultado = await programarCita(datosIncompletos);

    expect(resultado).toEqual(
      expect.objectContaining({
        ok: false,
        mensaje: 'Complete los campos obligatorios',
      })
    );

    expect(citasDAO.insertarCita).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // CP03 - FECHA U HORA PASADAS
  // ---------------------------------------------------------
  test('CP03: debe rechazar una fecha y hora anteriores a la actual', async () => {
    const datosPasados = {
      ...citaValida,
      fecha_programada: '2026-10-28',
      hora_cita: '10:00:00',
    };

    const resultado = await programarCita(datosPasados);

    expect(resultado).toEqual(
      expect.objectContaining({
        ok: false,
        mensaje: 'Seleccione una fecha y hora posteriores a la actual',
      })
    );

    expect(citasDAO.insertarCita).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // CP04 - CITA DUPLICADA
  // ---------------------------------------------------------
  test('CP04: debe impedir programar dos citas de la misma mascota en el mismo horario', async () => {
    citasDAO.buscarCitaDuplicada.mockResolvedValue({
      cita_id: 15,
      numero_historia: 'HC000001',
      fecha_programada: '2026-10-30',
      hora_cita: '10:30:00',
      estado: 'Programada',
    });

    const resultado = await programarCita(citaValida);

    expect(resultado).toEqual(
      expect.objectContaining({
        ok: false,
        mensaje: 'La mascota ya tiene una cita programada en ese horario',
      })
    );

    expect(citasDAO.insertarCita).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // CP05 - MASCOTA INACTIVA
  // ---------------------------------------------------------
  test('CP05: debe impedir programar una cita para una mascota inactiva', async () => {
    citasDAO.buscarMascotaPorHistoria.mockResolvedValue({
      numero_historia: 'HC000001',
      estado: 'Inactivo',
    });

    const resultado = await programarCita(citaValida);

    expect(resultado).toEqual(
      expect.objectContaining({
        ok: false,
        mensaje: 'No se puede programar una cita para una mascota inactiva',
      })
    );

    expect(citasDAO.insertarCita).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // CP06 - CITA CON ATENCIÓN YA INICIADA
  // ---------------------------------------------------------
  test('CP06: no debe cancelar una cita cuya atención ya se inició', async () => {
    citasDAO.obtenerCitaPorId.mockResolvedValue({
      cita_id: 1,
      numero_historia: 'HC000001',
      estado: 'Programada',
    });

    citasDAO.obtenerAtencionPorCita.mockResolvedValue({
      atencion_id: 20,
      cita_id: 1,
      estado: 'Activa',
      fecha_inicio: '2026-10-29T14:00:00',
    });

    const resultado = await cancelarCita(1);

    expect(citasDAO.obtenerCitaPorId).toHaveBeenCalledWith(1);

    expect(citasDAO.obtenerAtencionPorCita)
      .toHaveBeenCalledWith(1);

    expect(resultado).toEqual(
      expect.objectContaining({
        ok: false,
      })
    );

    expect(citasDAO.actualizarEstadoCita)
      .not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------
  // CP07 - ERROR AL GUARDAR
  // ---------------------------------------------------------
  test('CP07: debe mostrar un mensaje controlado si ocurre un error al guardar', async () => {
    citasDAO.insertarCita.mockRejectedValue(
      new Error('Error de conexión con Supabase')
    );

    const resultado = await programarCita(citaValida);

    expect(resultado).toEqual(
      expect.objectContaining({
        ok: false,
        mensaje: 'No fue posible completar la operación. Intente nuevamente',
      })
    );
  });
});
