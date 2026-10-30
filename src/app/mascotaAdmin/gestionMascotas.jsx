
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
import { consultarMascotaPorId } from '../../dao/mascotaDAO';
import {
  buscarMascotasAdministracion,
  consultarMascotasAdministracion,
  gestionarEstadoMascota,
} from '../../services/administracion/mascotasService';
import { logger } from '../../utils/logger';

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
  const estado = String(mascota?.estado ?? 'Activo').trim().toLowerCase();

  return ['inactivo', 'inactiva', 'desactivado', 'desactivada'].includes(estado)
    ? 'Inactiva'
    : 'Activa';
}

function obtenerPropietario(mascota) {
  const propietario = mascota?.propietarios;

  if (!propietario) {
    return 'Propietario no registrado';
  }

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

  if (Number.isNaN(valor.getTime())) {
    return 'No registrada';
  }

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
  const [desactivando, setDesactivando] = useState(false);

  const [modalResultadoVisible, setModalResultadoVisible] = useState(false);
  const [resultadoExitoso, setResultadoExitoso] = useState(false);
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
      logger.error('Error al cargar perfil:', e);
    }
  }, []);

  const cargarMascotas = useCallback(async (texto = '') => {
    // ARRANGE: Normalizar el término de búsqueda.
    const textoBusqueda = String(texto ?? '').trim();

    try {
      setCargando(true);
      setError('');

      // ACT: Consultar el servicio según exista o no un término.
      const resultado = textoBusqueda
        ? await buscarMascotasAdministracion(textoBusqueda)
        : await consultarMascotasAdministracion();

      // ASSERT: Mantener un arreglo válido para renderizar los resultados.
      setMascotas(Array.isArray(resultado) ? resultado : []);
    } catch (e) {
      logger.error('Error al cargar mascotas:', e);

      setError(
        e?.message ||
          'No se pudieron cargar las mascotas. Intenta nuevamente.'
      );
    } finally {
      setCargando(false);
    }
  }, []);

