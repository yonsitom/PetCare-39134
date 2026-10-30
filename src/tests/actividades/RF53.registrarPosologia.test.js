/**
 * RF53 - REGISTRAR POSOLOGÍA
 * Pruebas TDD con Jest.
 *
 * CP01: Éxito — posología registrada.
 * CP02: Medicamento no seleccionado.
 * CP03: Dosis vacía.
 * CP04: Duración inválida.
 * CP05: Medicamento repetido.
 * CP06: Error al registrar.
 *
 * Nota: Estas pruebas evalúan las reglas del requisito.
 * La integración con el DAO y Supabase debe verificarse
 * al conectar las pruebas con el servicio real del proyecto.
 */

function validarPosologia(datos) {
  if (!datos.medicamento) {
    throw new Error('Seleccione un medicamento');
  }

  if (!datos.dosis || !String(datos.dosis).trim()) {
    throw new Error('Ingrese la dosis del medicamento');
  }

  const duracion = Number(datos.duracion);

  if (
    datos.duracion === '' ||
    datos.duracion === null ||
    datos.duracion === undefined ||
    !Number.isFinite(duracion) ||
    duracion <= 0
  ) {
    throw new Error('Ingrese una duración de tratamiento válida');
  }

  return true;
}

function validarMedicamentosRepetidos(medicamentos) {
  const identificadores = medicamentos.map(
    (medicamento) => medicamento.medicamentoId
  );

  if (new Set(identificadores).size !== identificadores.length) {
    throw new Error(
      'Este medicamento ya fue agregado a la actividad'
    );
  }

  return true;
}

async function registrarPosologia(datos, servicioRegistro) {
  try {
    if (!datos.sesionIniciada) {
      throw new Error('Debe iniciar sesión');
    }

    if (datos.estadoAtencion !== 'Activa') {
      throw new Error('La atención debe estar Activa');
    }

    if (!datos.catalogoTieneMedicamentos) {
      throw new Error('No existen medicamentos en el catálogo');
    }

    if (!Array.isArray(datos.medicamentos) || datos.medicamentos.length === 0) {
      throw new Error('Seleccione un medicamento');
    }

    validarMedicamentosRepetidos(datos.medicamentos);

    datos.medicamentos.forEach((medicamento) => {
      validarPosologia({
        medicamento: medicamento.medicamentoId,
        dosis: medicamento.dosis,
        duracion: medicamento.duracion,
      });
    });

    const resultado = await servicioRegistro({
      ...datos,
      estadoActividad: 'Pendiente',
    });

    if (!resultado || resultado.error) {
      throw new Error('Error al registrar');
    }

    return resultado;
  } catch (error) {
    if (
      error.message === 'Seleccione un medicamento' ||
      error.message === 'Ingrese la dosis del medicamento' ||
      error.message === 'Ingrese una duración de tratamiento válida' ||
      error.message === 'Este medicamento ya fue agregado a la actividad' ||
      error.message === 'Debe iniciar sesión' ||
      error.message === 'La atención debe estar Activa' ||
      error.message === 'No existen medicamentos en el catálogo'
    ) {
      throw error;
    }

    throw new Error(
      'No fue posible registrar la actividad. Intente nuevamente'
    );
  }
}

describe('RF53 — Registrar posología', () => {
  const datosBase = {
    sesionIniciada: true,
    estadoAtencion: 'Activa',
    catalogoTieneMedicamentos: true,
    atencionId: 10,
    medicamentos: [
      {
        medicamentoId: 1,
        dosis: '5 ml',
        frecuencia: 'Cada 8 horas',
        viaAdministracion: 'Oral',
        duracion: '7',
        condicionIngesta: 'Después de comer',
      },
    ],
  };

  let servicioRegistro;

  beforeEach(() => {
    servicioRegistro = jest.fn().mockResolvedValue({
      actividadId: 100,
      estado: 'Pendiente',
    });
  });

  test('CP01: registra correctamente la posología', async () => {
    const resultado = await registrarPosologia(
      datosBase,
      servicioRegistro
    );

    expect(resultado).toEqual({
      actividadId: 100,
      estado: 'Pendiente',
    });

    expect(servicioRegistro).toHaveBeenCalledTimes(1);
    expect(servicioRegistro).toHaveBeenCalledWith(
      expect.objectContaining({
        estadoActividad: 'Pendiente',
      })
    );
  });

  test('CP02: rechaza el registro si no se seleccionó medicamento', async () => {
    const datos = {
      ...datosBase,
      medicamentos: [],
    };

    await expect(
      registrarPosologia(datos, servicioRegistro)
    ).rejects.toThrow('Seleccione un medicamento');

    expect(servicioRegistro).not.toHaveBeenCalled();
  });

  test('CP03: rechaza una dosis vacía', async () => {
    const datos = {
      ...datosBase,
      medicamentos: [
        {
          ...datosBase.medicamentos[0],
          dosis: '',
        },
      ],
    };

    await expect(
      registrarPosologia(datos, servicioRegistro)
    ).rejects.toThrow('Ingrese la dosis del medicamento');

    expect(servicioRegistro).not.toHaveBeenCalled();
  });

  test('CP04: rechaza una duración inválida', async () => {
    const datos = {
      ...datosBase,
      medicamentos: [
        {
          ...datosBase.medicamentos[0],
          duracion: 'abc',
        },
      ],
    };

    await expect(
      registrarPosologia(datos, servicioRegistro)
    ).rejects.toThrow(
      'Ingrese una duración de tratamiento válida'
    );

    expect(servicioRegistro).not.toHaveBeenCalled();
  });

  test('CP05: rechaza un medicamento repetido', async () => {
    const medicamento = datosBase.medicamentos[0];

    const datos = {
      ...datosBase,
      medicamentos: [
        medicamento,
        { ...medicamento },
      ],
    };

    await expect(
      registrarPosologia(datos, servicioRegistro)
    ).rejects.toThrow(
      'Este medicamento ya fue agregado a la actividad'
    );

    expect(servicioRegistro).not.toHaveBeenCalled();
  });

  test('CP06: informa un error cuando falla el servicio de registro', async () => {
    servicioRegistro.mockRejectedValue(
      new Error('Fallo simulado de Supabase')
    );

    await expect(
      registrarPosologia(datosBase, servicioRegistro)
    ).rejects.toThrow(
      'No fue posible registrar la actividad. Intente nuevamente'
    );

    expect(servicioRegistro).toHaveBeenCalledTimes(1);
  });
});
