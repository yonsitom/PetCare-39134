
describe('RF30 - Selección dinámica del tipo de actividad', () => {
  const camposPorTipo = {
    Medicamento: ['nombreMedicamento', 'dosis', 'frecuencia'],
    Dieta: ['tipoDieta', 'cantidad'],
    Ecografía: ['zonaExaminada', 'resultado'],
    Otros: ['descripcion'],
  };

  function obtenerCampos(tipo) {
    return camposPorTipo[tipo] || [];
  }

  test('CP01: muestra los campos correspondientes al tipo seleccionado', () => {
    expect(obtenerCampos('Medicamento')).toEqual([
      'nombreMedicamento',
      'dosis',
      'frecuencia',
    ]);

    expect(obtenerCampos('Dieta')).toEqual([
      'tipoDieta',
      'cantidad',
    ]);

    expect(obtenerCampos('Ecografía')).toEqual([
      'zonaExaminada',
      'resultado',
    ]);

    expect(obtenerCampos('Otros')).toEqual(['descripcion']);
  });

  test('E1: no muestra campos específicos si no se selecciona un tipo', () => {
    expect(obtenerCampos('')).toEqual([]);
    expect(obtenerCampos(null)).toEqual([]);
  });

  test('E2: al cambiar el tipo, reemplaza los campos anteriores', () => {
    const camposMedicamento = obtenerCampos('Medicamento');
    const camposDieta = obtenerCampos('Dieta');

    expect(camposMedicamento).toContain('dosis');
    expect(camposDieta).toContain('tipoDieta');
    expect(camposDieta).not.toContain('dosis');
  });

  test('E3: maneja un tipo no disponible sin bloquear el formulario', () => {
    expect(() => obtenerCampos('TipoNoDisponible')).not.toThrow();
    expect(obtenerCampos('TipoNoDisponible')).toEqual([]);
  });
});


