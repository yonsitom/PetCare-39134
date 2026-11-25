
/**
 * ============================================================
 * PETCARE - DETALLE DE ATENCIÓN
 * RF20: Consulta del historial y detalle de atención.
 * RF40: Consulta de actividades de una atención.
 * ============================================================
 *
 * Vista -> Controlador -> Servicio -> DAO -> Supabase.
 */

import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import {
  consultarDetalleAtencionCompletoControlador,
} from '../../controllers/seguimiento/seguimientoDetalleControlador';

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

const C = {
  primario: '#187C72',
  fondo: '#F4F7F8',
  blanco: '#FFFFFF',
  texto: '#24323F',
  secundario: '#74818D',
  borde: '#E1E8EB',
  pendiente: '#B7791F',
  completada: '#21865B',
  noRealizada: '#C24141',
};

function texto(valor) {
  return String(valor ?? '').trim();
}

function fecha(valor, incluirHora = false) {
  if (!valor) return 'No registrada';

  const cadena = String(valor);
  const coincidencia = cadena.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!coincidencia) return cadena;

  const [, anio, mes, dia] = coincidencia;
  let resultado = `${dia}/${mes}/${anio}`;

  if (incluirHora) {
    const hora = cadena.match(/T(\d{2}):(\d{2})/);
    if (hora) resultado += ` · ${hora[1]}:${hora[2]}`;
  }

  return resultado;
}

function colorEstado(estado) {
  const valor = texto(estado).toLowerCase();

  if (
    ['completada', 'completado', 'finalizada', 'finalizado'].includes(valor)
  ) {
    return C.completada;
  }

  if (['no realizada', 'no realizado'].includes(valor)) {
    return C.noRealizada;
  }

  return C.pendiente;
}

function Estado({ valor }) {
  const color = colorEstado(valor);

  return (
    <View style={[s.estado, { backgroundColor: `${color}18` }]}>
      <View style={[s.punto, { backgroundColor: color }]} />
      <Text style={[s.estadoTexto, { color }]}>
        {valor || 'Pendiente'}
      </Text>
    </View>
  );
}

function Dato({ etiqueta, valor }) {
  if (
    valor === null ||
    valor === undefined ||
    texto(valor) === ''
  ) {
    return null;
  }

  return (
    <View style={s.filaDato}>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      <Text style={s.valor}>{String(valor)}</Text>
    </View>
  );
}

