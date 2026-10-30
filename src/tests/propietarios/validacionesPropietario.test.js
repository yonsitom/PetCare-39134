
import { validarDatosPropietario } from '../../utils/validacionesPropietario';

describe('Validaciones de propietarios — RF12', () => {
  const datosValidos = {
    nombre: 'Camila',
    apellido: 'Narvaez',
    documento_identidad: '12345678',
    telefono: '987654321',
    correo: 'camila@example.com',
  };

  test('CP01: acepta los datos válidos de un propietario', () => {
    const resultado = validarDatosPropietario(datosValidos);

    expect(resultado.valido).toBe(true);
    expect(resultado.errores).toEqual({});
  });

  test('CP02: rechaza los nombres vacíos', () => {
    const resultado = validarDatosPropietario({
      ...datosValidos,
      nombre: '   ',
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.nombre).toBe(
      'Ingrese los nombres del propietario.'
    );
  });

  test('CP03: rechaza los apellidos vacíos', () => {
    const resultado = validarDatosPropietario({
      ...datosValidos,
      apellido: '',
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.apellido).toBe(
      'Ingrese los apellidos del propietario.'
    );
  });

  test('CP04: rechaza un DNI que no tiene ocho dígitos', () => {
    const resultado = validarDatosPropietario({
      ...datosValidos,
      documento_identidad: '1234567',
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.documento_identidad).toBe(
      'El DNI debe contener 8 dígitos.'
    );
  });

  test('CP05: rechaza un DNI con letras', () => {
    const resultado = validarDatosPropietario({
      ...datosValidos,
      documento_identidad: '1234ABCD',
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.documento_identidad).toBe(
      'El DNI debe contener 8 dígitos.'
    );
  });

  test('CP06: acepta un teléfono peruano con prefijo +51', () => {
    const resultado = validarDatosPropietario({
      ...datosValidos,
      telefono: '+51 987 654 321',
    });

    expect(resultado.valido).toBe(true);
    expect(resultado.errores.telefono).toBeUndefined();
  });

  test('CP07: rechaza un teléfono que no comienza con 9', () => {
    const resultado = validarDatosPropietario({
      ...datosValidos,
      telefono: '887654321',
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.telefono).toBe(
      'Ingrese un celular válido de 9 dígitos.'
    );
  });

  test('CP08: rechaza un teléfono con menos de nueve dígitos', () => {
    const resultado = validarDatosPropietario({
      ...datosValidos,
      telefono: '98765432',
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.telefono).toBe(
      'Ingrese un celular válido de 9 dígitos.'
    );
  });

  test('CP09: rechaza un correo electrónico inválido', () => {
    const resultado = validarDatosPropietario({
      ...datosValidos,
      correo: 'correo-invalido',
    });

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.correo).toBe(
      'Ingrese un correo electrónico válido.'
    );
  });

  test('CP10: normaliza espacios en los campos de texto', () => {
    const resultado = validarDatosPropietario({
      ...datosValidos,
      nombre: '  Camila  ',
      apellido: ' Narvaez ',
      documento_identidad: ' 12345678 ',
      correo: ' camila@example.com ',
    });

    expect(resultado.valido).toBe(true);
    expect(resultado.errores).toEqual({});
  });

  test('CP11: informa todos los campos obligatorios inválidos', () => {
    const resultado = validarDatosPropietario({});

    expect(resultado.valido).toBe(false);
    expect(resultado.errores).toEqual({
      nombre: 'Ingrese los nombres del propietario.',
      apellido: 'Ingrese los apellidos del propietario.',
      documento_identidad: 'El DNI debe contener 8 dígitos.',
      telefono: 'Ingrese un celular válido de 9 dígitos.',
      correo: 'Ingrese un correo electrónico válido.',
    });
  });

  test('CP12: rechaza datos nulos o vacíos', () => {
    const resultado = validarDatosPropietario(null);

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.nombre).toBe(
      'Ingrese los nombres del propietario.'
    );
  });
});
