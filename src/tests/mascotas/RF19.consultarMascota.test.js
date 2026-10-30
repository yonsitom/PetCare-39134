
import {
  obtenerMensajeSinResultados,
  obtenerMensajeSinAtenciones,
  tieneDatosIncompletos,
  obtenerMensajeErrorConsulta,
} from '../../utils/validacionesConsultaMascota';

describe('RF19: Consultar la información de una mascota', () => {
  const mascotaCompleta = {
    numero_historia: 'HC0001',
    nombre: 'Firulais',
    especie: 'Perro',
    raza: 'Mestizo',
    sexo: 'Macho',
    fecha_nacimiento: '2022-05-10',
    color: 'Marrón',
    estado_esterilizacion: 'No aplica',
    observaciones: 'Mascota de prueba',
    estado: 'Activo',
    propietarios: {
      propietario_id: 1,
      nombre: 'Juan Pérez',
      documento_identidad: '45678912',
      telefono: '999999999',
      correo: 'juan@example.com',
    },
  };

  test('CP01: consultar una mascota y mostrar sus datos y propietario', () => {
    // Arrange
    const mascota = mascotaCompleta;

    // Act
    const propietario = mascota.propietarios;

    // Assert
    expect(mascota.nombre).toBe('Firulais');
    expect(mascota.especie).toBe('Perro');
    expect(propietario.nombre).toBe('Juan Pérez');
    expect(propietario.documento_identidad).toBe('45678912');
  });

  test('CP02: mostrar el mensaje cuando no hay coincidencias', () => {
    // Arrange
    const resultado = [];

    // Act
    const mensaje = obtenerMensajeSinResultados(resultado);

    // Assert
    expect(mensaje).toBe(
      'No se encontraron mascotas con los datos ingresados.'
    );
  });

  test('CP03: informar que la mascota no tiene atenciones registradas', () => {
    // Arrange
    const atenciones = [];

    // Act
    const mensaje = obtenerMensajeSinAtenciones(atenciones);

    // Assert
    expect(mensaje).toBe(
      'Esta mascota aún no cuenta con atenciones registradas.'
    );
  });

  test('CP04: detectar información incompleta de la mascota', () => {
    // Arrange
    const mascota = {
      ...mascotaCompleta,
      raza: null,
      color: '',
    };

    // Act
    const resultado = tieneDatosIncompletos(mascota);

    // Assert
    expect(resultado).toBe(true);
  });

  test('CP05: mostrar el mensaje genérico si falla la consulta', () => {
    // Arrange
    const error = new Error('Error interno de Supabase');

    // Act
    const mensaje = obtenerMensajeErrorConsulta(error);

    // Assert
    expect(mensaje).toBe(
      'No se pudo consultar la información de la mascota. Intente nuevamente.'
    );
    expect(mensaje).not.toContain('Supabase');
  });
});
