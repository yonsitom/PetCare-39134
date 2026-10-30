
/*
 * RF01 — CUS01: Inicio de sesión.
 *
 * CONTROLADOR MVC:
 * - Valida los datos ingresados por el usuario.
 * - Coordina la autenticación y la verificación del perfil.
 * - Clasifica los errores y devuelve resultados a la interfaz.

 * SOLID:
 * - Responsabilidad única: coordinar el caso de uso de inicio
 *   de sesión.
 * - Inversión de dependencias: recibe los servicios mediante
 *   parámetros, sin depender directamente de Supabase.
 *
 * TDD:
 * - E2: campos incompletos.
 * - E3: formato de correo inválido.
 * - E4: credenciales incorrectas.
 * - E5: error de conexión.
 * - E6: demasiados intentos fallidos.
 *
 * SEGURIDAD:
 * El contador es local a esta instancia del controlador.
 * No sustituye un bloqueo de seguridad en el servidor.
 */
import { logger } from '../../utils/logger';

export const MENSAJES_INICIO_SESION = Object.freeze({
  CAMPOS_INCOMPLETOS:
    'Complete los campos obligatorios.',

  CORREO_INVALIDO:
    'Ingrese un formato de correo electrónico válido',

  CREDENCIALES_INCORRECTAS:
    'Error. Ingresar nuevamente las credenciales',

ERROR_CONEXION:
  'No se pudo conectar con el servicio. Intente nuevamente.',

  DEMASIADOS_INTENTOS:
  'Demasiados intentos. Intente nuevamente más tarde.',

  ERROR_GENERAL:
    'No se pudo iniciar sesión. Inténtelo nuevamente.',

  CUENTA_NO_AUTORIZADA:
    'La cuenta no está autorizada para ingresar.',

  USUARIO_NO_RECIBIDO:
    'No se pudo iniciar sesión. Inténtelo nuevamente.',

  INICIO_EXITOSO:
    'Inicio de sesión exitoso.',
});

const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function crearResultado({
  mensaje,
  tipoMensaje = 'error',
  autenticado = false,
  redirigir = false,
  intentosFallidos = 0,
}) {
  return {
    mensaje,
    tipoMensaje,
    autenticado,
    redirigir,
    intentosFallidos,
  };
}

function obtenerTextoError(error) {
  return [
    error?.message,
    error?.code,
    error?.name,
    error?.status,
  ]
    .filter((valor) => valor !== undefined && valor !== null)
    .join(' ')
    .toLowerCase();
}

function esErrorDeLimite(error, texto) {
  return (
    error?.status === 429 ||
    texto.includes('too many requests') ||
    texto.includes('rate limit') ||
    texto.includes('over_request_rate_limit')
  );
}

function esErrorDeCredenciales(texto) {
  return (
    texto.includes('invalid login credentials') ||
    texto.includes('invalid_credentials') ||
    texto.includes('invalid_grant')
  );
}

function esErrorDeConexion(error, texto) {
  return (
    error?.name === 'AbortError' ||
    error?.name === 'NetworkError' ||
    error?.name === 'TypeError' ||
    error?.status === 0 ||
    texto.includes('network request failed') ||
    texto.includes('failed to fetch') ||
    texto.includes('fetch failed') ||
    texto.includes('networkerror') ||
    texto.includes('network error') ||
    texto.includes('connection') ||
    texto.includes('timeout') ||
    texto.includes('timed out') ||
    texto.includes('load failed') ||
    texto.includes('internet')
  );
}

