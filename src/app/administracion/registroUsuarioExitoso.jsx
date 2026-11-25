import React, { useMemo } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import ResumenUsuarioCreado from '../../components/administracion/ResumenUsuarioCreado';
import styles, { C } from '../../styles/administracionStyles';

export default function RegistroUsuarioExitosoScreen() {
  const params = useLocalSearchParams();

  const usuario = useMemo(() => {
    try {
      const valor = params.usuario;
      return JSON.parse(Array.isArray(valor) ? valor[0] : valor || '{}');
    } catch {
      return {};
    }
  }, [params.usuario]);

  const modo = Array.isArray(params.modo) ? params.modo[0] : params.modo;
  const fueCreado = modo === 'creado';

  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
    >
      <Text style={styles.textoRuta}>
        Administración / Gestión de usuarios
      </Text>

      <View style={styles.confirmacion}>
        <View style={styles.iconoExito}>
          <Text style={styles.check}>✓</Text>
        </View>

        <Text style={styles.tituloPagina}>
          {fueCreado ? '¡Registro exitoso!' : 'Información del usuario'}
        </Text>

        <Text style={styles.subtitulo}>
          {fueCreado
            ? 'La cuenta del usuario se creó correctamente.'
            : 'Consulta los datos registrados de esta cuenta.'}
        </Text>
      </View>

      <Text style={styles.tituloSeccion}>Datos del usuario</Text>
      <ResumenUsuarioCreado usuario={usuario} />

      <TouchableOpacity
        style={styles.botonPrincipal}
        onPress={() => router.replace('/administracion/gestionUsuario')}
        activeOpacity={0.85}
      >
        <Text style={styles.textoBotonPrincipal}>
          Volver a gestión de usuarios
        </Text>
      </TouchableOpacity>

      {fueCreado && (
        <TouchableOpacity
          style={styles.botonSecundario}
          onPress={() => router.replace('/administracion/nuevoUsuario')}
        >
          <Text style={styles.textoBotonSecundario}>Registrar otro usuario</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}