
import React, { useMemo } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import EncabezadoPetCare from '../components/layout/EncabezadoPetCare';
import { logger } from '../utils/logger';

const C = {
  fondo: '#F4F8F7',
  verde: '#12665E',
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

function textoSeguro(valor, alternativo = 'No registrado') {
  if (valor === null || valor === undefined || valor === '') {
    return alternativo;
  }

  if (typeof valor === 'object') {
    return JSON.stringify(valor);
  }

  return String(valor);
}

function fechaLegible(fecha) {
  if (!fecha) return 'No registrada';

  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return String(fecha);

  return valor.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function etiquetaCampo(clave) {
  return String(clave)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letra) => letra.toUpperCase());
}

function colorEstado(estado) {
  const valor = String(estado || '').toLowerCase();

  if (valor === 'completada' || valor === 'finalizada') {
    return { fondo: C.verdeClaro, texto: C.verde };
  }

  if (valor === 'no realizada' || valor === 'cancelada') {
    return { fondo: C.rojo, texto: C.rojoTexto };
  }

  return { fondo: C.naranja, texto: C.naranjaTexto };
}

function aplanarDetalle(objeto, prefijo = '') {
  if (!objeto || typeof objeto !== 'object' || Array.isArray(objeto)) {
    return [];
  }

  const filas = [];

  Object.entries(objeto).forEach(([clave, valor]) => {
    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
      return;
    }

    const claveCompleta = prefijo
      ? `${prefijo} · ${etiquetaCampo(clave)}`
      : etiquetaCampo(clave);

    if (
      typeof valor === 'object' &&
      !Array.isArray(valor)
    ) {
      filas.push(...aplanarDetalle(valor, claveCompleta));
    } else if (Array.isArray(valor)) {
      filas.push({
        etiqueta: claveCompleta,
        valor: valor.map((item) => textoSeguro(item)).join(', '),
      });
    } else {
      filas.push({
        etiqueta: claveCompleta,
        valor: String(valor),
      });
    }
  });

  return filas;
}

