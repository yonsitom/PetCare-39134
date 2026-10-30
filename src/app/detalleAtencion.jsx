
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { supabase } from '../services/supabase';
import { exportarAtencionPdf } from '../services/exportarPdfServicio';
import { finalizarAtencionSiCorresponde } from '../dao/actividadesDAO';
import { obtenerActividadesYPorcentajeAvance } from '../services/actividadesServicio';

import EncabezadoPetCare from '../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../components/layout/MenuLateralDerecho';
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
  azul: '#2563EB',
  azulClaro: '#EAF1FF',
};

function textoSeguro(valor, alternativo = 'No registrado') {
  if (valor === null || valor === undefined || valor === '') {
    return alternativo;
  }
  return String(valor);
}

function fechaLegible(fecha) {
  if (!fecha) return 'No registrada';

  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return 'No disponible';

  return valor.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function nombreTipo(actividad) {
  return (
    actividad?.tipos_actividad?.nombre ||
    actividad?.tipo ||
    'Actividad'
  );
}

function esActividadConsulta(actividad) {
  return nombreTipo(actividad).trim().toLowerCase() === 'consulta';
}

function estadoVisible(actividad) {
  if (esActividadConsulta(actividad)) {
    return 'Completada';
  }
  return actividad?.estado || 'Pendiente';
}

function colorEstado(estado) {
  const normalizado = String(estado || '').toLowerCase();

  if (normalizado === 'completada' || normalizado === 'finalizada') {
    return { fondo: C.verdeClaro, texto: C.verdeOscuro };
  }

  if (normalizado === 'no realizada' || normalizado === 'cancelada') {
    return { fondo: C.rojo, texto: C.rojoTexto };
  }

  return { fondo: C.naranja, texto: C.naranjaTexto };
}

export default function DetalleAtencionScreen() {
  const parametros = useLocalSearchParams();

  const parametroId =
    parametros.atencion_id ??
    parametros.atencionId ??
    parametros.id;

  const atencionId = Array.isArray(parametroId)
    ? parametroId[0]
    : parametroId;

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [atencion, setAtencion] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [porcentaje, setPorcentaje] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [errorCarga, setErrorCarga] = useState('');

  const cargarDetalle = useCallback(
    async (esActualizacion = false) => {
      if (!atencionId) {
        setErrorCarga('No se recibió el ID de la atención.');
        setCargando(false);
        setActualizando(false);
        return;
      }

      if (esActualizacion) {
        setActualizando(true);
      } else {
        setCargando(true);
      }

      setErrorCarga('');

      try {
        // RF21-RF28: consultar los datos de la atención.
        const { data, error } = await supabase
          .from('atenciones')
          .select(
            'atencion_id, numero_historia, fecha_inicio, fecha_fin, estado'
          )
          .eq('atencion_id', String(atencionId))
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          setAtencion(null);
          setActividades([]);
          setRecetas([]);
          setPorcentaje(0);
          setErrorCarga('No se encontró la atención solicitada.');
          return;
        }

        setAtencion(data);

        // RF29-RF43: consultar las actividades relacionadas.
        const resultado =
          await obtenerActividadesYPorcentajeAvance(data.atencion_id);

        const lista = Array.isArray(resultado?.actividades)
          ? resultado.actividades
          : [];

        setActividades(lista);

        // Calcular el porcentaje con los estados mostrados.
        const cantidadCompletadas = lista.filter(
          (actividad) => estadoVisible(actividad) === 'Completada'
        ).length;

        setPorcentaje(
          lista.length === 0
            ? 0
            : Math.round((cantidadCompletadas / lista.length) * 100)
        );

        // Consultar recetas de las actividades de tipo Consulta.
        const consultas = lista.filter(
          (actividad) =>
            esActividadConsulta(actividad) && actividad.actividad_id
        );

        if (consultas.length > 0) {
          const idsConsulta = consultas.map(
            (actividad) => actividad.actividad_id
          );

          const { data: recetasData, error: recetasError } = await supabase
            .from('recetas')
            .select('receta_id, actividad_id')
            .in('actividad_id', idsConsulta);

          if (recetasError) {
            logger.error(
              'No se pudieron consultar las recetas:',
              recetasError
            );
            setRecetas([]);
          } else {
            setRecetas(Array.isArray(recetasData) ? recetasData : []);
          }
        } else {
          setRecetas([]);
        }
      } catch (error) {
        logger.error('Error al cargar el detalle de la atención:', error);
        setErrorCarga(
          error?.message ||
            'No se pudo cargar la información de la atención.'
        );
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [atencionId]
  );

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

  function volverAAtenciones() {
    router.replace('/atenciones');
  }

  function abrirDetalleActividad(actividad) {
    router.push({
      pathname: '/detalleActividad',
      params: {
        actividad: JSON.stringify(actividad),
        atencion_id: String(atencion?.atencion_id || ''),
        numero_historia: String(atencion?.numero_historia || ''),
      },
    });
  }

  // Navegar al formulario de registro de actividades.
  function abrirRegistroActividad() {
    router.push({
      pathname: '/registrarActividad',
      params: {
        atencion_id: String(atencion.atencion_id),
        numero_historia: String(atencion.numero_historia || ''),
      },
    });
  }

  // Registrar receta: debe existir una actividad Consulta.
  function abrirRegistroReceta() {
    const consultas = actividades.filter(
      (actividad) =>
        esActividadConsulta(actividad) && actividad.actividad_id
    );

    if (consultas.length === 0) {
      Alert.alert(
        'Consulta no disponible',
        'Para registrar una receta médica, primero debe existir una actividad de tipo Consulta en esta atención.'
      );
      return;
    }

    function seleccionarConsulta(actividad) {
      router.push({
        pathname: '/recetas/registrar',
        params: {
          actividad_id: String(actividad.actividad_id),
          atencion_id: String(atencion.atencion_id),
          numero_historia: String(atencion.numero_historia || ''),
        },
      });
    }

    if (consultas.length === 1) {
      seleccionarConsulta(consultas[0]);
      return;
    }

    Alert.alert(
      'Seleccionar consulta',
      'Elige la consulta a la que deseas asociar la receta médica.',
      consultas.map((actividad) => ({
        text: `Consulta N.° ${actividad.actividad_id}`,
        onPress: () => seleccionarConsulta(actividad),
      })).concat([
        { text: 'Cancelar', style: 'cancel' },
      ])
    );
  }

  // Registrar dieta: necesita una receta existente.
  function abrirRegistroDieta() {
    if (recetas.length === 0) {
      Alert.alert(
        'Receta no disponible',
        'Primero debes registrar una receta médica en una actividad de tipo Consulta para poder asociar una dieta.'
      );
      return;
    }

    function seleccionarReceta(receta) {
      router.push({
        pathname: '/dieta/registrar',
        params: {
          receta_id: String(receta.receta_id),
          atencion_id: String(atencion.atencion_id),
          numero_historia: String(atencion.numero_historia || ''),
        },
      });
    }

    if (recetas.length === 1) {
      seleccionarReceta(recetas[0]);
      return;
    }

    Alert.alert(
      'Seleccionar receta',
      'Elige la receta a la que deseas asociar la dieta.',
      recetas.map((receta) => ({
        text: `Receta N.° ${receta.receta_id}`,
        onPress: () => seleccionarReceta(receta),
      })).concat([
        { text: 'Cancelar', style: 'cancel' },
      ])
    );
  }

  async function ejecutarFinalizacion() {
    if (!atencion?.atencion_id || finalizando) return;

    setFinalizando(true);

    try {
      const resultado = await finalizarAtencionSiCorresponde(
        atencion.atencion_id
      );

      if (resultado?.finalizada) {
        await cargarDetalle(true);

        Alert.alert(
          'Atención finalizada',
          'Se procesó la solicitud de finalización.'
        );
      } else {
        Alert.alert(
          'No se puede finalizar',
          resultado?.pendientes > 0
            ? `Quedan ${resultado.pendientes} actividades pendientes.`
            : 'La atención no se pudo finalizar. Verifica su estado y sus actividades.'
        );

        await cargarDetalle(true);
      }
    } catch (error) {
      logger.error('Error al finalizar atención:', error);
      Alert.alert(
        'Error',
        error?.message || 'No se pudo finalizar la atención.'
      );
    } finally {
      setFinalizando(false);
    }
  }

  /*
   * Exportar el detalle de la atención a PDF y compartirlo
   * (expo-print + expo-sharing).
   */
  async function exportarPdf() {
    setExportando(true);
    try {
      const relacion = atencion?.mascotas;
      await exportarAtencionPdf({
        atencion,
        mascota: Array.isArray(relacion) ? relacion[0] : relacion,
        actividades,
      });
    } catch (error) {
      logger.error('Error al exportar el PDF de la atención:', error);
      Alert.alert(
        'No se pudo exportar',
        'Ocurrió un error al generar el PDF. Intenta nuevamente.'
      );
    } finally {
      setExportando(false);
    }
  }

  function confirmarFinalizacion() {
    Alert.alert(
      'Finalizar atención',
      '¿Deseas finalizar esta atención veterinaria?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: ejecutarFinalizacion },
      ]
    );
  }

  const pendientes = actividades.filter(
    (actividad) => estadoVisible(actividad) === 'Pendiente'
  ).length;

  const completadas = actividades.filter(
    (actividad) => estadoVisible(actividad) === 'Completada'
  ).length;

  const noRealizadas = actividades.filter(
    (actividad) => estadoVisible(actividad) === 'No realizada'
  ).length;

  if (cargando) {
    return (
      <SafeAreaView style={estilos.contenedor}>
        <EncabezadoPetCare
          titulo="PetCare"
          onAbrirMenu={() => setMenuAbierto(true)}
          onAbrirNotificaciones={() =>
            Alert.alert('Notificaciones', 'No tienes notificaciones nuevas.')
          }
        />

        <View style={estilos.centro}>
          <ActivityIndicator size="large" color={C.verde} />
          <Text style={estilos.textoCarga}>
            Cargando detalle de la atención...
          </Text>
        </View>

        <MenuLateralDerecho
          visible={menuAbierto}
          onCerrar={() => setMenuAbierto(false)}
          nombreUsuario=""
          rolUsuario=""
          onCerrarSesion={() => router.replace('/')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.contenedor}>
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() =>
          Alert.alert('Notificaciones', 'No tienes notificaciones nuevas.')
        }
      />

      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => cargarDetalle(true)}
            tintColor={C.verde}
          />
        }
      >
        {/* Ruta superior */}
        <View style={estilos.migas}>
          <Pressable onPress={volverAAtenciones}>
            <Text style={estilos.textoMiga}>Atenciones</Text>
          </Pressable>
          <Text style={estilos.textoMiga}> / </Text>
          <Text style={estilos.migaActual}>Detalle</Text>
        </View>

        {/* Encabezado de página */}
        <View style={estilos.encabezadoPagina}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver a Atenciones"
            style={estilos.botonVolver}
            onPress={volverAAtenciones}
          >
            <Text style={estilos.flechaVolver}>←</Text>
          </Pressable>

          <View style={estilos.tituloContenedor}>
            <Text style={estilos.titulo}>Detalle de atención</Text>
            <Text style={estilos.descripcion}>
              Consulta las actividades y el avance de la atención.
            </Text>
          </View>
        </View>

        {!!errorCarga && (
          <View style={estilos.tarjetaError}>
            <Text style={estilos.tituloError}>
              No se pudo cargar la información
            </Text>
            <Text style={estilos.textoError}>{errorCarga}</Text>
            <Pressable
              style={estilos.botonPrincipal}
              onPress={() => cargarDetalle()}
            >
              <Text style={estilos.textoBotonBlanco}>Reintentar</Text>
            </Pressable>
          </View>
        )}

        {atencion && (
          <>
            {/* Ficha de atención */}
            <View style={estilos.tarjetaPrincipal}>
              <Text style={estilos.etiquetaDato}>ID de atención</Text>
              <Text style={estilos.idAtencion}>
                {atencion.atencion_id}
              </Text>

              <View style={estilos.separador} />

              <View style={estilos.filaDato}>
                <Text style={estilos.etiquetaDato}>Fecha de inicio</Text>
                <Text style={estilos.valorDato}>
                  {fechaLegible(atencion.fecha_inicio)}
                </Text>
              </View>

              <View style={[estilos.filaDato, { marginBottom: 0 }]}>
                <Text style={estilos.etiquetaDato}>
                  Fecha de finalización
                </Text>
                <Text style={estilos.valorDato}>
                  {fechaLegible(atencion.fecha_fin)}
                </Text>
              </View>
            </View>

            {/* Resumen de actividades */}
            <View style={estilos.encabezadoSeccion}>
              <Text style={estilos.tituloSeccion}>
                Actividades de la atención
              </Text>
            </View>

            <View style={estilos.resumenActividades}>
              <View style={estilos.indicador}>
                <Text style={estilos.numeroPendiente}>{pendientes}</Text>
                <Text style={estilos.textoIndicador}>Pendientes</Text>
              </View>

              <View style={estilos.indicador}>
                <Text style={estilos.numeroCompletado}>{completadas}</Text>
                <Text style={estilos.textoIndicador}>Completadas</Text>
              </View>

              <View style={estilos.indicador}>
                <Text style={estilos.numeroNoRealizadas}>
                  {noRealizadas}
                </Text>
                <Text style={estilos.textoIndicador}>No realizadas</Text>
              </View>
            </View>

            {/* Barra de progreso */}
            <View style={estilos.tarjetaAvance}>
              <View style={estilos.filaAvance}>
                <View style={estilos.datosAvance}>
                  <Text style={estilos.tituloAvance}>
                    Porcentaje de avance
                  </Text>
                  <Text style={estilos.descripcionAvance}>
                    Actividades completadas de esta atención
                  </Text>
                </View>
                <Text style={estilos.porcentajeAvance}>{porcentaje}%</Text>
              </View>

              <View
                style={estilos.barraFondo}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: porcentaje }}
              >
                <View
                  style={[
                    estilos.barraValor,
                    { width: `${porcentaje}%` },
                  ]}
                />
              </View>

              <Text style={estilos.textoAvance}>
                {actividades.length === 0
                  ? 'Todavía no hay actividades registradas.'
                  : `${completadas} de ${actividades.length} actividades completadas.`}
              </Text>
            </View>

            {/* Listado de actividades */}
            {actividades.length === 0 ? (
              <View style={estilos.estadoVacio}>
                <Text style={estilos.tituloVacio}>
                  No hay actividades registradas
                </Text>
                <Text style={estilos.textoVacio}>
                  Agrega actividades para esta atención.
                </Text>
              </View>
            ) : (
              actividades.map((actividad) => {
                const estado = estadoVisible(actividad);
                const colores = colorEstado(estado);

                return (
                  <View
                    key={String(actividad.actividad_id)}
                    style={estilos.tarjetaActividad}
                  >
                    <View style={estilos.filaActividad}>
                      <View style={estilos.iconoActividad}>
                        <Text style={estilos.iconoActividadTexto}>✓</Text>
                      </View>

                      <View style={estilos.datosActividad}>
                        <Text style={estilos.nombreActividad}>
                          {nombreTipo(actividad)}
                        </Text>
                        <Text style={estilos.subtexto}>
                          Actividad N.° {actividad.actividad_id}
                        </Text>
                        <Text style={estilos.subtexto}>
                          Atención N.° {atencion.atencion_id}
                        </Text>
                        <Text style={estilos.subtexto}>
                          Fecha prevista:{' '}
                          {fechaLegible(actividad.fecha_prevista)}
                        </Text>
                      </View>

                      <View
                        style={[
                          estilos.etiquetaEstado,
                          { backgroundColor: colores.fondo },
                        ]}
                      >
                        <Text
                          style={[
                            estilos.textoEstado,
                            { color: colores.texto },
                          ]}
                        >
                          {estado}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      style={estilos.botonVerDetalle}
                      onPress={() => abrirDetalleActividad(actividad)}
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

            {/* Acciones disponibles mientras la atención está activa */}
            {atencion.estado === 'Activa' && (
              <>
                <Pressable
                  accessibilityRole="button"
                  style={estilos.botonAgregar}
                  onPress={abrirRegistroActividad}
                >
                  <Text style={estilos.textoBotonAgregar}>
                    + Agregar actividades
                  </Text>
                </Pressable>

                {/* NUEVO: botón de receta médica */}
                <Pressable
                  accessibilityRole="button"
                  style={estilos.botonReceta}
                  onPress={abrirRegistroReceta}
                >
                  <Text style={estilos.textoBotonReceta}>
                    + Agregar receta médica
                  </Text>
                </Pressable>

                {/* NUEVO: botón de dieta */}
                <Pressable
                  accessibilityRole="button"
                  style={estilos.botonDieta}
                  onPress={abrirRegistroDieta}
                >
                  <Text style={estilos.textoBotonDieta}>
                    + Agregar dieta
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    estilos.botonFinalizar,
                    finalizando && estilos.botonDeshabilitado,
                  ]}
                  disabled={finalizando}
                  onPress={confirmarFinalizacion}
                >
                  {finalizando ? (
                    <ActivityIndicator color={C.blanco} />
                  ) : (
                    <Text style={estilos.textoBotonBlanco}>
                      Finalizar atención
                    </Text>
                  )}
                </Pressable>
              </>
            )}

            {/* Exportar el detalle de la atención a PDF */}
            <Pressable
              accessibilityRole="button"
              style={[
                estilos.botonAgregar,
                exportando && estilos.botonDeshabilitado,
              ]}
              disabled={exportando}
              onPress={exportarPdf}
            >
              <Text style={estilos.textoBotonAgregar}>
                {exportando ? 'Generando PDF...' : 'Exportar PDF'}
              </Text>
            </Pressable>
          </>
        )}

        <Text style={estilos.pie}>
          PetCare · Seguimiento de atención veterinaria
        </Text>
      </ScrollView>

      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        nombreUsuario=""
        rolUsuario=""
        onCerrarSesion={() => router.replace('/')}
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
    paddingTop: 20,
    paddingBottom: 32,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  textoCarga: {
    color: C.secundario,
    fontSize: 14,
    marginTop: 13,
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
  encabezadoPagina: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  flechaVolver: {
    color: C.verde,
    fontSize: 26,
    fontWeight: '700',
  },
  tituloContenedor: {
    flex: 1,
  },
  titulo: {
    color: C.texto,
    fontSize: 24,
    fontWeight: '800',
  },
  descripcion: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  tarjetaPrincipal: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 17,
    marginBottom: 22,
  },
  idAtencion: {
    color: C.texto,
    fontSize: 23,
    fontWeight: '800',
    marginTop: 5,
  },
  separador: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 14,
  },
  filaDato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  etiquetaDato: {
    color: C.secundario,
    fontSize: 12,
    flex: 1,
  },
  valorDato: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1.4,
  },
  encabezadoSeccion: {
    marginBottom: 14,
  },
  tituloSeccion: {
    color: C.texto,
    fontSize: 18,
    fontWeight: '800',
  },
  resumenActividades: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 18,
  },
  indicador: {
    flex: 1,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  numeroPendiente: {
    color: C.naranjaTexto,
    fontSize: 22,
    fontWeight: '800',
  },
  numeroCompletado: {
    color: C.verde,
    fontSize: 22,
    fontWeight: '800',
  },
  numeroNoRealizadas: {
    color: C.rojoTexto,
    fontSize: 22,
    fontWeight: '800',
  },
  textoIndicador: {
    color: C.secundario,
    fontSize: 10,
    marginTop: 4,
  },
  tarjetaAvance: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 16,
    marginBottom: 18,
  },
  filaAvance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  datosAvance: {
    flex: 1,
    paddingRight: 10,
  },
  tituloAvance: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
  },
  descripcionAvance: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 5,
  },
  porcentajeAvance: {
    color: C.verde,
    fontSize: 25,
    fontWeight: '800',
  },
  barraFondo: {
    height: 10,
    backgroundColor: C.verdeClaro,
    borderRadius: 10,
    overflow: 'hidden',
  },
  barraValor: {
    height: '100%',
    backgroundColor: C.verde,
    borderRadius: 10,
  },
  textoAvance: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 9,
  },
  tarjetaActividad: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 14,
    marginBottom: 12,
  },
  filaActividad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconoActividad: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconoActividadTexto: {
    color: C.verde,
    fontSize: 20,
    fontWeight: '900',
  },
  datosActividad: {
    flex: 1,
  },
  nombreActividad: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '800',
  },
  subtexto: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 5,
  },
  etiquetaEstado: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 6,
  },
  textoEstado: {
    fontSize: 10,
    fontWeight: '800',
  },
  botonVerDetalle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: C.borde,
  },
  textoVerDetalle: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '800',
  },
  flechaDetalle: {
    color: C.verde,
    fontSize: 25,
    fontWeight: '700',
  },
  estadoVacio: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    padding: 24,
    marginBottom: 18,
  },
  tituloVacio: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
  },
  textoVacio: {
    color: C.secundario,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  tarjetaError: {
    backgroundColor: C.blanco,
    borderColor: C.rojo,
    borderWidth: 1,
    borderRadius: 15,
    padding: 17,
    marginBottom: 20,
  },
  tituloError: {
    color: C.rojoTexto,
    fontSize: 16,
    fontWeight: '800',
  },
  textoError: {
    color: C.texto,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  botonPrincipal: {
    backgroundColor: C.verde,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 15,
  },
  botonAgregar: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.verde,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 10,
  },
  textoBotonAgregar: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '800',
  },
  botonReceta: {
    backgroundColor: C.verde,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 10,
  },
  textoBotonReceta: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },
  botonDieta: {
    backgroundColor: C.azulClaro,
    borderWidth: 1,
    borderColor: C.azul,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 10,
  },
  textoBotonDieta: {
    color: C.azul,
    fontSize: 13,
    fontWeight: '800',
  },
  botonFinalizar: {
    backgroundColor: C.azul,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 15,
    marginTop: 10,
  },
  botonDeshabilitado: {
    opacity: 0.65,
  },
  textoBotonBlanco: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },
  pie: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 25,
  },
});
