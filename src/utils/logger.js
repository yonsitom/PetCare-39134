/*
 * Registro de eventos (logging) centralizado de PetCare.
 *
 * Librería: react-native-logs
 * - Niveles de severidad (debug, info, warn, error).
 * - En desarrollo muestra todo; en producción (APK) solo warn y error.
 *
 * Seguridad:
 * Antes de registrar cualquier dato se ocultan contraseñas, tokens,
 * correos, documentos y teléfonos, para que nunca queden expuestos
 * en la consola ni en los reportes de error.
 */
import { logger as rnLogger, consoleTransport } from 'react-native-logs';

const CLAVES_SENSIBLES =
  /pass|contrasena|contraseña|token|secret|clave|correo|email|documento|dni|telefono|celular/i;

const PATRON_CORREO = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PATRON_JWT = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;

const OCULTO = '***';

export function ocultarCorreo(correo) {
  const [usuario, dominio] = String(correo).split('@');
  if (!dominio) return OCULTO;
  return `${usuario.slice(0, 2)}${OCULTO}@${dominio}`;
}

/**
 * Devuelve una copia del valor sin datos sensibles.
 * No modifica el objeto original.
 */
export function sanitizar(valor, profundidad = 0) {
  if (valor === null || valor === undefined) return valor;
  if (profundidad > 4) return '[...]';

  if (typeof valor === 'string') {
    return valor
      .replace(PATRON_JWT, OCULTO)
      .replace(PATRON_CORREO, (correo) => ocultarCorreo(correo));
  }

  if (valor instanceof Error) {
    return {
      nombre: valor.name,
      mensaje: sanitizar(valor.message, profundidad + 1),
      codigo: valor.code,
    };
  }

  if (Array.isArray(valor)) {
    return valor.map((item) => sanitizar(item, profundidad + 1));
  }

  if (typeof valor === 'object') {
    const copia = {};
    Object.keys(valor).forEach((clave) => {
      copia[clave] = CLAVES_SENSIBLES.test(clave)
        ? OCULTO
        : sanitizar(valor[clave], profundidad + 1);
    });
    return copia;
  }

  return valor;
}

const esDesarrollo = typeof __DEV__ !== 'undefined' ? __DEV__ : true;

const registro = rnLogger.createLogger({
  severity: esDesarrollo ? 'debug' : 'warn',
  transport: consoleTransport,
  transportOptions: {
    colors: {
      debug: 'white',
      info: 'blueBright',
      warn: 'yellowBright',
      error: 'redBright',
    },
  },
  async: false,
  printLevel: true,
  printDate: true,
  dateFormat: 'time',
  enabled: true,
});

const conModulo = (nivel) => (...args) =>
  registro[nivel](...args.map((arg) => sanitizar(arg)));

/**
 * Logger de la aplicación.
 * Uso: logger.error('Error al registrar la mascota:', error);
 */
export const logger = {
  debug: conModulo('debug'),
  info: conModulo('info'),
  warn: conModulo('warn'),
  error: conModulo('error'),
  /** Crea un logger con prefijo de módulo, ej. logger.modulo('MascotaDAO'). */
  modulo: (nombre) => ({
    debug: (...a) => conModulo('debug')(`[${nombre}]`, ...a),
    info: (...a) => conModulo('info')(`[${nombre}]`, ...a),
    warn: (...a) => conModulo('warn')(`[${nombre}]`, ...a),
    error: (...a) => conModulo('error')(`[${nombre}]`, ...a),
  }),
};

export default logger;
