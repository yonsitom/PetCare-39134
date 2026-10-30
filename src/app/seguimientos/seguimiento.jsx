
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { supabase } from '../../services/supabase';
import { consultarAtenciones } from '../../dao/atencionesDAO';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
const COLORES = {
  primario: '#187C72',
  fondo: '#F4F7F8',
  blanco: '#FFFFFF',
  texto: '#24323F',
  secundario: '#74818D',
  borde: '#E1E8EB',
  pendiente: '#B7791F',
  completada: '#21865B',
  noRealizada: '#C24141',
  activa: '#187C72',
};

function normalizarTexto(valor) {
  return String(valor ?? '').trim();
}

function obtenerPropietario(mascota) {
  const propietario = mascota?.propietarios;

  if (Array.isArray(propietario)) {
    return propietario[0] ?? null;
  }

  return propietario ?? null;
}

function obtenerNombrePropietario(mascota) {
  const propietario = obtenerPropietario(mascota);

  if (!propietario) {
    return 'Propietario no disponible';
  }

  return [
    propietario.nombre,
    propietario.apellido,
  ]
    .filter(Boolean)
    .join(' ') || 'Propietario no disponible';
}

function obtenerColorEstado(estado) {
  const valor = normalizarTexto(estado).toLowerCase();

  if (valor === 'completada' || valor === 'completado') {
    return COLORES.completada;
  }

  if (valor === 'no realizada' || valor === 'no realizado') {
    return COLORES.noRealizada;
  }

  if (valor === 'activa') {
    return COLORES.activa;
  }

  return COLORES.pendiente;
}

function calcularProgreso(actividades) {
  if (!actividades.length) {
    return 0;
  }

  const terminadas = actividades.filter((actividad) => {
    const estado = normalizarTexto(actividad.estado).toLowerCase();

    return (
      estado === 'completada' ||
      estado === 'completado' ||
      estado === 'no realizada' ||
      estado === 'no realizado'
    );
  }).length;

  return Math.round((terminadas / actividades.length) * 100);
}

function TarjetaIndicador({ titulo, cantidad, color }) {
  return (
    <View style={estilos.tarjetaIndicador}>
      <View style={[estilos.indicadorLinea, { backgroundColor: color }]} />
      <Text style={estilos.indicadorTitulo}>{titulo}</Text>
      <Text style={[estilos.indicadorCantidad, { color }]}>
        {cantidad}
      </Text>
    </View>
  );
}

function EtiquetaEstado({ estado }) {
  const color = obtenerColorEstado(estado);

  return (
    <View
      style={[
        estilos.etiquetaEstado,
        { backgroundColor: `${color}18` },
      ]}
    >
      <View
        style={[
          estilos.puntoEstado,
          { backgroundColor: color },
        ]}
      />
      <Text style={[estilos.textoEstado, { color }]}>
        {estado || 'Pendiente'}
      </Text>
    </View>
  );
}

