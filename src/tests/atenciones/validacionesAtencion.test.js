
import { validarDatosAtencion } from '../../utils/validacionesAtencion';

describe('Validación de datos de una atención', () => {
  test('rechaza una atención cuando no se indica la mascota', () => {
    const datos = {
      numero_historia: '',
      observaciones: '',
    };

    expect(validarDatosAtencion(datos)).toEqual({
      valido: false,
      mensaje: 'Seleccione una mascota para registrar la atenci\u00f3n.',
    });
  });

  test('acepta los datos cuando se indica la mascota', () => {
    const datos = {
      numero_historia: 'HC-0001',
      observaciones: '',
    };

    expect(validarDatosAtencion(datos)).toEqual({
      valido: true,
      mensaje: '',
    });
  });
});


