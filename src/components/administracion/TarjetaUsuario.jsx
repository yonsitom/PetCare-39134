
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const C = {
  primario: '#187C72',
  texto: '#263238',
  secundario: '#718096',
  borde: '#E2E8F0',
  blanco: '#FFFFFF',
  verdeFondo: '#E5F5F1',
  verdeTexto: '#187C55',
  rojoFondo: '#FDECEC',
  rojoTexto: '#C0392B',
  fondoAvatar: '#EAF2F1',
};

function obtenerIniciales(nombre = '') {
  return nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('') || 'US';
}

function formatearFecha(fecha) {
  if (!fecha) return 'No registrada';

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return 'No registrada';
  }

  return valor.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function TarjetaUsuario({ usuario, onVerDetalle }) {
  const activo = usuario.estado_cuenta === 'Activo';

  return (
    <View style={styles.tarjeta}>
      <View style={styles.filaPrincipal}>
        <View style={styles.avatar}>
          <Text style={styles.iniciales}>
            {obtenerIniciales(usuario.nombre_completo)}
          </Text>
        </View>

        <View style={styles.informacion}>
          <Text style={styles.nombre}>
            {usuario.nombre_completo}
          </Text>

          <Text style={styles.dato}>
            DNI: {usuario.documento_identidad || 'No registrado'}
          </Text>

          <Text style={styles.dato}>
            {usuario.telefono || 'Teléfono no registrado'}
          </Text>
        </View>
      </View>

      <View style={styles.etiquetas}>
        <View style={styles.etiquetaRol}>
          <Text style={styles.textoRol}>{usuario.rol}</Text>
        </View>

        <View
          style={[
            styles.etiquetaEstado,
            activo ? styles.estadoActivo : styles.estadoInactivo,
          ]}
        >
          <View
            style={[
              styles.punto,
              { backgroundColor: activo ? '#219653' : '#C0392B' },
            ]}
          />
          <Text
            style={[
              styles.textoEstado,
              { color: activo ? C.verdeTexto : C.rojoTexto },
            ]}
          >
            {activo ? 'Activa' : 'Inactiva'}
          </Text>
        </View>
      </View>

      <View style={styles.pie}>
        <Text style={styles.fecha}>
          Reg. {formatearFecha(usuario.fecha_registro)}
        </Text>

        <TouchableOpacity
          onPress={() => onVerDetalle(usuario)}
          accessibilityRole="button"
          accessibilityLabel={`Ver detalle de ${usuario.nombre_completo}`}
        >
          <Text style={styles.verDetalle}>Ver detalle →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: C.borde,
    marginBottom: 14,
  },
  filaPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.fondoAvatar,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciales: {
    fontSize: 15,
    fontWeight: '800',
    color: C.primario,
  },
  informacion: {
    flex: 1,
  },
  nombre: {
    fontSize: 16,
    fontWeight: '800',
    color: C.texto,
    marginBottom: 5,
  },
  dato: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 3,
  },
  etiquetas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  etiquetaRol: {
    backgroundColor: '#EAF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  textoRol: {
    color: '#285A9F',
    fontSize: 11,
    fontWeight: '700',
  },
  etiquetaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  estadoActivo: {
    backgroundColor: C.verdeFondo,
  },
  estadoInactivo: {
    backgroundColor: C.rojoFondo,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  textoEstado: {
    fontSize: 11,
    fontWeight: '700',
  },
  pie: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  fecha: {
    fontSize: 11,
    color: C.secundario,
  },
  verDetalle: {
    fontSize: 12,
    color: C.primario,
    fontWeight: '800',
  },
});
