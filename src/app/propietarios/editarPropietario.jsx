
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

import {
  consultarPropietarioPorId,
  actualizarPropietario,
} from '../../dao/propietarioDAO';

import { supabase } from '../../services/supabase';
import { logger } from '../../utils/logger';

// ============================================================
// RF15: COLORES DE LA INTERFAZ
// ============================================================
const C = {
  primario: '#187C72',
  primarioOscuro: '#12665E',
  fondo: '#FFFFFF',
  texto: '#243238',
  textoSecundario: '#6B7C80',
  borde: '#D9E2E3',
  error: '#C62828',
  obligatorio: '#D64545',
};

// ============================================================
// COMPONENTE REUTILIZABLE DE CAMPO
// ============================================================
function CampoFormulario({
  etiqueta,
  campo,
  valor,
  placeholder,
  obligatorio = false,
  teclado = 'default',
  multilinea = false,
  mayusculas = 'sentences',
  error,
  deshabilitado = false,
  onCambiar,
}) {
  return (
    <View style={styles.grupoCampo}>
      <Text style={styles.etiqueta}>
        {etiqueta}
        {obligatorio ? (
          <Text style={styles.asterisco}> *</Text>
        ) : null}
      </Text>

      <TextInput
        style={[
          styles.input,
          multilinea && styles.inputMultilinea,
          error && styles.inputError,
        ]}
        value={valor}
        onChangeText={(texto) => onCambiar(campo, texto)}
        placeholder={placeholder}
        placeholderTextColor="#99A5A8"
        keyboardType={teclado}
        multiline={multilinea}
        editable={!deshabilitado}
        autoCapitalize={mayusculas}
        autoCorrect={campo === 'observaciones' || campo === 'direccion'}
        textAlignVertical={multilinea ? 'top' : 'center'}
        maxLength={campo === 'documento_identidad' ? 8 : undefined}
        underlineColorAndroid="transparent"
        blurOnSubmit={!multilinea}
        returnKeyType={multilinea ? 'default' : 'next'}
        accessibilityLabel={etiqueta}
      />

      {error ? (
        <Text style={styles.textoError}>{error}</Text>
      ) : null}
    </View>
  );
}

