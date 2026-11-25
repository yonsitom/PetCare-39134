
import { Platform } from 'react-native';
import { supabase } from '../supabase';

import {
  consultarPerfilPorId,
  actualizarDatosPerfil,
} from '../../dao/autentificacion/perfilDAO';

// ============================================================
// PETCARE - SERVICIO DE PERFILES
// RF02: Verificar cuenta activa.
// RF05: Consultar, validar y actualizar información del perfil.
//
// Arquitectura:
// Vista -> Controlador -> Servicio -> DAO -> Supabase.
//
// Los datos personales se guardan en perfiles.
// El correo electrónico se actualiza mediante Supabase Auth.
// El cambio de correo requiere confirmación.
// ============================================================

export const MENSAJES_RF05 = {
  obligatorios: 'Complete los campos obligatorios para continuar.',
  correo: 'Ingrese un formato de correo electrónico válido.',
  correoDuplicado: 'El correo electrónico ya se encuentra registrado.',
  telefono: 'Ingrese un número de teléfono válido.',
  guardar: 'No se pudieron guardar los cambios. Intente nuevamente.',
};

// ============================================================
// RF05 - URL EXCLUSIVA PARA CONFIRMAR CAMBIO DE CORREO
// ============================================================

function obtenerUrlRetornoCorreo() {
  const ruta = '/usuario/confirmarCambioCorreo';

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${ruta}`;
    }

    return `http://localhost:8081${ruta}`;
  }

  return `petcare://usuario/confirmarCambioCorreo`;
}

// ============================================================
// RF02 - VERIFICAR SI LA CUENTA ESTÁ ACTIVA
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
    console.error('RF02: error al verificar la cuenta:', error);
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
// RF05 - IDENTIFICAR ERRORES DE CORREO DUPLICADO
// ============================================================

function esCorreoDuplicado(error) {
  const mensaje = String(error?.message ?? '');

  return (
    error?.code === 'email_exists' ||
    error?.code === 'user_already_exists' ||
    /already registered|already exists|duplicate|email_exists|user_already_exists/i.test(
      mensaje
    )
  );
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

  const correoNuevo = String(datos.correo).trim().toLowerCase();

  const datosActualizados = {
    nombre_completo:
      `${String(datos.nombres).trim()} ${String(datos.apellidos).trim()}`.trim(),
    telefono: String(datos.telefono).trim(),
    direccion: String(datos.direccion).trim(),
  };

  try {
    // --------------------------------------------------------
    // 1. Verificar la sesión autenticada.
    // --------------------------------------------------------

    const {
      data: { user },
      error: errorUsuario,
    } = await cliente.auth.getUser();

    if (errorUsuario) {
      console.error('RF05 - Error al consultar usuario Auth:', {
        message: errorUsuario.message,
        code: errorUsuario.code,
        status: errorUsuario.status,
      });

      throw new Error('No se pudo verificar la sesión del usuario.');
    }

    if (!user || user.id !== perfilId) {
      throw new Error('No se encontró una sesión activa.');
    }

    const correoAnterior = String(
      user.email ?? correoOriginal ?? ''
    ).trim().toLowerCase();

    const correoCambio = correoNuevo !== correoAnterior;

    // --------------------------------------------------------
    // 2. Solicitar cambio de correo mediante Supabase Auth.
    // --------------------------------------------------------

    if (correoCambio) {
      const urlRetorno = obtenerUrlRetornoCorreo();

      const {
        data: resultadoCorreo,
        error: errorCorreo,
      } = await cliente.auth.updateUser(
        {
          email: correoNuevo,
        },
        {
          emailRedirectTo: urlRetorno,
        }
      );

      if (errorCorreo) {
        console.error('RF05 - Error real al cambiar el correo:', {
          message: errorCorreo.message,
          code: errorCorreo.code,
          status: errorCorreo.status,
          details: errorCorreo.details,
          hint: errorCorreo.hint,
        });

        if (esCorreoDuplicado(errorCorreo)) {
          throw new Error(MENSAJES_RF05.correoDuplicado);
        }

        const error = new Error(
          errorCorreo.message || MENSAJES_RF05.guardar
        );

        error.codigoOriginal = errorCorreo.code;
        error.statusOriginal = errorCorreo.status;

        throw error;
      }

      console.info(
        'RF05 - Solicitud de cambio de correo enviada:',
        resultadoCorreo?.user?.email ?? correoNuevo
      );

      console.info(
        'RF05 - URL exclusiva de confirmación:',
        urlRetorno
      );
    }

    // --------------------------------------------------------
    // 3. Actualizar los datos personales mediante el DAO.
    // --------------------------------------------------------

    const guardarPerfil =
      typeof guardarDatos === 'function'
        ? guardarDatos
        : actualizarDatosPerfil;

    try {
      await guardarPerfil(perfilId, datosActualizados);
    } catch (errorPerfil) {
      console.error('RF05 - Error real al actualizar perfiles:', {
        message: errorPerfil?.message,
        code: errorPerfil?.code,
        details: errorPerfil?.details,
        hint: errorPerfil?.hint,
      });

      throw errorPerfil;
    }

    // --------------------------------------------------------
    // 4. Devolver el resultado al controlador.
    // --------------------------------------------------------

    return {
      actualizado: true,
      exitoso: true,
      correoPendienteConfirmacion: correoCambio,
      requiereVerificacionCorreo: correoCambio,
      correoActual: correoAnterior,
      correoNuevo: correoCambio ? correoNuevo : correoAnterior,
      mensaje: correoCambio
        ? 'Los datos del perfil se actualizaron. Revisa tu nuevo correo electrónico y sigue las instrucciones de confirmación para completar el cambio.'
        : 'Los datos de su perfil se actualizaron correctamente.',
    };
  } catch (error) {
    console.error(
      'RF05 - Detalle del error al guardar el perfil:',
      error
    );

    if (
      error.message === 'No se encontró una sesión activa.' ||
      error.message === MENSAJES_RF05.correoDuplicado ||
      error.message === 'No se pudo verificar la sesión del usuario.'
    ) {
      throw error;
    }

    const errorFinal = new Error(MENSAJES_RF05.guardar);
    errorFinal.causa = error?.message;
    errorFinal.codigo = error?.codigoOriginal ?? error?.code;

    throw errorFinal;
  }
}
