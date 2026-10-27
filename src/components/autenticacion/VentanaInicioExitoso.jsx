import { StyleSheet, Text, View } from 'react-native';

export default function VentanaInicioExitoso({ visible }) {
  if (!visible) {
    return null;
  }

  return (
    <View
      style={styles.contenedor}
      accessibilityRole="summary"
      accessibilityLabel="Inicio de sesión exitoso"
    >
      <View style={styles.circulo}>
        <Text style={styles.icono}>✓</Text>
      </View>

      <Text style={styles.mensaje}>
        Inicio de sesión exitoso
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2F4E9',
    borderColor: '#B9E3C7',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 23,
  },

  circulo: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#27834A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  icono: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  mensaje: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#216B3B',
  },
});
