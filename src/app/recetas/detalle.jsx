
/**
 * ============================================================
 * PETCARE - DETALLE COMPLETO DE RECETA
 * RF53: Consultar receta médica.
 * RF54: Consultar dieta registrada.
 *
 * Responsabilidad:
 * Mostrar todos los datos existentes de una receta.
 *
 * Arquitectura:
 * Vista -> Servicio -> DAO -> Supabase.
 * ============================================================
 */

import React, { useEffect, useState } from 'react';
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
  obtenerRecetaServicio,
} from '../../services/recetas/recetasServicio';

import {
  obtenerDietaServicio,
} from '../../services/dieta/dietaServicio';

function tieneContenido(valor) {
  return (
    valor !== null &&
    valor !== undefined &&
    String(valor).trim() !== ''
  );
}

function Campo({ etiqueta, valor }) {
  if (!tieneContenido(valor)) {
    return null;
  }

  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={styles.valor}>{String(valor)}</Text>
    </View>
  );
}

function Seccion({ titulo, children }) {
  return (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>{titulo}</Text>
      {children}
    </View>
  );
}

export default function DetalleReceta() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const recetaId = String(params.receta_id ?? '');
  const atencionId = String(params.atencion_id ?? '');

  const [receta, setReceta] = useState(null);
  const [dieta, setDieta] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    let activo = true;

    async function cargarDetalle() {
      if (!recetaId) {
        setCargando(false);
        Alert.alert(
          'Receta no válida',
          'No se recibió el identificador de la receta.'
        );
        return;
      }

      try {
        setCargando(true);

        const [recetaObtenida, dietaObtenida] = await Promise.all([
          obtenerRecetaServicio(recetaId),
          obtenerDietaServicio(recetaId),
        ]);

        if (!activo) return;

        if (!recetaObtenida) {
          setReceta(null);
          Alert.alert(
            'Receta no encontrada',
            'No se encontró la receta solicitada.'
          );
          return;
        }

        setReceta(recetaObtenida);
        setDieta(dietaObtenida);
      } catch (error) {
        console.error('Error cargando detalle de receta:', error);

        if (activo) {
          Alert.alert(
            'Error',
            error?.message ||
              'No fue posible cargar todos los datos de la receta.'
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarDetalle();

    return () => {
      activo = false;
    };
  }, [recetaId]);

  const consulta = receta?.actividad_consulta ?? null;

  const medicamentos = Array.isArray(receta?.detalle_receta)
    ? receta.detalle_receta
    : [];

  const detalleDieta = dieta?.detalle_dieta ?? {};

  function volver() {
    if (atencionId) {
      router.replace({
        pathname: '/recetas',
        params: { atencion_id: atencionId },
      });
    } else {
      router.back();
    }
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
        <Pressable style={styles.botonVolver} onPress={volver}>
          <Text style={styles.textoVolver}>‹ Volver a recetas</Text>
        </Pressable>

        <Text style={styles.titulo}>Detalle de receta médica</Text>
        <Text style={styles.subtitulo}>
          Información clínica y tratamiento registrado.
        </Text>

        {cargando ? (
          <View style={styles.cargando}>
            <ActivityIndicator size="large" color="#16845B" />
            <Text style={styles.textoCargando}>
              Recuperando información...
            </Text>
          </View>
        ) : !receta ? (
          <View style={styles.vacio}>
            <Text style={styles.valor}>
              No se pudo recuperar la receta.
            </Text>
          </View>
        ) : (
          <>
            <Seccion titulo="Datos generales de la receta">
              <Campo etiqueta="Código de receta" valor={receta.receta_id} />
              <Campo
                etiqueta="Fecha de registro"
                valor={
                  receta.fecha_registro
                    ? new Date(receta.fecha_registro).toLocaleString()
                    : null
                }
              />
              <Campo
                etiqueta="Diagnóstico"
                valor={receta.diagnostico}
              />
              <Campo
                etiqueta="Recomendaciones"
                valor={receta.recomendaciones}
              />
            </Seccion>

            <Seccion titulo="Datos de la consulta">
              <Campo etiqueta="Síntomas" valor={consulta?.sintomas} />
              <Campo
                etiqueta="Motivo de consulta"
                valor={consulta?.motivo_consulta}
              />
              <Campo
                etiqueta="Diagnóstico de consulta"
                valor={consulta?.diagnostico}
              />
              <Campo etiqueta="Peso" valor={
                tieneContenido(consulta?.peso)
                  ? `${consulta.peso} kg`
                  : null
              } />
              <Campo etiqueta="Temperatura" valor={
                tieneContenido(consulta?.temperatura)
                  ? `${consulta.temperatura} °C`
                  : null
              } />
            </Seccion>

            <Seccion titulo="Medicamentos prescritos">
              {medicamentos.length === 0 ? (
                <Text style={styles.textoSecundario}>
                  No se registraron medicamentos en esta receta.
                </Text>
              ) : (
                medicamentos.map((medicamento, indice) => (
                  <View
                    key={String(
                      medicamento.detalle_receta_id ?? indice
                    )}
                    style={styles.tarjetaInterna}
                  >
                    <Text style={styles.subtituloTarjeta}>
                      Medicamento {indice + 1}
                    </Text>

                    <Campo
                      etiqueta="Nombre"
                      valor={
                        medicamento.medicamentos?.nombre_medicamento
                      }
                    />
                    <Campo
                      etiqueta="Concentración"
                      valor={
                        medicamento.medicamentos?.concentracion
                      }
                    />
                    <Campo
                      etiqueta="Categoría"
                      valor={
                        medicamento.medicamentos?.categoria
                      }
                    />
                    <Campo
                      etiqueta="Dosis"
                      valor={medicamento.dosis}
                    />
                    <Campo
                      etiqueta="Condición de ingesta"
                      valor={medicamento.condicion_ingesta}
                    />
                    <Campo
                      etiqueta="Frecuencia"
                      valor={medicamento.frecuencia}
                    />
                    <Campo
                      etiqueta="Duración del tratamiento"
                      valor={medicamento.duracion_tratamiento}
                    />
                  </View>
                ))
              )}
            </Seccion>

            <Seccion titulo="Dieta indicada">
              {!dieta ? (
                <Text style={styles.textoSecundario}>
                  No se registró una dieta para esta receta.
                </Text>
              ) : (
                <>
                  <Campo
                    etiqueta="Código de dieta"
                    valor={dieta.dieta_id}
                  />
                  <Campo
                    etiqueta="Tipo de dieta"
                    valor={dieta.tipo_dieta}
                  />

                  {Object.entries(detalleDieta).map(
                    ([campo, valor]) => (
                      <Campo
                        key={campo}
                        etiqueta={campo
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (letra) =>
                            letra.toUpperCase()
                          )}
                        valor={valor}
                      />
                    )
                  )}
                </>
              )}
            </Seccion>
          </>
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
    paddingBottom: 45,
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
    marginBottom: 18,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
  },
  seccion: {
    backgroundColor: '#FFFFFF',
    padding: 17,
    borderRadius: 14,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E1EAE5',
  },
  tituloSeccion: {
    color: '#173C32',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  campo: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1EF',
  },
  etiqueta: {
    color: '#75827C',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  valor: {
    color: '#263B33',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  textoSecundario: {
    color: '#64736D',
    fontSize: 14,
    lineHeight: 21,
  },
  tarjetaInterna: {
    borderWidth: 1,
    borderColor: '#E1EAE5',
    borderRadius: 11,
    padding: 12,
    marginBottom: 12,
  },
  subtituloTarjeta: {
    color: '#16845B',
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 5,
  },
});
