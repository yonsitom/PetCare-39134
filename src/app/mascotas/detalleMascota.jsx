
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
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { consultarMascotaPorId } from '../../dao/mascotaDAO';

const C = {
  primario: '#187C72',
  fondo: '#F5F8F8',
  tarjeta: '#FFFFFF',
  texto: '#203432',
  secundario: '#71817F',
  borde: '#E1E9E7',
};

function valorORegistro(valor) {
  return valor === null || valor === undefined || String(valor).trim() === ''
    ? 'No registrado'
    : String(valor);
}

export default function DetalleMascotaScreen() {
  const { numeroHistoria } = useLocalSearchParams();
  const [mascota, setMascota] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarDetalle = useCallback(async () => {
    try {
      setCargando(true);
      setError('');
      const resultado = await consultarMascotaPorId(numeroHistoria);
      setMascota(resultado);

      if (!resultado) setError('No se encontró la mascota.');
    } catch (e) {
      console.error('Error al consultar detalle:', e);
      setError('No se pudo consultar el detalle de la mascota.');
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
        <Text style={styles.secundario}>Cargando detalle...</Text>
      </SafeAreaView>
    );
  }

  if (!mascota) {
    return (
      <SafeAreaView style={styles.contenedor}>
        <Text style={styles.migas}>Inicio  /  Mascotas  /  Ver detalle</Text>
        <Text style={styles.error}>{error || 'Mascota no encontrada.'}</Text>
        <TouchableOpacity style={styles.boton} onPress={() => router.back()}>
          <Text style={styles.textoBoton}>Volver</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const propietario = mascota.propietarios
    ? [
        mascota.propietarios.nombre,
        mascota.propietarios.apellido,
      ].filter(Boolean).join(' ')
    : '';

  const datos = [
    ['Número de historia clínica', mascota.numero_historia],
    ['Nombre', mascota.nombre],
    ['Especie', mascota.especie],
    ['Raza', mascota.raza],
    ['Sexo', mascota.sexo],
    ['Fecha de nacimiento', mascota.fecha_nacimiento],
    ['Color', mascota.color],
    ['Estado de esterilización', mascota.estado_esterilizacion],
    ['Propietario asociado', propietario],
    ['Observaciones', mascota.observaciones],
    ['Estado', mascota.estado],
    ['Fecha de registro', mascota.fecha_registro],
  ];

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor={C.fondo} />
      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.migas}>Inicio  /  Mascotas  /  Ver detalle</Text>
        <Text style={styles.titulo}>Detalle de la mascota</Text>

        <View style={styles.tarjeta}>
          <View style={styles.encabezadoTarjeta}>
            <View style={styles.icono}>
              <Text style={styles.huella}>🐾</Text>
            </View>
            <View style={styles.resumen}>
              <Text style={styles.nombre}>{valorORegistro(mascota.nombre)}</Text>
              <Text style={styles.secundario}>
                {valorORegistro(mascota.especie)} · {valorORegistro(mascota.raza)}
              </Text>
              <Text style={styles.historia}>
                {valorORegistro(mascota.numero_historia)}
              </Text>
            </View>
          </View>

          <Text style={styles.tituloSeccion}>INFORMACIÓN COMPLETA</Text>

          {datos.map(([etiqueta, valor], indice) => (
            <View
              key={etiqueta}
              style={[
                styles.fila,
                indice === datos.length - 1 && styles.ultimaFila,
              ]}
            >
              <Text style={styles.etiqueta}>{etiqueta}</Text>
              <Text style={styles.valor}>{valorORegistro(valor)}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.boton} onPress={() => router.back()}>
          <Text style={styles.textoBoton}>Volver a la ficha</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.fondo },
  contenido: { padding: 20, paddingBottom: 35 },
  centrado: {
    flex: 1,
    backgroundColor: C.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  migas: { color: C.secundario, fontSize: 13, marginBottom: 20 },
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
    marginBottom: 24,
  },
  icono: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#E8F5F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  huella: { fontSize: 26 },
  resumen: { flex: 1 },
  nombre: { fontSize: 20, fontWeight: '700', color: C.texto },
  secundario: { fontSize: 13, color: C.secundario, marginTop: 5 },
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
  ultimaFila: { borderBottomWidth: 0 },
  etiqueta: { flex: 1, fontSize: 13, color: C.secundario },
  valor: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
    color: C.texto,
  },
  boton: {
    marginTop: 18,
    backgroundColor: C.primario,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  textoBoton: { color: '#FFFFFF', fontWeight: '700' },
  error: { color: '#B42318', marginBottom: 15 },
});
