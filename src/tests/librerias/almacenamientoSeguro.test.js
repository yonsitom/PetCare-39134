// Pruebas del almacenamiento cifrado de la sesión (expo-secure-store).
jest.mock('expo-secure-store', () => {
  const datos = new Map();
  return {
    __datos: datos,
    getItemAsync: jest.fn(async (k) => (datos.has(k) ? datos.get(k) : null)),
    setItemAsync: jest.fn(async (k, v) => {
      if (!/^[A-Za-z0-9._-]+$/.test(k)) throw new Error('Clave inválida');
      if (v.length > 2048) throw new Error('Valor demasiado grande');
      datos.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k) => {
      datos.delete(k);
    }),
  };
});

import * as SecureStore from 'expo-secure-store';
import {
  almacenamientoSeguro,
  TAMANO_FRAGMENTO,
} from '../../services/almacenamientoSeguro';

const CLAVE = 'sb-eiaupodrnxbmxmurmfqo-auth-token';

beforeEach(() => SecureStore.__datos.clear());

describe('Almacenamiento seguro de la sesión', () => {
  test('guarda y recupera una sesión pequeña', async () => {
    await almacenamientoSeguro.setItem(CLAVE, '{"access_token":"x"}');
    expect(await almacenamientoSeguro.getItem(CLAVE)).toBe('{"access_token":"x"}');
  });

  test('divide en fragmentos una sesión mayor al límite de SecureStore', async () => {
    const sesion = 'a'.repeat(TAMANO_FRAGMENTO * 2 + 50);
    await almacenamientoSeguro.setItem(CLAVE, sesion);

    expect(await SecureStore.getItemAsync(`${CLAVE}__total`)).toBe('3');
    expect(await almacenamientoSeguro.getItem(CLAVE)).toBe(sesion);
  });

  test('al cerrar sesión elimina todos los fragmentos', async () => {
    await almacenamientoSeguro.setItem(CLAVE, 'b'.repeat(4000));
    await almacenamientoSeguro.removeItem(CLAVE);

    expect(SecureStore.__datos.size).toBe(0);
    expect(await almacenamientoSeguro.getItem(CLAVE)).toBeNull();
  });

  test('devuelve null si no hay sesión guardada', async () => {
    expect(await almacenamientoSeguro.getItem(CLAVE)).toBeNull();
  });
});
