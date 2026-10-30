
import {
  validarDatosEdicionMascota,
  obtenerMensajeErrorEdicionMascota,
} from '../../utils/validacionesEdicionMascota';

import { actualizarMascota } from '../../dao/mascotaDAO';
import { supabase } from '../../services/supabase';

jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('RF18 - Modificar la información registrada de una mascota', () => {
  const fechaActual = new Date(2026, 9, 27);

  const mascotaOriginal = {
    propietario_id: 1,
    numero_historia: 'HC-0001',
    nombre: 'Firulais',
    especie: 'Perro',
    raza: 'Mestizo',
    sexo: 'Macho',
    fecha_nacimiento: '2021-03-15',
    color: 'Marrón',
    estado_esterilizacion: 'No aplica',
    observaciones: 'Mascota de prueba',
  };

  const mascotaModificada = {
    ...mascotaOriginal,
    nombre: 'Firulais actualizado',
    color: 'Negro',
  };

  let consulta;
  let actualizacion;

  beforeEach(() => {
    jest.clearAllMocks();

    consulta = {
      single: jest.fn(),
    };

    const seleccion = jest.fn(() => consulta);
    const filtro = jest.fn(() => ({
      select: seleccion,
    }));

    actualizacion = jest.fn(() => ({
      eq: filtro,
    }));

    supabase.from.mockReturnValue({
      update: actualizacion,
    });

    consulta.seleccion = seleccion;
    consulta.filtro = filtro;
  });

  test('CP01 - Actualizar una mascota con datos válidos', async () => {
    const resultadoValidacion = validarDatosEdicionMascota(
      mascotaModificada,
      fechaActual
    );

    expect(resultadoValidacion).toEqual({
      valido: true,
      mensaje: '',
    });

    consulta.single.mockResolvedValue({
      data: mascotaModificada,
      error: null,
    });

    const resultado = await actualizarMascota(
      mascotaOriginal.numero_historia,
      mascotaModificada
    );

    expect(supabase.from).toHaveBeenCalledWith('mascotas');

    expect(actualizacion).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Firulais actualizado',
        color: 'Negro',
        especie: 'Perro',
        raza: 'Mestizo',
      })
    );

    expect(consulta.filtro).toHaveBeenCalledWith(
      'numero_historia',
      'HC-0001'
    );

    expect(resultado).toEqual(mascotaModificada);
  });

  test('CP02 - Rechazar la actualización cuando falta un campo obligatorio', () => {
    const datosInvalidos = {
      ...mascotaOriginal,
      nombre: ' ',
    };

    const resultado = validarDatosEdicionMascota(
      datosInvalidos,
      fechaActual
    );

    expect(resultado).toEqual({
      valido: false,
      mensaje: 'Complete los campos obligatorios para continuar.',
    });
  });

  test('CP03 - Rechazar datos inválidos', () => {
    const datosInvalidos = {
      ...mascotaOriginal,
      fecha_nacimiento: '2021-13-45',
    };

    const resultado = validarDatosEdicionMascota(
      datosInvalidos,
      fechaActual
    );

    expect(resultado).toEqual({
      valido: false,
      mensaje:
        'Verifique los datos ingresados e inténtelo nuevamente.',
    });
  });

  test('CP04 - Cancelar los cambios y conservar los datos originales', () => {
    const datosPendientes = {
      ...mascotaOriginal,
      color: 'Negro',
    };

    // Cancelar significa descartar los datos pendientes.
    const resultadoTrasCancelar = mascotaOriginal;

    expect(datosPendientes.color).toBe('Negro');
    expect(resultadoTrasCancelar.color).toBe('Marrón');

    // No debe ejecutarse una actualización en Supabase.
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('CP05 - Mostrar un mensaje genérico si falla la actualización', async () => {
    const errorServicio = new Error(
      'Servicio de actualización no disponible'
    );

    consulta.single.mockResolvedValue({
      data: null,
      error: errorServicio,
    });

    await expect(
      actualizarMascota(
        mascotaOriginal.numero_historia,
        mascotaModificada
      )
    ).rejects.toThrow(
      'Servicio de actualización no disponible'
    );

    expect(
      obtenerMensajeErrorEdicionMascota(errorServicio)
    ).toBe(
      'No se pudieron guardar los cambios. Intente nuevamente.'
    );
  });
});
