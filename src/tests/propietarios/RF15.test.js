
import React from 'react';
import { Alert } from 'react-native';
import {
  render,
  fireEvent,
  waitFor,
  screen,
  act,
  cleanup,
} from '@testing-library/react-native';

import EditarPropietario from '../../app/propietarios/editarPropietario';
import {
  consultarPropietarioPorId,
  actualizarPropietario,
} from '../../dao/propietarioDAO';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({
    propietarioId: 'propietario-01',
  }),
}));

jest.mock('../../components/layout/EncabezadoPetCare', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return function EncabezadoPetCareMock() {
    return React.createElement(Text, null, 'Encabezado PetCare');
  };
});

jest.mock('../../components/layout/MenuLateralDerecho', () => {
  return function MenuLateralDerechoMock() {
    return null;
  };
});

jest.mock('../../dao/propietarioDAO', () => ({
  consultarPropietarioPorId: jest.fn(),
  actualizarPropietario: jest.fn(),
}));

jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'usuario-asistente-01',
            email: 'asistente@veterinaria.com',
          },
        },
        error: null,
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              nombre_completo: 'Asistente de prueba',
              rol: 'Asistente',
            },
            error: null,
          }),
        })),
      })),
    })),
  },
}));

const propietarioInicial = {
  propietario_id: 'propietario-01',
  nombre: 'Juan',
  apellido: 'Pérez',
  documento_identidad: '45678912',
  correo: 'juan.perez@correo.com',
  telefono: '987654321',
  direccion: 'Calle Principal 123',
  observaciones: '',
};

function obtenerCampo(valorActual) {
  return screen.getByDisplayValue(valorActual);
}

async function cargarFormulario() {
  await render(<EditarPropietario />);

  await waitFor(() => {
    expect(consultarPropietarioPorId).toHaveBeenCalledWith(
      'propietario-01',
    );

    expect(obtenerCampo('Juan')).toBeTruthy();
    expect(obtenerCampo('Pérez')).toBeTruthy();
    expect(obtenerCampo('45678912')).toBeTruthy();
    expect(obtenerCampo('987654321')).toBeTruthy();
  });
}

async function confirmarGuardado() {
  let llamadaConfirmacion;

  await waitFor(() => {
    llamadaConfirmacion = Alert.alert.mock.calls.find(
      ([titulo]) => titulo === 'Confirmar cambios',
    );

    expect(llamadaConfirmacion).toBeTruthy();
  });

  const botones = llamadaConfirmacion[2] || [];
  const botonGuardar = botones.find(
    (boton) => boton.text === 'Guardar',
  );

  expect(botonGuardar).toBeTruthy();
  expect(typeof botonGuardar.onPress).toBe('function');

  await act(async () => {
    await botonGuardar.onPress();
  });
}

async function esperarMensaje(mensaje) {
  await waitFor(() => {
    const existe = Alert.alert.mock.calls.some(
      (llamada) => llamada[1] === mensaje,
    );

    expect(existe).toBe(true);
  });
}

describe('RF15: Editar los datos de un propietario', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    consultarPropietarioPorId.mockResolvedValue({
      ...propietarioInicial,
    });

    actualizarPropietario.mockResolvedValue({
      ...propietarioInicial,
      telefono: '912345678',
    });
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it('CP01: actualiza los datos y muestra el mensaje de éxito', async () => {
    await cargarFormulario();

    await fireEvent.changeText(
      obtenerCampo('987654321'),
      '912345678',
    );

    expect(obtenerCampo('912345678')).toBeTruthy();

    await fireEvent.press(
      screen.getByText('Guardar cambios'),
    );

    await confirmarGuardado();

    await waitFor(() => {
      expect(actualizarPropietario).toHaveBeenCalledWith(
        'propietario-01',
        expect.objectContaining({
          telefono: '912345678',
        }),
      );
    });

    await esperarMensaje(
      'Los datos del propietario fueron actualizados correctamente.',
    );
  });

  it('CP02: impide guardar cuando falta el nombre', async () => {
    await cargarFormulario();

    await fireEvent.changeText(
      obtenerCampo('Juan'),
      '',
    );

    await fireEvent.press(
      screen.getByText('Guardar cambios'),
    );

    await esperarMensaje(
      'Complete los campos obligatorios para continuar.',
    );

    expect(actualizarPropietario).not.toHaveBeenCalled();
  });

  it('CP03: impide guardar cuando el teléfono tiene formato inválido', async () => {
    await cargarFormulario();

    await fireEvent.changeText(
      obtenerCampo('987654321'),
      '12ab',
    );

    await fireEvent.press(
      screen.getByText('Guardar cambios'),
    );

    await esperarMensaje(
      'Verifique el formato de los datos ingresados.',
    );

    expect(actualizarPropietario).not.toHaveBeenCalled();
  });

  it('CP04: informa si el DNI está duplicado', async () => {
    actualizarPropietario.mockRejectedValueOnce(
      Object.assign(
        new Error('El propietario ya se encuentra registrado.'),
        { code: 'DUPLICADO_DNI' },
      ),
    );

    await cargarFormulario();

    await fireEvent.changeText(
      obtenerCampo('45678912'),
      '71234567',
    );

    await fireEvent.press(
      screen.getByText('Guardar cambios'),
    );

    await confirmarGuardado();

    await waitFor(() => {
      expect(actualizarPropietario).toHaveBeenCalledWith(
        'propietario-01',
        expect.objectContaining({
          documento_identidad: '71234567',
        }),
      );
    });

    await esperarMensaje(
      'El propietario ya se encuentra registrado.',
    );
  });

  it('CP05: informa el error del servicio y conserva los datos escritos', async () => {
    actualizarPropietario.mockRejectedValueOnce(
      new Error(
        'No se pudieron guardar los cambios. Intente nuevamente.',
      ),
    );

    await cargarFormulario();

    await fireEvent.changeText(
      obtenerCampo('987654321'),
      '912345678',
    );

    await fireEvent.press(
      screen.getByText('Guardar cambios'),
    );

    await confirmarGuardado();

    await esperarMensaje(
      'No se pudieron guardar los cambios. Intente nuevamente.',
    );

    expect(actualizarPropietario).toHaveBeenCalledTimes(1);
    expect(obtenerCampo('912345678')).toBeTruthy();
  });
});
