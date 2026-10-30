
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import {
  listarAtenciones,
  listarMascotasParaRegistro,
  crearAtencion,
} from '../controllers/atenciones/atencionesControlador';

import { obtenerActividadesPorEstado } from '../services/actividadesServicio';
import EncabezadoPetCare from '../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../components/layout/MenuLateralDerecho';
import { validarDatosAtencion } from '../utils/validacionesAtencion';
import { logger } from '../utils/logger';

const C = {
  fondo: '#F4F8F7',
  verde: '#12665E',
  verdeOscuro: '#104F49',
  verdeClaro: '#E6F4EF',
  texto: '#243746',
  secundario: '#718096',
  blanco: '#FFFFFF',
  borde: '#E0EAE7',
  naranja: '#FFF2D8',
  naranjaTexto: '#96620A',
  rojo: '#FCE8E8',
  rojoTexto: '#B42318',
};

const FILTROS = ['Todas', 'Activa', 'Finalizada'];

const ESTADOS_ACTIVIDAD = [
  'Pendiente',
  'Completada',
  'No realizada',
];

const MENSAJE_ERROR_LISTADO =
  'No se pudo cargar la información de las atenciones. Intente nuevamente.';

const MENSAJE_ERROR_ACTIVIDADES =
  'No se pudieron cargar los filtros de actividades. Intente nuevamente.';

function fechaLegible(fecha) {
  if (!fecha) return 'No registrada';

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return 'No disponible';
  }

  return valor.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function obtenerEstadoParametro(parametro) {
  const estado = Array.isArray(parametro)
    ? parametro[0]
    : parametro;

  return ESTADOS_ACTIVIDAD.includes(estado) ? estado : '';
}

