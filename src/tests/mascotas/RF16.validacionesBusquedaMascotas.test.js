import {
  validarTerminoBusquedaMascotas,
  filtrarMascotasPorBusqueda,
  obtenerMensajeResultadoBusqueda,
} from '../../utils/validacionesBusquedaMascotas';

describe('RF16: Buscar una mascota mediante la barra de búsqueda', () => {
  const mascotas = [
    {
      nombre: 'Firulais',
      numero_historia: 'HC0001',
      especie: 'Perro',
      raza: 'Mestizo',
      sexo: 'Macho',
      propietarios: {
        nombre: 'Juan',
        apellido: 'Pérez',
        documento_identidad: '45678912',
      },
    },
  ];

  test('CP01: busca una mascota registrada y muestra las coincidencias', () => {
    // Arrange
    const termino = 'Firulais';

    // Act
    const validacion = validarTerminoBusquedaMascotas(termino);
    const resultado = filtrarMascotasPorBusqueda(mascotas, termino);

    // Assert
    expect(validacion.valido).toBe(true);
    expect(resultado).toHaveLength(1);
    expect(resultado[0].nombre).toBe('Firulais');
  });

  test('CP02: rechaza caracteres no permitidos', () => {
    // Arrange
    const termino = '@@##';

    // Act
    const resultado = validarTerminoBusquedaMascotas(termino);

    // Assert
    expect(resultado.valido).toBe(false);
    expect(resultado.mensaje).toBe(
      'El dato ingresado no tiene un formato válido.'
    );
  });

  test('CP03: informa cuando no hay mascotas coincidentes', () => {
    // Arrange
    const termino = 'Rocky';

    // Act
    const validacion = validarTerminoBusquedaMascotas(termino);
    const resultado = filtrarMascotasPorBusqueda(mascotas, termino);
    const mensaje = obtenerMensajeResultadoBusqueda(termino, resultado);

    // Assert
    expect(validacion.valido).toBe(true);
    expect(resultado).toHaveLength(0);
    expect(mensaje).toBe(
      'No se encontraron mascotas con los datos ingresados.'
    );
  });

  test('CP04: rechaza una búsqueda vacía', () => {
    // Arrange
    const termino = '   ';

    // Act
    const resultado = validarTerminoBusquedaMascotas(termino);

    // Assert
    expect(resultado.valido).toBe(false);
    expect(resultado.mensaje).toBe(
      'Ingrese al menos un dato para buscar.'
    );
  });
});
