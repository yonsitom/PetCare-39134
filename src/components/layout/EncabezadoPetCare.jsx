
import React from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const C = {
  verdeOscuro: '#12665E',
  verdeClaro: '#D0E9E4',
  blanco: '#FFFFFF',
  fondoBoton: 'rgba(255,255,255,0.13)',
};

export default function EncabezadoPetCare({
  onAbrirMenu,
  onAbrirNotificaciones,
  titulo = 'PetCare',
  mostrarNotificaciones = true,
}) {
  return (
    <View style={estilos.contenedor}>
      <StatusBar
        backgroundColor={C.verdeOscuro}
        barStyle="light-content"
      />

      <View style={estilos.encabezado}>
        <View style={estilos.marca}>
          <View style={estilos.textosMarca}>
            <Text style={estilos.nombreVeterinaria}>
              VETERINARIA
            </Text>

            <Text style={estilos.nombrePetCare}>
              {titulo}
            </Text>
          </View>
        </View>

        <View style={estilos.acciones}>
          {mostrarNotificaciones && (
            <TouchableOpacity
              style={estilos.botonAccion}
              onPress={onAbrirNotificaciones}
              disabled={!onAbrirNotificaciones}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Abrir notificaciones"
            >
              <Text style={estilos.iconoNotificacion}>
                ♧
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={estilos.botonMenu}
            onPress={onAbrirMenu}
            disabled={!onAbrirMenu}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Abrir menú lateral"
          >
            <View style={estilos.lineaMenu} />
            <View style={estilos.lineaMenu} />
            <View style={estilos.lineaMenu} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: C.verdeOscuro,
  },

  encabezado: {
    minHeight: 94,
    paddingTop: 28,
    paddingHorizontal: 22,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  marca: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  textosMarca: {
    justifyContent: 'center',
  },

  nombreVeterinaria: {
    color: C.verdeClaro,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 2,
  },

  nombrePetCare: {
    color: C.blanco,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  botonAccion: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.fondoBoton,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconoNotificacion: {
    color: C.blanco,
    fontSize: 22,
    fontWeight: '600',
  },

  botonMenu: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.fondoBoton,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  lineaMenu: {
    width: 19,
    height: 2,
    borderRadius: 2,
    backgroundColor: C.blanco,
  },
});
