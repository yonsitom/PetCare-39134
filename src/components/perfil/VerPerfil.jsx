
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useFocusEffect } from 'expo-router';
import { supabase } from '../../services/supabase';
import { logger } from '../../utils/logger';


const C = {
  primario: '#187C72',
  oscuro: '#12665E',
  fondo: '#F4F8F7',
  blanco: '#FFFFFF',
  texto: '#243B39',
  secundario: '#748581',
  borde: '#DFE9E6',
  suave: '#EAF5F2',
  verdeClaro: '#EAF7EF',
  verde: '#237A57',

  // Colores para mostrar errores
  error: '#B42318',
  fondoError: '#FEF3F2',
};


export default function VerPerfil({
  onEditar,
onCambiarContrasena,
  mostrarMensajeExito = false,
  onCerrarMensajeExito,
}) {
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [correo, setCorreo] = useState('');

  useFocusEffect(
    useCallback(() => {
      cargarPerfil();
    }, [])
  );

  async function cargarPerfil(esActualizacion = false) {
    try {
      if (esActualizacion) {
        setActualizando(true);
      } else {
        setCargando(true);
      }

      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario) throw errorUsuario;

      if (!user) {
        setPerfil(null);
        Alert.alert(
          'Sesión no disponible',
          'Inicia sesión nuevamente para consultar tu perfil.'
        );
        return;
      }

      const { data, error } = await supabase
        .from('perfiles')
        .select(
          'perfil_id, nombre_completo, documento_identidad, telefono, direccion, rol, estado_cuenta, fecha_registro'
        )
        .eq('perfil_id', user.id)
        .single();

      if (error) throw error;

      setPerfil(data);
      setCorreo(user.email || '');
    } catch (error) {
      logger.error('Error al consultar el perfil:', error);
      Alert.alert(
        'No se pudo cargar el perfil',
        'Verifica tu conexión e inténtalo nuevamente.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }

  function formatearFecha(fecha) {
    if (!fecha) return 'No registrado';

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) return fecha;

    return valor.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  function obtenerNombres(nombreCompleto) {
    const partes = (nombreCompleto || '').trim().split(/\s+/).filter(Boolean);
    return partes[0] || 'No registrado';
  }

  function obtenerApellidos(nombreCompleto) {
    const partes = (nombreCompleto || '').trim().split(/\s+/).filter(Boolean);
    return partes.slice(1).join(' ') || 'No registrado';
  }

  function iniciales(nombre) {
    if (!nombre) return 'U';

    return nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase();
  }


  function CampoLectura({ etiqueta, valor }) {
    return (
      <View style={styles.campoFila}>
        <Text style={styles.etiquetaFila}>{etiqueta}</Text>
        <Text style={styles.valorFila}>{valor || 'No registrado'}</Text>
      </View>
    );
  }

  if (cargando) {
    return (
      <View style={styles.cargando}>
        <StatusBar barStyle="light-content" backgroundColor={C.oscuro} />
        <ActivityIndicator size="large" color={C.primario} />
        <Text style={styles.textoCargando}>Cargando información del perfil...</Text>
      </View>
    );
  }

  if (!perfil) {
    return (
      <View style={styles.cargando}>
        <StatusBar barStyle="light-content" backgroundColor={C.oscuro} />
        <Text style={styles.textoError}>No se pudo mostrar el perfil.</Text>
        <TouchableOpacity
          style={styles.botonReintentar}
          onPress={() => cargarPerfil()}
        >
          <Text style={styles.textoBotonPrincipal}>Volver a intentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nombreCompleto = perfil.nombre_completo || 'Usuario';
  const rol = perfil.rol || 'Sin rol';
  const estadoCuenta = perfil.estado_cuenta || 'Sin estado';
  const cuentaActiva = estadoCuenta.toLowerCase() === 'activo';

  return (
    <View style={styles.contenedor}>
      <StatusBar barStyle="light-content" backgroundColor={C.oscuro} />

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => cargarPerfil(true)}
            tintColor={C.primario}
            colors={[C.primario]}
          />
        }
      >
        <Text style={styles.migas}>Inicio  /  Información personal</Text>

        <View style={styles.tituloFila}>
          <View style={styles.tituloContenido}>
            <Text style={styles.titulo}>Información personal</Text>
            <Text style={styles.subtitulo}>
              Consulta y administra tu información personal.
            </Text>
          </View>
          <View style={styles.iconoTitulo}>
            <Text style={styles.iconoTituloTexto}>♙</Text>
          </View>
        </View>

        <View style={styles.tarjetaUsuario}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>{iniciales(nombreCompleto)}</Text>
          </View>

          <Text style={styles.nombreUsuario}>{nombreCompleto}</Text>
          <Text style={styles.correoUsuario}>{correo || 'Correo no disponible'}</Text>

          <View style={styles.etiquetasUsuario}>
            <View style={styles.etiquetaRol}>
              <Text style={styles.textoEtiquetaRol}>{rol}</Text>
            </View>
            <View
              style={[
                styles.etiquetaEstado,
                cuentaActiva ? styles.estadoActivo : styles.estadoInactivo,
              ]}
            >
              <View
                style={[
                  styles.puntoEstado,
                  cuentaActiva ? styles.puntoActivo : styles.puntoInactivo,
                ]}
              />
              <Text
                style={[
                  styles.textoEtiquetaEstado,
                  !cuentaActiva && styles.textoEstadoInactivo,
                ]}
              >
                {cuentaActiva ? 'Cuenta activa' : estadoCuenta}
              </Text>
            </View>
          </View>
        </View>

        {mostrarMensajeExito && (
          <View style={styles.mensajeExito}>
            <Text style={styles.iconoExito}>✓</Text>
            <Text style={styles.textoMensajeExito}>
              Los datos de su perfil se actualizaron correctamente.
            </Text>
            <TouchableOpacity
              onPress={onCerrarMensajeExito}
              style={styles.botonCerrarMensaje}
              accessibilityLabel="Cerrar mensaje"
            >
              <Text style={styles.textoCerrarMensaje}>×</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.tarjeta}>
          <View style={styles.encabezadoTarjeta}>
            <View style={styles.iconoSeccion}>
              <Text style={styles.iconoSeccionTexto}>♙</Text>
            </View>
            <View style={styles.encabezadoTexto}>
              <Text style={styles.tituloTarjeta}>Información personal</Text>
              <Text style={styles.descripcionTarjeta}>
                Datos registrados en tu cuenta.
              </Text>
            </View>
          </View>

          <CampoLectura
            etiqueta="Nombres"
            valor={obtenerNombres(perfil.nombre_completo)}
          />
          <CampoLectura
            etiqueta="Apellidos"
            valor={obtenerApellidos(perfil.nombre_completo)}
          />
          <CampoLectura
            etiqueta="DNI"
            valor={perfil.documento_identidad}
          />
          <CampoLectura
            etiqueta="Correo electrónico"
            valor={correo}
          />
          <CampoLectura
            etiqueta="Rol"
            valor={rol}
          />
          <CampoLectura
            etiqueta="Estado de cuenta"
            valor={cuentaActiva ? 'Activa' : estadoCuenta}
          />
          <CampoLectura
            etiqueta="Teléfono"
            valor={perfil.telefono}
          />
          <CampoLectura
            etiqueta="Dirección"
            valor={perfil.direccion}
          />
          <CampoLectura
            etiqueta="Fecha de creación"
            valor={formatearFecha(perfil.fecha_registro)}
          />

          <TouchableOpacity
            style={styles.botonPrincipal}
            onPress={() => onEditar?.()}
            activeOpacity={0.8}
          >
            <Text style={styles.textoBotonPrincipal}>Editar información</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botonSecundario}
            onPress={onCambiarContrasena}
            activeOpacity={0.8}
          >
            <Text style={styles.textoBotonSecundario}>Cambiar contraseña</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.nota}>
          Mantén tus datos actualizados para que la información de tu cuenta sea correcta.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  encabezado: {
    minHeight: 100,
    backgroundColor: C.oscuro,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'android' ? 18 : 48,
    paddingBottom: 18,
    justifyContent: 'center',
  },
  marcaSuperior: {
    color: '#C7E6DF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  logo: {
    color: C.blanco,
    fontSize: 27,
    fontWeight: '800',
    marginTop: 2,
  },
  contenido: {
    padding: 20,
    paddingBottom: 38,
  },
  migas: {
    fontSize: 12,
    color: C.secundario,
    marginBottom: 16,
  },
  tituloFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  tituloContenido: {
    flex: 1,
    paddingRight: 12,
  },
  titulo: {
    fontSize: 25,
    fontWeight: '800',
    color: C.texto,
  },
  subtitulo: {
    fontSize: 13,
    lineHeight: 19,
    color: C.secundario,
    marginTop: 6,
  },
  iconoTitulo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.suave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoTituloTexto: {
    fontSize: 25,
    color: C.primario,
  },
  tarjetaUsuario: {
    backgroundColor: C.blanco,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#183B34',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: C.suave,
    borderWidth: 1,
    borderColor: '#D3EAE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarTexto: {
    fontSize: 23,
    fontWeight: '800',
    color: C.primario,
  },
  nombreUsuario: {
    fontSize: 19,
    fontWeight: '800',
    color: C.texto,
    textAlign: 'center',
  },
  correoUsuario: {
    fontSize: 13,
    color: C.secundario,
    marginTop: 5,
    textAlign: 'center',
  },
  etiquetasUsuario: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 13,
  },
  etiquetaRol: {
    backgroundColor: C.suave,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  textoEtiquetaRol: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primario,
  },
  etiquetaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  estadoActivo: {
    backgroundColor: '#EAF7EF',
  },
  estadoInactivo: {
    backgroundColor: '#FCEDEC',
  },
  puntoEstado: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  puntoActivo: {
    backgroundColor: C.verde,
  },
  puntoInactivo: {
    backgroundColor: C.error,
  },
  textoEtiquetaEstado: {
    fontSize: 12,
    fontWeight: '700',
    color: C.verde,
  },
  textoEstadoInactivo: {
    color: C.error,
  },
  mensajeExito: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.verdeClaro,
    borderColor: '#CDEAD7',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 13,
    marginBottom: 16,
  },
  iconoExito: {
    color: C.verde,
    fontSize: 21,
    fontWeight: '800',
    marginRight: 10,
  },
  textoMensajeExito: {
    flex: 1,
    color: '#236746',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  botonCerrarMensaje: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 5,
  },
  textoCerrarMensaje: {
    fontSize: 22,
    color: C.verde,
  },
  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#183B34',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  encabezadoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconoSeccion: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: C.suave,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconoSeccionTexto: {
    fontSize: 23,
    color: C.primario,
  },
  encabezadoTexto: {
    flex: 1,
  },
  tituloTarjeta: {
    fontSize: 16,
    fontWeight: '800',
    color: C.texto,
  },
  descripcionTarjeta: {
    fontSize: 12,
    color: C.secundario,
    marginTop: 4,
  },
  campoFila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F0',
    gap: 12,
  },
  etiquetaFila: {
    flex: 0.9,
    fontSize: 13,
    color: C.secundario,
    lineHeight: 19,
  },
  valorFila: {
    flex: 1.1,
    fontSize: 13,
    fontWeight: '700',
    color: C.texto,
    lineHeight: 19,
    textAlign: 'right',
  },
  botonPrincipal: {
    minHeight: 49,
    borderRadius: 12,
    backgroundColor: C.primario,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginTop: 20,
  },
  textoBotonPrincipal: {
    color: C.blanco,
    fontSize: 14,
    fontWeight: '800',
  },
  botonSecundario: {
    minHeight: 49,
    borderRadius: 12,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.primario,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginTop: 10,
  },
  textoBotonSecundario: {
    color: C.primario,
    fontSize: 14,
    fontWeight: '800',
  },
error: {
  color: '#B42318',
},
  nota: {
    fontSize: 12,
    color: C.secundario,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 12,
  },
  cargando: {
    flex: 1,
    backgroundColor: C.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  textoCargando: {
    marginTop: 12,
    color: C.secundario,
    fontSize: 14,
  },
  textoError: {
    fontSize: 15,
    color: C.texto,
    marginBottom: 16,
  },
  botonReintentar: {
    backgroundColor: C.primario,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
});
