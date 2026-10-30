
/**
 * RF18 - Validaciones para modificar la información de una mascota.
 *
 * Responsabilidad:
 * Validar los datos antes de solicitar una actualización al DAO.
 *
 * Esta utilidad no consulta Supabase ni modifica la base de datos.
 */

const MENSAJES = {
  camposObligatorios:
    'Complete los campos obligatorios para continuar.',
  datosInvalidos:
    'Verifique los datos ingresados e inténtelo nuevamente.',
  errorActualizacion:
    'No se pudieron guardar los cambios. Intente nuevamente.',
};

/**
 * Comprueba que una fecha tenga formato YYYY-MM-DD,
 * sea una fecha real y no esté en el futuro.
 *
 * La fecha vacía se acepta porque el nacimiento es opcional.
 */
function validarFechaNacimiento(fecha, fechaReferencia = new Date()) {
  if (fecha === null || fecha === undefined || fecha === '') {
    return true;
  }

  if (typeof fecha !== 'string') {
    return false;
  }

  const coincidencia = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!coincidencia) {
    return false;
  }

  const anio = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);

  const fechaValidada = new Date(anio, mes - 1, dia);

  // Evita aceptar fechas inexistentes como 2021-13-45.
  if (
    fechaValidada.getFullYear() !== anio ||
    fechaValidada.getMonth() !== mes - 1 ||
    fechaValidada.getDate() !== dia
  ) {
    return false;
  }

  const fechaLimite = new Date(
    fechaReferencia.getFullYear(),
    fechaReferencia.getMonth(),
    fechaReferencia.getDate()
  );

  return fechaValidada <= fechaLimite;
}

/**
 * Valida los campos que exige la tabla mascotas.
 *
 * Campos obligatorios:
 * - propietario_id
 * - nombre
 * - especie
 *
 * Campos opcionales:
 * - raza
 * - sexo
 * - fecha_nacimiento
 * - color
 * - estado_esterilizacion
 * - observaciones
 */
export function validarDatosEdicionMascota(
  datos,
  fechaReferencia = new Date()
) {
  if (!datos || typeof datos !== 'object') {
    return {
      valido: false,
      mensaje: MENSAJES.camposObligatorios,
    };
  }

  const propietarioValido =
    datos.propietario_id !== null &&
    datos.propietario_id !== undefined &&
    String(datos.propietario_id).trim() !== '';

  const nombreValido =
    typeof datos.nombre === 'string' &&
    datos.nombre.trim() !== '';

  const especieValida =
    typeof datos.especie === 'string' &&
    datos.especie.trim() !== '';

  if (!propietarioValido || !nombreValido || !especieValida) {
    return {
      valido: false,
      mensaje: MENSAJES.camposObligatorios,
    };
  }

  if (
    !validarFechaNacimiento(
      datos.fecha_nacimiento,
      fechaReferencia
    )
  ) {
    return {
      valido: false,
      mensaje: MENSAJES.datosInvalidos,
    };
  }

  return {
    valido: true,
    mensaje: '',
  };
}

/**
 * Evita exponer errores técnicos de Supabase en la interfaz.
 */
export function obtenerMensajeErrorEdicionMascota(error) {
  // El error técnico puede registrarse en la pantalla o el servicio.
  // El mensaje visible para el usuario debe ser genérico.
  return MENSAJES.errorActualizacion;
}
