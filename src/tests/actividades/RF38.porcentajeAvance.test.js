
describe('RF38 - Calcular porcentaje de avance', () => {
  function calcularAvance(actividades, servicioDisponible = true) {
    if (!servicioDisponible) {
      throw new Error(
        'No se pudo consultar el avance de la atención.'
      );
    }

    if (!Array.isArray(actividades)) {
      throw new Error(
        'La información de las actividades está incompleta.'
      );
    }

    if (
      actividades.some(
        (actividad) =>
          !actividad || typeof actividad.estado !== 'string'
      )
    ) {
      throw new Error(
        'La información de las actividades está incompleta.'
      );
    }

    if (actividades.length === 0) {
      return 0;
    }

    const completadas = actividades.filter(
      (actividad) => actividad.estado === 'Completada'
    ).length;

    return Math.round((completadas / actividades.length) * 100);
  }

  test('CP01: calcula un avance del 50%', () => {
    const actividades = [
      { estado: 'Completada' },
      { estado: 'Completada' },
      { estado: 'Pendiente' },
      { estado: 'No realizada' },
    ];

    expect(calcularAvance(actividades)).toBe(50);
  });

  test('E1: devuelve 0% si no existen actividades', () => {
    expect(calcularAvance([])).toBe(0);
  });

  test('E2: informa si falta información de las actividades', () => {
    expect(() =>
      calcularAvance([
        { estado: 'Completada' },
        {},
      ])
    ).toThrow(
      'La información de las actividades está incompleta.'
    );
  });

  test('E3: informa si falla el servicio de consulta', () => {
    expect(() =>
      calcularAvance(
        [{ estado: 'Completada' }],
        false
      )
    ).toThrow(
      'No se pudo consultar el avance de la atención.'
    );
  });
});
