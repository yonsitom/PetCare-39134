
const MENSAJES = {
  rolNoValido: 'No se pudo verificar el rol. Intente nuevamente.',
  cuentaInactiva:
    'La cuenta se encuentra inactiva. Comuníquese con el administrador.',
  errorPanel: 'No se pudo cargar el panel. Intente nuevamente.',
};

const FUNCIONES_POR_ROL = {
  administrador: {
    atenciones: true,
    actividades: true,
    seguimiento: true,
    administracion: true,
    indicadores: true,
  },

  asistente: {
    atenciones: true,
    actividades: true,
    seguimiento: true,
    administracion: false,
    indicadores: true,
  },
};

function normalizarRol(rol) {
  return typeof rol === 'string' ? rol.trim().toLowerCase() : '';
}

export function crearControladorRolUsuario({
  consultarPerfil,
  cargarFunciones,
  cerrarSesion,
}) {
  async function identificarRol(usuarioId) {
    let rolIdentificado = '';

    try {
      const perfil = await consultarPerfil(usuarioId);

      if (perfil.estado_cuenta !== 'Activo') {
        await cerrarSesion();

        return {
          autorizado: false,
          rol: perfil.rol || '',
          funciones: null,
          mensaje: MENSAJES.cuentaInactiva,
        };
      }

      const rolNormalizado = normalizarRol(perfil.rol);

      if (!['administrador', 'asistente'].includes(rolNormalizado)) {
        await cerrarSesion();

        return {
          autorizado: false,
          rol: '',
          funciones: null,
          mensaje: MENSAJES.rolNoValido,
        };
      }

      rolIdentificado =
        rolNormalizado === 'administrador'
          ? 'Administrador'
          : 'Asistente';

      const funcionesCargadas = await cargarFunciones(rolIdentificado);

      const funciones = {
        ...funcionesCargadas,
        ...FUNCIONES_POR_ROL[rolNormalizado],
      };

      return {
        autorizado: true,
        rol: rolIdentificado,
        funciones,
        mensaje: '',
      };
    } catch (error) {
      try {
        await cerrarSesion();
      } catch (errorCierre) {
        // Se conserva el resultado del error original.
      }

      return {
        autorizado: false,
        rol: rolIdentificado,
        funciones: null,
        mensaje: rolIdentificado
          ? MENSAJES.errorPanel
          : MENSAJES.rolNoValido,
      };
    }
  }

  return {
    identificarRol,
  };
}