export default function DetalleActividadScreen() {
  const parametros = useLocalSearchParams();

  const actividad = useMemo(() => {
    const valor = Array.isArray(parametros.actividad)
      ? parametros.actividad[0]
      : parametros.actividad;

    if (!valor) return null;

    try {
      return JSON.parse(valor);
    } catch (error) {
      logger.error('No se pudo interpretar la actividad:', error);
      return null;
    }
  }, [parametros.actividad]);

  const atencionId = Array.isArray(parametros.atencion_id)
    ? parametros.atencion_id[0]
    : parametros.atencion_id;

  const numeroHistoria = Array.isArray(parametros.numero_historia)
    ? parametros.numero_historia[0]
    : parametros.numero_historia;

  const estado = actividad?.estado || 'Pendiente';
  const colores = colorEstado(estado);
  const tipo =
    actividad?.tipos_actividad?.nombre ||
    actividad?.tipo ||
    'Actividad';

  const datosDetalle = aplanarDetalle(actividad?.detalle);

  const camposBase = [
    { etiqueta: 'ID de actividad', valor: actividad?.actividad_id },
    { etiqueta: 'Tipo de actividad', valor: tipo },
    { etiqueta: 'ID de atención', valor: actividad?.atencion_id || atencionId },
    { etiqueta: 'Historia clínica', valor: numeroHistoria },
    { etiqueta: 'Estado registrado', valor: estado },
    { etiqueta: 'Fecha prevista', valor: fechaLegible(actividad?.fecha_prevista) },
    { etiqueta: 'Fecha de inicio', valor: fechaLegible(actividad?.fecha_inicio) },
    { etiqueta: 'Fecha de finalización', valor: fechaLegible(actividad?.fecha_fin) },
    { etiqueta: 'Motivo de no realización', valor: actividad?.motivo_no_realizada },
    { etiqueta: 'Observaciones', valor: actividad?.observaciones },
  ];

  return (
    <SafeAreaView style={estilos.contenedor}>
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={() => router.back()}
        onAbrirNotificaciones={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.migas}>
          <Pressable onPress={() => router.back()}>
            <Text style={estilos.textoMiga}>Detalle de atención</Text>
          </Pressable>
          <Text style={estilos.textoMiga}> / </Text>
          <Text style={estilos.migaActual}>Detalle de actividad</Text>
        </View>

        <View style={estilos.encabezado}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver a la atención"
            style={estilos.botonVolver}
            onPress={() => router.back()}
          >
            <Text style={estilos.flechaVolver}>←</Text>
          </Pressable>

          <View style={estilos.titulos}>
            <Text style={estilos.titulo}>Detalle de actividad</Text>
            <Text style={estilos.descripcion}>
              Información registrada para esta actividad.
            </Text>
          </View>
        </View>

        {!actividad ? (
          <View style={estilos.tarjeta}>
            <Text style={estilos.tituloTarjeta}>
              No se recibió la actividad
            </Text>
            <Text style={estilos.textoNormal}>
              Regresa a la atención y vuelve a seleccionar la actividad.
            </Text>
            <Pressable
              style={estilos.botonPrincipal}
              onPress={() => router.back()}
            >
              <Text style={estilos.textoBoton}>Volver</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={estilos.tarjeta}>
              <View style={estilos.filaTitulo}>
                <View style={estilos.icono}>
                  <Text style={estilos.iconoTexto}>✓</Text>
                </View>

                <View style={estilos.titulos}>
                  <Text style={estilos.tituloActividad}>{tipo}</Text>
                  <Text style={estilos.subtexto}>
                    Actividad N.° {textoSeguro(actividad.actividad_id)}
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
            </View>

            <View style={estilos.tarjeta}>
              <Text style={estilos.tituloTarjeta}>Datos de la actividad</Text>

              {camposBase.map((campo) => (
                <View key={campo.etiqueta} style={estilos.filaDato}>
                  <Text style={estilos.etiquetaDato}>
                    {campo.etiqueta}
                  </Text>
                  <Text style={estilos.valorDato}>
                    {textoSeguro(campo.valor)}
                  </Text>
                </View>
              ))}
            </View>

            {datosDetalle.length > 0 && (
              <View style={estilos.tarjeta}>
                <Text style={estilos.tituloTarjeta}>
                  Datos clínicos registrados
                </Text>

                {datosDetalle.map((dato, indice) => (
                  <View
                    key={`${dato.etiqueta}-${indice}`}
                    style={estilos.filaDato}
                  >
                    <Text style={estilos.etiquetaDato}>
                      {dato.etiqueta}
                    </Text>
                    <Text style={estilos.valorDato}>
                      {dato.valor}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={estilos.aviso}>
              <Text style={estilos.textoAviso}>
                Solo se pueden mostrar los datos que la aplicación haya recuperado
                para esta actividad. Si algún dato clínico está almacenado en una
                tabla relacionada, será necesario incorporarlo a la consulta del
                servicio de actividades.
              </Text>
            </View>
          </>
        )}

        <Text style={estilos.pie}>
          PetCare · Seguimiento de atención veterinaria
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.fondo },
  contenido: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  migas: { flexDirection: 'row', marginBottom: 20, flexWrap: 'wrap' },
  textoMiga: { color: C.secundario, fontSize: 12 },
  migaActual: { color: C.verde, fontSize: 12, fontWeight: '700' },
  encabezado: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
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
  flechaVolver: { color: C.verde, fontSize: 26, fontWeight: '700' },
  titulos: { flex: 1 },
  titulo: { color: C.texto, fontSize: 23, fontWeight: '800' },
  descripcion: { color: C.secundario, fontSize: 13, lineHeight: 19, marginTop: 5 },
  tarjeta: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 15,
    padding: 16,
    marginBottom: 15,
  },
  filaTitulo: { flexDirection: 'row', alignItems: 'center' },
  icono: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  iconoTexto: { color: C.verde, fontSize: 21, fontWeight: '800' },
  tituloActividad: { color: C.texto, fontSize: 17, fontWeight: '800' },
  subtexto: { color: C.secundario, fontSize: 12, marginTop: 5 },
  etiquetaEstado: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, marginLeft: 6 },
  textoEstado: { fontSize: 10, fontWeight: '800' },
  tituloTarjeta: { color: C.texto, fontSize: 16, fontWeight: '800', marginBottom: 16 },
  filaDato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borde,
  },
  etiquetaDato: { flex: 1, color: C.secundario, fontSize: 12 },
  valorDato: { flex: 1.2, color: C.texto, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  textoNormal: { color: C.secundario, fontSize: 13, lineHeight: 20 },
  botonPrincipal: { backgroundColor: C.verde, padding: 13, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  textoBoton: { color: C.blanco, fontWeight: '800' },
  aviso: { backgroundColor: C.verdeClaro, borderRadius: 12, padding: 13, marginTop: 2 },
  textoAviso: { color: C.verde, fontSize: 12, lineHeight: 18 },
  pie: { color: C.secundario, fontSize: 11, textAlign: 'center', marginTop: 20 },
});
