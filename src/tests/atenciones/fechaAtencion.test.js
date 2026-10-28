
import { generarFechaInicio } from '../../utils/fechaAtencion';

describe('RF23: generación de fecha y hora de inicio', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('CP01: genera una fecha y hora válidas automáticamente', () => {
    const fecha = generarFechaInicio();

    expect(typeof fecha).toBe('string');
    expect(Number.isNaN(Date.parse(fecha))).toBe(false);
  });

  test('CP02: informa cuando falla la generación de fecha y hora', () => {
    jest.spyOn(Date.prototype, 'toISOString').mockImplementation(() => {
      throw new Error('Fallo simulado del reloj');
    });

    expect(() => generarFechaInicio()).toThrow(
      'No se pudo registrar la fecha y hora de inicio. Intente nuevamente.'
    );
  });
});
