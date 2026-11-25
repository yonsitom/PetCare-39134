/**
 * RF03 - Servicio de recuperación de contraseña.
 *
 * Responsabilidades:
 * - Validar el formato del correo electrónico.
 * - Validar los requisitos de la contraseña nueva.
 * - Solicitar enlaces de recuperación mediante Supabase Auth
 *   sin revelar si la cuenta existe.
 * - Convertir el enlace recibido (fragmento #access_token, ?code= de PKCE
 *   o ?token_hash=) en una sesión de recuperación.
 * - Actualizar la contraseña y cerrar la sesión de recuperación.
 *
 * Arquitectura:
 * - Servicio: concentra la lógica de negocio del RF03.
 * - DAO/servicio externo: Supabase Auth administra la autenticación.
 * - TDD: las dependencias se inyectan para poder probar la lógica aislada.
 */

import * as Linking from 'expo-linking';
import { supabase } from '../supabase';

// ============================================================
// RF03 - CONSTANTES Y MENSAJES
// ============================================================

// Ruta (relativa a app/) de la pantalla que recibe el enlace del correo.
// app/usuario/restablecerContrasena.jsx => /usuario/restablecerContrasena
export const RUTA_RESTABLECER_CONTRASENA = 'usuario/restablecerContrasena';

// RF03: mensaje único al pedir el enlace. Es el mismo exista o no la cuenta
// para no permitir descubrir qué correos están registrados.
export const MENSAJE_SOLICITUD_RECUPERACION =
  'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada y la carpeta de spam.';

export const MENSAJE_ERROR_ENVIO =
  'No se pudo enviar el enlace de recuperación. Intente nuevamente más tarde.';

export const MENSAJE_LIMITE_SOLICITUDES =
  'Ha excedido el límite de solicitudes. Intente nuevamente más tarde.';

export const MENSAJE_ENLACE_EXPIRADO =
  'El enlace de recuperación ha expirado. Solicite un nuevo enlace.';

export const MENSAJE_REQUISITOS_CONTRASENA =
  'La contraseña debe incluir al menos una mayúscula, una minúscula y un número.';

export const MENSAJE_ERROR_ACTUALIZACION =
  'No se pudo actualizar la contraseña. Intente nuevamente.';

// ============================================================
// RF03 - VALIDACIONES
// ============================================================

/**
 * RF03: valida el formato básico del correo electrónico.
 *
 * @param {string} correo
 * @returns {boolean}
 */
