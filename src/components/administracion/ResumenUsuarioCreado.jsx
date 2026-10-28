import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { C } from '../../styles/administracionStyles';

function Dato({ etiqueta, valor }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={styles.valor}>{valor || 'No registrado'}</Text>
    </View>
  );
}

export default function ResumenUsuarioCreado({ usuario }) {
  if (!usuario) return null;

  return (
    <View style={styles.tarjeta}>
      <Dato etiqueta="Nombres" valor={usuario.nombres} />
      <Dato etiqueta="Apellidos" valor={usuario.apellidos} />
      <Dato etiqueta="DNI" valor={usuario.dni} />
      <Dato etiqueta="Correo electrónico" valor={usuario.correo} />
      <Dato etiqueta="Teléfono" valor={usuario.telefono} />
      <Dato etiqueta="Dirección" valor={usuario.direccion} />
      <Dato etiqueta="Rol" valor={usuario.rol} />
      <Dato etiqueta="Estado de la cuenta" valor="Activo" />
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: C.blanco,
    borderColor: C.borde,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  dato: {
    paddingVertical: 13,
    borderBottomColor: '#EAF0EF',
    borderBottomWidth: 1,
  },
  etiqueta: {
    color: C.secundario,
    fontSize: 12,
    marginBottom: 5,
  },
  valor: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '600',
  },
});