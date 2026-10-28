// RF03 - Pruebas automatizadas de recuperación de contraseña.
// Cada caso utiliza AAA: Arrange, Act y Assert.
// Las dependencias simuladas evitan enviar correos reales durante las pruebas.

import {
  crearRecuperacionContrasenaServicio,
} from '../../services/recuperacionContrasenaServicio';

describe('RF03 - Recuperar contraseña mediante correo electrónico', () => {
  // Datos comunes de las pruebas.
  const correoValido = 'asistente@veterinaria.com';
  const correoNoRegistrado = 'noexiste@correo.com';
  const contrasenaNueva = 'Nueva@2026';

  // Dependencias simuladas del servicio.
  let enviarEnlace;
  let verificarEnlace;
  let establecerContrasena;
  let contarSolicitudes;
  let correoRegistrado;
  let servicio;

  beforeEach(() => {
    // ARRANGE: preparar servicios simulados para cada prueba.
    enviarEnlace = jest.fn().mockResolvedValue(undefined);
    verificarEnlace = jest.fn().mockResolvedValue(true);
    establecerContrasena = jest.fn().mockResolvedValue(undefined);
    contarSolicitudes = jest.fn().mockResolvedValue(0);
    correoRegistrado = jest.fn().mockResolvedValue(true);

    // ARRANGE: crear el servicio con un límite de tres solicitudes.
    servicio = crearRecuperacionContrasenaServicio({
      enviarEnlace,
      verificarEnlace,
      establecerContrasena,
      contarSolicitudes,
      correoRegistrado,
      limiteSolicitudes: 3,
    });
  });

  test('CP01 - envía el enlace y permite establecer la nueva contraseña', async () => {
    // ARRANGE: cuenta registrada, sin solicitudes previas y enlace vigente.
    correoRegistrado.mockResolvedValue(true);
    contarSolicitudes.mockResolvedValue(0);
    verificarEnlace.mockResolvedValue(true);

    // ACT: solicitar el enlace, validar su vigencia y cambiar la contraseña.
    const resultadoEnvio = await servicio.solicitarEnlace(correoValido);
    const resultadoCambio = await servicio.cambiarContrasena(
      'token-valido',
      contrasenaNueva
    );

    // ASSERT: se envía el enlace y se actualiza la contraseña.
    expect(resultadoEnvio.exito).toBe(true);
    expect(enviarEnlace).toHaveBeenCalledWith(correoValido);
    expect(resultadoCambio.exito).toBe(true);
    expect(verificarEnlace).toHaveBeenCalledWith('token-valido');
    expect(establecerContrasena).toHaveBeenCalledWith(contrasenaNueva);
  });

  test('CP02 - rechaza un correo que no está registrado', async () => {
    // ARRANGE: simular una dirección que no corresponde a una cuenta.
    correoRegistrado.mockResolvedValue(false);

    // ACT: solicitar el enlace con el correo no registrado.
    const resultado = await servicio.solicitarEnlace(correoNoRegistrado);

    // ASSERT: mostrar el mensaje establecido y no enviar el enlace.
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toBe(
      'No encontramos una cuenta asociada a este correo electronico'
    );
    expect(enviarEnlace).not.toHaveBeenCalled();
  });

  test('CP03 - bloquea solicitudes cuando se alcanza el límite de tres', async () => {
    // ARRANGE: simular que ya se realizaron las tres solicitudes permitidas.
    contarSolicitudes.mockResolvedValue(3);

    // ACT: intentar solicitar otro enlace.
    const resultado = await servicio.solicitarEnlace(correoValido);

    // ASSERT: bloquear la solicitud y mostrar el mensaje definido.
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toBe(
      'Ha excedido el límite de solicitudes. Intente nuevamente más tarde.'
    );
    expect(enviarEnlace).not.toHaveBeenCalled();
  });

  test('CP04 - impide continuar con un enlace expirado', async () => {
    // ARRANGE: simular un enlace cuya vigencia terminó.
    verificarEnlace.mockResolvedValue(false);

    // ACT: intentar validar el enlace vencido.
    const resultado = await servicio.validarEnlace('token-expirado');

    // ASSERT: rechazar el enlace y mostrar el mensaje establecido.
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toBe(
      'El enlace de recuperación ha expirado. Solicite un nuevo enlace.'
    );
    expect(establecerContrasena).not.toHaveBeenCalled();
  });

  test('CP05 - rechaza un correo con formato incorrecto', async () => {
    // ARRANGE: preparar un correo que no contiene el símbolo @.
    const correoInvalido = 'asistente.veterinaria.com';

    // ACT: solicitar el enlace con el formato incorrecto.
    const resultado = await servicio.solicitarEnlace(correoInvalido);

    // ASSERT: mostrar el mensaje de validación y no llamar al servicio.
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toBe(
      'Ingrese un correo electrónico válido.'
    );
    expect(contarSolicitudes).not.toHaveBeenCalled();
    expect(enviarEnlace).not.toHaveBeenCalled();
  });

  test('CP06 - informa cuando falla el envío del enlace', async () => {
    // ARRANGE: simular que el servicio de correo no está disponible.
    enviarEnlace.mockRejectedValue(new Error('Servicio no disponible'));

    // ACT: solicitar el enlace para una cuenta registrada.
    const resultado = await servicio.solicitarEnlace(correoValido);

    // ASSERT: mostrar el mensaje de error y no informar éxito.
    expect(resultado.exito).toBe(false);
    expect(resultado.mensaje).toBe(
      'No se pudo enviar el enlace de recuperación. Intente nuevamente más tarde.'
    );
    expect(enviarEnlace).toHaveBeenCalledWith(correoValido);
  });
});