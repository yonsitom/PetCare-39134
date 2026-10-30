
jest.mock('../../services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import { supabase } from '../../services/supabase';
import { actualizarMascota } from '../../dao/mascotaDAO';

describe('RF18 - DAO actualizarMascota', () => {
  const datosMascota = {
    propietario_id: 1,
    nombre: 'Firulais actualizado',
    especie: 'Perro',
    raza: 'Mestizo',
    sexo: 'Macho',
    fecha_nacimiento: '2021-03-15',
    color: 'Marrón',
    estado_esterilizacion: 'No aplica',
    observaciones: 'Actualización de prueba',
  };

  let consulta;

  beforeEach(() => {
    jest.clearAllMocks();

    consulta = {
      single: jest.fn(),
    };

    const seleccion = jest.fn(() => consulta);
    const filtro = jest.fn(() => ({
      select: seleccion,
    }));
    const actualizacion = jest.fn(() => ({
      eq: filtro,
    }));

    supabase.from.mockReturnValue({
      update: actualizacion,
    });

    consulta.seleccion = seleccion;
    consulta.filtro = filtro;
    consulta.actualizacion = actualizacion;
  });

  test('CP01 - Actualizar una mascota con datos válidos', async () => {
    const mascotaActualizada = {
      numero_historia: 'HC-0001',
      ...datosMascota,
    };

    consulta.single.mockResolvedValue({
      data: mascotaActualizada,
      error: null,
    });

    const resultado = await actualizarMascota(
      'HC-0001',
      datosMascota
    );

    expect(supabase.from).toHaveBeenCalledWith('mascotas');

    expect(consulta.actualizacion).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Firulais actualizado',
        especie: 'Perro',
        raza: 'Mestizo',
        propietario_id: 1,
        sexo: 'Macho',
        fecha_nacimiento: '2021-03-15',
        color: 'Marrón',
        estado_esterilizacion: 'No aplica',
        observaciones: 'Actualización de prueba',
      })
    );

    expect(consulta.filtro).toHaveBeenCalledWith(
      'numero_historia',
      'HC-0001'
    );

    expect(resultado).toEqual(mascotaActualizada);
  });

  test('CP05 - Propagar el error cuando Supabase no puede actualizar', async () => {
    const errorServicio = new Error(
      'Servicio de actualización no disponible'
    );

    consulta.single.mockResolvedValue({
      data: null,
      error: errorServicio,
    });

    await expect(
      actualizarMascota('HC-0001', datosMascota)
    ).rejects.toThrow(
      'Servicio de actualización no disponible'
    );
  });
});
