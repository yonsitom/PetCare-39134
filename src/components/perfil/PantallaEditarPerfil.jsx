
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { router } from 'expo-router';
import { supabase } from '../../services/supabase';

import {
  actualizarPerfilUsuario,
  MENSAJES_RF05,
  validarDatosPerfil,
} from '../../services/perfilServicio';

import EncabezadoPetCare from '../layout/EncabezadoPetCare';
import MenuLateralDerecho from '../layout/MenuLateralDerecho';
import { logger } from '../../utils/logger';

const C = {
  primario: '#187C72',
  oscuro: '#193B38',
  texto: '#365653',
  secundario: '#718783',
  fondo: '#F4F8F7',
  blanco: '#FFFFFF',
  borde: '#DCE8E5',
  suave: '#EAF5F2',
  error: '#B42318',
  errorFondo: '#FEF3F2',
};

function Campo({
  etiqueta,
  valor,
  cambiar,
  placeholder,
  editable = true,
  teclado = 'default',
  obligatorio = false,
  mayusculas = 'sentences',
  guardando = false,
  referencia,
  onSubmitEditing,
  retorno = 'next',
  error = false,
  maxLength,
}) {
  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>
        {etiqueta}
        {obligatorio ? (
          <Text style={styles.obligatorio}> *</Text>
        ) : null}
      </Text>

      <TextInput
        ref={referencia}
        value={valor}
        onChangeText={cambiar}
        placeholder={placeholder || etiqueta}
        placeholderTextColor="#9AA9A5"
        editable={editable && !guardando}
        keyboardType={teclado}
        autoCapitalize={mayusculas}
        autoCorrect={false}
        returnKeyType={retorno}
        onSubmitEditing={onSubmitEditing}
        maxLength={maxLength}
        accessibilityLabel={etiqueta}
        accessibilityState={{ disabled: !editable || guardando }}
        style={[
          styles.input,
          !editable && styles.inputBloqueado,
          error && styles.inputConError,
        ]}
      />

      {error ? (
        <Text style={styles.mensajeCampoError}>
          Revisa este campo antes de guardar.
        </Text>
      ) : null}
    </View>
  );
}

