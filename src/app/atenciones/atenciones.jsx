
 // src/app/atenciones.jsx
// RF02: Control de acceso según el rol del usuario.
// RF05: Consulta del perfil del usuario autenticado.
// RF07: Cierre de sesión.
// RF21-RF28: Consulta y visualización de atenciones.
// RF: Búsqueda y filtrado de atenciones.
//
// Arquitectura:
// Vista -> Controlador de atenciones -> DAO/servicios.
// El perfil se consulta mediante perfilDAO.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  listarAtenciones,
} from '../../controllers/atenciones/atencionesControlador';

import {
  filtrarAtencionesPorEstado,
  obtenerFiltroEstadoInicial,
} from '../../services/atencionesFiltroServicio';

import { consultarPerfilPorId } from '../../dao/perfilDAO';
import { supabase } from '../../services/supabase';

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import { logger } from '../../utils/logger';
const FILTROS = [
  { etiqueta: 'Todas', valor: 'Todas' },
  { etiqueta: 'Activas', valor: 'Activa' },
  { etiqueta: 'Finalizadas', valor: 'Finalizada' },
];

function obtenerTexto(valor, alternativo = 'No especificado') {
  if (valor === null || valor === undefined || valor === '') {
    return alternativo;
  }

  return String(valor);
}

