// RF03 - Pruebas automatizadas de recuperación de contraseña.
// Cada caso utiliza AAA: Arrange, Act y Assert.
// Las dependencias simuladas evitan enviar correos reales durante las pruebas.

import * as Linking from 'expo-linking';
import {
  MENSAJE_ENLACE_EXPIRADO,
  MENSAJE_SOLICITUD_RECUPERACION,
  RUTA_RESTABLECER_CONTRASENA,
  actualizarContrasenaRecuperada,
  cerrarSesionRecuperacion,
  construirUrlRecuperacion,
  crearRecuperacionContrasenaServicio,
  enviarEnlaceRecuperacion,
  establecerSesionDesdeEnlace,
  extraerParametrosEnlace,
  urlTieneDatosRecuperacion,
  validarContrasenaNueva,
} from '../../services/persistencia/recuperacionContrasenaServicio';

// El servicio importa Supabase y Expo Linking: se simulan para no usar red ni módulos nativos.
jest.mock('../../services/supabase', () => ({ supabase: { auth: {} } }));
jest.mock('expo-linking', () => ({
  createURL: jest.fn((ruta) => `exp://192.168.1.10:8081/--/${ruta}`),
}));

describe('RF03 - Recuperar contraseña mediante correo electrónico', () => {
  // Datos comunes de las pruebas.
  const correoValido = 'asistente@veterinaria.com';
  const correoNoRegistrado = 'noexiste@correo.com';
  const contrasenaNueva = 'Nueva@2026';

  beforeEach(() => {
    // Evitar ruido de console.error en los casos de fallo controlado.
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Simular Linking.createURL como lo haría Expo Go en la red local.
    Linking.createURL.mockImplementation(
      (ruta) => `exp://192.168.1.10:8081/--/${ruta}`
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================================
  // Servicio con dependencias inyectadas (lógica del RF03)
  // ==========================================================
  describe('Servicio aislado (dependencias inyectadas)', () => {
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

    test('CP02 - con un correo no registrado responde igual y no envía el enlace', async () => {
      // ARRANGE: simular una dirección que no corresponde a una cuenta.
      correoRegistrado.mockResolvedValue(false);

      // ACT: solicitar el enlace con el correo no registrado.
      const resultado = await servicio.solicitarEnlace(correoNoRegistrado);

      // ASSERT: no se revela que la cuenta no existe y no se envía nada.
      expect(resultado.exito).toBe(true);
      expect(resultado.mensaje).toBe(MENSAJE_SOLICITUD_RECUPERACION);
      expect(resultado.mensaje).not.toMatch(/no encontramos/i);
      expect(enviarEnlace).not.toHaveBeenCalled();
    });

    test('CP02b - el resultado es idéntico exista o no la cuenta', async () => {
      // ARRANGE: una solicitud con cuenta existente y otra con cuenta inexistente.
      correoRegistrado.mockResolvedValueOnce(true);
      correoRegistrado.mockResolvedValueOnce(false);

      // ACT: pedir el enlace para ambos correos.
      const conCuenta = await servicio.solicitarEnlace(correoValido);
      const sinCuenta = await servicio.solicitarEnlace(correoNoRegistrado);

      // ASSERT: mismo éxito y mismo mensaje.
      expect(sinCuenta).toEqual(conCuenta);
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
      expect(resultado.mensaje).toBe('Ingrese un correo electrónico válido.');
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

  // ==========================================================
  // Validación de la contraseña nueva
  // ==========================================================
  describe('Validación de la contraseña nueva', () => {
    test('CP07 - exige completar ambos campos', () => {
      // ACT: validar con la confirmación vacía.
      const resultado = validarContrasenaNueva(contrasenaNueva, '');

      // ASSERT: pedir ambos campos.
      expect(resultado.valida).toBe(false);
      expect(resultado.mensaje).toBe('Ingrese y confirme la nueva contraseña.');
    });

    test('CP08 - rechaza contraseñas con menos de 8 caracteres', () => {
      // ACT: validar una contraseña corta.
      const resultado = validarContrasenaNueva('Ab1', 'Ab1');

      // ASSERT: informar el mínimo de caracteres.
      expect(resultado.valida).toBe(false);
      expect(resultado.mensaje).toBe('La contraseña debe tener mínimo 8 caracteres.');
    });

    test.each([
      ['sin mayúscula', 'nueva@2026'],
      ['sin minúscula', 'NUEVA@2026'],
      ['sin número', 'Nueva@Clave'],
    ])('CP09 - rechaza una contraseña %s', (_descripcion, contrasena) => {
      // ACT: validar una contraseña que incumple un requisito.
      const resultado = validarContrasenaNueva(contrasena, contrasena);

      // ASSERT: informar los requisitos.
      expect(resultado.valida).toBe(false);
      expect(resultado.mensaje).toBe(
        'La contraseña debe incluir al menos una mayúscula, una minúscula y un número.'
      );
    });

    test('CP10 - rechaza contraseñas que no coinciden', () => {
      // ACT: validar contraseña y confirmación diferentes.
      const resultado = validarContrasenaNueva(contrasenaNueva, 'Otra@2026');

      // ASSERT: informar que no coinciden.
      expect(resultado.valida).toBe(false);
      expect(resultado.mensaje).toBe('Las contraseñas no coinciden.');
    });

    test('CP11 - acepta una contraseña válida que coincide', () => {
      // ACT: validar contraseña y confirmación iguales.
      const resultado = validarContrasenaNueva(contrasenaNueva, contrasenaNueva);

      // ASSERT: sin errores.
      expect(resultado).toEqual({ valida: true, mensaje: '' });
    });
  });

  // ==========================================================
  // Solicitud real del enlace (Supabase Auth simulado)
  // ==========================================================
  describe('enviarEnlaceRecuperacion', () => {
    let auth;

    beforeEach(() => {
      // ARRANGE: cliente de autenticación simulado.
      auth = {
        resetPasswordForEmail: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };
    });

    test('CP12 - redirectTo apunta a usuario/restablecerContrasena', async () => {
      // ACT: solicitar el enlace usando el generador de URL por defecto.
      const resultado = await enviarEnlaceRecuperacion(correoValido, auth);

      // ASSERT: createURL recibe la ruta correcta y Supabase usa esa URL.
      expect(RUTA_RESTABLECER_CONTRASENA).toBe('usuario/restablecerContrasena');
      expect(Linking.createURL).toHaveBeenCalledWith('usuario/restablecerContrasena');
      expect(construirUrlRecuperacion()).toBe(
        'exp://192.168.1.10:8081/--/usuario/restablecerContrasena'
      );
      expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(correoValido, {
        redirectTo: 'exp://192.168.1.10:8081/--/usuario/restablecerContrasena',
      });
      expect(resultado).toEqual({
        exito: true,
        mensaje: MENSAJE_SOLICITUD_RECUPERACION,
      });
    });

    test('CP13 - normaliza el correo antes de enviarlo', async () => {
      // ACT: solicitar con mayúsculas y espacios.
      await enviarEnlaceRecuperacion('  Asistente@Veterinaria.COM ', auth);

      // ASSERT: se envía en minúsculas y sin espacios.
      expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'asistente@veterinaria.com',
        expect.any(Object)
      );
    });

    test('CP14 - el mensaje es el mismo para un correo registrado y uno inexistente', async () => {
      // ARRANGE: Supabase responde sin error en ambos casos.
      // ACT: solicitar el enlace para dos correos distintos.
      const conCuenta = await enviarEnlaceRecuperacion(correoValido, auth);
      const sinCuenta = await enviarEnlaceRecuperacion(correoNoRegistrado, auth);

      // ASSERT: respuestas idénticas.
      expect(sinCuenta).toEqual(conCuenta);
      expect(sinCuenta.mensaje).toBe(MENSAJE_SOLICITUD_RECUPERACION);
    });

    test('CP15 - el límite de envíos de Supabase (429) no revela la cuenta', async () => {
      // ARRANGE: Supabase rechaza por límite de correos.
      auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: { status: 429, code: 'over_email_send_rate_limit' },
      });

      // ACT: solicitar el enlace.
      const resultado = await enviarEnlaceRecuperacion(correoValido, auth);

      // ASSERT: se muestra el mensaje neutro.
      expect(resultado).toEqual({
        exito: true,
        mensaje: MENSAJE_SOLICITUD_RECUPERACION,
      });
    });

    test('CP16 - informa un error genérico cuando Supabase falla', async () => {
      // ARRANGE: error de servidor.
      auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: { status: 500, message: 'Error interno' },
      });

      // ACT: solicitar el enlace.
      const resultado = await enviarEnlaceRecuperacion(correoValido, auth);

      // ASSERT: mensaje controlado sin detalles internos.
      expect(resultado.exito).toBe(false);
      expect(resultado.mensaje).toBe(
        'No se pudo enviar el enlace de recuperación. Intente nuevamente más tarde.'
      );
    });

    test('CP17 - no llama a Supabase con un correo de formato incorrecto', async () => {
      // ACT: solicitar con un correo inválido.
      const resultado = await enviarEnlaceRecuperacion('correo-sin-arroba', auth);

      // ASSERT: se rechaza sin llamar a Supabase.
      expect(resultado.exito).toBe(false);
      expect(resultado.mensaje).toBe('Ingrese un correo electrónico válido.');
      expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  // ==========================================================
  // Lectura del enlace recibido
  // ==========================================================
  describe('extraerParametrosEnlace', () => {
    test('CP18 - lee los tokens del fragmento (#access_token=...)', () => {
      // ARRANGE: enlace del flujo implícito.
      const url =
        'exp://192.168.1.10:8081/--/usuario/restablecerContrasena#access_token=AAA&refresh_token=BBB&type=recovery&expires_in=3600';

      // ACT: extraer los parámetros.
      const parametros = extraerParametrosEnlace(url);

      // ASSERT: tokens y tipo disponibles.
      expect(parametros.access_token).toBe('AAA');
      expect(parametros.refresh_token).toBe('BBB');
      expect(parametros.type).toBe('recovery');
    });

    test('CP19 - lee el código de la consulta (?code=...) de PKCE', () => {
      // ARRANGE: enlace con código PKCE.
      const url = 'https://petcare.app/usuario/restablecerContrasena?code=abc-123';

      // ACT: extraer los parámetros.
      const parametros = extraerParametrosEnlace(url);

      // ASSERT: código disponible.
      expect(parametros.code).toBe('abc-123');
    });

    test('CP20 - lee el error que Supabase agrega cuando el enlace venció', () => {
      // ARRANGE: redirección de Supabase con enlace vencido.
      const url =
        'https://petcare.app/usuario/restablecerContrasena#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';

      // ACT: extraer y comprobar los parámetros.
      const parametros = extraerParametrosEnlace(url);

      // ASSERT: el error se decodifica y la URL se considera con datos.
      expect(parametros.error_code).toBe('otp_expired');
      expect(parametros.error_description).toBe('Email link is invalid or has expired');
      expect(urlTieneDatosRecuperacion(url)).toBe(true);
    });

    test('CP21 - una URL sin parámetros no tiene datos de recuperación', () => {
      // ACT / ASSERT: URL simple, vacía y nula.
      expect(
        urlTieneDatosRecuperacion('https://petcare.app/usuario/restablecerContrasena')
      ).toBe(false);
      expect(urlTieneDatosRecuperacion('')).toBe(false);
      expect(urlTieneDatosRecuperacion(null)).toBe(false);
    });
  });

  describe('establecerSesionDesdeEnlace', () => {
    let auth;

    beforeEach(() => {
      // ARRANGE: cliente de autenticación simulado con sesión disponible.
      auth = {
        setSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
        exchangeCodeForSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
        verifyOtp: jest.fn().mockResolvedValue({ data: {}, error: null }),
        getSession: jest
          .fn()
          .mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null }),
      };
    });

    test('CP22 - con tokens en el fragmento usa setSession', async () => {
      // ARRANGE: enlace con tokens.
      const url =
        'https://petcare.app/usuario/restablecerContrasena#access_token=AAA&refresh_token=BBB&type=recovery';

      // ACT: procesar el enlace.
      const resultado = await establecerSesionDesdeEnlace(url, auth);

      // ASSERT: se establece la sesión con ambos tokens.
      expect(resultado.exito).toBe(true);
      expect(auth.setSession).toHaveBeenCalledWith({
        access_token: 'AAA',
        refresh_token: 'BBB',
      });
      expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
    });

    test('CP23 - con ?code= (PKCE) usa exchangeCodeForSession', async () => {
      // ARRANGE: enlace con código.
      const url = 'https://petcare.app/usuario/restablecerContrasena?code=abc-123';

      // ACT: procesar el enlace.
      const resultado = await establecerSesionDesdeEnlace(url, auth);

      // ASSERT: se intercambia el código por una sesión.
      expect(resultado.exito).toBe(true);
      expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('abc-123');
      expect(auth.setSession).not.toHaveBeenCalled();
    });

    test('CP24 - con ?token_hash= usa verifyOtp de tipo recovery', async () => {
      // ARRANGE: enlace de una plantilla de correo propia.
      const url =
        'https://petcare.app/usuario/restablecerContrasena?token_hash=hash123&type=recovery';

      // ACT: procesar el enlace.
      const resultado = await establecerSesionDesdeEnlace(url, auth);

      // ASSERT: se verifica el hash como recuperación.
      expect(resultado.exito).toBe(true);
      expect(auth.verifyOtp).toHaveBeenCalledWith({
        token_hash: 'hash123',
        type: 'recovery',
      });
    });

    test('CP25 - un enlace vencido (error=...) se rechaza sin llamar a Supabase', async () => {
      // ARRANGE: redirección con error otp_expired.
      const url =
        'https://petcare.app/usuario/restablecerContrasena#error=access_denied&error_code=otp_expired';

      // ACT: procesar el enlace.
      const resultado = await establecerSesionDesdeEnlace(url, auth);

      // ASSERT: mensaje de enlace expirado y ninguna llamada de sesión.
      expect(resultado.exito).toBe(false);
      expect(resultado.mensaje).toBe(MENSAJE_ENLACE_EXPIRADO);
      expect(auth.setSession).not.toHaveBeenCalled();
      expect(auth.exchangeCodeForSession).not.toHaveBeenCalled();
      expect(auth.verifyOtp).not.toHaveBeenCalled();
    });

    test('CP26 - rechaza enlaces que no son de recuperación', async () => {
      // ARRANGE: enlace de confirmación de registro.
      const url =
        'https://petcare.app/usuario/restablecerContrasena#access_token=AAA&refresh_token=BBB&type=signup';

      // ACT: procesar el enlace.
      const resultado = await establecerSesionDesdeEnlace(url, auth);

      // ASSERT: no se crea la sesión.
      expect(resultado.exito).toBe(false);
      expect(auth.setSession).not.toHaveBeenCalled();
    });

    test('CP27 - un enlace sin datos se considera inválido', async () => {
      // ACT: procesar una URL sin parámetros.
      const resultado = await establecerSesionDesdeEnlace(
        'https://petcare.app/usuario/restablecerContrasena',
        auth
      );

      // ASSERT: inválido y sin llamadas a Supabase.
      expect(resultado.exito).toBe(false);
      expect(resultado.mensaje).toBe(MENSAJE_ENLACE_EXPIRADO);
      expect(auth.setSession).not.toHaveBeenCalled();
    });

    test('CP28 - falla si Supabase rechaza el código', async () => {
      // ARRANGE: código ya usado o vencido.
      auth.exchangeCodeForSession.mockResolvedValue({
        data: null,
        error: { message: 'invalid grant' },
      });

      // ACT: procesar el enlace.
      const resultado = await establecerSesionDesdeEnlace(
        'https://petcare.app/usuario/restablecerContrasena?code=usado',
        auth
      );

      // ASSERT: enlace inválido.
      expect(resultado.exito).toBe(false);
      expect(resultado.mensaje).toBe(MENSAJE_ENLACE_EXPIRADO);
    });

    test('CP29 - falla si no existe sesión después de procesar el enlace', async () => {
      // ARRANGE: Supabase no deja una sesión activa.
      auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

      // ACT: procesar el enlace.
      const resultado = await establecerSesionDesdeEnlace(
        'https://petcare.app/usuario/restablecerContrasena?code=abc',
        auth
      );

      // ASSERT: enlace inválido.
      expect(resultado.exito).toBe(false);
    });

    test('CP30 - controla excepciones inesperadas', async () => {
      // ARRANGE: fallo de red.
      auth.setSession.mockRejectedValue(new Error('network'));

      // ACT: procesar el enlace con tokens.
      const resultado = await establecerSesionDesdeEnlace(
        'https://petcare.app/usuario/restablecerContrasena#access_token=A&refresh_token=B',
        auth
      );

      // ASSERT: resultado controlado.
      expect(resultado.exito).toBe(false);
      expect(resultado.mensaje).toBe(MENSAJE_ENLACE_EXPIRADO);
    });
  });

  // ==========================================================
  // Cambio de contraseña y cierre de la sesión de recuperación
  // ==========================================================
  describe('actualizarContrasenaRecuperada', () => {
    let auth;

    beforeEach(() => {
      // ARRANGE: sesión de recuperación disponible.
      auth = {
        getSession: jest
          .fn()
          .mockResolvedValue({ data: { session: { user: { id: 'u1' } } }, error: null }),
        updateUser: jest.fn().mockResolvedValue({ data: {}, error: null }),
      };
    });

    test('CP31 - actualiza la contraseña con una sesión válida', async () => {
      // ACT: cambiar la contraseña.
      const resultado = await actualizarContrasenaRecuperada(contrasenaNueva, auth);

      // ASSERT: se llama a updateUser y se confirma el cambio.
      expect(auth.updateUser).toHaveBeenCalledWith({ password: contrasenaNueva });
      expect(resultado).toEqual({
        exito: true,
        mensaje: 'La contraseña se actualizó correctamente.',
      });
    });

    test('CP32 - sin sesión de recuperación no actualiza y pide un enlace nuevo', async () => {
      // ARRANGE: la sesión venció.
      auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

      // ACT: intentar cambiar la contraseña.
      const resultado = await actualizarContrasenaRecuperada(contrasenaNueva, auth);

      // ASSERT: no se actualiza y se indica el enlace vencido.
      expect(resultado.exito).toBe(false);
      expect(resultado.motivo).toBe('enlace-vencido');
      expect(resultado.mensaje).toBe(MENSAJE_ENLACE_EXPIRADO);
      expect(auth.updateUser).not.toHaveBeenCalled();
    });

    test('CP33 - no llama a Supabase con una contraseña que incumple los requisitos', async () => {
      // ACT: contraseña corta y contraseña sin número.
      const corta = await actualizarContrasenaRecuperada('Ab1', auth);
      const sinNumero = await actualizarContrasenaRecuperada('Nueva@Clave', auth);

      // ASSERT: ambas se rechazan antes de consultar la sesión.
      expect(corta.exito).toBe(false);
      expect(corta.mensaje).toBe('La contraseña debe tener mínimo 8 caracteres.');
      expect(sinNumero.exito).toBe(false);
      expect(sinNumero.mensaje).toBe(
        'La contraseña debe incluir al menos una mayúscula, una minúscula y un número.'
      );
      expect(auth.getSession).not.toHaveBeenCalled();
      expect(auth.updateUser).not.toHaveBeenCalled();
    });

    test('CP34 - informa cuando la contraseña nueva es igual a la anterior', async () => {
      // ARRANGE: Supabase rechaza la contraseña repetida.
      auth.updateUser.mockResolvedValue({
        data: null,
        error: { code: 'same_password', message: 'same' },
      });

      // ACT: cambiar la contraseña.
      const resultado = await actualizarContrasenaRecuperada(contrasenaNueva, auth);

      // ASSERT: mensaje específico.
      expect(resultado.exito).toBe(false);
      expect(resultado.motivo).toBe('misma-contrasena');
      expect(resultado.mensaje).toBe(
        'La nueva contraseña debe ser diferente a la anterior.'
      );
    });

    test('CP35 - informa un error genérico si Supabase rechaza la actualización', async () => {
      // ARRANGE: error del servidor.
      auth.updateUser.mockResolvedValue({
        data: null,
        error: { status: 500, message: 'fallo' },
      });

      // ACT: cambiar la contraseña.
      const resultado = await actualizarContrasenaRecuperada(contrasenaNueva, auth);

      // ASSERT: mensaje controlado.
      expect(resultado.exito).toBe(false);
      expect(resultado.mensaje).toBe(
        'No se pudo actualizar la contraseña. Intente nuevamente.'
      );
    });
  });

  describe('cerrarSesionRecuperacion', () => {
    test('CP36 - cierra la sesión con el alcance indicado', async () => {
      // ARRANGE: cliente simulado.
      const auth = { signOut: jest.fn().mockResolvedValue({ error: null }) };

      // ACT: cerrar la sesión de recuperación.
      const cerrada = await cerrarSesionRecuperacion(auth, 'global');

      // ASSERT: se usa el alcance global.
      expect(cerrada).toBe(true);
      expect(auth.signOut).toHaveBeenCalledTimes(1);
      expect(auth.signOut).toHaveBeenCalledWith({ scope: 'global' });
    });

    test('CP37 - por defecto cierra solo la sesión local', async () => {
      // ARRANGE: cliente simulado.
      const auth = { signOut: jest.fn().mockResolvedValue({ error: null }) };

      // ACT: cerrar sin indicar alcance.
      await cerrarSesionRecuperacion(auth);

      // ASSERT: alcance local.
      expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
    });

    test('CP38 - si el cierre global falla, cierra al menos la sesión local', async () => {
      // ARRANGE: el primer intento falla y el segundo funciona.
      const auth = {
        signOut: jest
          .fn()
          .mockResolvedValueOnce({ error: { message: 'fallo' } })
          .mockResolvedValueOnce({ error: null }),
      };

      // ACT: cerrar con alcance global.
      const cerrada = await cerrarSesionRecuperacion(auth, 'global');

      // ASSERT: reintento local.
      expect(cerrada).toBe(true);
      expect(auth.signOut).toHaveBeenNthCalledWith(1, { scope: 'global' });
      expect(auth.signOut).toHaveBeenNthCalledWith(2, { scope: 'local' });
    });
  });
});