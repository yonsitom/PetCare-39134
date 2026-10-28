
import React, { useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const COLORES = {
  primario: '#187C72',
  texto: '#253746',
  secundario: '#64748B',
  borde: '#DCE4E8',
  fondo: '#FFFFFF',
  error: '#C62828',
  fondoError: '#FFF1F0',
};

// Campos que se muestran en el formulario.
const CAMPOS = [
  {
    nombre: 'nombre',
    etiqueta: 'Nombres',
    placeholder: 'Ingrese los nombres',
    obligatorio: true,
  },
  {
    nombre: 'apellido',
    etiqueta: 'Apellidos',
    placeholder: 'Ingrese los apellidos',
    obligatorio: true,
  },
  {
    nombre: 'documento_identidad',
    etiqueta: 'DNI',
    placeholder: 'Ingrese los 8 dígitos del DNI',
    obligatorio: true,
    teclado: 'number-pad',
    maxLength: 8,
  },
  {
    nombre: 'telefono',
    etiqueta: 'Celular',
    placeholder: 'Ingrese su celular de 9 dígitos',
    obligatorio: true,
    teclado: 'phone-pad',
    maxLength: 9,
  },
  {
    nombre: 'correo',
    etiqueta: 'Correo electrónico',
    placeholder: 'ejemplo@correo.com',
    obligatorio: true,
    teclado: 'email-address',
  },
  {
    nombre: 'direccion',
    etiqueta: 'Dirección',
    placeholder: 'Ingrese la dirección (opcional)',
    obligatorio: false,
  },
  {
    nombre: 'observaciones',
    etiqueta: 'Observaciones',
    placeholder: 'Ingrese observaciones (opcional)',
    obligatorio: false,
    multilinea: true,
  },
];

export default function FormularioPropietario({
  datos = {},
  actualizarCampo,
  errores = {},
  campoConError,
  mensajeGeneral,
  guardando = false,
  onCancelar,
  onContinuar,
}) {
  const referencias = useRef({});

  // Cuando existe un error, enfoca el campo correspondiente.
  useEffect(() => {
    if (campoConError && referencias.current[campoConError]) {
      const temporizador = setTimeout(() => {
        referencias.current[campoConError]?.focus();
      }, 150);

      return () => clearTimeout(temporizador);
    }
  }, [campoConError]);

  return (
    <ScrollView
      style={estilos.contenedor}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >

      {mensajeGeneral ? (
        <View style={estilos.mensajeGeneral}>
          <Text style={estilos.textoMensaje}>
            {mensajeGeneral}
          </Text>
        </View>
      ) : null}

      {CAMPOS.map((campo) => {
        const tieneError = Boolean(errores[campo.nombre]);

        return (
          <View key={campo.nombre} style={estilos.grupoCampo}>
            <Text style={estilos.etiqueta}>
              {campo.etiqueta}
              {campo.obligatorio ? (
                <Text style={estilos.asterisco}> *</Text>
              ) : null}
            </Text>

            <TextInput
              ref={(referencia) => {
                referencias.current[campo.nombre] = referencia;
              }}
              value={String(datos[campo.nombre] ?? '')}
              onChangeText={(valor) =>
                actualizarCampo(campo.nombre, valor)
              }
              placeholder={campo.placeholder}
              placeholderTextColor="#94A3B8"
              keyboardType={campo.teclado ?? 'default'}
              autoCapitalize={
                campo.nombre === 'correo' ? 'none' : 'words'
              }
              autoCorrect={campo.nombre !== 'correo'}
              maxLength={campo.maxLength}
              multiline={Boolean(campo.multilinea)}
              textAlignVertical={
                campo.multilinea ? 'top' : 'center'
              }
              editable={!guardando}
              style={[
                estilos.campo,
                campo.multilinea && estilos.campoMultilinea,
                tieneError && estilos.campoError,
              ]}
              accessibilityLabel={campo.etiqueta}
            />

            {tieneError ? (
              <Text style={estilos.textoError}>
                {errores[campo.nombre]}
              </Text>
            ) : null}
          </View>
        );
      })}

      <Text style={estilos.nota}>
        Los campos marcados con * son obligatorios.
      </Text>

      <View style={estilos.botones}>
        <TouchableOpacity
          style={[estilos.boton, estilos.botonCancelar]}
          onPress={onCancelar}
          disabled={guardando}
          activeOpacity={0.8}
        >
          <Text style={estilos.textoCancelar}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            estilos.boton,
            estilos.botonContinuar,
            guardando && estilos.botonDeshabilitado,
          ]}
          onPress={onContinuar}
          disabled={guardando}
          activeOpacity={0.8}
        >
          <Text style={estilos.textoContinuar}>
            Revisar datos
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  contenido: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  titulo: {
    fontSize: 23,
    fontWeight: '700',
    color: COLORES.texto,
    marginBottom: 8,
  },
  descripcion: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORES.secundario,
    marginBottom: 22,
  },
  grupoCampo: {
    marginBottom: 17,
  },
  etiqueta: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.texto,
    marginBottom: 8,
  },
  asterisco: {
    color: COLORES.error,
  },
  campo: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: COLORES.texto,
    fontSize: 14,
  },
  campoMultilinea: {
    minHeight: 95,
  },
  campoError: {
    borderColor: COLORES.error,
    backgroundColor: COLORES.fondoError,
  },
  textoError: {
    color: COLORES.error,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  mensajeGeneral: {
    backgroundColor: COLORES.fondoError,
    borderWidth: 1,
    borderColor: '#F2B8B5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 18,
  },
  textoMensaje: {
    color: COLORES.error,
    fontSize: 13,
    lineHeight: 19,
  },
  nota: {
    fontSize: 12,
    color: COLORES.secundario,
    marginBottom: 22,
  },
  botones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  boton: {
    flex: 1,
    minHeight: 47,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  botonCancelar: {
    borderWidth: 1,
    borderColor: COLORES.borde,
    backgroundColor: '#FFFFFF',
  },
  botonContinuar: {
    backgroundColor: COLORES.primario,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoCancelar: {
    color: COLORES.texto,
    fontWeight: '600',
  },
  textoContinuar: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
