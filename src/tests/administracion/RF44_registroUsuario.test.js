/**
 * PETCARE - PRUEBAS TDD DEL RF44
 * Requerimiento: Registrar y gestionar cuentas de usuario.
 *
 * Archivo único de pruebas del RF44.
 *
 * Casos funcionales:
 * CP01: Registro exitoso.
 * CP02: Campos obligatorios incompletos.
 * CP03: Correo con formato inválido.
 * CP04: Error del servicio de registro.
 * CP05: Correo duplicado.
 * CP06: Contraseñas diferentes.
 *
 * También se comprueban las validaciones del formulario
 * y el servicio de consulta de usuarios.
 *
 * MVC:
 * - Vista: formulario de registro de usuario.
 * - Control/Servicio: gestionRegistroUsuario.js y usuariosService.js.
 * - DAO: usuariosDAO.js.
 *
 * TDD: las pruebas utilizan mocks para no crear usuarios
 * reales ni modificar datos de Supabase.
 *
 * Patrón AAA:
 * ARRANGE: preparar datos y dependencias.
 * ACT: ejecutar la función probada.
 * ASSERT: verificar resultados y efectos.
 */

// =====================================================
// MOCK DEL DAO
// Control/Servicio -> DAO -> Supabase.
// El mock evita acceder a la base de datos real.
// =====================================================

jest.mock('../../dao/administracion/usuariosDAO', () => ({
  consultarUsuariosDAO: jest.fn(),
}));

import {
  validarFormularioUsuario,
} from '../../services/administracion/validacionesUsuario';

import {
  gestionarRegistroUsuario,
} from '../../services/administracion/gestionRegistroUsuario';

import {
  consultarUsuariosDAO,
} from '../../dao/administracion/usuariosDAO';

import {
  consultarUsuarios,
} from '../../services/administracion/usuariosService';

// =====================================================
// DATOS COMUNES DE PRUEBA
// =====================================================

const formularioValido = {
  nombres: 'Camila',
  apellidos: 'Narvaez',
  dni: '12345678',
  correo: 'camila@example.com',
  telefono: '987654321',
  direccion: '',
  contrasena: 'ClaveSegura123',
  confirmarContrasena: 'ClaveSegura123',
  rol: 'Asistente',
};

