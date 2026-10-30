describe('RF33 - Eliminación de actividad', () => {
  const datosIniciales = [
    { actividad_id: 1, descripcion: 'Dieta blanda' },
    { actividad_id: 2, descripcion: 'Medicamento' },
  ];

  function eliminarActividad(
    actividades,
    id,
    confirmar = true,
    servicioDisponible = true
  ) {
    if (!confirmar) {
      return {
        eliminada: false,
        actividades,
      };
    }

    const existe = actividades.some(
      (actividad) => actividad.actividad_id === id
    );

    if (!existe) {
      throw new Error(
        'La actividad no existe o no está disponible.'
      );
    }

    if (!servicioDisponible) {
      throw new Error(
        'No se pudo eliminar la actividad. Intente nuevamente.'
      );
    }

    return {
      eliminada: true,
      actividades: actividades.filter(
        (actividad) => actividad.actividad_id !== id
      ),
    };
  }

  test('CP01: elimina correctamente la actividad seleccionada', () => {
    const resultado = eliminarActividad(
      datosIniciales,
      1
    );

    expect(resultado.eliminada).toBe(true);
    expect(resultado.actividades).toHaveLength(1);
    expect(
      resultado.actividades.some(
        (actividad) => actividad.actividad_id === 1
      )
    ).toBe(false);
  });

  test('E1: cancelar conserva la actividad', () => {
    const resultado = eliminarActividad(
      datosIniciales,
      1,
      false
    );

    expect(resultado.eliminada).toBe(false);
    expect(resultado.actividades).toEqual(datosIniciales);
    expect(resultado.actividades).toHaveLength(2);
  });

  test('E2: informa cuando la actividad no existe', () => {
    expect(() =>
      eliminarActividad(datosIniciales, 999)
    ).toThrow(
      'La actividad no existe o no está disponible.'
    );
  });

  test('E3: informa cuando falla el servicio de eliminación', () => {
    expect(() =>
      eliminarActividad(datosIniciales, 1, true, false)
    ).toThrow(
      'No se pudo eliminar la actividad. Intente nuevamente.'
    );
  });
});