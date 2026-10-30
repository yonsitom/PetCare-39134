
import React, { useCallback, useState } from 'react';
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
import {
  router,
  useLocalSearchParams,
  useFocusEffect,
} from 'expo-router';

import { consultarMascotaPorId } from '../../dao/mascotaDAO';
import {
  consultarAtencionesPorMascota,
} from '../../dao/atencionesDAO';
import {
  obtenerMensajeSinAtenciones,
  obtenerMensajeDatosIncompletos,
  obtenerMensajeErrorConsulta,
} from '../../utils/validacionesConsultaMascota';
import { logger } from '../../utils/logger';

const C = {
  primario: '#187C72',
  fondo: '#F5F8F8',
  tarjeta: '#FFFFFF',
  texto: '#203432',
  secundario: '#71817F',
  borde: '#E1E9E7',
  error: '#B42318',
  errorFondo: '#FEF3F2',
  avisoFondo: '#FFF8E6',
  avisoBorde: '#F0D58A',
  verdeFondo: '#E8F5F1',
};

function valorORegistro(valor) {
  return valor === null ||
    valor === undefined ||
    String(valor).trim() === ''
    ? 'No registrado'
    : String(valor);
}

function nombrePropietario(propietario) {
  if (!propietario) return '';

  return [
    propietario.nombre,
    propietario.apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

export default function DetalleMascotaScreen() {
  const parametros = useLocalSearchParams();
  const numeroHistoria = Array.isArray(parametros.numeroHistoria)
    ? parametros.numeroHistoria[0]
    : parametros.numeroHistoria;

  const [mascota, setMascota] = useState(null);
  const [atenciones, setAtenciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [errorAtenciones, setErrorAtenciones] = useState('');

  const cargarDetalle = useCallback(async () => {
    try {
      setCargando(true);
      setError('');
      setErrorAtenciones('');

      const resultado = await consultarMascotaPorId(
        numeroHistoria
      );

      if (!resultado) {
        setMascota(null);
        setAtenciones([]);
        setError(
          'No se encontraron mascotas con los datos ingresados.'
        );
        return;
      }

      setMascota(resultado);

      try {
        const historial = await consultarAtencionesPorMascota(
          resultado.numero_historia
        );

        setAtenciones(
          Array.isArray(historial) ? historial : []
        );
      } catch (errorHistorial) {
        logger.error(
          'Error al consultar el historial de atenciones:',
          errorHistorial
        );

        setAtenciones([]);
        setErrorAtenciones(
          obtenerMensajeErrorConsulta(errorHistorial)
        );
      }
    } catch (e) {
      logger.error('Error al consultar detalle de mascota:', e);

      setMascota(null);
      setAtenciones([]);
      setError(obtenerMensajeErrorConsulta(e));
    } finally {
      setCargando(false);
    }
  }, [numeroHistoria]);

  useFocusEffect(
    useCallback(() => {
      cargarDetalle();
    }, [cargarDetalle])
  );

  if (cargando) {
    return (
      <SafeAreaView style={styles.centrado}>
        <ActivityIndicator size="large" color={C.primario} />
        <Text style={styles.secundario}>
          Consultando información de la mascota...
        </Text>
      </SafeAreaView>
    );
  }

  if (!mascota) {
    return (
      <SafeAreaView style={styles.contenedor}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={C.fondo}
        />

        <View style={styles.contenido}>
          <Text style={styles.migas}>
            Inicio / Mascotas / Ver detalle
          </Text>

          <View style={styles.alertaError}>
            <Text style={styles.textoError}>
              {error ||
                'No se pudo consultar la información de la mascota. Intente nuevamente.'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.boton}
            onPress={() => router.back()}
            accessibilityRole="button"
          >
            <Text style={styles.textoBoton}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const propietario = nombrePropietario(
    mascota.propietarios
  );

  const datos = [
    ['Número de historia clínica', mascota.numero_historia],
    ['Nombre', mascota.nombre],
    ['Especie', mascota.especie],
    ['Raza', mascota.raza],
    ['Sexo', mascota.sexo],
    ['Fecha de nacimiento', mascota.fecha_nacimiento],
    ['Color', mascota.color],
    [
      'Estado de esterilización',
      mascota.estado_esterilizacion,
    ],
    ['Propietario asociado', propietario],
    [
      'Documento del propietario',
      mascota.propietarios?.documento_identidad,
    ],
    [
      'Teléfono del propietario',
      mascota.propietarios?.telefono,
    ],
    [
      'Correo del propietario',
      mascota.propietarios?.correo,
    ],
    ['Observaciones', mascota.observaciones],
    ['Estado', mascota.estado],
    ['Fecha de registro', mascota.fecha_registro],
  ];

  const mensajeDatosIncompletos =
    obtenerMensajeDatosIncompletos(mascota);

  const mensajeSinAtenciones =
    obtenerMensajeSinAtenciones(atenciones);

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.fondo}
      />

      <ScrollView
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.migas}>
          Inicio / Mascotas / Ver detalle
        </Text>

        <Text style={styles.titulo}>
          Detalle de la mascota
        </Text>

        <View style={styles.tarjeta}>
          <View style={styles.encabezadoTarjeta}>
            <View style={styles.icono}>
              <Text style={styles.huella}>🐾</Text>
            </View>

            <View style={styles.resumen}>
              <Text style={styles.nombre}>
                {valorORegistro(mascota.nombre)}
              </Text>

              <Text style={styles.secundario}>
                {valorORegistro(mascota.especie)} ·{' '}
                {valorORegistro(mascota.raza)}
              </Text>

              <Text style={styles.historia}>
                {valorORegistro(mascota.numero_historia)}
              </Text>
            </View>
          </View>

          {!!mensajeDatosIncompletos && (
            <View style={styles.alertaAviso}>
              <Text style={styles.textoAviso}>
                {mensajeDatosIncompletos}
              </Text>
            </View>
          )}

          <Text style={styles.tituloSeccion}>
            INFORMACIÓN COMPLETA
          </Text>

          {datos.map(([etiqueta, valor], indice) => (
            <View
              key={etiqueta}
              style={[
                styles.fila,
                indice === datos.length - 1 &&
                  styles.ultimaFila,
              ]}
            >
              <Text style={styles.etiqueta}>
                {etiqueta}
              </Text>

              <Text style={styles.valor}>
                {valorORegistro(valor)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.tarjetaHistorial}>
          <Text style={styles.tituloSeccion}>
            HISTORIAL DE ATENCIONES
          </Text>

          {!!errorAtenciones && (
            <View style={styles.alertaError}>
              <Text style={styles.textoError}>
                {errorAtenciones}
              </Text>
            </View>
          )}

          {!errorAtenciones && !!mensajeSinAtenciones && (
            <View style={styles.alertaAviso}>
              <Text style={styles.textoAviso}>
                {mensajeSinAtenciones}
              </Text>
            </View>
          )}

          {!errorAtenciones &&
            atenciones.map((atencion) => (
              <View
                key={String(atencion.atencion_id)}
                style={styles.atencion}
              >
                <Text style={styles.nombreAtencion}>
                  Atención #{atencion.atencion_id}
                </Text>

                <Text style={styles.detalleAtencion}>
                  Fecha de inicio:{' '}
                  {valorORegistro(atencion.fecha_inicio)}
                </Text>

                <Text style={styles.detalleAtencion}>
                  Estado: {valorORegistro(atencion.estado)}
                </Text>

                {!!atencion.observaciones && (
                  <Text style={styles.detalleAtencion}>
                    Observaciones: {atencion.observaciones}
                  </Text>
                )}
              </View>
            ))}
        </View>

        <TouchableOpacity
          style={styles.boton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Volver a la ficha de la mascota"
        >
          <Text style={styles.textoBoton}>
            Volver a la ficha
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  contenido: {
    padding: 20,
    paddingBottom: 35,
  },
  centrado: {
    flex: 1,
    backgroundColor: C.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 20,
  },
  migas: {
    color: C.secundario,
    fontSize: 13,
    marginBottom: 20,
  },
  titulo: {
    fontSize: 26,
    fontWeight: '700',
    color: C.texto,
    marginBottom: 18,
  },
  tarjeta: {
    backgroundColor: C.tarjeta,
    borderColor: C.borde,
    borderWidth: 1,
    borderRadius: 13,
    padding: 16,
  },
  encabezadoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  icono: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: C.verdeFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  huella: {
    fontSize: 26,
  },
  resumen: {
    flex: 1,
  },
  nombre: {
    fontSize: 20,
    fontWeight: '700',
    color: C.texto,
  },
  secundario: {
    fontSize: 13,
    color: C.secundario,
    marginTop: 5,
  },
  historia: {
    fontSize: 13,
    color: C.primario,
    fontWeight: '700',
    marginTop: 5,
  },
  tituloSeccion: {
    fontSize: 13,
    fontWeight: '800',
    color: C.texto,
    marginBottom: 7,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 15,
    paddingVertical: 13,
    borderBottomColor: '#EEF2F1',
    borderBottomWidth: 1,
  },
  ultimaFila: {
    borderBottomWidth: 0,
  },
  etiqueta: {
    flex: 1,
    fontSize: 13,
    color: C.secundario,
  },
  valor: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: C.texto,
  },
  tarjetaHistorial: {
    marginTop: 16,
    backgroundColor: C.tarjeta,
    borderColor: C.borde,
    borderWidth: 1,
    borderRadius: 13,
    padding: 16,
  },
  atencion: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F1',
  },
  nombreAtencion: {
    fontSize: 14,
    fontWeight: '700',
    color: C.texto,
    marginBottom: 5,
  },
  detalleAtencion: {
    fontSize: 13,
    lineHeight: 19,
    color: C.secundario,
    marginTop: 3,
  },
  alertaAviso: {
    backgroundColor: C.avisoFondo,
    borderColor: C.avisoBorde,
    borderWidth: 1,
    padding: 12,
    borderRadius: 9,
    marginBottom: 15,
  },
  textoAviso: {
    color: '#795A13',
    fontSize: 13,
    lineHeight: 19,
  },
  alertaError: {
    backgroundColor: C.errorFondo,
    borderColor: '#F3B7B4',
    borderWidth: 1,
    padding: 12,
    borderRadius: 9,
    marginBottom: 15,
  },
  textoError: {
    color: C.error,
    fontSize: 13,
    lineHeight: 19,
  },
  boton: {
    marginTop: 18,
    backgroundColor: C.primario,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  textoBoton: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
