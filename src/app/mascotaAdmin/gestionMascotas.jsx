
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
import {
  buscarMascotas,
  consultarMascotaPorId,
  consultarMascotas,
  desactivarMascota,
} from '../../dao/mascotaDAO';

const C = {
  primario: '#187C72',
  primarioOscuro: '#12665E',
  fondo: '#F5F8F8',
  blanco: '#FFFFFF',
  texto: '#243746',
  secundario: '#72818D',
  borde: '#E1E9E7',
  verde: '#25834B',
  verdeFondo: '#E8F6EC',
  rojo: '#B42318',
  rojoFondo: '#FDECEC',
};

const FILTROS = ['Todas', 'Activas', 'Inactivas'];

function obtenerEstado(mascota) {
  const estado = String(mascota?.estado ?? 'Activo')
    .trim()
    .toLowerCase();

  return [
    'inactivo',
    'inactiva',
    'desactivado',
    'desactivada',
  ].includes(estado)
    ? 'Inactiva'
    : 'Activa';
}

function obtenerPropietario(mascota) {
  const propietario = mascota?.propietarios;

  if (!propietario) return 'Propietario no registrado';

  return [
    propietario.nombre,
    propietario.apellido,
    propietario.nombres,
    propietario.apellidos,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Propietario no registrado';
}

function formatearFecha(fecha) {
  if (!fecha) return 'No registrada';

  const valor = new Date(`${String(fecha).slice(0, 10)}T12:00:00`);

  if (Number.isNaN(valor.getTime())) return 'No registrada';

  return valor.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function GestionMascotas() {
  const [mascotas, setMascotas] = useState([]);
  const [mascotaSeleccionada, setMascotaSeleccionada] = useState(null);
  const [vista, setVista] = useState('lista');
  const [busqueda, setBusqueda] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('Todas');
  const [cargando, setCargando] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [error, setError] = useState('');

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
  const [rolUsuario, setRolUsuario] = useState('Administrador');

  const [modalDesactivacionVisible, setModalDesactivacionVisible] =
    useState(false);
  const [mascotaPorDesactivar, setMascotaPorDesactivar] = useState(null);
  const [motivoDesactivacion, setMotivoDesactivacion] = useState('');
  const [accionEstado, setAccionEstado] = useState('desactivar');
  const [desactivando, setDesactivando] = useState(false);

  // Modal personalizado para mostrar el resultado de la operación.
  const [modalResultadoVisible, setModalResultadoVisible] = useState(false);
  const [resultadoExitoso, setResultadoExitoso] = useState(true);
  const [mensajeResultado, setMensajeResultado] = useState('');

  const cargarPerfil = useCallback(async () => {
    try {
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario) throw errorUsuario;

      if (!user) {
        router.replace('/');
        return;
      }

      const { data, error: errorPerfil } = await supabase
        .from('perfiles')
        .select('nombre_completo, rol, estado_cuenta')
        .eq('perfil_id', user.id)
        .single();

      if (errorPerfil) throw errorPerfil;

      if (
        String(data.estado_cuenta || '').trim().toLowerCase() !== 'activo'
      ) {
        await supabase.auth.signOut();
        Alert.alert('Cuenta inactiva', 'Tu cuenta no se encuentra activa.');
        router.replace('/');
        return;
      }

      setNombreUsuario(data.nombre_completo || 'Usuario');
      setRolUsuario(data.rol || 'Asistente');
    } catch (e) {
      console.error('Error al cargar perfil:', e.message);
    }
  }, []);

  const cargarMascotas = useCallback(async (texto = '') => {
    const textoBusqueda = String(texto || '').trim();

    try {
      setCargando(true);
      setError('');

      // Carga normal del listado o búsqueda por el dato ingresado.
      const resultado = textoBusqueda
        ? await buscarMascotas(textoBusqueda)
        : await consultarMascotas();

      const listaResultado = Array.isArray(resultado)
        ? resultado
        : [];

      setMascotas(listaResultado);

      // E1 — Mascota no encontrada.
      // Una búsqueda sin coincidencias deja el listado vacío.
      // El mensaje específico se presenta en el estado vacío del listado.
      if (textoBusqueda && listaResultado.length === 0) {
        setError('');
      }
    } catch (e) {
      console.error('Error al cargar mascotas:', e);

      setError(
        'No se pudieron cargar las mascotas. Intenta nuevamente.'
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarPerfil();
    cargarMascotas('');
  }, [cargarPerfil, cargarMascotas]);

  const mascotasFiltradas = useMemo(() => {
    if (filtroActivo === 'Todas') return mascotas;

    const estadoBuscado =
      filtroActivo === 'Activas' ? 'Activa' : 'Inactiva';

    return mascotas.filter(
      (mascota) => obtenerEstado(mascota) === estadoBuscado
    );
  }, [mascotas, filtroActivo]);

  // E2 — Búsqueda sin datos.
  // No se ejecuta una búsqueda vacía: se solicita ingresar un valor.
  const ejecutarBusqueda = () => {
    const textoBusqueda = String(busqueda || '').trim();

    if (!textoBusqueda) {
      Alert.alert(
        'Dato requerido',
        'Ingresa un dato para realizar la búsqueda de la mascota.'
      );
      return;
    }

    cargarMascotas(textoBusqueda);
  };

  const limpiarBusqueda = () => {
    setBusqueda('');
    cargarMascotas('');
  };

  const abrirDetalle = async (mascota) => {
    try {
      setCargandoDetalle(true);
      setMascotaSeleccionada(mascota);
      setVista('detalle');

      const detalle = await consultarMascotaPorId(
        mascota.numero_historia
      );

      if (detalle) setMascotaSeleccionada(detalle);
    } catch (e) {
      console.error('Error al consultar detalle:', e.message);
      Alert.alert(
        'Error',
        'No se pudo cargar toda la información de la mascota.'
      );
    } finally {
      setCargandoDetalle(false);
    }
  };

  const volverAlListado = () => {
    setVista('lista');
    setMascotaSeleccionada(null);
  };

  const solicitarCambioEstado = (mascota) => {
    const accion =
      obtenerEstado(mascota) === 'Activa' ? 'desactivar' : 'activar';

    setAccionEstado(accion);
    setMascotaPorDesactivar(mascota);
    setMotivoDesactivacion('');
    setModalDesactivacionVisible(true);
  };

  const cancelarDesactivacion = () => {
    if (desactivando) return;

    setModalDesactivacionVisible(false);
    setMascotaPorDesactivar(null);
    setMotivoDesactivacion('');
  };

  // Confirma la activación o desactivación.
  // E3 — Si la actualización falla, se conserva el estado anterior
  // en la interfaz y se muestra el modal de error.
  const confirmarCambioEstado = async () => {
    const motivo = String(motivoDesactivacion || '').trim();
    const numeroHistoria = mascotaPorDesactivar?.numero_historia;
    const accionRealizada = accionEstado;

    if (!numeroHistoria) {
      Alert.alert(
        'Error',
        'No se encontró el número de historia clínica.'
      );
      return;
    }

    if (accionRealizada === 'desactivar' && !motivo) {
      Alert.alert(
        'Motivo obligatorio',
        'Escribe el motivo de desactivación.'
      );
      return;
    }

    // Guardamos el estado de la interfaz antes de la operación.
    const listaAnterior = mascotas;
    const seleccionAnterior = mascotaSeleccionada;

    try {
      setDesactivando(true);

      if (accionRealizada === 'desactivar') {
        // Se conserva la función DAO original para desactivar.
        await desactivarMascota(numeroHistoria, motivo);
      } else {
        // Activación: se comprueba que Supabase haya actualizado
        // el registro y que no haya ocurrido un error.
        const {
          data: mascotaActualizada,
          error: errorActivacion,
        } = await supabase
          .from('mascotas')
          .update({
            estado: 'Activo',
            motivo_desactivacion: null,
          })
          .eq('numero_historia', numeroHistoria)
          .select('numero_historia')
          .maybeSingle();

        if (errorActivacion) {
          throw errorActivacion;
        }

        if (!mascotaActualizada) {
          throw new Error('No se actualizó el registro.');
        }
      }

      // La actualización principal fue confirmada.
      // Cerramos el modal de confirmación.
      setModalDesactivacionVisible(false);
      setMascotaPorDesactivar(null);
      setMotivoDesactivacion('');

      // Recargamos el detalle sin confundir un fallo de consulta
      // posterior con un fallo de la actualización principal.
      try {
        const detalleActualizado =
          await consultarMascotaPorId(numeroHistoria);

        if (detalleActualizado) {
          setMascotaSeleccionada(detalleActualizado);
        } else if (seleccionAnterior) {
          setMascotaSeleccionada({
            ...seleccionAnterior,
            estado:
              accionRealizada === 'activar' ? 'Activo' : 'Inactivo',
            motivo_desactivacion:
              accionRealizada === 'activar' ? null : motivo,
          });
        }
      } catch (errorDetalle) {
        console.error(
          'No se pudo recargar el detalle de la mascota:',
          errorDetalle
        );

        // La actualización ya tuvo éxito; reflejamos ese resultado
        // aunque falle la consulta secundaria del detalle.
        if (seleccionAnterior) {
          setMascotaSeleccionada({
            ...seleccionAnterior,
            estado:
              accionRealizada === 'activar' ? 'Activo' : 'Inactivo',
            motivo_desactivacion:
              accionRealizada === 'activar' ? null : motivo,
          });
        }
      }

      // Recargamos el listado. Si falla esta consulta secundaria,
      // no presentamos la actualización como una operación fallida.
      try {
        await cargarMascotas(busqueda);
      } catch (errorLista) {
        console.error(
          'No se pudo recargar el listado de mascotas:',
          errorLista
        );
      }

      setResultadoExitoso(true);
      setMensajeResultado(
        accionRealizada === 'desactivar'
          ? 'La mascota fue desactivada correctamente.'
          : 'La mascota fue activada correctamente.'
      );
      setModalResultadoVisible(true);
    } catch (e) {
      console.error(
        'Error al cambiar el estado de la mascota:',
        e
      );

      // E3 — Restauramos los datos que tenía la interfaz antes
      // de la operación. No mostramos mensajes técnicos de Supabase.
      setMascotas(listaAnterior);

      if (seleccionAnterior) {
        setMascotaSeleccionada(seleccionAnterior);
      }

      setModalDesactivacionVisible(false);

      setResultadoExitoso(false);
      setMensajeResultado(
        'No se pudo actualizar el estado de la mascota. El estado anterior se mantiene.'
      );
      setModalResultadoVisible(true);
    } finally {
      setDesactivando(false);
    }
  };
/**
 * RF07: Cerrar sesión.
 * La confirmación se realiza únicamente en MenuLateralDerecho.
 * Esta función solo ejecuta el cierre cuando el usuario confirma.
 */
const cerrarSesion = async () => {
  try {
    const { error: errorSesion } = await supabase.auth.signOut();

    if (errorSesion) {
      throw errorSesion;
    }

    // Cerrar el menú lateral.
    setMenuAbierto(false);

    // Volver a la pantalla de inicio de sesión.
    router.replace('/');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);

    // El menú lateral se encarga de mostrar el error.
    throw error;
  }
};

  const volverAdministracion = () =>
    router.replace('/administracion');

  const mascotaActiva = mascotaSeleccionada
    ? obtenerEstado(mascotaSeleccionada) === 'Activa'
    : false;

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.blanco}
      />

      <EncabezadoPetCare
        nombreUsuario={nombreUsuario}
        rolUsuario={rolUsuario}
        onAbrirMenu={() => setMenuAbierto(true)}
      />

      <View style={styles.contenido}>
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
            onPress={volverAdministracion}
          >
            Administración
          </Text>

          {vista === 'detalle' && (
            <>
              <Text style={styles.separador}> / </Text>
              <Text style={styles.migaActual}>
                Ficha de la mascota
              </Text>
            </>
          )}
        </View>

        {vista === 'lista' ? (
          <>
            <View style={styles.encabezadoPagina}>
              <TouchableOpacity
                style={styles.botonVolver}
                onPress={volverAdministracion}
              >
                <Text style={styles.flechaVolver}>‹</Text>
              </TouchableOpacity>

              <View style={styles.bloqueTitulo}>
                <Text style={styles.titulo}>
                  Gestión de mascotas
                </Text>
                <Text style={styles.subtitulo}>
                  Administra los registros de las mascotas de la veterinaria.
                </Text>
              </View>
            </View>

            <View style={styles.busqueda}>
              <Text style={styles.iconoBusqueda}>⌕</Text>

              <TextInput
                style={styles.entradaBusqueda}
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar por código, nombre o especie..."
                placeholderTextColor="#8997A5"
                returnKeyType="search"
                onSubmitEditing={ejecutarBusqueda}
                accessibilityLabel="Buscar mascotas"
              />

              {busqueda.length > 0 && (
                <TouchableOpacity onPress={limpiarBusqueda}>
                  <Text style={styles.limpiarBusqueda}>×</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.botonBuscar}
                onPress={ejecutarBusqueda}
              >
                <Text style={styles.textoBotonBuscar}>Buscar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filtros}>
              {FILTROS.map((filtro) => {
                const seleccionado = filtroActivo === filtro;

                return (
                  <TouchableOpacity
                    key={filtro}
                    style={[
                      styles.filtro,
                      seleccionado && styles.filtroSeleccionado,
                    ]}
                    onPress={() => setFiltroActivo(filtro)}
                  >
                    <Text
                      style={[
                        styles.textoFiltro,
                        seleccionado && styles.textoFiltroSeleccionado,
                      ]}
                    >
                      {filtro}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.resumen}>
              <Text style={styles.textoResumen}>
                {mascotasFiltradas.length}{' '}
                {mascotasFiltradas.length === 1
                  ? 'mascota registrada'
                  : 'mascotas registradas'}
              </Text>

              <TouchableOpacity
                onPress={() => cargarMascotas(busqueda)}
              >
                <Text style={styles.enlaceActualizar}>
                  ↻ Actualizar
                </Text>
              </TouchableOpacity>
            </View>

            {cargando && mascotas.length === 0 ? (
              <View style={styles.estadoCarga}>
                <ActivityIndicator
                  size="large"
                  color={C.primario}
                />
                <Text style={styles.textoEstado}>
                  Cargando mascotas...
                </Text>
              </View>
            ) : error && mascotas.length === 0 ? (
              <View style={styles.estadoVacio}>
                <Text style={styles.tituloEstado}>
                  No se pudo cargar la información
                </Text>
                <Text style={styles.textoEstado}>{error}</Text>

                <TouchableOpacity
                  style={styles.botonReintentar}
                  onPress={() => cargarMascotas(busqueda)}
                >
                  <Text style={styles.textoBotonBlanco}>
                    Reintentar
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                style={styles.lista}
                contentContainerStyle={styles.contenidoLista}
              >
                {mascotasFiltradas.length === 0 ? (
                  <View style={styles.estadoVacio}>
                    <Text style={styles.iconoVacio}>🐾</Text>

                    {/* E1 — Mensaje específico para una búsqueda sin coincidencias. */}
                    <Text style={styles.tituloEstado}>
                      {busqueda.trim()
                        ? 'No se encontraron mascotas'
                        : 'No hay mascotas para mostrar'}
                    </Text>

                    <Text style={styles.textoEstado}>
                      {busqueda.trim()
                        ? 'No se encontraron mascotas que coincidan con tu búsqueda. Verifica el dato ingresado e inténtalo nuevamente.'
                        : 'Prueba con otra búsqueda o selecciona otro filtro.'}
                    </Text>
                  </View>
                ) : (
                  mascotasFiltradas.map((mascota, indice) => {
                    const estado = obtenerEstado(mascota);

                    return (
                      <View
                        key={
                          mascota.numero_historia ?? `mascota-${indice}`
                        }
                        style={styles.tarjeta}
                      >
                        <View style={styles.tarjetaContenido}>
                          <View style={styles.avatar}>
                            <Text style={styles.iconoAvatar}>🐾</Text>
                          </View>

                          <View style={styles.datosTarjeta}>
                            <Text style={styles.codigo}>
                              {mascota.nombre || 'Mascota sin nombre'}
                            </Text>

                            <Text style={styles.codigoSecundario}>
                              Historia clínica:{' '}
                              {mascota.numero_historia || 'No registrada'}
                            </Text>

                            <Text style={styles.tipoAnimal}>
                              {mascota.especie ||
                                'Tipo de animal no registrado'}
                            </Text>

                            <Text style={styles.propietario}>
                              Propietario: {obtenerPropietario(mascota)}
                            </Text>

                            <View style={styles.filaEstado}>
                              <View
                                style={[
                                  styles.puntoEstado,
                                  {
                                    backgroundColor:
                                      estado === 'Activa'
                                        ? C.verde
                                        : C.rojo,
                                  },
                                ]}
                              />

                              <Text
                                style={[
                                  styles.textoEstadoTarjeta,
                                  {
                                    color:
                                      estado === 'Activa'
                                        ? C.verde
                                        : C.rojo,
                                  },
                                ]}
                              >
                                {estado}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.separadorTarjeta} />

                        <TouchableOpacity
                          style={styles.botonDetalle}
                          onPress={() => abrirDetalle(mascota)}
                        >
                          <Text style={styles.textoBotonDetalle}>
                            Ver detalle
                          </Text>
                          <Text style={styles.flechaDetalle}>→</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </>
        ) : (
          <View style={styles.detalleContenedor}>
            <View style={styles.encabezadoDetalle}>
              <TouchableOpacity
                style={styles.botonVolver}
                onPress={volverAlListado}
              >
                <Text style={styles.flechaVolver}>‹</Text>
              </TouchableOpacity>

              <View style={styles.bloqueTitulo}>
                <Text style={styles.titulo}>
                  Ficha de la mascota
                </Text>
                <Text style={styles.subtitulo}>
                  Información del registro seleccionado.
                </Text>
              </View>
            </View>

            {cargandoDetalle ? (
              <View style={styles.estadoCarga}>
                <ActivityIndicator
                  size="large"
                  color={C.primario}
                />
                <Text style={styles.textoEstado}>
                  Cargando información...
                </Text>
              </View>
            ) : mascotaSeleccionada ? (
              <ScrollView
                style={styles.lista}
                contentContainerStyle={styles.contenidoDetalle}
              >
                <View style={styles.ficha}>
                  <View style={styles.avatarFicha}>
                    <Text style={styles.iconoFicha}>🐾</Text>
                  </View>

                  <Text style={styles.nombreFicha}>
                    {mascotaSeleccionada.nombre || 'Mascota sin nombre'}
                  </Text>

                  <Text style={styles.codigoFicha}>
                    Historia clínica:{' '}
                    {mascotaSeleccionada.numero_historia ||
                      'No registrada'}
                  </Text>

                  <View style={styles.separadorFicha} />

                  <Text style={styles.tituloSeccion}>
                    Datos de la mascota
                  </Text>

                  <FilaDato
                    etiqueta="Nombre"
                    valor={mascotaSeleccionada.nombre}
                  />
                  <FilaDato
                    etiqueta="Historia clínica"
                    valor={mascotaSeleccionada.numero_historia}
                  />
                  <FilaDato
                    etiqueta="Especie"
                    valor={mascotaSeleccionada.especie}
                  />
                  <FilaDato
                    etiqueta="Raza"
                    valor={mascotaSeleccionada.raza}
                  />
                  <FilaDato
                    etiqueta="Sexo"
                    valor={mascotaSeleccionada.sexo}
                  />
                  <FilaDato
                    etiqueta="Color"
                    valor={mascotaSeleccionada.color}
                  />
                  <FilaDato
                    etiqueta="Fecha de nacimiento"
                    valor={formatearFecha(
                      mascotaSeleccionada.fecha_nacimiento
                    )}
                  />
                  <FilaDato
                    etiqueta="Fecha de registro"
                    valor={formatearFecha(
                      mascotaSeleccionada.fecha_registro
                    )}
                  />

                  <View style={styles.separadorFicha} />

                  <Text style={styles.tituloSeccion}>
                    Propietario
                  </Text>

                  <FilaDato
                    etiqueta="Nombre"
                    valor={obtenerPropietario(mascotaSeleccionada)}
                  />

                  <View style={styles.filaFichaEstado}>
                    <Text style={styles.etiquetaDato}>
                      Estado del registro
                    </Text>

                    <Text
                      style={[
                        styles.valorEstadoFicha,
                        { color: mascotaActiva ? C.verde : C.rojo },
                      ]}
                    >
                      {obtenerEstado(mascotaSeleccionada)}
                    </Text>
                  </View>

                  {mascotaSeleccionada.motivo_desactivacion ? (
                    <FilaDato
                      etiqueta="Motivo de desactivación"
                      valor={mascotaSeleccionada.motivo_desactivacion}
                    />
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.botonEstado,
                      mascotaActiva
                        ? styles.botonDesactivar
                        : styles.botonActivar,
                    ]}
                    onPress={() =>
                      solicitarCambioEstado(mascotaSeleccionada)
                    }
                    disabled={desactivando}
                  >
                    <Text
                      style={[
                        styles.textoBotonEstado,
                        mascotaActiva
                          ? styles.textoBotonDesactivar
                          : styles.textoBotonActivar,
                      ]}
                    >
                      {mascotaActiva
                        ? 'Desactivar mascota'
                        : 'Activar mascota'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.estadoVacio}>
                <Text style={styles.tituloEstado}>
                  No se encontró la mascota
                </Text>

                <TouchableOpacity
                  style={styles.botonReintentar}
                  onPress={volverAlListado}
                >
                  <Text style={styles.textoBotonBlanco}>
                    Volver al listado
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Modal original para confirmar la activación o desactivación. */}
      <Modal
        visible={modalDesactivacionVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelarDesactivacion}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <View
              style={[
                styles.modalIcono,
                accionEstado === 'activar' && styles.modalIconoActivar,
              ]}
            >
              <Text
                style={[
                  styles.modalIconoTexto,
                  accionEstado === 'activar' &&
                    styles.modalIconoTextoActivar,
                ]}
              >
                {accionEstado === 'desactivar' ? '!' : '✓'}
              </Text>
            </View>

            <Text style={styles.modalTitulo}>
              {accionEstado === 'desactivar'
                ? 'Desactivar mascota'
                : 'Activar mascota'}
            </Text>

            <Text style={styles.modalDescripcion}>
              {accionEstado === 'desactivar'
                ? `¿Confirmas que deseas desactivar a ${
                    mascotaPorDesactivar?.nombre || 'esta mascota'
                  }? El registro se conservará y podrás activarlo nuevamente.`
                : `¿Confirmas que deseas activar nuevamente a ${
                    mascotaPorDesactivar?.nombre || 'esta mascota'
                  }? La mascota volverá a figurar como activa.`}
            </Text>

            {accionEstado === 'desactivar' && (
              <>
                <Text style={styles.modalEtiqueta}>
                  Motivo de desactivación *
                </Text>

                <TextInput
                  style={styles.modalEntrada}
                  value={motivoDesactivacion}
                  onChangeText={setMotivoDesactivacion}
                  placeholder="Indica brevemente el motivo..."
                  placeholderTextColor="#8997A5"
                  multiline
                  maxLength={500}
                  editable={!desactivando}
                  textAlignVertical="top"
                />

                <Text style={styles.modalAyuda}>
                  El motivo quedará guardado en el registro de la mascota.
                </Text>
              </>
            )}

            <View style={styles.modalAcciones}>
              <TouchableOpacity
                style={[
                  styles.modalBoton,
                  styles.modalBotonCancelar,
                ]}
                onPress={cancelarDesactivacion}
                disabled={desactivando}
              >
                <Text style={styles.modalTextoCancelar}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBoton,
                  accionEstado === 'desactivar'
                    ? styles.modalBotonConfirmar
                    : styles.modalBotonActivar,
                  desactivando && styles.botonDeshabilitado,
                ]}
                onPress={confirmarCambioEstado}
                disabled={desactivando}
              >
                {desactivando ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <Text style={styles.modalTextoConfirmar}>
                    {accionEstado === 'desactivar'
                      ? 'Sí, desactivar'
                      : 'Sí, activar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal original para informar el resultado de la operación. */}
      <Modal
        visible={modalResultadoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalResultadoVisible(false)}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <View
              style={[
                styles.modalIcono,
                resultadoExitoso
                  ? styles.modalIconoActivar
                  : styles.modalIconoError,
              ]}
            >
              <Text
                style={[
                  styles.modalIconoTexto,
                  resultadoExitoso
                    ? styles.modalIconoTextoActivar
                    : styles.modalIconoTextoError,
                ]}
              >
                {resultadoExitoso ? '✓' : '!'}
              </Text>
            </View>

            <Text style={styles.modalTitulo}>
              {resultadoExitoso
                ? 'Operación completada'
                : 'No se pudo completar'}
            </Text>

            <Text style={styles.modalDescripcion}>
              {mensajeResultado}
            </Text>

            <TouchableOpacity
              style={[
                styles.modalBoton,
                styles.modalBotonResultado,
                !resultadoExitoso && styles.modalBotonError,
              ]}
              onPress={() => setModalResultadoVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalTextoConfirmar}>
                Entendido
              </Text>
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

function FilaDato({ etiqueta, valor }) {
  const mostrarValor =
    valor !== null &&
    valor !== undefined &&
    String(valor).trim() !== '';

  return (
    <View style={styles.filaDato}>
      <Text style={styles.etiquetaDato}>{etiqueta}</Text>
      <Text style={styles.valorDato}>
        {mostrarValor ? String(valor) : 'No registrado'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  contenido: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
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
  encabezadoDetalle: {
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
  subtitulo: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  busqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    paddingLeft: 12,
    paddingRight: 5,
    marginBottom: 12,
  },
  iconoBusqueda: {
    color: C.secundario,
    fontSize: 25,
    marginRight: 8,
  },
  entradaBusqueda: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    color: C.texto,
    fontSize: 13,
  },
  limpiarBusqueda: {
    color: C.secundario,
    fontSize: 23,
    paddingHorizontal: 6,
  },
  botonBuscar: {
    backgroundColor: C.primario,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  textoBotonBuscar: {
    color: C.blanco,
    fontWeight: '700',
    fontSize: 12,
  },
  filtros: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#E9EFED',
    borderRadius: 10,
    padding: 5,
    marginBottom: 16,
  },
  filtro: {
    flex: 1,
    minHeight: 39,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtroSeleccionado: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
  },
  textoFiltro: {
    color: C.secundario,
    fontSize: 12,
    fontWeight: '600',
  },
  textoFiltroSeleccionado: {
    color: C.primario,
    fontWeight: '800',
  },
  resumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  textoResumen: {
    color: C.secundario,
    fontSize: 12,
  },
  enlaceActualizar: {
    color: C.primario,
    fontSize: 12,
    fontWeight: '700',
  },
  lista: {
    flex: 1,
  },
  contenidoLista: {
    paddingBottom: 24,
  },
  tarjeta: {
    width: '100%',
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  tarjetaContenido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#E2F2EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoAvatar: {
    fontSize: 24,
  },
  datosTarjeta: {
    flex: 1,
    minWidth: 0,
  },
  codigo: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
  },
  codigoSecundario: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 3,
  },
  tipoAnimal: {
    color: C.primario,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  propietario: {
    color: C.secundario,
    fontSize: 13,
    marginTop: 5,
  },
  filaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 9,
  },
  puntoEstado: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  textoEstadoTarjeta: {
    fontSize: 12,
    fontWeight: '700',
  },
  separadorTarjeta: {
    height: 1,
    backgroundColor: C.borde,
    marginTop: 14,
    marginBottom: 10,
  },
  botonDetalle: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  textoBotonDetalle: {
    color: C.primario,
    fontSize: 13,
    fontWeight: '800',
  },
  flechaDetalle: {
    color: C.primario,
    fontSize: 21,
  },
  estadoCarga: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  textoEstado: {
    color: C.secundario,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  estadoVacio: {
    backgroundColor: C.blanco,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    padding: 24,
    marginTop: 4,
  },
  iconoVacio: {
    fontSize: 34,
    marginBottom: 8,
  },
  tituloEstado: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  botonReintentar: {
    backgroundColor: C.primario,
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 15,
  },
  textoBotonBlanco: {
    color: C.blanco,
    fontSize: 12,
    fontWeight: '700',
  },
  detalleContenedor: {
    flex: 1,
  },
  contenidoDetalle: {
    paddingBottom: 28,
  },
  ficha: {
    width: '100%',
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    padding: 20,
  },
  avatarFicha: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2F2EE',
    alignSelf: 'center',
  },
  iconoFicha: {
    fontSize: 32,
  },
  nombreFicha: {
    color: C.texto,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  codigoFicha: {
    color: C.primario,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  separadorFicha: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 18,
  },
  tituloSeccion: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  filaDato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F1',
  },
  etiquetaDato: {
    flex: 1,
    color: C.secundario,
    fontSize: 13,
  },
  valorDato: {
    flex: 1,
    color: C.texto,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  filaFichaEstado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  valorEstadoFicha: {
    fontSize: 13,
    fontWeight: '800',
  },
  botonEstado: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  botonDesactivar: {
    backgroundColor: C.rojoFondo,
    borderColor: '#F5C7C4',
  },
  botonActivar: {
    backgroundColor: C.verdeFondo,
    borderColor: '#B9E2C5',
  },
  textoBotonEstado: {
    fontSize: 14,
    fontWeight: '800',
  },
  textoBotonDesactivar: {
    color: C.rojo,
  },
  textoBotonActivar: {
    color: C.verde,
  },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(20, 35, 40, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  modalCaja: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: C.blanco,
    borderRadius: 18,
    padding: 22,
  },
  modalIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.rojoFondo,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalIconoTexto: {
    color: C.rojo,
    fontSize: 26,
    fontWeight: '800',
  },
  modalIconoActivar: {
    backgroundColor: C.verdeFondo,
  },
  modalIconoTextoActivar: {
    color: C.verde,
  },
  modalTitulo: {
    color: C.texto,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalDescripcion: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  modalEtiqueta: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalEntrada: {
    minHeight: 105,
    maxHeight: 160,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    padding: 12,
    color: C.texto,
    fontSize: 14,
    backgroundColor: '#FCFDFD',
  },
  modalAyuda: {
    color: C.secundario,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 7,
  },
  modalAcciones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  modalBoton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBotonCancelar: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
  },
  modalBotonConfirmar: {
    backgroundColor: C.rojo,
  },
  modalBotonActivar: {
    backgroundColor: C.verde,
  },
  modalTextoCancelar: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '700',
  },
  modalTextoConfirmar: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },
  botonDeshabilitado: {
    opacity: 0.7,
  },

  // Estilos originales del modal de resultado.
  modalIconoError: {
    backgroundColor: C.rojoFondo,
  },
  modalIconoTextoError: {
    color: C.rojo,
  },
  modalBotonResultado: {
    backgroundColor: C.primario,
    marginTop: 4,
  },
  modalBotonError: {
    backgroundColor: C.rojo,
  },
});
