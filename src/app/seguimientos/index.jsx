
import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function SeguimientosScreen() {
  return (
    <SafeAreaView style={estilos.contenedor}>
      <View style={estilos.contenido}>
        <Text style={estilos.titulo}>Seguimiento</Text>
        <Text style={estilos.descripcion}>
          La pantalla de seguimiento está pendiente de implementación.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#F4F8F7',
  },
  contenido: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  titulo: {
    color: '#12665E',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  descripcion: {
    color: '#718096',
    fontSize: 15,
    lineHeight: 22,
  },
});
