
import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';

export default function FormularioDatosUsuario({
  datos = {},
  actualizar = () => {},
}) {
  const cambiarCampo = (campo, valor) => {
    actualizar((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  return (
    <View style={styles.contenedor}>
      <Text style={styles.titulo}>Datos personales</Text>

      <Text style={styles.etiqueta}>Nombres y apellidos *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ingrese nombres y apellidos"
        value={datos.nombre_completo ?? ''}
        onChangeText={(valor) => cambiarCampo('nombre_completo', valor)}
        autoCapitalize="words"
      />

      <Text style={styles.etiqueta}>DNI *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ingrese DNI"
        value={datos.documento_identidad ?? ''}
        onChangeText={(valor) => cambiarCampo('documento_identidad', valor)}
        keyboardType="numeric"
        maxLength={8}
      />

      <Text style={styles.etiqueta}>Teléfono</Text>
      <TextInput
        style={styles.input}
        placeholder="Ingrese teléfono"
        value={datos.telefono ?? ''}
        onChangeText={(valor) => cambiarCampo('telefono', valor)}
        keyboardType="phone-pad"
      />

      <Text style={styles.etiqueta}>Dirección</Text>
      <TextInput
        style={[styles.input, styles.inputDireccion]}
        placeholder="Ingrese dirección"
        value={datos.direccion ?? ''}
        onChangeText={(valor) => cambiarCampo('direccion', valor)}
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    width: '100%',
  },
  titulo: {
    fontSize: 17,
    fontWeight: '700',
    color: '#187C72',
    marginBottom: 18,
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: '600',
    color: '#344743',
    marginBottom: 7,
    marginTop: 12,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D9E4E1',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#243B36',
  },
  inputDireccion: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
