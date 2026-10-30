describe('RF34 - Registro de actividad con estado Pendiente', () => {
  function registrarActividad(datos, atencion, opciones = {}) {
    if (
      !datos.tipo ||
      !datos.descripcion ||
      !datos.descripcion.trim() ||
      !datos.fechaPrevista
    ) {
      throw new Error('Debes completar los campos obligatorios.');
    }

    if (!atencion || atencion.estado !== 'Activa') {
      throw new Error(
        'No se pueden registrar actividades en una atención no activa.'
      );
    }

    if (opciones.falloEstadoInicial) {
      throw new Error(
        'No se pudo asignar el estado inicial de la actividad.'
      );
    }

    return {
      actividad_id: 1,
      ...datos,
      estado: 'Pendiente',
    };
  }

  const atencionActiva = {
    atencion_id: 1,
    estado: 'Activa',
  };

  const datosValidos = {
    tipo: 'Dieta',
    descripcion: 'Dieta blanda',
    fechaPrevista: '2026-10-25',
  };

  test('CP01: registra la actividad con estado Pendiente', () => {
    const resultado = registrarActividad(
      datosValidos,
      atencionActiva
    );

    expect(resultado.estado).toBe('Pendiente');
    expect(resultado.descripcion).toBe('Dieta blanda');
    expect(resultado.tipo).toBe('Dieta');
  });

  test('E1: rechaza el registro incompleto', () => {
    expect(() =>
      registrarActividad(
        { ...datosValidos, tipo: '' },
        atencionActiva
      )
    ).toThrow('Debes completar los campos obligatorios.');
  });

  test('E2: informa si falla la asignación del estado inicial', () => {
    expect(() =>
      registrarActividad(
        datosValidos,
        atencionActiva,
        { falloEstadoInicial: true }
      )
    ).toThrow(
      'No se pudo asignar el estado inicial de la actividad.'
    );
  });

  test('E3: rechaza el registro en una atención finalizada', () => {
    expect(() =>
      registrarActividad(datosValidos, {
        atencion_id: 1,
        estado: 'Finalizada',
      })
    ).toThrow(
      'No se pueden registrar actividades en una atención no activa.'
    );
  });
});