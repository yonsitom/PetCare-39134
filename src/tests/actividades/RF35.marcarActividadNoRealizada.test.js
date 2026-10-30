describe('RF35 - Marcar actividad como No realizada', () => {
  const actividadOriginal = {
    actividad_id: 1,
    descripcion: 'Dieta blanda',
    estado: 'Pendiente',
  };

  function marcarNoRealizada(
    actividad,
    motivo,
    { confirmar = true, servicioDisponible = true } = {}
  ) {
    // Si se cancela, no se modifica la actividad.
    if (!confirmar) {
      return { ...actividad };
    }

    if (!actividad) {
      throw new Error('La actividad no existe o no está disponible.');
    }

    if (actividad.estado !== 'Pendiente') {
      throw new Error(
        'Solo se pueden modificar actividades pendientes.'
      );
    }

    const motivoNormalizado = String(motivo ?? '').trim();

    if (!motivoNormalizado) {
      throw new Error(
        'Debes indicar el motivo por el que no se realizó la actividad.'
      );
    }

    if (!servicioDisponible) {
      throw new Error(
        'No se pudo actualizar la actividad. Intente nuevamente.'
      );
    }

    return {
      ...actividad,
      estado: 'No realizada',
      motivo_no_realizada: motivoNormalizado,
    };
  }

  test('CP01: marca la actividad como No realizada con motivo válido', () => {
    const resultado = marcarNoRealizada(
      actividadOriginal,
      'El propietario no aceptó el procedimiento.'
    );

    expect(resultado.estado).toBe('No realizada');
    expect(resultado.motivo_no_realizada).toBe(
      'El propietario no aceptó el procedimiento.'
    );
  });

  test('E1: rechaza el motivo vacío', () => {
    expect(() =>
      marcarNoRealizada(actividadOriginal, '   ')
    ).toThrow(
      'Debes indicar el motivo por el que no se realizó la actividad.'
    );
  });

  test.each(['Completada', 'No realizada'])(
    'E2: rechaza una actividad que ya está en estado %s',
    (estado) => {
      expect(() =>
        marcarNoRealizada(
          { ...actividadOriginal, estado },
          'Motivo de prueba'
        )
      ).toThrow(
        'Solo se pueden modificar actividades pendientes.'
      );
    }
  );

  test('E3: cancelar conserva el estado original', () => {
    const resultado = marcarNoRealizada(
      actividadOriginal,
      'Motivo de prueba',
      { confirmar: false }
    );

    expect(resultado).toEqual(actividadOriginal);
    expect(resultado.estado).toBe('Pendiente');
  });

  test('E4: informa cuando falla el servicio de actualización', () => {
    expect(() =>
      marcarNoRealizada(
        actividadOriginal,
        'El propietario no aceptó el procedimiento.',
        { servicioDisponible: false }
      )
    ).toThrow(
      'No se pudo actualizar la actividad. Intente nuevamente.'
    );
  });
});