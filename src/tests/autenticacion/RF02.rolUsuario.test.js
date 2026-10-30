
import { crearControladorRolUsuario } from '../../controllers/autenticacion/rolUsuarioControlador';

describe('RF02 - Identificar el rol del usuario y mostrar sus funciones', () => {
  let consultarPerfil;
  let cargarFunciones;
  let cerrarSesion;
  let controlador;

  beforeEach(() => {
    consultarPerfil = jest.fn();
    cargarFunciones = jest.fn().mockResolvedValue({
      atenciones: true,
      actividades: true,
      seguimiento: true,
      administracion: false,
      indicadores: false,
    });
    cerrarSesion = jest.fn().mockResolvedValue(undefined);

    controlador = crearControladorRolUsuario({
      consultarPerfil,
      cargarFunciones,
      cerrarSesion,
    });
  });

  test('CP01 - Administrador: identifica el rol y habilita las funciones administrativas', async () => {
    consultarPerfil.mockResolvedValue({
      rol: 'Administrador',
      estado_cuenta: 'Activo',
    });

    cargarFunciones.mockResolvedValue({
      atenciones: true,
      actividades: true,
      seguimiento: true,
      administracion: true,
      indicadores: true,
    });

    const resultado = await controlador.identificarRol('usuario-admin');

    expect(resultado.autorizado).toBe(true);
    expect(resultado.rol).toBe('Administrador');
    expect(resultado.funciones.administracion).toBe(true);
    expect(resultado.funciones.indicadores).toBe(true);
    expect(cargarFunciones).toHaveBeenCalledWith('Administrador');
  });

  test('CP02 - Asistente: muestra las funciones operativas y oculta las administrativas', async () => {
    consultarPerfil.mockResolvedValue({
      rol: 'Asistente',
      estado_cuenta: 'Activo',
    });

    const resultado = await controlador.identificarRol('usuario-asistente');

    expect(resultado.autorizado).toBe(true);
    expect(resultado.rol).toBe('Asistente');
    expect(resultado.funciones.atenciones).toBe(true);
    expect(resultado.funciones.actividades).toBe(true);
    expect(resultado.funciones.seguimiento).toBe(true);
    expect(resultado.funciones.administracion).toBe(false);
expect(resultado.funciones.indicadores).toBe(true); 
  });

  test('CP03 - Rol no vÃ¡lido: rechaza el acceso y muestra el mensaje definido', async () => {
    consultarPerfil.mockResolvedValue({
      rol: '',
      estado_cuenta: 'Activo',
    });

    const resultado = await controlador.identificarRol('usuario-sin-rol');

    expect(resultado.autorizado).toBe(false);
    expect(resultado.mensaje).toBe(
      'No se pudo verificar el rol. Intente nuevamente.'
    );
    expect(resultado.funciones).toBeNull();
    expect(cargarFunciones).not.toHaveBeenCalled();
    expect(cerrarSesion).toHaveBeenCalled();
  });

  test('CP04 - Cuenta inactiva: bloquea el acceso y muestra el mensaje definido', async () => {
    consultarPerfil.mockResolvedValue({
      rol: 'Asistente',
      estado_cuenta: 'Inactiva',
    });

    const resultado = await controlador.identificarRol('usuario-inactivo');

    expect(resultado.autorizado).toBe(false);
    expect(resultado.mensaje).toBe(
      'La cuenta se encuentra inactiva. Comuníquese con el administrador.'
    );
    expect(resultado.funciones).toBeNull();
    expect(cargarFunciones).not.toHaveBeenCalled();
    expect(cerrarSesion).toHaveBeenCalled();
  });

  test('CP05 - Error al cargar funciones: informa el error y no autoriza el panel', async () => {
    consultarPerfil.mockResolvedValue({
      rol: 'Asistente',
      estado_cuenta: 'Activo',
    });

    cargarFunciones.mockRejectedValue(new Error('Error simulado'));

    const resultado = await controlador.identificarRol('usuario-asistente');

    expect(resultado.autorizado).toBe(false);
    expect(resultado.rol).toBe('Asistente');
    expect(resultado.mensaje).toBe(
      'No se pudo cargar el panel. Intente nuevamente.'
    );
    expect(resultado.funciones).toBeNull();
    expect(cerrarSesion).toHaveBeenCalled();
  });
});

