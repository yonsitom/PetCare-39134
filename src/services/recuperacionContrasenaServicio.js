
/**
 * RF03 - Servicio de recuperación de contraseña.
 * Incluye lógica comprobable mediante dependencias inyectadas y
 * operaciones reales mediante Supabase Auth.
 */

import { supabase } from './supabase';
import * as Linking from 'expo-linking';
// RF03: validar el formato básico del correo electrónico.
export function correoTieneFormatoValido(correo) {
  // ARRANGE: normalizar el valor ingresado.
  const valor = String(correo || '').trim();

  // ACT / ASSERT: comprobar el formato.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

// RF03: validar los requisitos mínimos de la contraseña.
export function contrasenaCumpleRequisitos(contrasena) {
  // ARRANGE: convertir el valor a texto.
  const valor = String(contrasena || '');

  // ACT / ASSERT: verificar longitud, mayúscula, minúscula y número.
  return (
    valor.length >= 8 &&
    /[A-Z]/.test(valor) &&
    /[a-z]/.test(valor) &&
    /\d/.test(valor)
  );
}

// RF03: crear el servicio aislado para las pruebas unitarias.
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
    const correoNormalizado = String(correo || '').trim().toLowerCase();

    // ASSERT: rechazar correos con formato incorrecto.
    if (!correoTieneFormatoValido(correoNormalizado)) {
      return {
        exito: false,
        mensaje: 'Ingrese un correo electrónico válido.',
      };
    }

    try {
      // ACT: consultar el contador de solicitudes.
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

      // ASSERT: no enviar enlace si la cuenta no existe.
      if (!existe) {
        return {
          exito: false,
          mensaje:
            'No encontramos una cuenta asociada a este correo electronico',
        };
      }

      // ACT: solicitar el envío del enlace.
      await enviarEnlace(correoNormalizado);

      // ASSERT: devolver la confirmación de envío.
      return {
        exito: true,
        mensaje: 'Se envió el enlace de recuperación al correo electrónico.',
      };
    } catch (error) {
      // ASSERT: devolver un mensaje controlado ante fallos.
      return {
        exito: false,
        mensaje:
          'No se pudo enviar el enlace de recuperación. Intente nuevamente más tarde.',
      };
    }
  }

  // RF03: comprobar la validez del enlace.
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
      // ACT: consultar la validez del token.
      const valido = await verificarEnlace(token);

      // ASSERT: impedir continuar con un token inválido.
      if (!valido) {
        return {
          exito: false,
          mensaje:
            'El enlace de recuperación ha expirado. Solicite un nuevo enlace.',
        };
      }

      return { exito: true, mensaje: '' };
    } catch (error) {
      // ASSERT: no permitir el cambio cuando falla la verificación.
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

    // ACT: validar el enlace.
    const resultadoEnlace = await validarEnlace(token);

    // ASSERT: no actualizar la contraseña si el enlace no es válido.
    if (!resultadoEnlace.exito) {
      return resultadoEnlace;
    }

    try {
      // ACT: actualizar la contraseña.
      await establecerContrasena(nuevaContrasena);

      // ASSERT: confirmar el cambio.
      return {
        exito: true,
        mensaje: 'La contraseña se actualizó correctamente.',
      };
    } catch (error) {
      // ASSERT: informar el error de actualización.
      return {
        exito: false,
        mensaje: 'No se pudo actualizar la contraseña. Intente nuevamente.',
      };
    }
  }

  // Exponer las operaciones que utilizarán las pruebas.
  return {
    solicitarEnlace,
    validarEnlace,
    cambiarContrasena,
  };
}

// RF03 REAL: enviar el correo mediante Supabase Auth.
export async function enviarEnlaceRecuperacion(correo) {
  // ARRANGE: validar el correo antes de llamar a Supabase.
  const correoNormalizado = String(correo || '').trim().toLowerCase();

  if (!correoTieneFormatoValido(correoNormalizado)) {
    return {
      exito: false,
      mensaje: 'Ingrese un correo electrónico válido.',
    };
  }

  try {
    // ACT: solicitar a Supabase que envíe el enlace.
    const urlRecuperacion = Linking.createURL('restablecerContrasena');
    console.log('RF03 - URL de recuperación:', urlRecuperacion);
    const { error } = await supabase.auth.resetPasswordForEmail(
      correoNormalizado,
      {
        redirectTo: urlRecuperacion,
      }
    );

    if (error) {
      throw error;
    }

    // ASSERT: devolver el resultado exitoso.
    return {
      exito: true,
      mensaje: 'Se envió el enlace de recuperación al correo electrónico.',
    };
  } catch (error) {
    console.error('RF03 - Error al enviar recuperación:', error?.message || error);
    // ASSERT: no exponer detalles internos del proveedor.
    return {
      exito: false,
      mensaje:
        'No se pudo enviar el enlace de recuperación. Intente nuevamente más tarde.',
    };
  }
}

// RF03 REAL: actualizar la contraseña de la sesión de recuperación.
export async function actualizarContrasenaRecuperada(nuevaContrasena) {
  // ARRANGE: validar la nueva contraseña.
  if (!contrasenaCumpleRequisitos(nuevaContrasena)) {
    return {
      exito: false,
      mensaje:
        'La contraseña debe tener mínimo 8 caracteres, incluyendo una mayúscula, una minúscula y un número.',
    };
  }

  try {
    // ARRANGE: comprobar que Supabase tenga una sesión válida.
    const { data, error: errorSesion } = await supabase.auth.getSession();

    if (errorSesion || !data.session) {
      return {
        exito: false,
        mensaje:
          'El enlace de recuperación ha expirado. Solicite un nuevo enlace.',
      };
    }

    // ACT: solicitar a Supabase el cambio de contraseña.
    const { error } = await supabase.auth.updateUser({
      password: nuevaContrasena,
    });

    if (error) {
      throw error;
    }

    // ASSERT: informar que la contraseña se actualizó.
    return {
      exito: true,
      mensaje: 'La contraseña se actualizó correctamente.',
    };
  } catch (error) {
    // ASSERT: devolver un mensaje controlado.
    return {
      exito: false,
      mensaje: 'No se pudo actualizar la contraseña. Intente nuevamente.',
    };
  }
}


