/**
 * RF44 - Administración de usuarios
 * Servicio de validación del formulario de usuario.
 *
 * Responsabilidad:
 * Validar los datos del formulario sin depender de React Native,
 * de la interfaz gráfica ni de Supabase.
 *
 * Esta separación facilita las pruebas unitarias con TDD.
 */

export function validarFormularioUsuario(formulario) {
  const errores = {};

  const {
    nombres = '',
    apellidos = '',
    dni = '',
    correo = '',
    telefono = '',
    rol = '',
    contrasena = '',
    confirmarContrasena = '',
  } = formulario || {};

  // Nombres obligatorios
  if (!nombres.trim()) {
    errores.nombres = 'Ingresa los nombres del usuario.';
  }

  // Apellidos obligatorios
  if (!apellidos.trim()) {
    errores.apellidos = 'Ingresa los apellidos del usuario.';
  }

  // DNI obligatorio y compuesto por exactamente ocho dígitos
  if (!dni.trim()) {
    errores.dni = 'Ingresa el DNI del usuario.';
  } else if (!/^\d{8}$/.test(dni.trim())) {
    errores.dni = 'El DNI debe contener exactamente 8 dígitos.';
  }

  // Correo obligatorio y con formato válido
  if (!correo.trim()) {
    errores.correo = 'Ingresa el correo electrónico.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
    errores.correo = 'Ingresa un correo electrónico válido.';
  }

  // Teléfono opcional; si se ingresa, debe comenzar con 9
  // y contener exactamente nueve dígitos.
  if (telefono.trim() && !/^9\d{8}$/.test(telefono.trim())) {
    errores.telefono =
      'El celular debe tener 9 dígitos y comenzar con 9.';
  }

  // Roles permitidos
  if (!['Administrador', 'Asistente'].includes(rol)) {
    errores.rol = 'Selecciona un rol válido.';
  }

  // Contraseña obligatoria y con un mínimo de ocho caracteres
  if (!contrasena) {
    errores.contrasena = 'Ingresa una contraseña.';
  } else if (contrasena.length < 8) {
    errores.contrasena =
      'La contraseña debe tener al menos 8 caracteres.';
  }

  // Confirmación obligatoria y coincidente
  if (!confirmarContrasena) {
    errores.confirmarContrasena = 'Confirma la contraseña.';
  } else if (contrasena !== confirmarContrasena) {
    errores.confirmarContrasena =
      'Las contraseñas no coinciden.';
  }

  return errores;
}