useEffect(() => {
  let cancelado = false;

  const inicializarPantalla = async () => {
    if (cancelado) return;

    await Promise.all([
      cargarPerfil(),
      cargarMascotas(''),
    ]);
  };

  const tareaInicial = Promise.resolve().then(() => {
    if (!cancelado) {
      return inicializarPantalla();
    }

    return undefined;
  });

  return () => {
    cancelado = true;
    void tareaInicial;
  };
}, [cargarPerfil, cargarMascotas]);

  const mascotasFiltradas = useMemo(() => {
    if (filtroActivo === 'Todas') {
      return mascotas;
    }

    return mascotas.filter(
      (mascota) => obtenerEstado(mascota) === filtroActivo
    );
  }, [mascotas, filtroActivo]);

  const ejecutarBusqueda = () => {
    const termino = String(busqueda ?? '').trim();

    if (!termino) {
      Alert.alert(
        'Dato requerido',
        'Ingresa un dato para realizar la búsqueda de la mascota.'
      );
      return;
    }

    cargarMascotas(termino);
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

      if (detalle) {
        setMascotaSeleccionada(detalle);
      }
    } catch (e) {
      logger.error('Error al consultar detalle:', e);
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
    setMascotaPorDesactivar(mascota);
    setMotivoDesactivacion('');
    setModalDesactivacionVisible(true);
  };

  const cancelarCambioEstado = () => {
    if (desactivando) return;

    setModalDesactivacionVisible(false);
    setMascotaPorDesactivar(null);
    setMotivoDesactivacion('');
  };

  const confirmarCambioEstado = async () => {
    // ARRANGE: Validar los datos antes de solicitar el cambio.
    const motivo = String(motivoDesactivacion ?? '').trim();
    const numeroHistoria = mascotaPorDesactivar?.numero_historia;
    const estadoActual = obtenerEstado(mascotaPorDesactivar);
    const nuevoEstado = estadoActual === 'Activa' ? 'Inactivo' : 'Activo';

    if (!numeroHistoria) {
      Alert.alert(
        'Error',
        'No se encontró el número de historia clínica.'
      );
      return;
    }

    if (nuevoEstado === 'Inactivo' && !motivo) {
      Alert.alert(
        'Motivo obligatorio',
        'Escribe el motivo de desactivación.'
      );
      return;
    }

    const listaAnterior = mascotas;
    const seleccionAnterior = mascotaSeleccionada;

    try {
      setDesactivando(true);

      // ACT: Delegar el cambio de estado al servicio y al DAO.
      const resultado = await gestionarEstadoMascota({
        numeroHistoria,
        nuevoEstado,
        motivo,
        confirmado: true,
      });

      if (!resultado?.ok) {
        throw new Error(
          resultado?.mensaje ||
            'No se pudo actualizar el estado de la mascota.'
        );
      }

      // ASSERT: Mostrar el éxito solo si el servicio confirma el cambio.
      setModalDesactivacionVisible(false);
      setMascotaPorDesactivar(null);
      setMotivoDesactivacion('');
      setVista('lista');
      setMascotaSeleccionada(null);

      setResultadoExitoso(true);
      setMensajeResultado(resultado.mensaje);
      setModalResultadoVisible(true);

      await cargarMascotas(busqueda);
    } catch (e) {
      logger.error('Error al cambiar el estado de la mascota:', e);

      // ASSERT: No presentar el cambio como exitoso si hubo un error.
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

  const cerrarSesion = async () => {
    try {
      const { error: errorSesion } = await supabase.auth.signOut();

      if (errorSesion) throw errorSesion;

      setMenuAbierto(false);
      router.replace('/');
    } catch (e) {
      logger.error('Error al cerrar sesión:', e);
      Alert.alert('Error', 'No se pudo cerrar la sesión.');
    }
  };

  const volverAdministracion = () => router.replace('/administracion');

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor={C.blanco} />

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
              <Text style={styles.migaActual}>Ficha de la mascota</Text>
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
                <Text style={styles.titulo}>Gestión de mascotas</Text>
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

              <TouchableOpacity onPress={() => cargarMascotas(busqueda)}>
                <Text style={styles.enlaceActualizar}>↻ Actualizar</Text>
              </TouchableOpacity>
            </View>

            {cargando && mascotas.length === 0 ? (
              <View style={styles.estadoCarga}>
                <ActivityIndicator size="large" color={C.primario} />
                <Text style={styles.textoEstado}>Cargando mascotas...</Text>
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
                  <Text style={styles.textoBotonBlanco}>Reintentar</Text>
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
                              Código: {mascota.numero_historia || 'No registrado'}
                            </Text>
                            <Text style={styles.tipoAnimal}>
                              {mascota.especie || 'Tipo de animal no registrado'}
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
                                      estado === 'Activa' ? C.verde : C.rojo,
                                  },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.textoEstadoTarjeta,
                                  {
                                    color:
                                      estado === 'Activa' ? C.verde : C.rojo,
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
                <Text style={styles.titulo}>Ficha de la mascota</Text>
                <Text style={styles.subtitulo}>
                  Información del registro seleccionado.
                </Text>
              </View>
            </View>

            {cargandoDetalle ? (
              <View style={styles.estadoCarga}>
                <ActivityIndicator size="large" color={C.primario} />
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
                    Código: {mascotaSeleccionada.numero_historia || 'No registrado'}
                  </Text>

                  <View style={styles.separadorFicha} />

                  <Text style={styles.tituloSeccion}>Datos de la mascota</Text>
                  <FilaDato etiqueta="Nombre" valor={mascotaSeleccionada.nombre} />
                  <FilaDato
                    etiqueta="Historia clínica"
                    valor={mascotaSeleccionada.numero_historia}
                  />
                  <FilaDato etiqueta="Especie" valor={mascotaSeleccionada.especie} />
                  <FilaDato etiqueta="Raza" valor={mascotaSeleccionada.raza} />
                  <FilaDato etiqueta="Sexo" valor={mascotaSeleccionada.sexo} />
                  <FilaDato etiqueta="Color" valor={mascotaSeleccionada.color} />
                  <FilaDato
                    etiqueta="Fecha de nacimiento"
                    valor={formatearFecha(mascotaSeleccionada.fecha_nacimiento)}
                  />
                  <FilaDato
                    etiqueta="Fecha de registro"
                    valor={formatearFecha(mascotaSeleccionada.fecha_registro)}
                  />

                  <View style={styles.separadorFicha} />

                  <Text style={styles.tituloSeccion}>Propietario</Text>
                  <FilaDato
                    etiqueta="Nombre"
                    valor={obtenerPropietario(mascotaSeleccionada)}
                  />

                  <View style={styles.filaFichaEstado}>
                    <Text style={styles.etiquetaDato}>Estado del registro</Text>
                    <Text
                      style={[
                        styles.valorEstadoFicha,
                        {
                          color:
                            obtenerEstado(mascotaSeleccionada) === 'Activa'
                              ? C.verde
                              : C.rojo,
                        },
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
                    style={
                      obtenerEstado(mascotaSeleccionada) === 'Activa'
                        ? styles.botonDesactivar
                        : styles.botonActivar
                    }
                    onPress={() => solicitarCambioEstado(mascotaSeleccionada)}
                  >
                    <Text
                      style={
                        obtenerEstado(mascotaSeleccionada) === 'Activa'
                          ? styles.textoBotonDesactivar
                          : styles.textoBotonActivar
                      }
                    >
                      {obtenerEstado(mascotaSeleccionada) === 'Activa'
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
                  <Text style={styles.textoBotonBlanco}>Volver al listado</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      <Modal
        visible={modalDesactivacionVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelarCambioEstado}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <View style={styles.modalIcono}>
              <Text style={styles.modalIconoTexto}>!</Text>
            </View>

            <Text style={styles.modalTitulo}>
              {obtenerEstado(mascotaPorDesactivar) === 'Activa'
                ? 'Desactivar mascota'
                : 'Activar mascota'}
            </Text>

            <Text style={styles.modalDescripcion}>
              {obtenerEstado(mascotaPorDesactivar) === 'Activa'
                ? `¿Deseas desactivar el registro de ${mascotaPorDesactivar?.nombre || 'esta mascota'}?`
                : `¿Deseas activar el registro de ${mascotaPorDesactivar?.nombre || 'esta mascota'}?`}
            </Text>

            {obtenerEstado(mascotaPorDesactivar) === 'Activa' && (
              <>
                <Text style={styles.modalEtiqueta}>
                  Motivo de desactivación *
                </Text>
                <TextInput
                  style={styles.modalEntrada}
                  value={motivoDesactivacion}
                  onChangeText={setMotivoDesactivacion}
                  placeholder="Escribe el motivo de desactivación..."
                  placeholderTextColor="#8997A5"
                  multiline
                  maxLength={500}
                  editable={!desactivando}
                  textAlignVertical="top"
                />
                <Text style={styles.modalAyuda}>
                  Este motivo quedará guardado en el registro de la mascota.
                </Text>
              </>
            )}

            <View style={styles.modalAcciones}>
              <TouchableOpacity
                style={[styles.modalBoton, styles.modalBotonCancelar]}
                onPress={cancelarCambioEstado}
                disabled={desactivando}
              >
                <Text style={styles.modalTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBoton,
                  obtenerEstado(mascotaPorDesactivar) === 'Activa'
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
                  <Text style={styles.modalTextoConfirmar}>Confirmar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                resultadoExitoso ? styles.iconoResultadoExito : styles.iconoResultadoError,
              ]}
            >
              <Text
                style={[
                  styles.modalIconoTexto,
                  resultadoExitoso ? styles.textoResultadoExito : styles.textoResultadoError,
                ]}
              >
                {resultadoExitoso ? '✓' : '!'}
              </Text>
            </View>

            <Text style={styles.modalTitulo}>
              {resultadoExitoso ? 'Operación completada' : 'No se pudo completar'}
            </Text>
            <Text style={styles.modalDescripcion}>{mensajeResultado}</Text>

            <TouchableOpacity
              style={[styles.modalBoton, styles.botonResultado]}
              onPress={() => setModalResultadoVisible(false)}
            >
              <Text style={styles.modalTextoConfirmar}>Aceptar</Text>
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
  contenedor: { flex: 1, backgroundColor: C.fondo },
  contenido: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  migas: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  enlaceMiga: { color: C.primario, fontSize: 13, fontWeight: '600' },
  separador: { color: C.secundario, fontSize: 13 },
  migaActual: { color: C.secundario, fontSize: 13 },
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
  bloqueTitulo: { flex: 1 },
  titulo: { color: C.texto, fontSize: 23, fontWeight: '800' },
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
  iconoBusqueda: { color: C.secundario, fontSize: 25, marginRight: 8 },
  entradaBusqueda: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    color: C.texto,
    fontSize: 13,
  },
  limpiarBusqueda: { color: C.secundario, fontSize: 23, paddingHorizontal: 6 },
  botonBuscar: {
    backgroundColor: C.primario,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  textoBotonBuscar: { color: C.blanco, fontWeight: '700', fontSize: 12 },
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
  textoFiltro: { color: C.secundario, fontSize: 12, fontWeight: '600' },
  textoFiltroSeleccionado: { color: C.primario, fontWeight: '800' },
  resumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  textoResumen: { color: C.secundario, fontSize: 12 },
  enlaceActualizar: { color: C.primario, fontSize: 12, fontWeight: '700' },
  lista: { flex: 1 },
  contenidoLista: { paddingBottom: 24 },
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
  iconoAvatar: { fontSize: 24 },
  datosTarjeta: { flex: 1, minWidth: 0 },
  codigo: { color: C.texto, fontSize: 15, fontWeight: '800' },
  tipoAnimal: {
    color: C.primario,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  propietario: { color: C.secundario, fontSize: 13, marginTop: 5 },
  filaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 9,
  },
  puntoEstado: { width: 7, height: 7, borderRadius: 4 },
  textoEstadoTarjeta: { fontSize: 12, fontWeight: '700' },
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
  textoBotonDetalle: { color: C.primario, fontSize: 13, fontWeight: '800' },
  flechaDetalle: { color: C.primario, fontSize: 21 },
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
  iconoVacio: { fontSize: 34, marginBottom: 8 },
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
  textoBotonBlanco: { color: C.blanco, fontSize: 12, fontWeight: '700' },
  detalleContenedor: { flex: 1 },
  contenidoDetalle: { paddingBottom: 28 },
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
  iconoFicha: { fontSize: 32 },
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
  etiquetaDato: { flex: 1, color: C.secundario, fontSize: 13 },
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
  valorEstadoFicha: { fontSize: 13, fontWeight: '800' },
  botonDesactivar: {
    backgroundColor: C.rojoFondo,
    borderWidth: 1,
    borderColor: '#F5C7C4',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  textoBotonDesactivar: { color: C.rojo, fontSize: 14, fontWeight: '800' },
  botonActivar: {
    backgroundColor: C.verdeFondo,
    borderWidth: 1,
    borderColor: '#B7E2C4',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  textoBotonActivar: { color: C.verde, fontSize: 14, fontWeight: '800' },
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
  modalIconoTexto: { color: C.rojo, fontSize: 26, fontWeight: '800' },
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
  modalAcciones: { flexDirection: 'row', gap: 10, marginTop: 22 },
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
  modalBotonConfirmar: { backgroundColor: C.rojo },
  modalBotonActivar: { backgroundColor: C.verde },
  modalTextoCancelar: { color: C.texto, fontSize: 14, fontWeight: '700' },
  modalTextoConfirmar: {
    color: C.blanco,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  botonDeshabilitado: { opacity: 0.7 },
  iconoResultadoExito: { backgroundColor: C.verdeFondo },
  iconoResultadoError: { backgroundColor: C.rojoFondo },
  textoResultadoExito: { color: C.verde },
  textoResultadoError: { color: C.rojo },
  botonResultado: { backgroundColor: C.primario, marginTop: 4 },
});
