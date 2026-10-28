import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { router } from 'expo-router';
import { supabase } from '../../services/supabase';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import { consultarPropietarios } from '../../dao/propietarioDAO';

const C = {
  fondo: '#F4F7F6',
  blanco: '#FFFFFF',
  primario: '#187C72',
  primarioOscuro: '#12665E',
  texto: '#233936',
  secundario: '#71827E',
  borde: '#DCE7E4',
  verdeFondo: '#E5F5EE',
  verde: '#24794F',
  rojoFondo: '#FCECEB',
  rojo: '#B94C46',
  grisFondo: '#EDF1F0',
};

const FILTROS = ['Todos', 'Activos', 'Inactivos'];

function normalizarTexto(valor) {
  return String(valor ?? '').trim();
}

function normalizarEstado(valor) {
  return normalizarTexto(valor).toLowerCase() === 'activo' ? 'Activo' : 'Inactivo';
}

function obtenerNombre(p) {
  const completo = p?.nombre_completo || p?.nombreCompleto || p?.nombres_completos;
  if (completo) return normalizarTexto(completo);
  const partes = [p?.nombres, p?.nombre, p?.apellidos, p?.apellido].filter(Boolean);
  return normalizarTexto(partes.join(' ')) || 'Propietario sin nombre';
}

function obtenerId(p) {
  return p?.propietario_id ?? p?.id ?? null;
}

function obtenerDocumento(p) {
  return normalizarTexto(p?.dni ?? p?.documento_identidad ?? p?.documento ?? p?.numero_documento);
}

function obtenerTelefono(p) {
  return normalizarTexto(p?.telefono ?? p?.celular ?? p?.telefono_contacto);
}

function obtenerCorreo(p) {
  return normalizarTexto(p?.correo_electronico ?? p?.correo ?? p?.email);
}

function obtenerDireccion(p) {
  return normalizarTexto(p?.direccion);
}

function obtenerMotivo(p) {
  return normalizarTexto(p?.motivo_desactivacion);
}

function obtenerIniciales(p) {
  return obtenerNombre(p).split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('');
}

function mensajeError(error) {
  const mensaje = error?.message || 'Ocurrió un error inesperado.';
  if (/permission denied|row-level security|rls/i.test(mensaje)) {
    return 'No tienes permisos para realizar esta operación. Verifica las políticas de acceso de Supabase.';
  }
  return mensaje;
}