export default function PantallaEditarPerfil({
  onVolver,
  onGuardado,
}) {
  const scrollRef = useRef(null);

  const referencias = {
    nombres: useRef(null),
    apellidos: useRef(null),
    correo: useRef(null),
    telefono: useRef(null),
    direccion: useRef(null),
  };

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [perfilId, setPerfilId] = useState(null);

  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [correoOriginal, setCorreoOriginal] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');

  const [documento, setDocumento] = useState('');
  const [rol, setRol] = useState('');
  const [estadoCuenta, setEstadoCuenta] = useState('');
  const [fechaRegistro, setFechaRegistro] = useState('');

  const [error, setError] = useState('');
  const [campoError, setCampoError] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [modalConfirmacionVisible, setModalConfirmacionVisible] =
    useState(false);

  const volver = useCallback(() => {
    if (guardando) return;

    if (onVolver) {
      onVolver();
    } else {
      router.back();
    }
  }, [guardando, onVolver]);

  useEffect(() => {
    cargarPerfil();
  }, []);

  async function cargarPerfil() {
    setCargando(true);
    setError('');

    try {
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario || !user) {
        throw new Error('No se encontró una sesión activa.');
      }

      const { data, error: errorPerfil } = await supabase
        .from('perfiles')
        .select(
          'perfil_id, nombre_completo, documento_identidad, telefono, direccion, rol, fecha_registro, estado_cuenta'
        )
        .eq('perfil_id', user.id)
        .single();

      if (errorPerfil) {
        throw errorPerfil;
      }

      const partesNombre = (data.nombre_completo || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      setPerfilId(data.perfil_id);
      setNombres(partesNombre.shift() || '');
      setApellidos(partesNombre.join(' '));
      setCorreo(user.email || '');
      setCorreoOriginal(user.email || '');
      setTelefono(
        String(data.telefono || '').replace(/\D/g, '').slice(0, 9)
      );
      setDireccion(data.direccion || '');
      setDocumento(data.documento_identidad || '');
      setRol(data.rol || '');
      setEstadoCuenta(data.estado_cuenta || '');
      setFechaRegistro(data.fecha_registro || '');
    } catch (e) {
      logger.error('RF05: error al cargar perfil:', e);
      setError(
        e?.message === 'No se encontró una sesión activa.'
          ? e.message
          : 'No se pudo cargar la información del perfil.'
      );
    } finally {
      setCargando(false);
    }
  }

  function cambiarCampo(campo, setter, valor) {
    setter(valor);

    if (campoError === campo) {
      setCampoError(null);
      setError('');
    }
  }

  // Desplaza el formulario hasta el campo que debe corregirse.
  function enfocarCampo(campo) {
    setCampoError(campo);

    const referencia = referencias[campo];

    requestAnimationFrame(() => {
      const campoActual = referencia?.current;
      const scrollActual = scrollRef.current;

      if (!campoActual || !scrollActual) return;

      campoActual.measureLayout(
        scrollActual,
        (_x, y) => {
          scrollActual.scrollTo({
            y: Math.max(0, y - 45),
            animated: true,
          });

          setTimeout(() => {
            referencia?.current?.focus();
          }, 300);
        },
        () => {
          referencia?.current?.focus();
        }
      );
    });
  }

  function obtenerDatos() {
    return {
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      correo: correo.trim(),
      telefono: telefono.trim(),
      direccion: direccion.trim(),
    };
  }

  function telefonoValido(valor) {
    return /^9\d{8}$/.test(valor.trim());
  }

  // Valida los campos antes de mostrar la confirmación.
  function solicitarConfirmacion() {
    setError('');
    setCampoError(null);

    const datos = obtenerDatos();

    if (!telefonoValido(datos.telefono)) {
      setError(
        'El teléfono debe contener exactamente 9 dígitos y comenzar por 9.'
      );
      enfocarCampo('telefono');
      return;
    }

    const validacion = validarDatosPerfil(datos);

    if (!validacion.valido) {
      setError(validacion.mensaje);
      enfocarCampo(validacion.campo);
      return;
    }

    setModalConfirmacionVisible(true);
  }

  // Guarda los cambios confirmados.
  async function guardarPerfil() {
    if (!perfilId || guardando) return;

    const datos = obtenerDatos();

    if (!telefonoValido(datos.telefono)) {
      setError(
        'El teléfono debe contener exactamente 9 dígitos y comenzar por 9.'
      );
      enfocarCampo('telefono');
      return;
    }

    setGuardando(true);
    setError('');
    setCampoError(null);

    try {
      const resultado = await actualizarPerfilUsuario({
        perfilId,
        correoOriginal,
        datos,
        cliente: supabase,
      });

      setModalConfirmacionVisible(false);

      if (resultado.requiereVerificacionCorreo) {
        // Mantiene la confirmación de verificación del correo.
        setGuardando(false);

        setTimeout(() => {
          import('react-native').then(({ Alert }) => {
            Alert.alert(
              'Confirma tu correo electrónico',
              resultado.mensaje,
              [
                {
                  text: 'Continuar',
                  onPress: () => onGuardado?.(),
                },
              ]
            );
          });
        }, 100);

        return;
      }

      onGuardado?.();
    } catch (e) {
      logger.error('RF05: error al guardar perfil:', e);

      const mensaje = e?.message || MENSAJES_RF05.guardar;

      if (mensaje === MENSAJES_RF05.obligatorios) {
        const datosActuales = obtenerDatos();

        const campoVacio = !datosActuales.nombres
          ? 'nombres'
          : !datosActuales.apellidos
            ? 'apellidos'
            : !datosActuales.correo
              ? 'correo'
              : !datosActuales.telefono
                ? 'telefono'
                : 'direccion';

        setError(mensaje);
        enfocarCampo(campoVacio);
      } else if (mensaje === MENSAJES_RF05.correo) {
        setError(mensaje);
        enfocarCampo('correo');
      } else if (mensaje === MENSAJES_RF05.telefono) {
        setError(mensaje);
        enfocarCampo('telefono');
      } else if (mensaje === MENSAJES_RF05.correoDuplicado) {
        setError(mensaje);
        enfocarCampo('correo');
      } else {
        setError(
          mensaje === 'No se encontró una sesión activa.'
            ? mensaje
            : MENSAJES_RF05.guardar
        );
      }
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <View style={styles.contenedor}>
        <EncabezadoPetCare
          onAbrirMenu={() => setMenuVisible(true)}
        />

        <View style={styles.cargando}>
          <ActivityIndicator size="large" color={C.primario} />
          <Text style={styles.textoCargando}>
            Cargando información...
          </Text>
        </View>

        <MenuLateralDerecho
          visible={menuVisible}
          onCerrar={() => setMenuVisible(false)}
          nombreUsuario={`${nombres} ${apellidos}`.trim() || 'Usuario PetCare'}
          rolUsuario={rol}
        />
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <EncabezadoPetCare
        onAbrirMenu={() => setMenuVisible(true)}
      />

      <KeyboardAvoidingView
        style={styles.contenidoPantalla}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.encabezadoFormulario}>
            <TouchableOpacity
              style={styles.botonVolver}
              onPress={volver}
              disabled={guardando}
              accessibilityRole="button"
              accessibilityLabel="Volver al perfil"
            >
              <Text style={styles.flecha}>‹</Text>
            </TouchableOpacity>

            <View style={styles.encabezadoTexto}>
              <Text style={styles.miga}>
                Inicio / Mi perfil / Información personal
              </Text>
              <Text style={styles.titulo}>Editar información</Text>
              <Text style={styles.subtitulo}>
                Actualiza los datos de tu perfil.
              </Text>
            </View>

            <View style={styles.iconoUsuario}>
              <Text style={styles.iconoUsuarioTexto}>♙</Text>
            </View>
          </View>

          {error ? (
            <View
              style={styles.alertaError}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              <Text style={styles.alertaIcono}>⚠</Text>
              <Text style={styles.alertaTexto}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.tarjeta}>
            <View style={styles.tituloTarjeta}>
              <View style={styles.iconoTarjeta}>
                <Text style={styles.iconoTarjetaTexto}>♙</Text>
              </View>

              <View style={styles.tituloTarjetaTexto}>
                <Text style={styles.tituloSeccion}>
                  Datos personales
                </Text>
                <Text style={styles.descripcionSeccion}>
                  Los campos con * son obligatorios.
                </Text>
              </View>
            </View>

            <Campo
              etiqueta="Nombres"
              valor={nombres}
              cambiar={(v) => cambiarCampo('nombres', setNombres, v)}
              referencia={referencias.nombres}
              placeholder="Ingrese sus nombres"
              obligatorio
              guardando={guardando}
              error={campoError === 'nombres'}
              onSubmitEditing={() => referencias.apellidos.current?.focus()}
            />

            <Campo
              etiqueta="Apellidos"
              valor={apellidos}
              cambiar={(v) => cambiarCampo('apellidos', setApellidos, v)}
              referencia={referencias.apellidos}
              placeholder="Ingrese sus apellidos"
              obligatorio
              guardando={guardando}
              error={campoError === 'apellidos'}
              onSubmitEditing={() => referencias.correo.current?.focus()}
            />

            <Campo
              etiqueta="Correo electrónico"
              valor={correo}
              cambiar={(v) => cambiarCampo('correo', setCorreo, v)}
              referencia={referencias.correo}
              placeholder="Ingrese su correo electrónico"
              teclado="email-address"
              mayusculas="none"
              obligatorio
              guardando={guardando}
              error={campoError === 'correo'}
              onSubmitEditing={() => referencias.telefono.current?.focus()}
            />

            <Campo
              etiqueta="Teléfono"
              valor={telefono}
              cambiar={(v) => {
                const soloNumeros = v.replace(/\D/g, '').slice(0, 9);
                cambiarCampo('telefono', setTelefono, soloNumeros);
              }}
              referencia={referencias.telefono}
              placeholder="Ejemplo: 987654321"
              teclado="phone-pad"
              mayusculas="none"
              maxLength={9}
              obligatorio
              guardando={guardando}
              error={campoError === 'telefono'}
              onSubmitEditing={() => referencias.direccion.current?.focus()}
            />

            <Campo
              etiqueta="Dirección"
              valor={direccion}
              cambiar={(v) => cambiarCampo('direccion', setDireccion, v)}
              referencia={referencias.direccion}
              placeholder="Ingrese su dirección"
              obligatorio
              guardando={guardando}
              error={campoError === 'direccion'}
              retorno="done"
            />
          </View>

          <View style={styles.tarjeta}>
            <View style={styles.tituloTarjeta}>
              <View style={styles.iconoTarjeta}>
                <Text style={styles.iconoTarjetaTexto}>▤</Text>
              </View>

              <View style={styles.tituloTarjetaTexto}>
                <Text style={styles.tituloSeccion}>
                  Información de la cuenta
                </Text>
                <Text style={styles.descripcionSeccion}>
                  Estos datos no se pueden modificar.
                </Text>
              </View>
            </View>

            <Campo
              etiqueta="DNI"
              valor={documento}
              editable={false}
              guardando={guardando}
            />

            <Campo
              etiqueta="Rol"
              valor={rol}
              editable={false}
              guardando={guardando}
            />

            <Campo
              etiqueta="Estado de la cuenta"
              valor={estadoCuenta}
              editable={false}
              guardando={guardando}
            />

            <Campo
              etiqueta="Fecha de registro"
              valor={
                fechaRegistro
                  ? new Date(fechaRegistro).toLocaleDateString('es-PE')
                  : ''
              }
              editable={false}
              guardando={guardando}
            />
          </View>

          <View style={styles.botones}>
            <TouchableOpacity
              style={styles.botonCancelar}
              onPress={volver}
              disabled={guardando}
              accessibilityRole="button"
            >
              <Text style={styles.textoCancelar}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botonGuardar,
                guardando && styles.botonDeshabilitado,
              ]}
              onPress={solicitarConfirmacion}
              disabled={guardando}
              accessibilityRole="button"
            >
              <Text style={styles.textoGuardar}>
                Guardar cambios
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.nota}>
            Mantén tus datos actualizados para facilitar la gestión de tu cuenta.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal personalizado de confirmación */}
      <Modal
        visible={modalConfirmacionVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!guardando) {
            setModalConfirmacionVisible(false);
          }
        }}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalTarjeta}>
            <View style={styles.modalIcono}>
              <Text style={styles.modalIconoTexto}>✓</Text>
            </View>

            <Text style={styles.modalTitulo}>
              Confirmar cambios
            </Text>

            <Text style={styles.modalDescripcion}>
              ¿Deseas guardar los cambios realizados en tu perfil?
            </Text>

            <View style={styles.modalBotones}>
              <TouchableOpacity
                style={styles.modalBotonCancelar}
                onPress={() => setModalConfirmacionVisible(false)}
                disabled={guardando}
                accessibilityRole="button"
              >
                <Text style={styles.modalTextoCancelar}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBotonConfirmar,
                  guardando && styles.botonDeshabilitado,
                ]}
                onPress={guardarPerfil}
                disabled={guardando}
                accessibilityRole="button"
              >
                {guardando ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <Text style={styles.modalTextoConfirmar}>
                    Confirmar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <MenuLateralDerecho
        visible={menuVisible}
        onCerrar={() => setMenuVisible(false)}
        nombreUsuario={`${nombres} ${apellidos}`.trim() || 'Usuario PetCare'}
        rolUsuario={rol}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  contenidoPantalla: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  contenido: {
    padding: 20,
    paddingBottom: 36,
  },
  cargando: {
    flex: 1,
    backgroundColor: C.fondo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoCargando: {
    marginTop: 12,
    color: C.secundario,
    fontSize: 14,
  },
  encabezadoFormulario: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  botonVolver: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  flecha: {
    fontSize: 32,
    lineHeight: 34,
    color: C.primario,
    marginTop: -4,
  },
  encabezadoTexto: {
    flex: 1,
  },
  miga: {
    fontSize: 12,
    color: C.secundario,
    marginBottom: 5,
  },
  titulo: {
    fontSize: 23,
    fontWeight: '800',
    color: C.oscuro,
  },
  subtitulo: {
    fontSize: 13,
    color: C.secundario,
    marginTop: 5,
  },
  iconoUsuario: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: C.suave,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  iconoUsuarioTexto: {
    fontSize: 26,
    color: C.primario,
  },
  alertaError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.errorFondo,
    borderColor: '#FECDCA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    marginBottom: 16,
  },
  alertaIcono: {
    color: C.error,
    fontSize: 18,
    marginRight: 9,
  },
  alertaTexto: {
    flex: 1,
    color: C.error,
    fontSize: 13,
    lineHeight: 19,
  },
  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#193B38',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  tituloTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconoTarjeta: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.suave,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  iconoTarjetaTexto: {
    color: C.primario,
    fontSize: 21,
    fontWeight: '700',
  },
  tituloTarjetaTexto: {
    flex: 1,
  },
  tituloSeccion: {
    color: C.oscuro,
    fontSize: 16,
    fontWeight: '800',
  },
  descripcionSeccion: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 4,
  },
  campo: {
    marginBottom: 16,
  },
  etiqueta: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  obligatorio: {
    color: C.error,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: C.oscuro,
    backgroundColor: C.blanco,
    fontSize: 14,
  },
  inputBloqueado: {
    backgroundColor: '#F1F5F4',
    color: C.secundario,
  },
  inputConError: {
    borderColor: C.error,
    borderWidth: 2,
    backgroundColor: C.errorFondo,
  },
  mensajeCampoError: {
    color: C.error,
    fontSize: 12,
    marginTop: 6,
  },
  botones: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  botonCancelar: {
    flex: 1,
    minHeight: 49,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCancelar: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '700',
  },
  botonGuardar: {
    flex: 1.4,
    minHeight: 49,
    borderRadius: 12,
    backgroundColor: C.primario,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  botonDeshabilitado: {
    opacity: 0.7,
  },
  textoGuardar: {
    color: C.blanco,
    fontSize: 14,
    fontWeight: '800',
  },
  nota: {
    textAlign: 'center',
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
    paddingHorizontal: 10,
  },

  // Modal Confirmar cambios: mismo estilo visual de PetCare.
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(25, 59, 56, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalTarjeta: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.blanco,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#193B38',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  modalIcono: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: C.suave,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconoTexto: {
    color: C.primario,
    fontSize: 30,
    fontWeight: '800',
  },
  modalTitulo: {
    color: C.oscuro,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDescripcion: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalBotones: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalBotonCancelar: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTextoCancelar: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '700',
  },
  modalBotonConfirmar: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: C.primario,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTextoConfirmar: {
    color: C.blanco,
    fontSize: 14,
    fontWeight: '800',
  },
});
