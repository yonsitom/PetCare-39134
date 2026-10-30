
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

import { consultarAtencionPorId } from '../dao/atencionesDAO';
import {
  consultarActividadesPorAtencion,
} from '../dao/actividadesDAO';
import EncabezadoPetCare from '../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../components/layout/MenuLateralDerecho';
import { supabase } from '../services/supabase';
import { exportarAtencionPdf } from '../services/exportarPdfServicio';
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

function fechaLegible(fecha) {
  if (!fecha) return 'No registrada';

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

function mostrarValor(valor) {
  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ''
  ) {
    return 'No registrado';
  }

  return String(valor);
}

function obtenerMascota(atencion) {
  const relacion = atencion?.mascotas;

  if (Array.isArray(relacion)) {
    return relacion[0] || null;
  }

  return relacion || null;
}

function estiloEstado(estado) {
  if (estado === 'Finalizada' || estado === 'Completada') {
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

function obtenerNombreTipo(actividad) {
  return (
    actividad?.tipos_actividad?.nombre ||
    actividad?.tipo ||
    'Actividad'
  );
}

function obtenerObservacionesActividad(actividad) {
  const observaciones = actividad?.observaciones;

  if (
    observaciones !== null &&
    observaciones !== undefined &&
    String(observaciones).trim() !== ''
  ) {
    return String(observaciones);
  }

  const detalle = actividad?.detalle;

  if (
    detalle &&
    typeof detalle === 'object' &&
    typeof detalle.observaciones === 'string' &&
    detalle.observaciones.trim() !== ''
  ) {
    return detalle.observaciones;
  }

  return null;
}

export default function DetalleAtencionScreen() {
  const parametros = useLocalSearchParams();

  const atencionId = Array.isArray(parametros.atencion_id)
    ? parametros.atencion_id[0]
    : parametros.atencion_id;

  const [atencion, setAtencion] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoActividades, setCargandoActividades] = useState(true);
  const [errorActividades, setErrorActividades] = useState('');
  const [actualizando, setActualizando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');
  const [exportando, setExportando] = useState(false);

  /*
   * Consulta la atención y sus actividades.
   *
   * MVC + DAO:
   * La pantalla solicita los datos a los DAO.
   * Las consultas a Supabase permanecen fuera de la interfaz.
   */
  const cargarDetalle = useCallback(async (actualizar = false) => {
    if (!atencionId) {
      setAtencion(null);
      setActividades([]);
      setCargando(false);
      setCargandoActividades(false);
      setActualizando(false);
      setErrorActividades(
        'No se recibió el identificador de la atención.'
      );
      return;
    }

    if (actualizar) {
      setActualizando(true);
    } else {
      setCargando(true);
      setCargandoActividades(true);
    }

    setErrorActividades('');

    try {
      const resultado = await consultarAtencionPorId(atencionId);
      setAtencion(resultado || null);

      // RF: mostrar únicamente actividades de esta atención.
      setCargandoActividades(true);

      try {
        const resultadoActividades =
          await consultarActividadesPorAtencion(atencionId);

        setActividades(
          Array.isArray(resultadoActividades)
            ? resultadoActividades
            : []
        );
        setErrorActividades('');
      } catch (error) {
        logger.error(
          'Error al consultar las actividades de la atención:',
          error
        );

        setActividades([]);
        setErrorActividades(
          error?.message ||
            'No se pudieron cargar las actividades. Intenta nuevamente.'
        );
      } finally {
        setCargandoActividades(false);
      }
    } catch (error) {
      logger.error(
        'Error al consultar el detalle de la atención:',
        error
      );

      setAtencion(null);

      Alert.alert(
        'No se pudo cargar el detalle',
        error?.message ||
          'Ocurrió un error al consultar la atención. Intenta nuevamente.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, [atencionId]);

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

  /*
   * RF07: cerrar sesión.
   * La confirmación se gestiona desde MenuLateralDerecho.
   */
  async function cerrarSesion() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setMenuAbierto(false);
      router.replace('/');
    } catch (error) {
      logger.error('Error al cerrar sesión:', error);
      throw error;
    }
  }

  /*
   * Exportar el detalle de la atención a PDF y compartirlo
   * (expo-print + expo-sharing).
   */
  async function exportarPdf() {
    setExportando(true);

    try {
      await exportarAtencionPdf({
        atencion,
        mascota: obtenerMascota(atencion),
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

  const mascota = obtenerMascota(atencion);
  const estadoAtencion = estiloEstado(atencion?.estado);

  const pendientes = actividades.filter(
    (actividad) => actividad.estado === 'Pendiente'
  ).length;

  const completadas = actividades.filter(
    (actividad) => actividad.estado === 'Completada'
  ).length;

  const noRealizadas = actividades.filter(
    (actividad) => actividad.estado === 'No realizada'
  ).length;

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
            onRefresh={() => cargarDetalle(true)}
            tintColor={C.verde}
          />
        }
      >
        <View style={estilos.migas}>
          <Pressable onPress={() => router.back()}>
            <Text style={estilos.textoMiga}>Atenciones</Text>
          </Pressable>

          <Text style={estilos.textoMiga}> / </Text>

          <Text style={estilos.migaActual}>
            Detalle de atención
          </Text>
        </View>

        <View style={estilos.encabezadoPagina}>
          <View style={estilos.tituloContenedor}>
            <Text style={estilos.titulo}>
              Detalle de atención
            </Text>

            <Text style={estilos.descripcion}>
              Consulta la información de la atención veterinaria,
              la mascota relacionada y sus actividades.
            </Text>
          </View>

          <View style={estilos.iconoPagina}>
            <Text style={estilos.iconoPaginaTexto}>▤</Text>
          </View>
        </View>

        <Pressable
          style={estilos.botonVolver}
          onPress={() => router.back()}
        >
          <Text style={estilos.textoBotonVolver}>
            ← Volver al listado
          </Text>
        </Pressable>

        {!cargando && atencion ? (
          <Pressable
            style={[
              estilos.botonPrincipal,
              exportando && { opacity: 0.6 },
            ]}
            onPress={exportarPdf}
            disabled={exportando}
          >
            <Text style={estilos.textoBotonPrincipal}>
              {exportando ? 'Generando PDF...' : 'Exportar PDF'}
            </Text>
          </Pressable>
        ) : null}

        {cargando ? (
          <View style={estilos.estadoCarga}>
            <ActivityIndicator size="large" color={C.verde} />
            <Text style={estilos.textoCarga}>
              Cargando detalle de la atención...
            </Text>
          </View>
        ) : !atencion ? (
          <View style={estilos.tarjeta}>
            <Text style={estilos.tituloTarjeta}>
              No se encontró la atención
            </Text>

            <Text style={estilos.descripcion}>
              No fue posible encontrar la atención solicitada.
              Regresa al listado y selecciona una atención registrada.
            </Text>

            <Pressable
              style={estilos.botonPrincipal}
              onPress={() => router.back()}
            >
              <Text style={estilos.textoBotonPrincipal}>
                Regresar a atenciones
              </Text>
            </Pressable>

            <Pressable
              style={estilos.botonSecundario}
              onPress={() => cargarDetalle()}
            >
              <Text style={estilos.textoBotonSecundario}>
                Intentar nuevamente
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Resumen de la atención */}
            <View style={estilos.tarjetaResumen}>
              <View style={estilos.filaResumen}>
                <View style={estilos.iconoMascota}>
                  <Text style={estilos.iconoMascotaTexto}>♧</Text>
                </View>

                <View style={estilos.datosResumen}>
                  <Text style={estilos.nombreMascota}>
                    {mostrarValor(mascota?.nombre)}
                  </Text>

                  <Text style={estilos.subtexto}>
                    Atención N.° {mostrarValor(atencion.atencion_id)}
                  </Text>

                  <Text style={estilos.subtexto}>
                    Historia clínica:{' '}
                    {mostrarValor(
                      mascota?.numero_historia ||
                        atencion.numero_historia
                    )}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  estilos.etiquetaEstado,
                  { backgroundColor: estadoAtencion.fondo },
                ]}
              >
                <Text
                  style={[
                    estilos.textoEstado,
                    { color: estadoAtencion.texto },
                  ]}
                >
                  {mostrarValor(atencion.estado)}
                </Text>
              </View>
            </View>

            {/* Información de la atención */}
            <View style={estilos.tarjeta}>
              <Text style={estilos.tituloTarjeta}>
                Información de la atención
              </Text>

              <View style={estilos.separador} />

              <FilaDato
                etiqueta="Número de atención"
                valor={atencion.atencion_id}
              />

              <FilaDato
                etiqueta="Número de historia clínica"
                valor={atencion.numero_historia}
              />

              <FilaDato
                etiqueta="Fecha y hora de inicio"
                valor={fechaLegible(atencion.fecha_inicio)}
              />

              <FilaDato
                etiqueta="Fecha y hora de finalización"
                valor={fechaLegible(atencion.fecha_fin)}
              />

              <FilaDato
                etiqueta="Estado"
                valor={atencion.estado}
              />

              <FilaDato
                etiqueta="Observaciones"
                valor={atencion.observaciones}
              />
            </View>

            {/* Información de la mascota */}
            <View style={estilos.tarjeta}>
              <Text style={estilos.tituloTarjeta}>
                Información de la mascota
              </Text>

              <View style={estilos.separador} />

              <FilaDato
                etiqueta="Nombre"
                valor={mascota?.nombre}
              />

              <FilaDato
                etiqueta="Número de historia clínica"
                valor={
                  mascota?.numero_historia ||
                  atencion.numero_historia
                }
              />

              <FilaDato
                etiqueta="Especie"
                valor={mascota?.especie}
              />

              <FilaDato
                etiqueta="Raza"
                valor={mascota?.raza}
              />
            </View>

            {/* RF: seguimiento de actividades asociadas */}
            <View style={estilos.tarjeta}>
              <View style={estilos.encabezadoActividades}>
                <View style={estilos.tituloContenedor}>
                  <Text style={estilos.tituloTarjeta}>
                    Actividades de la atención
                  </Text>

                  <Text style={estilos.descripcionActividades}>
                    Actividades registradas para esta atención veterinaria.
                  </Text>
                </View>

                <View style={estilos.contadorActividades}>
                  <Text style={estilos.contadorTexto}>
                    {actividades.length}
                  </Text>
                </View>
              </View>

              {!cargandoActividades && !errorActividades &&
                actividades.length > 0 && (
                  <View style={estilos.resumenEstados}>
                    <ResumenEstado
                      etiqueta="Pendientes"
                      cantidad={pendientes}
                      color={C.naranjaTexto}
                      fondo={C.naranja}
                    />

                    <ResumenEstado
                      etiqueta="Completadas"
                      cantidad={completadas}
                      color={C.verdeOscuro}
                      fondo={C.verdeClaro}
                    />

                    <ResumenEstado
                      etiqueta="No realizadas"
                      cantidad={noRealizadas}
                      color={C.rojoTexto}
                      fondo={C.rojo}
                    />
                  </View>
                )}

              <View style={estilos.separador} />

              {cargandoActividades ? (
                <View style={estilos.estadoActividades}>
                  <ActivityIndicator
                    size="small"
                    color={C.verde}
                  />

                  <Text style={estilos.textoCarga}>
                    Consultando actividades...
                  </Text>
                </View>
              ) : errorActividades ? (
                <View style={estilos.mensajeError}>
                  <Text style={estilos.mensajeErrorTitulo}>
                    No se pudieron cargar las actividades
                  </Text>

                  <Text style={estilos.mensajeErrorTexto}>
                    {errorActividades}
                  </Text>

                  <Pressable
                    style={estilos.botonReintentar}
                    onPress={() => cargarDetalle(true)}
                  >
                    <Text style={estilos.textoBotonReintentar}>
                      Reintentar consulta
                    </Text>
                  </Pressable>
                </View>
              ) : actividades.length === 0 ? (
                <View style={estilos.estadoVacio}>
                  <Text style={estilos.iconoVacio}>▤</Text>

                  <Text style={estilos.estadoVacioTitulo}>
                    No hay actividades registradas
                  </Text>

                  <Text style={estilos.estadoVacioTexto}>
                    Esta atención todavía no tiene actividades asociadas.
                    Las actividades registradas aparecerán aquí.
                  </Text>
                </View>
              ) : (
                actividades.map((actividad, indice) => (
                  <TarjetaActividad
                    key={String(actividad.actividad_id ?? indice)}
                    actividad={actividad}
                    ultima={indice === actividades.length - 1}
                  />
                ))
              )}
            </View>

            <View style={estilos.nota}>
              <Text style={estilos.notaTitulo}>
                Seguimiento de la atención
              </Text>

              <Text style={estilos.notaTexto}>
                Las actividades se consultan usando el identificador
                de esta atención. Los cambios realizados en Supabase
                se reflejarán al actualizar la pantalla.
              </Text>
            </View>
          </>
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

function ResumenEstado({ etiqueta, cantidad, color, fondo }) {
  return (
    <View style={[estilos.resumenEstado, { backgroundColor: fondo }]}>
      <Text style={[estilos.resumenCantidad, { color }]}>
        {cantidad}
      </Text>

      <Text style={[estilos.resumenEtiqueta, { color }]}>
        {etiqueta}
      </Text>
    </View>
  );
}

function TarjetaActividad({ actividad, ultima }) {
  const estado = estiloEstado(actividad.estado);
  const observaciones = obtenerObservacionesActividad(actividad);

  return (
    <View
      style={[
        estilos.tarjetaActividad,
        ultima && estilos.ultimaActividad,
      ]}
    >
      <View style={estilos.encabezadoActividad}>
        <View style={estilos.iconoActividad}>
          <Text style={estilos.iconoActividadTexto}>•</Text>
        </View>

        <View style={estilos.datosActividad}>
          <Text style={estilos.nombreActividad}>
            {mostrarValor(obtenerNombreTipo(actividad))}
          </Text>

          <Text style={estilos.idActividad}>
            Actividad N.° {mostrarValor(actividad.actividad_id)}
          </Text>
        </View>
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
          {mostrarValor(actividad.estado)}
        </Text>
      </View>

      <View style={estilos.detallesActividad}>
        <FilaDato
          etiqueta="Fecha prevista"
          valor={fechaLegible(actividad.fecha_prevista)}
        />

        {actividad.fecha_registro ? (
          <FilaDato
            etiqueta="Fecha de registro"
            valor={fechaLegible(actividad.fecha_registro)}
          />
        ) : null}

        {actividad.fecha_fin ? (
          <FilaDato
            etiqueta="Fecha de finalización"
            valor={fechaLegible(actividad.fecha_fin)}
          />
        ) : null}

        {observaciones ? (
          <FilaDato
            etiqueta="Observaciones"
            valor={observaciones}
          />
        ) : null}

        {actividad.estado === 'No realizada' &&
        actividad.motivo_no_realizada ? (
          <FilaDato
            etiqueta="Motivo de no realización"
            valor={actividad.motivo_no_realizada}
          />
        ) : null}
      </View>
    </View>
  );
}

function FilaDato({ etiqueta, valor }) {
  return (
    <View style={estilos.filaDato}>
      <Text style={estilos.etiquetaDato}>{etiqueta}</Text>

      <Text style={estilos.valorDato}>
        {mostrarValor(valor)}
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
    paddingBottom: 32,
  },
  migas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 22,
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
    marginBottom: 18,
  },
  tituloContenedor: {
    flex: 1,
    paddingRight: 12,
  },
  titulo: {
    color: C.texto,
    fontSize: 25,
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
  botonVolver: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginBottom: 15,
  },
  textoBotonVolver: {
    color: C.verde,
    fontSize: 14,
    fontWeight: '800',
  },
  tarjetaResumen: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 16,
    marginBottom: 15,
  },
  filaResumen: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconoMascota: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconoMascotaTexto: {
    color: C.verde,
    fontSize: 26,
  },
  datosResumen: {
    flex: 1,
  },
  nombreMascota: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
  },
  subtexto: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 5,
  },
  etiquetaEstado: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 14,
  },
  textoEstado: {
    fontSize: 12,
    fontWeight: '800',
  },
  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 16,
    marginBottom: 15,
  },
  tituloTarjeta: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
  },
  separador: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 14,
  },
  filaDato: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F0',
  },
  etiquetaDato: {
    color: C.secundario,
    fontSize: 12,
    marginBottom: 5,
  },
  valorDato: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  estadoCarga: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 28,
    alignItems: 'center',
  },
  textoCarga: {
    color: C.secundario,
    fontSize: 13,
    marginTop: 12,
  },
  botonPrincipal: {
    backgroundColor: C.verde,
    borderRadius: 11,
    alignItems: 'center',
    paddingVertical: 13,
    marginTop: 18,
  },
  textoBotonPrincipal: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },
  botonSecundario: {
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    alignItems: 'center',
    paddingVertical: 13,
    marginTop: 10,
  },
  textoBotonSecundario: {
    color: C.verde,
    fontSize: 13,
    fontWeight: '800',
  },
  encabezadoActividades: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  descripcionActividades: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  contadorActividades: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: {
    color: C.verdeOscuro,
    fontSize: 16,
    fontWeight: '800',
  },
  resumenEstados: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 15,
  },
  resumenEstado: {
    flexGrow: 1,
    flexBasis: '28%',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  resumenCantidad: {
    fontSize: 18,
    fontWeight: '800',
  },
  resumenEtiqueta: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  estadoActividades: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  estadoVacio: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 22,
  },
  iconoVacio: {
    color: C.verde,
    fontSize: 32,
    marginBottom: 8,
  },
  estadoVacioTitulo: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  estadoVacioTexto: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 7,
  },
  mensajeError: {
    backgroundColor: C.rojo,
    borderRadius: 12,
    padding: 13,
  },
  mensajeErrorTitulo: {
    color: C.rojoTexto,
    fontSize: 13,
    fontWeight: '800',
  },
  mensajeErrorTexto: {
    color: C.texto,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  botonReintentar: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: C.rojoTexto,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 12,
  },
  textoBotonReintentar: {
    color: C.rojoTexto,
    fontSize: 12,
    fontWeight: '800',
  },
  tarjetaActividad: {
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    padding: 13,
    marginBottom: 12,
  },
  ultimaActividad: {
    marginBottom: 0,
  },
  encabezadoActividad: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconoActividad: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconoActividadTexto: {
    color: C.verde,
    fontSize: 25,
    fontWeight: '800',
  },
  datosActividad: {
    flex: 1,
  },
  nombreActividad: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '800',
  },
  idActividad: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 4,
  },
  detallesActividad: {
    marginTop: 8,
  },
  nota: {
    backgroundColor: C.verdeClaro,
    borderRadius: 13,
    padding: 15,
    marginBottom: 12,
  },
  notaTitulo: {
    color: C.verdeOscuro,
    fontSize: 14,
    fontWeight: '800',
  },
  notaTexto: {
    color: C.texto,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },
  pie: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 20,
  },
});
