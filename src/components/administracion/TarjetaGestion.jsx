
import React from 'react';
import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  administracionStyles as styles,
} from '../../styles/administracionStyles';

export default function TarjetaGestion({
  icono = '📋',
  titulo = '',
  descripcion = '',
  indicadores = [],
  textoBoton = 'Consultar',
  onPress,
  cargando = false,
}) {
  return (
    <View style={styles.tarjeta}>
      {/* Encabezado de la tarjeta */}
      <View style={styles.encabezadoTarjeta}>
        <View style={styles.iconoContenedor}>
          <Text style={styles.iconoTarjeta}>
            {icono}
          </Text>
        </View>

        <View style={styles.contenidoEncabezadoTarjeta}>
          <Text style={styles.tituloTarjeta}>
            {titulo}
          </Text>

          <Text style={styles.descripcionTarjeta}>
            {descripcion}
          </Text>
        </View>
      </View>

      {/* Indicadores */}
      {indicadores.length > 0 && (
        <View style={styles.filaResumen}>
          {indicadores.map((indicador, index) => (
            <View
              key={`${indicador.etiqueta}-${index}`}
              style={[
                styles.indicadorResumen,
                indicadores.length === 1 &&
                  styles.indicadorResumenUnico,
                indicadores.length === 2 &&
                  styles.indicadorResumenDoble,
                indicadores.length >= 3 &&
                  styles.indicadorResumenTriple,
              ]}
            >
              <Text style={styles.numeroTotal}>
                {cargando ? '…' : indicador.valor}
              </Text>

              <Text style={styles.etiquetaResumen}>
                {indicador.etiqueta}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Botón de acción */}
      <TouchableOpacity
        style={[
          styles.boton,
          (!onPress || cargando) && styles.botonDeshabilitado,
        ]}
        onPress={onPress}
        activeOpacity={0.8}
        disabled={!onPress || cargando}
        accessibilityRole="button"
        accessibilityLabel={textoBoton}
      >
        <Text
          style={styles.textoBoton}
          numberOfLines={2}
        >
          {textoBoton}
        </Text>

        <Text style={styles.flechaBoton}>
          ›
        </Text>
      </TouchableOpacity>
    </View>
  );
}
