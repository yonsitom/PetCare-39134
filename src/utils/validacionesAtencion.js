
/**
 * RF22: valida los datos obligatorios para registrar una atención.
 * RF23: valida los datos obligatorios para iniciar una atención.
 */

/**
 * Valida los datos para registrar una atención veterinaria.
 * RF22
 */
export function validarDatosAtencion(datos) {
  const numeroHistoria = String(
    datos?.numero_historia ?? ''
  ).trim();

  if (!numeroHistoria) {
    return {
      valido: false,
      mensaje:
        'Seleccione una mascota para registrar la atención.',
    };
  }

  return {
    valido: true,
    mensaje: '',
  };
}

/**
 * Valida los datos para iniciar una atención.
 * RF23
 */
export function validarDatosInicioAtencion(datos) {
  const numeroHistoria = String(
    datos?.numero_historia ?? ''
  ).trim();

  if (!numeroHistoria) {
    return {
      valido: false,
      mensaje:
        'Complete los campos obligatorios para iniciar la atención.',
    };
  }

  return {
    valido: true,
    mensaje: '',
  };
}
