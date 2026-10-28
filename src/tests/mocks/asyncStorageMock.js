
const almacenamiento = {};

const AsyncStorageMock = {
  getItem: jest.fn(async (clave) =>
    Object.prototype.hasOwnProperty.call(almacenamiento, clave)
      ? almacenamiento[clave]
      : null
  ),

  setItem: jest.fn(async (clave, valor) => {
    almacenamiento[clave] = valor;
  }),

  removeItem: jest.fn(async (clave) => {
    delete almacenamiento[clave];
  }),

  clear: jest.fn(async () => {
    Object.keys(almacenamiento).forEach((clave) => {
      delete almacenamiento[clave];
    });
  }),

  getAllKeys: jest.fn(async () => Object.keys(almacenamiento)),

  multiGet: jest.fn(async (claves) =>
    claves.map((clave) => [
      clave,
      Object.prototype.hasOwnProperty.call(almacenamiento, clave)
        ? almacenamiento[clave]
        : null,
    ])
  ),

  multiSet: jest.fn(async (pares) => {
    pares.forEach(([clave, valor]) => {
      almacenamiento[clave] = valor;
    });
  }),

  multiRemove: jest.fn(async (claves) => {
    claves.forEach((clave) => {
      delete almacenamiento[clave];
    });
  }),
};

export default AsyncStorageMock;
