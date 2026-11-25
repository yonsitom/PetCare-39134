
/**
 * ============================================================
 * PETCARE - DETALLE INFORMATIVO DE ACTIVIDAD
 * RF40: Consulta de información de actividades.
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
  consultarDetalleActividadCompletoControlador,
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

function fecha(valor, hora = false) {
  if (!valor) return 'No registrada';

  const cadena = String(valor);
  const coincidencia = cadena.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!coincidencia) return cadena;

  const [, anio, mes, dia] = coincidencia;
  let resultado = `${dia}/${mes}/${anio}`;

  if (hora) {
    const encontrada = cadena.match(/T(\d{2}):(\d{2})/);
    if (encontrada) {
      resultado += ` · ${encontrada[1]}:${encontrada[2]}`;
    }
  }

  return resultado;
}

function colorEstado(estado) {
  const valor = texto(estado).toLowerCase();

  if (['completada', 'completado'].includes(valor)) {
    return C.completada;
  }

  if (['no realizada', 'no realizado'].includes(valor)) {
    return C.noRealizada;
  }

  return C.pendiente;
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
    <View style={s.dato}>
      <Text style={s.etiqueta}>{etiqueta}</Text>
      <Text style={s.valor}>{String(valor)}</Text>
    </View>
  );
}

/**
 * Muestra propiedades de objetos anidados sin modificar
 * la información recibida desde el servicio.
 */
function DatosObjeto({ titulo, datos, excluir = [] }) {
  if (!datos || typeof datos !== 'object') return null;

  const entradas = Object.entries(datos).filter(
    ([clave, valor]) =>
      !excluir.includes(clave.toLowerCase()) &&
      valor !== null &&
      valor !== undefined &&
      typeof valor !== 'object' &&
      String(valor).trim() !== ''
  );

  if (entradas.length === 0) return null;

  return (
    <View style={s.tarjeta}>
      <Text style={s.tituloSeccion}>{titulo}</Text>

      {entradas.map(([clave, valor]) => (
        <Dato
          key={clave}
          etiqueta={clave
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (letra) => letra.toUpperCase())}
          valor={valor}
        />
      ))}
    </View>
  );
}

