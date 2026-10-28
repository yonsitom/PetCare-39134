import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

const C = {
  primario: '#187C72',
  secundario: '#718781',
  blanco: '#FFFFFF',
  borde: '#DFE8E4',
};

const opciones = [
  { etiqueta: 'Todos', valor: 'Todos' },
  { etiqueta: 'Activos', valor: 'Activo' },
  { etiqueta: 'Inactivos', valor: 'Inactivo' },
];

export default function FiltrosUsuarios({
  seleccionado,
  onSeleccionar,
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.contenedor}
    >
      {opciones.map((opcion) => {
        const activo = seleccionado === opcion.valor;

        return (
          <TouchableOpacity
            key={opcion.valor}
            onPress={() => onSeleccionar(opcion.valor)}
            style={[
              styles.filtro,
              activo && styles.filtroActivo,
            ]}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
          >
            <Text
              style={[
                styles.texto,
                activo && styles.textoActivo,
              ]}
            >
              {opcion.etiqueta}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 16,
  },
  filtro: {
    paddingHorizontal: 17,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
  },
  filtroActivo: {
    backgroundColor: C.primario,
    borderColor: C.primario,
  },
  texto: {
    color: C.secundario,
    fontSize: 13,
    fontWeight: '600',
  },
  textoActivo: {
    color: C.blanco,
  },
});