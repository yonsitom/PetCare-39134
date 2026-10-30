// Pruebas del logger (react-native-logs): no debe registrar datos sensibles.
import { sanitizar, ocultarCorreo, logger } from '../../utils/logger';

describe('Logger seguro', () => {
  test('oculta contraseñas, tokens, documentos y teléfonos', () => {
    const datos = sanitizar({
      nombre: 'Luna',
      contrasena: 'Secreta123',
      access_token: 'abc',
      documento_identidad: '12345678',
      telefono: '987654321',
    });

    expect(datos).toEqual({
      nombre: 'Luna',
      contrasena: '***',
      access_token: '***',
      documento_identidad: '***',
      telefono: '***',
    });
  });

  test('oculta correos y tokens JWT dentro de textos', () => {
    const texto = sanitizar(
      'Usuario jhon@utp.edu.pe con token eyJhbGciOi.eyJzdWIiOi.firma123'
    );

    expect(texto).toBe('Usuario jh***@utp.edu.pe con token ***');
    expect(ocultarCorreo('ana@gmail.com')).toBe('an***@gmail.com');
  });

  test('convierte los errores sin perder el mensaje ni el código', () => {
    const error = new Error('Fallo al consultar mascotas');
    error.code = 'PGRST116';

    expect(sanitizar(error)).toEqual({
      nombre: 'Error',
      mensaje: 'Fallo al consultar mascotas',
      codigo: 'PGRST116',
    });
  });

  test('no modifica el objeto original', () => {
    const original = { correo: 'a@b.com' };
    sanitizar(original);
    expect(original.correo).toBe('a@b.com');
  });

  test('expone los niveles de registro', () => {
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.modulo('MascotaDAO').info).toBe('function');
  });
});