export default function DetalleActividad() {
  const { actividadId, numeroHistoria, atencionId } =
    useLocalSearchParams();

  const [actividad, setActividad] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      if (!actividadId) {
        setError('No se recibió el identificador de la actividad.');
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        setError('');

        const resultado =
          await consultarDetalleActividadCompletoControlador(
            String(actividadId)
          );

        if (activo) setActividad(resultado);
      } catch (e) {
        if (activo) {
          setError(
            e?.message ||
            'No se pudo consultar el detalle de la actividad.'
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
  }, [actividadId]);

  const tipo =
    actividad?.tipo ||
    actividad?.tipos_actividad?.nombre ||
    actividad?.tipos_actividad?.codigo ||
    'Actividad veterinaria';

  const atencion =
    Array.isArray(actividad?.atenciones)
      ? actividad.atenciones[0]
      : actividad?.atenciones;

  const mascota =
    Array.isArray(atencion?.mascotas)
      ? atencion.mascotas[0]
      : atencion?.mascotas;

  const detalle = actividad?.detalle;

function volverDetalleAtencion() {
  if (numeroHistoria && atencionId) {
    router.replace({
      pathname: '/seguimiento/detalle',
      params: {
        numeroHistoria: String(numeroHistoria),
        atencionId: String(atencionId),
      },
    });
    return;
  }

  // Si no se recibieron los parámetros, volver al listado
  // de seguimiento en lugar de ejecutar GO_BACK sin historial.
  router.replace('/seguimientos/seguimiento');
}

  return (
    <SafeAreaView style={s.pantalla}>
      <StatusBar barStyle="dark-content" backgroundColor={C.blanco} />

      <EncabezadoPetCare
        titulo="Detalle de actividad"
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
          <Text style={s.breadcrumbActual}>Detalle de actividad</Text>
        </View>

        {/* TÍTULO Y BOTÓN VOLVER */}
        <View style={s.encabezadoTitulo}>
          <TouchableOpacity
            style={s.botonVolver}
            onPress={volverDetalleAtencion}
            activeOpacity={0.7}
          >
            <Text style={s.flechaVolver}>‹</Text>
          </TouchableOpacity>

          <View style={s.contenedorTitulo}>
            <Text style={s.tituloPagina}>
              Detalle de actividad
            </Text>

            <Text style={s.subtitulo}>
              Actividad N.º {actividad?.actividad_id || actividadId}
            </Text>
          </View>
        </View>

        {cargando ? (
          <View style={s.centrado}>
            <ActivityIndicator size="large" color={C.primario} />
            <Text style={s.secundario}>
              Consultando actividad...
            </Text>
          </View>
        ) : error ? (
          <View style={s.tarjeta}>
            <Text style={s.errorTitulo}>
              No se pudo consultar la actividad
            </Text>

            <Text style={s.secundario}>{error}</Text>

            <TouchableOpacity
              style={s.boton}
              onPress={volverDetalleAtencion}
            >
              <Text style={s.botonTexto}>Volver</Text>
            </TouchableOpacity>
          </View>
        ) : actividad ? (
          <>
            {/* INFORMACIÓN GENERAL */}
            <View style={s.tarjeta}>
              <Text style={s.tituloSeccion}>
                Información general
              </Text>

              <Dato
                etiqueta="Identificador"
                valor={actividad.actividad_id}
              />

              <Dato
                etiqueta="Tipo de actividad"
                valor={tipo}
              />

              <View style={s.dato}>
                <Text style={s.etiqueta}>Estado</Text>
                <View style={[
                  s.estado,
                  { backgroundColor: `${colorEstado(actividad.estado)}18` },
                ]}>
                  <View style={[
                    s.punto,
                    { backgroundColor: colorEstado(actividad.estado) },
                  ]} />
                  <Text style={[
                    s.estadoTexto,
                    { color: colorEstado(actividad.estado) },
                  ]}>
                    {actividad.estado || 'Pendiente'}
                  </Text>
                </View>
              </View>

              <Dato
                etiqueta="Fecha prevista"
                valor={fecha(actividad.fecha_prevista)}
              />

              <Dato
                etiqueta="Fecha de inicio"
                valor={fecha(actividad.fecha_inicio, true)}
              />

              <Dato
                etiqueta="Fecha de finalización"
                valor={fecha(actividad.fecha_fin, true)}
              />

              <Dato
                etiqueta="Observaciones"
                valor={actividad.observaciones}
              />

              <Dato
                etiqueta="Motivo de no realización"
                valor={actividad.motivo_no_realizada}
              />
            </View>

            {/* ATENCIÓN Y MASCOTA */}
            <View style={s.tarjeta}>
              <Text style={s.tituloSeccion}>
                Atención y mascota
              </Text>

              <Dato
                etiqueta="Número de atención"
                valor={actividad.atencion_id || atencionId}
              />

              <Dato
                etiqueta="Número de historia"
                valor={
                  actividad.numero_historia ||
                  mascota?.numero_historia ||
                  numeroHistoria
                }
              />

              <Dato
                etiqueta="Mascota"
                valor={mascota?.nombre}
              />

              <Dato
                etiqueta="Especie"
                valor={mascota?.especie}
              />

              <Dato
                etiqueta="Raza"
                valor={mascota?.raza}
              />
            </View>

            {/* DATOS DE CONSULTA */}
            {!!actividad.datos_consulta && (
              <View style={s.tarjeta}>
                <Text style={s.tituloSeccion}>
                  Datos específicos de consulta
                </Text>

                <Dato
                  etiqueta="Motivo de consulta"
                  valor={actividad.datos_consulta.motivo_consulta}
                />

                <Dato
                  etiqueta="Síntomas"
                  valor={actividad.datos_consulta.sintomas}
                />

                <Dato
                  etiqueta="Peso"
                  valor={actividad.datos_consulta.peso}
                />

                <Dato
                  etiqueta="Temperatura"
                  valor={actividad.datos_consulta.temperatura}
                />

                <DatosObjeto
                  titulo="Receta"
                  datos={actividad.datos_consulta.receta}
                />
              </View>
            )}

            {/* INFORMACIÓN ADICIONAL */}
            <DatosObjeto
              titulo="Información adicional registrada"
              datos={detalle}
              excluir={['perfil_id', 'usuario_id', 'responsable_id']}
            />

            <DatosObjeto
              titulo="Información de medicación"
              datos={actividad.medicamentos}
              excluir={['perfil_id', 'usuario_id', 'responsable_id']}
            />

            <DatosObjeto
              titulo="Información de vacunación"
              datos={actividad.vacunas}
              excluir={['perfil_id', 'usuario_id', 'responsable_id']}
            />

            {/* RESPONSABLE SIN IDENTIFICADOR INTERNO */}
            <DatosObjeto
              titulo="Datos del registro"
              datos={actividad.creador}
              excluir={['perfil_id', 'usuario_id', 'responsable_id']}
            />

            <View style={s.aviso}>
              <Text style={s.avisoTexto}>
                Esta pantalla es únicamente informativa. Los datos se muestran
                tal como están registrados en el sistema.
              </Text>
            </View>
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

  subtitulo: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 4,
  },

  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 15,
    marginBottom: 13,
  },

  tituloSeccion: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
  },

  dato: {
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

  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 5,
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

  secundario: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 7,
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

  aviso: {
    backgroundColor: '#E8F3F1',
    borderRadius: 12,
    padding: 13,
    marginTop: 2,
  },

  avisoTexto: {
    color: C.primario,
    fontSize: 11,
    lineHeight: 17,
  },
});
