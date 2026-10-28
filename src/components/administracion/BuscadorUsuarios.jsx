import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const C = {
  blanco: '#FFFFFF',
  borde: '#DFE8E4',
  primario: '#187C72',
  texto: '#263238',
  secundario: '#718781',
};

export default function BuscadorUsuarios({ valor, onChange }) {
  return (
    <View style={styles.contenedor}>
      <Text style={styles.icono}>⌕</Text>

      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder="Buscar por nombre, correo o DNI"
        placeholderTextColor="#8A9B99"
        style={styles.entrada}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Buscar usuarios"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.blanco,
    borderColor: C.borde,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    marginBottom: 14,
  },
  icono: {
    color: C.primario,
    fontSize: 25,
    marginRight: 9,
  },
  entrada: {
    flex: 1,
    color: C.texto,
    minHeight: 48,
    fontSize: 14,
  },
});