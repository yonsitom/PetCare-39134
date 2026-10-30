
/**
 * RF48 - Gestionar estado del propietario.
 *
 * Patrón: servicio independiente de la interfaz.
 * TDD: permite probar las reglas del requerimiento mediante un DAO simulado.
 */

export const MENSAJES_ESTADO_PROPIETARIO = {
  BUSQUEDA_VACIA: 'Ingrese un dato para realizar la búsqueda.',
  NO_ENCONTRADO: 'No se encontraron resultados.',
  ERROR_CONSULTA: 'Ocurrió un error al consultar al propietario.',
  ERROR_ACTUALIZAR:
    'La operación no pudo completarse. Se mantiene el estado anterior.',
  ACTUALIZADO: 'Estado del propietario actualizado correctamente.',
  ESTADO_INVALIDO: 'El estado solicitado no es válido.',
};

export function crearPropietarioEstadoServicio(propietarioDAO) {
  if (
    !propietarioDAO ||
    typeof propietarioDAO.buscarPorCriterio !== 'function' ||
    typeof propietarioDAO.actualizarEstado !== 'function'
  ) {
    throw new Error(
      'El DAO debe implementar buscarPorCriterio y actualizarEstado.'
    );
  }

  /**
   * RF48 - Buscar un propietario por nombre o documento.
   * Caso alternativo: búsqueda vacía o propietario inexistente.
   */
  async function buscarPropietario(criterio) {
    const busqueda =
      typeof criterio === 'string' ? criterio.trim() : '';

    if (!busqueda) {
      return {
        exito: false,
        mensaje: MENSAJES_ESTADO_PROPIETARIO.BUSQUEDA_VACIA,
        propietario: null,
      };
    }

    try {
      const propietario =
        await propietarioDAO.buscarPorCriterio(busqueda);

      if (!propietario) {
        return {
          exito: false,
          mensaje: MENSAJES_ESTADO_PROPIETARIO.NO_ENCONTRADO,
          propietario: null,
        };
      }

      return {
        exito: true,
        mensaje: 'Propietario encontrado.',
        propietario,
      };
    } catch (error) {
      return {
        exito: false,
        mensaje: MENSAJES_ESTADO_PROPIETARIO.ERROR_CONSULTA,
        propietario: null,
        error,
      };
    }
  }

  /**
   * RF48 - Activar o desactivar un propietario.
   * Caso alternativo: error al actualizar; el servicio informa
   * el fallo y no presenta la operación como exitosa.
   */
  async function gestionarEstado(propietarioId, nuevoEstado) {
    if (
      propietarioId === null ||
      propietarioId === undefined ||
      propietarioId === ''
    ) {
      return {
        exito: false,
        mensaje: 'El identificador del propietario es obligatorio.',
        propietario: null,
      };
    }

    if (!['Activo', 'Inactivo'].includes(nuevoEstado)) {
      return {
        exito: false,
        mensaje: MENSAJES_ESTADO_PROPIETARIO.ESTADO_INVALIDO,
        propietario: null,
      };
    }

    try {
      const propietarioActualizado =
        await propietarioDAO.actualizarEstado(
          propietarioId,
          nuevoEstado
        );

      if (!propietarioActualizado) {
        return {
          exito: false,
          mensaje: MENSAJES_ESTADO_PROPIETARIO.NO_ENCONTRADO,
          propietario: null,
        };
      }

      return {
        exito: true,
        mensaje: MENSAJES_ESTADO_PROPIETARIO.ACTUALIZADO,
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
  }

  return {
    buscarPropietario,
    gestionarEstado,
  };
}
