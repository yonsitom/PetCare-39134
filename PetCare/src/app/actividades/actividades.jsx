
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import { supabase } from '../../services/supabase';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

const C = {
  fondo: '#F4F8F7',
  verde: '#12665E',
  verdeOscuro: '#104F49',
  verdeClaro: '#E1F3EC',
  texto: '#243746',
  secundario: '#718096',
  blanco: '#FFFFFF',
  borde: '#DCE8E5',
  naranja: '#FFF2D8',
  naranjaTexto: '#96620A',
  rojo: '#FCE8E8',
  rojoTexto: '#B42318',
};

const ESTADOS = [
  'Todas',
  'Pendiente',
  'Completada',
  'No realizada',
];

function formatearFecha(fecha) {
  if (!fecha) return 'Sin fecha';

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return 'Fecha no disponible';
  }

  return fechaConvertida.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatearTipo(tipo) {
  const tipos = {
    Consulta: 'Consulta',
    Medicacion: 'Medicación',
    Vacunacion: 'Vacunación',
    Ecografia: 'Ecografía',
    Esterilizacion: 'Esterilización',
    'Otro actividad': 'Otro',
  };

  return tipos[tipo] || tipo || 'Actividad';
}

function obtenerEstiloEstado(estado) {
  switch (estado) {
    case 'Completada':
      return {
        fondo: C.verdeClaro,
        texto: C.verdeOscuro,
      };

    case 'No realizada':
      return {
        fondo: C.rojo,
        texto: C.rojoTexto,
      };

    case 'Pendiente':
    default:
      return {
        fondo: C.naranja,
        texto: C.naranjaTexto,
      };
  }
}

function obtenerFechaOrden(actividad) {
  const fecha = actividad.fecha_prevista || actividad.fecha_registro;

  if (!fecha) return Number.MAX_SAFE_INTEGER;

  const valor = new Date(fecha).getTime();

  return Number.isNaN(valor)
    ? Number.MAX_SAFE_INTEGER
    : valor;
}

