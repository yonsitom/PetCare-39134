
/**
 * RF03 - Servicio de recuperación de contraseña.
 *
 * Responsabilidades:
 * - Validar el formato del correo electrónico.
 * - Validar los requisitos de la contraseña.
 * - Solicitar enlaces de recuperación mediante Supabase Auth.
 * - Verificar enlaces mediante dependencias inyectadas para pruebas.
 * - Actualizar la contraseña mediante una sesión válida de Supabase.
 *
 * Arquitectura:
 * - Servicio: concentra la lógica de negocio del RF03.
 * - DAO/servicio externo: Supabase Auth administra la autenticación.
 * - TDD: las dependencias inyectadas permiten probar la lógica aislada.
 */

import { supabase } from './supabase';
import * as Linking from 'expo-linking';
import { logger } from '../utils/logger';

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
      const solicitudes = await contarSolicitudes(correoNormalizado);

      // ASSERT: detener el proceso si se alcanzó el límite.
      if (solicitudes >= limiteSolicitudes) {
        return {
          exito: false,
          mensaje:
            'Ha excedido el límite de solicitudes. Intente nuevamente más tarde.',
        };
      }

      // ACT: comprobar la existencia de la cuenta.
      const existe = await correoRegistrado(correoNormalizado);

      // ASSERT: no enviar el enlace si la cuenta no existe.
      if (!existe) {
        return {
          exito: false,
          mensaje:
            'No encontramos una cuenta asociada a este correo electronico',
        };
      }

      // ACT: solicitar el envío del enlace.
      await enviarEnlace(correoNormalizado);

      // ASSERT: confirmar la solicitud.
      return {
        exito: true,
        mensaje:
          'Se envió el enlace de recuperación al correo electrónico.',
      };
    } catch (error) {
      // ASSERT: devolver un mensaje controlado ante fallos.
      if (__DEV__) {
        logger.error(
          'RF03 - Error controlado al solicitar la recuperación.'
        );
      }

      return {
        exito: false,
        mensaje:
          'No se pudo enviar el enlace de recuperación. Intente nuevamente más tarde.',
      };
    }
  }

  // RF03: comprobar la validez del enlace de recuperación.
  async function validarEnlace(token) {
    // ASSERT: rechazar la ausencia de token.
    if (!token) {
      return {
        exito: false,
        mensaje:
          'El enlace de recuperación ha expirado. Solicite un nuevo enlace.',
      };
    }

    try {
      // ACT: verificar el token mediante la dependencia inyectada.
      const valido = await verificarEnlace(token);

      // ASSERT: impedir continuar con un token inválido.
      if (!valido) {
        return {
          exito: false,
          mensaje:
            'El enlace de recuperación ha expirado. Solicite un nuevo enlace.',
        };
      }

      // ASSERT: permitir continuar cuando el enlace es válido.
      return {
        exito: true,
        mensaje: '',
      };
    } catch (error) {
      // ASSERT: no permitir el cambio si falla la verificación.
      if (__DEV__) {
        logger.error(
          'RF03 - Error controlado al verificar el enlace.'
        );
      }

      return {
        exito: false,
        mensaje:
          'El enlace de recuperación ha expirado. Solicite un nuevo enlace.',
      };
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
        logger.error(
          'RF03 - Error controlado al actualizar la contraseña.'
        );
      }

      return {
        exito: false,
        mensaje:
          'No se pudo actualizar la contraseña. Intente nuevamente.',
      };
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
 * Envía el enlace de recuperación mediante Supabase Auth.
 *
 * Nota:
 * El correo debe configurarse en Supabase y la URL de redirección
 * debe estar permitida en la configuración de autenticación.
 *
 * @param {string} correo
 * @returns {Promise<{exito: boolean, mensaje: string}>}
 */
export async function enviarEnlaceRecuperacion(correo) {
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
    // ARRANGE: construir la URL de retorno de la aplicación.
    const urlRecuperacion = Linking.createURL(
      'restablecerContrasena'
    );

    // ACT: solicitar a Supabase el envío del enlace.
    const { error } = await supabase.auth.resetPasswordForEmail(
      correoNormalizado,
      {
        redirectTo: urlRecuperacion,
      }
    );

    // ASSERT: tratar el error sin registrar URL ni datos sensibles.
    if (error) {
      if (__DEV__) {
        logger.error(
          'RF03 - Supabase no pudo enviar el enlace de recuperación.'
        );
      }

      return {
        exito: false,
        mensaje:
          'No se pudo enviar el enlace de recuperación. Intente nuevamente más tarde.',
      };
    }

    // ASSERT: devolver la confirmación de la solicitud.
    return {
      exito: true,
      mensaje:
        'Se envió el enlace de recuperación al correo electrónico.',
    };
  } catch (error) {
    // ASSERT: controlar errores inesperados sin exponer detalles internos.
    if (__DEV__) {
      logger.error(
        'RF03 - Ocurrió un error controlado al solicitar la recuperación.'
      );
    }

    return {
      exito: false,
      mensaje:
        'No se pudo enviar el enlace de recuperación. Intente nuevamente más tarde.',
    };
  }
}

/**
 * Actualiza la contraseña del usuario autenticado en el flujo
 * de recuperación.
 *
 * Supabase debe tener una sesión válida establecida por el proceso
 * de recuperación antes de ejecutar esta operación.
 *
 * @param {string} nuevaContrasena
 * @returns {Promise<{exito: boolean, mensaje: string}>}
 */
export async function actualizarContrasenaRecuperada(
  nuevaContrasena
) {
  // ARRANGE: validar los requisitos de la nueva contraseña.
  if (!contrasenaCumpleRequisitos(nuevaContrasena)) {
    return {
      exito: false,
      mensaje:
        'La contraseña debe tener mínimo 8 caracteres, incluyendo una mayúscula, una minúscula y un número.',
    };
  }

  try {
    // ARRANGE: comprobar que Supabase tenga una sesión válida.
    const {
      data,
      error: errorSesion,
    } = await supabase.auth.getSession();

    // ASSERT: no actualizar si no hay sesión válida.
    if (errorSesion || !data?.session) {
      return {
        exito: false,
        mensaje:
          'El enlace de recuperación ha expirado. Solicite un nuevo enlace.',
      };
    }

    // ACT: solicitar a Supabase la actualización de contraseña.
    const { error } = await supabase.auth.updateUser({
      password: nuevaContrasena,
    });

    // ASSERT: comprobar si Supabase rechazó la actualización.
    if (error) {
      if (__DEV__) {
        logger.error(
          'RF03 - Supabase no pudo actualizar la contraseña.'
        );
      }

      return {
        exito: false,
        mensaje:
          'No se pudo actualizar la contraseña. Intente nuevamente.',
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
      logger.error(
        'RF03 - Ocurrió un error controlado al actualizar la contraseña.'
      );
    }

    return {
      exito: false,
      mensaje:
        'No se pudo actualizar la contraseña. Intente nuevamente.',
    };
  }
}
