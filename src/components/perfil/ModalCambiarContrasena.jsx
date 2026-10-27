
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import EncabezadoPetCare from '../layout/EncabezadoPetCare';
import MenuLateralDerecho from '../layout/MenuLateralDerecho';

const C = {
  primario: '#187C72',
  oscuro: '#11665E',
  fondo: '#F4F7F8',
  blanco: '#FFFFFF',
  texto: '#24343D',
  secundario: '#71808A',
  borde: '#DCE5E8',
  error: '#B42318',
  fondoError: '#FEF3F2',
  exito: '#067647',
};

export default function ModalCambiarContrasena({
  visible = true,
  onCerrar,
  onGuardar,
  cambiando = false,
  error = '',
  nombre = 'Usuario PetCare',
  correo = '',
  rol = 'Usuario',
  estadoCuenta = 'Activo',
  onAbrirMenu,
  onAbrirNotificaciones,
}) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');

  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const [errorLocal, setErrorLocal] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);

  if (!visible) return null;

  const iniciales =
    nombre
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join('')
      .toUpperCase() || 'PC';

  const cumpleLongitud = nueva.length >= 8;
  const cumpleMayuscula = /[A-Z]/.test(nueva);
  const cumpleMinuscula = /[a-z]/.test(nueva);
  const cumpleNumero = /[0-9]/.test(nueva);

  const abrirMenu = () => {
    if (typeof onAbrirMenu === 'function') {
      onAbrirMenu();
    } else {
      setMenuAbierto(true);
    }
  };

  const mostrarNotificaciones = () => {
    if (typeof onAbrirNotificaciones === 'function') {
      onAbrirNotificaciones();
    } else {
      Alert.alert(
        'Notificaciones',
        'No tienes notificaciones nuevas.'
      );
    }
  };

  const validarYGuardar = () => {
    setErrorLocal('');

    if (!actual.trim() || !nueva || !confirmacion) {
      setErrorLocal('Complete todos los campos para continuar.');
      return;
    }

    if (nueva !== confirmacion) {
      setErrorLocal(
        'Las contraseñas nuevas no coinciden. Verifique los datos ingresados.'
      );
      return;
    }

    if (
      !cumpleLongitud ||
      !cumpleMayuscula ||
      !cumpleMinuscula ||
      !cumpleNumero
    ) {
      setErrorLocal(
        'La contraseña debe tener mínimo 8 caracteres, incluyendo una mayúscula, una minúscula y un número.'
      );
      return;
    }

    if (actual === nueva) {
      setErrorLocal(
        'La nueva contraseña debe ser diferente a la contraseña actual.'
      );
      return;
    }

    if (typeof onGuardar !== 'function') {
      setErrorLocal(
        'El formulario aún no está conectado con la función de cambio de contraseña.'
      );
      return;
    }

    onGuardar({
      contrasenaActual: actual,
      nuevaContrasena: nueva,
    });
  };

  const CampoContrasena = ({
    etiqueta,
    valor,
    cambiarValor,
    visible: mostrar,
    alternarVisibilidad,
    placeholder,
  }) => (
    <View style={styles.grupoCampo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>

      <View style={styles.filaInput}>
        <TextInput
          style={styles.input}
          value={valor}
          onChangeText={(texto) => {
            cambiarValor(texto);
            setErrorLocal('');
          }}
          placeholder={placeholder}
          placeholderTextColor="#9AA6AF"
          secureTextEntry={!mostrar}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!cambiando}
          accessibilityLabel={etiqueta}
        />

        <TouchableOpacity
          style={styles.botonVer}
          onPress={alternarVisibilidad}
          disabled={cambiando}
          accessibilityRole="button"
          accessibilityLabel={
            mostrar ? 'Ocultar contraseña' : 'Mostrar contraseña'
          }
          accessibilityHint="Alterna la visibilidad de la contraseña"
        >
          <Ionicons
            name={mostrar ? 'eye-off-outline' : 'eye-outline'}
            size={23}
            color={C.primario}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.pantalla}>
      <EncabezadoPetCare
        onAbrirMenu={abrirMenu}
        onAbrirNotificaciones={mostrarNotificaciones}
      />

      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.migas}>
          <Text style={styles.migaInicio}>Inicio</Text>
          <Text style={styles.separador}> / </Text>
          <Text style={styles.migaActual}>Cambiar contraseña</Text>
        </View>

        <View style={styles.encabezadoPagina}>
          <View style={styles.flex}>
            <Text style={styles.titulo}>Cambiar contraseña</Text>
            <Text style={styles.subtitulo}>
              Actualiza la contraseña de tu cuenta de PetCare.
            </Text>
          </View>

          <View style={styles.iconoPerfil}>
            <Text style={styles.iconoPerfilTexto}>♙</Text>
          </View>
        </View>

        <View style={styles.tarjetaPerfil}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>{iniciales}</Text>
          </View>

          <View style={styles.datosPerfil}>
            <Text style={styles.nombre}>{nombre}</Text>
            <Text style={styles.correo}>
              {correo || 'Correo no registrado'}
            </Text>

            <View style={styles.etiquetas}>
              <View style={styles.etiquetaRol}>
                <Text style={styles.textoRol}>{rol}</Text>
              </View>

              <View style={styles.estado}>
                <View
                  style={[
                    styles.puntoEstado,
                    String(estadoCuenta).toLowerCase() !== 'activo' &&
                      styles.puntoInactivo,
                  ]}
                />
                <Text style={styles.textoEstado}>{estadoCuenta}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.tarjetaFormulario}>
          <Text style={styles.tituloFormulario}>
            SEGURIDAD DE LA CUENTA
          </Text>

          <Text style={styles.descripcion}>
            Ingresa tu contraseña actual y define una nueva.
          </Text>

          <View style={styles.divisor} />

          <CampoContrasena
            etiqueta="Contraseña actual"
            valor={actual}
            cambiarValor={setActual}
            visible={mostrarActual}
            alternarVisibilidad={() => setMostrarActual((v) => !v)}
            placeholder="Ingresa tu contraseña actual"
          />

          <CampoContrasena
            etiqueta="Nueva contraseña"
            valor={nueva}
            cambiarValor={setNueva}
            visible={mostrarNueva}
            alternarVisibilidad={() => setMostrarNueva((v) => !v)}
            placeholder="Ingresa tu nueva contraseña"
          />

          <View style={styles.requisitos}>
            <Text style={styles.tituloRequisitos}>
              La contraseña debe contener:
            </Text>

            {[
              [cumpleLongitud, 'Mínimo 8 caracteres'],
              [cumpleMayuscula, 'Al menos una letra mayúscula'],
              [cumpleMinuscula, 'Al menos una letra minúscula'],
              [cumpleNumero, 'Al menos un número'],
            ].map(([cumple, texto]) => (
              <View style={styles.filaRequisito} key={texto}>
                <Text
                  style={[
                    styles.marcaRequisito,
                    cumple && styles.requisitoCumplido,
                  ]}
                >
                  {cumple ? '✓' : '○'}
                </Text>

                <Text
                  style={[
                    styles.textoRequisito,
                    cumple && styles.requisitoCumplido,
                  ]}
                >
                  {texto}
                </Text>
              </View>
            ))}
          </View>

          <CampoContrasena
            etiqueta="Confirmar nueva contraseña"
            valor={confirmacion}
            cambiarValor={setConfirmacion}
            visible={mostrarConfirmacion}
            alternarVisibilidad={() =>
              setMostrarConfirmacion((v) => !v)
            }
            placeholder="Repite la nueva contraseña"
          />

          {!!(errorLocal || error) && (
            <View style={styles.alertaError}>
              <Text style={styles.iconoError}>!</Text>
              <Text style={styles.textoError}>
                {errorLocal || error}
              </Text>
            </View>
          )}

          <View style={styles.acciones}>
            <TouchableOpacity
              style={[
                styles.botonPrincipal,
                cambiando && styles.botonDeshabilitado,
              ]}
              onPress={validarYGuardar}
              disabled={cambiando}
              activeOpacity={0.85}
            >
              {cambiando ? (
                <ActivityIndicator color={C.blanco} />
              ) : (
                <Text style={styles.textoBotonPrincipal}>
                  Guardar contraseña
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonSecundario}
              onPress={onCerrar}
              disabled={cambiando}
              activeOpacity={0.85}
            >
              <Text style={styles.textoBotonSecundario}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.pie}>
          PetCare · Sistema de seguimiento de atención veterinaria
        </Text>
      </ScrollView>

      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        nombreUsuario={nombre}
        rolUsuario={rol}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  contenido: {
    padding: 20,
    paddingBottom: 36,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  migas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 22,
  },
  migaInicio: {
    color: C.primario,
    fontSize: 13,
    fontWeight: '600',
  },
  separador: {
    color: '#98A4AE',
    fontSize: 13,
  },
  migaActual: {
    color: C.secundario,
    fontSize: 13,
  },
  encabezadoPagina: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
    gap: 12,
  },
  titulo: {
    color: C.texto,
    fontSize: 25,
    fontWeight: '800',
  },
  subtitulo: {
    color: C.secundario,
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  iconoPerfil: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: '#E0F2EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoPerfilTexto: {
    fontSize: 25,
    color: C.primario,
  },
  tarjetaPerfil: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.blanco,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 18,
    marginBottom: 18,
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: {
    color: C.blanco,
    fontSize: 20,
    fontWeight: '800',
  },
  datosPerfil: {
    flex: 1,
  },
  nombre: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
  },
  correo: {
    color: C.secundario,
    fontSize: 13,
    marginTop: 4,
  },
  etiquetas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  etiquetaRol: {
    backgroundColor: '#E6F4F1',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  textoRol: {
    color: C.oscuro,
    fontSize: 12,
    fontWeight: '700',
  },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  puntoEstado: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  puntoInactivo: {
    backgroundColor: C.error,
  },
  textoEstado: {
    color: C.secundario,
    fontSize: 12,
  },
  tarjetaFormulario: {
    backgroundColor: C.blanco,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 20,
  },
  tituloFormulario: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  descripcion: {
    color: C.secundario,
    fontSize: 13,
    marginTop: 6,
    lineHeight: 19,
  },
  divisor: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 20,
  },
  grupoCampo: {
    marginBottom: 18,
  },
  etiqueta: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  filaInput: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: C.blanco,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: C.texto,
    fontSize: 14,
    paddingVertical: 12,
  },
  botonVer: {
    width: 40,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  requisitos: {
    backgroundColor: '#F6F9FA',
    borderRadius: 11,
    padding: 13,
    marginTop: -3,
    marginBottom: 18,
  },
  tituloRequisitos: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 9,
  },
  filaRequisito: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  marcaRequisito: {
    width: 22,
    color: '#89969F',
    fontWeight: '800',
  },
  textoRequisito: {
    color: C.secundario,
    fontSize: 12,
  },
  requisitoCumplido: {
    color: C.exito,
  },
  alertaError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.fondoError,
    borderWidth: 1,
    borderColor: '#FECDCA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 9,
  },
  iconoError: {
    color: C.error,
    fontWeight: '900',
    fontSize: 16,
  },
  textoError: {
    flex: 1,
    color: C.error,
    fontSize: 12,
    lineHeight: 18,
  },
  acciones: {
    gap: 11,
    marginTop: 3,
  },
  botonPrincipal: {
    minHeight: 49,
    borderRadius: 11,
    backgroundColor: C.primario,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  botonDeshabilitado: {
    opacity: 0.65,
  },
  textoBotonPrincipal: {
    color: C.blanco,
    fontSize: 14,
    fontWeight: '800',
  },
  botonSecundario: {
    minHeight: 47,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonSecundario: {
    color: C.oscuro,
    fontSize: 14,
    fontWeight: '700',
  },
  pie: {
    color: '#98A4AE',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 22,
  },
});