export function crearControladorInicioSesion({
  autenticar,
  verificarCuentaActiva,
  cerrarSesion = async () => {},
  limiteIntentos = 5,
  intentosFallidosIniciales = 0,
}) {
  if (typeof autenticar !== 'function') {
    throw new Error(
      'Debe proporcionarse la función de autenticación.'
    );
  }

  if (typeof verificarCuentaActiva !== 'function') {
    throw new Error(
      'Debe proporcionarse la función de verificación de cuenta.'
    );
  }

  if (!Number.isInteger(limiteIntentos) || limiteIntentos < 1) {
    throw new Error(
      'El límite de intentos debe ser un entero positivo.'
    );
  }

  if (
    !Number.isInteger(intentosFallidosIniciales) ||
    intentosFallidosIniciales < 0
  ) {
    throw new Error(
      'Los intentos iniciales deben ser un entero no negativo.'
    );
  }

  let intentosFallidos = Math.min(
    intentosFallidosIniciales,
    limiteIntentos
  );

  async function iniciarSesion(
    correoIngresado,
    contrasenaIngresada
  ) {
    const correo =
      typeof correoIngresado === 'string'
        ? correoIngresado.trim()
        : '';

    const contrasena =
      typeof contrasenaIngresada === 'string'
        ? contrasenaIngresada
        : '';

    // E6: impedir solicitudes adicionales al alcanzar el límite.
    if (intentosFallidos >= limiteIntentos) {
      return crearResultado({
        mensaje: MENSAJES_INICIO_SESION.DEMASIADOS_INTENTOS,
        tipoMensaje: 'advertencia',
        intentosFallidos,
      });
    }

    // E2: validar campos obligatorios.
    if (!correo || !contrasena.trim()) {
      return crearResultado({
        mensaje: MENSAJES_INICIO_SESION.CAMPOS_INCOMPLETOS,
        tipoMensaje: 'advertencia',
        intentosFallidos,
      });
    }

    // E3: validar el formato del correo antes de autenticar.
    if (!FORMATO_CORREO.test(correo)) {
      return crearResultado({
        mensaje: MENSAJES_INICIO_SESION.CORREO_INVALIDO,
        tipoMensaje: 'advertencia',
        intentosFallidos,
      });
    }

    let sesionIniciada = false;

    try {
      // CP01 / E4 / E5: autenticación mediante servicio inyectado.
      const usuario = await autenticar(correo, contrasena);

      if (!usuario?.id) {
        return crearResultado({
          mensaje: MENSAJES_INICIO_SESION.USUARIO_NO_RECIBIDO,
          tipoMensaje: 'error',
          intentosFallidos,
        });
      }

      sesionIniciada = true;

      // Verificar que el perfil pueda acceder al sistema.
      const perfil = await verificarCuentaActiva(usuario.id);

      if (!perfil?.autorizada) {
        try {
          await cerrarSesion();
        } catch (errorCierre) {
          logger.error(
            'RF01 — No se pudo cerrar la sesión no autorizada:',
            errorCierre?.message || errorCierre
          );
        }

        sesionIniciada = false;

        return crearResultado({
          mensaje:
            perfil?.mensaje ||
            MENSAJES_INICIO_SESION.CUENTA_NO_AUTORIZADA,
          tipoMensaje: 'error',
          intentosFallidos,
        });
      }

      // CP01: inicio de sesión satisfactorio.
      intentosFallidos = 0;

      return crearResultado({
        mensaje: MENSAJES_INICIO_SESION.INICIO_EXITOSO,
        tipoMensaje: 'exito',
        autenticado: true,
        redirigir: true,
        intentosFallidos,
      });
    } catch (error) {
      // Cerrar la sesión si la autenticación funcionó pero falló
      // una operación posterior.
      if (sesionIniciada) {
        try {
          await cerrarSesion();
        } catch (errorCierre) {
          logger.error(
            'RF01 — Error al cerrar la sesión incompleta:',
            errorCierre?.message || errorCierre
          );
        }
      }

      const textoError = obtenerTextoError(error);

      // E5: límite de solicitudes del proveedor.
      if (esErrorDeLimite(error, textoError)) {
        return crearResultado({
          mensaje: MENSAJES_INICIO_SESION.DEMASIADOS_INTENTOS,
          tipoMensaje: 'advertencia',
          intentosFallidos,
        });
      }

      // E5: problemas de conexión.
      if (esErrorDeConexion(error, textoError)) {
        return crearResultado({
          mensaje: MENSAJES_INICIO_SESION.ERROR_CONEXION,
          tipoMensaje: 'error',
          intentosFallidos,
        });
      }

      // E4: incrementar solo ante errores reconocidos
      // explícitamente como credenciales incorrectas.
      if (esErrorDeCredenciales(textoError)) {
        intentosFallidos = Math.min(
          intentosFallidos + 1,
          limiteIntentos
        );

        if (intentosFallidos >= limiteIntentos) {
          return crearResultado({
            mensaje: MENSAJES_INICIO_SESION.DEMASIADOS_INTENTOS,
            tipoMensaje: 'advertencia',
            intentosFallidos,
          });
        }

        return crearResultado({
          mensaje:
            MENSAJES_INICIO_SESION.CREDENCIALES_INCORRECTAS,
          tipoMensaje: 'error',
          intentosFallidos,
        });
      }

      // No exponer detalles internos del proveedor de autenticación.
      return crearResultado({
        mensaje: MENSAJES_INICIO_SESION.ERROR_GENERAL,
        tipoMensaje: 'error',
        intentosFallidos,
      });
    }
  }

  return {
    iniciarSesion,

    consultarIntentosFallidos() {
      return intentosFallidos;
    },

    reiniciarIntentosFallidos() {
      intentosFallidos = 0;
    },
  };
}
