
jest.mock('../../dao/atencionesDAO', () => ({
  consultarAtenciones: jest.fn(),
  consultarMascotasParaAtencion: jest.fn(),
  crearAtencionInicial: jest.fn(),
  guardarDatosConsulta: jest.fn(),
  consultarAtencionPorId: jest.fn(),
  consultarDatosConsulta: jest.fn(),
}));

jest.mock('../../dao/actividadesDAO', () => ({
  consultarActividadesPorAtencion: jest.fn(),
  validarQueNoExistaActividadAbierta: jest.fn(),
}));

import { crearAtencionInicial } from '../../dao/atencionesDAO';
import { validarQueNoExistaActividadAbierta } from '../../dao/actividadesDAO';
import {
  confirmarAtencion,
} from '../../controllers/atenciones/atencionesControlador';

describe('RF23: Registrar automáticamente fecha y hora de inicio', () => {
  const numeroHistoria = 'HC-TEST-001';
  const fechaEsperada = '2026-10-24T15:30:00.000Z';

  const atencionSimulada = {
    atencion_id: 101,
    actividad_id: 201,
    numero_historia: numeroHistoria,
    fecha_inicio: fechaEsperada,
    estado: 'Activa',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    validarQueNoExistaActividadAbierta.mockResolvedValue(undefined);

    crearAtencionInicial.mockResolvedValue({
      ...atencionSimulada,
    });
  });

  test('CP01: registra la fecha y hora de inicio automáticamente', async () => {
    // ARRANGE
    crearAtencionInicial.mockResolvedValueOnce({
      ...atencionSimulada,
      fecha_inicio: fechaEsperada,
    });

    // ACT
    const resultado = await confirmarAtencion(numeroHistoria);

    // ASSERT
    expect(resultado.fecha_inicio).toBe(fechaEsperada);
    expect(Number.isNaN(Date.parse(resultado.fecha_inicio))).toBe(false);
    expect(resultado.estado).toBe('Activa');
    expect(crearAtencionInicial).toHaveBeenCalledWith(numeroHistoria);
  });

  test('CP02: comunica el error al obtener la fecha y hora', async () => {
    // ARRANGE
    crearAtencionInicial.mockRejectedValueOnce(
      new Error(
        'No se pudo registrar la fecha y hora de inicio. Intente nuevamente.'
      )
    );

    // ACT
    const operacion = confirmarAtencion(numeroHistoria);

    // ASSERT
    await expect(operacion).rejects.toThrow(
      'No se pudo registrar la fecha y hora de inicio. Intente nuevamente.'
    );
  });

  test('CP03: comunica el error al guardar el inicio de la atención', async () => {
    // ARRANGE
    crearAtencionInicial.mockRejectedValueOnce(
      new Error(
        'No se pudo registrar el inicio de la atención. Intente nuevamente.'
      )
    );

    // ACT
    const operacion = confirmarAtencion(numeroHistoria);

    // ASSERT
    await expect(operacion).rejects.toThrow(
      'No se pudo registrar el inicio de la atención. Intente nuevamente.'
    );
  });

  test('CP04: no inicia la atención si falta seleccionar una mascota', async () => {
    // ARRANGE
    const numeroHistoriaVacio = ' ';

    // ACT
    const operacion = confirmarAtencion(numeroHistoriaVacio);

    // ASSERT
    await expect(operacion).rejects.toThrow(
      'Seleccione una mascota para registrar la atención.'
    );

    expect(crearAtencionInicial).not.toHaveBeenCalled();
    expect(validarQueNoExistaActividadAbierta).not.toHaveBeenCalled();
  });
});
