/**
 * RF17 - Validaciones para registrar una mascota.
 *
 * Responsabilidad:
 * Validar los datos antes de solicitar el registro en Supabase.
 *
 * Módulo independiente de React Native y Supabase.
 * Permite realizar pruebas unitarias mediante Jest (TDD).
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

  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }

  return fecha;
}

function esFechaValida(fechaReferencia) {
  return (
    fechaReferencia instanceof Date &&
    !Number.isNaN(fechaReferencia.getTime())
  );
}

/**
 * Valida los datos requeridos para registrar una mascota.
 *
 * @param {Object} datos Datos del formulario.
 * @param {Date} fechaReferencia Fecha usada para validar
 *        que el nacimiento no sea posterior al día actual.
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

  const propietarioValido =
    datos.propietario_id !== null &&
    datos.propietario_id !== undefined &&
    String(datos.propietario_id).trim() !== '';

  if (!propietarioValido) {
    return {
      valido: false,
      mensaje: MENSAJES.propietario,
    };
  }

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

  const fechaInformada =
    datos.fecha_nacimiento !== null &&
    datos.fecha_nacimiento !== undefined &&
    String(datos.fecha_nacimiento).trim() !== '';

  if (fechaInformada) {
    const fechaNacimiento = convertirFechaNacimiento(
      String(datos.fecha_nacimiento)
    );

    if (!fechaNacimiento || !esFechaValida(fechaReferencia)) {
      return {
        valido: false,
        mensaje: MENSAJES.datosInvalidos,
      };
    }

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

export function obtenerMensajeErrorRegistroMascota() {
  return MENSAJES.errorRegistro;
}