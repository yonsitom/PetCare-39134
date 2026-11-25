
/**
 * ============================================================
 * PETCARE - LISTADO DE RECETAS
 * RF53: Consultar las recetas de una atención.
 *
 * Navegación:
 * Detalle de atención -> Listado de recetas -> Detalle de receta.
 * ============================================================
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

import {
  obtenerRecetasPorAtencionServicio,
} from '../../services/recetas/recetasServicio';

export default function ListadoRecetas() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const atencionId = String(params.atencion_id ?? '');

  const [recetas, setRecetas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const cargarRecetas = useCallback(async () => {
    if (!atencionId) {
      setCargando(false);
      Alert.alert(
        'Atención no válida',
        'No se recibió el identificador de la atención.'
      );
      return;
    }

    try {
      setCargando(true);

      const resultado =
        await obtenerRecetasPorAtencionServicio(atencionId);

      setRecetas(Array.isArray(resultado) ? resultado : []);
    } catch (error) {
      console.error('Error cargando recetas:', error);
      Alert.alert(
        'Error',
        error?.message || 'No fue posible cargar las recetas.'
      );
    } finally {
      setCargando(false);
    }
  }, [atencionId]);

  useEffect(() => {
    cargarRecetas();
  }, [cargarRecetas]);

  function abrirDetalle(receta) {
    router.push({
      pathname: '/recetas/detalle',
      params: {
        receta_id: String(receta.receta_id),
        atencion_id: atencionId,
      },
    });
  }

  return (
    <View style={styles.contenedor}>
      <EncabezadoPetCare
        nombreUsuario="Usuario"
        rolUsuario="Asistente"
        onMenuPress={() => setMenuAbierto(true)}
      />

      <MenuLateralDerecho
        visible={menuAbierto}
        menuAbierto={menuAbierto}
        onClose={() => setMenuAbierto(false)}
      />

      <ScrollView
        style={styles.contenido}
        contentContainerStyle={styles.contenidoInterno}
      >
        <Pressable
          style={styles.botonVolver}
          onPress={() => router.back()}
        >
          <Text style={styles.textoVolver}>‹ Volver a atención</Text>
        </Pressable>

        <Text style={styles.titulo}>Recetas médicas</Text>
        <Text style={styles.subtitulo}>
          Recetas registradas en esta atención.
        </Text>

        {cargando ? (
          <View style={styles.cargando}>
            <ActivityIndicator size="large" color="#16845B" />
            <Text style={styles.textoCargando}>
              Cargando recetas...
            </Text>
          </View>
        ) : recetas.length === 0 ? (
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>
              No hay recetas registradas
            </Text>
            <Text style={styles.vacioTexto}>
              Cuando se registre una receta para esta atención,
              aparecerá en esta sección.
            </Text>
          </View>
        ) : (
          recetas.map((receta) => (
            <Pressable
              key={String(receta.receta_id)}
              style={styles.tarjeta}
              onPress={() => abrirDetalle(receta)}
            >
              <View style={styles.filaSuperior}>
                <Text style={styles.numeroReceta}>
                  Receta #{receta.receta_id}
                </Text>
                <Text style={styles.verDetalle}>
                  Ver detalle ›
                </Text>
              </View>

              <Text style={styles.etiqueta}>Fecha de registro</Text>
              <Text style={styles.valor}>
                {receta.fecha_registro
                  ? new Date(receta.fecha_registro).toLocaleString()
                  : 'No disponible'}
              </Text>

              <Text style={styles.etiqueta}>Diagnóstico</Text>
              <Text style={styles.valor}>
                {receta.diagnostico || 'Sin diagnóstico registrado'}
              </Text>

              <Text style={styles.etiqueta}>Recomendaciones</Text>
              <Text style={styles.valor}>
                {receta.recomendaciones ||
                  'Sin recomendaciones registradas'}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#F4F7F6',
  },
  contenido: {
    flex: 1,
  },
  contenidoInterno: {
    padding: 18,
    paddingBottom: 40,
  },
  botonVolver: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    marginBottom: 12,
  },
  textoVolver: {
    color: '#16845B',
    fontSize: 15,
    fontWeight: '700',
  },
  titulo: {
    color: '#173C32',
    fontSize: 25,
    fontWeight: '800',
  },
  subtitulo: {
    color: '#64736D',
    fontSize: 14,
    marginTop: 5,
    marginBottom: 20,
  },
  cargando: {
    padding: 35,
    alignItems: 'center',
  },
  textoCargando: {
    color: '#64736D',
    marginTop: 12,
  },
  vacio: {
    padding: 24,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  vacioTitulo: {
    color: '#173C32',
    fontWeight: '800',
    fontSize: 17,
  },
  vacioTexto: {
    color: '#64736D',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  tarjeta: {
    backgroundColor: '#FFFFFF',
    padding: 17,
    borderRadius: 14,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E1EAE5',
  },
  filaSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  numeroReceta: {
    color: '#173C32',
    fontSize: 17,
    fontWeight: '800',
  },
  verDetalle: {
    color: '#16845B',
    fontWeight: '700',
  },
  etiqueta: {
    color: '#75827C',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 9,
  },
  valor: {
    color: '#263B33',
    fontSize: 14,
    marginTop: 3,
    lineHeight: 21,
  },
});
