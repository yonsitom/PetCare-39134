// ============================================================
// RF04: MANTENER ACTIVA LA SESIÓN
// Servicio responsable de validar la sesión guardada.
// ============================================================

// Limpiar la sesión local cuando deja de ser válida.
import { logger } from '../utils/logger';

async function invalidarSesionLocal(auth) {
  try {
    await auth.signOut({ scope: 'local' });
  } catch (error) {
    logger.error(
      'RF04 - Error al limpiar la sesión:',
      error?.message || error
    );
  }
}

// Verificar la sesión persistida al abrir PetCare.
export async function verificarSesionPersistida({
  auth,
  verificarCuentaActiva,
}) {
  try {
    // CP02: consultar si existe una sesión almacenada.
    const { data: datosSesion, error: errorSesion } =
      await auth.getSession();

    if (errorSesion) {
      await invalidarSesionLocal(auth);

      return {
        autorizada: false,
        motivo: 'sesion-invalida',
      };
    }

    const sesion = datosSesion?.session;

    // CP02: no existe una sesión guardada.
    if (!sesion) {
      return {
        autorizada: false,
        motivo: 'sin-sesion',
      };
    }

    // RF04: comprobar si el token de acceso está próximo
    // a expirar. Intentar renovarlo antes de invalidar
    // una sesión que todavía puede continuar siendo válida.
    let sesionActual = sesion;

    const expiracion = Number(sesion.expires_at || 0);
    const ahora = Math.floor(Date.now() / 1000);

    if (expiracion > 0 && expiracion <= ahora + 30) {
      const {
        data: datosRenovacion,
        error: errorRenovacion,
      } = await auth.refreshSession();

      if (errorRenovacion || !datosRenovacion?.session) {
        await invalidarSesionLocal(auth);

        return {
          autorizada: false,
          motivo: 'sesion-expirada',
        };
      }

      sesionActual = datosRenovacion.session;
    }

    // CP03 y CP04: validar al usuario con el servidor.
    const {
      data: datosUsuario,
      error: errorUsuario,
    } = await auth.getUser();

    if (
      errorUsuario ||
      !datosUsuario?.user ||
      datosUsuario.user.id !== sesionActual.user.id
    ) {
      await invalidarSesionLocal(auth);

      return {
        autorizada: false,
        motivo: 'sesion-expirada-o-invalida',
      };
    }

    // CP01: comprobar que la cuenta del usuario continúe activa.
    const resultadoPerfil = await verificarCuentaActiva(
      datosUsuario.user.id
    );

    if (!resultadoPerfil?.autorizada) {
      await invalidarSesionLocal(auth);

      return {
        autorizada: false,
        motivo: 'cuenta-no-autorizada',
      };
    }

    // CP01: sesión válida y cuenta activa.
    return {
      autorizada: true,
      usuario: datosUsuario.user,
    };
  } catch (error) {
    logger.error(
      'RF04 - Error al verificar la sesión:',
      error?.message || error
    );

    await invalidarSesionLocal(auth);

    return {
      autorizada: false,
      motivo: 'error-verificacion',
    };
  }
}