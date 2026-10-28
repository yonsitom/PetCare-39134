
import { validarDatosPropietario } from '../../utils/validacionesPropietario';

describe('Validaciones de propietarios', () => {
  const datosValidos = {
    nombre: 'Camila',
    apellido: 'Narvaez',
    documento_identidad: '12345678',
    telefono: '987654321',
    correo: 'camila@example.com',
    direccion: '',
    observaciones: '',
  };

  test('acepta los datos válidos de un propietario', () => {
    const resultado = validarDatosPropietario(datosValidos);

    expect(resultado.valido).toBe(true);
    expect(resultado.errores).toEqual({});
  });

  test('rechaza el nombre vacío', () => {
    const resultado = validarDatosPropietario({
      ...datosValidos,
      nombre: '',
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.nombre).toBe(
      'Ingrese los nombres del propietario.'
    );
  });

  test('rechaza el apellido vacío', () => {
    const resultado = validarDatosPropietario({
      ...datosValidos,
      apellido: '',
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.apellido).toBe(
      'Ingrese los apellidos del propietario.'
    );
  });

  test('rechaza un DNI que no tenga ocho dígitos', () => {
    const resultado = validarDatosPropietario({
      ...datosValidos,
      documento_identidad: '12345',
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.documento_identidad).toBe(
      'El DNI debe contener 8 dígitos.'
    );
  });

  test('rechaza un número de celular inválido', () => {
    const resultado = validarDatosPropietario({
      ...datosValidos,
      telefono: '12345678',
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.telefono).toBe(
      'Ingrese un celular válido de 9 dígitos.'
    );
  });

  test('rechaza un correo electrónico inválido', () => {
    const resultado = validarDatosPropietario({
      ...datosValidos,
      correo: 'correo-invalido',
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.correo).toBe(
      'Ingrese un correo electrónico válido.'
    );
  });
});
