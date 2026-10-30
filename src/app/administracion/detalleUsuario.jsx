
import React, { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';import { supabase } from '../../services/supabase';
import {
  gestionarCambioEstadoCuenta,
} from '../../services/administracion/usuariosService';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import { logger } from '../../utils/logger';

const C = {
  primario: '#187C72',
  primarioOscuro: '#12645C',
  texto: '#263238',
  secundario: '#718096',
  fondo: '#F5F8F8',
  blanco: '#FFFFFF',
  borde: '#E2E8F0',
  rojo: '#C0392B',
  rojoClaro: '#FDECEC',
  verdeClaro: '#E5F5F1',
};

export default function DetalleUsuario() {
  const parametros = useLocalSearchParams();

  const id = Array.isArray(parametros.id)
    ? parametros.id[0]
    : parametros.id;

  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);

  const [modalDesactivar, setModalDesactivar] = useState(false);
  const [modalConfirmarGuardado, setModalConfirmarGuardado] =
    useState(false);
  const [modalActivar, setModalActivar] = useState(false);

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
  const [rolUsuario, setRolUsuario] = useState('Administrador');

  const [formulario, setFormulario] = useState({
    nombres: '',
    apellidos: '',
    dni: '',
    correo: '',
    telefono: '',
    direccion: '',
  });

  // ==========================================
  // CARGAR INFORMACIÓN DEL USUARIO
  // ==========================================

  const cargarUsuario = useCallback(async () => {
    try {
      setCargando(true);
      setErrorCarga('');

      if (!id) {
        throw new Error(
          'No se recibió el identificador del usuario seleccionado.'
        );
      }

      const {
        data: { user },
        error: errorSesion,
      } = await supabase.auth.getUser();

      if (errorSesion) throw errorSesion;

      if (!user) {
        router.replace('/');
        return;
      }

      const {
        data: perfilActual,
        error: errorPerfilActual,
      } = await supabase
        .from('perfiles')
        .select('nombre_completo, rol, estado_cuenta')
        .eq('perfil_id', user.id)
        .single();

      if (errorPerfilActual) throw errorPerfilActual;

      if (
        perfilActual.rol !== 'Administrador' ||
        perfilActual.estado_cuenta !== 'Activo'
      ) {
        Alert.alert(
          'Acceso restringido',
          'Solo un administrador activo puede consultar los usuarios.',
          [
            {
              text: 'Volver',
              onPress: () => router.replace('/inicio'),
            },
          ]
        );
        return;
      }

      setNombreUsuario(
        perfilActual.nombre_completo || 'Administrador'
      );
      setRolUsuario(perfilActual.rol || 'Administrador');

      const {
        data,
        error: errorConsulta,
      } = await supabase
        .from('perfiles')
        .select('*')
        .eq('perfil_id', id)
        .single();

      if (errorConsulta) throw errorConsulta;

      if (!data) {
        throw new Error('El usuario seleccionado no existe.');
      }

      const partes = (data.nombre_completo || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      const nombres = partes.shift() || '';
      const apellidos = partes.join(' ');

      let correo = '';

      if (data.perfil_id === user.id) {
        correo = user.email || '';
      }

      setUsuario({
        ...data,
        email: correo,
      });

      setFormulario({
        nombres,
        apellidos,
        dni: data.documento_identidad || '',
        correo,
        telefono: data.telefono || '',
        direccion: data.direccion || '',
      });
    } catch (error) {
      logger.error(
        'Error al cargar el detalle del usuario:',
        error
      );

      setErrorCarga(
        error.message ||
          'No se pudieron cargar los datos del usuario.'
      );
    } finally {
      setCargando(false);
    }
  }, [id]);

useEffect(() => {
  let activo = true;

  const cargar = async () => {
    if (!activo) return;

    await cargarUsuario();
  };

  cargar();

  return () => {
    activo = false;
  };
}, [cargarUsuario]);
  // ==========================================
  // CAMBIAR CAMPOS DEL FORMULARIO
  // ==========================================

  const cambiarCampo = (campo, valor) => {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  };

  // ==========================================
  // REGRESAR A GESTIÓN DE USUARIOS
  // ==========================================

  const volverAGestionUsuarios = () => {
    if (guardando) return;
    router.replace('/administracion/gestionUsuario');
  };

  // ==========================================
  // INICIAR EDICIÓN
  // ==========================================

  const iniciarEdicion = () => {
    setMensajeExito('');
    setEditando(true);
  };

  // ==========================================
  // SOLICITAR CONFIRMACIÓN PARA GUARDAR
  // ==========================================

  const guardarCambios = () => {
    if (guardando) return;

    if (
      !formulario.nombres.trim() ||
      !formulario.apellidos.trim() ||
      !formulario.dni.trim()
    ) {
      Alert.alert(
        'Campos obligatorios',
        'Completa los nombres, apellidos y DNI.'
      );
      return;
    }

    if (
      formulario.correo.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formulario.correo.trim()
      )
    ) {
      Alert.alert(
        'Correo inválido',
        'Ingresa un correo electrónico válido.'
      );
      return;
    }

    if (!id) {
      Alert.alert(
        'Error',
        'No se encontró el identificador del usuario.'
      );
      return;
    }

    setMensajeExito('');
    setModalConfirmarGuardado(true);
  };

  // ==========================================
  // CONFIRMAR Y GUARDAR EN SUPABASE
  // ==========================================

  const confirmarGuardado = async () => {
    if (guardando || !id) return;

    try {
      setGuardando(true);

      const nombreCompleto =
        `${formulario.nombres.trim()} ${formulario.apellidos.trim()}`;

      const datosActualizados = {
        nombre_completo: nombreCompleto,
        documento_identidad: formulario.dni.trim(),
        telefono: formulario.telefono.trim() || null,
        direccion: formulario.direccion.trim() || null,
      };

      const {
        data,
        error,
      } = await supabase
        .from('perfiles')
        .update(datosActualizados)
        .eq('perfil_id', id)
        .select('perfil_id')
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        throw new Error(
          'Supabase no confirmó la actualización. Verifica que el perfil exista y que las políticas RLS permitan modificarlo.'
        );
      }

      setUsuario((anterior) => ({
        ...anterior,
        ...datosActualizados,
      }));

      setFormulario((anterior) => ({
        ...anterior,
        nombres: formulario.nombres.trim(),
        apellidos: formulario.apellidos.trim(),
        dni: formulario.dni.trim(),
        telefono: formulario.telefono.trim(),
        direccion: formulario.direccion.trim(),
      }));

      setModalConfirmarGuardado(false);
      setEditando(false);

      setMensajeExito(
        'Los datos del usuario se actualizaron correctamente.'
      );
    } catch (error) {
      logger.error(
        'Error al actualizar el usuario:',
        error
      );

      Alert.alert(
        'No se pudo guardar',
        error.message ||
          'Ocurrió un error al actualizar los datos del usuario.'
      );
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // CANCELAR EDICIÓN
  // ==========================================

  const cancelarEdicion = () => {
    if (guardando) return;

    setModalConfirmarGuardado(false);
    setEditando(false);
    cargarUsuario();
  };

  // ==========================================
  // ACTIVAR O DESACTIVAR CUENTA
  // ==========================================

    // CUS45 - MVC: la vista solicita el cambio al servicio.
  // El servicio valida la solicitud y el DAO actualiza Supabase.
  // CP01: cambio confirmado y persistido.
  // CP02: cancelación sin modificar la cuenta.
  // CP03: no se encontró una fila actualizada.
  // CP04: error de persistencia sin mensaje de éxito.
  const cambiarEstadoCuenta = async (nuevoEstado) => {
    if (guardando || !id) return;

    const estaActivando = nuevoEstado === 'Activo';

    try {
      setGuardando(true);
      setMensajeExito('');

      // ACT: la confirmación se produce al pulsar el botón
      // correspondiente dentro del modal.
      const resultado = await gestionarCambioEstadoCuenta({
        perfilId: id,
        nuevoEstado,
        confirmado: true,
      });

      // ASSERT: no mostrar éxito si el servicio informa un fallo.
      if (!resultado.ok) {
        if (resultado.cancelado) {
          setModalDesactivar(false);
          setModalActivar(false);
          return;
        }

        throw new Error(
          resultado.error ||
            'No fue posible actualizar el estado de la cuenta.'
        );
      }

      // Actualizar la interfaz solo tras confirmar la persistencia.
      setUsuario((anterior) => ({
        ...anterior,
        ...resultado.usuario,
        estado_cuenta: resultado.usuario.estado_cuenta,
      }));

      setModalDesactivar(false);
      setModalActivar(false);

      setMensajeExito(
        estaActivando
          ? 'La cuenta se activó correctamente.'
          : 'La cuenta se desactivó correctamente.'
      );
    } catch (error) {
      logger.error(
        `Error al ${
          estaActivando ? 'activar' : 'desactivar'
        } la cuenta:`,
        error
      );

      Alert.alert(
        estaActivando
          ? 'No se pudo activar'
          : 'No se pudo desactivar',
        error.message ||
          'Ocurrió un error al actualizar el estado de la cuenta.'
      );
    } finally {
      setGuardando(false);
    }
  };
  // ==========================================
  // CERRAR SESIÓN — RF07
  // La confirmación pertenece al menú lateral.
  // Esta función únicamente cierra la sesión.
  // ==========================================

  const cerrarSesion = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setMenuAbierto(false);
    router.replace('/');
  };

  // ==========================================
  // MOSTRAR CAMPOS
  // ==========================================

  const mostrarCampo = (
    etiqueta,
    valor,
    propiedad,
    editable = false,
    teclado = 'default'
  ) => (
    <View style={styles.campo} key={propiedad}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>

      {editando && editable ? (
        <TextInput
          style={styles.entrada}
          value={valor}
          onChangeText={(texto) =>
            cambiarCampo(propiedad, texto)
          }
          placeholder={`Ingrese ${etiqueta.toLowerCase()}`}
          placeholderTextColor="#94A3B8"
          keyboardType={teclado}
          editable={!guardando}
        />
      ) : (
        <Text style={styles.valor}>
          {valor || 'No registrado'}
        </Text>
      )}
    </View>
  );

  // ==========================================
  // PANTALLA DE CARGA
  // ==========================================

  if (cargando) {
    return (
      <SafeAreaView style={styles.pantalla}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.cargando}>
          <ActivityIndicator
            size="large"
            color={C.primario}
          />

          <Text style={styles.textoSecundario}>
            Cargando datos del usuario...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // PANTALLA DE ERROR
  // ==========================================

  if (errorCarga || !usuario) {
    return (
      <SafeAreaView style={styles.pantalla}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.errorContenedor}>
          <Text style={styles.errorTitulo}>
            No se pudo abrir el detalle
          </Text>

          <Text style={styles.textoSecundario}>
            {errorCarga ||
              'No se encontró el usuario seleccionado.'}
          </Text>

          <TouchableOpacity
            style={styles.botonPrincipal}
            onPress={cargarUsuario}
          >
            <Text style={styles.textoBotonPrincipal}>
              Reintentar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botonVolverError}
            onPress={() =>
              router.replace('/administracion/gestionUsuario')
            }
          >
            <Text style={styles.textoBotonVolverError}>
              Volver a Gestión de usuarios
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const cuentaActiva = usuario.estado_cuenta === 'Activo';

  // ==========================================
  // PANTALLA PRINCIPAL
  // ==========================================

  return (
    <SafeAreaView style={styles.pantalla}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.blanco}
      />

      <EncabezadoPetCare
        titulo="Datos de usuario"
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() =>
          Alert.alert(
            'Notificaciones',
            'No tienes notificaciones nuevas.'
          )
        }
      />

      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.ruta}>
          <TouchableOpacity
            onPress={() => router.replace('/inicio')}
          >
            <Text style={styles.enlaceRuta}>Inicio</Text>
          </TouchableOpacity>

          <Text style={styles.separador}>{' / '}</Text>

          <TouchableOpacity
            onPress={() =>
              router.replace('/administracion/administracion')
            }
          >
            <Text style={styles.enlaceRuta}>
              Administración
            </Text>
          </TouchableOpacity>
        </View>

        {/* TÍTULO Y FLECHA DE REGRESO */}
        <View style={styles.filaTitulo}>
          <TouchableOpacity
            style={styles.botonRegresar}
            onPress={volverAGestionUsuarios}
            disabled={guardando}
            accessibilityRole="button"
            accessibilityLabel="Regresar a Gestión de usuarios"
            activeOpacity={0.75}
          >
            <Text style={styles.iconoRegresar}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.tituloPagina}>
            Datos de usuario
          </Text>
        </View>

        <View style={styles.estadoBarra}>
          <View
            style={[
              styles.puntoEstado,
              cuentaActiva
                ? styles.puntoActivo
                : styles.puntoInactivo,
            ]}
          />

          <Text style={styles.textoEstadoBarra}>
            {cuentaActiva
              ? 'Cuenta activa'
              : 'Cuenta inactiva'}
          </Text>
        </View>

        <View style={styles.tarjeta}>
          <View style={styles.encabezadoUsuario}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>
                {(formulario.nombres[0] || 'U').toUpperCase()}
                {(formulario.apellidos[0] || '').toUpperCase()}
              </Text>
            </View>

            <View style={styles.datosEncabezado}>
              <Text style={styles.nombreCompleto}>
                {`${formulario.nombres} ${formulario.apellidos}`.trim() ||
                  'Usuario'}
              </Text>

              <View
                style={[
                  styles.etiquetaEstado,
                  cuentaActiva
                    ? styles.etiquetaActiva
                    : styles.etiquetaInactiva,
                ]}
              >
                <Text
                  style={[
                    styles.textoEtiquetaEstado,
                    cuentaActiva
                      ? styles.textoActivo
                      : styles.textoInactivo,
                  ]}
                >
                  {cuentaActiva ? 'Activa' : 'Inactiva'}
                </Text>
              </View>
            </View>
          </View>

          {mensajeExito ? (
            <View style={styles.mensajeExito}>
              <Text style={styles.iconoExito}>✓</Text>

              <Text style={styles.textoExito}>
                {mensajeExito}
              </Text>

              <TouchableOpacity
                onPress={() => setMensajeExito('')}
              >
                <Text style={styles.cerrarExito}>×</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.separadorTarjeta} />

          {mostrarCampo(
            'Nombres',
            formulario.nombres,
            'nombres',
            true
          )}

          {mostrarCampo(
            'Apellidos',
            formulario.apellidos,
            'apellidos',
            true
          )}

          {mostrarCampo(
            'DNI',
            formulario.dni,
            'dni',
            true,
            'number-pad'
          )}

          {mostrarCampo(
            'Correo electrónico',
            formulario.correo,
            'correo'
          )}

          {mostrarCampo(
            'Teléfono',
            formulario.telefono,
            'telefono',
            true,
            'phone-pad'
          )}

          {mostrarCampo(
            'Dirección',
            formulario.direccion,
            'direccion',
            true
          )}

          {mostrarCampo(
            'Rol',
            usuario.rol || '',
            'rol'
          )}

          {mostrarCampo(
            'Fecha de creación',
            usuario.fecha_registro
              ? new Date(
                  usuario.fecha_registro
                ).toLocaleDateString('es-PE')
              : '',
            'fecha_registro'
          )}

          {/* BOTONES DE ACCIÓN */}
          <View style={styles.botones}>
            {editando ? (
              <>
                <TouchableOpacity
                  style={styles.botonSecundario}
                  disabled={guardando}
                  onPress={cancelarEdicion}
                >
                  <Text style={styles.textoBotonSecundario}>
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botonPrincipal}
                  disabled={guardando}
                  onPress={guardarCambios}
                >
                  <Text style={styles.textoBotonPrincipal}>
                    Guardar cambios
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.botonPrincipal}
                  disabled={guardando}
                  onPress={iniciarEdicion}
                >
                  <Text style={styles.textoBotonPrincipal}>
                    Editar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.botonEstadoCuenta,
                    cuentaActiva
                      ? styles.botonDesactivar
                      : styles.botonActivar,
                  ]}
                  disabled={guardando}
                  onPress={() => {
                    if (cuentaActiva) {
                      setModalDesactivar(true);
                    } else {
                      setModalActivar(true);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.textoBotonEstadoCuenta,
                      cuentaActiva
                        ? styles.textoBotonDesactivar
                        : styles.textoBotonActivar,
                    ]}
                  >
                    {cuentaActiva ? 'Desactivar' : 'Activar'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* MODAL: CONFIRMAR GUARDADO */}
      <Modal
        visible={modalConfirmarGuardado}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!guardando) {
            setModalConfirmarGuardado(false);
          }
        }}
      >
        <View style={styles.fondoModal}>
          <View style={styles.modal}>
            <View style={styles.iconoModificar}>
              <Text style={styles.signoModificar}>?</Text>
            </View>

            <Text style={styles.tituloModal}>
              Confirmar cambios
            </Text>

            <Text style={styles.descripcionModal}>
              ¿Deseas guardar los cambios realizados en los
              datos de este usuario?
            </Text>

            <View style={styles.botonesModal}>
              <TouchableOpacity
                style={[
                  styles.botonSecundario,
                  styles.botonModal,
                ]}
                disabled={guardando}
                onPress={() =>
                  setModalConfirmarGuardado(false)
                }
              >
                <Text style={styles.textoBotonSecundario}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botonPrincipal,
                  styles.botonModal,
                ]}
                disabled={guardando}
                onPress={confirmarGuardado}
              >
                {guardando ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <Text style={styles.textoBotonPrincipal}>
                    Confirmar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: CONFIRMAR DESACTIVACIÓN */}
      <Modal
        visible={modalDesactivar}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!guardando) {
            setModalDesactivar(false);
          }
        }}
      >
        <View style={styles.fondoModal}>
          <View style={styles.modal}>
            <View style={styles.iconoModal}>
              <Text style={styles.signoModal}>!</Text>
            </View>

            <Text style={styles.tituloModal}>
              Desactivar cuenta
            </Text>

            <Text style={styles.descripcionModal}>
              ¿Deseas desactivar esta cuenta? El usuario
              quedará inactivo en el sistema.
            </Text>

            <View style={styles.botonesModal}>
              <TouchableOpacity
                style={[
                  styles.botonSecundario,
                  styles.botonModal,
                ]}
                disabled={guardando}
                onPress={() => setModalDesactivar(false)}
              >
                <Text style={styles.textoBotonSecundario}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botonDesactivar,
                  styles.botonModal,
                ]}
                disabled={guardando}
                onPress={() => cambiarEstadoCuenta('Inactivo')}
              >
                {guardando ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <Text style={styles.textoBotonDesactivar}>
                    Confirmar desactivación
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: CONFIRMAR ACTIVACIÓN */}
      <Modal
        visible={modalActivar}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!guardando) {
            setModalActivar(false);
          }
        }}
      >
        <View style={styles.fondoModal}>
          <View style={styles.modal}>
            <View style={styles.iconoActivar}>
              <Text style={styles.signoActivar}>✓</Text>
            </View>

            <Text style={styles.tituloModal}>
              Activar cuenta
            </Text>

            <Text style={styles.descripcionModal}>
              ¿Deseas activar nuevamente esta cuenta? El
              usuario podrá volver a acceder según sus
              permisos.
            </Text>

            <View style={styles.botonesModal}>
              <TouchableOpacity
                style={[
                  styles.botonSecundario,
                  styles.botonModal,
                ]}
                disabled={guardando}
                onPress={() => setModalActivar(false)}
              >
                <Text style={styles.textoBotonSecundario}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botonActivar,
                  styles.botonModal,
                ]}
                disabled={guardando}
                onPress={() => cambiarEstadoCuenta('Activo')}
              >
                {guardando ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <Text style={styles.textoBotonActivar}>
                    Confirmar activación
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

// ==========================================
// ESTILOS
// ==========================================

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  contenido: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 35,
  },

  cargando: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  textoSecundario: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },

  ruta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  enlaceRuta: {
    fontSize: 12,
    color: C.primario,
    fontWeight: '700',
  },

  separador: {
    color: C.secundario,
    fontSize: 12,
  },

  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },

  botonRegresar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconoRegresar: {
    color: C.primario,
    fontSize: 31,
    lineHeight: 34,
    fontWeight: '500',
    marginTop: -3,
  },

  tituloPagina: {
    flex: 1,
    color: C.texto,
    fontSize: 23,
    fontWeight: '800',
  },

  estadoBarra: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    marginBottom: 16,
  },

  puntoEstado: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 9,
  },

  puntoActivo: {
    backgroundColor: C.primario,
  },

  puntoInactivo: {
    backgroundColor: C.rojo,
  },

  textoEstadoBarra: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
  },

  tarjeta: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 14,
    padding: 17,
  },

  encabezadoUsuario: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  avatarTexto: {
    color: C.primarioOscuro,
    fontSize: 18,
    fontWeight: '800',
  },

  datosEncabezado: {
    flex: 1,
  },

  nombreCompleto: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
  },

  etiquetaEstado: {
    alignSelf: 'flex-start',
    marginTop: 7,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  etiquetaActiva: {
    backgroundColor: C.verdeClaro,
  },

  etiquetaInactiva: {
    backgroundColor: C.rojoClaro,
  },

  textoEtiquetaEstado: {
    fontSize: 11,
    fontWeight: '800',
  },

  textoActivo: {
    color: C.primarioOscuro,
  },

  textoInactivo: {
    color: C.rojo,
  },

  separadorTarjeta: {
    height: 1,
    backgroundColor: C.borde,
    marginBottom: 5,
  },

  campo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F4',
  },

  etiqueta: {
    flex: 1,
    color: C.secundario,
    fontSize: 12,
    fontWeight: '600',
  },

  valor: {
    flex: 1.2,
    color: C.texto,
    fontSize: 13,
    textAlign: 'right',
  },

  entrada: {
    flex: 1.2,
    minHeight: 40,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 8,
    color: C.texto,
    fontSize: 13,
    textAlign: 'right',
  },

  mensajeExito: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.verdeClaro,
    borderWidth: 1,
    borderColor: '#B9E6D8',
    borderRadius: 9,
    padding: 11,
    marginBottom: 10,
  },

  iconoExito: {
    color: C.primarioOscuro,
    fontSize: 17,
    fontWeight: '800',
    marginRight: 8,
  },

  textoExito: {
    flex: 1,
    color: C.primarioOscuro,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  cerrarExito: {
    color: C.primarioOscuro,
    fontSize: 22,
    paddingHorizontal: 5,
  },

  botones: {
    gap: 10,
    marginTop: 20,
  },

  botonPrincipal: {
    minHeight: 46,
    backgroundColor: C.primario,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoBotonPrincipal: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  botonSecundario: {
    minHeight: 46,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoBotonSecundario: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  botonDesactivar: {
    minHeight: 46,
    backgroundColor: C.rojo,
    borderWidth: 1,
    borderColor: C.rojo,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoBotonDesactivar: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  botonActivar: {
    minHeight: 46,
    backgroundColor: C.primario,
    borderWidth: 1,
    borderColor: C.primario,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoBotonActivar: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  botonEstadoCuenta: {
    width: '100%',
  },

  textoBotonEstadoCuenta: {
    textAlign: 'center',
  },

  botonVolverError: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  textoBotonVolverError: {
    color: C.primario,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  errorContenedor: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },

  errorTitulo: {
    color: C.rojo,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },

  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },

  modal: {
    width: '100%',
    maxWidth: 420,
    padding: 23,
    borderRadius: 17,
    backgroundColor: C.blanco,
    alignItems: 'center',
  },

  iconoModal: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.rojoClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  signoModal: {
    color: C.rojo,
    fontSize: 25,
    fontWeight: '800',
  },

  iconoModificar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E7F0FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  signoModificar: {
    color: C.primario,
    fontSize: 25,
    fontWeight: '800',
  },

  iconoActivar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  signoActivar: {
    color: C.primarioOscuro,
    fontSize: 25,
    fontWeight: '800',
  },

  tituloModal: {
    color: C.texto,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },

  descripcionModal: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 22,
  },

  botonesModal: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },

  botonModal: {
    flex: 1,
  },
});