function ordenarActividades(lista) {
  return [...lista].sort((a, b) => {
    const diferencia =
      obtenerFechaOrden(a) - obtenerFechaOrden(b);

    if (diferencia !== 0) return diferencia;

    return Number(a.actividad_id) - Number(b.actividad_id);
  });
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizarRelacion(relacion) {
  if (Array.isArray(relacion)) {
    return relacion[0] || null;
  }

  return relacion || null;
}

export default function ActividadesScreen() {
  const parametros = useLocalSearchParams();

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [actividades, setActividades] = useState([]);
  const [filtro, setFiltro] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  // ==========================================================
  // PERFIL DEL USUARIO ACTUAL
  // ==========================================================

  const cargarPerfilUsuario = useCallback(async () => {
    try {
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario) throw errorUsuario;

      if (!user) {
        setNombreUsuario('');
        setRolUsuario('');
        return;
      }

      const {
        data: perfil,
        error: errorPerfil,
      } = await supabase
        .from('perfiles')
        .select('nombre_completo, rol')
        .eq('perfil_id', user.id)
        .maybeSingle();

      if (errorPerfil) throw errorPerfil;

      setNombreUsuario(perfil?.nombre_completo || '');
      setRolUsuario(perfil?.rol || '');
    } catch (error) {
      console.error('Error al cargar perfil del usuario:', error);
    }
  }, []);

  // ==========================================================
  // FILTRO RECIBIDO POR PARÁMETROS
  // ==========================================================

  useEffect(() => {
    const estadoRecibido = Array.isArray(parametros.estadoActividad)
      ? parametros.estadoActividad[0]
      : parametros.estadoActividad;

    setFiltro(
      ESTADOS.includes(estadoRecibido)
        ? estadoRecibido
        : 'Todas'
    );
  }, [parametros.estadoActividad]);

  // ==========================================================
  // CARGAR ACTIVIDADES, MASCOTAS Y RESPONSABLES
  // ==========================================================

  const cargarActividades = useCallback(async (esActualizacion = false) => {
    if (esActualizacion) {
      setActualizando(true);
    } else {
      setCargando(true);
    }

    setErrorCarga(false);

    try {
      // ------------------------------------------------------
      // 1. CONSULTAR ACTIVIDADES Y ATENCIONES
      // ------------------------------------------------------

      const {
        data: datosActividades,
        error: errorActividades,
      } = await supabase
        .from('actividades')
        .select(`
          actividad_id,
          atencion_id,
          tipo,
          tipo_id,
          estado,
          fecha_prevista,
          fecha_inicio,
          fecha_fin,
          fecha_completada,
          observaciones,
          fecha_registro,
          creado_por,
          motivo_no_realizada,
          detalle,
          eliminado,
          tipos_actividad (
            tipo_id,
            codigo,
            nombre
          ),
          atenciones (
            atencion_id,
            estado,
            numero_historia,
            fecha_inicio,
            fecha_fin
          )
        `)
        .eq('eliminado', false);

      if (errorActividades) {
        throw errorActividades;
      }

      const lista = datosActividades || [];

      // ------------------------------------------------------
      // 2. OBTENER NÚMEROS DE HISTORIA
      // ------------------------------------------------------

      const historias = [
        ...new Set(
          lista
            .map((actividad) => {
              const atencion = normalizarRelacion(
                actividad.atenciones
              );

              return atencion?.numero_historia;
            })
            .filter(Boolean)
        ),
      ];

      // ------------------------------------------------------
      // 3. CONSULTAR NOMBRES DE MASCOTAS
      // ------------------------------------------------------

      let mascotasPorHistoria = {};

      if (historias.length > 0) {
        const {
          data: mascotas,
          error: errorMascotas,
        } = await supabase
          .from('mascotas')
          .select('numero_historia, nombre')
          .in('numero_historia', historias);

        if (errorMascotas) {
          throw errorMascotas;
        }

        mascotasPorHistoria = (mascotas || []).reduce(
          (resultado, mascota) => {
            resultado[mascota.numero_historia] =
              mascota.nombre || 'Mascota no disponible';

            return resultado;
          },
          {}
        );
      }

      // ------------------------------------------------------
      // 4. OBTENER LOS ID DE LOS RESPONSABLES
      // ------------------------------------------------------

      const idsResponsables = [
        ...new Set(
          lista
            .map((actividad) => actividad.creado_por)
            .filter(Boolean)
        ),
      ];

      // ------------------------------------------------------
      // 5. CONSULTAR PERFILES DE LOS RESPONSABLES
      // ------------------------------------------------------

      let perfilesPorId = {};

      if (idsResponsables.length > 0) {
        const {
          data: perfiles,
          error: errorPerfiles,
        } = await supabase
          .from('perfiles')
          .select(`
            perfil_id,
            nombre_completo,
            rol
          `)
          .in('perfil_id', idsResponsables);

        if (errorPerfiles) {
          throw errorPerfiles;
        }

        perfilesPorId = (perfiles || []).reduce(
          (resultado, perfil) => {
            resultado[perfil.perfil_id] = perfil;
            return resultado;
          },
          {}
        );
      }

      // ------------------------------------------------------
      // 6. PREPARAR LOS DATOS COMPLETOS
      // ------------------------------------------------------

      const preparadas = lista.map((actividad) => {
        const atencion = normalizarRelacion(
          actividad.atenciones
        );

        const tipoCatalogo = normalizarRelacion(
          actividad.tipos_actividad
        );

        const historia = atencion?.numero_historia || '';

        const responsable = actividad.creado_por
          ? perfilesPorId[actividad.creado_por] || null
          : null;

        const mascota = historia
          ? mascotasPorHistoria[historia] || null
          : null;

        return {
          ...actividad,

          // Tipo de actividad
          tipos_actividad: tipoCatalogo || null,
          tipo: tipoCatalogo?.nombre || actividad.tipo || null,
          tipo_codigo: tipoCatalogo?.codigo || null,

          // Datos de la mascota
          nombre_mascota: mascota || 'Mascota no disponible',
          numero_historia: historia,

          // Datos de la atención
          estado_atencion: atencion?.estado || '',
          fecha_inicio_atencion: atencion?.fecha_inicio || null,
          fecha_fin_atencion: atencion?.fecha_fin || null,

          // Datos de quien registró la actividad
          creador: responsable,
          nombre_creador:
            responsable?.nombre_completo || null,
          rol_creador:
            responsable?.rol || null,
        };
      });

      setActividades(ordenarActividades(preparadas));
    } catch (error) {
      console.error('Error al cargar actividades:', error);

      setErrorCarga(true);

      Alert.alert(
        'Error',
        'No se pudo cargar la información de las actividades. Intente nuevamente.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  // ==========================================================
  // RECARGAR AL REGRESAR A LA PANTALLA
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      cargarActividades();
      cargarPerfilUsuario();
    }, [cargarActividades, cargarPerfilUsuario])
  );

  // ==========================================================
  // FILTRAR ACTIVIDADES
  // ==========================================================

  const actividadesFiltradas = useMemo(() => {
    const termino = normalizarTexto(busqueda);

    return actividades.filter((actividad) => {
      const coincideEstado =
        filtro === 'Todas' || actividad.estado === filtro;

      if (!coincideEstado) return false;

      if (!termino) return true;

      const contenido = [
        actividad.nombre_mascota,
        actividad.tipo,
        formatearTipo(actividad.tipo),
        actividad.estado,
        actividad.atencion_id,
        actividad.numero_historia,
        actividad.observaciones,
        actividad.detalle,
        actividad.nombre_creador,
        actividad.rol_creador,
      ]
        .map(normalizarTexto)
        .join(' ');

      return contenido.includes(termino);
    });
  }, [actividades, filtro, busqueda]);

  // ==========================================================
  // ABRIR DETALLE CON TODOS LOS DATOS
  // ==========================================================

  function abrirDetalleActividad(actividad) {
    router.push({
      pathname: '/actividades/detalleActividad',
      params: {
        actividad: JSON.stringify(actividad),

        actividad_id: String(
          actividad.actividad_id || ''
        ),

        atencion_id: String(
          actividad.atencion_id || ''
        ),

        numero_historia: String(
          actividad.numero_historia || ''
        ),

        nombre_mascota: String(
          actividad.nombre_mascota || ''
        ),

        atencion_estado: String(
          actividad.estado_atencion || ''
        ),

        nombre_creador: String(
          actividad.nombre_creador || ''
        ),

        rol_creador: String(
          actividad.rol_creador || ''
        ),

        fecha_registro: String(
          actividad.fecha_registro ||
          actividad.created_at ||
          ''
        ),

        fecha_prevista: String(
          actividad.fecha_prevista || ''
        ),

        fecha_completada: String(
          actividad.fecha_completada ||
          actividad.fecha_fin ||
          ''
        ),
      },
    });
  }

  // ==========================================================
  // REGRESAR
  // ==========================================================

  function regresar() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/inicio');
    }
  }

  // ==========================================================
  // CERRAR SESIÓN
  // ==========================================================

  async function cerrarSesion() {
    if (cerrandoSesion) return;

    setCerrandoSesion(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setMenuAbierto(false);
      router.replace('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);

      Alert.alert(
        'Error',
        'No se pudo cerrar la sesión. Intente nuevamente.'
      );
    } finally {
      setCerrandoSesion(false);
    }
  }

  function abrirNotificaciones() {
    Alert.alert(
      'Notificaciones',
      'No tienes notificaciones nuevas.'
    );
  }

  // ==========================================================
  // VISTA
  // ==========================================================

  return (
    <SafeAreaView style={estilos.contenedor}>
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={abrirNotificaciones}
      />

      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => cargarActividades(true)}
            tintColor={C.verde}
          />
        }
      >
        <View style={estilos.encabezadoSeccion}>
          <Pressable
            onPress={regresar}
            accessibilityRole="button"
            accessibilityLabel="Regresar"
            style={estilos.botonRegresar}
          >
            <Text style={estilos.flechaRegresar}>‹</Text>
          </Pressable>

          <View style={estilos.textosSeccion}>
            <Text style={estilos.tituloSeccion}>
              Actividades
            </Text>

            <Text style={estilos.descripcion}>
              Consulta las actividades registradas en las atenciones veterinarias.
            </Text>
          </View>
        </View>

        {/* BÚSQUEDA */}

        <View style={estilos.contenedorBusqueda}>
          <Text style={estilos.iconoBusqueda}>⌕</Text>

          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por actividad, mascota o atención..."
            placeholderTextColor={C.secundario}
            style={estilos.inputBusqueda}
            returnKeyType="search"
          />

          {busqueda.length > 0 && (
            <Pressable
              onPress={() => setBusqueda('')}
              style={estilos.botonLimpiar}
            >
              <Text style={estilos.textoLimpiar}>×</Text>
            </Pressable>
          )}
        </View>

        {/* FILTROS */}

        <View style={estilos.contenedorFiltros}>
          {ESTADOS.map((estado) => {
            const seleccionado = filtro === estado;

            return (
              <Pressable
                key={estado}
                onPress={() => setFiltro(estado)}
                accessibilityRole="button"
                accessibilityState={{
                  selected: seleccionado,
                }}
                style={[
                  estilos.botonFiltro,
                  seleccionado &&
                    estilos.botonFiltroSeleccionado,
                ]}
              >
                <Text
                  style={[
                    estilos.textoFiltro,
                    seleccionado &&
                      estilos.textoFiltroSeleccionado,
                  ]}
                >
                  {estado === 'Pendiente'
                    ? 'Pendientes'
                    : estado === 'Completada'
                      ? 'Completadas'
                      : estado === 'No realizada'
                        ? 'No realizadas'
                        : 'Todas'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={estilos.textoResultados}>
          {actividadesFiltradas.length}{' '}
          {actividadesFiltradas.length === 1
            ? 'actividad encontrada'
            : 'actividades encontradas'}
        </Text>

        {/* CARGA */}

        {cargando ? (
          <View style={estilos.estadoVacio}>
            <ActivityIndicator
              size="large"
              color={C.verde}
            />

            <Text style={estilos.textoEstadoVacio}>
              Cargando actividades...
            </Text>
          </View>
        ) : errorCarga ? (
          <View style={estilos.estadoVacio}>
            <Text style={estilos.tituloVacio}>
              No se pudieron cargar las actividades
            </Text>

            <Pressable
              style={estilos.botonReintentar}
              onPress={() => cargarActividades()}
            >
              <Text style={estilos.textoBotonReintentar}>
                Intentar nuevamente
              </Text>
            </Pressable>
          </View>
        ) : actividadesFiltradas.length === 0 ? (
          <View style={estilos.estadoVacio}>
            <Text style={estilos.iconoVacio}>▤</Text>

            <Text style={estilos.tituloVacio}>
              {busqueda
                ? 'No se encontraron coincidencias.'
                : actividades.length === 0
                  ? 'No hay actividades registradas.'
                  : 'No hay actividades con este estado.'}
            </Text>

            <Text style={estilos.descripcionVacio}>
              {busqueda
                ? 'Prueba con otro término de búsqueda.'
                : 'Prueba con otro filtro o actualiza la información.'}
            </Text>

            <Pressable
              style={estilos.botonReintentar}
              onPress={() => (
                busqueda
                  ? setBusqueda('')
                  : cargarActividades(true)
              )}
            >
              <Text style={estilos.textoBotonReintentar}>
                {busqueda
                  ? 'Limpiar búsqueda'
                  : 'Actualizar lista'}
              </Text>
            </Pressable>
          </View>
        ) : (
          actividadesFiltradas.map((actividad) => {
            const estiloEstado = obtenerEstiloEstado(
              actividad.estado
            );

            return (
              <View
                key={String(actividad.actividad_id)}
                style={estilos.tarjetaActividad}
              >
                <View style={estilos.filaTituloTarjeta}>
                  <Text style={estilos.nombreMascota}>
                    {actividad.nombre_mascota}
                  </Text>

                  <View
                    style={[
                      estilos.etiquetaEstado,
                      {
                        backgroundColor: estiloEstado.fondo,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        estilos.textoEtiquetaEstado,
                        {
                          color: estiloEstado.texto,
                        },
                      ]}
                    >
                      {actividad.estado || 'Sin estado'}
                    </Text>
                  </View>
                </View>

                <View style={estilos.separadorTarjeta} />

                <View style={estilos.filaDetalle}>
                  <Text style={estilos.etiquetaDetalle}>
                    Tipo de actividad
                  </Text>

                  <Text style={estilos.valorDetalle}>
                    {formatearTipo(actividad.tipo)}
                  </Text>
                </View>

                <View style={estilos.filaDetalle}>
                  <Text style={estilos.etiquetaDetalle}>
                    ID de actividad
                  </Text>

                  <Text style={estilos.valorDetalle}>
                    {actividad.actividad_id}
                  </Text>
                </View>

                <View style={estilos.filaDetalle}>
                  <Text style={estilos.etiquetaDetalle}>
                    ID de atención
                  </Text>

                  <Text style={estilos.valorDetalle}>
                    {actividad.atencion_id || '—'}
                  </Text>
                </View>

                {normalizarTexto(actividad.tipo) !== 'consulta' && (
                  <View style={estilos.filaDetalle}>
                    <Text style={estilos.etiquetaDetalle}>
                      Fecha prevista
                    </Text>

                    <Text style={estilos.valorDetalle}>
                      {formatearFecha(actividad.fecha_prevista)}
                    </Text>
                  </View>
                )}

                <View style={estilos.separadorInferior} />

                <Pressable
                  onPress={() => abrirDetalleActividad(actividad)}
                  accessibilityRole="button"
                  style={estilos.botonVerDetalle}
                >
                  <Text style={estilos.textoVerDetalle}>
                    Ver detalle
                  </Text>

                  <Text style={estilos.flechaDetalle}>›</Text>
                </Pressable>
              </View>
            );
          })
        )}

        <Text style={estilos.pie}>
          PetCare · Sistema de seguimiento de atención veterinaria
        </Text>
      </ScrollView>

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

// ============================================================
// ESTILOS
// ============================================================

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  contenido: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 32,
  },
  encabezadoSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  botonRegresar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  flechaRegresar: {
    color: C.verde,
    fontSize: 27,
    lineHeight: 30,
  },
  textosSeccion: {
    flex: 1,
  },
  tituloSeccion: {
    color: C.texto,
    fontSize: 22,
    fontWeight: '800',
  },
  descripcion: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  contenedorBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 47,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 13,
  },
  iconoBusqueda: {
    color: C.secundario,
    fontSize: 24,
    marginRight: 9,
  },
  inputBusqueda: {
    flex: 1,
    color: C.texto,
    fontSize: 12,
    paddingVertical: 11,
  },
  botonLimpiar: {
    width: 27,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoLimpiar: {
    color: C.secundario,
    fontSize: 21,
  },
  contenedorFiltros: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  botonFiltro: {
    flex: 1,
    minHeight: 43,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 6,
  },
  botonFiltroSeleccionado: {
    backgroundColor: C.verde,
    borderColor: C.verde,
  },
  textoFiltro: {
    color: C.texto,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  textoFiltroSeleccionado: {
    color: C.blanco,
  },
  textoResultados: {
    color: C.secundario,
    fontSize: 11,
    marginBottom: 10,
  },
  tarjetaActividad: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    paddingHorizontal: 14,
    paddingTop: 15,
    paddingBottom: 8,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 4,
    elevation: 1,
  },
  filaTituloTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 14,
  },
  nombreMascota: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  etiquetaEstado: {
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  textoEtiquetaEstado: {
    fontSize: 10,
    fontWeight: '700',
  },
  separadorTarjeta: {
    height: 1,
    backgroundColor: C.borde,
    marginBottom: 12,
  },
  filaDetalle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  etiquetaDetalle: {
    color: C.secundario,
    fontSize: 11,
    flex: 1,
  },
  valorDetalle: {
    color: C.texto,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  separadorInferior: {
    height: 1,
    backgroundColor: C.borde,
    marginTop: 2,
    marginBottom: 6,
  },
  botonVerDetalle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 9,
    paddingHorizontal: 2,
  },
  textoVerDetalle: {
    color: C.verde,
    fontSize: 12,
    fontWeight: '800',
  },
  flechaDetalle: {
    color: C.verde,
    fontSize: 21,
    fontWeight: '700',
    marginLeft: 5,
  },
  estadoVacio: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 28,
    alignItems: 'center',
    marginTop: 2,
  },
  iconoVacio: {
    color: C.verde,
    fontSize: 29,
    marginBottom: 10,
  },
  tituloVacio: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  textoEstadoVacio: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 12,
  },
  descripcionVacio: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 17,
  },
  botonReintentar: {
    backgroundColor: C.verde,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 14,
  },
  textoBotonReintentar: {
    color: C.blanco,
    fontSize: 11,
    fontWeight: '800',
  },
  pie: {
    color: C.secundario,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 18,
  },
});
