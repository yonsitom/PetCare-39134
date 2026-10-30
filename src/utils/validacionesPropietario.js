
function limpiarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function normalizarCorreo(correo) {
  return limpiarTexto(correo).toLowerCase();
}

/**
 * Valida los campos del propietario sin depender de Supabase.
 * Se utiliza desde el DAO y desde las pruebas unitarias.
 */
export function validarDatosPropietario(datos = {}) {
  datos = datos && typeof datos === 'object' ? datos : {};
  const errores = {};

  const nombre = limpiarTexto(datos.nombre);
  const apellido = limpiarTexto(datos.apellido);
  const dni = limpiarTexto(datos.documento_identidad);
  const telefono = limpiarTexto(datos.telefono).replace(/[\s()-]/g, '');
  const correo = normalizarCorreo(datos.correo);

  if (!nombre) {
    errores.nombre = 'Ingrese los nombres del propietario.';
  }

  if (!apellido) {
    errores.apellido = 'Ingrese los apellidos del propietario.';
  }

  if (!/^\d{8}$/.test(dni)) {
    errores.documento_identidad = 'El DNI debe contener 8 dígitos.';
  }

  const telefonoSinPrefijo = telefono.startsWith('+51')
    ? telefono.substring(3)
    : telefono.startsWith('51') && telefono.length === 11
      ? telefono.substring(2)
      : telefono;

  if (!/^9\d{8}$/.test(telefonoSinPrefijo)) {
    errores.telefono = 'Ingrese un celular válido de 9 dígitos.';
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    errores.correo = 'Ingrese un correo electrónico válido.';
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
}
