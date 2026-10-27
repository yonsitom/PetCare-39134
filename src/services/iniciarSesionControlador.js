
/**
 * RF01 - Controlador de inicio de sesión.
 *
 * La pantalla presenta los resultados.
 * Este controlador aplica las reglas y coordina los servicios.
 * La autenticación y el perfil se reciben como dependencias
 * para poder probar el comportamiento sin usar Supabase real.
 */
export function crearControladorInicioSesion({
  autenticar,
  verificarCuentaActiva,
  cerrarSesion = async () => {},
  limiteIntentos = 5,
  intentosFallidosIniciales = 0,
}) {
  let intentosFallidos = intentosFallidosIniciales;

  function resultado({
    mensaje,
    tipoMensaje = 'error',
    autenticado = false,
    redirigir = false,
  }) {
    return {
      mensaje,
      tipoMensaje,
      autenticado,
      redirigir,
      intentosFallidos,
    };
  }

  async function iniciarSesion(correo, contrasena) {
    // CP06: bloquear antes de llamar al servicio.
    if (intentosFallidos >= limiteIntentos) {
      return resultado({
        mensaje:
          'Demasiados intentos. Intente nuevamente más tarde.',
        tipoMensaje: 'advertencia',
      });
    }

    // CP02: campos obligatorios.
    if (!correo?.trim() || !contrasena) {
      return resultado({
        mensaje: 'Complete los campos obligatorios.',
        tipoMensaje: 'advertencia',
      });
    }

    // CP03: formato del correo.
    const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formatoCorreo.test(correo.trim())) {
      return resultado({
        mensaje: 'Ingrese un formato de correo electrónico válido',
        tipoMensaje: 'advertencia',
      });
    }

    let sesionIniciada = false;

    try {
      // CP01 / CP04 / CP05: autenticar.
      const usuario = await autenticar(correo.trim(), contrasena);

      if (!usuario?.id) {
        return resultado({
          mensaje: 'No se pudo iniciar sesión. Inténtelo nuevamente.',
        });
      }

      sesionIniciada = true;

      // Verificar que el perfil exista y esté activo.
      const perfil = await verificarCuentaActiva(usuario.id);

      if (!perfil?.autorizada) {
        await cerrarSesion();
        sesionIniciada = false;

        return resultado({
          mensaje:
            perfil?.mensaje ||
            'La cuenta no está autorizada para ingresar.',
          tipoMensaje: 'error',
        });
      }

      // CP01: inicio exitoso.
      intentosFallidos = 0;

      return resultado({
        mensaje: 'Inicio de sesión exitoso.',
        tipoMensaje: 'exito',
        autenticado: true,
        redirigir: true,
      });
    } catch (error) {
      // Evitar dejar una sesión abierta si falla la verificación
      // del perfil después de autenticar al usuario.
      if (sesionIniciada) {
        try {
          await cerrarSesion();
        } catch (errorCierre) {
          console.error(
            'No se pudo cerrar la sesión incompleta:',
            errorCierre
          );
        }
      }

      const mensajeOriginal = [
        error?.message,
        error?.code,
        error?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      // Errores de límite de solicitudes del proveedor.
      if (
        error?.status === 429 ||
        mensajeOriginal.includes('too many requests') ||
        mensajeOriginal.includes('rate limit')
      ) {
        return resultado({
          mensaje:
            'Demasiados intentos. Intente nuevamente más tarde.',
          tipoMensaje: 'advertencia',
        });
      }

      // CP04: solo credenciales incorrectas incrementan el contador.
      if (
        mensajeOriginal.includes('invalid login credentials') ||
        mensajeOriginal.includes('invalid_credentials')
      ) {
        intentosFallidos += 1;

        if (intentosFallidos >= limiteIntentos) {
          return resultado({
            mensaje:
              'Demasiados intentos. Intente nuevamente más tarde.',
            tipoMensaje: 'advertencia',
          });
        }

        return resultado({
          mensaje: 'Error. Ingresar nuevamente las credenciales',
          tipoMensaje: 'error',
        });
      }

      // CP05: los errores de conexión no incrementan el contador.
      if (
        mensajeOriginal.includes('network') ||
        mensajeOriginal.includes('fetch failed') ||
        mensajeOriginal.includes('failed to fetch') ||
        mensajeOriginal.includes('connection') ||
        mensajeOriginal.includes('timeout') ||
        mensajeOriginal.includes('load failed')
      ) {
        return resultado({
          mensaje:
            'No se pudo conectar con el servicio. Intente nuevamente.',
          tipoMensaje: 'error',
        });
      }

      return resultado({
        mensaje: 'No se pudo iniciar sesión. Inténtelo nuevamente.',
        tipoMensaje: 'error',
      });
    }
  }

  return { iniciarSesion };
}
