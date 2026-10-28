import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { C } from '../../styles/administracionStyles';

const roles = ['Administrador', 'Asistente'];

export default function FormularioAccesoUsuario({ datos, actualizar }) {
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const cambiar = (campo, valor) => {
    actualizar((actual) => ({ ...actual, [campo]: valor }));
  };

  return (
    <View>
      <Text style={styles.etiqueta}>Rol del usuario *</Text>

      <View style={styles.roles}>
        {roles.map((rol) => {
          const seleccionado = datos.rol === rol;

          return (
            <TouchableOpacity
              key={rol}
              onPress={() => cambiar('rol', rol)}
              style={[
                styles.opcionRol,
                seleccionado && styles.opcionRolSeleccionada,
              ]}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.radio,
                  seleccionado && styles.radioSeleccionado,
                ]}
              >
                {seleccionado && <View style={styles.radioCentro} />}
              </View>

              <View style={styles.textosRol}>
                <Text
                  style={[
                    styles.nombreRol,
                    seleccionado && styles.nombreRolSeleccionado,
                  ]}
                >
                  {rol}
                </Text>
                <Text style={styles.descripcionRol}>
                  {rol === 'Administrador'
                    ? 'Acceso a las funciones administrativas.'
                    : 'Acceso operativo al sistema.'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.etiqueta}>Contraseña *</Text>
      <View style={styles.contenedorEntrada}>
        <TextInput
          style={styles.entrada}
          value={datos.contrasena}
          onChangeText={(v) => cambiar('contrasena', v)}
          placeholder="Mínimo 8 caracteres"
          placeholderTextColor="#8A9B99"
          secureTextEntry={!mostrarContrasena}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={() => setMostrarContrasena((v) => !v)}
          style={styles.botonVer}
        >
          <Text style={styles.textoVer}>
            {mostrarContrasena ? 'Ocultar' : 'Ver'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.ayuda}>
        Usa al menos 8 caracteres y combina letras y números.
      </Text>

      <Text style={styles.etiqueta}>Confirmar contraseña *</Text>
      <View style={styles.contenedorEntrada}>
        <TextInput
          style={styles.entrada}
          value={datos.confirmarContrasena}
          onChangeText={(v) => cambiar('confirmarContrasena', v)}
          placeholder="Repita la contraseña"
          placeholderTextColor="#8A9B99"
          secureTextEntry={!mostrarConfirmacion}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={() => setMostrarConfirmacion((v) => !v)}
          style={styles.botonVer}
        >
          <Text style={styles.textoVer}>
            {mostrarConfirmacion ? 'Ocultar' : 'Ver'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  etiqueta: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 8,
  },
  roles: {
    gap: 10,
    marginBottom: 18,
  },
  opcionRol: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    padding: 14,
    borderRadius: 12,
  },
  opcionRolSeleccionada: {
    borderColor: C.primario,
    backgroundColor: '#F0F9F7',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#9BAEAB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioSeleccionado: {
    borderColor: C.primario,
  },
  radioCentro: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.primario,
  },
  textosRol: {
    flex: 1,
  },
  nombreRol: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '700',
  },
  nombreRolSeleccionado: {
    color: C.primario,
  },
  descripcionRol: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  contenedorEntrada: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    backgroundColor: C.blanco,
    minHeight: 49,
  },
  entrada: {
    flex: 1,
    color: C.texto,
    fontSize: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  botonVer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textoVer: {
    color: C.primario,
    fontWeight: '700',
    fontSize: 12,
  },
  ayuda: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 8,
  },
});