
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { supabase } from '../../services/supabase';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

// Colores utilizados en la pantalla.
const C = {
  primario: '#187C72',
  primarioOscuro: '#12665E',
  fondo: '#F4F7F8',
  blanco: '#FFFFFF',
  texto: '#243238',
  textoSecundario: '#718096',
  borde: '#E2E8F0',
  exito: '#16845B',
};

// Pantalla de consulta de mascota desde el módulo Propietarios.
export default function FichaMascotaPropietario() {
  const { numeroHistoria, propietarioId } = useLocalSearchParams();

  const [mascota, setMascota] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Normalizar los parámetros de la ruta.
  const historia = Array.isArray(numeroHistoria)
    ? numeroHistoria[0]
    : numeroHistoria;

  const idPropietario = Array.isArray(propietarioId)
    ? propietarioId[0]
    : propietarioId;

  // Consultar los datos de la mascota en Supabase.
  const cargarMascota = useCallback(async () => {
    if (!historia || !idPropietario) {
      setMascota(null);
      setCargando(false);
      return;
    }

    setCargando(true);

    try {
      // Verificar que exista el propietario.
      const { data: propietario, error: errorPropietario } =
        await supabase
          .from('propietarios')
          .select('propietario_id')
          .eq('propietario_id', idPropietario)
          .maybeSingle();

      if (errorPropietario) {
        throw errorPropietario;
      }

      if (!propietario) {
        setMascota(null);
        return;
      }

      // Recuperar todos los campos de la mascota, incluidas
      // las observaciones si existe esa columna en Supabase.
      const { data: datosMascota, error: errorMascota } =
        await supabase
          .from('mascotas')
          .select('*')
          .eq('numero_historia', historia)
          .maybeSingle();

      if (errorMascota) {
        throw errorMascota;
      }

      if (!datosMascota) {
        setMascota(null);
        return;
      }

      // Comprobar la relación si la mascota tiene el campo
      // propietario_id o id_propietario.
      const idPropietarioMascota =
        datosMascota.propietario_id ??
        datosMascota.id_propietario ??
        null;

      if (
        idPropietarioMascota !== null &&
        String(idPropietarioMascota) !== String(idPropietario)
      ) {
        setMascota(null);
        return;
      }

      setMascota(datosMascota);
    } catch (error) {
      console.error('Error al cargar la ficha de mascota:', error);

      Alert.alert(
        'Error',
        'No se pudo cargar la información de la mascota. Inténtalo nuevamente.'
      );
    } finally {
      setCargando(false);
    }
  }, [historia, idPropietario]);

  useEffect(() => {
    cargarMascota();
  }, [cargarMascota]);

  // Volver a la ficha del propietario.
  const volverAPropietario = () => {
    if (!idPropietario) {
      router.back();
      return;
    }

    router.replace({
      pathname: '/propietarios/fichaPropietario',
      params: {
        propietarioId: String(idPropietario),
      },
    });
  };

  // Abrir y cerrar el menú lateral compartido.
  const abrirMenu = () => setMenuAbierto(true);
  const cerrarMenu = () => setMenuAbierto(false);

  // Aviso de notificaciones.
  const abrirNotificaciones = () => {
    Alert.alert(
      'Notificaciones',
      'No hay notificaciones nuevas.'
    );
  };

  // Componente reutilizable para mostrar cada dato.
  const CampoFicha = ({ etiqueta, valor }) => {
    const mostrarValor =
      valor !== null &&
      valor !== undefined &&
      String(valor).trim() !== '';

    return (
      <View style={styles.campo}>
        <Text style={styles.etiqueta}>{etiqueta}</Text>
        <Text style={styles.valor}>
          {mostrarValor ? String(valor) : 'No registrado'}
        </Text>
      </View>
    );
  };

  // Preparar las observaciones para su visualización.
  const observaciones =
    typeof mascota?.observaciones === 'string'
      ? mascota.observaciones.trim()
      : '';

  return (
    <SafeAreaView style={styles.contenedor}>
      {/* Encabezado oficial de PetCare. */}
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={abrirMenu}
        onAbrirNotificaciones={abrirNotificaciones}
      />

      {/* Menú lateral original de la aplicación. */}
      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={cerrarMenu}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        {/* Título y botón de retroceso en la misma fila. */}
        <View style={styles.filaTitulo}>
          <TouchableOpacity
            style={styles.botonRetroceso}
            onPress={volverAPropietario}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Regresar a la ficha del propietario"
          >
            <Text style={styles.iconoRetroceso}>‹</Text>
          </TouchableOpacity>

          <View style={styles.contenedorTitulo}>
            <Text style={styles.titulo}>Ficha de mascota</Text>
            <Text style={styles.subtitulo}>
              Inicio / Propietarios / Ficha de mascota
            </Text>
          </View>
        </View>

        {cargando ? (
          // Indicador mientras se consultan los datos.
          <View style={styles.estadoCargando}>
            <ActivityIndicator
              size="large"
              color={C.primario}
            />
            <Text style={styles.textoCargando}>
              Cargando información de la mascota...
            </Text>
          </View>
        ) : !mascota ? (
          // Mensaje si la mascota no existe o no corresponde
          // al propietario seleccionado.
          <View style={styles.tarjetaEstado}>
            <Text style={styles.iconoEstado}>🐾</Text>

            <Text style={styles.tituloEstado}>
              No se encontró la mascota
            </Text>

            <Text style={styles.descripcionEstado}>
              Verifica que la mascota esté registrada y asociada
              al propietario seleccionado.
            </Text>

            <TouchableOpacity
              style={styles.botonReintentar}
              onPress={cargarMascota}
              activeOpacity={0.8}
            >
              <Text style={styles.textoBotonReintentar}>
                Reintentar
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Tarjeta de resumen de la mascota. */}
            <View style={styles.tarjetaPrincipal}>
              <View style={styles.avatarMascota}>
                <Text style={styles.emojiMascota}>🐾</Text>
              </View>

              <View style={styles.datosPrincipales}>
                <Text style={styles.nombreMascota}>
                  {mascota.nombre || 'Mascota sin nombre'}
                </Text>

                <Text style={styles.numeroHistoria}>
                  Historia clínica: {mascota.numero_historia || 'No registrada'}
                </Text>

                <View style={styles.etiquetaEstado}>
                  <Text style={styles.textoEstado}>
                    {mascota.estado || 'Registrada'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Información general. */}
            <View style={styles.tarjeta}>
              <Text style={styles.tituloSeccion}>
                Información general
              </Text>

              <View style={styles.separador} />

              <CampoFicha
                etiqueta="Nombre"
                valor={mascota.nombre}
              />

              <CampoFicha
                etiqueta="Número de historia"
                valor={mascota.numero_historia}
              />

              <CampoFicha
                etiqueta="Especie"
                valor={mascota.especie}
              />

              <CampoFicha
                etiqueta="Raza"
                valor={mascota.raza}
              />

              <CampoFicha
                etiqueta="Sexo"
                valor={mascota.sexo}
              />

              <CampoFicha
                etiqueta="Fecha de nacimiento"
                valor={mascota.fecha_nacimiento}
              />

              <CampoFicha
                etiqueta="Color"
                valor={mascota.color}
              />

              <CampoFicha
                etiqueta="Peso"
                valor={
                  mascota.peso !== null &&
                  mascota.peso !== undefined
                    ? `${mascota.peso} kg`
                    : null
                }
              />

              <CampoFicha
                etiqueta="Estado"
                valor={mascota.estado}
              />
            </View>

            {/* Observaciones en una tarjeta independiente. */}
            <View style={styles.tarjetaObservaciones}>
              <Text style={styles.tituloSeccion}>
                Observaciones
              </Text>

              <View style={styles.separador} />

              <Text style={styles.textoObservaciones}>
                {observaciones ||
                  'No se han registrado observaciones.'}
              </Text>
            </View>
          </>
        )}

        {/* Espacio adicional al pie de la pantalla. */}
        <View style={styles.espacioPie} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  scroll: {
    flex: 1,
  },

  contenido: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 12,
  },

  // Título con botón de retroceso a la izquierda.
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  botonRetroceso: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  iconoRetroceso: {
    fontSize: 35,
    lineHeight: 38,
    color: C.primario,
    marginTop: -3,
  },

  contenedorTitulo: {
    flex: 1,
  },

  titulo: {
    fontSize: 23,
    fontWeight: '700',
    color: C.texto,
  },

  subtitulo: {
    fontSize: 12,
    color: C.textoSecundario,
    marginTop: 5,
  },

  // Resumen de la mascota.
  tarjetaPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.blanco,
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.borde,
  },

  avatarMascota: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#E4F3F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  emojiMascota: {
    fontSize: 30,
  },

  datosPrincipales: {
    flex: 1,
  },

  nombreMascota: {
    fontSize: 20,
    fontWeight: '700',
    color: C.texto,
  },

  numeroHistoria: {
    fontSize: 13,
    color: C.textoSecundario,
    marginTop: 5,
  },

  etiquetaEstado: {
    alignSelf: 'flex-start',
    backgroundColor: '#E4F5EC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
  },

  textoEstado: {
    fontSize: 12,
    fontWeight: '600',
    color: C.exito,
  },

  // Tarjeta de información general.
  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: C.borde,
  },

  tituloSeccion: {
    fontSize: 17,
    fontWeight: '700',
    color: C.texto,
  },

  separador: {
    height: 1,
    backgroundColor: C.borde,
    marginTop: 14,
    marginBottom: 4,
  },

  campo: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F3',
  },

  etiqueta: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textoSecundario,
    marginBottom: 5,
  },

  valor: {
    fontSize: 15,
    fontWeight: '500',
    color: C.texto,
  },

  // Tarjeta de observaciones.
  tarjetaObservaciones: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    padding: 18,
    marginTop: 18,
    borderWidth: 1,
    borderColor: C.borde,
  },

  textoObservaciones: {
    fontSize: 14,
    lineHeight: 23,
    color: C.texto,
  },

  // Estados de carga y error.
  estadoCargando: {
    paddingVertical: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoCargando: {
    fontSize: 14,
    color: C.textoSecundario,
    marginTop: 14,
  },

  tarjetaEstado: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borde,
  },

  iconoEstado: {
    fontSize: 38,
    marginBottom: 12,
  },

  tituloEstado: {
    fontSize: 18,
    fontWeight: '700',
    color: C.texto,
    textAlign: 'center',
  },

  descripcionEstado: {
    fontSize: 14,
    lineHeight: 21,
    color: C.textoSecundario,
    textAlign: 'center',
    marginTop: 8,
  },

  botonReintentar: {
    marginTop: 20,
    backgroundColor: C.primario,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },

  textoBotonReintentar: {
    color: C.blanco,
    fontSize: 14,
    fontWeight: '700',
  },

  // Espacio extra después del último contenido.
  espacioPie: {
    height: 48,
  },
});
