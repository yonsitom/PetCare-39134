describe('RF36 - Reactivar actividad', () => {
  const actividadOriginal = {
    actividad_id: 1,
    descripcion: 'Dieta blanda',
    estado: 'No realizada',
    motivo_no_realizada: 'El propietario no aceptó el procedimiento.',
  };

  function reactivarActividad(
    actividad,
    { confirmar = true, servicioDisponible = true } = {}
  ) {
    if (!confirmar) {
      return { ...actividad };
    }

    if (!actividad) {
      throw new Error('La actividad no existe o no está disponible.');
    }

    if (actividad.estado !== 'No realizada') {
      throw new Error(
        'Solo se pueden reactivar actividades no realizadas.'
      );
    }

    if (!servicioDisponible) {
      throw new Error(
        'No se pudo reactivar la actividad. Intente nuevamente.'
      );
    }

    return {
      ...actividad,
      estado: 'Pendiente',
    };
  }

  test('CP01: reactiva una actividad No realizada', () => {
    const resultado = reactivarActividad(actividadOriginal);

    expect(resultado.estado).toBe('Pendiente');
    expect(resultado.descripcion).toBe('Dieta blanda');
  });

  test.each(['Pendiente', 'Completada'])(
    'E1: rechaza la reactivación si la actividad está %s',
    (estado) => {
      expect(() =>
        reactivarActividad({
          ...actividadOriginal,
          estado,
        })
      ).toThrow(
        'Solo se pueden reactivar actividades no realizadas.'
      );
    }
  );

  test('E2: cancelar conserva la actividad sin cambios', () => {
    const resultado = reactivarActividad(actividadOriginal, {
      confirmar: false,
    });

    expect(resultado).toEqual(actividadOriginal);
    expect(resultado.estado).toBe('No realizada');
  });

  test('E3: informa si falla el servicio de actualización', () => {
    expect(() =>
      reactivarActividad(actividadOriginal, {
        servicioDisponible: false,
      })
    ).toThrow(
      'No se pudo reactivar la actividad. Intente nuevamente.'
    );
  });
});