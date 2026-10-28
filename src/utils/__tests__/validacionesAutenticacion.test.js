
import {
  validarCampos,
  validarCorreo,
} from '../validacionesAutenticacion';

describe('RF01 - Validación de inicio de sesión', () => {
  describe('validarCampos', () => {
    test('CP01 - acepta correo y contraseña ingresados', () => {
      // Arrange
      const correo = 'asistente@petcare.com';
      const contrasena = 'Prueba123';

      // Act
      const resultado = validarCampos(correo, contrasena);

      // Assert
      expect(resultado.valido).toBe(true);
      expect(resultado.mensaje).toBe('');
    });

    test('CP02 - rechaza el correo vacío', () => {
      // Arrange
      const correo = '';
      const contrasena = 'Prueba123';

      // Act
      const resultado = validarCampos(correo, contrasena);

      // Assert
      expect(resultado.valido).toBe(false);
      expect(resultado.mensaje).toBe('Campos incompletos');
    });

    test('CP02 - rechaza la contraseña vacía', () => {
      // Arrange
      const correo = 'asistente@petcare.com';
      const contrasena = '';

      // Act
      const resultado = validarCampos(correo, contrasena);

      // Assert
      expect(resultado.valido).toBe(false);
      expect(resultado.mensaje).toBe('Campos incompletos');
    });

    test('CP02 - rechaza el correo compuesto solo por espacios', () => {
      // Arrange
      const correo = '   ';
      const contrasena = 'Prueba123';

      // Act
      const resultado = validarCampos(correo, contrasena);

      // Assert
      expect(resultado.valido).toBe(false);
      expect(resultado.mensaje).toBe('Campos incompletos');
    });
  });

  describe('validarCorreo', () => {
    test('CP01 - acepta un correo con formato válido', () => {
      // Arrange
      const correo = 'asistente@petcare.com';

      // Act
      const resultado = validarCorreo(correo);

      // Assert
      expect(resultado.valido).toBe(true);
      expect(resultado.mensaje).toBe('');
    });

    test('CP03 - rechaza un correo sin arroba y dominio', () => {
      // Arrange
      const correo = 'asistente-veterinaria';

      // Act
      const resultado = validarCorreo(correo);

      // Assert
      expect(resultado.valido).toBe(false);
      expect(resultado.mensaje).toBe(
        'Ingrese un correo electrónico válido.'
      );
    });

    test('CP03 - rechaza un correo sin dominio completo', () => {
      // Arrange
      const correo = 'asistente@veterinaria';

      // Act
      const resultado = validarCorreo(correo);

      // Assert
      expect(resultado.valido).toBe(false);
      expect(resultado.mensaje).toBe(
        'Ingrese un correo electrónico válido.'
      );
    });

    test('CP03 - rechaza un correo vacío', () => {
      // Arrange
      const correo = '';

      // Act
      const resultado = validarCorreo(correo);

      // Assert
      expect(resultado.valido).toBe(false);
      expect(resultado.mensaje).toBe(
        'Ingrese un correo electrónico válido.'
      );
    });

    test('CP03 - acepta espacios exteriores si el correo es válido', () => {
      // Arrange
      const correo = '  asistente@petcare.com  ';

      // Act
      const resultado = validarCorreo(correo);

      // Assert
      expect(resultado.valido).toBe(true);
      expect(resultado.mensaje).toBe('');
    });
  });
});
