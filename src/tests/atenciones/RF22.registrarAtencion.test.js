
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

describe('RF22: Registrar una nueva atención veterinaria', () => {
  const numeroHistoria = 'HC-TEST-001';

  const atencionSimulada = {
    atencion_id: 101,
    actividad_id: 201,
    numero_historia: numeroHistoria,
    fecha_inicio: '2026-10-28T10:30:00.000Z',
    estado: 'Activa',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    validarQueNoExistaActividadAbierta.mockResolvedValue(
      undefined
    );

    crearAtencionInicial.mockResolvedValue({
      ...atencionSimulada,
    });
  });

  test('CP01: registra una atención en estado Activa', async () => {
    // ARRANGE
    const historia = numeroHistoria;

    // ACT
    const resultado = await confirmarAtencion(historia);

    // ASSERT
    expect(
      validarQueNoExistaActividadAbierta
    ).toHaveBeenCalledTimes(1);

    expect(
      validarQueNoExistaActividadAbierta
    ).toHaveBeenCalledWith(numeroHistoria);

    expect(crearAtencionInicial).toHaveBeenCalledTimes(1);
    expect(crearAtencionInicial).toHaveBeenCalledWith(
      numeroHistoria
    );

    expect(resultado).toEqual(atencionSimulada);
    expect(resultado.atencion_id).toBe(101);
    expect(resultado.actividad_id).toBe(201);
    expect(resultado.estado).toBe('Activa');
    expect(resultado.fecha_inicio).toBeTruthy();
  });

  test('CP02: rechaza el registro si no se selecciona una mascota', async () => {
    // ARRANGE
    const historiaVacia = '   ';

    // ACT
    const operacion = confirmarAtencion(historiaVacia);

    // ASSERT
    await expect(operacion).rejects.toThrow(
      'Seleccione una mascota para registrar la atención.'
    );

    expect(crearAtencionInicial).not.toHaveBeenCalled();

    expect(
      validarQueNoExistaActividadAbierta
    ).not.toHaveBeenCalled();
  });

  test('CP03: informa que la mascota no se encuentra disponible', async () => {
    // ARRANGE
    crearAtencionInicial.mockRejectedValueOnce(
      new Error(
        'No se pudo encontrar la mascota. Verifique la información e inténtelo nuevamente.'
      )
    );

    // ACT
    const operacion = confirmarAtencion(numeroHistoria);

    // ASSERT
    await expect(operacion).rejects.toThrow(
      'No se pudo encontrar la mascota. Verifique la información e inténtelo nuevamente.'
    );

    expect(crearAtencionInicial).toHaveBeenCalledWith(
      numeroHistoria
    );
  });

  test('CP04: informa el fallo del servicio de registro', async () => {
    // ARRANGE
    crearAtencionInicial.mockRejectedValueOnce(
      new Error(
        'No se pudo registrar la atención veterinaria. Intente nuevamente.'
      )
    );

    // ACT
    const operacion = confirmarAtencion(numeroHistoria);

    // ASSERT
    await expect(operacion).rejects.toThrow(
      'No se pudo registrar la atención veterinaria. Intente nuevamente.'
    );

    expect(crearAtencionInicial).toHaveBeenCalledWith(
      numeroHistoria
    );
  });
});
