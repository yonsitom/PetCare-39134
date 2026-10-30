
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { consultarPropietarios } from '../../dao/propietarioDAO';

const COLORES = {
  primario: '#187C72',
  texto: '#253746',
  secundario: '#64748B',
  borde: '#DCE4E8',
  fondo: '#F5F8FA',
  blanco: '#FFFFFF',
  error: '#C62828',
};

export default function ListaPropietarios({
  onSeleccionar,
  onRegistrar,
  actualizarLista = 0,
}) {
  const [propietarios, setPropietarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [mensajeError, setMensajeError] = useState('');

  // Consultar propietarios desde Supabase.
  const cargarPropietarios = useCallback(
    async (esActualizacion = false) => {
      if (esActualizacion) {
        setActualizando(true);
      } else {
        setCargando(true);
      }

      setMensajeError('');

      try {
        const resultado = await consultarPropietarios();

        setPropietarios(
          Array.isArray(resultado) ? resultado : []
        );
      } catch (error) {
        console.error('Error al consultar propietarios:', error);

        setMensajeError(
          'No se pudo consultar la información del propietario. Intente nuevamente.'
        );
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    []
  );

  // Carga inicial y actualización después de registrar.
  useEffect(() => {
    cargarPropietarios();
  }, [cargarPropietarios, actualizarLista]);

  // Filtrar por nombre, apellido, DNI, correo o teléfono.
  const propietariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    if (!termino) return propietarios;

    return propietarios.filter((propietario) =>
      [
        propietario.nombre,
        propietario.apellido,
        propietario.documento_identidad,
        propietario.correo,
        propietario.telefono,
      ].some((valor) =>
        String(valor ?? '').toLowerCase().includes(termino)
      )
    );
  }, [propietarios, busqueda]);

  // Renderizar cada propietario.
  const renderizarPropietario = ({ item }) => {
    const nombreCompleto = [
      item.nombre,
      item.apellido,
    ].filter(Boolean).join(' ');

    const iniciales = (
      `${item.nombre?.trim()?.[0] ?? ''}${item.apellido?.trim()?.[0] ?? ''}`
    ).toUpperCase() || 'PR';

    return (
      <TouchableOpacity
        style={estilos.tarjeta}
        onPress={() => onSeleccionar?.(item)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Consultar propietario ${nombreCompleto}`}
      >
        <View style={estilos.avatar}>
          <Text style={estilos.iniciales}>{iniciales}</Text>
        </View>

        <View style={estilos.datosTarjeta}>
          <Text style={estilos.nombre} numberOfLines={2}>
            {nombreCompleto || 'Propietario sin nombre'}
          </Text>

          <Text style={estilos.detalle}>
            DNI: {item.documento_identidad || 'No registrado'}
          </Text>

          <Text style={estilos.detalle}>
            {item.telefono || 'Sin celular'}
          </Text>

          <Text style={estilos.correo} numberOfLines={1}>
            {item.correo || 'Sin correo electrónico'}
          </Text>
        </View>

        <Text style={estilos.flecha}>›</Text>
      </TouchableOpacity>
    );
  };

  if (cargando) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={COLORES.primario} />
        <Text style={estilos.textoCarga}>
          Consultando propietarios...
        </Text>
      </View>
    );
  }

  if (mensajeError) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.iconoEstado}>!</Text>

        <Text style={estilos.tituloEstado}>
          No se pudo cargar la información
        </Text>

        <Text style={estilos.mensajeEstado}>
          {mensajeError}
        </Text>

        <TouchableOpacity
          style={estilos.botonReintentar}
          onPress={() => cargarPropietarios()}
          activeOpacity={0.8}
        >
          <Text style={estilos.textoBotonReintentar}>
            Intentar nuevamente
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={estilos.contenedor}>
      {/* Encabezado de la lista, fuera del FlatList. */}
      <View style={estilos.encabezadoLista}>
        <View style={estilos.encabezadoTexto}>
          <Text style={estilos.titulo}>Propietarios</Text>

          <Text style={estilos.subtitulo}>
            Consulta y administra la información de los propietarios.
          </Text>
        </View>

        <TouchableOpacity
          style={estilos.botonRegistrar}
          onPress={onRegistrar}
          activeOpacity={0.8}
        >
          <Text style={estilos.textoBotonRegistrar}>
            + Registrar
          </Text>
        </TouchableOpacity>
      </View>

      <View style={estilos.busquedaContenedor}>
        <Text style={estilos.iconoBusqueda}>⌕</Text>

        <TextInput
          style={estilos.campoBusqueda}
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar por nombre, DNI, correo o celular"
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          clearButtonMode="while-editing"
          returnKeyType="search"
          accessibilityLabel="Buscar propietarios"
        />
      </View>

      <View style={estilos.resumenLista}>
        <Text style={estilos.total}>
          {propietariosFiltrados.length}{' '}
          {propietariosFiltrados.length === 1
            ? 'propietario'
            : 'propietarios'}
        </Text>

        <TouchableOpacity
          onPress={() => cargarPropietarios(true)}
          disabled={actualizando}
          style={estilos.botonActualizar}
          activeOpacity={0.7}
        >
          {actualizando ? (
            <ActivityIndicator
              size="small"
              color={COLORES.primario}
            />
          ) : (
            <Text style={estilos.textoActualizar}>
              Actualizar
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* FlatList gestiona su propio desplazamiento vertical. */}
      <FlatList
        style={estilos.flatList}
        data={propietariosFiltrados}
        keyExtractor={(item, index) =>
          String(item.propietario_id ?? index)
        }
        renderItem={renderizarPropietario}
        contentContainerStyle={[
          estilos.lista,
          propietariosFiltrados.length === 0 &&
            estilos.listaVacia,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => cargarPropietarios(true)}
            colors={[COLORES.primario]}
            tintColor={COLORES.primario}
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={estilos.estadoVacio}>
            <Text style={estilos.iconoVacio}>♧</Text>

            <Text style={estilos.tituloEstado}>
              {busqueda.trim()
                ? 'No se encontraron resultados.'
                : 'No hay propietarios registrados.'}
            </Text>

            <Text style={estilos.mensajeEstado}>
              {busqueda.trim()
                ? 'Intente buscar con otros datos.'
                : 'Puede registrar un propietario para comenzar.'}
            </Text>

            {!busqueda.trim() && (
              <TouchableOpacity
                style={estilos.botonReintentar}
                onPress={onRegistrar}
                activeOpacity={0.8}
              >
                <Text style={estilos.textoBotonReintentar}>
                  Registrar propietario
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    minHeight: 0,
    backgroundColor: COLORES.fondo,
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  encabezadoLista: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 18,
  },
  encabezadoTexto: {
    flex: 1,
    minWidth: 0,
  },
  titulo: {
    color: COLORES.texto,
    fontSize: 23,
    fontWeight: '700',
    marginBottom: 5,
  },
  subtitulo: {
    color: COLORES.secundario,
    fontSize: 13,
    lineHeight: 19,
  },
  botonRegistrar: {
    backgroundColor: COLORES.primario,
    paddingHorizontal: 13,
    minHeight: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotonRegistrar: {
    color: COLORES.blanco,
    fontSize: 13,
    fontWeight: '700',
  },
  busquedaContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 47,
    backgroundColor: COLORES.blanco,
    borderColor: COLORES.borde,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  iconoBusqueda: {
    color: COLORES.secundario,
    fontSize: 24,
    marginRight: 8,
  },
  campoBusqueda: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORES.texto,
  },
  resumenLista: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  total: {
    color: COLORES.secundario,
    fontSize: 13,
    fontWeight: '600',
  },
  botonActualizar: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  textoActualizar: {
    color: COLORES.primario,
    fontSize: 13,
    fontWeight: '700',
  },
  flatList: {
    flex: 1,
  },
  lista: {
    paddingBottom: 35,
    flexGrow: 1,
  },
  tarjeta: {
    backgroundColor: COLORES.blanco,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 12,
    padding: 14,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E1F2EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iniciales: {
    color: COLORES.primario,
    fontWeight: '700',
    fontSize: 16,
  },
  datosTarjeta: {
    flex: 1,
    minWidth: 0,
  },
  nombre: {
    color: COLORES.texto,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 5,
  },
  detalle: {
    color: COLORES.secundario,
    fontSize: 12,
    marginTop: 3,
  },
  correo: {
    color: COLORES.texto,
    fontSize: 12,
    marginTop: 4,
  },
  flecha: {
    color: COLORES.secundario,
    fontSize: 27,
    marginLeft: 7,
  },
  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    backgroundColor: COLORES.blanco,
  },
  textoCarga: {
    marginTop: 12,
    color: COLORES.secundario,
    fontSize: 14,
  },
  iconoEstado: {
    color: COLORES.error,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
  },
  tituloEstado: {
    color: COLORES.texto,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 7,
  },
  mensajeEstado: {
    color: COLORES.secundario,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  botonReintentar: {
    backgroundColor: COLORES.primario,
    borderRadius: 8,
    paddingHorizontal: 17,
    paddingVertical: 12,
    alignItems: 'center',
  },
  textoBotonReintentar: {
    color: COLORES.blanco,
    fontSize: 13,
    fontWeight: '700',
  },
  listaVacia: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  estadoVacio: {
    alignItems: 'center',
    padding: 22,
  },
  iconoVacio: {
    color: COLORES.primario,
    fontSize: 36,
    marginBottom: 12,
  },
});