export function correoTieneFormatoValido(correo) {
  // ARRANGE: normalizar el valor ingresado.
  const valor = String(correo || '').trim();

  // ACT / ASSERT: comprobar el formato básico del correo.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

/**
 * RF03: verifica los requisitos mínimos de la contraseña.
 *
 * Requisitos:
 * - Mínimo 8 caracteres.
 * - Al menos una mayúscula.
 * - Al menos una minúscula.
 * - Al menos un número.
 *
 * @param {string} contrasena
 * @returns {boolean}
 */
export function contrasenaCumpleRequisitos(contrasena) {
  // ARRANGE: convertir el valor ingresado a texto.
  const valor = String(contrasena || '');

  // ACT / ASSERT: comprobar todos los requisitos.
  return (
    valor.length >= 8 &&
    /[A-Z]/.test(valor) &&
    /[a-z]/.test(valor) &&
    /\d/.test(valor)
  );
}

/**
 * RF03: valida la contraseña nueva y su confirmación, devolviendo
 * un mensaje distinto para cada tipo de error.
 *
 * @param {string} contrasena
 * @param {string} confirmacion
 * @returns {{valida: boolean, mensaje: string}}
 */
export function validarContrasenaNueva(contrasena, confirmacion) {
  // ARRANGE: convertir ambos valores a texto.
  const valor = String(contrasena || '');
  const repeticion = String(confirmacion || '');

  // ASSERT: ambos campos son obligatorios.
  if (!valor || !repeticion) {
    return {
      valida: false,
      mensaje: 'Ingrese y confirme la nueva contraseña.',
    };
  }

  // ASSERT: longitud mínima.
  if (valor.length < 8) {
    return {
      valida: false,
      mensaje: 'La contraseña debe tener mínimo 8 caracteres.',
    };
  }

  // ASSERT: mayúscula, minúscula y número.
  if (!contrasenaCumpleRequisitos(valor)) {
    return { valida: false, mensaje: MENSAJE_REQUISITOS_CONTRASENA };
  }

  // ASSERT: ambas contraseñas deben coincidir.
  if (valor !== repeticion) {
    return { valida: false, mensaje: 'Las contraseñas no coinciden.' };
  }

  return { valida: true, mensaje: '' };
}

// ============================================================
// RF03 - SERVICIO AISLADO PARA PRUEBAS TDD
// ============================================================

/**
 * Crea un servicio independiente de Supabase para pruebas unitarias.
 *
 * Las dependencias se inyectan desde fuera para que las pruebas
 * puedan simular respuestas exitosas y fallos.
 *
 * @param {Object} dependencias
 * @returns {Object}
 */
export function crearRecuperacionContrasenaServicio({
  enviarEnlace,
  verificarEnlace,
  establecerContrasena,
  contarSolicitudes,
  correoRegistrado,
  limiteSolicitudes = 3,
}) {
  // RF03: solicitar el envío de un enlace de recuperación.
  async function solicitarEnlace(correo) {
    // ARRANGE: normalizar el correo.
    const correoNormalizado = String(correo || '')
      .trim()
      .toLowerCase();

    // ASSERT: rechazar correos con formato incorrecto.
    if (!correoTieneFormatoValido(correoNormalizado)) {
      return {
        exito: false,
        mensaje: 'Ingrese un correo electrónico válido.',
      };
    }

    try {
      // ACT: consultar el número de solicitudes anteriores.
      // El conteo no depende de que la cuenta exista.
      const solicitudes = await contarSolicitudes(correoNormalizado);

      // ASSERT: detener el proceso si se alcanzó el límite.
      if (solicitudes >= limiteSolicitudes) {
        return { exito: false, mensaje: MENSAJE_LIMITE_SOLICITUDES };
      }

      // ACT: comprobar la existencia de la cuenta.
      const existe = await correoRegistrado(correoNormalizado);

      // Seguridad: solo se envía el enlace si la cuenta existe,
      // pero la respuesta es idéntica en ambos casos.
      if (existe) {
        await enviarEnlace(correoNormalizado);
      }

      // ASSERT: mismo mensaje exista o no la cuenta.
      return { exito: true, mensaje: MENSAJE_SOLICITUD_RECUPERACION };
    } catch (error) {
      // ASSERT: devolver un mensaje controlado ante fallos.
      if (__DEV__) {
        console.error('RF03 - Error controlado al solicitar la recuperación.');
      }

      return { exito: false, mensaje: MENSAJE_ERROR_ENVIO };
    }
  }

  // RF03: comprobar la validez del enlace de recuperación.
  async function validarEnlace(token) {
    // ASSERT: rechazar la ausencia de token.
    if (!token) {
      return { exito: false, mensaje: MENSAJE_ENLACE_EXPIRADO };
    }

    try {
      // ACT: verificar el token mediante la dependencia inyectada.
      const valido = await verificarEnlace(token);

      // ASSERT: impedir continuar con un token inválido.
      if (!valido) {
        return { exito: false, mensaje: MENSAJE_ENLACE_EXPIRADO };
      }

      // ASSERT: permitir continuar cuando el enlace es válido.
      return { exito: true, mensaje: '' };
    } catch (error) {
      // ASSERT: no permitir el cambio si falla la verificación.
      if (__DEV__) {
        console.error('RF03 - Error controlado al verificar el enlace.');
      }

      return { exito: false, mensaje: MENSAJE_ENLACE_EXPIRADO };
    }
  }

  // RF03: cambiar la contraseña después de verificar el enlace.
  async function cambiarContrasena(token, nuevaContrasena) {
    // ASSERT: validar los requisitos de la contraseña.
    if (!contrasenaCumpleRequisitos(nuevaContrasena)) {
      return {
        exito: false,
        mensaje:
          'La contraseña debe tener mínimo 8 caracteres, incluyendo una mayúscula, una minúscula y un número.',
      };
    }

    // ACT: verificar el enlace antes de cambiar la contraseña.
    const resultadoEnlace = await validarEnlace(token);

    // ASSERT: detener el proceso si el enlace no es válido.
    if (!resultadoEnlace.exito) {
      return resultadoEnlace;
    }

    try {
      // ACT: actualizar la contraseña mediante la dependencia.
      await establecerContrasena(nuevaContrasena);

      // ASSERT: confirmar el cambio.
      return {
        exito: true,
        mensaje: 'La contraseña se actualizó correctamente.',
      };
    } catch (error) {
      // ASSERT: devolver un mensaje controlado.
      if (__DEV__) {
        console.error('RF03 - Error controlado al actualizar la contraseña.');
      }

      return { exito: false, mensaje: MENSAJE_ERROR_ACTUALIZACION };
    }
  }

  // Exponer las operaciones para las pruebas unitarias.
  return {
    solicitarEnlace,
    validarEnlace,
    cambiarContrasena,
  };
}

// ============================================================
// RF03 - IMPLEMENTACIÓN REAL CON SUPABASE AUTH
// ============================================================

/**
 * Construye la URL a la que Supabase redirige desde el correo.
 *
 * - Expo Go:        exp://192.168.x.x:8081/--/usuario/restablecerContrasena
 * - App compilada:  petcare://usuario/restablecerContrasena (requiere "scheme")
 * - Web:            https://<dominio>/usuario/restablecerContrasena
 *
 * @returns {string}
 */
export function construirUrlRecuperacion() {
  return Linking.createURL(RUTA_RESTABLECER_CONTRASENA);
}

/**
 * Envía el enlace de recuperación mediante Supabase Auth.
 *
 * Seguridad: el resultado es el mismo exista o no el correo.
 * Supabase tampoco informa si la cuenta existe.
 *
 * Nota: la URL de redirección debe estar en Authentication >
 * URL Configuration > Redirect URLs del panel de Supabase.
 *
 * @param {string} correo
 * @param {Object} [auth] Cliente de autenticación (inyectable en pruebas).
 * @param {Function} [crearUrl] Generador de la URL de retorno.
 * @returns {Promise<{exito: boolean, mensaje: string}>}
 */
export async function enviarEnlaceRecuperacion(
  correo,
  auth = supabase.auth,
  crearUrl = construirUrlRecuperacion
) {
  // ARRANGE: normalizar el correo.
  const correoNormalizado = String(correo || '')
    .trim()
    .toLowerCase();

  // ASSERT: validar el formato antes de llamar a Supabase.
  if (!correoTieneFormatoValido(correoNormalizado)) {
    return {
      exito: false,
      mensaje: 'Ingrese un correo electrónico válido.',
    };
  }

  try {
    // ACT: solicitar a Supabase el envío del enlace.
    const { error } = await auth.resetPasswordForEmail(correoNormalizado, {
      redirectTo: crearUrl(),
    });

    if (error) {
      // Supabase limita los envíos por usuario (429). Responder igual
      // que en un envío normal evita revelar qué cuentas existen.
      if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
        return { exito: true, mensaje: MENSAJE_SOLICITUD_RECUPERACION };
      }

      if (__DEV__) {
        console.error('RF03 - Supabase no pudo enviar el enlace de recuperación.');
      }

      return { exito: false, mensaje: MENSAJE_ERROR_ENVIO };
    }

    // ASSERT: mismo mensaje exista o no la cuenta.
    return { exito: true, mensaje: MENSAJE_SOLICITUD_RECUPERACION };
  } catch (error) {
    // ASSERT: controlar errores inesperados sin exponer detalles internos.
    if (__DEV__) {
      console.error('RF03 - Ocurrió un error controlado al solicitar la recuperación.');
    }

    return { exito: false, mensaje: MENSAJE_ERROR_ENVIO };
  }
}

