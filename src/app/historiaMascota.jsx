
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import {
  buscarMascotasParaHistorial,
  consultarHistorialAtencionesPorMascota,
} from '../dao/atencionesDAO';

import EncabezadoPetCare from '../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../components/layout/MenuLateralDerecho';
import { supabase } from '../services/supabase';
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

const MENSAJE_SIN_HISTORIAL =
  'La mascota no tiene atenciones registradas.';

const MENSAJE_NO_ENCONTRADA =
  'No se encontró ninguna mascota con los datos ingresados.';

const MENSAJE_ERROR =
  'No se pudo cargar el historial de atención. Intente nuevamente.';

function obtenerPropietario(mascota) {
  const relacion = mascota?.propietarios;

  if (Array.isArray(relacion)) {
    return relacion[0] || null;
  }

  return relacion || null;
}

function nombrePropietario(mascota) {
  const propietario = obtenerPropietario(mascota);

  if (!propietario) {
    return 'No registrado';
  }

  return [
    propietario.nombre,
    propietario.apellido,
  ].filter(Boolean).join(' ') || 'No registrado';
}

function fechaLegible(fecha) {
  if (!fecha) {
    return 'No registrada';
  }

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return 'No disponible';
  }

  return valor.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function colorEstado(estado) {
  const valor = String(estado ?? '').toLowerCase();

  if (valor === 'finalizada') {
    return {
      fondo: C.verdeClaro,
      texto: C.verdeOscuro,
    };
  }

  if (valor === 'cancelada' || valor === 'no realizada') {
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

export default function HistoriaMascotaScreen() {
      const parametros = useLocalSearchParams();

  // RF20: aceptar el parámetro enviado desde la ficha de mascota.
  // Se mantiene compatibilidad con las rutas anteriores.
  const valorHistoria =
    parametros.numeroHistoria ?? parametros.numero_historia;

  const historiaParametro = Array.isArray(valorHistoria)
    ? valorHistoria[0]
    : valorHistoria;

  const nombreParametro = Array.isArray(parametros.nombre)
    ? parametros.nombre[0]
    : parametros.nombre;

  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [mascota, setMascota] = useState(null);
  const [atenciones, setAtenciones] = useState([]);

  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [actualizando, setActualizando] = useState(false);

  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');

  const cargarDatosUsuario = useCallback(async () => {
    try {
      const { data: sesionData } = await supabase.auth.getUser();
      const usuario = sesionData?.user;

      if (!usuario) {
        return;
      }

      const { data, error } = await supabase
        .from('perfiles')
        .select('nombre_completo, rol')
        .eq('perfil_id', usuario.id)
        .maybeSingle();

      if (error) {
        logger.warn(
          'No se pudieron recuperar los datos del perfil:',
          error.message
        );
        return;
      }

      setNombreUsuario(data?.nombre_completo || '');
      setRolUsuario(data?.rol || '');
    } catch (error) {
      logger.warn('No se pudo consultar el perfil del usuario:', error);
    }
  }, []);

  useEffect(() => {
    cargarDatosUsuario();
  }, [cargarDatosUsuario]);

  const consultarHistorial = useCallback(async (seleccionada) => {
    if (!seleccionada?.numero_historia) {
      setMensaje(MENSAJE_ERROR);
      setTipoMensaje('error');
      return;
    }

    setCargandoHistorial(true);
    setMensaje('');
    setTipoMensaje('');
    setAtenciones([]);

    try {
      const historial =
        await consultarHistorialAtencionesPorMascota(
          seleccionada.numero_historia
        );

      setMascota(seleccionada);
      setAtenciones(Array.isArray(historial) ? historial : []);

      if (!historial || historial.length === 0) {
        setMensaje(MENSAJE_SIN_HISTORIAL);
        setTipoMensaje('vacio');
      }
    } catch (error) {
      logger.error('RF20: Error al consultar el historial:', error);

      setMascota(seleccionada);
      setAtenciones([]);
      setMensaje(MENSAJE_ERROR);
      setTipoMensaje('error');
    } finally {
      setCargandoHistorial(false);
      setActualizando(false);
    }
  }, []);

  const buscarMascotas = useCallback(async (textoInicial) => {
    const termino = String(textoInicial ?? '').trim();

    if (!termino) {
      setResultados([]);
      setMascota(null);
      setAtenciones([]);
      setMensaje('Ingrese el nombre de la mascota o su número de historia clínica.');
      setTipoMensaje('aviso');
      return;
    }

    setCargandoBusqueda(true);
    setMensaje('');
    setTipoMensaje('');
    setResultados([]);
    setMascota(null);
    setAtenciones([]);

    try {
      const coincidencias = await buscarMascotasParaHistorial(termino);

      if (!coincidencias.length) {
        setMensaje(MENSAJE_NO_ENCONTRADA);
        setTipoMensaje('error');
        return;
      }

      setResultados(coincidencias);

      // Si existe una sola coincidencia, consultar su historial directamente.
      if (coincidencias.length === 1) {
        await consultarHistorial(coincidencias[0]);
      }
    } catch (error) {
      logger.error('RF20: Error al buscar la mascota:', error);
      setMensaje(MENSAJE_ERROR);
      setTipoMensaje('error');
    } finally {
      setCargandoBusqueda(false);
    }
  }, [consultarHistorial]);

  useEffect(() => {
    if (historiaParametro || nombreParametro) {
      const termino = historiaParametro || nombreParametro;

      setBusqueda(String(termino));
      buscarMascotas(String(termino));
    }
  }, [historiaParametro, nombreParametro, buscarMascotas]);

  const actualizarHistorial = useCallback(async () => {
    setActualizando(true);

    if (mascota) {
      await consultarHistorial(mascota);
      return;
    }

    await buscarMascotas(busqueda);
    setActualizando(false);
  }, [mascota, consultarHistorial, buscarMascotas, busqueda]);

  async function cerrarSesion() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Error al cerrar sesión:', error.message);
      return;
    }

    setMenuAbierto(false);
    router.replace('/');
  }

  function abrirDetalle(atencion) {
    if (!atencion?.atencion_id) {
      setMensaje(MENSAJE_ERROR);
      setTipoMensaje('error');
      return;
    }

    router.push({
      pathname: '/detalleAtencion',
      params: {
        atencion_id: String(atencion.atencion_id),
      },
    });
  }

  return (
    <SafeAreaView style={estilos.contenedor}>
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() => {}}
      />

      <ScrollView
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={actualizarHistorial}
            tintColor={C.verde}
          />
        }
      >
        <View style={estilos.migas}>
          <Pressable onPress={() => router.replace('/inicio')}>
            <Text style={estilos.textoMiga}>Inicio</Text>
          </Pressable>

          <Text style={estilos.textoMiga}> / </Text>

          <Text style={estilos.migaActual}>
            Historial de mascota
          </Text>
        </View>

        <Text style={estilos.titulo}>
          Historial de atención
        </Text>

        <Text style={estilos.descripcion}>
          Busca una mascota para consultar sus atenciones veterinarias
          registradas y abrir el detalle de cada una.
        </Text>

        <View style={estilos.tarjetaBusqueda}>
          <Text style={estilos.etiqueta}>
            Mascota o historia clínica
          </Text>

          <TextInput
            style={estilos.campo}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Ej. Firulais o HC00001"
            placeholderTextColor={C.secundario}
            returnKeyType="search"
            onSubmitEditing={() => buscarMascotas(busqueda)}
            accessibilityLabel="Buscar mascota por nombre o historia clínica"
          />

          <Pressable
            style={estilos.botonPrincipal}
            onPress={() => buscarMascotas(busqueda)}
            disabled={cargandoBusqueda}
            accessibilityRole="button"
          >
            {cargandoBusqueda ? (
              <ActivityIndicator color={C.blanco} />
            ) : (
              <Text style={estilos.textoBotonPrincipal}>
                Buscar historial
              </Text>
            )}
          </Pressable>
        </View>

        {cargandoHistorial && (
          <View style={estilos.estado}>
            <ActivityIndicator size="large" color={C.verde} />
            <Text style={estilos.textoEstado}>
              Consultando historial de atención...
            </Text>
          </View>
        )}

        {!!mensaje && (
          <View
            style={[
              estilos.mensaje,
              tipoMensaje === 'error' && estilos.mensajeError,
              tipoMensaje === 'vacio' && estilos.mensajeVacio,
              tipoMensaje === 'aviso' && estilos.mensajeAviso,
            ]}
          >
            <Text style={estilos.textoMensaje}>
              {mensaje}
            </Text>
          </View>
        )}

        {resultados.length > 1 && !mascota && (
          <View style={estilos.seccion}>
            <Text style={estilos.tituloSeccion}>
              Selecciona la mascota
            </Text>

            {resultados.map((item, indice) => (
              <Pressable
                key={`${item.numero_historia}-${indice}`}
                style={estilos.tarjetaMascota}
                onPress={() => consultarHistorial(item)}
                accessibilityRole="button"
              >
                <Text style={estilos.nombreMascota}>
                  {item.nombre || 'Mascota sin nombre'}
                </Text>

                <Text style={estilos.textoSecundario}>
                  Historia clínica: {item.numero_historia || 'No registrada'}
                </Text>

                <Text style={estilos.textoSecundario}>
                  {item.especie || 'Especie no registrada'}
                  {item.raza ? ` · ${item.raza}` : ''}
                </Text>

                <Text style={estilos.enlace}>
                  Consultar historial →
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {mascota && (
          <>
            <View style={estilos.tarjetaMascotaSeleccionada}>
              <Text style={estilos.etiqueta}>
                Mascota seleccionada
              </Text>

              <Text style={estilos.nombreMascotaGrande}>
                {mascota.nombre || 'Mascota sin nombre'}
              </Text>

              <Dato
                etiqueta="Historia clínica"
                valor={mascota.numero_historia}
              />

              <Dato etiqueta="Especie" valor={mascota.especie} />
              <Dato etiqueta="Raza" valor={mascota.raza} />
              <Dato etiqueta="Sexo" valor={mascota.sexo} />
              <Dato
                etiqueta="Propietario"
                valor={nombrePropietario(mascota)}
              />
            </View>

            <View style={estilos.encabezadoListado}>
              <Text style={estilos.tituloSeccion}>
                Atenciones registradas
              </Text>

              <Text style={estilos.contador}>
                {atenciones.length}
              </Text>
            </View>

            {atenciones.map((atencion) => {
              const estado = colorEstado(atencion.estado);

              return (
                <Pressable
                  key={String(atencion.atencion_id)}
                  style={estilos.tarjetaAtencion}
                  onPress={() => abrirDetalle(atencion)}
                  accessibilityRole="button"
                  accessibilityLabel={`Consultar detalle de la atención ${atencion.atencion_id}`}
                >
                  <View style={estilos.filaAtencion}>
                    <View style={estilos.datosAtencion}>
                      <Text style={estilos.nombreAtencion}>
                        Atención N.° {atencion.atencion_id}
                      </Text>

                      <Text style={estilos.textoSecundario}>
                        {fechaLegible(atencion.fecha_inicio)}
                      </Text>
                    </View>

                    <View
                      style={[
                        estilos.estadoEtiqueta,
                        { backgroundColor: estado.fondo },
                      ]}
                    >
                      <Text
                        style={[
                          estilos.estadoTexto,
                          { color: estado.texto },
                        ]}
                      >
                        {atencion.estado || 'Sin estado'}
                      </Text>
                    </View>
                  </View>

                  <View style={estilos.separador} />

                  <Dato
                    etiqueta="Fecha de finalización"
                    valor={fechaLegible(atencion.fecha_fin)}
                  />

                  <Dato
                    etiqueta="Observaciones"
                    valor={atencion.observaciones}
                  />

                  <Text style={estilos.enlace}>
                    Ver detalle y actividades →
                  </Text>
                </Pressable>
              );
            })}
          </>
        )}
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

function Dato({ etiqueta, valor }) {
  const contenido =
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ''
      ? 'No registrado'
      : String(valor);

  return (
    <View style={estilos.dato}>
      <Text style={estilos.etiquetaDato}>{etiqueta}</Text>
      <Text style={estilos.valorDato}>{contenido}</Text>
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
  titulo: {
    color: C.texto,
    fontSize: 27,
    fontWeight: '800',
  },
  descripcion: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 20,
  },
  tarjetaBusqueda: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 15,
    padding: 16,
    marginBottom: 18,
  },
  etiqueta: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  campo: {
    backgroundColor: C.blanco,
    color: C.texto,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    fontSize: 14,
  },
  botonPrincipal: {
    backgroundColor: C.verde,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  textoBotonPrincipal: {
    color: C.blanco,
    fontSize: 14,
    fontWeight: '800',
  },
  mensaje: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: C.verdeClaro,
  },
  mensajeError: {
    backgroundColor: C.rojo,
  },
  mensajeVacio: {
    backgroundColor: C.naranja,
  },
  mensajeAviso: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
  },
  textoMensaje: {
    color: C.texto,
    fontSize: 13,
    lineHeight: 20,
  },
  estado: {
    alignItems: 'center',
    padding: 22,
  },
  textoEstado: {
    color: C.secundario,
    marginTop: 10,
    fontSize: 13,
  },
  seccion: {
    marginTop: 8,
    marginBottom: 15,
  },
  tituloSeccion: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  tarjetaMascota: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 13,
    padding: 15,
    marginBottom: 10,
  },
  tarjetaMascotaSeleccionada: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
  },
  nombreMascota: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  nombreMascotaGrande: {
    color: C.verdeOscuro,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  textoSecundario: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 4,
  },
  dato: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F0',
  },
  etiquetaDato: {
    color: C.secundario,
    fontSize: 11,
    marginBottom: 4,
  },
  valorDato: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  encabezadoListado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 10,
  },
  contador: {
    backgroundColor: C.verdeClaro,
    color: C.verdeOscuro,
    overflow: 'hidden',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontWeight: '800',
  },
  tarjetaAtencion: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
  },
  filaAtencion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  datosAtencion: {
    flex: 1,
  },
  nombreAtencion: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
  },
  estadoEtiqueta: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
  },
  estadoTexto: {
    fontSize: 11,
    fontWeight: '800',
  },
  separador: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 12,
  },
  enlace: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },
});
