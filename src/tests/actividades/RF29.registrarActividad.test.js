
import { registrarActividadServicio } from '../../services/actividadesServicio';
import { registrarActividad } from '../../dao/actividadesDAO';

jest.mock('../../dao/actividadesDAO', () => ({
  consultarActividadesPorEstado: jest.fn(),
  actualizarEstadoActividad: jest.fn(),
  registrarActividad: jest.fn(),
}));

describe('RF29 - Registrar actividad', () => {
  const datosValidos = {
    atencion_id: 123,
    tipo_id: 1,
    observaciones: 'Control general de Firulais',
    fecha_prevista: '2026-11-05',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('CP01: registra correctamente una actividad con todos los campos válidos', async () => {
    const actividadRegistrada = {
      actividad_id: 50,
      ...datosValidos,
      estado: 'Pendiente',
      eliminado: false,
    };

    registrarActividad.mockResolvedValue(actividadRegistrada);

    const resultado = await registrarActividadServicio(datosValidos);

    expect(registrarActividad).toHaveBeenCalledWith(
      expect.objectContaining(datosValidos)
    );
    expect(resultado).toEqual(actividadRegistrada);
  });

  test('CP02: rechaza el registro cuando faltan campos obligatorios', async () => {
    const datosIncompletos = {
      ...datosValidos,
      tipo_id: null,
      fecha_prevista: '',
    };

    await expect(
      registrarActividadServicio(datosIncompletos)
    ).rejects.toThrow();

    expect(registrarActividad).not.toHaveBeenCalled();
  });

  test('CP03: rechaza una fecha inválida como 45/13/2026', async () => {
    const datosConFechaInvalida = {
      ...datosValidos,
      fecha_prevista: '45/13/2026',
    };

    await expect(
      registrarActividadServicio(datosConFechaInvalida)
    ).rejects.toThrow();

    expect(registrarActividad).not.toHaveBeenCalled();
  });

  test('CP04: informa del error cuando el registro falla', async () => {
    registrarActividad.mockRejectedValue(
      new Error('Error simulado de Supabase')
    );

    await expect(
      registrarActividadServicio(datosValidos)
    ).rejects.toThrow();

    expect(registrarActividad).toHaveBeenCalledTimes(1);
  });
});
