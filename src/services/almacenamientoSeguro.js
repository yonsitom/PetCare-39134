/*
 * Almacenamiento seguro de la sesión.
 *
 * Librería: expo-secure-store
 * - Android: los datos se cifran con el Android Keystore.
 * - iOS: los datos se guardan en el Keychain.
 *
 * Supabase guarda aquí el token de acceso y el de actualización.
 * Antes se usaba AsyncStorage, que guarda el texto sin cifrar.
 *
 * SecureStore admite valores de hasta ~2 KB, y la sesión de Supabase
 * puede ser más grande; por eso el valor se divide en fragmentos.
 * En la versión web (sin SecureStore) se usa AsyncStorage.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const TAMANO_FRAGMENTO = 1800;

// SecureStore solo acepta letras, números, ".", "-" y "_" en las claves.
const normalizarClave = (clave) =>
  String(clave).replace(/[^A-Za-z0-9._-]/g, '_');

const claveTotal = (clave) => `${normalizarClave(clave)}__total`;
const claveFragmento = (clave, i) => `${normalizarClave(clave)}__${i}`;

async function eliminarFragmentos(clave) {
  const total = Number(await SecureStore.getItemAsync(claveTotal(clave))) || 0;

  for (let i = 0; i < total; i += 1) {
    await SecureStore.deleteItemAsync(claveFragmento(clave, i));
  }

  await SecureStore.deleteItemAsync(claveTotal(clave));
}

const almacenamientoNativo = {
  async getItem(clave) {
    const total = Number(await SecureStore.getItemAsync(claveTotal(clave)));
    if (!total) return null;

    const partes = [];
    for (let i = 0; i < total; i += 1) {
      const parte = await SecureStore.getItemAsync(claveFragmento(clave, i));
      if (parte === null) return null; // sesión incompleta: se descarta
      partes.push(parte);
    }

    return partes.join('');
  },

  async setItem(clave, valor) {
    await eliminarFragmentos(clave);

    const texto = String(valor);
    const total = Math.max(1, Math.ceil(texto.length / TAMANO_FRAGMENTO));

    for (let i = 0; i < total; i += 1) {
      await SecureStore.setItemAsync(
        claveFragmento(clave, i),
        texto.slice(i * TAMANO_FRAGMENTO, (i + 1) * TAMANO_FRAGMENTO)
      );
    }

    await SecureStore.setItemAsync(claveTotal(clave), String(total));
  },

  async removeItem(clave) {
    await eliminarFragmentos(clave);
  },
};

export const almacenamientoSeguro =
  Platform.OS === 'web' ? AsyncStorage : almacenamientoNativo;

export default almacenamientoSeguro;
