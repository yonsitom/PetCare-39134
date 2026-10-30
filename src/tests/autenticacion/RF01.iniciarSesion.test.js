
import { crearControladorInicioSesion } from '../../controllers/autenticacion/iniciarSesionControlador';

describe('RF01 - Iniciar sesion con correo electrÃ³nico y contraseÃ±a', () => {
  let autenticar;
  let verificarCuentaActiva;
  let cerrarSesion;
  let controlador;

  const correoValido = 'asistente@veterinaria.com';
  const contrasenaCorrecta = 'Vet@2026';

  beforeEach(() => {
    // ARRANGE: preparar dependencias simuladas.
    autenticar = jest.fn();
    verificarCuentaActiva = jest.fn();
    cerrarSesion = jest.fn().mockResolvedValue(undefined);

    controlador = crearControladorInicioSesion({
      autenticar,
      verificarCuentaActiva,
      cerrarSesion,
      limiteIntentos: 5,
      intentosFallidosIniciales: 0,
    });
  });

  test('CP01 - autentica credenciales vÃ¡lidas y permite ir al panel principal', async () => {
    // ARRANGE
    const usuario = {
      id: 'usuario-001',
      email: correoValido,
    };

    autenticar.mockResolvedValue(usuario);
    verificarCuentaActiva.mockResolvedValue({
      autorizada: true,
      mensaje: '',
      perfil: {
        estado_cuenta: 'Activo',
      },
    });

    // ACT
    const resultado = await controlador.iniciarSesion(
      correoValido,
      contrasenaCorrecta
    );

    // ASSERT
    expect(autenticar).toHaveBeenCalledWith(
      correoValido,
      contrasenaCorrecta
    );
    expect(verificarCuentaActiva).toHaveBeenCalledWith(
      usuario.id
    );
    expect(resultado.autenticado).toBe(true);
    expect(resultado.redirigir).toBe(true);
    expect(resultado.mensaje).toBe('Inicio de sesión exitoso.');
    expect(resultado.intentosFallidos).toBe(0);
    expect(cerrarSesion).not.toHaveBeenCalled();
  });

  test('CP02 - rechaza campos incompletos sin autenticar', async () => {
    // ARRANGE
    const correo = '';
    const contrasena = contrasenaCorrecta;

    // ACT
    const resultado = await controlador.iniciarSesion(
      correo,
      contrasena
    );

    // ASSERT
    expect(resultado.mensaje).toBe(
      'Complete los campos obligatorios.'
    );
    expect(resultado.autenticado).toBe(false);
    expect(resultado.intentosFallidos).toBe(0);
    expect(autenticar).not.toHaveBeenCalled();
  });

  test('CP03 - rechaza un correo invalido sin autenticar', async () => {
    // ARRANGE
    const correo = 'asistente@veterinaria';
    const contrasena = contrasenaCorrecta;

    // ACT
    const resultado = await controlador.iniciarSesion(
      correo,
      contrasena
    );

    // ASSERT
    expect(resultado.mensaje).toBe(
      'Ingrese un formato de correo electrónico válido'
    );
    expect(resultado.autenticado).toBe(false);
    expect(resultado.intentosFallidos).toBe(0);
    expect(autenticar).not.toHaveBeenCalled();
  });

  test('CP04 - credenciales incorrectas incrementan el contador de 0 a 1', async () => {
    // ARRANGE
    autenticar.mockRejectedValue(
      new Error('Invalid login credentials')
    );

    // ACT
    const resultado = await controlador.iniciarSesion(
      correoValido,
      'Incorrecta123'
    );

    // ASSERT
    expect(resultado.mensaje).toBe(
      'Error. Ingresar nuevamente las credenciales'
    );
    expect(resultado.autenticado).toBe(false);
    expect(resultado.intentosFallidos).toBe(1);
    expect(verificarCuentaActiva).not.toHaveBeenCalled();
    expect(cerrarSesion).not.toHaveBeenCalled();
  });

  test('CP05 - un error de conexiÃ³n no autentica ni cuenta como contraseÃ±a incorrecta', async () => {
    // ARRANGE
    autenticar.mockRejectedValue(
      new Error('Network request failed')
    );

    // ACT
    const resultado = await controlador.iniciarSesion(
      correoValido,
      contrasenaCorrecta
    );

    // ASSERT
    expect(resultado.mensaje).toBe(
      'No se pudo conectar con el servicio. Intente nuevamente.'
    );
    expect(resultado.autenticado).toBe(false);
    expect(resultado.intentosFallidos).toBe(0);
    expect(verificarCuentaActiva).not.toHaveBeenCalled();
  });

  test('CP06 - bloquea nuevos intentos cuando el contador ya llegÃ³ a cinco', async () => {
    // ARRANGE
    controlador = crearControladorInicioSesion({
      autenticar,
      verificarCuentaActiva,
      cerrarSesion,
      limiteIntentos: 5,
      intentosFallidosIniciales: 5,
    });

    // ACT
    const resultado = await controlador.iniciarSesion(
      correoValido,
      'Incorrecta123'
    );

    // ASSERT
    expect(resultado.mensaje).toBe(
      'Demasiados intentos. Intente nuevamente más tarde.'
    );
    expect(resultado.autenticado).toBe(false);
    expect(resultado.intentosFallidos).toBe(5);
    expect(autenticar).not.toHaveBeenCalled();
    expect(verificarCuentaActiva).not.toHaveBeenCalled();
  });
});