describe('RF44 - Registro y gestión de cuentas de usuario', () => {
  beforeEach(() => {
    // ARRANGE GENERAL:
    // Aislar cada prueba para evitar interferencias entre mocks.
    jest.clearAllMocks();
  });

  // ===================================================
  // BLOQUE 1: CP01–CP06 DEL CASO DE USO CUS44
  // ===================================================

  describe('CUS44 - Gestionar cuentas: CP01–CP06', () => {
    test('CP01 - registra una cuenta con datos válidos', async () => {
      // ARRANGE:
      // Simular el servicio encargado de crear la cuenta.
      const registrarCuenta = jest.fn().mockResolvedValue({
        usuario: {
          perfil_id: 'usuario-prueba-01',
          correo: 'camila@example.com',
          rol: 'Asistente',
        },
      });

      // ACT:
      // El Control/Servicio procesa la solicitud de registro.
      const resultado = await gestionarRegistroUsuario(
        formularioValido,
        registrarCuenta
      );

      // ASSERT:
      // La operación debe finalizar con éxito.
      expect(resultado.ok).toBe(true);
      expect(resultado.tipo).toBe('exito');
      expect(resultado.usuario.perfil_id).toBe('usuario-prueba-01');
      expect(registrarCuenta).toHaveBeenCalledTimes(1);
      expect(registrarCuenta).toHaveBeenCalledWith(
        expect.objectContaining({
          nombres: 'Camila',
          apellidos: 'Narvaez',
          correo: 'camila@example.com',
          rol: 'Asistente',
        })
      );
    });

    test('CP02 - rechaza campos obligatorios incompletos', async () => {
      // ARRANGE:
      // El actor proporciona nombres y apellidos incompletos.
      const formularioIncompleto = {
        ...formularioValido,
        nombres: '',
        apellidos: '   ',
      };
      const registrarCuenta = jest.fn();

      // ACT:
      const resultado = await gestionarRegistroUsuario(
        formularioIncompleto,
        registrarCuenta
      );

      // ASSERT:
      // La validación impide ejecutar el registro.
      expect(resultado.ok).toBe(false);
      expect(resultado.tipo).toBe('validacion');
      expect(resultado.errores).toMatchObject({
        nombres: 'Ingresa los nombres del usuario.',
        apellidos: 'Ingresa los apellidos del usuario.',
      });
      expect(registrarCuenta).not.toHaveBeenCalled();
    });

    test('CP03 - rechaza un correo con formato inválido', async () => {
      // ARRANGE:
      const formularioInvalido = {
        ...formularioValido,
        correo: 'correo-invalido',
      };
      const registrarCuenta = jest.fn();

      // ACT:
      const resultado = await gestionarRegistroUsuario(
        formularioInvalido,
        registrarCuenta
      );

      // ASSERT:
      expect(resultado.ok).toBe(false);
      expect(resultado.tipo).toBe('validacion');
      expect(resultado.errores.correo).toBe(
        'Ingresa un correo electrónico válido.'
      );
      expect(registrarCuenta).not.toHaveBeenCalled();
    });

    test('CP04 - informa el error si falla el servicio de registro', async () => {
      // ARRANGE:
      // Simular un error de la dependencia de registro.
      const registrarCuenta = jest.fn().mockRejectedValue(
        new Error('Servicio no disponible')
      );

      // ACT:
      const resultado = await gestionarRegistroUsuario(
        formularioValido,
        registrarCuenta
      );

      // ASSERT:
      expect(resultado.ok).toBe(false);
      expect(resultado.tipo).toBe('error');
      expect(resultado.mensaje).toBe(
        'No se pudo completar el registro. Verifica los datos e inténtalo nuevamente.'
      );
      expect(registrarCuenta).toHaveBeenCalledTimes(1);
      expect(resultado.usuario).toBeUndefined();
    });

    test('CP05 - identifica el correo electrónico duplicado', async () => {
      // ARRANGE:
      // Simular la respuesta de una cuenta ya registrada.
      const registrarCuenta = jest.fn().mockResolvedValue({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'User already registered',
        },
      });

      // ACT:
      const resultado = await gestionarRegistroUsuario(
        formularioValido,
        registrarCuenta
      );

      // ASSERT:
      expect(resultado.ok).toBe(false);
      expect(resultado.tipo).toBe('duplicado');
      expect(resultado.errores.correo).toBe(
        'El correo electrónico ya se encuentra registrado.'
      );
      expect(registrarCuenta).toHaveBeenCalledTimes(1);
      expect(resultado.usuario).toBeUndefined();
    });

    test('CP06 - rechaza contraseñas diferentes antes de guardar', async () => {
      // ARRANGE:
      const formularioConClavesDiferentes = {
        ...formularioValido,
        confirmarContrasena: 'OtraClave123',
      };
      const registrarCuenta = jest.fn();

      // ACT:
      const resultado = await gestionarRegistroUsuario(
        formularioConClavesDiferentes,
        registrarCuenta
      );

      // ASSERT:
      expect(resultado.ok).toBe(false);
      expect(resultado.tipo).toBe('validacion');
      expect(resultado.errores.confirmarContrasena).toBe(
        'Las contraseñas no coinciden.'
      );
      expect(registrarCuenta).not.toHaveBeenCalled();
    });
  });

  // ===================================================
  // BLOQUE 2: VALIDACIONES DEL FORMULARIO
  // ===================================================

  describe('RF44 - Validaciones del formulario', () => {
    test('acepta un formulario válido', () => {
      // ARRANGE:
      const formulario = { ...formularioValido };

      // ACT:
      const errores = validarFormularioUsuario(formulario);

      // ASSERT:
      expect(errores).toEqual({});
    });

    test('rechaza los nombres vacíos', () => {
      // ARRANGE:
      const formulario = {
        ...formularioValido,
        nombres: '   ',
      };

      // ACT:
      const errores = validarFormularioUsuario(formulario);

      // ASSERT:
      expect(errores).toHaveProperty(
        'nombres',
        'Ingresa los nombres del usuario.'
      );
    });

    test('rechaza los apellidos vacíos', () => {
      // ARRANGE:
      const formulario = {
        ...formularioValido,
        apellidos: '',
      };

      // ACT:
      const errores = validarFormularioUsuario(formulario);

      // ASSERT:
      expect(errores).toHaveProperty(
        'apellidos',
        'Ingresa los apellidos del usuario.'
      );
    });

    test('rechaza un DNI vacío', () => {
      // ARRANGE:
      const formulario = {
        ...formularioValido,
        dni: '',
      };

      // ACT:
      const errores = validarFormularioUsuario(formulario);

      // ASSERT:
      expect(errores).toHaveProperty(
        'dni',
        'Ingresa el DNI del usuario.'
      );
    });

    test('rechaza un DNI que no tenga exactamente ocho dígitos', () => {
      // ARRANGE:
      const formulario = {
        ...formularioValido,
        dni: '1234567A',
      };

      // ACT:
      const errores = validarFormularioUsuario(formulario);

      // ASSERT:
      expect(errores).toHaveProperty(
        'dni',
        'El DNI debe contener exactamente 8 dígitos.'
      );
    });

    test('rechaza un correo vacío', () => {
      // ARRANGE:
      const formulario = {
        ...formularioValido,
        correo: '',
      };

      // ACT:
      const errores = validarFormularioUsuario(formulario);

      // ASSERT:
      expect(errores).toHaveProperty(
        'correo',
        'Ingresa el correo electrónico.'
      );
    });

    test('rechaza un correo con formato inválido', () => {
      // ARRANGE:
      const formulario = {
        ...formularioValido,
        correo: 'correo-invalido',
      };

      // ACT:
      const errores = validarFormularioUsuario(formulario);

      // ASSERT:
      expect(errores).toHaveProperty(
        'correo',
        'Ingresa un correo electrónico válido.'
      );
    });

    test('permite dejar el teléfono vacío', () => {
      // ARRANGE:
      const formulario = {
        ...formularioValido,
        telefono: '',
      };

      // ACT:
      const errores = validarFormularioUsuario(formulario);

      // ASSERT:
      expect(errores).toEqual({});
    });

    test('rechaza un teléfono que no comience con 9 o no tenga nueve dígitos', () => {
      // ARRANGE:
      const telefonoNoComienzaConNueve = {
        ...formularioValido,
        telefono: '812345678',
      };
      const telefonoCorto = {
        ...formularioValido,
        telefono: '98765432',
      };

      // ACT:
      const erroresInicio = validarFormularioUsuario(
        telefonoNoComienzaConNueve
      );
      const erroresLongitud = validarFormularioUsuario(
        telefonoCorto
      );

      // ASSERT:
      expect(erroresInicio).toHaveProperty(
        'telefono',
        'El celular debe tener 9 dígitos y comenzar con 9.'
      );
      expect(erroresLongitud).toHaveProperty(
        'telefono',
        'El celular debe tener 9 dígitos y comenzar con 9.'
      );
    });

    test('rechaza un rol que no esté permitido', () => {
      // ARRANGE:
      const formulario = {
        ...formularioValido,
        rol: 'Cliente',
      };

      // ACT:
      const errores = validarFormularioUsuario(formulario);

      // ASSERT:
      expect(errores).toHaveProperty(
        'rol',
        'Selecciona un rol válido.'
      );
    });

    test('rechaza una contraseña vacía', () => {
      // ARRANGE:
      const formulario = {
        ...formularioValido,
        contrasena: '',
        confirmarContrasena: '',
      };

      // ACT:
      const errores = validarFormularioUsuario(formulario);

      // ASSERT:
      expect(errores).toMatchObject({
        contrasena: 'Ingresa una contraseña.',
        confirmarContrasena: 'Confirma la contraseña.',
      });
    });

    test('rechaza una contraseña de menos de ocho caracteres', () => {
      // ARRANGE:
      const formulario = {
        ...formularioValido,
        contrasena: 'abc123',
        confirmarContrasena: 'abc123',
      };

      // ACT:
      const errores = validarFormularioUsuario(formulario);

      // ASSERT:
      expect(errores).toHaveProperty(
        'contrasena',
        'La contraseña debe tener al menos 8 caracteres.'
      );
    });

    test('rechaza contraseñas que no coinciden', () => {
      // ARRANGE:
      const formulario = {
        ...formularioValido,
        confirmarContrasena: 'OtraClave123',
      };

      // ACT:
      const errores = validarFormularioUsuario(formulario);

      // ASSERT:
      expect(errores).toHaveProperty(
        'confirmarContrasena',
        'Las contraseñas no coinciden.'
      );
    });

    test('permite una dirección vacía', () => {
      // ARRANGE:
      const formulario = {
        ...formularioValido,
        direccion: '',
      };

      // ACT:
      const errores = validarFormularioUsuario(formulario);

      // ASSERT:
      expect(errores).toEqual({});
    });

    test.each(['Administrador', 'Asistente'])(
      'acepta el rol permitido: %s',
      (rol) => {
        // ARRANGE:
        const formulario = {
          ...formularioValido,
          rol,
        };

        // ACT:
        const errores = validarFormularioUsuario(formulario);

        // ASSERT:
        expect(errores).toEqual({});
      }
    );
  });

  // ===================================================
  // BLOQUE 3: SERVICIO DE CONSULTA DE USUARIOS
  // ===================================================

  describe('RF44 - Servicio de consulta de usuarios', () => {
    test('devuelve los usuarios consultados mediante el DAO', async () => {
      // ARRANGE:
      const usuarios = [
        {
          perfil_id: 'usuario-1',
          nombre_completo: 'Camila Narvaez',
          documento_identidad: '12345678',
          telefono: '987654321',
          direccion: 'Mala',
          rol: 'Administrador',
          estado_cuenta: 'Activo',
        },
      ];
      consultarUsuariosDAO.mockResolvedValue(usuarios);

      // ACT:
      const resultado = await consultarUsuarios();

      // ASSERT:
      expect(consultarUsuariosDAO).toHaveBeenCalledTimes(1);
      expect(resultado).toEqual(usuarios);
    });

    test('normaliza los campos ausentes o nulos', async () => {
      // ARRANGE:
      consultarUsuariosDAO.mockResolvedValue([
        {
          perfil_id: 'usuario-2',
          nombre_completo: null,
          documento_identidad: null,
          telefono: null,
          direccion: null,
          rol: null,
          estado_cuenta: null,
        },
      ]);

      // ACT:
      const resultado = await consultarUsuarios();

      // ASSERT:
      expect(resultado).toEqual([
        {
          perfil_id: 'usuario-2',
          nombre_completo: 'Sin nombre',
          documento_identidad: '',
          telefono: '',
          direccion: '',
          rol: 'Sin rol',
          estado_cuenta: 'Inactivo',
        },
      ]);
    });

    test('devuelve una lista vacía cuando no hay usuarios', async () => {
      // ARRANGE:
      consultarUsuariosDAO.mockResolvedValue([]);

      // ACT:
      const resultado = await consultarUsuarios();

      // ASSERT:
      expect(resultado).toEqual([]);
      expect(consultarUsuariosDAO).toHaveBeenCalledTimes(1);
    });

    test('propaga el error cuando falla la consulta del DAO', async () => {
      // ARRANGE:
      const error = new Error(
        'Error de conexión con la base de datos'
      );
      consultarUsuariosDAO.mockRejectedValue(error);

      // ACT y ASSERT:
      await expect(consultarUsuarios()).rejects.toBe(error);
    });
  });
});