export default function AtencionesScreen() {
  const { estadoActividad: parametroEstadoActividad } =
    useLocalSearchParams();

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [atenciones, setAtenciones] = useState([]);
  const [mascotas, setMascotas] = useState([]);
  const [actividades, setActividades] = useState([]);

  const [filtro, setFiltro] = useState('Todas');
  const [estadoActividad, setEstadoActividad] = useState(
    () => obtenerEstadoParametro(parametroEstadoActividad)
  );

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [errorCarga, setErrorCarga] = useState('');
  const [errorActividades, setErrorActividades] = useState('');

  const [modalRegistro, setModalRegistro] = useState(false);
  const [busquedaListado, setBusquedaListado] = useState('');
  const [busquedaFormulario, setBusquedaFormulario] = useState('');
  const [mascotaSeleccionada, setMascotaSeleccionada] = useState(null);
  const [motivoConsulta, setMotivoConsulta] = useState('');
  const [observaciones, setObservaciones] = useState('');

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');

  useEffect(() => {
    setEstadoActividad(
      obtenerEstadoParametro(parametroEstadoActividad)
    );
  }, [parametroEstadoActividad]);

  // RF09: la vista solicita los datos al controlador.
  const cargarDatos = useCallback(async (actualizar = false) => {
    if (actualizar) {
      setActualizando(true);
    } else {
      setCargando(true);
    }

    setErrorCarga('');

    try {
      const [listaAtenciones, listaMascotas] = await Promise.all([
        listarAtenciones(),
        listarMascotasParaRegistro(),
      ]);

      setAtenciones(
        Array.isArray(listaAtenciones) ? listaAtenciones : []
      );

      setMascotas(
        Array.isArray(listaMascotas) ? listaMascotas : []
      );
    } catch (error) {
      logger.error('RF09: error al cargar atenciones:', error);
      setErrorCarga(MENSAJE_ERROR_LISTADO);
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  // RF10: consulta las actividades para construir los filtros.
  const cargarActividades = useCallback(async () => {
    setErrorActividades('');

    try {
      const resultados = await Promise.all(
        ESTADOS_ACTIVIDAD.map((estado) =>
          obtenerActividadesPorEstado(estado)
        )
      );

      const actividadesUnicas = new Map();

      resultados.flat().forEach((actividad) => {
        if (actividad?.actividad_id != null) {
          actividadesUnicas.set(
            String(actividad.actividad_id),
            actividad
          );
        }
      });

      setActividades(Array.from(actividadesUnicas.values()));
    } catch (error) {
      logger.error('RF10: error al cargar actividades:', error);
      setErrorActividades(MENSAJE_ERROR_ACTIVIDADES);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
    cargarActividades();
  }, [cargarDatos, cargarActividades]);

  // Agrupa las actividades por atención.
  const actividadesPorAtencion = useMemo(() => {
    const agrupadas = new Map();

    actividades.forEach((actividad) => {
      if (actividad?.atencion_id == null) return;

      const idAtencion = String(actividad.atencion_id);

      if (!agrupadas.has(idAtencion)) {
        agrupadas.set(idAtencion, []);
      }

      agrupadas.get(idAtencion).push(actividad);
    });

    return agrupadas;
  }, [actividades]);

  // RF09 y RF10: filtra las atenciones por estado, búsqueda y actividad.
  const atencionesFiltradas = useMemo(() => {
    const busqueda = busquedaListado.trim().toLowerCase();

    return atenciones.filter((atencion) => {
      const coincideEstado =
        filtro === 'Todas' || atencion.estado === filtro;

      const nombre = String(
        atencion.mascotas?.nombre || 'Mascota'
      ).toLowerCase();

      const historia = String(
        atencion.numero_historia || ''
      ).toLowerCase();

      const coincideBusqueda =
        nombre.includes(busqueda) ||
        historia.includes(busqueda);

      const actividadesAtencion =
        actividadesPorAtencion.get(
          String(atencion.atencion_id)
        ) || [];

      const coincideEstadoActividad =
        !estadoActividad ||
        actividadesAtencion.some(
          (actividad) => actividad.estado === estadoActividad
        );

      return (
        coincideEstado &&
        coincideBusqueda &&
        coincideEstadoActividad
      );
    });
  }, [
    atenciones,
    actividadesPorAtencion,
    filtro,
    busquedaListado,
    estadoActividad,
  ]);

  // Calcula los contadores manteniendo los filtros de búsqueda.
  const cantidadesFiltros = useMemo(() => {
    const busqueda = busquedaListado.trim().toLowerCase();

    const base = atenciones.filter((atencion) => {
      const nombre = String(
        atencion.mascotas?.nombre || 'Mascota'
      ).toLowerCase();

      const historia = String(
        atencion.numero_historia || ''
      ).toLowerCase();

      const coincideBusqueda =
        nombre.includes(busqueda) ||
        historia.includes(busqueda);

      const actividadesAtencion =
        actividadesPorAtencion.get(
          String(atencion.atencion_id)
        ) || [];

      const coincideEstadoActividad =
        !estadoActividad ||
        actividadesAtencion.some(
          (actividad) => actividad.estado === estadoActividad
        );

      return coincideBusqueda && coincideEstadoActividad;
    });

    return {
      Todas: base.length,
      Activa: base.filter(
        (atencion) => atencion.estado === 'Activa'
      ).length,
      Finalizada: base.filter(
        (atencion) => atencion.estado === 'Finalizada'
      ).length,
    };
  }, [
    atenciones,
    actividadesPorAtencion,
    busquedaListado,
    estadoActividad,
  ]);

  // RF22: búsqueda de mascotas activas para registrar una atención.
  const mascotasFiltradas = useMemo(() => {
    const busqueda = busquedaFormulario.trim().toLowerCase();

    return mascotas.filter((mascota) => {
      const nombre = String(mascota.nombre || '').toLowerCase();
      const historia = String(
        mascota.numero_historia || ''
      ).toLowerCase();

      const especie = String(
        mascota.especie || ''
      ).toLowerCase();

      const propietario = mascota.propietarios || {};
      const nombrePropietario = [
        propietario.nombre,
        propietario.apellido,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        nombre.includes(busqueda) ||
        historia.includes(busqueda) ||
        especie.includes(busqueda) ||
        nombrePropietario.includes(busqueda)
      );
    });
  }, [mascotas, busquedaFormulario]);

  function abrirFormulario() {
    setMascotaSeleccionada(null);
    setMotivoConsulta('');
    setObservaciones('');
    setBusquedaFormulario('');
    setModalRegistro(true);
  }

  function cerrarFormulario() {
    if (guardando) return;

    setModalRegistro(false);
    setMascotaSeleccionada(null);
    setMotivoConsulta('');
    setObservaciones('');
    setBusquedaFormulario('');
  }

  // RF22 y RF23: la vista valida y delega la operación al controlador.
  async function guardarAtencion() {
    if (guardando) return;

    const validacion = validarDatosAtencion({
      numero_historia: mascotaSeleccionada?.numero_historia ?? '',
      motivo_consulta: motivoConsulta,
      observaciones,
    });

    if (!validacion.valido) {
      Alert.alert('Campo obligatorio', validacion.mensaje);
      return;
    }

    if (!motivoConsulta.trim()) {
      Alert.alert(
        'Campo obligatorio',
        'El motivo de consulta es obligatorio.'
      );
      return;
    }

    setGuardando(true);

    try {
      await crearAtencion({
        numero_historia: mascotaSeleccionada.numero_historia,
        motivo_consulta: motivoConsulta.trim(),
        observaciones: observaciones.trim(),
      });

      setModalRegistro(false);
      setMascotaSeleccionada(null);
      setMotivoConsulta('');
      setObservaciones('');
      setBusquedaFormulario('');

      Alert.alert(
        'Atención registrada',
        'La atención veterinaria fue registrada correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: async () => {
              await cargarDatos(true);
              await cargarActividades();
            },
          },
        ]
      );
    } catch (error) {
      logger.error('Error al registrar atención:', error);

      Alert.alert(
        'Error',
        error?.message ||
          'No se pudo registrar la atención. Intente nuevamente.'
      );
    } finally {
      setGuardando(false);
    }
  }

  function abrirDetalle(atencion) {
    router.push({
      pathname: '/detalleAtencion',
      params: {
        atencion_id: String(atencion.atencion_id),
      },
    });
  }

  function cerrarSesion() {
    Alert.alert(
      'Cerrar sesión',
      'Utiliza la opción Cerrar sesión del menú lateral.'
    );
  }

  function estiloEstado(estado) {
    if (estado === 'Finalizada') {
      return {
        fondo: C.verdeClaro,
        texto: C.verdeOscuro,
      };
    }

    if (estado === 'No realizada') {
      return {
        fondo: C.rojo,
        texto: C.rojoTexto,
      };
    }

    return {
      fondo: C.naranja,
      texto: C.naranjaTexto,
    };
  }

  function quitarFiltroActividad() {
    setEstadoActividad('');
    router.setParams({ estadoActividad: '' });
  }

  return (
    <SafeAreaView style={estilos.contenedor}>
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() =>
          Alert.alert(
            'Notificaciones',
            'No tienes notificaciones nuevas.'
          )
        }
      />

      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={async () => {
              await Promise.all([
                cargarDatos(true),
                cargarActividades(),
              ]);
            }}
            tintColor={C.verde}
          />
        }
      >
        <View style={estilos.migas}>
          <Text style={estilos.textoMiga}>Inicio</Text>
          <Text style={estilos.textoMiga}> / </Text>
          <Text style={estilos.migaActual}>Atenciones</Text>
        </View>

        <View style={estilos.encabezadoPagina}>
          <View style={estilos.tituloContenedor}>
            <Text style={estilos.titulo}>Atenciones</Text>
            <Text style={estilos.descripcion}>
              Consulta y administra la atención veterinaria de las mascotas.
            </Text>
          </View>

          <Pressable
            style={estilos.botonNuevaAtencion}
            onPress={abrirFormulario}
            accessibilityRole="button"
            accessibilityLabel="Nueva atención"
          >
            <Text style={estilos.botonNuevaAtencionTexto}>
              + Nueva atención
            </Text>
          </Pressable>
        </View>

        <Text style={estilos.etiquetaCampo}>Buscar mascota</Text>

        <TextInput
          style={estilos.busqueda}
          value={busquedaListado}
          onChangeText={setBusquedaListado}
          placeholder="Nombre o número de historia..."
          placeholderTextColor={C.secundario}
          accessibilityLabel="Buscar mascota por nombre o número de historia"
        />

        <Text style={estilos.tituloFiltros}>
          Estado de la atención
        </Text>

        <View style={estilos.filtros}>
          {FILTROS.map((estado) => {
            const seleccionado = filtro === estado;

            return (
              <Pressable
                key={estado}
                onPress={() => setFiltro(estado)}
                style={[
                  estilos.botonFiltro,
                  seleccionado && estilos.botonFiltroActivo,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: seleccionado }}
              >
                <Text
                  style={[
                    estilos.textoFiltro,
                    seleccionado && estilos.textoFiltroActivo,
                  ]}
                >
                  {estado} ({cantidadesFiltros[estado] ?? 0})
                </Text>
              </Pressable>
            );
          })}
        </View>

        {estadoActividad ? (
          <View style={estilos.filtroActividadActivo}>
            <Text style={estilos.textoFiltroActividad}>
              Actividades: {estadoActividad}
            </Text>

            <Pressable
              onPress={quitarFiltroActividad}
              accessibilityRole="button"
              accessibilityLabel="Quitar filtro de actividad"
            >
              <Text style={estilos.quitarFiltroActividad}>
                Quitar filtro ×
              </Text>
            </Pressable>
          </View>
        ) : null}

        {errorActividades ? (
          <View style={estilos.avisoActividades}>
            <Text style={estilos.textoAvisoActividades}>
              {errorActividades}
            </Text>
            <Pressable
              onPress={cargarActividades}
              accessibilityRole="button"
            >
              <Text style={estilos.quitarFiltroActividad}>
                Reintentar
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={estilos.encabezadoListado}>
          <Text style={estilos.tituloListado}>
            Listado de atenciones
          </Text>
          <Text style={estilos.contador}>
            {atencionesFiltradas.length}
          </Text>
        </View>

        {cargando ? (
          <View style={estilos.estadoVacio}>
            <ActivityIndicator size="large" color={C.verde} />
            <Text style={estilos.textoVacio}>
              Cargando atenciones...
            </Text>
          </View>
        ) : errorCarga ? (
          <View style={estilos.tarjetaError} accessibilityRole="alert">
            <Text style={estilos.iconoError}>!</Text>
            <Text style={estilos.tituloError}>
              No se pudo cargar el listado
            </Text>
            <Text style={estilos.textoError}>
              {errorCarga}
            </Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reintentar carga de atenciones"
              style={estilos.botonReintentar}
              onPress={() => cargarDatos()}
              disabled={actualizando}
            >
              {actualizando ? (
                <ActivityIndicator color={C.blanco} />
              ) : (
                <Text style={estilos.textoBotonReintentar}>
                  Reintentar
                </Text>
              )}
            </Pressable>
          </View>
        ) : atencionesFiltradas.length === 0 ? (
          <View style={estilos.estadoVacio}>
            <Text style={estilos.iconoVacio}>▤</Text>
            <Text style={estilos.tituloVacio}>
              No hay atenciones para mostrar.
            </Text>
            <Text style={estilos.textoVacio}>
              Registra una atención o cambia los filtros de búsqueda.
            </Text>
          </View>
        ) : (
          atencionesFiltradas.map((atencion) => {
            const estado = estiloEstado(atencion.estado);

            return (
              <Pressable
                key={String(atencion.atencion_id)}
                style={estilos.tarjetaAtencion}
                onPress={() => abrirDetalle(atencion)}
                accessibilityRole="button"
                accessibilityLabel={
                  `Ver atención ${atencion.atencion_id} de ` +
                  `${atencion.mascotas?.nombre || 'Mascota'}`
                }
              >
                <View style={estilos.filaTarjeta}>
                  <View style={estilos.iconoMascota}>
                    <Text style={estilos.iconoMascotaTexto}>♧</Text>
                  </View>

                  <View style={estilos.datosAtencion}>
                    <Text style={estilos.nombreMascota}>
                      {atencion.mascotas?.nombre || 'Mascota'}
                    </Text>

                    <Text style={estilos.subtexto}>
                      Atención N.° {atencion.atencion_id}
                    </Text>

                    <Text style={estilos.subtexto}>
                      Historia: {atencion.numero_historia || 'No registrada'}
                    </Text>
                  </View>

                  <View
                    style={[
                      estilos.etiquetaEstado,
                      { backgroundColor: estado.fondo },
                    ]}
                  >
                    <Text
                      style={[
                        estilos.textoEstado,
                        { color: estado.texto },
                      ]}
                    >
                      {atencion.estado}
                    </Text>
                  </View>
                </View>

                <View style={estilos.separador} />

                <View style={estilos.filaFecha}>
                  <Text style={estilos.etiquetaDetalle}>Inicio</Text>
                  <Text style={estilos.valorDetalle}>
                    {fechaLegible(atencion.fecha_inicio)}
                  </Text>
                </View>

                {atencion.fecha_fin ? (
                  <View style={estilos.filaFecha}>
                    <Text style={estilos.etiquetaDetalle}>
                      Finalización
                    </Text>
                    <Text style={estilos.valorDetalle}>
                      {fechaLegible(atencion.fecha_fin)}
                    </Text>
                  </View>
                ) : null}

                <Text style={estilos.abrirDetalle}>
                  Ver detalle de la atención →
                </Text>
              </Pressable>
            );
          })
        )}

        <Text style={estilos.pie}>
          PetCare · Sistema de seguimiento de atención veterinaria
        </Text>
      </ScrollView>

      <Modal
        visible={modalRegistro}
        transparent
        animationType="slide"
        onRequestClose={cerrarFormulario}
      >
        <View style={estilos.fondoModal}>
          <View style={estilos.modal}>
            <View style={estilos.encabezadoModal}>
              <View style={estilos.modalTituloContenedor}>
                <Text style={estilos.modalTitulo}>
                  Registrar atención
                </Text>
                <Text style={estilos.modalDescripcion}>
                  Selecciona la mascota y completa el motivo de consulta.
                </Text>
              </View>

              <Pressable
                style={estilos.botonCerrarModal}
                onPress={cerrarFormulario}
                disabled={guardando}
                accessibilityRole="button"
                accessibilityLabel="Cerrar formulario"
              >
                <Text style={estilos.botonCerrarTexto}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={estilos.etiquetaCampo}>
                Buscar mascota *
              </Text>

              <TextInput
                style={estilos.busqueda}
                value={busquedaFormulario}
                onChangeText={(texto) => {
                  setBusquedaFormulario(texto);
                  setMascotaSeleccionada(null);
                }}
                placeholder="Nombre, historia o propietario"
                placeholderTextColor={C.secundario}
                editable={!guardando}
              />

              {mascotaSeleccionada ? (
                <View style={estilos.mascotaElegida}>
                  <Text style={estilos.mascotaElegidaNombre}>
                    {mascotaSeleccionada.nombre}
                  </Text>

                  <Text style={estilos.subtexto}>
                    Historia: {mascotaSeleccionada.numero_historia}
                  </Text>

                  <Pressable
                    onPress={() => setMascotaSeleccionada(null)}
                    disabled={guardando}
                  >
                    <Text style={estilos.cambiarMascota}>
                      Cambiar mascota
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={estilos.listaMascotas}>
                  {mascotasFiltradas.slice(0, 30).map((mascota) => (
                    <Pressable
                      key={mascota.numero_historia}
                      style={estilos.opcionMascota}
                      onPress={() => {
                        setMascotaSeleccionada(mascota);
                        setBusquedaFormulario(
                          mascota.nombre || mascota.numero_historia
                        );
                      }}
                      disabled={guardando}
                    >
                      <Text style={estilos.opcionMascotaNombre}>
                        {mascota.nombre}
                      </Text>

                      <Text style={estilos.subtexto}>
                        {mascota.especie || 'Especie no registrada'}
                        {' · Historia: '}
                        {mascota.numero_historia}
                      </Text>

                      {mascota.propietarios ? (
                        <Text style={estilos.subtexto}>
                          Propietario:{' '}
                          {[
                            mascota.propietarios.nombre,
                            mascota.propietarios.apellido,
                          ]
                            .filter(Boolean)
                            .join(' ') || 'No registrado'}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}

                  {mascotasFiltradas.length === 0 ? (
                    <Text style={estilos.textoVacio}>
                      No hay mascotas activas que coincidan con la búsqueda.
                    </Text>
                  ) : null}
                </View>
              )}

              <Text style={estilos.etiquetaCampo}>
                Motivo de consulta *
              </Text>

              <TextInput
                style={estilos.busqueda}
                value={motivoConsulta}
                onChangeText={setMotivoConsulta}
                placeholder="Describe el motivo de la atención..."
                placeholderTextColor={C.secundario}
                editable={!guardando}
                maxLength={500}
              />

              <Text style={estilos.etiquetaCampo}>
                Observaciones
              </Text>

              <TextInput
                style={estilos.campoObservaciones}
                value={observaciones}
                onChangeText={setObservaciones}
                placeholder="Escribe las observaciones iniciales..."
                placeholderTextColor={C.secundario}
                multiline
                textAlignVertical="top"
                editable={!guardando}
                maxLength={2000}
              />

              <Text style={estilos.notaFormulario}>
                La fecha de inicio se registra automáticamente y el estado
                inicial será Activa. La consulta se guarda con estado Pendiente.
              </Text>

              <View style={estilos.botonesModal}>
                <Pressable
                  style={estilos.botonCancelar}
                  onPress={cerrarFormulario}
                  disabled={guardando}
                >
                  <Text style={estilos.textoCancelar}>
                    Cancelar
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    estilos.botonGuardar,
                    guardando && estilos.botonDeshabilitado,
                  ]}
                  onPress={guardarAtencion}
                  disabled={guardando}
                >
                  {guardando ? (
                    <ActivityIndicator color={C.blanco} />
                  ) : (
                    <Text style={estilos.textoGuardar}>
                      Registrar
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
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

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  contenido: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 30,
  },
  migas: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  textoMiga: {
    color: C.secundario,
    fontSize: 13,
  },
  migaActual: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '700',
  },
  encabezadoPagina: {
    gap: 14,
    marginBottom: 22,
  },
  tituloContenedor: {
    flex: 1,
  },
  titulo: {
    color: C.texto,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  descripcion: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 21,
  },
  botonNuevaAtencion: {
    alignSelf: 'flex-start',
    backgroundColor: C.verde,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
  },
  botonNuevaAtencionTexto: {
    color: C.blanco,
    fontWeight: '700',
    fontSize: 14,
  },
  etiquetaCampo: {
    color: C.texto,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
  },
  busqueda: {
    minHeight: 48,
    backgroundColor: C.blanco,
    borderColor: C.borde,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.texto,
    fontSize: 14,
  },
  tituloFiltros: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 22,
    marginBottom: 10,
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  botonFiltro: {
    borderColor: C.borde,
    borderWidth: 1,
    backgroundColor: C.blanco,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  botonFiltroActivo: {
    backgroundColor: C.verde,
    borderColor: C.verde,
  },
  textoFiltro: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '600',
  },
  textoFiltroActivo: {
    color: C.blanco,
  },
  filtroActividadActivo: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.verdeClaro,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  textoFiltroActividad: {
    color: C.verdeOscuro,
    fontWeight: '600',
    fontSize: 13,
  },
  quitarFiltroActividad: {
    color: C.verde,
    fontWeight: '700',
    fontSize: 13,
    paddingVertical: 4,
  },
  avisoActividades: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.naranja,
    gap: 6,
  },
  textoAvisoActividades: {
    color: C.naranjaTexto,
    fontSize: 13,
  },
  encabezadoListado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 26,
    marginBottom: 14,
  },
  tituloListado: {
    color: C.texto,
    fontSize: 18,
    fontWeight: '800',
  },
  contador: {
    minWidth: 30,
    textAlign: 'center',
    overflow: 'hidden',
    backgroundColor: C.verdeClaro,
    color: C.verdeOscuro,
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontWeight: '800',
  },
  estadoVacio: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    paddingHorizontal: 22,
    paddingVertical: 32,
    marginTop: 6,
  },
  iconoVacio: {
    color: C.verde,
    fontSize: 34,
    marginBottom: 10,
  },
  tituloVacio: {
    color: C.texto,
    fontWeight: '800',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 7,
  },
  textoVacio: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  tarjetaError: {
    backgroundColor: C.blanco,
    borderColor: '#F3CACA',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  iconoError: {
    color: C.rojoTexto,
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 8,
  },
  tituloError: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  textoError: {
    color: C.secundario,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  botonReintentar: {
    marginTop: 16,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.verde,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  textoBotonReintentar: {
    color: C.blanco,
    fontWeight: '700',
  },
  tarjetaAtencion: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  filaTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconoMascota: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoMascotaTexto: {
    color: C.verde,
    fontSize: 27,
  },
  datosAtencion: {
    flex: 1,
  },
  nombreMascota: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtexto: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
  },
  etiquetaEstado: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 115,
  },
  textoEstado: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  separador: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 14,
  },
  filaFecha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  etiquetaDetalle: {
    color: C.secundario,
    fontSize: 12,
  },
  valorDetalle: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  abrirDetalle: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
  },
  pie: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 22,
    lineHeight: 18,
  },
  fondoModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 30, 35, 0.48)',
  },
  modal: {
    maxHeight: '92%',
    backgroundColor: C.fondo,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  encabezadoModal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTituloContenedor: {
    flex: 1,
    paddingRight: 12,
  },
  modalTitulo: {
    color: C.texto,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 5,
  },
  modalDescripcion: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 19,
  },
  botonCerrarModal: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCerrarTexto: {
    color: C.texto,
    fontSize: 28,
    lineHeight: 30,
  },
  mascotaElegida: {
    backgroundColor: C.verdeClaro,
    borderColor: '#B7DED1',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
  },
  mascotaElegidaNombre: {
    color: C.verdeOscuro,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 5,
  },
  cambiarMascota: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
  },
  listaMascotas: {
    backgroundColor: C.blanco,
    borderColor: C.borde,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 220,
    overflow: 'hidden',
  },
  opcionMascota: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomColor: C.borde,
    borderBottomWidth: 1,
  },
  opcionMascotaNombre: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  campoObservaciones: {
    minHeight: 100,
    backgroundColor: C.blanco,
    borderColor: C.borde,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.texto,
    fontSize: 14,
  },
  notaFormulario: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  botonesModal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  botonCancelar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: C.borde,
    borderWidth: 1,
    backgroundColor: C.blanco,
    borderRadius: 11,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  textoCancelar: {
    color: C.texto,
    fontWeight: '700',
  },
  botonGuardar: {
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.verde,
    borderRadius: 11,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  textoGuardar: {
    color: C.blanco,
    fontWeight: '800',
  },
});
