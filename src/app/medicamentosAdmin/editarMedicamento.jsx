
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../services/supabase';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import {
  consultarMedicamentoPorId,
  editarMedicamento as actualizarMedicamento,
} from '../../services/administracion/medicamentosService';
import { logger } from '../../utils/logger';

const C = {
  primario: '#187C72',
  primarioOscuro: '#12665E',
  fondo: '#F5F8F8',
  blanco: '#FFFFFF',
  texto: '#243746',
  secundario: '#72818D',
  borde: '#DCE6E3',
  rojo: '#B42318',
  rojoFondo: '#FDECEC',
  verde: '#25834B',
};

const CATEGORIAS = ['Medicamento', 'Vacuna'];

export default function EditarMedicamento() {
  const { id } = useLocalSearchParams();

  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
  const [rolUsuario, setRolUsuario] = useState('Asistente');
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [medicamento, setMedicamento] = useState(null);
  const [nombre, setNombre] = useState('');
  const [concentracion, setConcentracion] = useState('');
  const [categoria, setCategoria] = useState('Medicamento');

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [errores, setErrores] = useState({});

  const esAdministrador =
    String(rolUsuario).trim().toLowerCase() === 'administrador';

  const cargarPerfil = useCallback(async () => {
    const {
      data: { user },
      error: errorUsuario,
    } = await supabase.auth.getUser();

    if (errorUsuario) throw errorUsuario;

    if (!user) {
      router.replace('/');
      return false;
    }

    const { data, error } = await supabase
      .from('perfiles')
      .select('nombre_completo, rol, estado_cuenta')
      .eq('perfil_id', user.id)
      .single();

    if (error) throw error;

    if (
      String(data.estado_cuenta || '').trim().toLowerCase() !== 'activo'
    ) {
      await supabase.auth.signOut();
      Alert.alert('Cuenta inactiva', 'Tu cuenta no se encuentra activa.');
      router.replace('/');
      return false;
    }

    setNombreUsuario(data.nombre_completo || 'Usuario');
    setRolUsuario(data.rol || 'Asistente');

    if (String(data.rol || '').trim().toLowerCase() !== 'administrador') {
      Alert.alert(
        'Acceso restringido',
        'Solo un administrador puede editar medicamentos.',
        [{ text: 'Aceptar', onPress: () => router.replace('/inicio') }]
      );
      return false;
    }

    return true;
  }, []);

  const cargarMedicamento = useCallback(async () => {
    try {
      setCargando(true);
      setErrorCarga('');

      if (!id || Array.isArray(id) || !/^\d+$/.test(String(id))) {
        throw new Error('El identificador del medicamento no es válido.');
      }

      const registro = await consultarMedicamentoPorId(Number(id));

      if (!registro) {
        throw new Error('No se encontró el medicamento solicitado.');
      }

      if (registro.activo !== true) {
        throw new Error(
          'Este medicamento está desactivado. Reactívalo antes de editarlo.'
        );
      }

      setMedicamento(registro);
      setNombre(registro.nombre_medicamento || '');
      setConcentracion(registro.concentracion || '');
      setCategoria(registro.categoria || 'Medicamento');
    } catch (e) {
      logger.error('Error al cargar medicamento para editar:', e);
      setErrorCarga(
        e?.message || 'No se pudo cargar la información del medicamento.'
      );
    } finally {
      setCargando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      const inicializar = async () => {
        try {
          const autorizado = await cargarPerfil();

          if (vigente && autorizado) {
            await cargarMedicamento();
          } else if (vigente) {
            setCargando(false);
          }
        } catch (e) {
          logger.error('Error al inicializar edición:', e);

          if (vigente) {
            setErrorCarga(
              e?.message || 'No se pudo inicializar la pantalla.'
            );
            setCargando(false);
          }
        }
      };

      inicializar();

      return () => {
        vigente = false;
      };
    }, [cargarPerfil, cargarMedicamento])
  );

  const validarFormulario = () => {
    const nuevosErrores = {};
    const nombreLimpio = nombre.trim();
    const concentracionLimpia = concentracion.trim();
    const categoriaLimpia = categoria.trim();

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

    if (!categoriaLimpia) {
      nuevosErrores.categoria = 'Seleccione una categoría.';
    }

    setErrores(nuevosErrores);

    return Object.keys(nuevosErrores).length === 0;
  };

  const guardarCambios = async () => {
    if (guardando || !medicamento) return;

    if (!esAdministrador) {
      Alert.alert(
        'Acceso restringido',
        'Solo un administrador puede editar medicamentos.'
      );
      return;
    }

    if (!validarFormulario()) return;

    try {
      setGuardando(true);

      // RF de administración de medicamentos:
      // la pantalla valida los datos y delega la actualización al servicio.
      // El servicio utiliza el DAO para guardar los cambios en Supabase.
      const actualizado = await actualizarMedicamento(
        medicamento.medicamento_id,
        {
          nombre_medicamento: nombre.trim(),
          concentracion: concentracion.trim(),
          categoria: categoria.trim(),
        }
      );

      const registroFinal = actualizado || {
        ...medicamento,
        nombre_medicamento: nombre.trim(),
        concentracion: concentracion.trim(),
        categoria: categoria.trim(),
      };

      Alert.alert(
        'Cambios guardados',
        'El medicamento se actualizó correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: () =>
              router.replace({
                pathname: '/medicamentosAdmin/detalleMedicamento',
                params: {
                  id: String(registroFinal.medicamento_id),
                },
              }),
          },
        ]
      );
    } catch (e) {
      logger.error('Error al guardar medicamento:', e);

      Alert.alert(
        'No se pudo guardar',
        e?.message || 'Ocurrió un error al actualizar el medicamento.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const cancelar = () => {
    router.replace({
      pathname: '/medicamentosAdmin/detalleMedicamento',
      params: { id: String(id) },
    });
  };

  const cerrarSesion = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setMenuAbierto(false);
      router.replace('/');
    } catch (e) {
      Alert.alert('Error', 'No se pudo cerrar la sesión.');
    }
  };

  if (!cargando && !esAdministrador && !errorCarga) {
    return (
      <SafeAreaView style={styles.contenedor}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.estadoCentro}>
          <Text style={styles.titulo}>Acceso restringido</Text>
          <Text style={styles.descripcion}>
            Solo un administrador puede editar medicamentos.
          </Text>
          <TouchableOpacity
            style={styles.botonPrimario}
            onPress={() => router.replace('/inicio')}
          >
            <Text style={styles.textoBotonPrimario}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor={C.blanco} />

      <EncabezadoPetCare
        nombreUsuario={nombreUsuario}
        rolUsuario={rolUsuario}
        onAbrirMenu={() => setMenuAbierto(true)}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.migas}>
            <Text
              style={styles.enlaceMiga}
              onPress={() => router.replace('/inicio')}
            >
              Inicio
            </Text>
            <Text style={styles.separador}> / </Text>
            <Text
              style={styles.enlaceMiga}
              onPress={() => router.replace('/medicamentosAdmin/medicamentos')}
            >
              Medicamentos
            </Text>
            <Text style={styles.separador}> / </Text>
            <Text style={styles.migaActual}>Editar</Text>
          </View>

          <View style={styles.encabezadoPagina}>
            <TouchableOpacity
              style={styles.botonVolver}
              onPress={cancelar}
              accessibilityLabel="Cancelar edición y volver al detalle"
            >
              <Text style={styles.flechaVolver}>‹</Text>
            </TouchableOpacity>

            <View style={styles.bloqueTitulo}>
              <Text style={styles.titulo}>Editar medicamento</Text>
              <Text style={styles.descripcion}>
                Actualiza la información del medicamento registrado.
              </Text>
            </View>
          </View>

          {cargando ? (
            <View style={styles.estadoCentro}>
              <ActivityIndicator size="large" color={C.primario} />
              <Text style={styles.textoCarga}>
                Cargando datos del medicamento...
              </Text>
            </View>
          ) : errorCarga ? (
            <View style={styles.tarjeta}>
              <Text style={styles.tituloError}>
                No se pudo abrir el medicamento
              </Text>
              <Text style={styles.textoError}>{errorCarga}</Text>

              <TouchableOpacity
                style={styles.botonPrimario}
                onPress={cargarMedicamento}
              >
                <Text style={styles.textoBotonPrimario}>Reintentar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botonSecundario}
                onPress={() =>
                  router.replace('/medicamentosAdmin/medicamentos')
                }
              >
                <Text style={styles.textoBotonSecundario}>
                  Volver al listado
                </Text>
              </TouchableOpacity>
            </View>
          ) : medicamento ? (
            <View style={styles.tarjeta}>
              <View style={styles.tituloTarjeta}>
                <View style={styles.icono}>
                  <Text style={styles.iconoTexto}>💊</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.nombreTarjeta}>
                    {medicamento.nombre_medicamento}
                  </Text>
                  <Text style={styles.codigo}>
                    Código: {medicamento.medicamento_id}
                  </Text>
                </View>
              </View>

              <View style={styles.aviso}>
                <Text style={styles.textoAviso}>
                  Solo se actualizarán los datos del medicamento. Su estado
                  activo no será modificado.
                </Text>
              </View>

              <Text style={styles.etiqueta}>
                Nombre del medicamento <Text style={styles.asterisco}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.campo,
                  errores.nombre ? styles.campoError : null,
                ]}
                value={nombre}
                onChangeText={(valor) => {
                  setNombre(valor);
                  if (errores.nombre) {
                    setErrores((anterior) => ({
                      ...anterior,
                      nombre: '',
                    }));
                  }
                }}
                placeholder="Ej. Amoxicilina"
                placeholderTextColor="#9AA7AF"
                maxLength={120}
                editable={!guardando}
                returnKeyType="next"
                accessibilityLabel="Nombre del medicamento"
              />
              {errores.nombre ? (
                <Text style={styles.mensajeError}>{errores.nombre}</Text>
              ) : (
                <Text style={styles.ayuda}>Máximo 120 caracteres.</Text>
              )}

              <Text style={styles.etiqueta}>Concentración</Text>
              <TextInput
                style={[
                  styles.campo,
                  errores.concentracion ? styles.campoError : null,
                ]}
                value={concentracion}
                onChangeText={(valor) => {
                  setConcentracion(valor);
                  if (errores.concentracion) {
                    setErrores((anterior) => ({
                      ...anterior,
                      concentracion: '',
                    }));
                  }
                }}
                placeholder="Ej. 250 mg o 1.5 mg/mL"
                placeholderTextColor="#9AA7AF"
                maxLength={80}
                editable={!guardando}
                returnKeyType="next"
                accessibilityLabel="Concentración del medicamento"
              />
              {errores.concentracion ? (
                <Text style={styles.mensajeError}>
                  {errores.concentracion}
                </Text>
              ) : (
                <Text style={styles.ayuda}>
                  Campo opcional. Máximo 80 caracteres.
                </Text>
              )}

              <Text style={styles.etiqueta}>
                Categoría <Text style={styles.asterisco}>*</Text>
              </Text>
              <View style={styles.categorias}>
                {CATEGORIAS.map((opcion) => {
                  const seleccionada = categoria === opcion;

                  return (
                    <TouchableOpacity
                      key={opcion}
                      style={[
                        styles.opcionCategoria,
                        seleccionada && styles.opcionSeleccionada,
                      ]}
                      onPress={() => {
                        setCategoria(opcion);
                        setErrores((anterior) => ({
                          ...anterior,
                          categoria: '',
                        }));
                      }}
                      disabled={guardando}
                    >
                      <Text
                        style={[
                          styles.textoCategoria,
                          seleccionada && styles.textoCategoriaSeleccionada,
                        ]}
                      >
                        {seleccionada ? '✓  ' : ''}
                        {opcion}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {errores.categoria ? (
                <Text style={styles.mensajeError}>{errores.categoria}</Text>
              ) : null}

              <View style={styles.separadorFicha} />

              <Text style={styles.etiqueta}>Estado actual</Text>
              <View style={styles.estadoActivo}>
                <View style={styles.puntoActivo} />
                <Text style={styles.textoEstadoActivo}>Activo</Text>
              </View>

              <View style={styles.acciones}>
                <TouchableOpacity
                  style={[
                    styles.botonGuardar,
                    guardando && styles.botonDeshabilitado,
                  ]}
                  onPress={guardarCambios}
                  disabled={guardando}
                >
                  {guardando ? (
                    <ActivityIndicator color={C.blanco} />
                  ) : (
                    <Text style={styles.textoBotonGuardar}>
                      Guardar cambios
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botonSecundario}
                  onPress={cancelar}
                  disabled={guardando}
                >
                  <Text style={styles.textoBotonSecundario}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        nombreUsuario={nombreUsuario}
        rolUsuario={rolUsuario}
        onCerrarSesion={cerrarSesion}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  flex: {
    flex: 1,
  },
  contenido: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
  },
  migas: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  enlaceMiga: {
    color: C.primario,
    fontSize: 13,
    fontWeight: '600',
  },
  separador: {
    color: C.secundario,
    fontSize: 13,
  },
  migaActual: {
    color: C.secundario,
    fontSize: 13,
  },
  encabezadoPagina: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  botonVolver: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flechaVolver: {
    color: C.primario,
    fontSize: 34,
    lineHeight: 38,
    marginTop: -3,
  },
  bloqueTitulo: {
    flex: 1,
  },
  titulo: {
    color: C.texto,
    fontSize: 23,
    fontWeight: '800',
  },
  descripcion: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 20,
    marginBottom: 20,
  },
  tituloTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginBottom: 18,
  },
  icono: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2F2EE',
  },
  iconoTexto: {
    fontSize: 27,
  },
  nombreTarjeta: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
  },
  codigo: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 5,
  },
  aviso: {
    backgroundColor: '#EAF5F3',
    borderRadius: 9,
    padding: 12,
    marginBottom: 20,
  },
  textoAviso: {
    color: C.primarioOscuro,
    fontSize: 12,
    lineHeight: 18,
  },
  etiqueta: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 14,
  },
  asterisco: {
    color: C.rojo,
  },
  campo: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: C.texto,
    backgroundColor: C.blanco,
    fontSize: 14,
  },
  campoError: {
    borderColor: C.rojo,
    backgroundColor: '#FFFAFA',
  },
  ayuda: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 5,
  },
  mensajeError: {
    color: C.rojo,
    fontSize: 12,
    marginTop: 5,
  },
  categorias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  opcionCategoria: {
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  opcionSeleccionada: {
    borderColor: C.primario,
    backgroundColor: '#EAF5F3',
  },
  textoCategoria: {
    color: C.secundario,
    fontSize: 13,
    fontWeight: '600',
  },
  textoCategoriaSeleccionada: {
    color: C.primarioOscuro,
    fontWeight: '800',
  },
  separadorFicha: {
    height: 1,
    backgroundColor: C.borde,
    marginTop: 22,
    marginBottom: 8,
  },
  estadoActivo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    borderRadius: 20,
    backgroundColor: '#E8F6EC',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  puntoActivo: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.verde,
  },
  textoEstadoActivo: {
    color: C.verde,
    fontSize: 12,
    fontWeight: '800',
  },
  acciones: {
    gap: 10,
    marginTop: 24,
  },
  botonGuardar: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: C.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonGuardar: {
    color: C.blanco,
    fontSize: 14,
    fontWeight: '800',
  },
  botonDeshabilitado: {
    opacity: 0.65,
  },
  botonSecundario: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
  },
  textoBotonSecundario: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '700',
  },
  estadoCentro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  textoCarga: {
    color: C.secundario,
    fontSize: 13,
    marginTop: 12,
  },
  tituloError: {
    color: C.rojo,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  textoError: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  botonPrimario: {
    minHeight: 44,
    borderRadius: 9,
    backgroundColor: C.primario,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 18,
  },
  textoBotonPrimario: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },
});
