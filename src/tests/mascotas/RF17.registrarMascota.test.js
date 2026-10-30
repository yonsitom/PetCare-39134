
import {
  validarDatosRegistroMascota,
  obtenerMensajeErrorRegistroMascota,
} from '../../utils/validacionesRegistroMascota';

describe('RF17 - Registrar una mascota y asociarla a un propietario', () => {
  const fechaActual = new Date(2026, 9, 27);

  const mascotaValida = {
    propietario_id: 'propietario-123',
    nombre: 'Firulais',
    especie: 'Perro',
    raza: 'Mestizo',
    sexo: 'Macho',
    fecha_nacimiento: '2021-03-15',
    color: null,
    estado_esterilizacion: 'No aplica',
    observaciones: null,
  };

  test('CP01 - Registrar una mascota con datos válidos y propietario seleccionado', () => {
    const resultado = validarDatosRegistroMascota(
      mascotaValida,
      fechaActual
    );

    expect(resultado).toEqual({
      valido: true,
      mensaje: '',
    });
  });

  test('CP02 - Rechazar el registro cuando faltan campos obligatorios', () => {
    const datos = {
      ...mascotaValida,
      nombre: ' ',
      especie: '',
    };

    const resultado = validarDatosRegistroMascota(
      datos,
      fechaActual
    );

    expect(resultado).toEqual({
      valido: false,
      mensaje: 'Complete los campos obligatorios para continuar.',
    });
  });

  test('CP03 - Rechazar el registro cuando no se seleccionó un propietario', () => {
    const datos = {
      ...mascotaValida,
      propietario_id: '',
    };

    const resultado = validarDatosRegistroMascota(
      datos,
      fechaActual
    );

    expect(resultado).toEqual({
      valido: false,
      mensaje: 'Seleccione un propietario para continuar.',
    });
  });

  test.each([
    ['fecha con mes y día inválidos', '2021-13-45'],
    ['fecha futura', '2027-01-01'],
  ])('CP04 - Rechazar una %s', (descripcion, fecha) => {
    const datos = {
      ...mascotaValida,
      fecha_nacimiento: fecha,
    };

    const resultado = validarDatosRegistroMascota(
      datos,
      fechaActual
    );

    expect(resultado).toEqual({
      valido: false,
      mensaje:
        'Verifique los datos ingresados e inténtelo nuevamente.',
    });
  });

  test('CP04 - Permitir el registro cuando la fecha de nacimiento es opcional', () => {
    const datos = {
      ...mascotaValida,
      fecha_nacimiento: '',
    };

    const resultado = validarDatosRegistroMascota(
      datos,
      fechaActual
    );

    expect(resultado).toEqual({
      valido: true,
      mensaje: '',
    });
  });

  test('CP05 - Mostrar el mensaje esperado cuando falla el servicio de registro', () => {
    const error = new Error('Error interno de Supabase');

    expect(
      obtenerMensajeErrorRegistroMascota(error)
    ).toBe('No se pudo registrar la mascota. Intente nuevamente.');
  });
});