// ============================================================
// RF03 - PROCESAMIENTO DEL ENLACE RECIBIDO
// ============================================================

/**
 * Extrae los parámetros de una URL, tanto de la consulta (?code=...)
 * como del fragmento (#access_token=...&refresh_token=...).
 *
 * @param {string} url
 * @returns {Object}
 */
export function extraerParametrosEnlace(url) {
  // ARRANGE: separar la consulta y el fragmento de la URL.
  const partes = String(url || '').split('#');
  const urlAntesDelFragmento = partes[0] || '';
  const fragmento = partes.slice(1).join('#');

  const consulta = urlAntesDelFragmento.includes('?')
    ? urlAntesDelFragmento.split('?').slice(1).join('?')
    : '';

  // ACT: convertir los parámetros en un objeto sencillo.
  const parametros = {};

  const leerParametros = (texto) => {
    texto.split('&').forEach((elemento) => {
      if (!elemento) return;

      const [clave, ...resto] = elemento.split('=');

      try {
        parametros[decodeURIComponent(clave)] = decodeURIComponent(
          resto.join('=').replace(/\+/g, ' ')
        );
      } catch (error) {
        // Ignorar parámetros mal codificados.
      }
    });
  };

  leerParametros(consulta);
  leerParametros(fragmento);

  // ASSERT: devolver los parámetros encontrados.
  return parametros;
}

