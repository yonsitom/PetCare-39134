
import { supabase } from './supabase';
import { logger } from '../utils/logger';

const MENSAJES = {
  campos: 'Complete todos los campos para continuar.',
  actualIncorrecta: 'La contraseña actual es incorrecta.',
  noCoinciden:
    'Las contraseñas nuevas no coinciden. Verifique los datos ingresados.',
  requisitos:
    'La contraseña debe tener mínimo 8 caracteres, incluyendo una mayúscula, una minúscula y un número.',
  igual:
    'La nueva contraseña debe ser diferente a la contraseña actual.',
};

function validarContrasenas({
  contrasenaActual,
  nuevaContrasena,
  confirmarContrasena,
}) {
  if (
    !contrasenaActual ||
    !nuevaContrasena ||
    !confirmarContrasena
  ) {
    throw new Error(MENSAJES.campos);
  }

  const cumpleRequisitos =
    nuevaContrasena.length >= 8 &&
    /[A-Z]/.test(nuevaContrasena) &&
    /[a-z]/.test(nuevaContrasena) &&
    /\d/.test(nuevaContrasena);

  if (!cumpleRequisitos) {
    throw new Error(MENSAJES.requisitos);
  }

  if (nuevaContrasena !== confirmarContrasena) {
    throw new Error(MENSAJES.noCoinciden);
  }

  if (nuevaContrasena === contrasenaActual) {
    throw new Error(MENSAJES.igual);
  }
}

export async function cambiarContrasena({
  contrasenaActual,
  nuevaContrasena,
  confirmarContrasena,
}) {
  validarContrasenas({
    contrasenaActual,
    nuevaContrasena,
    confirmarContrasena,
  });

  // Obtener el usuario que tiene la sesión activa.
  const { data: resultadoUsuario, error: errorUsuario } =
    await supabase.auth.getUser();

  if (errorUsuario) {
    throw new Error(
      'No se pudo verificar la sesión. Inicie sesión nuevamente.'
    );
  }

  const usuario = resultadoUsuario?.user;

  if (!usuario?.id || !usuario?.email) {
    throw new Error(
      'No se encontró una sesión válida. Inicie sesión nuevamente.'
    );
  }

  // Verificar la contraseña actual mediante Supabase Auth.
  const { data: resultadoVerificacion, error: errorVerificacion } =
    await supabase.auth.signInWithPassword({
      email: usuario.email,
      password: contrasenaActual,
    });

  if (errorVerificacion) {
    const codigo = String(errorVerificacion.code || '').toLowerCase();
    const mensaje = String(errorVerificacion.message || '').toLowerCase();

    if (
      codigo === 'invalid_credentials' ||
      mensaje.includes('invalid login credentials')
    ) {
      throw new Error(MENSAJES.actualIncorrecta);
    }

    logger.error(
      'Error verificando la contraseña actual:',
      errorVerificacion
    );

    throw new Error(
      'No se pudo verificar la contraseña actual. Intente nuevamente.'
    );
  }

  // Confirmar que la autenticación corresponde a la misma cuenta.
  if (resultadoVerificacion?.user?.id !== usuario.id) {
    throw new Error(
      'No se pudo verificar la cuenta actual. Intente nuevamente.'
    );
  }

  // Actualizar la contraseña en Supabase Auth.
  const { error: errorActualizacion } = await supabase.auth.updateUser({
    password: nuevaContrasena,
  });

  if (errorActualizacion) {
    logger.error(
      'Error actualizando la contraseña:',
      errorActualizacion
    );

    throw new Error(
      'No se pudo actualizar la contraseña. Intente nuevamente.'
    );
  }

  return { exito: true };
}
