/**
 * PETCARE - SERVICIO DE REGISTRO DE USUARIOS
 * RF44 - CUS44: Gestionar cuentas de usuario.
 *
 * Responsabilidad:
 * Validar el formulario y coordinar el registro sin depender
 * de React Native ni de la interfaz gráfica.
 *
 * TDD:
 * El registro se recibe como una función inyectada. Esto permite
 * simular respuestas de Supabase sin crear usuarios reales.
 */

import { validarFormularioUsuario } from './validacionesUsuario';

/**
 * Ejecuta el flujo de registro de una cuenta.
 *
 * @param {Object} formulario Datos ingresados en el formulario.
 * @param {Function} registrarCuenta Función encargada de guardar.
 * @returns {Promise<Object>} Resultado del proceso.
 */
export async function gestionarRegistroUsuario(
  formulario,
  registrarCuenta
) {
  // ARRANGE: comprobar que se recibió una función de registro.
  if (typeof registrarCuenta !== 'function') {
    return {
      ok: false,
      tipo: 'error',
      mensaje: 'No se pudo completar el registro. Verifica los datos e inténtalo nuevamente.',
    };
  }

  // ARRANGE: validar todos los campos antes de intentar guardar.
  const errores = validarFormularioUsuario(formulario);

  // ASSERT: los datos inválidos impiden ejecutar el guardado.
  if (Object.keys(errores).length > 0) {
    return {
      ok: false,
      tipo: 'validacion',
      errores,
    };
  }

  // ACT: preparar los datos normalizados que recibirá el registro.
  const datos = {
    nombres: formulario.nombres.trim(),
    apellidos: formulario.apellidos.trim(),
    dni: formulario.dni.trim(),
    correo: formulario.correo.trim().toLowerCase(),
    telefono: formulario.telefono.trim() || null,
    direccion: formulario.direccion.trim() || null,
    contrasena: formulario.contrasena,
    rol: formulario.rol,
  };

  try {
    // ACT: ejecutar la operación de registro proporcionada.
    const respuesta = await registrarCuenta(datos);

    // ASSERT: un error o una respuesta sin usuario no representa éxito.
    if (respuesta?.error || !respuesta?.usuario) {
      const mensaje = String(
        respuesta?.mensaje ||
        respuesta?.error?.message ||
        ''
      ).toLowerCase();

      const codigo = String(
        respuesta?.code ||
        respuesta?.error?.code ||
        ''
      ).toUpperCase();

      if (
        codigo === 'EMAIL_EXISTS' ||
        codigo === 'USER_ALREADY_EXISTS' ||
        mensaje.includes('email_exists') ||
        mensaje.includes('already registered') ||
        mensaje.includes('already been registered') ||
        mensaje.includes('user already registered') ||
        (mensaje.includes('correo') && mensaje.includes('registrado'))
      ) {
        return {
          ok: false,
          tipo: 'duplicado',
          errores: {
            correo: 'El correo electrónico ya se encuentra registrado.',
          },
        };
      }

      return {
        ok: false,
        tipo: 'error',
        mensaje:
          respuesta?.mensaje ||
          'No se pudo completar el registro. Verifica los datos e inténtalo nuevamente.',
      };
    }

    // ASSERT: solo una respuesta con usuario permite informar éxito.
    return {
      ok: true,
      tipo: 'exito',
      usuario: respuesta.usuario,
    };
  } catch (error) {
    // ASSERT: los errores técnicos tampoco deben producir un falso éxito.
    return {
      ok: false,
      tipo: 'error',
      mensaje:
        'No se pudo completar el registro. Verifica los datos e inténtalo nuevamente.',
    };
  }
}