/**
 * Indica si una URL trae datos de recuperación (o un error de Supabase).
 *
 * @param {string} url
 * @returns {boolean}
 */
export function urlTieneDatosRecuperacion(url) {
  const p = extraerParametrosEnlace(url);

  return Boolean(
    p.code ||
      p.token_hash ||
      p.access_token ||
      p.refresh_token ||
      p.error ||
      p.error_code
  );
}

/**
 * Convierte el enlace del correo en una sesión de recuperación.
 *
 * Soporta:
 * - #access_token=...&refresh_token=...  (flujo implícito) -> setSession
 * - ?code=...                            (PKCE)            -> exchangeCodeForSession
 * - ?token_hash=...&type=recovery        (plantilla propia) -> verifyOtp
 *
 * @param {string} url
 * @param {Object} [auth] Cliente de autenticación (inyectable en pruebas).
 * @returns {Promise<{exito: boolean, motivo?: string, mensaje: string}>}
 */
export async function establecerSesionDesdeEnlace(url, auth = supabase.auth) {
  const fallo = (motivo) => ({
    exito: false,
    motivo,
    mensaje: MENSAJE_ENLACE_EXPIRADO,
  });

  // ARRANGE: leer los parámetros del enlace.
  const parametros = extraerParametrosEnlace(url);

  // ASSERT: Supabase redirige con error=... cuando el enlace venció.
  if (parametros.error || parametros.error_code) {
    return fallo('enlace-vencido');
  }

  // ASSERT: aceptar solo enlaces de recuperación.
  if (parametros.type && parametros.type !== 'recovery') {
    return fallo('tipo-invalido');
  }

  try {
    let resultado;

    // ACT: establecer la sesión según el formato del enlace.
    if (parametros.code) {
      resultado = await auth.exchangeCodeForSession(parametros.code);
    } else if (parametros.token_hash) {
      resultado = await auth.verifyOtp({
        token_hash: parametros.token_hash,
        type: 'recovery',
      });
    } else if (parametros.access_token && parametros.refresh_token) {
      resultado = await auth.setSession({
        access_token: parametros.access_token,
        refresh_token: parametros.refresh_token,
      });
    } else {
      return fallo('sin-datos');
    }

    // ASSERT: Supabase rechazó el código o los tokens.
    if (resultado?.error) {
      return fallo('rechazado');
    }

    // ASSERT: debe existir una sesión después de procesar el enlace.
    const { data, error } = await auth.getSession();

    if (error || !data?.session) {
      return fallo('sin-sesion');
    }

    return { exito: true, mensaje: '' };
  } catch (error) {
    if (__DEV__) {
      console.error('RF03 - Error controlado al procesar el enlace.');
    }

    return fallo('error');
  }
}