export default function DetalleAtencion() {
  const { numeroHistoria, atencionId } = useLocalSearchParams();

  const [atencion, setAtencion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      if (!numeroHistoria || !atencionId) {
        setError(
          'No se recibieron los datos necesarios para consultar la atención.'
        );
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        setError('');

        const resultado =
          await consultarDetalleAtencionCompletoControlador(
            String(numeroHistoria),
            String(atencionId)
          );

        if (activo) setAtencion(resultado);
      } catch (e) {
        if (activo) {
          setError(
            e?.message ||
            'No se pudo cargar el detalle de la atención.'
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();

    return () => {
      activo = false;
    };
  }, [numeroHistoria, atencionId]);

  const actividades = (atencion?.actividades || []).filter(
    (item) => item.eliminado !== true
  );

  const completadas = actividades.filter(
    (item) =>
      ['completada', 'completado'].includes(
        texto(item.estado).toLowerCase()
      )
  ).length;

  const noRealizadas = actividades.filter(
    (item) =>
      ['no realizada', 'no realizado'].includes(
        texto(item.estado).toLowerCase()
      )
  ).length;

  const pendientes = actividades.filter(
    (item) => texto(item.estado).toLowerCase() === 'pendiente'
  ).length;

 function volverSeguimiento() {
  router.replace('/seguimientos/seguimiento');
}

  function abrirDetalleActividad(actividad) {
    router.push({
      pathname: '/seguimiento/actividad',
      params: {
        actividadId: String(actividad.actividad_id),
        numeroHistoria: String(numeroHistoria),
        atencionId: String(atencionId),
      },
    });
  }

  const datosConsulta = actividades.find((item) => {
    const tipo = texto(
      item.tipo ||
      item.tipos_actividad?.nombre ||
      item.tipos_actividad?.codigo
    ).toLowerCase();

    return (
      tipo.includes('consulta') ||
      texto(item.tipos_actividad?.codigo).toUpperCase() === 'CONSULTA'
    );
  })?.datos_consulta;

  return (
    <SafeAreaView style={s.pantalla}>
      <StatusBar barStyle="dark-content" backgroundColor={C.blanco} />

      <EncabezadoPetCare
        titulo="Detalle de atención"
        mostrarNotificaciones
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() => {}}
      />

      <ScrollView contentContainerStyle={s.contenido}>
        {/* BREADCRUMB */}
        <View style={s.breadcrumb}>
          <Text style={s.breadcrumbTexto}>Inicio</Text>
          <Text style={s.breadcrumbSeparador}>›</Text>
          <Text style={s.breadcrumbTexto}>Seguimiento</Text>
          <Text style={s.breadcrumbSeparador}>›</Text>
          <Text style={s.breadcrumbActual}>Detalle de atención</Text>
        </View>

        {/* TÍTULO Y BOTÓN VOLVER */}
        <View style={s.encabezadoTitulo}>
          <TouchableOpacity
            style={s.botonVolver}
            onPress={volverSeguimiento}
            activeOpacity={0.7}
          >
            <Text style={s.flechaVolver}>‹</Text>
          </TouchableOpacity>

          <View style={s.contenedorTitulo}>
            <Text style={s.tituloPagina}>
              Detalle de atención
            </Text>

            <Text style={s.subtituloPagina}>
              Atención N.º {atencionId || ''}
            </Text>
          </View>
        </View>

        {cargando ? (
          <View style={s.centrado}>
            <ActivityIndicator size="large" color={C.primario} />
            <Text style={s.secundario}>
              Cargando información de la atención...
            </Text>
          </View>
        ) : error ? (
          <View style={s.tarjeta}>
            <Text style={s.errorTitulo}>
              No se pudo cargar la atención
            </Text>

            <Text style={s.errorTexto}>{error}</Text>

            <TouchableOpacity
              style={s.boton}
              onPress={volverSeguimiento}
            >
              <Text style={s.botonTexto}>Volver</Text>
            </TouchableOpacity>
          </View>
        ) : atencion ? (
          <>
            {/* INFORMACIÓN DE LA ATENCIÓN */}
            <View style={s.tarjeta}>
              <Text style={s.tituloSeccion}>
                Información de la atención
              </Text>

              <Dato
                etiqueta="Número de atención"
                valor={atencion.atencion_id}
              />

              <Dato
                etiqueta="Número de historia"
                valor={atencion.numero_historia || numeroHistoria}
              />

              <Dato
                etiqueta="Fecha de inicio"
                valor={fecha(atencion.fecha_inicio, true)}
              />

              <Dato
                etiqueta="Fecha de finalización"
                valor={fecha(atencion.fecha_fin, true)}
              />

              <View style={s.filaDato}>
                <Text style={s.etiqueta}>Estado</Text>
                <Estado valor={atencion.estado} />
              </View>

              <Dato
                etiqueta="Observaciones de la atención"
                valor={atencion.observaciones}
              />
            </View>

            {/* INFORMACIÓN DE LA CONSULTA */}
            <View style={s.tarjeta}>
              <Text style={s.tituloSeccion}>
                Información de la consulta
              </Text>

              <Dato
                etiqueta="Motivo de consulta"
                valor={
                  datosConsulta?.motivo_consulta ||
                  atencion.motivo_consulta
                }
              />

              <Dato
                etiqueta="Síntomas"
                valor={datosConsulta?.sintomas}
              />

              <Dato
                etiqueta="Peso"
                valor={
                  datosConsulta?.peso !== null &&
                  datosConsulta?.peso !== undefined
                    ? `${datosConsulta.peso}`
                    : null
                }
              />

              <Dato
                etiqueta="Temperatura"
                valor={
                  datosConsulta?.temperatura !== null &&
                  datosConsulta?.temperatura !== undefined
                    ? `${datosConsulta.temperatura}`
                    : null
                }
              />

              {!datosConsulta &&
                !atencion.motivo_consulta && (
                  <Text style={s.secundario}>
                    No se encontraron datos adicionales de consulta para esta atención.
                  </Text>
                )}
            </View>

            {/* RESUMEN DE ACTIVIDADES */}
            <Text style={s.tituloLista}>
              Resumen de actividades
            </Text>

            <View style={s.resumen}>
              <View style={s.indicador}>
                <Text
                  style={[
                    s.numeroIndicador,
                    { color: C.pendiente },
                  ]}
                >
                  {pendientes}
                </Text>

                <Text style={s.etiquetaIndicador}>
                  Pendientes
                </Text>
              </View>

              <View style={s.indicador}>
                <Text
                  style={[
                    s.numeroIndicador,
                    { color: C.completada },
                  ]}
                >
                  {completadas}
                </Text>

                <Text style={s.etiquetaIndicador}>
                  Completadas
                </Text>
              </View>

              <View style={s.indicador}>
                <Text
                  style={[
                    s.numeroIndicador,
                    { color: C.noRealizada },
                  ]}
                >
                  {noRealizadas}
                </Text>

                <Text style={s.etiquetaIndicador}>
                  No realizadas
                </Text>
              </View>
            </View>

            {/* ACTIVIDADES REGISTRADAS */}
            <View style={s.encabezadoLista}>
              <Text style={s.tituloLista}>
                Actividades registradas
              </Text>

              <Text style={s.secundario}>
                {actividades.length} registro(s)
              </Text>
            </View>

            {actividades.length === 0 ? (
              <View style={s.tarjeta}>
                <Text style={s.secundario}>
                  Esta atención no tiene actividades registradas.
                </Text>
              </View>
            ) : (
              actividades.map((actividad) => {
                const id = String(actividad.actividad_id);

                return (
                  <View key={id} style={s.tarjetaActividad}>
                    <View style={s.filaActividad}>
                      <View style={s.informacionActividad}>
                        <Text style={s.nombreActividad}>
                          {actividad.tipo ||
                            actividad.tipos_actividad?.nombre ||
                            'Actividad veterinaria'}
                        </Text>

                        <Text style={s.secundario}>
                          Actividad N.º {actividad.actividad_id}
                        </Text>
                      </View>

                      <Estado valor={actividad.estado} />
                    </View>

                    <TouchableOpacity
                      style={s.botonDetalle}
                      activeOpacity={0.8}
                      onPress={() => abrirDetalleActividad(actividad)}
                    >
                      <Text style={s.botonDetalleTexto}>
                        Ver detalle →
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        ) : null}
      </ScrollView>

      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  contenido: {
    padding: 16,
    paddingBottom: 35,
  },

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },

  breadcrumbTexto: {
    color: C.secundario,
    fontSize: 11,
    fontWeight: '600',
  },

  breadcrumbSeparador: {
    color: C.secundario,
    fontSize: 15,
    marginHorizontal: 7,
  },

  breadcrumbActual: {
    color: C.primario,
    fontSize: 11,
    fontWeight: '800',
  },

  encabezadoTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  botonVolver: {
    width: 35,
    height: 35,
    borderRadius: 10,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  flechaVolver: {
    color: C.primario,
    fontSize: 29,
    lineHeight: 32,
    fontWeight: '700',
    marginTop: -3,
  },

  contenedorTitulo: {
    flex: 1,
  },

  tituloPagina: {
    color: C.texto,
    fontSize: 21,
    fontWeight: '900',
  },

  subtituloPagina: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 4,
  },

  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 15,
    marginBottom: 14,
  },

  tituloSeccion: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 10,
  },

  filaDato: {
    marginTop: 10,
  },

  etiqueta: {
    color: C.secundario,
    fontSize: 10,
    fontWeight: '800',
  },

  valor: {
    color: C.texto,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },

  resumen: {
    flexDirection: 'row',
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    paddingVertical: 15,
    marginVertical: 12,
  },

  indicador: {
    flex: 1,
    alignItems: 'center',
  },

  numeroIndicador: {
    fontSize: 22,
    fontWeight: '900',
  },

  etiquetaIndicador: {
    color: C.secundario,
    fontSize: 10,
    marginTop: 4,
  },

  tituloLista: {
    color: C.texto,
    fontSize: 16,
    fontWeight: '900',
  },

  encabezadoLista: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  secundario: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 5,
  },

  tarjetaActividad: {
    backgroundColor: C.blanco,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 14,
    marginBottom: 11,
  },

  filaActividad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  informacionActividad: {
    flex: 1,
  },

  nombreActividad: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '900',
  },

  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
  },

  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  estadoTexto: {
    fontSize: 10,
    fontWeight: '900',
  },

  botonDetalle: {
    backgroundColor: '#E8F3F1',
    padding: 12,
    borderRadius: 9,
    alignItems: 'center',
    marginTop: 14,
  },

  botonDetalleTexto: {
    color: C.primario,
    fontSize: 12,
    fontWeight: '900',
  },

  centrado: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 35,
  },

  errorTitulo: {
    color: C.noRealizada,
    fontSize: 14,
    fontWeight: '900',
  },

  errorTexto: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 8,
  },

  boton: {
    backgroundColor: C.primario,
    padding: 12,
    borderRadius: 9,
    alignSelf: 'flex-start',
    marginTop: 12,
  },

  botonTexto: {
    color: C.blanco,
    fontSize: 12,
    fontWeight: '900',
  },
});
