
export function obtenerMensajeErrorAutenticacion(error) {
  const mensajeOriginal = [
    error?.message,
    error?.code,
    error?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // E5: demasiados intentos de autenticación.
  if (
    error?.status === 429 ||
    mensajeOriginal.includes('too many requests') ||
    mensajeOriginal.includes('rate limit')
  ) {
    return {
      tipo: 'advertencia',
      mensaje:
        'Demasiados intentos. Espera un momento antes de volver a intentarlo.',
    };
  }

  // E3: credenciales incorrectas.
  if (
    mensajeOriginal.includes('invalid login credentials') ||
    mensajeOriginal.includes('invalid_credentials')
  ) {
    return {
      tipo: 'error',
      mensaje:
        'Credenciales incorrectas. Verifique su correo y contraseña.',
    };
  }

  // E4: problemas de conexión.
  if (
    mensajeOriginal.includes('network') ||
    mensajeOriginal.includes('fetch failed') ||
    mensajeOriginal.includes('failed to fetch') ||
    mensajeOriginal.includes('connection') ||
    mensajeOriginal.includes('timeout') ||
    mensajeOriginal.includes('load failed')
  ) {
    return {
      tipo: 'error',
      mensaje:
        'No se pudo conectar con el servidor. Compruebe su conexión e inténtelo nuevamente.',
    };
  }

  // Otros errores no identificados.
  return {
    tipo: 'error',
    mensaje:
      'No se pudo iniciar sesión. Inténtelo nuevamente.',
  };
}
