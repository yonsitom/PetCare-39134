
/**
 * RF48 - Gestionar estado del propietario.
 *
 * Responsabilidad:
 * - Buscar un propietario por nombre, apellido o documento.
 * - Validar el nuevo estado.
 * - Exigir motivo para desactivar.
 * - Gestionar la activación y desactivación.
 *
 * Arquitectura:
 * Controlador -> Servicio -> DAO -> Supabase.
 *
 * TDD:
 * Compatible con DAO simulado para las pruebas unitarias.
 */

export const MENSAJES_ESTADO_PROPIETARIO = {
  BUSQUEDA_VACIA: 'Ingrese un dato para realizar la búsqueda.',
  NO_ENCONTRADO: 'No se encontró el propietario.',
  ERROR_BUSCAR: 'No se pudo realizar la búsqueda del propietario.',
  ID_REQUERIDO: 'Debe seleccionar un propietario.',
  ESTADO_INVALIDO: 'El estado indicado no es válido.',
  MOTIVO_REQUERIDO: 'Debe indicar el motivo de la desactivación.',
  ERROR_ACTUALIZAR:
    'La operación no pudo completarse. Se mantiene el estado anterior.',
};

export const crearPropietarioEstadoServicio = (propietarioDAO) => {
  if (
    !propietarioDAO ||
    typeof propietarioDAO.buscarPorCriterio !== 'function' ||
    typeof propietarioDAO.actualizarEstado !== 'function'
  ) {
    throw new Error(
      'El servicio requiere un DAO con buscarPorCriterio y actualizarEstado.'
    );
  }

  /**
   * Busca un propietario por nombre, apellido o documento.
   */
  const buscarPropietario = async (criterio) => {
    const criterioLimpio = String(criterio ?? '').trim();

    if (!criterioLimpio) {
      return {
        exito: false,
        mensaje: MENSAJES_ESTADO_PROPIETARIO.BUSQUEDA_VACIA,
        propietario: null,
      };
    }

    try {
      const propietario =
        await propietarioDAO.buscarPorCriterio(criterioLimpio);

      if (!propietario) {
        return {
          exito: false,
          mensaje: MENSAJES_ESTADO_PROPIETARIO.NO_ENCONTRADO,
          propietario: null,
        };
      }

      return {
        exito: true,
        mensaje: 'Propietario encontrado correctamente.',
        propietario,
      };
    } catch (error) {
      return {
        exito: false,
        mensaje: MENSAJES_ESTADO_PROPIETARIO.ERROR_BUSCAR,
        propietario: null,
        error,
      };
    }
  };

  /**
   * Activa o desactiva un propietario.
   *
   * El motivo es obligatorio cuando el nuevo estado es Inactivo.
   * Para activar, no se necesita motivo.
   */
  const gestionarEstado = async (
    propietarioId,
    nuevoEstado,
    motivoDesactivacion = ''
  ) => {
    // Validar identificador.
    if (
      propietarioId === null ||
      propietarioId === undefined ||
      String(propietarioId).trim() === ''
    ) {
      return {
        exito: false,
        mensaje: MENSAJES_ESTADO_PROPIETARIO.ID_REQUERIDO,
        propietario: null,
      };
    }

    // Validar estado.
    if (!['Activo', 'Inactivo'].includes(nuevoEstado)) {
      return {
        exito: false,
        mensaje: MENSAJES_ESTADO_PROPIETARIO.ESTADO_INVALIDO,
        propietario: null,
      };
    }

    // Normalizar motivo.
    const motivo = String(motivoDesactivacion ?? '').trim();

    // Exigir motivo para desactivar.
    if (nuevoEstado === 'Inactivo' && !motivo) {
      return {
        exito: false,
        mensaje: MENSAJES_ESTADO_PROPIETARIO.MOTIVO_REQUERIDO,
        propietario: null,
      };
    }

    try {
      // Enviar siempre los tres argumentos al DAO.
      // Para activar, el motivo será una cadena vacía.
      const propietarioActualizado =
        await propietarioDAO.actualizarEstado(
          propietarioId,
          nuevoEstado,
          nuevoEstado === 'Inactivo' ? motivo : ''
        );

      return {
        exito: true,
        mensaje: `Propietario ${nuevoEstado.toLowerCase()} correctamente.`,
        propietario: propietarioActualizado,
      };
    } catch (error) {
      return {
        exito: false,
        mensaje: MENSAJES_ESTADO_PROPIETARIO.ERROR_ACTUALIZAR,
        propietario: null,
        error,
      };
    }
  };

  return {
    buscarPropietario,
    gestionarEstado,
  };
};
