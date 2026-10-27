
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const COLORES = {
  exito: {
    fondo: '#EAF5F2',
    borde: '#B8DED5',
    color: '#12645C',
    icono: '✓',
  },
  error: {
    fondo: '#FEF3F2',
    borde: '#FECACA',
    color: '#B42318',
    icono: '!',
  },
  advertencia: {
    fondo: '#FFF7E6',
    borde: '#F5D99A',
    color: '#8A5A00',
    icono: '!',
  },
};

export default function MensajePerfil({
  tipo = 'exito',
  titulo,
  mensaje,
  onCerrar,
}) {
  const c = COLORES[tipo] || COLORES.exito;

  if (!titulo && !mensaje) return null;

  return (
    <View
      style={[
        styles.contenedor,
        { backgroundColor: c.fondo, borderColor: c.borde },
      ]}
      accessibilityRole="alert"
    >
      <View style={[styles.iconoFondo, { backgroundColor: c.borde }]}>
        <Text style={[styles.icono, { color: c.color }]}>{c.icono}</Text>
      </View>

      <View style={styles.contenido}>
        {!!titulo && (
          <Text style={[styles.titulo, { color: c.color }]}>{titulo}</Text>
        )}
        {!!mensaje && <Text style={styles.mensaje}>{mensaje}</Text>}
      </View>

      {!!onCerrar && (
        <TouchableOpacity
          onPress={onCerrar}
          style={styles.cerrar}
          accessibilityRole="button"
          accessibilityLabel="Cerrar mensaje"
        >
          <Text style={styles.cerrarTexto}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 13,
    padding: 14,
    marginBottom: 18,
    gap: 11,
  },
  iconoFondo: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icono: {
    fontSize: 16,
    fontWeight: '800',
  },
  contenido: {
    flex: 1,
    paddingTop: 2,
  },
  titulo: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  mensaje: {
    color: '#365653',
    fontSize: 13,
    lineHeight: 19,
  },
  cerrar: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrarTexto: {
    color: '#718783',
    fontSize: 23,
  },
});
