
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const C = {
  primario: '#12665E',
  primarioClaro: '#E2F2EE',
  fondo: '#F4F8F7',
  blanco: '#FFFFFF',
  texto: '#243746',
  secundario: '#718096',
  borde: '#E0EAE7',
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

  return ['inactivo', 'inactiva', 'desactivado', 'desactivada'].includes(
    estado
  )
    ? 'Inactiva'
    : 'Activa';
}

function obtenerIniciales(nombre = '') {
  return nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('') || '🐾';
}

function obtenerPropietario(mascota) {
  const propietario = mascota?.propietarios;

  if (!propietario) return 'Propietario no registrado';

  const nombre = [
    propietario.nombre,
    propietario.apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return nombre || 'Propietario no registrado';
}

function obtenerFecha(fecha) {
  if (!fecha) return 'Fecha no registrada';

  const valor = new Date(`${String(fecha).slice(0, 10)}T12:00:00`);

  if (Number.isNaN(valor.getTime())) {
    return 'Fecha no registrada';
  }

  return valor.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ListaMascotas({
  mascotas = [],
  cargando = false,
  error = '',
  onBuscar,
  onNuevaMascota,
  onSeleccionar,
  onRecargar,
}) {
  const [termino, setTermino] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('Todas');

  const mascotasFiltradas = useMemo(() => {
    if (filtroActivo === 'Todas') return mascotas;

    return mascotas.filter(
      (mascota) => obtenerEstado(mascota) === filtroActivo
    );
  }, [mascotas, filtroActivo]);

  const ejecutarBusqueda = () => {
    onBuscar?.(termino.trim());
  };

  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.migas}>Inicio  /  Mascotas</Text>

      <View style={styles.encabezadoTitulo}>
        <TouchableOpacity
          style={styles.botonVolver}
          onPress={() => onRecargar?.()}
          accessibilityLabel="Actualizar listado"
        >
          <Text style={styles.flechaVolver}>↻</Text>
        </TouchableOpacity>

        <View style={styles.bloqueTitulo}>
          <Text style={styles.titulo}>Gestión de mascotas</Text>
          <Text style={styles.descripcion}>
            Administra los registros de las mascotas de la veterinaria.
          </Text>
        </View>
      </View>

      <View style={styles.barraBusqueda}>
        <Text style={styles.iconoBusqueda}>⌕</Text>

        <TextInput
          style={styles.entradaBusqueda}
          value={termino}
          onChangeText={setTermino}
          placeholder="Buscar mascota..."
          placeholderTextColor="#8997A5"
          returnKeyType="search"
          onSubmitEditing={ejecutarBusqueda}
          accessibilityLabel="Buscar mascota por nombre, especie o raza"
        />

        {termino.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setTermino('');
              onBuscar?.('');
            }}
            accessibilityLabel="Limpiar búsqueda"
          >
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
              accessibilityRole="button"
              accessibilityState={{ selected: seleccionado }}
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
            ? 'mascota encontrada'
            : 'mascotas encontradas'}
        </Text>

        <TouchableOpacity onPress={onNuevaMascota}>
          <Text style={styles.enlaceNuevo}>+ Nueva mascota</Text>
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={styles.estadoCarga}>
          <ActivityIndicator size="large" color={C.primario} />
          <Text style={styles.textoEstado}>
            Cargando mascotas...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.estadoVacio}>
          <Text style={styles.tituloEstado}>
            No se pudo cargar la información
          </Text>
          <Text style={styles.textoEstado}>{error}</Text>

          <TouchableOpacity
            style={styles.botonReintentar}
            onPress={onRecargar}
          >
            <Text style={styles.textoBotonBuscar}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : mascotasFiltradas.length === 0 ? (
        <View style={styles.estadoVacio}>
          <Text style={styles.iconoVacio}>🐾</Text>
          <Text style={styles.tituloEstado}>
            No hay mascotas para mostrar
          </Text>
          <Text style={styles.textoEstado}>
            Prueba otra búsqueda o registra una nueva mascota.
          </Text>

          <TouchableOpacity
            style={styles.botonReintentar}
            onPress={onNuevaMascota}
          >
            <Text style={styles.textoBotonBuscar}>
              + Nueva mascota
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        mascotasFiltradas.map((mascota, indice) => {
          const estado = obtenerEstado(mascota);
          const activa = estado === 'Activa';

          return (
            <TouchableOpacity
              key={mascota.numero_historia ?? `mascota-${indice}`}
              style={styles.tarjeta}
              onPress={() => onSeleccionar?.(mascota)}
              activeOpacity={0.75}
            >
              <View style={styles.filaTarjeta}>
                <View style={styles.avatar}>
                  <Text style={styles.iniciales}>
                    {obtenerIniciales(mascota.nombre)}
                  </Text>
                </View>

                <View style={styles.datosTarjeta}>
                  <Text style={styles.nombre} numberOfLines={1}>
                    {mascota.nombre || 'Mascota sin nombre'}
                  </Text>

                  <Text style={styles.historia}>
                    Historia clínica: {mascota.numero_historia || 'No registrada'}
                  </Text>

                  <Text style={styles.detalle}>
                    {[
                      mascota.especie,
                      mascota.raza,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Especie no registrada'}
                  </Text>

                  <Text style={styles.propietario}>
                    {obtenerPropietario(mascota)}
                  </Text>
                </View>

                <View style={styles.flechaDetalle}>
                  <Text style={styles.flecha}>›</Text>
                </View>
              </View>

              <View style={styles.separador} />

              <View style={styles.pieTarjeta}>
                <View style={styles.etiquetas}>
                  <View style={styles.etiquetaTipo}>
                    <Text style={styles.textoEtiquetaTipo}>
                      {mascota.especie || 'Mascota'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.etiquetaEstado,
                      activa
                        ? styles.estadoActivo
                        : styles.estadoInactivo,
                    ]}
                  >
                    <View
                      style={[
                        styles.puntoEstado,
                        {
                          backgroundColor: activa
                            ? C.verde
                            : C.rojo,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.textoEstadoEtiqueta,
                        {
                          color: activa ? C.verde : C.rojo,
                        },
                      ]}
                    >
                      {estado}
                    </Text>
                  </View>
                </View>

                <Text style={styles.fecha}>
                  Reg. {obtenerFecha(mascota.fecha_registro)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  contenido: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  migas: {
    color: C.secundario,
    fontSize: 12,
    marginBottom: 20,
  },
  encabezadoTitulo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 22,
  },
  botonVolver: {
    width: 42,
    height: 42,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flechaVolver: {
    fontSize: 25,
    color: C.primario,
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
    marginTop: 6,
  },
  barraBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    paddingLeft: 12,
    paddingRight: 5,
    marginBottom: 14,
  },
  iconoBusqueda: {
    fontSize: 25,
    color: C.secundario,
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
    paddingHorizontal: 13,
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
    borderRadius: 11,
    padding: 5,
    marginBottom: 20,
  },
  filtro: {
    flex: 1,
    minHeight: 39,
    paddingHorizontal: 4,
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
    gap: 8,
  },
  textoResumen: {
    color: C.secundario,
    fontSize: 12,
  },
  enlaceNuevo: {
    color: C.primario,
    fontWeight: '800',
    fontSize: 12,
  },
  tarjeta: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
  },
  filaTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: C.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciales: {
    color: C.primario,
    fontSize: 16,
    fontWeight: '800',
  },
  datosTarjeta: {
    flex: 1,
    minWidth: 0,
  },
  nombre: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '800',
  },
  historia: {
    color: C.primario,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  detalle: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 5,
  },
  propietario: {
    color: C.texto,
    fontSize: 12,
    marginTop: 5,
  },
  flechaDetalle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flecha: {
    color: C.primario,
    fontSize: 29,
  },
  separador: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 13,
  },
  pieTarjeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 9,
  },
  etiquetas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 7,
  },
  etiquetaTipo: {
    backgroundColor: C.primarioClaro,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  textoEtiquetaTipo: {
    color: C.primario,
    fontSize: 11,
    fontWeight: '700',
  },
  etiquetaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },
  estadoActivo: {
    backgroundColor: C.verdeFondo,
  },
  estadoInactivo: {
    backgroundColor: C.rojoFondo,
  },
  puntoEstado: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  textoEstadoEtiqueta: {
    fontSize: 11,
    fontWeight: '700',
  },
  fecha: {
    color: C.secundario,
    fontSize: 11,
  },
  estadoCarga: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  textoEstado: {
    color: C.secundario,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  estadoVacio: {
    backgroundColor: C.blanco,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    padding: 24,
  },
  iconoVacio: {
    fontSize: 34,
  },
  tituloEstado: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
  },
  botonReintentar: {
    backgroundColor: C.primario,
    borderRadius: 9,
    paddingHorizontal: 15,
    paddingVertical: 11,
    marginTop: 15,
  },
});
