/**
 * PETCARE - SERVICIO DE USUARIOS
 *
 * Requisitos:
 * - CUS44: consulta y normalización de usuarios.
 * - CUS45: activar o desactivar una cuenta.
 *
 * MVC:
 * El servicio coordina la lógica entre la vista y el DAO.
 *
 * DIAGRAMA DE SECUENCIAS CUS45:
 * Actor Administrador -> Vista -> Control/Servicio -> DAO.
 *
 * SOLID - Responsabilidad única:
 * El servicio aplica las reglas de la operación; el DAO
 * se encarga de consultar y actualizar Supabase.
 */

import {
  consultarUsuariosDAO,
  actualizarEstadoCuentaDAO,
} from '../../dao/administracion/usuariosDAO';

/**
 * CUS44: consulta los usuarios y normaliza los campos.
 */
export async function consultarUsuarios() {
  const usuarios = await consultarUsuariosDAO();

  return usuarios.map((usuario) => ({
    ...usuario,
    nombre_completo: usuario.nombre_completo || 'Sin nombre',
    documento_identidad: usuario.documento_identidad || '',
    telefono: usuario.telefono || '',
    direccion: usuario.direccion || '',
    rol: usuario.rol || 'Sin rol',
    estado_cuenta: usuario.estado_cuenta || 'Inactivo',
  }));
}

/**
 * CUS45: coordina la activación o desactivación de una cuenta.
 *
 * @param {Object} solicitud Datos de la operación.
 * @param {string} solicitud.perfilId Identificador del usuario.
 * @param {'Activo'|'Inactivo'} solicitud.nuevoEstado Estado solicitado.
 * @param {boolean} solicitud.confirmado Confirmación del Administrador.
 *
 * CP01: confirma y persiste el estado solicitado.
 * CP02: cancela sin llamar al DAO.
 * CP03: detecta que no se actualizó ninguna fila.
 * CP04: devuelve el error de actualización sin reportar éxito.
 */
export async function gestionarCambioEstadoCuenta({
  perfilId,
  nuevoEstado,
  confirmado,
}) {
  // ARRANGE / CONTROL:
  // Verificar que la solicitud tenga los datos necesarios.
  if (!confirmado) {
    // CP02 - La cancelación descarta la operación pendiente.
    // No se llama al DAO; la cuenta conserva su estado actual.
    return {
      ok: false,
      cancelado: true,
    };
  }

  if (!perfilId) {
    return {
      ok: false,
      cancelado: false,
      error: 'No se recibió el identificador del usuario.',
    };
  }

  if (!['Activo', 'Inactivo'].includes(nuevoEstado)) {
    return {
      ok: false,
      cancelado: false,
      error: 'El estado de cuenta solicitado no es válido.',
    };
  }

  try {
    // ACT / CONTROL -> DAO:
    // El Administrador ya confirmó la operación en la vista.
    const usuario = await actualizarEstadoCuentaDAO(
      perfilId,
      nuevoEstado
    );

    // ASSERT / CONTROL:
    // CP03 - Sin fila actualizada, no se debe informar éxito.
    if (!usuario) {
      return {
        ok: false,
        cancelado: false,
        error:
          'La cuenta no existe o no fue posible confirmar la actualización.',
      };
    }

    // CP01 - Supabase confirmó el cambio de estado.
    return {
      ok: true,
      cancelado: false,
      usuario,
    };
  } catch (error) {
    // CP04 - Se propaga el fallo como resultado controlado.
    // La interfaz no debe mostrar un mensaje de éxito.
    return {
      ok: false,
      cancelado: false,
      error:
        error?.message ||
        'No fue posible actualizar el estado de la cuenta.',
    };
  }
}