// ============================================================
// PANTALLA: EDITAR INFORMACIÓN DEL PROPIETARIO
// ============================================================
export default function EditarPropietario() {
  const parametros = useLocalSearchParams();
  const propietarioId = parametros.propietarioId;

  const [formulario, setFormulario] = useState({
    nombre: '',
    apellido: '',
    documento_identidad: '',
    telefono: '',
    correo: '',
    direccion: '',
    observaciones: '',
  });

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [errores, setErrores] = useState({});

  // ==========================================================
  // CARGAR EL PERFIL DEL USUARIO AUTENTICADO
  // ==========================================================
  const cargarPerfil = useCallback(async () => {
    try {
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario) {
        throw errorUsuario;
      }

      if (!user) {
        setNombreUsuario('Usuario');
        setRolUsuario('');
        return;
      }

      const { data, error } = await supabase
        .from('perfiles')
        .select('nombre_completo, rol')
        .eq('perfil_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setNombreUsuario(
        data?.nombre_completo || user.email || 'Usuario',
      );
      setRolUsuario(data?.rol || '');
    } catch (error) {
      logger.error('Error al cargar el perfil:', error);
      setNombreUsuario('Usuario');
      setRolUsuario('');
    }
  }, []);

  // ==========================================================
  // CARGAR LOS DATOS DEL PROPIETARIO
  // ==========================================================
  const cargarPropietario = useCallback(async () => {
    if (!propietarioId) {
      setCargando(false);

      Alert.alert(
        'Información no disponible',
        'No se recibió el identificador del propietario.',
        [{ text: 'Aceptar', onPress: () => router.back() }],
      );
      return;
    }

    try {
      setCargando(true);

      const resultado = await consultarPropietarioPorId(propietarioId);
      const propietario = resultado?.data ?? resultado;

      if (!propietario || propietario.error) {
        throw new Error(
          'No se encontró la información del propietario.',
        );
      }

      setFormulario({
        nombre: propietario.nombre || '',
        apellido: propietario.apellido || '',
        documento_identidad: propietario.documento_identidad || '',
        telefono: propietario.telefono || '',
        correo: propietario.correo || '',
        direccion: propietario.direccion || '',
        observaciones: propietario.observaciones || '',
      });

      setErrores({});
    } catch (error) {
      logger.error('Error al cargar propietario:', error);

      Alert.alert(
        'Error',
        error?.message ||
          'No fue posible cargar los datos del propietario.',
        [{ text: 'Aceptar', onPress: () => router.back() }],
      );
    } finally {
      setCargando(false);
    }
  }, [propietarioId]);

  useEffect(() => {
    cargarPerfil();
    cargarPropietario();
  }, [cargarPerfil, cargarPropietario]);

  // ==========================================================
  // ACTUALIZAR EL VALOR DE UN CAMPO
  // ==========================================================
  const cambiarCampo = (campo, valor) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));

    setErrores((anteriores) => ({
      ...anteriores,
      [campo]: '',
      general: '',
    }));
  };

  // ==========================================================
  // VALIDAR EL FORMULARIO — RF15 / CP02 / CP03
  // ==========================================================
  const validarFormulario = () => {
    const nuevosErrores = {};

    const nombre = formulario.nombre.trim();
    const apellido = formulario.apellido.trim();
    const dni = formulario.documento_identidad.trim();
    const telefono = formulario.telefono.trim().replace(/\s/g, '');
    const correo = formulario.correo.trim();

    if (!nombre) {
      nuevosErrores.nombre = 'Ingrese los nombres del propietario.';
    }

    if (!apellido) {
      nuevosErrores.apellido = 'Ingrese los apellidos del propietario.';
    }

    if (!/^\d{8}$/.test(dni)) {
      nuevosErrores.documento_identidad =
        'El DNI debe contener exactamente 8 dígitos.';
    }

    if (telefono && !/^(\+51)?9\d{8}$/.test(telefono)) {
      nuevosErrores.telefono =
        'Ingrese un celular válido de 9 dígitos.';
    }

    if (
      correo &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
    ) {
      nuevosErrores.correo =
        'Ingrese un correo electrónico válido.';
    }

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      const faltanObligatorios = !nombre || !apellido;

      Alert.alert(
        'Revise el formulario',
        faltanObligatorios
          ? 'Complete los campos obligatorios para continuar.'
          : 'Verifique el formato de los datos ingresados.',
      );

      return false;
    }

    return true;
  };

  // ==========================================================
  // GUARDAR LOS CAMBIOS — RF15 / CP01 / CP04 / CP05
  // ==========================================================
  const guardarCambios = async () => {
    if (guardando) {
      return;
    }

    if (!validarFormulario()) {
      return;
    }

    if (!propietarioId) {
      Alert.alert(
        'No se pudo actualizar',
        'No se recibió el identificador del propietario.',
      );
      return;
    }

    const datosActualizados = {
      nombre: formulario.nombre.trim(),
      apellido: formulario.apellido.trim(),
      documento_identidad: formulario.documento_identidad.trim(),
      telefono: formulario.telefono.trim(),
      correo: formulario.correo.trim(),
      direccion: formulario.direccion.trim(),
      observaciones: formulario.observaciones.trim(),
    };

    try {
      setGuardando(true);

      const resultado = await actualizarPropietario(
        propietarioId,
        datosActualizados,
      );

      if (resultado?.error) {
        throw resultado.error;
      }

      Alert.alert(
        'Actualización exitosa',
        'Los datos del propietario fueron actualizados correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: () => {
              router.replace({
                pathname: '/propietarios/fichaPropietario',
                params: {
                  propietarioId: String(propietarioId),
                },
              });
            },
          },
        ],
      );
    } catch (error) {
      logger.error('Error al actualizar propietario:', error);

      let mensajeError =
        'No se pudieron guardar los cambios. Intente nuevamente.';

      if (
        error?.code === 'DUPLICADO_DNI' ||
        error?.code === 'DUPLICADO_CORREO' ||
        error?.code === '23505' ||
        /ya se encuentra registrado|ya existe/i.test(
          error?.message || '',
        )
      ) {
        mensajeError = 'El propietario ya se encuentra registrado.';
      }

      Alert.alert('No se pudo actualizar', mensajeError);
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================================
  // CONFIRMAR ANTES DE GUARDAR
  // ==========================================================
const confirmarActualizacion = () => {
  // RF15: validar antes de solicitar la confirmación.
  // Si hay errores, no se debe abrir el diálogo de confirmación.
  if (!validarFormulario()) {
    return;
  }

  Alert.alert(
    'Confirmar cambios',
    '¿Desea guardar la información modificada del propietario?',
    [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Guardar',
        onPress: guardarCambios,
      },
    ],
  );
};
  // ==========================================================
  // VISTA DE CARGA
  // ==========================================================
  if (cargando) {
    return (
      <SafeAreaView
        style={styles.pantallaCarga}
        edges={['top', 'left', 'right']}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={C.fondo}
        />

        <ActivityIndicator size="large" color={C.primario} />

        <Text style={styles.textoCargando}>
          Cargando información del propietario...
        </Text>
      </SafeAreaView>
    );
  }

  // ==========================================================
  // INTERFAZ PRINCIPAL
  // ==========================================================
  return (
    <SafeAreaView
      style={styles.contenedorPrincipal}
      edges={['top', 'left', 'right']}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.fondo}
      />

      <EncabezadoPetCare
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() =>
          Alert.alert(
            'Notificaciones',
            'No hay notificaciones nuevas.',
          )
        }
      />

      <KeyboardAvoidingView
        style={styles.teclado}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contenidoScroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.migas}>
            <Text style={styles.migaInicio}>Propietarios</Text>
            <Text style={styles.separadorMigas}> / </Text>
            <Text style={styles.migaActual}>Editar información</Text>
          </View>

          <View style={styles.filaTitulo}>
            <TouchableOpacity
              style={styles.botonVolver}
              onPress={() => router.back()}
              disabled={guardando}
              accessibilityLabel="Volver"
            >
              <Text style={styles.flechaVolver}>‹</Text>
            </TouchableOpacity>

            <View style={styles.contenedorTitulo}>
              <Text style={styles.titulo}>Editar información</Text>
              <Text style={styles.subtitulo}>
                Modifique los datos del propietario.
              </Text>
            </View>
          </View>

          <View style={styles.contenedorFormulario}>
            <Text style={styles.textoAyuda}>
              Los campos marcados con * son obligatorios.
            </Text>

            <CampoFormulario
              etiqueta="Nombres"
              campo="nombre"
              valor={formulario.nombre}
              placeholder="Ingrese los nombres"
              obligatorio
              error={errores.nombre}
              deshabilitado={guardando}
              onCambiar={cambiarCampo}
            />

            <CampoFormulario
              etiqueta="Apellidos"
              campo="apellido"
              valor={formulario.apellido}
              placeholder="Ingrese los apellidos"
              obligatorio
              error={errores.apellido}
              deshabilitado={guardando}
              onCambiar={cambiarCampo}
            />

            <CampoFormulario
              etiqueta="DNI"
              campo="documento_identidad"
              valor={formulario.documento_identidad}
              placeholder="Ingrese los 8 dígitos del DNI"
              obligatorio
              teclado="numeric"
              mayusculas="none"
              error={errores.documento_identidad}
              deshabilitado={guardando}
              onCambiar={cambiarCampo}
            />

            <CampoFormulario
              etiqueta="Teléfono"
              campo="telefono"
              valor={formulario.telefono}
              placeholder="Ingrese el número de celular"
              teclado="phone-pad"
              mayusculas="none"
              error={errores.telefono}
              deshabilitado={guardando}
              onCambiar={cambiarCampo}
            />

            <CampoFormulario
              etiqueta="Correo electrónico"
              campo="correo"
              valor={formulario.correo}
              placeholder="ejemplo@correo.com"
              teclado="email-address"
              mayusculas="none"
              error={errores.correo}
              deshabilitado={guardando}
              onCambiar={cambiarCampo}
            />

            <CampoFormulario
              etiqueta="Dirección"
              campo="direccion"
              valor={formulario.direccion}
              placeholder="Ingrese la dirección del propietario"
              deshabilitado={guardando}
              onCambiar={cambiarCampo}
            />

            <CampoFormulario
              etiqueta="Observaciones"
              campo="observaciones"
              valor={formulario.observaciones}
              placeholder="Ingrese observaciones adicionales (opcional)"
              multilinea
              deshabilitado={guardando}
              onCambiar={cambiarCampo}
            />

            <View style={styles.contenedorBotones}>
              <TouchableOpacity
                style={[
                  styles.boton,
                  styles.botonCancelar,
                  guardando && styles.botonDeshabilitado,
                ]}
                onPress={() => router.back()}
                disabled={guardando}
              >
                <Text style={styles.textoCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.boton,
                  styles.botonGuardar,
                  guardando && styles.botonDeshabilitado,
                ]}
                onPress={confirmarActualizacion}
                disabled={guardando}
                accessibilityRole="button"
              >
                {guardando ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                    size="small"
                  />
                ) : (
                  <Text style={styles.textoGuardar}>
                    Guardar cambios
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.espacioFinal} />
        </ScrollView>
      </KeyboardAvoidingView>

      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        nombreUsuario={nombreUsuario}
        rolUsuario={rolUsuario}
      />
    </SafeAreaView>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = StyleSheet.create({
  contenedorPrincipal: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  pantallaCarga: {
    flex: 1,
    backgroundColor: C.fondo,
    justifyContent: 'center',
    alignItems: 'center',
  },

  textoCargando: {
    marginTop: 14,
    color: C.textoSecundario,
    fontSize: 14,
  },

  teclado: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  contenidoScroll: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 10,
  },

  migas: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 19,
  },

  migaInicio: {
    fontSize: 12,
    color: C.textoSecundario,
  },

  separadorMigas: {
    fontSize: 12,
    color: C.textoSecundario,
  },

  migaActual: {
    fontSize: 12,
    color: C.primario,
    fontWeight: '600',
  },

  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 23,
    width: '100%',
  },

  botonVolver: {
    width: 35,
    height: 42,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginRight: 8,
  },

  flechaVolver: {
    fontSize: 38,
    lineHeight: 42,
    color: C.primario,
    fontWeight: '400',
  },

  contenedorTitulo: {
    flex: 1,
    justifyContent: 'center',
  },

  titulo: {
    fontSize: 21,
    fontWeight: '700',
    color: C.texto,
  },

  subtitulo: {
    fontSize: 13,
    color: C.textoSecundario,
    marginTop: 5,
  },

  contenedorFormulario: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    padding: 0,
    margin: 0,
  },

  textoAyuda: {
    color: C.textoSecundario,
    fontSize: 12,
    marginBottom: 20,
  },

  grupoCampo: {
    width: '100%',
    marginBottom: 19,
  },

  etiqueta: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  asterisco: {
    color: C.obligatorio,
    fontWeight: '700',
  },

  input: {
    width: '100%',
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: C.texto,
    fontSize: 14,
  },

  inputMultilinea: {
    minHeight: 105,
    paddingTop: 12,
  },

  inputError: {
    borderColor: C.error,
  },

  textoError: {
    color: C.error,
    fontSize: 12,
    marginTop: 5,
  },

  contenedorBotones: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },

  boton: {
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botonCancelar: {
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: '#FFFFFF',
  },

  textoCancelar: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '600',
  },

  botonGuardar: {
    backgroundColor: C.primario,
    minWidth: 145,
  },

  textoGuardar: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  botonDeshabilitado: {
    opacity: 0.6,
  },

  espacioFinal: {
    height: 35,
  },
});
