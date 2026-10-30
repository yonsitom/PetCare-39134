
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import RegistrarPropietario from '../../components/propietarios/RegistrarPropietario';

import {
  consultarPropietarios,
  consultarMascotasPorPropietario,
} from '../../dao/propietarioDAO';
import { logger } from '../../utils/logger';

const C = {
  primario: '#187C72',
  primarioOscuro: '#12665E',
  fondo: '#F5F8F7',
  blanco: '#FFFFFF',
  texto: '#263238',
  secundario: '#64748B',
  borde: '#E1E8E6',
  suave: '#E8F4F1',
  error: '#B42318',
  errorFondo: '#FEF3F2',
  exito: '#166534',
  exitoFondo: '#E7F7ED',
};

export default function PantallaPropietarios() {
  const [propietarios, setPropietarios] = useState([]);
  const [cantidadesMascotas, setCantidadesMascotas] = useState({});
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');

  // Consulta propietarios y cuenta sus mascotas.
  const cargarPropietarios = useCallback(async () => {
    setCargando(true);
    setErrorCarga('');

    try {
      const resultado = await consultarPropietarios();
      const lista = Array.isArray(resultado) ? resultado : [];

      setPropietarios(lista);

      const cantidades = {};

      await Promise.all(
        lista.map(async (propietario) => {
          const id = propietario.propietario_id;
          if (!id) return;

          try {
            const mascotas = await consultarMascotasPorPropietario(id);
            cantidades[id] = Array.isArray(mascotas)
              ? mascotas.length
              : 0;
          } catch (error) {
            logger.error(
              `Error al consultar mascotas del propietario ${id}:`,
              error
            );
            cantidades[id] = 0;
          }
        })
      );

      setCantidadesMascotas(cantidades);
    } catch (error) {
      logger.error('Error al cargar propietarios:', error);
      setErrorCarga(
        'No se pudo cargar la lista de propietarios. Intente nuevamente.'
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarPropietarios();
  }, [cargarPropietarios]);

  // Filtra por nombre, apellido, DNI, teléfono o correo.
  const propietariosFiltrados = propietarios.filter((propietario) => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return true;

    return [
      propietario.nombre,
      propietario.apellido,
      propietario.documento_identidad,
      propietario.telefono,
      propietario.correo,
    ].some((campo) =>
      String(campo ?? '').toLowerCase().includes(texto)
    );
  });

  const obtenerIniciales = (propietario) => {
    const nombre = String(propietario.nombre ?? '').trim();
    const apellido = String(propietario.apellido ?? '').trim();

    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || 'PR';
  };

  const obtenerNombreCompleto = (propietario) =>
    [propietario.nombre, propietario.apellido]
      .filter(Boolean)
      .join(' ');

  // Abre la ficha del propietario seleccionado.
  const abrirFichaPropietario = (propietario) => {
    if (!propietario.propietario_id) return;

    router.push({
      pathname: '/propietarios/fichaPropietario',
      params: {
        propietarioId: String(propietario.propietario_id),
      },
    });
  };

  const abrirRegistro = () => {
    setMensajeExito('');
    setMostrarFormulario(true);
  };

const propietarioRegistrado = () => {
  // Cierra el formulario después de confirmar que se guardó.
  setMostrarFormulario(false);

  // Limpia el mensaje anterior y muestra uno solo de éxito.
  setMensajeExito('');
  setBusqueda('');

  // Actualiza el listado después del registro.
  cargarPropietarios();

  // Muestra la confirmación final una sola vez.
  setMensajeExito(
    'Los datos del propietario se registraron correctamente.'
  );
};

  const volverALista = () => setMostrarFormulario(false);

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar
        backgroundColor={C.primarioOscuro}
        barStyle="light-content"
      />

      <EncabezadoPetCare
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() => {}}
      />

      {/* Este ScrollView contiene tarjetas creadas con map().
          No se coloca ningún FlatList dentro de él. */}
      <ScrollView
        style={estilos.scroll}
        contentContainerStyle={estilos.contenidoScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.ruta}>
          <TouchableOpacity
            onPress={() => router.replace('/inicio')}
            accessibilityRole="button"
          >
            <Text style={estilos.textoRuta}>Inicio</Text>
          </TouchableOpacity>

          <Text style={estilos.separadorRuta}>/</Text>

          <Text style={estilos.rutaActual}>
            {mostrarFormulario ? 'Registrar propietario' : 'Propietarios'}
          </Text>
        </View>

        {mostrarFormulario ? (
          <>
            <View style={estilos.encabezadoSeccion}>
              <TouchableOpacity
                style={estilos.botonVolver}
                onPress={volverALista}
                accessibilityLabel="Volver a propietarios"
              >
                <Text style={estilos.iconoVolver}>‹</Text>
              </TouchableOpacity>

              <View style={estilos.titulos}>
                <Text style={estilos.titulo}>Registrar propietario</Text>
                <Text style={estilos.subtitulo}>
                  Complete la información del propietario.
                </Text>
              </View>
            </View>

            <View style={estilos.contenedorFormulario}>
              <RegistrarPropietario
                onCancelar={volverALista}
                onVolver={volverALista}
                onRegistrado={propietarioRegistrado}
              />
            </View>
          </>
        ) : (
          <>
            <View style={estilos.encabezadoSeccion}>
              <TouchableOpacity
                style={estilos.botonVolver}
                onPress={() => router.replace('/inicio')}
                accessibilityLabel="Volver a Inicio"
              >
                <Text style={estilos.iconoVolver}>‹</Text>
              </TouchableOpacity>

              <View style={estilos.titulos}>
                <Text style={estilos.titulo}>Propietarios</Text>
              </View>

              <TouchableOpacity
                style={estilos.botonNuevo}
                onPress={abrirRegistro}
                accessibilityRole="button"
              >
                <Text style={estilos.iconoMas}>+</Text>
                <Text style={estilos.textoBotonNuevo}>Nuevo</Text>
              </TouchableOpacity>
            </View>

            <View style={estilos.contenedorBusqueda}>
              <Text style={estilos.iconoBusqueda}>⌕</Text>

              <TextInput
                style={estilos.inputBusqueda}
                placeholder="Buscar por nombre, DNI, teléfono o correo..."
                placeholderTextColor="#94A3B8"
                value={busqueda}
                onChangeText={setBusqueda}
                autoCapitalize="none"
                returnKeyType="search"
                accessibilityLabel="Buscar propietarios"
              />

              {busqueda.length > 0 && (
                <TouchableOpacity
                  onPress={() => setBusqueda('')}
                  style={estilos.botonLimpiar}
                  accessibilityLabel="Limpiar búsqueda"
                >
                  <Text style={estilos.textoLimpiar}>×</Text>
                </TouchableOpacity>
              )}
            </View>

{mensajeExito !== '' && (
  <View style={estilos.mensajeExito}>
    <Text style={estilos.textoExito}>{mensajeExito}</Text>
    <TouchableOpacity onPress={() => setMensajeExito('')}>
      {/* Conserva aquí el contenido actual del botón para cerrar */}
    </TouchableOpacity>
  </View>
)}


            {!cargando && !errorCarga && (
              <View style={estilos.resumen}>
                <Text style={estilos.textoResumen}>
                  {busqueda.trim()
                    ? `${propietariosFiltrados.length} resultados encontrados`
                    : `${propietarios.length} ${
                        propietarios.length === 1
                          ? 'propietario registrado'
                          : 'propietarios registrados'
                      }`}
                </Text>
              </View>
            )}

            {cargando && (
              <View style={estilos.estado}>
                <ActivityIndicator size="large" color={C.primario} />
                <Text style={estilos.textoEstado}>
                  Cargando propietarios...
                </Text>
              </View>
            )}

            {!cargando && errorCarga !== '' && (
              <View style={estilos.estado}>
                <Text style={estilos.textoError}>{errorCarga}</Text>
                <TouchableOpacity
                  style={estilos.botonReintentar}
                  onPress={cargarPropietarios}
                >
                  <Text style={estilos.textoReintentar}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            )}

            {!cargando && errorCarga === '' && (
              <View style={estilos.lista}>
                {propietariosFiltrados.map((propietario) => {
                  const cantidad =
                    cantidadesMascotas[propietario.propietario_id] ?? 0;

                  return (
                    <TouchableOpacity
                      key={propietario.propietario_id}
                      style={estilos.tarjeta}
                      onPress={() => abrirFichaPropietario(propietario)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver información de ${obtenerNombreCompleto(
                        propietario
                      )}`}
                    >
                      <View style={estilos.avatar}>
                        <Text style={estilos.iniciales}>
                          {obtenerIniciales(propietario)}
                        </Text>
                      </View>

                      <View style={estilos.datosTarjeta}>
                        <Text
                          style={estilos.nombrePropietario}
                          numberOfLines={1}
                        >
                          {obtenerNombreCompleto(propietario) ||
                            'Propietario sin nombre'}
                        </Text>

                        <Text style={estilos.dato}>
                          {propietario.documento_identidad
                            ? `DNI: ${propietario.documento_identidad}`
                            : 'DNI no registrado'}
                        </Text>

                        <Text style={estilos.dato}>
                          {propietario.telefono || 'Sin teléfono registrado'}
                        </Text>

                        <Text style={estilos.dato} numberOfLines={1}>
                          {propietario.correo || 'Sin correo registrado'}
                        </Text>

                        <Text style={estilos.datoMascotas}>
                          {cantidad} {cantidad === 1 ? 'mascota' : 'mascotas'}
                        </Text>
                      </View>

                      <Text style={estilos.flechaTarjeta}>›</Text>
                    </TouchableOpacity>
                  );
                })}

                
{propietariosFiltrados.length === 0 && (
  <View style={estilos.vacio}>
    <Text style={estilos.iconoVacio}>⌕</Text>

    <Text style={estilos.tituloVacio}>
      {propietarios.length === 0 && !busqueda.trim()
        ? 'No hay propietarios registrados.'
        : 'No se encontraron propietarios'}
    </Text>

    {propietarios.length === 0 && !busqueda.trim() ? (
      <Text style={estilos.textoVacio}>
        Aún no hay propietarios registrados en el sistema.
      </Text>
    ) : (
      <>
        <Text style={estilos.textoVacio}>
          Prueba con otro nombre, DNI, teléfono o correo.
        </Text>

        {busqueda !== '' && (
          <TouchableOpacity
            style={estilos.botonReintentar}
            onPress={() => setBusqueda('')}
          >
            <Text style={estilos.textoReintentar}>
              Limpiar búsqueda
            </Text>
          </TouchableOpacity>
        )}
      </>
    )}
  </View>
)}

              </View>
            )}
          </>
        )}
      </ScrollView>

      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        nombreUsuario="Usuario"
        rolUsuario="Asistente"
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  scroll: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  contenidoScroll: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  ruta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 14,
    gap: 9,
  },
  textoRuta: {
    color: C.primario,
    fontSize: 13,
    fontWeight: '500',
  },
  separadorRuta: {
    color: '#94A3B8',
    fontSize: 13,
  },
  rutaActual: {
    color: C.secundario,
    fontSize: 13,
  },
  encabezadoSeccion: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 5,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.suave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoVolver: {
    color: C.primario,
    fontSize: 34,
    lineHeight: 38,
    marginTop: -3,
  },
  titulos: {
    flex: 1,
    minWidth: 0,
  },
  titulo: {
    color: C.texto,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitulo: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  botonNuevo: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: C.primario,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  iconoMas: {
    color: C.blanco,
    fontSize: 23,
    lineHeight: 26,
  },
  textoBotonNuevo: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '600',
  },
  contenedorBusqueda: {
    minHeight: 48,
    marginHorizontal: 20,
    marginBottom: 18,
    paddingHorizontal: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconoBusqueda: {
    color: C.secundario,
    fontSize: 27,
    marginRight: 9,
  },
  inputBusqueda: {
    flex: 1,
    minWidth: 0,
    color: C.texto,
    fontSize: 13,
    paddingVertical: 11,
  },
  botonLimpiar: {
    width: 28,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoLimpiar: {
    color: C.secundario,
    fontSize: 24,
  },
  resumen: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  textoResumen: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '600',
  },
  lista: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 12,
  },
  tarjeta: {
    width: '100%',
    minHeight: 112,
    paddingHorizontal: 14,
    paddingVertical: 15,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  avatar: {
    width: 46,
    height: 46,
    flexShrink: 0,
    borderRadius: 23,
    backgroundColor: C.suave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciales: {
    color: C.primario,
    fontSize: 14,
    fontWeight: '700',
  },
  datosTarjeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nombrePropietario: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  dato: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 17,
  },
  datoMascotas: {
    color: C.primario,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  flechaTarjeta: {
    color: '#94A3B8',
    fontSize: 30,
    fontWeight: '300',
    marginLeft: 2,
  },
  mensajeExito: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7E0B8',
    backgroundColor: C.exitoFondo,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  iconoExito: {
    color: C.exito,
    fontSize: 20,
    fontWeight: '700',
  },
  textoExito: {
    flex: 1,
    color: C.exito,
    fontSize: 12,
    lineHeight: 18,
  },
  cerrarMensaje: {
    color: C.exito,
    fontSize: 23,
    paddingHorizontal: 4,
  },
  estado: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  textoEstado: {
    color: C.secundario,
    fontSize: 13,
  },
  textoError: {
    color: C.error,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
  botonReintentar: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 9,
    backgroundColor: C.primario,
    alignItems: 'center',
  },
  textoReintentar: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '600',
  },
  vacio: {
    minHeight: 200,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 13,
    backgroundColor: C.blanco,
  },
  iconoVacio: {
    fontSize: 35,
    color: C.secundario,
    marginBottom: 10,
  },
  tituloVacio: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  textoVacio: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
  },
  contenedorFormulario: {
    width: '100%',
    paddingHorizontal: 20,
  },
});
