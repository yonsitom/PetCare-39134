
import React, { useCallback, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import { registrarMedicamento as crearMedicamento } from '../../services/administracion/medicamentosService';

const CATEGORIAS = ['Medicamento', 'Vacuna'];

export default function RegistrarMedicamento() {
  const router = useRouter();

  const [nombre, setNombre] = useState('');
  const [concentracion, setConcentracion] = useState('');
  const [categoria, setCategoria] = useState('Medicamento');

  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [verificandoAcceso, setVerificandoAcceso] = useState(true);

  // RF: validar que solo un administrador activo acceda al registro.
  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      async function verificarAcceso() {
        try {
          setVerificandoAcceso(true);

          const { data: sesionData, error: sesionError } =
            await supabase.auth.getSession();

          if (sesionError) throw sesionError;

          const usuario = sesionData?.session?.user;

          if (!usuario) {
            router.replace('/');
            return;
          }

          const { data: perfil, error: perfilError } = await supabase
            .from('perfiles')
            .select('rol, estado_cuenta')
            .eq('perfil_id', usuario.id)
            .maybeSingle();

          if (perfilError) throw perfilError;

          if (
            !perfil ||
            perfil.rol !== 'Administrador' ||
            perfil.estado_cuenta !== 'Activo'
          ) {
            Alert.alert(
              'Acceso denegado',
              'Solo un administrador activo puede registrar medicamentos.',
              [{ text: 'Aceptar', onPress: () => router.replace('/inicio') }]
            );
            return;
          }
        } catch (error) {
          Alert.alert(
            'Error de acceso',
            error?.message || 'No fue posible verificar los permisos.'
          );
          router.replace('/inicio');
        } finally {
          if (vigente) setVerificandoAcceso(false);
        }
      }

      verificarAcceso();

      return () => {
        vigente = false;
      };
    }, [router])
  );

  // RF: validar los campos antes de enviar el registro.
  function validarFormulario() {
    const nuevosErrores = {};
    const nombreLimpio = nombre.trim();
    const concentracionLimpia = concentracion.trim();

    if (!nombreLimpio) {
      nuevosErrores.nombre = 'Ingrese el nombre del medicamento.';
    } else if (nombreLimpio.length > 120) {
      nuevosErrores.nombre =
        'El nombre no puede superar los 120 caracteres.';
    }

    if (concentracionLimpia.length > 80) {
      nuevosErrores.concentracion =
        'La concentración no puede superar los 80 caracteres.';
    }

    if (!CATEGORIAS.includes(categoria)) {
      nuevosErrores.categoria = 'Seleccione una categoría válida.';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  }

  // RF: registrar medicamento usando la capa de servicio y el DAO.
  async function guardarMedicamento() {
    if (guardando || verificandoAcceso) return;
    if (!validarFormulario()) return;

    try {
      setGuardando(true);

      const nuevoMedicamento = await crearMedicamento({
        nombre_medicamento: nombre.trim(),
        concentracion: concentracion.trim() || null,
        categoria,
      });

      Alert.alert(
        'Registro exitoso',
        `Se registró el medicamento "${nuevoMedicamento.nombre_medicamento}".`,
        [
          {
            text: 'Aceptar',
            onPress: () =>
              router.replace({
                pathname: '/medicamentosAdmin/medicamentos',
              }),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'No se pudo registrar',
        error?.message ||
          'Ocurrió un error al guardar el medicamento. Inténtelo nuevamente.'
      );
    } finally {
      setGuardando(false);
    }
  }

  function limpiarFormulario() {
    setNombre('');
    setConcentracion('');
    setCategoria('Medicamento');
    setErrores({});
  }

  if (verificandoAcceso) {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.textoCargando}>
          Verificando permisos de acceso...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <EncabezadoPetCare />

      <View style={styles.contenido}>
        <ScrollView
          style={styles.areaFormulario}
          contentContainerStyle={styles.contenidoScroll}
          keyboardShouldPersistTaps="handled"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <Text style={styles.miga}>
              Administración / Medicamentos / Registrar
            </Text>

            <Text style={styles.titulo}>Agregar nuevo medicamento</Text>

            <Text style={styles.descripcion}>
              Complete los datos para incorporar un medicamento al catálogo
              de PetCare.
            </Text>

            <View style={styles.tarjeta}>
              <Text style={styles.etiqueta}>
                Nombre del medicamento <Text style={styles.obligatorio}>*</Text>
              </Text>

              <TextInput
                style={[
                  styles.input,
                  errores.nombre && styles.inputError,
                ]}
                value={nombre}
                onChangeText={(valor) => {
                  setNombre(valor);
                  if (errores.nombre) {
                    setErrores((actuales) => ({
                      ...actuales,
                      nombre: undefined,
                    }));
                  }
                }}
                placeholder="Ej. Amoxicilina"
                placeholderTextColor="#94a3b8"
                maxLength={120}
                editable={!guardando}
                accessibilityLabel="Nombre del medicamento"
              />

              {errores.nombre ? (
                <Text style={styles.textoError}>{errores.nombre}</Text>
              ) : null}

              <Text style={styles.ayuda}>
                Máximo 120 caracteres.
              </Text>

              <Text style={styles.etiqueta}>Concentración</Text>

              <TextInput
                style={[
                  styles.input,
                  errores.concentracion && styles.inputError,
                ]}
                value={concentracion}
                onChangeText={(valor) => {
                  setConcentracion(valor);
                  if (errores.concentracion) {
                    setErrores((actuales) => ({
                      ...actuales,
                      concentracion: undefined,
                    }));
                  }
                }}
                placeholder="Ej. 500 mg"
                placeholderTextColor="#94a3b8"
                maxLength={80}
                editable={!guardando}
                accessibilityLabel="Concentración del medicamento"
              />

              {errores.concentracion ? (
                <Text style={styles.textoError}>
                  {errores.concentracion}
                </Text>
              ) : null}

              <Text style={styles.ayuda}>
                Campo opcional. Máximo 80 caracteres.
              </Text>

              <Text style={styles.etiqueta}>
                Categoría <Text style={styles.obligatorio}>*</Text>
              </Text>

              <View style={styles.opcionesCategoria}>
                {CATEGORIAS.map((opcion) => {
                  const seleccionada = categoria === opcion;

                  return (
                    <TouchableOpacity
                      key={opcion}
                      style={[
                        styles.opcion,
                        seleccionada && styles.opcionSeleccionada,
                      ]}
                      onPress={() => {
                        setCategoria(opcion);
                        setErrores((actuales) => ({
                          ...actuales,
                          categoria: undefined,
                        }));
                      }}
                      disabled={guardando}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: seleccionada }}
                    >
                      <View
                        style={[
                          styles.radio,
                          seleccionada && styles.radioSeleccionado,
                        ]}
                      >
                        {seleccionada ? (
                          <View style={styles.radioInterior} />
                        ) : null}
                      </View>

                      <Text
                        style={[
                          styles.textoOpcion,
                          seleccionada && styles.textoOpcionSeleccionada,
                        ]}
                      >
                        {opcion}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {errores.categoria ? (
                <Text style={styles.textoError}>{errores.categoria}</Text>
              ) : null}

              <View style={styles.nota}>
                <Text style={styles.textoNota}>
                  El medicamento se registrará como activo y estará disponible
                  en el catálogo. La fecha de registro se asigna automáticamente.
                </Text>
              </View>

              <View style={styles.botones}>
                <TouchableOpacity
                  style={styles.botonSecundario}
                  onPress={limpiarFormulario}
                  disabled={guardando}
                >
                  <Text style={styles.textoBotonSecundario}>Limpiar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.botonPrincipal,
                    guardando && styles.botonDeshabilitado,
                  ]}
                  onPress={guardarMedicamento}
                  disabled={guardando}
                >
                  {guardando ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.textoBotonPrincipal}>
                      Guardar medicamento
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.botonCancelar}
                onPress={() => router.back()}
                disabled={guardando}
              >
                <Text style={styles.textoCancelar}>Cancelar y volver</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </ScrollView>

        <MenuLateralDerecho />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  contenido: {
    flex: 1,
    flexDirection: 'row',
  },
  areaFormulario: {
    flex: 1,
  },
  contenidoScroll: {
    padding: 24,
    paddingBottom: 40,
  },
  cargando: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  textoCargando: {
    color: '#475569',
    fontSize: 15,
  },
  miga: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 12,
  },
  titulo: {
    fontSize: 27,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  descripcion: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748b',
    marginBottom: 24,
  },
  tarjeta: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  etiqueta: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  obligatorio: {
    color: '#dc2626',
  },
  input: {
    width: '100%',
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    backgroundColor: '#ffffff',
    fontSize: 15,
  },
  inputError: {
    borderColor: '#dc2626',
  },
  textoError: {
    color: '#b91c1c',
    fontSize: 13,
    marginTop: 6,
  },
  ayuda: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 5,
  },
  opcionesCategoria: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 9,
    minWidth: 150,
  },
  opcionSeleccionada: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  radio: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  radioSeleccionado: {
    borderColor: '#2563eb',
  },
  radioInterior: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  textoOpcion: {
    color: '#475569',
    fontSize: 14,
  },
  textoOpcionSeleccionada: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  nota: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 24,
  },
  textoNota: {
    color: '#1e40af',
    fontSize: 13,
    lineHeight: 20,
  },
  botones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 28,
  },
  botonPrincipal: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    minHeight: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoBotonPrincipal: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  botonSecundario: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 20,
    minHeight: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotonSecundario: {
    color: '#334155',
    fontWeight: '600',
  },
  botonCancelar: {
    alignSelf: 'flex-end',
    paddingVertical: 14,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  textoCancelar: {
    color: '#475569',
    fontWeight: '600',
  },
});
