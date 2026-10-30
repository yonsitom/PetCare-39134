
/**
 * RF17 - Validaciones para registrar una mascota.
 *
 * Responsabilidad:
 * Validar los datos antes de solicitar el registro en Supabase.
 *
 * Este módulo es independiente de React Native y Supabase,
 * por lo que puede probarse mediante Jest (TDD).
 */

const MENSAJES = {
  camposObligatorios:
    'Complete los campos obligatorios para continuar.',

  propietario:
    'Seleccione un propietario para continuar.',

  datosInvalidos:
    'Verifique los datos ingresados e inténtelo nuevamente.',

  errorRegistro:
    'No se pudo registrar la mascota. Intente nuevamente.',
};

/**
 * Convierte una fecha ISO (AAAA-MM-DD) o visible (DD/MM/AAAA)
 * en una fecha local válida.
 *
 * Retorna null si la fecha no existe o tiene un formato inválido.
 */
function convertirFechaNacimiento(valor) {
  if (typeof valor !== 'string' || !valor.trim()) {
    return null;
  }

  const texto = valor.trim();
  let anio;
  let mes;
  let dia;

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    [anio, mes, dia] = texto.split('-').map(Number);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    [dia, mes, anio] = texto.split('/').map(Number);
  } else {
    return null;
  }

  const fecha = new Date(anio, mes - 1, dia);

  // Evita que JavaScript normalice fechas inexistentes,
  // por ejemplo, el 45/13/2021.
  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }

  return fecha;
}

/**
 * Valida los datos requeridos para registrar una mascota.
 *
 * @param {Object} datos Datos que provienen del formulario.
 * @param {Date} fechaReferencia Fecha usada para comprobar
 *        si el nacimiento está en el futuro. Por defecto,
 *        se utiliza la fecha actual.
 *
 * @returns {{valido: boolean, mensaje: string}}
 */
export function validarDatosRegistroMascota(
  datos,
  fechaReferencia = new Date()
) {
  if (!datos || typeof datos !== 'object') {
    return {
      valido: false,
      mensaje: MENSAJES.camposObligatorios,
    };
  }

  // CP03: el propietario es obligatorio.
  if (
    datos.propietario_id === null ||
    datos.propietario_id === undefined ||
    String(datos.propietario_id).trim() === ''
  ) {
    return {
      valido: false,
      mensaje: MENSAJES.propietario,
    };
  }

  // CP02: nombre y especie son obligatorios.
  if (
    typeof datos.nombre !== 'string' ||
    !datos.nombre.trim() ||
    typeof datos.especie !== 'string' ||
    !datos.especie.trim()
  ) {
    return {
      valido: false,
      mensaje: MENSAJES.camposObligatorios,
    };
  }

  // CP04: la fecha es opcional, pero si se proporciona
  // debe existir realmente y no ser posterior al día actual.
  if (
    datos.fecha_nacimiento !== null &&
    datos.fecha_nacimiento !== undefined &&
    String(datos.fecha_nacimiento).trim() !== ''
  ) {
    const fechaNacimiento = convertirFechaNacimiento(
      String(datos.fecha_nacimiento)
    );

    if (!fechaNacimiento || !(fechaReferencia instanceof Date) ||
        Number.isNaN(fechaReferencia.getTime())) {
      return {
        valido: false,
        mensaje: MENSAJES.datosInvalidos,
      };
    }

    // Comparar por día calendario para evitar problemas de horas.
    const nacimientoDia = new Date(
      fechaNacimiento.getFullYear(),
      fechaNacimiento.getMonth(),
      fechaNacimiento.getDate()
    );

    const referenciaDia = new Date(
      fechaReferencia.getFullYear(),
      fechaReferencia.getMonth(),
      fechaReferencia.getDate()
    );

    if (nacimientoDia > referenciaDia) {
      return {
        valido: false,
        mensaje: MENSAJES.datosInvalidos,
      };
    }
  }

  return {
    valido: true,
    mensaje: '',
  };
}

/**
 * Evita mostrar detalles internos del servicio al usuario.
 * Se registra un mensaje funcional y uniforme para CP05.
 */
export function obtenerMensajeErrorRegistroMascota() {
  return MENSAJES.errorRegistro;
}
