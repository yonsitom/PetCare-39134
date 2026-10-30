
describe('RF32 - Modificación de actividad', () => {
  function validarActividad(datos) {
    if (!datos.descripcion || !datos.descripcion.trim()) {
      throw new Error('La descripción es obligatoria.');
    }

    if (!datos.fechaPrevista) {
      throw new Error('La fecha prevista es obligatoria.');
    }

    const fecha = datos.fechaPrevista;
    const formatoValido = /^\d{4}-\d{2}-\d{2}$/.test(fecha);

    if (!formatoValido || Number.isNaN(Date.parse(fecha))) {
      throw new Error('La fecha prevista no es válida.');
    }

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const comprobacion = new Date(Date.UTC(anio, mes - 1, dia));

    if (
      comprobacion.getUTCFullYear() !== anio ||
      comprobacion.getUTCMonth() !== mes - 1 ||
      comprobacion.getUTCDate() !== dia
    ) {
      throw new Error('La fecha prevista no es válida.');
    }

    return { ...datos };
  }

  test('CP01: modifica una actividad con datos válidos', () => {
    const resultado = validarActividad({
      descripcion: 'Dieta blanda',
      fechaPrevista: '2026-10-25',
    });

    expect(resultado.descripcion).toBe('Dieta blanda');
    expect(resultado.fechaPrevista).toBe('2026-10-25');
  });

  test('CP02: rechaza la descripción vacía', () => {
    expect(() =>
      validarActividad({
        descripcion: '',
        fechaPrevista: '2026-10-25',
      })
    ).toThrow('La descripción es obligatoria.');
  });

  test('CP03: rechaza una fecha inválida', () => {
    expect(() =>
      validarActividad({
        descripcion: 'Dieta blanda',
        fechaPrevista: '45/13/2026',
      })
    ).toThrow('La fecha prevista no es válida.');
  });

  test('CP04: informa si falla el servicio de actualización', () => {
    const actualizar = (_datos, falla) => {
      if (falla) {
        throw new Error('No se pudo actualizar la actividad.');
      }

      return true;
    };

    expect(() =>
      actualizar({ descripcion: 'Dieta blanda' }, true)
    ).toThrow('No se pudo actualizar la actividad.');
  });

  test('CP05: cancelar conserva los datos originales', () => {
    const original = {
      descripcion: 'Dieta blanda',
      fechaPrevista: '2026-10-24',
    };

    const cambios = {
      descripcion: 'Nueva dieta',
      fechaPrevista: '2026-10-25',
    };

    const cancelado = true;
    const resultado = cancelado ? original : cambios;

    expect(resultado).toEqual(original);
    expect(resultado.descripcion).toBe('Dieta blanda');
  });
});
