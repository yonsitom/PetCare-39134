import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';

import { consultarAtenciones } from '../dao/atencionesDAO';
import EncabezadoPetCare from '../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../components/layout/MenuLateralDerecho';
import { supabase } from '../services/supabase';

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

const FILTROS = [
  { etiqueta: 'Todas', valor: 'Todas' },
  { etiqueta: 'Activas', valor: 'Activa' },
  { etiqueta: 'Finalizadas', valor: 'Finalizada' },
];

function normalizar(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function fechaLegible(fecha) {
  if (!fecha) return 'No registrada';

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return 'No disponible';
  }

  return valor.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function obtenerMascota(atencion) {
  const relacion = atencion?.mascotas;

  if (Array.isArray(relacion)) {
    return relacion[0] || null;
  }

  return relacion || null;
}

function obtenerEstiloEstado(estado) {
  if (normalizar(estado) === 'finalizada') {
    return { fondo: C.verdeClaro, texto: C.verdeOscuro };
  }

  return { fondo: C.naranja, texto: C.naranjaTexto };
}

export default function AtencionesScreen() {
  const parametros = useLocalSearchParams();

  const estadoParametro = Array.isArray(parametros.estado)
    ? parametros.estado[0]
    : parametros.estado;

  const [atenciones, setAtenciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todas');
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');

  // RF: listar atenciones registradas utilizando el DAO.
  const cargarAtenciones = useCallback(async (esActualizacion = false) => {
    if (esActualizacion) {
      setActualizando(true);
    } else {
      setCargando(true);
    }

    try {
      const resultado = await consultarAtenciones();
      setAtenciones(Array.isArray(resultado) ? resultado : []);
    } catch (error) {
      console.error('Error al cargar las atenciones:', error);

      Alert.alert(
        'No se pudieron cargar las atenciones',
        error?.message || 'Intenta nuevamente.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargarAtenciones();
  }, [cargarAtenciones]);

  // El filtro recibido desde Inicio se aplica al abrir esta pantalla.
  useEffect(() => {
    const estado = normalizar(estadoParametro);

    if (estado === 'activa' || estado === 'finalizada') {
      setFiltroEstado(
        estado === 'activa' ? 'Activa' : 'Finalizada'
      );
    } else {
      setFiltroEstado('Todas');
    }
  }, [estadoParametro]);

  const atencionesFiltradas = useMemo(() => {
    const termino = normalizar(busqueda);

    return atenciones.filter((atencion) => {
      const estadoCoincide =
        filtroEstado === 'Todas' ||
        normalizar(atencion.estado) === normalizar(filtroEstado);

      const mascota = obtenerMascota(atencion);

      const textoBusqueda = normalizar([
        atencion.atencion_id,
        atencion.numero_historia,
        mascota?.nombre,
        mascota?.especie,
        mascota?.raza,
      ].filter(Boolean).join(' '));

      const busquedaCoincide =
        !termino || textoBusqueda.includes(termino);

      return estadoCoincide && busquedaCoincide;
    });
  }, [atenciones, filtroEstado, busqueda]);

  const abrirDetalle = useCallback((atencion) => {
    if (!atencion?.atencion_id) {
      Alert.alert(
        'Atención no disponible',
        'No se encontró el identificador de esta atención.'
      );
      return;
    }

    router.push({
      pathname: '/detalleAtencion',
      params: {
        atencion_id: String(atencion.atencion_id),
      },
    });
  }, []);

  async function cerrarSesion() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setMenuAbierto(false);
      router.replace('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => cargarAtenciones(true)}
            tintColor={C.verde}
          />
        }
      >
        <View style={estilos.migas}>
          <Pressable onPress={() => router.replace('/inicio')}>
            <Text style={estilos.textoMiga}>Inicio</Text>
          </Pressable>
          <Text style={estilos.textoMiga}> / </Text>
          <Text style={estilos.migaActual}>Atenciones</Text>
        </View>

        <View style={estilos.encabezadoPagina}>
          <View style={estilos.tituloContenedor}>
            <Text style={estilos.titulo}>Atenciones</Text>
            <Text style={estilos.descripcion}>
              Consulta las atenciones veterinarias y accede a sus detalles
              para revisar la información y las actividades relacionadas.
            </Text>
          </View>
          <View style={estilos.iconoPagina}>
            <Text style={estilos.iconoPaginaTexto}>▤</Text>
          </View>
        </View>

        <View style={estilos.resumen}>
          <Text style={estilos.resumenEtiqueta}>
            Atenciones encontradas
          </Text>
          <Text style={estilos.resumenNumero}>
            {atencionesFiltradas.length}
          </Text>
          <Text style={estilos.resumenDetalle}>
            {filtroEstado === 'Todas'
              ? 'Todos los estados'
              : `Estado: ${filtroEstado}`}
          </Text>
        </View>

        <Text style={estilos.etiquetaSeccion}>Buscar atención</Text>
        <TextInput
          style={estilos.campoBusqueda}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Mascota, historia clínica o número de atención"
          placeholderTextColor={C.secundario}
          accessibilityLabel="Buscar atenciones"
          returnKeyType="search"
        />

        <Text style={estilos.etiquetaSeccion}>Filtrar por estado</Text>
        <View style={estilos.filtros}>
          {FILTROS.map((filtro) => {
            const seleccionado = filtroEstado === filtro.valor;

            return (
              <Pressable
                key={filtro.valor}
                onPress={() => setFiltroEstado(filtro.valor)}
                accessibilityRole="button"
                accessibilityState={{ selected: seleccionado }}
                style={[
                  estilos.botonFiltro,
                  seleccionado && estilos.botonFiltroActivo,
                ]}
              >
                <Text
                  style={[
                    estilos.textoFiltro,
                    seleccionado && estilos.textoFiltroActivo,
                  ]}
                >
                  {filtro.etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={estilos.encabezadoListado}>
          <Text style={estilos.tituloListado}>Listado de atenciones</Text>
          <Pressable onPress={() => cargarAtenciones(true)}>
            <Text style={estilos.textoActualizar}>Actualizar</Text>
          </Pressable>
        </View>

        {cargando ? (
          <View style={estilos.estadoVacio}>
            <ActivityIndicator size="large" color={C.verde} />
            <Text style={estilos.textoEstadoVacio}>
              Cargando atenciones...
            </Text>
          </View>
        ) : atencionesFiltradas.length === 0 ? (
          <View style={estilos.estadoVacio}>
            <Text style={estilos.iconoVacio}>▤</Text>
            <Text style={estilos.tituloVacio}>
              No se encontraron atenciones
            </Text>
            <Text style={estilos.textoEstadoVacio}>
              {atenciones.length === 0
                ? 'Todavía no hay atenciones registradas o no se pudieron recuperar.'
                : 'Prueba con otro filtro o modifica el texto de búsqueda.'}
            </Text>

            <Pressable
              style={estilos.botonRestablecer}
              onPress={() => {
                setBusqueda('');
                setFiltroEstado('Todas');
              }}
            >
              <Text style={estilos.textoBotonRestablecer}>
                Mostrar todas
              </Text>
            </Pressable>
          </View>
        ) : (
          atencionesFiltradas.map((atencion) => {
            const mascota = obtenerMascota(atencion);
            const estiloEstado = obtenerEstiloEstado(atencion.estado);

            return (
              <Pressable
                key={String(atencion.atencion_id)}
                style={estilos.tarjetaAtencion}
                onPress={() => abrirDetalle(atencion)}
                accessibilityRole="button"
                accessibilityLabel={`Ver atención ${atencion.atencion_id}`}
              >
                <View style={estilos.filaTarjeta}>
                  <View style={estilos.iconoMascota}>
                    <Text style={estilos.iconoMascotaTexto}>♧</Text>
                  </View>

                  <View style={estilos.datosMascota}>
                    <Text style={estilos.nombreMascota}>
                      {mascota?.nombre || 'Mascota sin nombre'}
                    </Text>
                    <Text style={estilos.textoSecundario}>
                      Atención N.° {atencion.atencion_id}
                    </Text>
                  </View>

                  <View
                    style={[
                      estilos.etiquetaEstado,
                      { backgroundColor: estiloEstado.fondo },
                    ]}
                  >
                    <Text
                      style={[
                        estilos.textoEstado,
                        { color: estiloEstado.texto },
                      ]}
                    >
                      {atencion.estado || 'Sin estado'}
                    </Text>
                  </View>
                </View>

                <View style={estilos.separador} />

                <DatoTarjeta
                  etiqueta="Historia clínica"
                  valor={atencion.numero_historia}
                />
                <DatoTarjeta
                  etiqueta="Especie"
                  valor={mascota?.especie}
                />
                <DatoTarjeta
                  etiqueta="Fecha de inicio"
                  valor={fechaLegible(atencion.fecha_inicio)}
                />

                {!!atencion.fecha_fin && (
                  <DatoTarjeta
                    etiqueta="Fecha de finalización"
                    valor={fechaLegible(atencion.fecha_fin)}
                  />
                )}

                <View style={estilos.pieTarjeta}>
                  <Text style={estilos.textoVerDetalle}>
                    Ver detalle y actividades relacionadas
                  </Text>
                  <Text style={estilos.flecha}>›</Text>
                </View>
              </Pressable>
            );
          })
        )}

        <Text style={estilos.piePagina}>
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

function DatoTarjeta({ etiqueta, valor }) {
  return (
    <View style={estilos.datoTarjeta}>
      <Text style={estilos.etiquetaDato}>{etiqueta}</Text>
      <Text style={estilos.valorDato}>
        {valor === null || valor === undefined || String(valor).trim() === ''
          ? 'No registrado'
          : String(valor)}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  contenido: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 35,
  },
  migas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tituloContenedor: {
    flex: 1,
    paddingRight: 12,
  },
  titulo: {
    color: C.texto,
    fontSize: 27,
    fontWeight: '800',
  },
  descripcion: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  iconoPagina: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoPaginaTexto: {
    color: C.verde,
    fontSize: 25,
    fontWeight: '800',
  },
  resumen: {
    backgroundColor: C.verdeOscuro,
    borderRadius: 16,
    padding: 18,
    marginBottom: 22,
  },
  resumenEtiqueta: {
    color: C.blanco,
    fontSize: 13,
  },
  resumenNumero: {
    color: C.blanco,
    fontSize: 34,
    fontWeight: '800',
    marginTop: 5,
  },
  resumenDetalle: {
    color: '#D8EEE8',
    fontSize: 12,
    marginTop: 3,
  },
  etiquetaSeccion: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 9,
  },
  campoBusqueda: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.texto,
    fontSize: 14,
    marginBottom: 20,
  },
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  botonFiltro: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
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
  encabezadoListado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tituloListado: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
  },
  textoActualizar: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '800',
  },
  tarjetaAtencion: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 15,
    marginBottom: 13,
  },
  filaTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconoMascota: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  iconoMascotaTexto: {
    color: C.verde,
    fontSize: 24,
  },
  datosMascota: {
    flex: 1,
  },
  nombreMascota: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
  },
  textoSecundario: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 4,
  },
  etiquetaEstado: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 7,
  },
  textoEstado: {
    fontSize: 11,
    fontWeight: '800',
  },
  separador: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 13,
  },
  datoTarjeta: {
    marginBottom: 10,
  },
  etiquetaDato: {
    color: C.secundario,
    fontSize: 11,
    marginBottom: 3,
  },
  valorDato: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '600',
  },
  pieTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.borde,
    marginTop: 4,
    paddingTop: 12,
  },
  textoVerDetalle: {
    color: C.verde,
    fontSize: 12,
    fontWeight: '800',
  },
  flecha: {
    color: C.verde,
    fontSize: 25,
    fontWeight: '700',
  },
  estadoVacio: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
  },
  textoEstadoVacio: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  iconoVacio: {
    color: C.verde,
    fontSize: 32,
    marginBottom: 8,
  },
  tituloVacio: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  botonRestablecer: {
    backgroundColor: C.verde,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 16,
  },
  textoBotonRestablecer: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },
  piePagina: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 24,
  },
});