// ============================================================
// RF03 - CAMBIO DE CONTRASEÑA Y CIERRE DE LA SESIÓN DE RECUPERACIÓN
// ============================================================

/**
 * Actualiza la contraseña del usuario autenticado en el flujo
 * de recuperación.
 *
 * Supabase debe tener una sesión válida establecida por el proceso
 * de recuperación antes de ejecutar esta operación.
 *
 * @param {string} nuevaContrasena
 * @param {Object} [auth] Cliente de autenticación (inyectable en pruebas).
 * @returns {Promise<{exito: boolean, motivo?: string, mensaje: string}>}
 */
export async function actualizarContrasenaRecuperada(
  nuevaContrasena,
  auth = supabase.auth
) {
  // ARRANGE: validar los requisitos de la nueva contraseña.
  const valor = String(nuevaContrasena || '');

  if (valor.length < 8) {
    return {
      exito: false,
      motivo: 'requisitos',
      mensaje: 'La contraseña debe tener mínimo 8 caracteres.',
    };
  }

  if (!contrasenaCumpleRequisitos(valor)) {
    return {
      exito: false,
      motivo: 'requisitos',
      mensaje: MENSAJE_REQUISITOS_CONTRASENA,
    };
  }

  try {
    // ARRANGE: comprobar que Supabase tenga una sesión válida.
    const { data, error: errorSesion } = await auth.getSession();

    // ASSERT: no actualizar si no hay sesión válida.
    if (errorSesion || !data?.session) {
      return {
        exito: false,
        motivo: 'enlace-vencido',
        mensaje: MENSAJE_ENLACE_EXPIRADO,
      };
    }

    // ACT: solicitar a Supabase la actualización de contraseña.
    const { error } = await auth.updateUser({ password: valor });

    // ASSERT: comprobar si Supabase rechazó la actualización.
    if (error) {
      if (__DEV__) {
        console.error('RF03 - Supabase no pudo actualizar la contraseña.');
      }

      if (error.code === 'same_password') {
        return {
          exito: false,
          motivo: 'misma-contrasena',
          mensaje: 'La nueva contraseña debe ser diferente a la anterior.',
        };
      }

      return {
        exito: false,
        motivo: 'error',
        mensaje: MENSAJE_ERROR_ACTUALIZACION,
      };
    }

    // ASSERT: confirmar la actualización.
    return {
      exito: true,
      mensaje: 'La contraseña se actualizó correctamente.',
    };
  } catch (error) {
    // ASSERT: controlar fallos inesperados.
    if (__DEV__) {
      console.error('RF03 - Ocurrió un error controlado al actualizar la contraseña.');
    }

    return {
      exito: false,
      motivo: 'error',
      mensaje: MENSAJE_ERROR_ACTUALIZACION,
    };
  }
}

/**
 * Cierra la sesión creada por el enlace de recuperación.
 *
 * Con alcance 'global' también se cierran las sesiones abiertas en otros
 * dispositivos (recomendable después de cambiar la contraseña). Si falla,
 * se cierra al menos la sesión local.
 *
 * @param {Object} [auth] Cliente de autenticación (inyectable en pruebas).
 * @param {'local'|'global'} [alcance]
 * @returns {Promise<boolean>} true si se cerró la sesión.
 */
export async function cerrarSesionRecuperacion(
  auth = supabase.auth,
  alcance = 'local'
) {
  try {
    const { error } = await auth.signOut({ scope: alcance });
    if (!error) return true;
  } catch (error) {
    // Continuar con el cierre local.
  }

  if (alcance !== 'local') {
    try {
      const { error } = await auth.signOut({ scope: 'local' });
      return !error;
    } catch (error) {
      return false;
    }
  }

  return false;
}