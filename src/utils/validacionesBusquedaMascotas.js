/**
 * RF16 — Validaciones y búsqueda local de mascotas.
 *
 * Este módulo contiene lógica independiente de React Native y Supabase,
 * por lo que puede probarse mediante TDD.
 */

/**
 * Valida el término ingresado en el buscador.
 *
 * @param {string} termino - Texto ingresado por el usuario.
 * @returns {{valido: boolean, termino: string, mensaje: string}}
 */
export function validarTerminoBusquedaMascotas(termino) {
  const texto = String(termino ?? '').trim();

  if (!texto) {
    return {
      valido: false,
      termino: '',
      mensaje: 'Ingrese al menos un dato para buscar.',
    };
  }

  // Admite letras, números, espacios, puntos, apóstrofos y guiones.
  // Rechaza símbolos como @, #, $, %, etc.
  if (!/^[\p{L}\p{N}\s.'-]+$/u.test(texto)) {
    return {
      valido: false,
      termino: texto,
      mensaje: 'El dato ingresado no tiene un formato válido.',
    };
  }

  return {
    valido: true,
    termino: texto,
    mensaje: '',
  };
}

/**
 * Filtra mascotas por nombre, historia clínica, especie, raza
 * o datos básicos del propietario.
 *
 * @param {Array<object>} mascotas
 * @param {string} termino
 * @returns {Array<object>}
 */
export function filtrarMascotasPorBusqueda(mascotas, termino) {
  if (!Array.isArray(mascotas)) {
    return [];
  }

  const texto = String(termino ?? '').trim().toLocaleLowerCase();

  if (!texto) {
    return [...mascotas];
  }

  return mascotas.filter((mascota) => {
    const propietario = mascota?.propietarios;

    const campos = [
      mascota?.nombre,
      mascota?.numero_historia,
      mascota?.especie,
      mascota?.raza,
      mascota?.sexo,
      propietario?.nombre,
      propietario?.apellido,
      propietario?.documento_identidad,
    ];

    return campos.some((campo) =>
      String(campo ?? '')
        .toLocaleLowerCase()
        .includes(texto)
    );
  });
}

/**
 * Obtiene el mensaje que corresponde al resultado de una búsqueda.
 *
 * La validación del término debe realizarse antes de llamar esta función.
 *
 * @param {string} termino
 * @param {Array<object>} resultados
 * @returns {string}
 */
export function obtenerMensajeResultadoBusqueda(termino, resultados) {
  if (!String(termino ?? '').trim()) {
    return 'Ingrese al menos un dato para buscar.';
  }

  if (!Array.isArray(resultados) || resultados.length === 0) {
    return 'No se encontraron mascotas con los datos ingresados.';
  }

  return '';
}
