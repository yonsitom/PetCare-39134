
/*
 * RF01 — Inicio de sesión
 * C_Login: control del diagrama de secuencia.
 *
 * Este servicio contiene únicamente reglas de negocio.
 * No importa React Native, Expo ni Supabase.
 *
 * El repositorio se inyecta desde fuera:
 * - En las pruebas: repositorio falso en memoria.
 * - En producción: adaptador conectado al servicio de autenticación.
 */

export const EstadoInicioSesion = Object.freeze({
  EXITOSO: 'EXITOSO',
  CAMPOS_INCOMPLETOS: 'CAMPOS_INCOMPLETOS',
  CORREO_INVALIDO: 'CORREO_INVALIDO',
  CREDENCIALES_INCORRECTAS: 'CREDENCIALES_INCORRECTAS',
  ERROR_CONEXION: 'ERROR_CONEXION',
  DEMASIADOS_INTENTOS: 'DEMASIADOS_INTENTOS',
});

const MAX_INTENTOS_FALLIDOS = 3;

const mensajes = Object.freeze({
  [EstadoInicioSesion.EXITOSO]: 'Inicio de sesion exitoso',
  [EstadoInicioSesion.CAMPOS_INCOMPLETOS]:
    'Complete los campos obligatorios',
  [EstadoInicioSesion.CORREO_INVALIDO]:
    'Ingrese un formato de correo electrónico válido',
  [EstadoInicioSesion.CREDENCIALES_INCORRECTAS]:
    'Error. Ingresar nuevamente las credenciales',
  [EstadoInicioSesion.ERROR_CONEXION]:
    'No se pudo conectar con el servicio. Intente nuevamente',
  [EstadoInicioSesion.DEMASIADOS_INTENTOS]:
    'Demasiados intentos. Intente nuevamente más tarde',
});

function crearResultado(estado, datosAdicionales = {}) {
  return {
    estado,
    mensaje: mensajes[estado],
    puedeContinuar: estado === EstadoInicioSesion.EXITOSO,
    usuario: null,
    ...datosAdicionales,
  };
}

function correoTieneFormatoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

/**
 * Crea el servicio de inicio de sesión.
 *
 * Contrato del repositorio:
 * autenticar(correo, contrasena) debe devolver:
 * - un usuario activo si las credenciales son válidas;
 * - null si las credenciales no son válidas;
 * - lanzar un error si falla la conexión o el servicio.
 *
 * El repositorio real debe validar la contraseña con el proveedor
 * de autenticación. Nunca se deben guardar contraseñas en texto plano.
 */
export function crearInicioSesionService(
  repositorio,
  maxIntentos = MAX_INTENTOS_FALLIDOS
) {
  if (!repositorio || typeof repositorio.autenticar !== 'function') {
    throw new Error(
      'El repositorio debe implementar el método autenticar(correo, contrasena).'
    );
  }

  if (!Number.isInteger(maxIntentos) || maxIntentos < 1) {
    throw new Error('El máximo de intentos debe ser un entero positivo.');
  }

  // Contador aislado por instancia del servicio.
  const intentosFallidos = new Map();

  async function iniciarSesion(correoIngresado, contrasenaIngresada) {
    // B1–B5: validar los datos recibidos desde la interfaz.
    const correo = String(correoIngresado ?? '').trim();
    const contrasena = String(contrasenaIngresada ?? '');

    if (!correo || !contrasena.trim()) {
      return crearResultado(EstadoInicioSesion.CAMPOS_INCOMPLETOS);
    }

    // B10: correo con formato inválido. No se consulta el repositorio.
    if (!correoTieneFormatoValido(correo)) {
      return crearResultado(EstadoInicioSesion.CORREO_INVALIDO);
    }

    const claveCorreo = correo.toLowerCase();
    const intentos = intentosFallidos.get(claveCorreo) ?? 0;

    // B13: el usuario ya superó el máximo de intentos permitido.
    if (intentos >= maxIntentos) {
      return crearResultado(EstadoInicioSesion.DEMASIADOS_INTENTOS);
    }

    let usuario;

    try {
      // B6–B7: delegar la autenticación al repositorio.
      usuario = await repositorio.autenticar(correo, contrasena);
    } catch {
      // B12: error de conexión o del proveedor de autenticación.
      return crearResultado(EstadoInicioSesion.ERROR_CONEXION);
    }

    if (!usuario || usuario.estado_cuenta !== 'Activo') {
      const nuevosIntentos = intentos + 1;
      intentosFallidos.set(claveCorreo, nuevosIntentos);

      return crearResultado(
        EstadoInicioSesion.CREDENCIALES_INCORRECTAS,
        { intentosFallidos: nuevosIntentos }
      );
    }

    // B7–B8: autenticación exitosa; limpiar los intentos anteriores.
    intentosFallidos.delete(claveCorreo);

    return crearResultado(EstadoInicioSesion.EXITOSO, {
      usuario,
      rol: usuario.rol,
      intentosFallidos: 0,
    });
  }

  return {
    iniciarSesion,
    consultarIntentosFallidos(correo) {
      return intentosFallidos.get(String(correo ?? '').trim().toLowerCase()) ?? 0;
    },
  };
}
