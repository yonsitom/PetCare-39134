
import { supabase } from './supabase';
import { consultarPerfilPorId } from '../dao/perfilDAO';
import { logger } from '../utils/logger';

// ============================================================
// RF05 - CONSULTAR Y ACTUALIZAR LA INFORMACIÓN DEL PERFIL
// Servicio de negocio de PetCare.
// ============================================================

export const MENSAJES_RF05 = {
  obligatorios: 'Complete los campos obligatorios para continuar.',
  correo: 'Ingrese un formato de correo electrónico válido.',
  correoDuplicado: 'El correo electrónico ya se encuentra registrado.',
  telefono: 'Ingrese un número de teléfono válido.',
  guardar: 'No se pudieron guardar los cambios. Intente nuevamente.',
};

// ============================================================
// RF02 - VERIFICAR SI LA CUENTA ESTÁ ACTIVA
// RF05 - CONSULTAR EL PERFIL DEL USUARIO
// ============================================================

export async function verificarCuentaActiva(usuarioId) {
  if (!usuarioId) {
    return {
      autorizada: false,
      mensaje: 'No se encontró una sesión activa.',
      perfil: null,
    };
  }

  try {
    const perfil = await consultarPerfilPorId(usuarioId);

    if (!perfil) {
      return {
        autorizada: false,
        mensaje: 'No se encontró el perfil del usuario.',
        perfil: null,
      };
    }

    if (perfil.estado_cuenta !== 'Activo') {
      return {
        autorizada: false,
        mensaje:
          'Tu cuenta está inactiva. Comunícate con el administrador.',
        perfil,
      };
    }

    return {
      autorizada: true,
      mensaje: '',
      perfil,
    };
  } catch (error) {
    logger.error(
      'Error al verificar la cuenta del usuario:',
      error
    );

    throw error;
  }
}

// ============================================================
// RF05 - VALIDAR LOS DATOS DEL PERFIL
// ============================================================

export function validarDatosPerfil(datos) {
  const nombres = String(datos?.nombres ?? '').trim();
  const apellidos = String(datos?.apellidos ?? '').trim();
  const correo = String(datos?.correo ?? '').trim();
  const telefono = String(datos?.telefono ?? '').trim();
  const direccion = String(datos?.direccion ?? '').trim();

  if (!nombres || !apellidos || !correo || !telefono || !direccion) {
    let campo = 'direccion';

    if (!nombres) campo = 'nombres';
    else if (!apellidos) campo = 'apellidos';
    else if (!correo) campo = 'correo';
    else if (!telefono) campo = 'telefono';

    return {
      valido: false,
      campo,
      mensaje: MENSAJES_RF05.obligatorios,
    };
  }

  const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!formatoCorreo.test(correo)) {
    return {
      valido: false,
      campo: 'correo',
      mensaje: MENSAJES_RF05.correo,
    };
  }

  // Regla de PetCare: teléfono peruano de 9 dígitos
  // que comienza con 9.
  if (!/^9\d{8}$/.test(telefono)) {
    return {
      valido: false,
      campo: 'telefono',
      mensaje: MENSAJES_RF05.telefono,
    };
  }

  return {
    valido: true,
    campo: null,
    mensaje: '',
  };
}

// ============================================================
// RF05 - ACTUALIZAR LOS DATOS DEL PERFIL
// ============================================================

export async function actualizarPerfilUsuario({
  perfilId,
  correoOriginal,
  datos,
  cliente = supabase,
  guardarDatos,
}) {
  const validacion = validarDatosPerfil(datos);

  if (!validacion.valido) {
    const error = new Error(validacion.mensaje);
    error.campo = validacion.campo;
    throw error;
  }

  if (!perfilId) {
    throw new Error('No se encontró una sesión activa.');
  }

  const correoNuevo = String(datos.correo).trim();
  const correoAnterior = String(correoOriginal ?? '').trim();

  const correoCambio =
    correoNuevo.toLowerCase() !== correoAnterior.toLowerCase();

  const datosActualizados = {
    nombre_completo:
      `${datos.nombres.trim()} ${datos.apellidos.trim()}`.trim(),
    telefono: datos.telefono.trim(),
    direccion: datos.direccion.trim(),
  };

  try {
    // Comprueba que exista una sesión y que pertenezca al perfil.
    const {
      data: { user },
      error: errorUsuario,
    } = await cliente.auth.getUser();

    if (errorUsuario || !user || user.id !== perfilId) {
      throw new Error('No se encontró una sesión activa.');
    }

    // Si cambia el correo, Supabase gestiona su confirmación.
    if (correoCambio) {
      const { error: errorCorreo } = await cliente.auth.updateUser({
        email: correoNuevo,
      });

      if (errorCorreo) {
        const mensajeOriginal = errorCorreo.message || '';

        if (
          /already|registered|exists|duplicate|user_already_exists/i.test(
            mensajeOriginal
          )
        ) {
          throw new Error(MENSAJES_RF05.correoDuplicado);
        }

        throw new Error(MENSAJES_RF05.guardar);
      }
    }

    // Guarda los datos personales del perfil.
    if (typeof guardarDatos === 'function') {
      await guardarDatos(perfilId, datosActualizados);
    } else {
      const { error: errorActualizacion } = await cliente
        .from('perfiles')
        .update(datosActualizados)
        .eq('perfil_id', perfilId);

      if (errorActualizacion) {
        throw errorActualizacion;
      }
    }

    return {
      actualizado: true,
      correoPendienteConfirmacion: correoCambio,
      correoActual: correoOriginal,
      correoNuevo: correoCambio ? correoNuevo : correoOriginal,
      exitoso: true,
      requiereVerificacionCorreo: correoCambio,
      mensaje: correoCambio
        ? 'Revisa tu correo electrónico y sigue las instrucciones de confirmación para completar el cambio.'
        : 'Los datos de su perfil se actualizaron correctamente.',
    };
  } catch (error) {
    logger.error('RF05: error al guardar los datos del perfil:', error);

    if (
      error.message === 'No se encontró una sesión activa.' ||
      error.message === MENSAJES_RF05.correoDuplicado ||
      error.message === MENSAJES_RF05.guardar
    ) {
      throw error;
    }

    throw new Error(MENSAJES_RF05.guardar);
  }
}
