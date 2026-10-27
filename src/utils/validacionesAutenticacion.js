
export function validarCampos(correo, contrasena) {
  if (!correo?.trim() || !contrasena) {
    return {
      valido: false,
      mensaje: 'Campos incompletos',
    };
  }

  return {
    valido: true,
    mensaje: '',
  };
}

export function validarCorreo(correo) {
  const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!formatoCorreo.test(correo.trim())) {
    return {
      valido: false,
      mensaje: 'Ingrese un correo electrónico válido.',
    };
  }

  return {
    valido: true,
    mensaje: '',
  };
}