export default function GestionPropietarios() {
  const [propietarios, setPropietarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [errorBusqueda, setErrorBusqueda] = useState('');
  const [filtro, setFiltro] = useState('Todos');
  const [propietarioSeleccionado, setPropietarioSeleccionado] = useState(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [modalEstado, setModalEstado] = useState(false);
  const [modalResultado, setModalResultado] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [accion, setAccion] = useState('desactivar');
  const [motivo, setMotivo] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState({ correcto: false, titulo: '', mensaje: '' });
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');

  const cargarPropietarios = useCallback(async (mostrarCarga = true) => {
    if (mostrarCarga) setCargando(true);
    else setActualizando(true);

    try {
      const respuesta = await consultarPropietarios();
      if (respuesta?.error) throw respuesta.error;

      const lista = Array.isArray(respuesta)
        ? respuesta
        : Array.isArray(respuesta?.data)
          ? respuesta.data
          : [];

      setPropietarios(lista);
      setPropietarioSeleccionado((actual) => {
        if (!actual) return null;
        const idActual = obtenerId(actual);
        return lista.find((item) => String(obtenerId(item)) === String(idActual)) || actual;
      });
    } catch (error) {
      console.error('Error al cargar propietarios:', error);
      Alert.alert('Error al cargar', mensajeError(error));
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  const cargarPerfil = useCallback(async () => {
    try {
      const { data: { user }, error: errorUsuario } = await supabase.auth.getUser();
      if (errorUsuario || !user) {
        router.replace('/');
        return;
      }

      const { data: perfil, error } = await supabase
        .from('perfiles')
        .select('nombre_completo, rol, estado_cuenta')
        .eq('perfil_id', user.id)
        .maybeSingle();

      if (error || !perfil) {
        Alert.alert('Error', 'No se pudo verificar tu perfil.');
        router.replace('/');
        return;
      }

      setNombreUsuario(perfil.nombre_completo || user.email?.split('@')[0] || 'Usuario');
      setRolUsuario(perfil.rol || '');

      if (perfil.estado_cuenta !== 'Activo') {
        Alert.alert('Cuenta inactiva', 'Tu cuenta no se encuentra activa.', [
          { text: 'Aceptar', onPress: () => router.replace('/') },
        ]);
        return;
      }

      if (perfil.rol !== 'Administrador') {
        Alert.alert('Acceso restringido', 'Solo el administrador puede gestionar propietarios.', [
          { text: 'Aceptar', onPress: () => router.replace('/inicio') },
        ]);
        return;
      }

      await cargarPropietarios();
    } catch (error) {
      console.error('Error al verificar el perfil:', error);
      Alert.alert('Error', mensajeError(error));
      router.replace('/');
    }
  }, [cargarPropietarios]);

  useEffect(() => {
    cargarPerfil();
  }, [cargarPerfil]);

  const propietariosFiltrados = useMemo(() => {
    const termino = busquedaAplicada.trim().toLowerCase();

    return propietarios.filter((p) => {
      const estado = normalizarEstado(p?.estado);
      const coincideFiltro =
        filtro === 'Todos' ||
        (filtro === 'Activos' && estado === 'Activo') ||
        (filtro === 'Inactivos' && estado === 'Inactivo');

      const campos = [obtenerNombre(p), obtenerDocumento(p), obtenerTelefono(p), obtenerCorreo(p)];
      const coincideBusqueda = !termino || campos.some((campo) => campo.toLowerCase().includes(termino));
      return coincideFiltro && coincideBusqueda;
    });
  }, [propietarios, busquedaAplicada, filtro]);

  function ejecutarBusqueda() {
    const termino = busqueda.trim();
    if (!termino) {
      setErrorBusqueda('Ingrese un dato para realizar la búsqueda.');
      setBusquedaAplicada('');
      return;
    }
    setErrorBusqueda('');
    setBusquedaAplicada(termino);
  }

  function abrirDetalle(propietario) {
    setPropietarioSeleccionado(propietario);
    setMostrarDetalle(true);
  }

  function volverAlListado() {
    setMostrarDetalle(false);
  }

  function abrirModalEstado(propietario, nuevaAccion) {
    setPropietarioSeleccionado(propietario);
    setAccion(nuevaAccion);
    setMotivo('');
    setMostrarDetalle(false);
    setModalEstado(true);
  }

  function cerrarModalEstado() {
    if (procesando) return;
    setModalEstado(false);
    setMotivo('');
  }

  async function confirmarCambioEstado() {
    if (procesando) return;

    const propietarioAnterior = propietarioSeleccionado;
    const id = obtenerId(propietarioAnterior);

    if (id === null || id === undefined) {
      Alert.alert('No se puede continuar', 'No se encontró el identificador del propietario.');
      return;
    }

    if (accion === 'desactivar' && !motivo.trim()) {
      Alert.alert('Motivo obligatorio', 'Ingresa el motivo por el que deseas desactivar al propietario.');
      return;
    }

    setProcesando(true);

    try {
      const { data, error } = await supabase.rpc('cambiar_estado_propietario', {
        p_propietario_id: id,
        p_accion: accion,
        p_motivo: accion === 'desactivar' ? motivo.trim() : null,
      });

      if (error) throw error;
      if (data?.correcto !== true) {
        throw new Error(data?.mensaje || 'La base de datos no confirmó el cambio de estado.');
      }

      const propietarioActualizado = {
        ...propietarioAnterior,
        estado: accion === 'desactivar' ? 'Inactivo' : 'Activo',
        motivo_desactivacion: accion === 'desactivar' ? motivo.trim() : null,
      };

      setPropietarios((lista) =>
        lista.map((item) =>
          String(obtenerId(item)) === String(id)
            ? { ...item, ...propietarioActualizado }
            : item
        )
      );
      setPropietarioSeleccionado(propietarioActualizado);
      setModalEstado(false);
      setMotivo('');

      setResultado({
        correcto: true,
        titulo: accion === 'desactivar' ? 'Propietario desactivado' : 'Propietario reactivado',
        mensaje: accion === 'desactivar'
          ? 'El propietario fue desactivado correctamente.'
          : 'El propietario fue reactivado correctamente.',
      });
      setModalResultado(true);

      // La recarga se ejecuta por separado: un fallo de recarga no cambia
      // el resultado confirmado por la función RPC.
      cargarPropietarios(false);
    } catch (error) {
      console.error('Error al cambiar estado del propietario:', error);
      setPropietarioSeleccionado(propietarioAnterior);
      setModalEstado(false);
      setResultado({
        correcto: false,
        titulo: 'No se pudo completar la operación',
        mensaje: `No se pudo ${accion === 'desactivar' ? 'desactivar' : 'reactivar'} al propietario. ${mensajeError(error)} El estado mostrado se conserva como ${normalizarEstado(propietarioAnterior?.estado)}.`,
      });
      setModalResultado(true);
    } finally {
      setProcesando(false);
    }
  }

  async function cerrarSesion() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setMenuAbierto(false);
      router.replace('/');
    } catch (error) {
      Alert.alert('Error', mensajeError(error));
    }
  }

  const propietarioActual = propietarioSeleccionado;
  const propietarioActivo = propietarioActual && normalizarEstado(propietarioActual.estado) === 'Activo';

  return (
    <SafeAreaView style={styles.pantalla}>
      <StatusBar barStyle="light-content" backgroundColor={C.primarioOscuro} />
      <EncabezadoPetCare onAbrirMenu={() => setMenuAbierto(true)} />

      {!mostrarDetalle ? (
        <ScrollView
          style={styles.contenedor}
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.ruta}>
            <TouchableOpacity onPress={() => router.replace('/administracion/administracion')}>
              <Text style={styles.textoRuta}>Inicio</Text>
            </TouchableOpacity>
            <Text style={styles.separadorRuta}> / </Text>
            <TouchableOpacity onPress={() => router.replace('/administracion/administracion')}>
              <Text style={styles.textoRuta}>Administración</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.encabezadoPagina}>
            <TouchableOpacity style={styles.botonRegresar} onPress={() => router.replace('/administracion/administracion')}>
              <Text style={styles.flechaRegresar}>←</Text>
            </TouchableOpacity>
            <View style={styles.encabezadoTexto}>
              <Text style={styles.titulo}>Gestión de Propietarios</Text>
            </View>
          </View>

          <Text style={styles.subtitulo}>Consulta y administra la información de los propietarios registrados.</Text>

          <View style={styles.seccionLista}>
            <View style={styles.tituloPanelFila}>
              <View style={styles.flex}>
                <Text style={styles.tituloPanel}>Propietarios registrados</Text>
                <Text style={styles.textoPanel}>Busca un propietario para consultar su información.</Text>
              </View>
              <TouchableOpacity
                style={styles.botonActualizar}
                onPress={() => cargarPropietarios(false)}
                disabled={actualizando || cargando}
                accessibilityLabel="Actualizar propietarios"
              >
                {actualizando ? <ActivityIndicator color={C.primario} size="small" /> : <Text style={styles.textoActualizar}>↻</Text>}
              </TouchableOpacity>
            </View>

            <View style={styles.contenedorBusqueda}>
              <Text style={styles.iconoBusqueda}>⌕</Text>
              <TextInput
                style={styles.busqueda}
                value={busqueda}
                onChangeText={(texto) => {
                  setBusqueda(texto);
                  setErrorBusqueda('');
                }}
                onSubmitEditing={ejecutarBusqueda}
                placeholder="Buscar por nombre, DNI, teléfono o correo..."
                placeholderTextColor="#91A09C"
                autoCapitalize="none"
                returnKeyType="search"
                accessibilityLabel="Dato para buscar un propietario"
              />
              {busqueda.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setBusqueda('');
                    setBusquedaAplicada('');
                    setErrorBusqueda('');
                  }}
                  accessibilityLabel="Limpiar búsqueda"
                >
                  <Text style={styles.limpiarBusqueda}>×</Text>
                </TouchableOpacity>
              )}
            </View>

            {errorBusqueda !== '' && <Text style={styles.errorBusqueda}>{errorBusqueda}</Text>}

            <TouchableOpacity style={styles.botonBuscar} onPress={ejecutarBusqueda} activeOpacity={0.8}>
              <Text style={styles.textoBotonBuscar}>Buscar propietario</Text>
            </TouchableOpacity>

            <View style={styles.filtros}>
              {FILTROS.map((item) => {
                const seleccionado = filtro === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.filtro, seleccionado && styles.filtroSeleccionado]}
                    onPress={() => setFiltro(item)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.textoFiltro, seleccionado && styles.textoFiltroSeleccionado]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {cargando ? (
              <View style={styles.estadoCarga}>
                <ActivityIndicator size="large" color={C.primario} />
                <Text style={styles.textoCarga}>Cargando propietarios...</Text>
              </View>
            ) : propietariosFiltrados.length === 0 ? (
              <View style={styles.estadoVacio}>
                <Text style={styles.iconoVacio}>♙</Text>
                <Text style={styles.tituloVacio}>No se encontraron propietarios</Text>
                <Text style={styles.textoVacio}>
                  {busquedaAplicada
                    ? `No hay propietarios que coincidan con "${busquedaAplicada}". Verifica los datos e intenta nuevamente.`
                    : `No hay propietarios que coincidan con el filtro "${filtro}".`}
                </Text>
                {(busquedaAplicada || filtro !== 'Todos') && (
                  <TouchableOpacity
                    style={styles.botonBuscar}
                    onPress={() => {
                      setBusqueda('');
                      setBusquedaAplicada('');
                      setErrorBusqueda('');
                      setFiltro('Todos');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.textoBotonBuscar}>Limpiar búsqueda y filtros</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              propietariosFiltrados.map((propietario) => {
                const activo = normalizarEstado(propietario.estado) === 'Activo';
                return (
                  <TouchableOpacity
                    key={String(obtenerId(propietario))}
                    style={styles.tarjetaPropietario}
                    onPress={() => abrirDetalle(propietario)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.avatarPropietario}>
                      <Text style={styles.avatarTexto}>{obtenerIniciales(propietario)}</Text>
                    </View>
                    <View style={styles.datosPropietario}>
                      <Text style={styles.nombrePropietario}>{obtenerNombre(propietario)}</Text>
                      <Text style={styles.datoSecundario}>DNI: {obtenerDocumento(propietario) || 'No registrado'}</Text>
                      <Text style={styles.datoSecundario}>{obtenerCorreo(propietario) || 'Correo no registrado'}</Text>
                      <Text style={styles.datoSecundario}>Teléfono: {obtenerTelefono(propietario) || 'No registrado'}</Text>
                      <View style={styles.filaEstadoPropietario}>
                        <View style={[styles.estado, activo ? styles.estadoActivo : styles.estadoInactivo]}>
                          <View style={[styles.puntoEstado, activo ? styles.puntoActivo : styles.puntoInactivo]} />
                          <Text style={[styles.textoEstadoBadge, activo ? styles.textoEstadoActivo : styles.textoEstadoInactivo]}>
                            {activo ? 'Activo' : 'Inactivo'}
                          </Text>
                        </View>
                        <Text style={styles.enlaceDetalle}>Ver detalle →</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {!cargando && (
              <Text style={styles.pieLista}>
                Mostrando {propietariosFiltrados.length} de {propietarios.length} propietarios
              </Text>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView style={styles.contenedor} contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
          <View style={styles.ruta}>
            <TouchableOpacity onPress={() => router.replace('/administracion/administracion')}>
              <Text style={styles.textoRuta}>Inicio</Text>
            </TouchableOpacity>
            <Text style={styles.separadorRuta}> / </Text>
            <TouchableOpacity onPress={volverAlListado}>
              <Text style={styles.textoRuta}>Gestión de Propietarios</Text>
            </TouchableOpacity>
            <Text style={styles.separadorRuta}> / </Text>
            <Text style={styles.rutaActual}>Información del propietario</Text>
          </View>

          <View style={styles.encabezadoPagina}>
            <TouchableOpacity style={styles.botonRegresar} onPress={volverAlListado}>
              <Text style={styles.flechaRegresar}>←</Text>
            </TouchableOpacity>
            <View style={styles.encabezadoTexto}>
              <Text style={styles.titulo}>Información del propietario</Text>
            </View>
          </View>

          <Text style={styles.subtitulo}>Consulta los datos personales y el estado del propietario registrado.</Text>

          {propietarioActual && (
            <View style={styles.tarjetaDetalleCompleta}>
              <View style={styles.detalleNombre}>
                <View style={styles.avatarDetalle}>
                  <Text style={styles.avatarDetalleTexto}>{obtenerIniciales(propietarioActual)}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.nombreDetalle}>{obtenerNombre(propietarioActual)}</Text>
                  <View style={[styles.estado, propietarioActivo ? styles.estadoActivo : styles.estadoInactivo]}>
                    <View style={[styles.puntoEstado, propietarioActivo ? styles.puntoActivo : styles.puntoInactivo]} />
                    <Text style={[styles.textoEstadoBadge, propietarioActivo ? styles.textoEstadoActivo : styles.textoEstadoInactivo]}>
                      {propietarioActivo ? 'Activo' : 'Inactivo'}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.tituloSeccionDetalle}>Datos personales</Text>
              <View style={styles.listaDetalles}>
                <FilaDetalle etiqueta="Documento de identidad / DNI" valor={obtenerDocumento(propietarioActual)} />
                <FilaDetalle etiqueta="Teléfono" valor={obtenerTelefono(propietarioActual)} />
                <FilaDetalle etiqueta="Correo electrónico" valor={obtenerCorreo(propietarioActual)} />
                <FilaDetalle etiqueta="Dirección" valor={obtenerDireccion(propietarioActual)} />
                <FilaDetalle
                  etiqueta="Fecha de registro"
                  valor={propietarioActual.fecha_registro ? new Date(propietarioActual.fecha_registro).toLocaleDateString('es-PE') : ''}
                />
                {!propietarioActivo && (
                  <FilaDetalle etiqueta="Motivo de desactivación" valor={obtenerMotivo(propietarioActual)} />
                )}
              </View>

              <View style={styles.botonesDetalle}>
                {propietarioActivo ? (
                  <TouchableOpacity style={styles.botonDesactivar} onPress={() => abrirModalEstado(propietarioActual, 'desactivar')} activeOpacity={0.8}>
                    <Text style={styles.textoBotonDesactivar}>Desactivar propietario</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.botonActivar} onPress={() => abrirModalEstado(propietarioActual, 'activar')} activeOpacity={0.8}>
                    <Text style={styles.textoBotonActivar}>Reactivar propietario</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.botonSecundario} onPress={volverAlListado} activeOpacity={0.8}>
                  <Text style={styles.textoBotonSecundario}>Volver al listado</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={modalEstado} transparent animationType="fade" onRequestClose={cerrarModalEstado}>
        <View style={styles.fondoModal}>
          <View style={styles.modal}>
            <View style={styles.modalEncabezado}>
              <View style={styles.flex}>
                <Text style={styles.tituloModal}>{accion === 'desactivar' ? 'Desactivar propietario' : 'Reactivar propietario'}</Text>
                <Text style={styles.subtituloModal}>{obtenerNombre(propietarioActual)}</Text>
              </View>
              <TouchableOpacity style={styles.botonX} onPress={cerrarModalEstado} disabled={procesando}>
                <Text style={styles.textoX}>×</Text>
              </TouchableOpacity>
            </View>

            {accion === 'desactivar' ? (
              <>
                <View style={styles.avisoDesactivar}>
                  <Text style={styles.avisoTitulo}>Motivo de desactivación obligatorio</Text>
                  <Text style={styles.avisoTexto}>Las mascotas vinculadas también serán procesadas por la función de Supabase configurada.</Text>
                </View>
                <Text style={styles.etiquetaCampo}>Motivo de desactivación *</Text>
                <TextInput
                  style={styles.campoMotivo}
                  value={motivo}
                  onChangeText={setMotivo}
                  placeholder="Escribe el motivo de la desactivación..."
                  placeholderTextColor="#91A09C"
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                  editable={!procesando}
                />
                <Text style={styles.contadorMotivo}>{motivo.length}/500 caracteres</Text>
              </>
            ) : (
              <View style={styles.avisoActivar}>
                <Text style={styles.avisoTituloActivar}>¿Deseas reactivar este propietario?</Text>
                <Text style={styles.avisoTexto}>Se solicitará a Supabase reactivar el propietario y las mascotas que correspondan según la función configurada.</Text>
              </View>
            )}

            <View style={styles.botonesModal}>
              <TouchableOpacity style={styles.botonSecundario} onPress={cerrarModalEstado} disabled={procesando}>
                <Text style={styles.textoBotonSecundario}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.botonConfirmar,
                  accion === 'desactivar' ? styles.botonConfirmarRojo : styles.botonConfirmarVerde,
                  procesando && styles.botonDeshabilitado,
                ]}
                onPress={confirmarCambioEstado}
                disabled={procesando}
              >
                {procesando ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <Text style={styles.textoBotonConfirmar}>
                    {accion === 'desactivar' ? 'Confirmar desactivación' : 'Confirmar reactivación'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalResultado} transparent animationType="fade" onRequestClose={() => setModalResultado(false)}>
        <View style={styles.fondoModal}>
          <View style={styles.modalResultado}>
            <View style={[styles.iconoResultado, resultado.correcto ? styles.iconoResultadoCorrecto : styles.iconoResultadoError]}>
              <Text style={[styles.textoIconoResultado, !resultado.correcto && styles.textoIconoError]}>
                {resultado.correcto ? '✓' : '!'}
              </Text>
            </View>
            <Text style={styles.tituloResultado}>{resultado.titulo}</Text>
            <Text style={styles.mensajeResultado}>{resultado.mensaje}</Text>
            <TouchableOpacity
              style={styles.botonResultado}
              onPress={() => {
                setModalResultado(false);
                setMostrarDetalle(true);
              }}
            >
              <Text style={styles.textoBotonResultado}>Aceptar</Text>
            </TouchableOpacity>
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

function FilaDetalle({ etiqueta, valor }) {
  return (
    <View style={styles.filaDetalle}>
      <Text style={styles.etiquetaDetalle}>{etiqueta}</Text>
      <Text style={styles.valorDetalle}>{normalizarTexto(valor) || 'No registrado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.fondo },
  contenedor: { flex: 1 },
  contenido: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 35 },
  flex: { flex: 1, minWidth: 0 },
  ruta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 },
  textoRuta: { color: C.secundario, fontSize: 12 },
  separadorRuta: { color: '#A4B2AE', fontSize: 12 },
  enlaceRuta: { color: C.primario, fontSize: 12, fontWeight: '700' },
  rutaActual: { color: C.texto, fontSize: 12, fontWeight: '700' },
  encabezadoPagina: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  botonRegresar: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.blanco, borderWidth: 1, borderColor: C.borde, alignItems: 'center', justifyContent: 'center' },
  flechaRegresar: { color: C.primario, fontSize: 24, fontWeight: '600' },
  encabezadoTexto: { flex: 1 },
  titulo: { color: C.texto, fontSize: 23, fontWeight: '800', letterSpacing: -0.5 },
  subtitulo: { color: C.secundario, fontSize: 13, lineHeight: 20, marginBottom: 24 },
  seccionLista: { width: '100%' },
  tituloPanelFila: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  tituloPanel: { color: C.texto, fontSize: 16, fontWeight: '800' },
  textoPanel: { color: C.secundario, fontSize: 12, lineHeight: 18, marginTop: 4 },
  botonActualizar: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: C.blanco, borderWidth: 1, borderColor: C.borde },
  textoActualizar: { color: C.primario, fontSize: 22, fontWeight: '700' },
  contenedorBusqueda: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.blanco, borderWidth: 1, borderColor: C.borde, borderRadius: 11, paddingHorizontal: 12, minHeight: 47 },
  iconoBusqueda: { color: C.secundario, fontSize: 23, marginRight: 9 },
  busqueda: { flex: 1, minWidth: 0, minHeight: 45, color: C.texto, fontSize: 13, paddingVertical: 8 },
  limpiarBusqueda: { color: C.secundario, fontSize: 24, paddingHorizontal: 5 },
  errorBusqueda: { color: C.rojo, fontSize: 12, marginTop: 7, marginLeft: 2 },
  botonBuscar: { minHeight: 43, backgroundColor: C.primario, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingHorizontal: 12 },
  textoBotonBuscar: { color: C.blanco, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  filtros: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 17 },
  filtro: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8, borderRadius: 10, borderWidth: 1, borderColor: C.borde, backgroundColor: C.blanco },
  filtroSeleccionado: { backgroundColor: C.primario, borderColor: C.primario },
  textoFiltro: { color: C.secundario, fontSize: 12, fontWeight: '700' },
  textoFiltroSeleccionado: { color: C.blanco },
  estadoCarga: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  textoCarga: { color: C.secundario, fontSize: 13 },
  estadoVacio: { backgroundColor: C.blanco, borderWidth: 1, borderColor: C.borde, borderRadius: 14, paddingVertical: 35, paddingHorizontal: 16, alignItems: 'center' },
  iconoVacio: { color: '#91A9A3', fontSize: 36, marginBottom: 10 },
  tituloVacio: { color: C.texto, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  textoVacio: { color: C.secundario, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 6 },
  tarjetaPropietario: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.blanco, borderWidth: 1, borderColor: C.borde, borderRadius: 14, padding: 15, marginBottom: 12, gap: 12 },
  avatarPropietario: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#E3F1ED', alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: C.primarioOscuro, fontSize: 13, fontWeight: '900' },
  datosPropietario: { flex: 1, minWidth: 0 },
  nombrePropietario: { color: C.texto, fontSize: 14, fontWeight: '800', marginBottom: 5 },
  datoSecundario: { color: C.secundario, fontSize: 11, lineHeight: 18 },
  filaEstadoPropietario: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 11 },
  estado: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8 },
  estadoActivo: { backgroundColor: C.verdeFondo },
  estadoInactivo: { backgroundColor: C.rojoFondo },
  puntoEstado: { width: 6, height: 6, borderRadius: 3 },
  puntoActivo: { backgroundColor: C.verde },
  puntoInactivo: { backgroundColor: C.rojo },
  textoEstadoBadge: { fontSize: 10, fontWeight: '800' },
  textoEstadoActivo: { color: C.verde },
  textoEstadoInactivo: { color: C.rojo },
  enlaceDetalle: { color: C.primario, fontSize: 11, fontWeight: '800' },
  pieLista: { color: C.secundario, fontSize: 11, textAlign: 'center', marginTop: 5 },
  tarjetaDetalleCompleta: { width: '100%', backgroundColor: C.blanco, borderWidth: 1, borderColor: C.borde, borderRadius: 16, padding: 20, marginBottom: 20 },
  detalleNombre: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: C.borde },
  avatarDetalle: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#E3F1ED', alignItems: 'center', justifyContent: 'center' },
  avatarDetalleTexto: { color: C.primarioOscuro, fontSize: 17, fontWeight: '900' },
  nombreDetalle: { color: C.texto, fontSize: 16, fontWeight: '800', marginBottom: 7 },
  tituloSeccionDetalle: { color: C.texto, fontSize: 15, fontWeight: '800', marginTop: 22, marginBottom: 8 },
  listaDetalles: { paddingTop: 7 },
  filaDetalle: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF1F0' },
  etiquetaDetalle: { color: C.secundario, fontSize: 11, fontWeight: '700', marginBottom: 5 },
  valorDetalle: { color: C.texto, fontSize: 13, lineHeight: 19 },
  botonesDetalle: { gap: 10, marginTop: 20, marginBottom: 3 },
  botonDesactivar: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: C.rojoFondo, borderWidth: 1, borderColor: '#F1D3D0', paddingHorizontal: 12 },
  textoBotonDesactivar: { color: C.rojo, fontSize: 13, fontWeight: '800' },
  botonActivar: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: C.verdeFondo, borderWidth: 1, borderColor: '#C9E9D9', paddingHorizontal: 12 },
  textoBotonActivar: { color: C.verde, fontSize: 13, fontWeight: '800' },
  botonSecundario: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: C.grisFondo, paddingHorizontal: 12 },
  textoBotonSecundario: { color: C.texto, fontSize: 13, fontWeight: '700' },
  fondoModal: { flex: 1, backgroundColor: 'rgba(15, 35, 32, 0.52)', justifyContent: 'center', alignItems: 'center', padding: 18 },
  modal: { width: '100%', maxWidth: 500, maxHeight: '90%', backgroundColor: C.blanco, borderRadius: 19, padding: 20 },
  modalEncabezado: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 18 },
  tituloModal: { color: C.texto, fontSize: 19, fontWeight: '800' },
  subtituloModal: { color: C.secundario, fontSize: 12, lineHeight: 18, marginTop: 5 },
  botonX: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.grisFondo, alignItems: 'center', justifyContent: 'center' },
  textoX: { color: C.texto, fontSize: 25, lineHeight: 28 },
  avisoDesactivar: { backgroundColor: C.rojoFondo, borderRadius: 11, padding: 13, marginBottom: 17 },
  avisoActivar: { backgroundColor: C.verdeFondo, borderRadius: 11, padding: 14, marginBottom: 18 },
  avisoTitulo: { color: C.rojo, fontSize: 13, fontWeight: '800', marginBottom: 5 },
  avisoTituloActivar: { color: C.verde, fontSize: 14, fontWeight: '800', marginBottom: 6 },
  avisoTexto: { color: C.texto, fontSize: 12, lineHeight: 18 },
  etiquetaCampo: { color: C.texto, fontSize: 12, fontWeight: '800', marginBottom: 8 },
  campoMotivo: { minHeight: 110, maxHeight: 180, borderWidth: 1, borderColor: C.borde, borderRadius: 11, backgroundColor: '#FAFCFB', color: C.texto, padding: 12, fontSize: 13, lineHeight: 19 },
  contadorMotivo: { color: C.secundario, textAlign: 'right', fontSize: 10, marginTop: 6 },
  botonesModal: { flexDirection: 'row', gap: 10, marginTop: 20 },
  botonConfirmar: { flex: 1, minHeight: 44, borderRadius: 11, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  botonConfirmarRojo: { backgroundColor: C.rojo },
  botonConfirmarVerde: { backgroundColor: C.verde },
  botonDeshabilitado: { opacity: 0.6 },
  textoBotonConfirmar: { color: C.blanco, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  modalResultado: { width: '100%', maxWidth: 420, backgroundColor: C.blanco, borderRadius: 19, padding: 24, alignItems: 'center' },
  iconoResultado: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  iconoResultadoCorrecto: { backgroundColor: C.verdeFondo },
  iconoResultadoError: { backgroundColor: C.rojoFondo },
  textoIconoResultado: { color: C.verde, fontSize: 30, fontWeight: '800' },
  textoIconoError: { color: C.rojo },
  tituloResultado: { color: C.texto, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  mensajeResultado: { color: C.secundario, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 10 },
  botonResultado: { alignSelf: 'stretch', minHeight: 45, borderRadius: 11, backgroundColor: C.primario, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  textoBotonResultado: { color: C.blanco, fontSize: 13, fontWeight: '800' },
});