function normalizarTexto(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function obtenerIdentificador(atencion) {
  return (
    atencion?.atencion_id ??
    atencion?.id ??
    atencion?.numero_historia ??
    ''
  );
}

// RF21-RF28: admite las distintas formas del objeto devuelto por el controlador.
function obtenerNombreMascota(atencion) {
  return (
    atencion?.mascota?.nombre ??
    atencion?.mascotas?.nombre ??
    atencion?.nombre_mascota ??
    atencion?.mascota_nombre ??
    'Mascota sin nombre'
  );
}

// RF21-RF28: utiliza el nombre real cuando viene incluido en los datos.
function obtenerNombrePropietario(atencion) {
  const propietario =
    atencion?.propietario ??
    atencion?.propietarios ??
    atencion?.mascota?.propietario ??
    atencion?.mascota?.propietarios ??
    atencion?.mascotas?.propietario ??
    atencion?.mascotas?.propietarios;

  const nombreCompleto =
    propietario?.nombre_completo ??
    [
      propietario?.nombre,
      propietario?.apellido,
    ]
      .filter((parte) => String(parte ?? '').trim())
      .join(' ')
      .trim();

  return (
    nombreCompleto ||
    atencion?.nombre_propietario ||
    atencion?.propietario_nombre ||
    'Propietario no especificado'
  );
}

function obtenerEstado(atencion) {
  return atencion?.estado ?? 'Sin estado';
}

function obtenerFecha(atencion) {
  const fecha = atencion?.fecha_inicio ?? atencion?.fecha_creacion;

  if (!fecha) {
    return 'Fecha no disponible';
  }

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return String(fecha);
  }

  return fechaConvertida.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function obtenerColorEstado(estado) {
  const estadoNormalizado = normalizarTexto(estado);

  if (
    estadoNormalizado === 'activa' ||
    estadoNormalizado === 'activo'
  ) {
    return {
      fondo: '#E0F2E9',
      texto: '#19734B',
    };
  }

  if (
    estadoNormalizado === 'finalizada' ||
    estadoNormalizado === 'finalizado' ||
    estadoNormalizado === 'completada' ||
    estadoNormalizado === 'completado'
  ) {
    return {
      fondo: '#E2E8F0',
      texto: '#475569',
    };
  }

  if (
    estadoNormalizado === 'cancelada' ||
    estadoNormalizado === 'cancelado'
  ) {
    return {
      fondo: '#FEE2E2',
      texto: '#B91C1C',
    };
  }

  return {
    fondo: '#FEF3C7',
    texto: '#92400E',
  };
}

export default function Atenciones() {
  const router = useRouter();
  const parametros = useLocalSearchParams();

  const [atenciones, setAtenciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);

  const [filtroEstado, setFiltroEstado] = useState(() =>
    obtenerFiltroEstadoInicial(parametros?.estado)
  );

  const [busqueda, setBusqueda] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);

  // RF02 y RF05: perfil real del usuario autenticado.
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');

  // RF21-RF28: la vista solicita los datos al controlador.
  const cargarAtenciones = useCallback(async (esActualizacion = false) => {
    if (esActualizacion) {
      setActualizando(true);
    } else {
      setCargando(true);
    }

    setErrorCarga(false);

    try {
      const resultado = await listarAtenciones();

      const lista = Array.isArray(resultado)
        ? resultado
        : Array.isArray(resultado?.data)
          ? resultado.data
          : [];

      setAtenciones(lista);
    } catch (error) {
      logger.error('Error al cargar las atenciones:', error);
      setErrorCarga(true);

      Alert.alert(
        'No se pudieron cargar las atenciones',
        'Verifica tu conexión e inténtalo nuevamente.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  // RF02 y RF05: consulta el perfil usando el DAO.
  const cargarPerfilUsuario = useCallback(async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      if (!user) {
        setNombreUsuario('');
        setRolUsuario('');
        return;
      }

      const perfil = await consultarPerfilPorId(user.id);

      setNombreUsuario(perfil?.nombre_completo ?? '');
      setRolUsuario(perfil?.rol ?? '');
    } catch (errorPerfil) {
      logger.error(
        'Error al cargar el perfil del usuario:',
        errorPerfil
      );

      setNombreUsuario('');
      setRolUsuario('');
    }
  }, []);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      cargarAtenciones();
      cargarPerfilUsuario();
    }, 0);

    return () => clearTimeout(temporizador);
  }, [cargarAtenciones, cargarPerfilUsuario]);

  // RF: conserva los filtros y aplica la búsqueda a los datos reales.
  const atencionesFiltradas = useMemo(() => {
    let resultado = Array.isArray(atenciones) ? atenciones : [];

    if (filtroEstado && filtroEstado !== 'Todas') {
      resultado = filtrarAtencionesPorEstado(
        resultado,
        filtroEstado
      );

      if (!Array.isArray(resultado)) {
        resultado = [];
      }
    }

    const textoBusqueda = normalizarTexto(busqueda);

    if (!textoBusqueda) {
      return resultado;
    }

    return resultado.filter((atencion) => {
      const campos = [
        obtenerIdentificador(atencion),
        obtenerNombreMascota(atencion),
        obtenerNombrePropietario(atencion),
        atencion?.numero_historia,
        atencion?.observaciones,
        atencion?.estado,
      ];

      return campos.some((campo) =>
        normalizarTexto(campo).includes(textoBusqueda)
      );
    });
  }, [atenciones, filtroEstado, busqueda]);

  // RF: navegación al detalle de la atención.
  const abrirDetalleAtencion = useCallback(
    (atencion) => {
      const id = atencion?.atencion_id ?? atencion?.id;

      if (!id) {
        Alert.alert(
          'Atención no disponible',
          'No se encontró el identificador de esta atención.'
        );
        return;
      }

      router.push({
        pathname: '/detalleAtencion',
        params: { atencionId: String(id) },
      });
    },
    [router]
  );

  // RF: navegación al registro de atención.
  const abrirRegistroAtencion = useCallback(() => {
router.push('/atenciones/nuevaAtencion');
  }, [router]);

  // RF: volver a la pantalla anterior.
  const volver = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/inicio');
    }
  }, [router]);

  // RF07: cierre de sesión.
  const cerrarSesion = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setMenuAbierto(false);
      router.replace('/');
    } catch (error) {
      logger.error('Error al cerrar sesión:', error);

      Alert.alert(
        'No se pudo cerrar la sesión',
        'Inténtalo nuevamente.'
      );
    }
  }, [router]);

  // RF21-RF28: tarjeta de cada atención.
  const renderizarAtencion = useCallback(
    ({ item }) => {
      const estado = obtenerEstado(item);
      const coloresEstado = obtenerColorEstado(estado);

      return (
        <TouchableOpacity
          style={estilos.tarjeta}
          onPress={() => abrirDetalleAtencion(item)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Ver atención de ${obtenerNombreMascota(item)}`}
        >
                   <View style={estilos.tarjetaEncabezado}>
            <View style={estilos.identificadorContenedor}>
              <Text
                style={estilos.nombreMascotaTitulo}
                numberOfLines={2}
              >
                {obtenerNombreMascota(item)}
              </Text>
            </View>

            <View
              style={[
                estilos.etiquetaEstado,
                { backgroundColor: coloresEstado.fondo },
              ]}
            >
              <Text
                style={[
                  estilos.etiquetaEstadoTexto,
                  { color: coloresEstado.texto },
                ]}
              >
                {obtenerTexto(estado)}
              </Text>
            </View>
          </View>

          <View style={estilos.separador} />

 <View style={estilos.datoFila}>
  <Text style={estilos.datoEtiqueta}>ID de atención</Text>
  <Text style={estilos.datoValor}>
    {obtenerTexto(item?.atencion_id ?? item?.id, '—')}
  </Text>
</View>

          <View style={estilos.datoFila}>
            <Text style={estilos.datoEtiqueta}>Propietario</Text>
            <Text style={estilos.datoValor}>
              {obtenerNombrePropietario(item)}
            </Text>
          </View>

          <View style={estilos.datoFila}>
            <Text style={estilos.datoEtiqueta}>Fecha de inicio</Text>
            <Text style={estilos.datoValor}>
              {obtenerFecha(item)}
            </Text>
          </View>

          {!!item?.observaciones && (
            <View style={estilos.observacionesContenedor}>
              <Text style={estilos.datoEtiqueta}>
                Observaciones
              </Text>

              <Text style={estilos.observacionesTexto}>
                {item.observaciones}
              </Text>
            </View>
          )}

          <View style={estilos.tarjetaPie}>
            <Text style={estilos.verDetalleTexto}>
              Ver detalle
            </Text>
            <Text style={estilos.flechaDetalle}>›</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [abrirDetalleAtencion]
  );

  const keyExtractor = useCallback((item, indice) => {
    const id = item?.atencion_id ?? item?.id;

    return id ? String(id) : `atencion-${indice}`;
  }, []);

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#12665E"
      />

      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={() =>
          setMenuAbierto((anterior) => !anterior)
        }
      />

      <View style={estilos.contenido}>
        {/* Ruta de navegación. */}
        <Text style={estilos.migasPan}>
          Inicio / Atenciones
        </Text>

        {/* Título y acción en una misma fila. */}
        <View style={estilos.tituloFila}>
          <View style={estilos.tituloIzquierda}>
            <TouchableOpacity
              style={estilos.botonVolver}
              onPress={volver}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Text style={estilos.botonVolverTexto}>‹</Text>
            </TouchableOpacity>

            <View style={estilos.tituloTextos}>
              <Text style={estilos.titulo}>Atenciones</Text>
              <Text style={estilos.subtitulo}>
                Gestión y seguimiento de atenciones
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={estilos.botonNuevaAtencion}
            onPress={abrirRegistroAtencion}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Registrar nueva atención"
          >
            <Text style={estilos.botonNuevaAtencionTexto}>
              + Nueva atención
            </Text>
          </TouchableOpacity>
        </View>

        {/* Búsqueda. */}
        <View style={estilos.busquedaContenedor}>
          <Text style={estilos.iconoBusqueda}>⌕</Text>

          <TextInput
            style={estilos.campoBusqueda}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por mascota, propietario o código..."
            placeholderTextColor="#94A3B8"
            returnKeyType="search"
            accessibilityLabel="Buscar atenciones"
          />

          {busqueda.length > 0 && (
            <TouchableOpacity
              onPress={() => setBusqueda('')}
              style={estilos.botonLimpiarBusqueda}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
            >
              <Text style={estilos.botonLimpiarBusquedaTexto}>
                ×
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros por estado. */}
        <View style={estilos.filtros}>
          {FILTROS.map((filtro) => {
            const seleccionado = filtroEstado === filtro.valor;

            return (
              <TouchableOpacity
                key={filtro.valor}
                style={[
                  estilos.botonFiltro,
                  seleccionado && estilos.botonFiltroSeleccionado,
                ]}
                onPress={() => setFiltroEstado(filtro.valor)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: seleccionado }}
              >
                <Text
                  style={[
                    estilos.botonFiltroTexto,
                    seleccionado &&
                      estilos.botonFiltroTextoSeleccionado,
                  ]}
                >
                  {filtro.etiqueta}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={estilos.resultadosFila}>
          <Text style={estilos.resultadosTexto}>
            {cargando
              ? 'Cargando atenciones...'
              : `${atencionesFiltradas.length} ${
                  atencionesFiltradas.length === 1
                    ? 'atención encontrada'
                    : 'atenciones encontradas'
                }`}
          </Text>
        </View>

        {cargando ? (
          <View style={estilos.estadoContenedor}>
            <ActivityIndicator size="large" color="#12665E" />
            <Text style={estilos.estadoTexto}>
              Cargando información...
            </Text>
          </View>
        ) : errorCarga && atenciones.length === 0 ? (
          <View style={estilos.estadoContenedor}>
            <Text style={estilos.estadoIcono}>!</Text>
            <Text style={estilos.estadoTitulo}>
              No se pudieron cargar las atenciones
            </Text>
            <Text style={estilos.estadoTexto}>
              Comprueba tu conexión e inténtalo nuevamente.
            </Text>

            <TouchableOpacity
              style={estilos.botonReintentar}
              onPress={() => cargarAtenciones()}
              activeOpacity={0.85}
            >
              <Text style={estilos.botonReintentarTexto}>
                Reintentar
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={atencionesFiltradas}
            keyExtractor={keyExtractor}
            renderItem={renderizarAtencion}
            contentContainerStyle={
              atencionesFiltradas.length === 0
                ? estilos.listaVacia
                : estilos.listaContenido
            }
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={actualizando}
                onRefresh={() => cargarAtenciones(true)}
                colors={['#12665E']}
                tintColor="#12665E"
              />
            }
            ListEmptyComponent={
              <View style={estilos.estadoContenedor}>
                <Text style={estilos.estadoIcono}>⌕</Text>

                <Text style={estilos.estadoTitulo}>
                  {busqueda.trim()
                    ? 'No se encontraron resultados'
                    : 'No hay atenciones para mostrar'}
                </Text>

                <Text style={estilos.estadoTexto}>
                  {busqueda.trim()
                    ? 'Prueba con otro nombre, propietario o código.'
                    : 'Las atenciones registradas aparecerán aquí.'}
                </Text>

                {busqueda.trim().length > 0 && (
                  <TouchableOpacity
                    style={estilos.botonReintentar}
                    onPress={() => setBusqueda('')}
                    activeOpacity={0.85}
                  >
                    <Text style={estilos.botonReintentarTexto}>
                      Limpiar búsqueda
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}
      </View>

      {/* RF02: menú con el nombre y rol del usuario. */}
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
  pantalla: {
    flex: 1,
    backgroundColor: '#F4F7F7',
  },

  contenido: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 8,
  },

  migasPan: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 10,
  },

  tituloFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 8,
  },

  tituloIzquierda: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  botonVolver: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE6E4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  botonVolverTexto: {
    color: '#12665E',
    fontSize: 32,
    lineHeight: 34,
    marginTop: -4,
  },

  tituloTextos: {
    flex: 1,
    minWidth: 0,
  },

  titulo: {
    color: '#153A36',
    fontSize: 23,
    fontWeight: '800',
  },

  subtitulo: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },

  botonNuevaAtencion: {
    backgroundColor: '#12665E',
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botonNuevaAtencionTexto: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  busquedaContenedor: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE6E4',
    borderRadius: 13,
    paddingHorizontal: 12,
    marginBottom: 14,
  },

  iconoBusqueda: {
    color: '#64748B',
    fontSize: 27,
    marginRight: 8,
    lineHeight: 31,
  },

  campoBusqueda: {
    flex: 1,
    minHeight: 46,
    color: '#1E293B',
    fontSize: 13,
    paddingVertical: 8,
  },

  botonLimpiarBusqueda: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EFED',
  },

  botonLimpiarBusquedaTexto: {
    color: '#12665E',
    fontSize: 21,
    lineHeight: 24,
  },

  filtros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 14,
  },

  botonFiltro: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE6E4',
  },

  botonFiltroSeleccionado: {
    backgroundColor: '#12665E',
    borderColor: '#12665E',
  },

  botonFiltroTexto: {
    color: '#52636A',
    fontSize: 13,
    fontWeight: '600',
  },

  botonFiltroTextoSeleccionado: {
    color: '#FFFFFF',
  },

  resultadosFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  resultadosTexto: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },

  listaContenido: {
    paddingBottom: 24,
  },

  listaVacia: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 30,
  },

  tarjeta: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E1E9E7',
    padding: 15,
    marginBottom: 12,
    shadowColor: '#153A36',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },

  tarjetaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  identificadorContenedor: {
    flex: 1,
    minWidth: 0,
  },

  nombreMascotaTitulo: {
    color: '#153A36',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },

  identificadorEtiqueta: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 3,
  },

  identificadorValor: {
    color: '#153A36',
    fontSize: 16,
    fontWeight: '800',
  },

  etiquetaEstado: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
  },

  etiquetaEstadoTexto: {
    fontSize: 11,
    fontWeight: '700',
  },

  separador: {
    height: 1,
    backgroundColor: '#EDF1F0',
    marginVertical: 13,
  },

  datoFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },

  datoEtiqueta: {
    color: '#64748B',
    fontSize: 12,
    flex: 0.85,
  },

  datoValor: {
    color: '#253B3A',
    fontSize: 12,
    fontWeight: '600',
    flex: 1.3,
    textAlign: 'right',
  },

  observacionesContenedor: {
    marginTop: 2,
    marginBottom: 8,
  },

  observacionesTexto: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  tarjetaPie: {
    borderTopWidth: 1,
    borderTopColor: '#EDF1F0',
    marginTop: 5,
    paddingTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  verDetalleTexto: {
    color: '#12665E',
    fontSize: 12,
    fontWeight: '700',
  },

  flechaDetalle: {
    color: '#12665E',
    fontSize: 23,
    marginLeft: 6,
    lineHeight: 24,
  },

  estadoContenedor: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },

  estadoIcono: {
    color: '#12665E',
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 12,
  },

  estadoTitulo: {
    color: '#153A36',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 7,
  },

  estadoTexto: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 6,
  },

  botonReintentar: {
    backgroundColor: '#12665E',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 16,
  },

  botonReintentarTexto: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
