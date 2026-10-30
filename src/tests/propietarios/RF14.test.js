
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

import FichaPropietario from '../../app/propietarios/fichaPropietario';

import {
  consultarPropietarioPorId,
  consultarMascotasPorPropietario,
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
        data: { user: null },
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

jest.mock('../../dao/propietarioDAO', () => ({
  consultarPropietarioPorId: jest.fn(),
  consultarMascotasPorPropietario: jest.fn(),
}));

describe('RF14 - Consultar las mascotas asociadas a un propietario', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    consultarPropietarioPorId.mockResolvedValue({
      propietario_id: 'prop-001',
      nombre: 'Juan',
      apellido: 'Pérez',
      documento_identidad: '45678912',
      telefono: '999888777',
      correo: 'juan@example.com',
    });

    consultarMascotasPorPropietario.mockResolvedValue([]);
  });

  test('CP01 - muestra las mascotas asociadas al propietario', async () => {
    consultarMascotasPorPropietario.mockResolvedValue([
      { mascota_id: 'mas-001', nombre: 'Firulais' },
      { mascota_id: 'mas-002', nombre: 'Michi' },
    ]);

    render(<FichaPropietario />);

    await waitFor(() => {
      expect(screen.getByText('Firulais')).toBeTruthy();
      expect(screen.getByText('Michi')).toBeTruthy();
    });

    expect(consultarMascotasPorPropietario).toHaveBeenCalledWith(
      'prop-001'
    );
  });

  test('CP02 - muestra el mensaje cuando el propietario no tiene mascotas', async () => {
    consultarMascotasPorPropietario.mockResolvedValue([]);

    render(<FichaPropietario />);

    await waitFor(() => {
      expect(
        screen.getByText('Este propietario no tiene mascotas asociadas.')
      ).toBeTruthy();
    });
  });

  test('CP03 - muestra el mensaje cuando el propietario no existe', async () => {
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
  });

  test('CP04 - muestra el mensaje cuando falla la consulta de mascotas', async () => {
    consultarMascotasPorPropietario.mockRejectedValue(
      new Error('Error simulado de consulta de mascotas')
    );

    render(<FichaPropietario />);

    await waitFor(() => {
      expect(
        screen.getByText(
          'No se pudieron consultar las mascotas. Intente nuevamente.'
        )
      ).toBeTruthy();
    });
  });
});
