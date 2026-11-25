
/**
 * ============================================================
 * PETCARE - EDITAR PROPIETARIO
 * RF15: Modificar información del propietario.
 * ============================================================
 *
 * Arquitectura:
 * Vista -> DAO -> Supabase.
 *
 * Funcionalidades:
 * - Consultar propietario por ID.
 * - Validar datos personales y de contacto.
 * - Confirmar la actualización.
 * - Actualizar mediante el DAO.
 * - Mostrar mensajes de éxito y error.
 * - Compatible con Expo Web y dispositivos móviles.
 * ============================================================
 */

import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

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
} from '../../dao/propietario/propietarioDAO';

import { supabase } from '../../services/supabase';

// ============================================================
// COLORES
// ============================================================

const C = {
  primario: '#187C72',
  primarioOscuro: '#12665E',
  fondo: '#FFFFFF',
  fondoPantalla: '#F5F8F8',
  texto: '#243238',
  textoSecundario: '#6B7C80',
  borde: '#D9E2E3',
  error: '#C62828',
  obligatorio: '#D64545',
  blanco: '#FFFFFF',
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function EditarPropietario() {
  const parametros = useLocalSearchParams();

  const propietarioId = Array.isArray(parametros.propietarioId)
    ? parametros.propietarioId[0]
    : parametros.propietarioId;

  // ----------------------------------------------------------
  // ESTADOS
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // CARGAR PERFIL DEL USUARIO
  // ----------------------------------------------------------

  const cargarPerfilUsuario = useCallback(async () => {
    try {
      const { data: sesionData, error: sesionError } =
        await supabase.auth.getUser();

      if (sesionError) {
        throw sesionError;
      }

      const usuario = sesionData?.user;

      if (!usuario) {
        return;
      }

      const { data, error } = await supabase
        .from('perfiles')
        .select('nombre_completo, rol')
        .eq('perfil_id', usuario.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setNombreUsuario(data.nombre_completo ?? '');
        setRolUsuario(data.rol ?? '');
      }
    } catch (error) {
      console.error(
        'Error al cargar perfil del usuario:',
        error
      );
    }
  }, []);

  // ----------------------------------------------------------
  // CARGAR PROPIETARIO
  // ----------------------------------------------------------

  const cargarPropietario = useCallback(async () => {
    if (!propietarioId) {
      Alert.alert(
        'Identificador requerido',
        'No se recibió el identificador del propietario.'
      );

      setCargando(false);
      return;
    }

    try {
      setCargando(true);

      const propietario = await consultarPropietarioPorId(
        propietarioId
      );

      if (!propietario) {
        throw new Error(
          'No se encontró la información del propietario.'
        );
      }

      setFormulario({
        nombre: propietario.nombre ?? '',
        apellido: propietario.apellido ?? '',
        documento_identidad:
          propietario.documento_identidad ?? '',
        telefono: String(propietario.telefono ?? '')
          .replace(/^\+51/, ''),
        correo: propietario.correo ?? '',
        direccion: propietario.direccion ?? '',
        observaciones: propietario.observaciones ?? '',
      });
    } catch (error) {
      console.error(
        'Error al cargar propietario:',
        error
      );

      Alert.alert(
        'Error al cargar',
        error.message ||
          'No fue posible cargar la información del propietario.'
      );
    } finally {
      setCargando(false);
    }
  }, [propietarioId]);

  // ----------------------------------------------------------
  // EFECTO INICIAL
  // ----------------------------------------------------------

  useEffect(() => {
    cargarPerfilUsuario();
    cargarPropietario();
  }, [cargarPerfilUsuario, cargarPropietario]);

  // ----------------------------------------------------------
  // ACTUALIZAR CAMPO
  // ----------------------------------------------------------

  const actualizarCampo = (campo, valor) => {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));

    setErrores((actual) => ({
      ...actual,
      [campo]: '',
    }));
  };

  // ----------------------------------------------------------
  // NORMALIZAR TELÉFONO
  // ----------------------------------------------------------

  const normalizarTelefono = (telefono) => {
    return String(telefono ?? '')
      .trim()
      .replace(/[\s()-]/g, '')
      .replace(/^\+51/, '');
  };

  // ----------------------------------------------------------
  // VALIDAR FORMULARIO
  // ----------------------------------------------------------

  const validarFormulario = () => {
    const nuevosErrores = {};

    const nombre = formulario.nombre.trim();
    const apellido = formulario.apellido.trim();
    const dni = formulario.documento_identidad.trim();
    const telefono = normalizarTelefono(
      formulario.telefono
    );
    const correo = formulario.correo.trim();

    if (!nombre) {
      nuevosErrores.nombre =
        'Ingrese el nombre del propietario.';
    }

    if (!apellido) {
      nuevosErrores.apellido =
        'Ingrese el apellido del propietario.';
    }

    if (!/^\d{8}$/.test(dni)) {
      nuevosErrores.documento_identidad =
        'El DNI debe contener exactamente 8 dígitos.';
    }

    if (!/^9\d{8}$/.test(telefono)) {
      nuevosErrores.telefono =
        'El teléfono debe tener 9 dígitos e iniciar con 9.';
    }

    if (
      correo &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
    ) {
      nuevosErrores.correo =
        'Ingrese un correo electrónico válido.';
    }

    setErrores(nuevosErrores);

    return Object.keys(nuevosErrores).length === 0;
  };

  // ----------------------------------------------------------
  // PREPARAR DATOS ACTUALIZADOS
  // ----------------------------------------------------------

  const obtenerDatosActualizados = () => ({
    nombre: formulario.nombre.trim(),
    apellido: formulario.apellido.trim(),
    documento_identidad:
      formulario.documento_identidad.trim(),
    telefono: normalizarTelefono(formulario.telefono),
    correo: formulario.correo.trim(),
    direccion: formulario.direccion.trim(),
    observaciones: formulario.observaciones.trim(),
  });

  // ----------------------------------------------------------
  // ACTUALIZAR PROPIETARIO
  // ----------------------------------------------------------

  const guardarCambios = async () => {
    if (guardando) {
      return;
    }

    if (!validarFormulario()) {
      Alert.alert(
        'Datos inválidos',
        'Verifique el formato de los datos ingresados.'
      );

      return;
    }

    if (!propietarioId) {
      Alert.alert(
        'Identificador requerido',
        'No se puede actualizar el propietario porque falta su identificador.'
      );

      return;
    }

    try {
      setGuardando(true);

      const datosActualizados =
        obtenerDatosActualizados();

      await actualizarPropietario(
        propietarioId,
        datosActualizados
      );

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
        ]
      );
    } catch (error) {
      console.error(
        'Error al actualizar propietario:',
        error
      );

      let mensaje =
        error?.message ||
        'No se pudieron guardar los cambios. Intente nuevamente.';

      if (error?.code === 'DUPLICADO_DNI') {
        mensaje =
          'El propietario ya se encuentra registrado.';
      } else if (error?.code === 'DUPLICADO_CORREO') {
        mensaje =
          'El correo electrónico ya se encuentra registrado por otro propietario.';
      } else if (error?.code === 'DATOS_INVALIDOS') {
        mensaje =
          'Los datos ingresados no cumplen las validaciones requeridas.';
      } else if (
        error?.code === '42501' ||
        error?.code === 'PGRST301'
      ) {
        mensaje =
          'No tienes permisos para modificar este propietario. Verifica tu sesión y los permisos de acceso.';
      }

      Alert.alert('Error al actualizar', mensaje);
    } finally {
      setGuardando(false);
    }
  };

  // ----------------------------------------------------------
  // CONFIRMAR ACTUALIZACIÓN
  // ----------------------------------------------------------

  const confirmarActualizacion = () => {
    const nombre = formulario.nombre.trim();
    const apellido = formulario.apellido.trim();
    const dni = formulario.documento_identidad.trim();
    const telefono = normalizarTelefono(
      formulario.telefono
    );
    const correo = formulario.correo.trim();

    // Validación de campos obligatorios.
    if (!nombre || !apellido || !dni || !telefono) {
      validarFormulario();

      Alert.alert(
        'Datos incompletos',
        'Complete los campos obligatorios para continuar.'
      );

      return;
    }

    // Validación de formatos.
    if (
      !/^\d{8}$/.test(dni) ||
      !/^9\d{8}$/.test(telefono) ||
      (
        correo &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
      )
    ) {
      validarFormulario();

      Alert.alert(
        'Datos inválidos',
        'Verifique el formato de los datos ingresados.'
      );

      return;
    }

    // Confirmación antes de actualizar.
    Alert.alert(
      'Confirmar cambios',
      '¿Estás seguro de que deseas guardar los cambios realizados en los datos del propietario?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Guardar',
          onPress: guardarCambios,
        },
      ]
    );
  };

  // ----------------------------------------------------------
  // VOLVER
  // ----------------------------------------------------------

  const volver = () => {
    router.back();
  };

  // ----------------------------------------------------------
  // CAMPO REUTILIZABLE
  // ----------------------------------------------------------

  const renderCampo = ({
    etiqueta,
    campo,
    placeholder,
    multiline = false,
    teclado = 'default',
    maxLength,
  }) => (
    <View style={styles.grupoCampo} key={campo}>
      <Text style={styles.etiqueta}>
        {etiqueta}

        {[
          'nombre',
          'apellido',
          'documento_identidad',
          'telefono',
        ].includes(campo) && (
          <Text style={styles.obligatorio}> *</Text>
        )}
      </Text>

      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultilinea,
          errores[campo] ? styles.inputError : null,
        ]}
        value={formulario[campo]}
        onChangeText={(valor) =>
          actualizarCampo(campo, valor)
        }
        placeholder={placeholder}
        placeholderTextColor="#9AA8AA"
        keyboardType={teclado}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        maxLength={maxLength}
        editable={!guardando}
        autoCapitalize={
          campo === 'correo' ? 'none' : 'sentences'
        }
        textAlignVertical={
          multiline ? 'top' : 'center'
        }
      />

      {!!errores[campo] && (
        <Text style={styles.textoError}>
          {errores[campo]}
        </Text>
      )}
    </View>
  );

  // ----------------------------------------------------------
  // PANTALLA DE CARGA
  // ----------------------------------------------------------

  if (cargando) {
    return (
      <SafeAreaView style={styles.contenedorPrincipal}>
        <StatusBar
          backgroundColor={C.primarioOscuro}
          barStyle="light-content"
        />

        <EncabezadoPetCare
          onAbrirMenu={() => setMenuAbierto(true)}
          onAbrirNotificaciones={() =>
            Alert.alert(
              'Notificaciones',
              'No hay notificaciones nuevas.'
            )
          }
        />

        <View style={styles.pantallaCarga}>
          <ActivityIndicator
            size="large"
            color={C.primario}
          />

          <Text style={styles.textoCargando}>
            Cargando información del propietario...
          </Text>
        </View>

        <MenuLateralDerecho
          visible={menuAbierto}
          onCerrar={() => setMenuAbierto(false)}
          nombreUsuario={nombreUsuario}
          rolUsuario={rolUsuario}
        />
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------------
  // VISTA PRINCIPAL
  // ----------------------------------------------------------

  return (
    <SafeAreaView style={styles.contenedorPrincipal}>
      <StatusBar
        backgroundColor={C.primarioOscuro}
        barStyle="light-content"
      />

      <EncabezadoPetCare
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() =>
          Alert.alert(
            'Notificaciones',
            'No hay notificaciones nuevas.'
          )
        }
      />

      <KeyboardAvoidingView
        style={styles.teclado}
        behavior={
          Platform.OS === 'ios' ? 'padding' : undefined
        }
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.contenidoScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* MIGAS DE PAN */}

          <View style={styles.migas}>
            <Text style={styles.textoMiga}>
              Propietarios
            </Text>

            <Text style={styles.separadorMiga}>
              {' / '}
            </Text>

            <Text style={styles.textoMigaActivo}>
              Editar propietario
            </Text>
          </View>

          {/* TÍTULO */}

          <View style={styles.filaTitulo}>
            <View style={styles.bloqueTitulo}>
              <Text style={styles.titulo}>
                Editar propietario
              </Text>

              <Text style={styles.subtitulo}>
                Modifica la información personal y de contacto
                del propietario.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.botonVolver}
              onPress={volver}
              disabled={guardando}
            >
              <Text style={styles.textoBotonVolver}>
                Volver
              </Text>
            </TouchableOpacity>
          </View>

          {/* FORMULARIO */}

          <View style={styles.contenedorFormulario}>
            <Text style={styles.tituloSeccion}>
              Información personal
            </Text>

            <Text style={styles.descripcionSeccion}>
              Los campos marcados con * son obligatorios.
            </Text>

            {renderCampo({
              etiqueta: 'Nombre',
              campo: 'nombre',
              placeholder: 'Ingrese el nombre',
              maxLength: 100,
            })}

            {renderCampo({
              etiqueta: 'Apellido',
              campo: 'apellido',
              placeholder: 'Ingrese el apellido',
              maxLength: 100,
            })}

            {renderCampo({
              etiqueta: 'Documento de identidad (DNI)',
              campo: 'documento_identidad',
              placeholder: 'Ingrese los 8 dígitos del DNI',
              teclado: 'numeric',
              maxLength: 8,
            })}

            <View style={styles.separadorFormulario} />

            <Text style={styles.tituloSeccion}>
              Información de contacto
            </Text>

            {renderCampo({
              etiqueta: 'Teléfono',
              campo: 'telefono',
              placeholder: 'Ingrese el número de celular',
              teclado: 'phone-pad',
              maxLength: 9,
            })}

            {renderCampo({
              etiqueta: 'Correo electrónico',
              campo: 'correo',
              placeholder: 'ejemplo@correo.com',
              teclado: 'email-address',
              maxLength: 150,
            })}

            {renderCampo({
              etiqueta: 'Dirección',
              campo: 'direccion',
              placeholder: 'Ingrese la dirección',
              maxLength: 250,
            })}

            <View style={styles.separadorFormulario} />

            <Text style={styles.tituloSeccion}>
              Información adicional
            </Text>

            {renderCampo({
              etiqueta: 'Observaciones',
              campo: 'observaciones',
              placeholder:
                'Ingrese observaciones adicionales (opcional)',
              multiline: true,
              maxLength: 1000,
            })}

            {/* BOTONES */}

            <View style={styles.contenedorBotones}>
              <TouchableOpacity
                style={styles.botonCancelar}
                onPress={volver}
                disabled={guardando}
              >
                <Text style={styles.textoBotonCancelar}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botonGuardar,
                  guardando && styles.botonDeshabilitado,
                ]}
                onPress={confirmarActualizacion}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator
                    color={C.blanco}
                    size="small"
                  />
                ) : (
                  <Text style={styles.textoBotonGuardar}>
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
    backgroundColor: C.fondoPantalla,
  },

  pantallaCarga: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },

  migas: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  textoMiga: {
    fontSize: 13,
    color: C.textoSecundario,
  },

  separadorMiga: {
    fontSize: 13,
    color: C.textoSecundario,
  },

  textoMigaActivo: {
    fontSize: 13,
    color: C.primario,
    fontWeight: '600',
  },

  filaTitulo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },

  bloqueTitulo: {
    flex: 1,
    minWidth: 200,
  },

  titulo: {
    fontSize: 25,
    fontWeight: '700',
    color: C.texto,
    marginBottom: 7,
  },

  subtitulo: {
    fontSize: 14,
    color: C.textoSecundario,
    lineHeight: 21,
  },

  botonVolver: {
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: C.blanco,
  },

  textoBotonVolver: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '600',
  },

  contenedorFormulario: {
    backgroundColor: C.blanco,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: C.borde,
    width: '100%',
    maxWidth: 950,
    alignSelf: 'center',
  },

  tituloSeccion: {
    fontSize: 17,
    color: C.texto,
    fontWeight: '700',
    marginBottom: 8,
  },

  descripcionSeccion: {
    fontSize: 13,
    color: C.textoSecundario,
    marginBottom: 20,
  },

  grupoCampo: {
    marginBottom: 18,
  },

  etiqueta: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },

  obligatorio: {
    color: C.obligatorio,
  },

  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: C.texto,
    backgroundColor: C.blanco,
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
    marginTop: 6,
  },

  separadorFormulario: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 15,
  },

  contenedorBotones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: C.borde,
  },

  botonCancelar: {
    minWidth: 120,
    minHeight: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borde,
    paddingHorizontal: 18,
    backgroundColor: C.blanco,
  },

  textoBotonCancelar: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '600',
  },

  botonGuardar: {
    minWidth: 160,
    minHeight: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 20,
    backgroundColor: C.primario,
  },

  botonDeshabilitado: {
    opacity: 0.65,
  },

  textoBotonGuardar: {
    color: C.blanco,
    fontSize: 14,
    fontWeight: '700',
  },

  espacioFinal: {
    height: 25,
  },
});
