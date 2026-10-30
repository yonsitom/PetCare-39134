
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import PantallaPropietarios from '../../app/propietarios';
import FichaPropietario from '../../app/propietarios/fichaPropietario';

import {
  consultarPropietarios,
  consultarMascotasPorPropietario,
  consultarPropietarioPorId,
} from '../../dao/propietarioDAO';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: () => ({
    propietarioId: 'prop-001',
  }),
}));

jest.mock('../../services/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'usuario-prueba',
          },
        },
        error: null,
      }),
    },
  },
}));

jest.mock('../../components/layout/EncabezadoPetCare', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  return function EncabezadoPetCareMock() {
    return React.createElement(
      View,
      null,
      React.createElement(Text, null, 'Encabezado PetCare')
    );
  };
});

jest.mock('../../components/layout/MenuLateralDerecho', () => {
  return function MenuLateralDerechoMock() {
    return null;
  };
});

jest.mock('../../components/propietarios/RegistrarPropietario', () => {
  return function RegistrarPropietarioMock() {
    return null;
  };
});

jest.mock('../../dao/propietarioDAO', () => ({
  consultarPropietarios: jest.fn(),
  consultarMascotasPorPropietario: jest.fn(),
  consultarPropietarioPorId: jest.fn(),
}));

describe('RF13 - Consultar la información de un propietario', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    consultarMascotasPorPropietario.mockResolvedValue([]);
    consultarPropietarioPorId.mockResolvedValue({
      propietario_id: 'prop-001',
      nombre: 'Juan',
      apellido: 'Pérez',
      documento_identidad: '45678912',
      telefono: '999888777',
      correo: 'juan@example.com',
    });
  });

  // CP01: consulta exitosa de propietarios y mascotas asociadas.
  test('CP01 - muestra el propietario y la cantidad de mascotas asociadas', async () => {
    consultarPropietarios.mockResolvedValue([
      {
        propietario_id: 'prop-001',
        nombre: 'Juan',
        apellido: 'Pérez',
        documento_identidad: '45678912',
        telefono: '999888777',
        correo: 'juan@example.com',
      },
    ]);

    consultarMascotasPorPropietario.mockResolvedValue([
      { mascota_id: 'mas-001', nombre: 'Firulais' },
      { mascota_id: 'mas-002', nombre: 'Luna' },
    ]);

    render(<PantallaPropietarios />);

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeTruthy();
      expect(screen.getByText('DNI: 45678912')).toBeTruthy();
      expect(screen.getByText('2 mascotas')).toBeTruthy();
    });
  });

  // CP02: lista vacía.
  test('CP02 - muestra el mensaje cuando no hay propietarios registrados', async () => {
    consultarPropietarios.mockResolvedValue([]);

    render(<PantallaPropietarios />);

    await waitFor(() => {
      expect(
        screen.getByText('No hay propietarios registrados.')
      ).toBeTruthy();
    });
  });

  // CP03: el propietario solicitado no existe.
  test('CP03 - muestra un mensaje cuando no se encuentra el propietario', async () => {
    const error = new Error(
      'No se encontró la información del propietario solicitado.'
    );
    error.code = 'PROPIETARIO_NO_ENCONTRADO';

    consultarPropietarioPorId.mockRejectedValue(error);

    render(<FichaPropietario />);

    await waitFor(() => {
      expect(
        screen.getByText(
          'No se encontró la información del propietario solicitado.'
        )
      ).toBeTruthy();
    });

    expect(consultarPropietarioPorId).toHaveBeenCalledWith('prop-001');
  });

  // CP04: error al consultar la ficha individual.
  test('CP04 - muestra un mensaje controlado si falla la consulta de la ficha', async () => {
    consultarPropietarioPorId.mockRejectedValue(
      new Error('Error interno de Supabase')
    );

    render(<FichaPropietario />);

    await waitFor(() => {
      expect(
        screen.getByText(
          'No se pudo consultar la información del propietario. Intente nuevamente.'
        )
      ).toBeTruthy();
    });
  });

  // Prueba complementaria: error al cargar la lista.
  test('muestra un mensaje controlado si falla la consulta de la lista', async () => {
    consultarPropietarios.mockRejectedValue(
      new Error('Error interno de Supabase')
    );

    render(<PantallaPropietarios />);

    await waitFor(() => {
      expect(
        screen.getByText(
          'No se pudo cargar la lista de propietarios. Intente nuevamente.'
        )
      ).toBeTruthy();
    });
  });
});
