
jest.mock('../../services/supabase', () => {
  const mockMaybeSingle = jest.fn();
  const mockSingle = jest.fn();
  const mockInsert = jest.fn();

  const mockBuilder = {
    select: jest.fn(() => mockBuilder),
    eq: jest.fn(() => mockBuilder),
    ilike: jest.fn(() => mockBuilder),
    neq: jest.fn(() => mockBuilder),
    maybeSingle: mockMaybeSingle,
    insert: mockInsert,
    single: mockSingle,
  };

  return {
    supabase: {
      from: jest.fn(() => mockBuilder),
    },
    __mockBuilder: mockBuilder,
    __mockMaybeSingle: mockMaybeSingle,
    __mockSingle: mockSingle,
    __mockInsert: mockInsert,
  };
});

import { validarDatosPropietario } from '../../utils/validacionesPropietario';
import { registrarPropietario } from '../../dao/propietarioDAO';
import {
  __mockBuilder,
  __mockMaybeSingle,
  __mockSingle,
  __mockInsert,
} from '../../services/supabase';

describe('RF12 — Registrar los datos de un propietario', () => {
  const datosValidos = {
    nombre: 'Juan',
    apellido: 'Pérez',
    documento_identidad: '45678912',
    telefono: '987654321',
    correo: 'juan.perez@correo.com',
    direccion: '',
    observaciones: '',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Arrange: por defecto, las consultas de duplicidad
    // no encuentran registros y la inserción no se ejecuta.
    __mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    __mockSingle.mockResolvedValue({
      data: {
        propietario_id: 101,
        ...datosValidos,
        telefono: '+51987654321',
        estado: 'Activo',
      },
      error: null,
    });

    __mockInsert.mockReturnValue(__mockBuilder);
  });

  test('CP01 — registra correctamente un propietario', async () => {
    // Arrange: datos válidos, DNI y correo no registrados.
    __mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    // Act: registrar al propietario mediante el DAO.
    const resultado = await registrarPropietario(datosValidos);

    // Assert: se devuelve el registro y se intenta insertar.
    expect(resultado.propietario_id).toBe(101);
    expect(__mockInsert).toHaveBeenCalledTimes(1);
    expect(__mockBuilder.single).toHaveBeenCalledTimes(1);
  });

  test('CP02 — rechaza los campos obligatorios incompletos', () => {
    // Arrange: nombre y DNI vacíos.
    const datos = {
      ...datosValidos,
      nombre: '',
      documento_identidad: '',
    };

    // Act: validar los datos recibidos.
    const resultado = validarDatosPropietario(datos);

    // Assert: no son válidos y se identifican los errores.
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.nombre).toBeTruthy();
    expect(resultado.errores.documento_identidad).toBeTruthy();
  });

  test('CP03 — rechaza un DNI con formato incorrecto', () => {
    // Arrange: DNI con una letra.
    const datos = {
      ...datosValidos,
      documento_identidad: '4567891A',
    };

    // Act: validar los datos.
    const resultado = validarDatosPropietario(datos);

    // Assert: el DNI se rechaza.
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.documento_identidad).toBeTruthy();
  });

  test('CP04 — rechaza un DNI ya registrado', async () => {
    // Arrange: la consulta del DNI encuentra un propietario.
    __mockMaybeSingle.mockResolvedValueOnce({
      data: { propietario_id: 55 },
      error: null,
    });

    // Act: intentar registrar el mismo DNI.
    let errorObtenido;

    try {
      await registrarPropietario(datosValidos);
    } catch (error) {
      errorObtenido = error;
    }

    // Assert: se informa el duplicado y no se inserta.
    expect(errorObtenido).toBeDefined();
    expect(errorObtenido.code).toBe('DUPLICADO_DNI');
    expect(errorObtenido.message).toBe(
      'El DNI ya se encuentra registrado.'
    );
    expect(__mockInsert).not.toHaveBeenCalled();
  });

  test('CP05 — rechaza un correo con formato incorrecto', () => {
    // Arrange: correo inválido.
    const datos = {
      ...datosValidos,
      correo: 'juan.perez@.',
    };

    // Act: validar los datos.
    const resultado = validarDatosPropietario(datos);

    // Assert: el correo se rechaza.
    expect(resultado.valido).toBe(false);
    expect(resultado.errores.correo).toBeTruthy();
  });

  test('CP06 — rechaza un correo ya registrado', async () => {
    // Arrange: DNI libre y correo existente.
    __mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          propietario_id: 77,
          correo: datosValidos.correo,
        },
        error: null,
      });

    // Act: intentar registrar el correo duplicado.
    let errorObtenido;

    try {
      await registrarPropietario({
        ...datosValidos,
        documento_identidad: '45678914',
      });
    } catch (error) {
      errorObtenido = error;
    }

    // Assert: se informa el duplicado y no se inserta.
    expect(errorObtenido).toBeDefined();
    expect(errorObtenido.code).toBe('DUPLICADO_CORREO');
    expect(errorObtenido.message).toContain(
      'correo electrónico ya se encuentra registrado'
    );
    expect(__mockInsert).not.toHaveBeenCalled();
  });
});
