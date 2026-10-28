import React from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const C = {
  primario: '#187C72',
  fondo: '#FFFFFF',
  texto: '#243746',
  secundario: '#64748B',
  borde: '#DCE5E5',
  error: '#B42318',
};

function mostrarDato(valor) {
  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ''
  ) {
    return 'No registrado';
  }

  return String(valor);
}

export default function ConfirmacionMascota({
  visible = false,
  datos = {},
  onVolver,
  onConfirmar,
  guardando = false,
  error = '',
}) {
  const propietario = datos?.propietario;

  const nombrePropietario = propietario
    ? [propietario.nombre, propietario.apellido]
        .filter(Boolean)
        .join(' ')
        .trim()
    : '';

  const filas = [
    ['Nombre', datos?.nombre],
    ['Especie', datos?.especie],
    ['Raza', datos?.raza],
    ['Sexo', datos?.sexo],
    ['Fecha de nacimiento', datos?.fecha_nacimiento],
    ['Color', datos?.color],
    ['Esterilización', datos?.estado_esterilizacion],
    ['Propietario', nombrePropietario],
    ['Observaciones', datos?.observaciones],
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!guardando) onVolver?.();
      }}
    >
      <View style={styles.fondo}>
        <View style={styles.modal}>
          <View style={styles.encabezado}>
            <View style={styles.icono}>
              <Text style={styles.check}>✓</Text>
            </View>

            <View style={styles.titulos}>
              <Text style={styles.titulo}>Confirmar nuevo registro</Text>
              <Text style={styles.subtitulo}>
                Verifica los datos antes de guardar la mascota.
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filas.map(([etiqueta, valor]) => (
              <View key={etiqueta} style={styles.fila}>
                <Text style={styles.etiqueta}>{etiqueta}</Text>
                <Text style={styles.valor}>{mostrarDato(valor)}</Text>
              </View>
            ))}

            {!!error && (
              <View style={styles.alerta}>
                <Text style={styles.textoError}>{error}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.botones}>
            <TouchableOpacity
              style={styles.botonCancelar}
              onPress={onVolver}
              disabled={guardando}
            >
              <Text style={styles.textoCancelar}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botonConfirmar,
                guardando && styles.deshabilitado,
              ]}
              onPress={onConfirmar}
              disabled={guardando}
            >
              {guardando ? (
                <View style={styles.contenidoBoton}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.textoConfirmar}>Registrando...</Text>
                </View>
              ) : (
                <Text style={styles.textoConfirmar}>Sí, registrar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(18,35,40,0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modal: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: C.fondo,
    borderRadius: 18,
    padding: 20,
    elevation: 10,
  },
  encabezado: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  icono: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: '#E4F3F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: C.primario,
    fontSize: 24,
    fontWeight: '800',
  },
  titulos: {
    flex: 1,
  },
  titulo: {
    color: C.texto,
    fontSize: 19,
    fontWeight: '800',
  },
  subtitulo: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  scroll: {
    flexShrink: 1,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F1',
  },
  etiqueta: {
    flex: 0.9,
    color: C.secundario,
    fontSize: 12,
  },
  valor: {
    flex: 1.1,
    color: C.texto,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  alerta: {
    backgroundColor: '#FEF3F2',
    borderRadius: 8,
    padding: 11,
    marginTop: 13,
  },
  textoError: {
    color: C.error,
    fontSize: 12,
    lineHeight: 18,
  },
  botones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  botonCancelar: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCancelar: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  botonConfirmar: {
    flex: 1.25,
    minHeight: 46,
    backgroundColor: C.primario,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  contenidoBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  textoConfirmar: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  deshabilitado: {
    opacity: 0.6,
  },
});