export default function PantallaSeguimiento() {
  const [atenciones, setAtenciones] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setError('');

      const [listaAtenciones, respuestaActividades] = await Promise.all([
        consultarAtenciones(),
        supabase
          .from('actividades')
          .select('*')
          .eq('eliminado', false)
          .order('fecha_registro', { ascending: false }),
      ]);

      if (respuestaActividades.error) {
        throw respuestaActividades.error;
      }

      setAtenciones(listaAtenciones ?? []);
      setActividades(respuestaActividades.data ?? []);
    } catch (e) {
      console.error('Error al cargar Seguimiento:', e);
      setError(
        e.message ||
          'No se pudo cargar la información de seguimiento.'
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const actualizar = () => {
    setActualizando(true);
    cargarDatos();
  };

  const actividadesVisibles = actividades.filter(
    (actividad) => actividad.eliminado !== true
  );

  const pendientes = actividadesVisibles.filter(
    (actividad) =>
      normalizarTexto(actividad.estado).toLowerCase() === 'pendiente'
  ).length;

  const completadas = actividadesVisibles.filter(
    (actividad) =>
      normalizarTexto(actividad.estado).toLowerCase() === 'completada'
  ).length;

  const noRealizadas = actividadesVisibles.filter(
    (actividad) =>
      normalizarTexto(actividad.estado).toLowerCase() === 'no realizada'
  ).length;

  const activas = atenciones.filter(
    (atencion) =>
      normalizarTexto(atencion.estado).toLowerCase() === 'activa'
  ).length;

  function obtenerActividadesAtencion(atencionId) {
    return actividadesVisibles.filter(
      (actividad) => String(actividad.atencion_id) === String(atencionId)
    );
  }

  return (
    <SafeAreaView style={estilos.pantalla}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORES.blanco}
      />

      <EncabezadoPetCare
        titulo="Seguimiento"
        mostrarNotificaciones
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() => {}}
      />

      <ScrollView
        contentContainerStyle={estilos.contenido}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={actualizar}
            colors={[COLORES.primario]}
          />
        }
      >
        <View style={estilos.encabezadoSeccion}>
          <View style={estilos.iconoCabecera}>
            <Text style={estilos.iconoCabeceraTexto}>↗</Text>
          </View>

          <View style={estilos.encabezadoTextos}>
            <Text style={estilos.titulo}>Seguimiento de actividades</Text>
            <Text style={estilos.subtitulo}>
              Consulta el avance de las atenciones veterinarias.
            </Text>
          </View>
        </View>

        {cargando ? (
          <View style={estilos.estadoCarga}>
            <ActivityIndicator size="large" color={COLORES.primario} />
            <Text style={estilos.textoCarga}>
              Cargando información...
            </Text>
          </View>
        ) : error ? (
          <View style={estilos.tarjetaError}>
            <Text style={estilos.tituloError}>
              No se pudo cargar el seguimiento
            </Text>
            <Text style={estilos.textoError}>{error}</Text>
            <Text style={estilos.textoAyuda}>
              Verifica la conexión con Supabase y los permisos de lectura
              de las tablas atenciones y actividades.
            </Text>
          </View>
        ) : (
          <>
            <View style={estilos.resumen}>
              <TarjetaIndicador
                titulo="Atenciones activas"
                cantidad={activas}
                color={COLORES.activa}
              />
              <TarjetaIndicador
                titulo="Pendientes"
                cantidad={pendientes}
                color={COLORES.pendiente}
              />
              <TarjetaIndicador
                titulo="Completadas"
                cantidad={completadas}
                color={COLORES.completada}
              />
              <TarjetaIndicador
                titulo="No realizadas"
                cantidad={noRealizadas}
                color={COLORES.noRealizada}
              />
            </View>

            <View style={estilos.seccionLista}>
              <View style={estilos.tituloListaFila}>
                <Text style={estilos.tituloLista}>
                  Atenciones y progreso
                </Text>
                <Text style={estilos.contador}>
                  {atenciones.length} en total
                </Text>
              </View>

              {atenciones.length === 0 ? (
                <View style={estilos.vacio}>
                  <Text style={estilos.vacioIcono}>📋</Text>
                  <Text style={estilos.vacioTitulo}>
                    No hay atenciones registradas
                  </Text>
                  <Text style={estilos.vacioTexto}>
                    Cuando registres una atención, aparecerá aquí su
                    seguimiento.
                  </Text>
                </View>
              ) : (
                atenciones.map((atencion) => {
                  const mascota = Array.isArray(atencion.mascotas)
                    ? atencion.mascotas[0]
                    : atencion.mascotas;

                  const lista = obtenerActividadesAtencion(
                    atencion.atencion_id
                  );

                  const progreso = calcularProgreso(lista);

                  return (
                    <View
                      key={String(atencion.atencion_id)}
                      style={estilos.tarjetaAtencion}
                    >
                      <View style={estilos.filaMascota}>
                        <View style={estilos.avatarMascota}>
                          <Text style={estilos.avatarMascotaTexto}>
                            {normalizarTexto(mascota?.nombre)
                              .charAt(0)
                              .toUpperCase() || 'M'}
                          </Text>
                        </View>

                        <View style={estilos.datosMascota}>
                          <Text style={estilos.nombreMascota}>
                            {mascota?.nombre || 'Mascota sin nombre'}
                          </Text>
                          <Text style={estilos.detalleMascota}>
                            {mascota?.especie || 'Especie no indicada'}
                            {mascota?.raza ? ` · ${mascota.raza}` : ''}
                          </Text>
                          <Text style={estilos.detalleMascota}>
                            Historia: {mascota?.numero_historia || '—'}
                          </Text>
                          <Text style={estilos.propietario}>
                            {obtenerNombrePropietario(mascota)}
                          </Text>
                        </View>

                        <EtiquetaEstado estado={atencion.estado} />
                      </View>

                      <View style={estilos.divisor} />

                      <View style={estilos.filaProgreso}>
                        <Text style={estilos.etiquetaProgreso}>
                          Progreso de actividades
                        </Text>
                        <Text style={estilos.porcentaje}>
                          {progreso}%
                        </Text>
                      </View>

                      <View style={estilos.barraFondo}>
                        <View
                          style={[
                            estilos.barraProgreso,
                            { width: `${progreso}%` },
                          ]}
                        />
                      </View>

                      <Text style={estilos.resumenActividades}>
                        {lista.length} actividad(es) registrada(s)
                      </Text>

                      {lista.length > 0 ? (
                        <View style={estilos.listaActividades}>
                          {lista.map((actividad) => (
                            <View
                              key={String(actividad.actividad_id)}
                              style={estilos.filaActividad}
                            >
                              <View style={estilos.datosActividad}>
                                <Text style={estilos.nombreActividad}>
                                  {actividad.tipo || 'Actividad'}
                                </Text>

                                {actividad.observaciones ? (
                                  <Text style={estilos.observaciones}>
                                    {actividad.observaciones}
                                  </Text>
                                ) : null}

                                {actividad.motivo_no_realizada ? (
                                  <Text style={estilos.motivo}>
                                    Motivo: {actividad.motivo_no_realizada}
                                  </Text>
                                ) : null}
                              </View>

                              <EtiquetaEstado estado={actividad.estado} />
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={estilos.sinActividades}>
                          Esta atención todavía no tiene actividades.
                        </Text>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>

      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },
  contenido: {
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 35,
  },
  encabezadoSeccion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  iconoCabecera: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#DDF2ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconoCabeceraTexto: {
    color: COLORES.primario,
    fontSize: 25,
    fontWeight: '700',
  },
  encabezadoTextos: {
    flex: 1,
  },
  titulo: {
    color: COLORES.texto,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitulo: {
    color: COLORES.secundario,
    fontSize: 13,
    marginTop: 5,
    lineHeight: 19,
  },
  resumen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  tarjetaIndicador: {
    width: '48.5%',
    backgroundColor: COLORES.blanco,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },
  indicadorLinea: {
    width: 30,
    height: 4,
    borderRadius: 3,
    marginBottom: 12,
  },
  indicadorTitulo: {
    color: COLORES.secundario,
    fontSize: 12,
    fontWeight: '600',
  },
  indicadorCantidad: {
    fontSize: 27,
    fontWeight: '800',
    marginTop: 6,
  },
  seccionLista: {
    marginTop: 2,
  },
  tituloListaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 13,
  },
  tituloLista: {
    color: COLORES.texto,
    fontSize: 18,
    fontWeight: '800',
    flexShrink: 1,
  },
  contador: {
    color: COLORES.secundario,
    fontSize: 12,
    marginLeft: 8,
  },
  tarjetaAtencion: {
    backgroundColor: COLORES.blanco,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORES.borde,
    padding: 16,
    marginBottom: 14,
  },
  filaMascota: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarMascota: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E0F2EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  avatarMascotaTexto: {
    color: COLORES.primario,
    fontSize: 20,
    fontWeight: '800',
  },
  datosMascota: {
    flex: 1,
    marginRight: 5,
  },
  nombreMascota: {
    color: COLORES.texto,
    fontSize: 16,
    fontWeight: '800',
  },
  detalleMascota: {
    color: COLORES.secundario,
    fontSize: 12,
    marginTop: 4,
  },
  propietario: {
    color: COLORES.texto,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  etiquetaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 2,
    maxWidth: 130,
  },
  puntoEstado: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  textoEstado: {
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 1,
  },
  divisor: {
    height: 1,
    backgroundColor: COLORES.borde,
    marginVertical: 15,
  },
  filaProgreso: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  etiquetaProgreso: {
    color: COLORES.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  porcentaje: {
    color: COLORES.primario,
    fontSize: 14,
    fontWeight: '800',
  },
  barraFondo: {
    height: 8,
    backgroundColor: '#E7ECEF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  barraProgreso: {
    height: '100%',
    backgroundColor: COLORES.primario,
    borderRadius: 8,
  },
  resumenActividades: {
    color: COLORES.secundario,
    fontSize: 11,
    marginTop: 8,
  },
  listaActividades: {
    marginTop: 9,
    borderTopWidth: 1,
    borderTopColor: COLORES.borde,
  },
  filaActividad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F3',
  },
  datosActividad: {
    flex: 1,
    paddingRight: 8,
  },
  nombreActividad: {
    color: COLORES.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  observaciones: {
    color: COLORES.secundario,
    fontSize: 11,
    marginTop: 4,
  },
  motivo: {
    color: COLORES.noRealizada,
    fontSize: 11,
    marginTop: 4,
  },
  sinActividades: {
    color: COLORES.secundario,
    fontSize: 12,
    marginTop: 12,
    fontStyle: 'italic',
  },
  estadoCarga: {
    paddingVertical: 65,
    alignItems: 'center',
  },
  textoCarga: {
    color: COLORES.secundario,
    fontSize: 13,
    marginTop: 12,
  },
  tarjetaError: {
    backgroundColor: COLORES.blanco,
    borderRadius: 15,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F0CACA',
  },
  tituloError: {
    color: COLORES.noRealizada,
    fontSize: 16,
    fontWeight: '800',
  },
  textoError: {
    color: COLORES.texto,
    fontSize: 13,
    marginTop: 9,
    lineHeight: 19,
  },
  textoAyuda: {
    color: COLORES.secundario,
    fontSize: 12,
    marginTop: 9,
    lineHeight: 18,
  },
  vacio: {
    alignItems: 'center',
    backgroundColor: COLORES.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORES.borde,
    padding: 25,
  },
  vacioIcono: {
    fontSize: 32,
    marginBottom: 10,
  },
  vacioTitulo: {
    color: COLORES.texto,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  vacioTexto: {
    color: COLORES.secundario,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
  },
});
