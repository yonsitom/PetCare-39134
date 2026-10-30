
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';import { router, useLocalSearchParams } from 'expo-router';

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

import {
  consultarPropietarioPorId,
  consultarMascotasPorPropietario,
} from '../../dao/propietarioDAO';

import { supabase } from '../../services/supabase';
import { logger } from '../../utils/logger';

// ======================================================
// COLORES DE LA PANTALLA
// ======================================================
const C = {
  primario: '#187C72',
  primarioOscuro: '#12665E',
  fondo: '#F5F7FA',
  blanco: '#FFFFFF',
  texto: '#243447',
  textoSecundario: '#718096',
  borde: '#E3E8EF',
  verdeClaro: '#E7F5F1',
  rojo: '#C0392B',
  rojoClaro: '#FDEDEC',
  grisClaro: '#F8FAFC',
};

// ======================================================
// PANTALLA: FICHA DE INFORMACIÓN DEL PROPIETARIO
// ======================================================
export default function FichaPropietario() {
  const { propietarioId } = useLocalSearchParams();

  // Datos del propietario y sus mascotas.
  const [propietario, setPropietario] = useState(null);
  const [mascotas, setMascotas] = useState([]);

  // Estados de la pantalla.
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Datos del usuario autenticado.
  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
  const [rolUsuario, setRolUsuario] = useState('Asistente');

  // Control del menú lateral.
  const [menuAbierto, setMenuAbierto] = useState(false);

  // ======================================================
  // CARGAR PERFIL DEL USUARIO
  // ======================================================
  const cargarPerfilUsuario = useCallback(async () => {
    try {
      const {
        data: { user },
        error: errorUsuario,
      } = await supabase.auth.getUser();

      if (errorUsuario || !user) {
        return;
      }

      const { data, error: errorPerfil } = await supabase
        .from('perfiles')
        .select('nombre_completo, rol')
        .eq('perfil_id', user.id)
        .maybeSingle();

      if (!errorPerfil && data) {
        setNombreUsuario(data.nombre_completo || 'Usuario');
        setRolUsuario(data.rol || 'Asistente');
      }
    } catch (e) {
      logger.info('Error al cargar el perfil:', e.message);
    }
  }, []);

  // ======================================================
  // CARGAR PROPIETARIO Y MASCOTAS ASOCIADAS
  // ==================================================  // RF13 / RF14: cargar la información del propietario y sus mascotas.
  const cargarInformacion = useCallback(async () => {
    const id = Array.isArray(propietarioId)
      ? propietarioId[0]
      : propietarioId;

    if (!id) {
      setError('No se recibió el identificador del propietario.');
      setCargando(false);
      return;
    }

    setCargando(true);
    setError('');

    let etapaConsulta = 'propietario';

    try {
      // RF13: consultar la información del propietario.
      const datosPropietario = await consultarPropietarioPorId(id);

      // RF14: consultar las mascotas asociadas.
      etapaConsulta = 'mascotas';
      const datosMascotas = await consultarMascotasPorPropietario(id);

      setPropietario(datosPropietario);
      setMascotas(Array.isArray(datosMascotas) ? datosMascotas : []);
    } catch (e) {
      logger.error('Error al cargar la ficha del propietario:', e);

      if (e?.code === 'PROPIETARIO_NO_ENCONTRADO') {
        setError(
          'No se encontró la información del propietario solicitado.'
        );
      } else if (etapaConsulta === 'mascotas') {
        setError(
          'No se pudieron consultar las mascotas. Intente nuevamente.'
        );
      } else {
        setError(
          'No se pudo consultar la información del propietario. Intente nuevamente.'
        );
      }
    } finally {
      setCargando(false);
    }
  }, [propietarioId]);



  useEffect(() => {
    cargarPerfilUsuario();
    cargarInformacion();
  }, [cargarPerfilUsuario, cargarInformacion]);

  // ======================================================
  // VOLVER AL LISTADO DE PROPIETARIOS
  // ======================================================
  const volverAlListado = () => {
    router.replace('/propietarios');
  };

  // ======================================================
  // ABRIR PANTALLA DE EDICIÓN DEL PROPIETARIO
  // ======================================================
  const editarPropietario = () => {
    if (!propietario?.propietario_id) {
      return;
    }

    router.push({
      pathname: '/propietarios/editarPropietario',
      params: {
        propietarioId: String(propietario.propietario_id),
      },
    });
  };

  // ======================================================
  // ABRIR FICHA DE UNA MASCOTA
  // ======================================================
// ------------------------------------------------------------
// VER FICHA DE MASCOTA DESDE EL MÓDULO PROPIETARIOS
// ------------------------------------------------------------

const verFichaMascota = (mascota) => {
  if (!propietarioId || !mascota?.numero_historia) {
    Alert.alert(
      'Información incompleta',
      'No se pudo obtener el propietario o el número de historia de la mascota.'
    );
    return;
  }

  // Abrir la ficha independiente del módulo Propietarios.
  router.push({
    pathname: '/propietarios/fichaMascotaPropietario',
    params: {
      propietarioId: String(propietarioId),
      numeroHistoria: String(mascota.numero_historia),
    },
  });
};
  // ======================================================
  // OBTENER INICIALES DEL PROPIETARIO
  // ======================================================
  const obtenerIniciales = () => {
    if (!propietario) {
      return 'PR';
    }

    const nombre = propietario.nombre || '';
    const apellido = propietario.apellido || '';

    return (
      `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() ||
      'PR'
    );
  };

  // ======================================================
  // MOSTRAR DATO O TEXTO ALTERNATIVO
  // ======================================================
  const mostrarDato = (valor) => {
    if (
      valor === null ||
      valor === undefined ||
      String(valor).trim() === ''
    ) {
      return 'No registrado';
    }

    return String(valor);
  };

  // ======================================================
  // COMPONENTE PARA MOSTRAR CADA DATO
  // ======================================================
  const FilaDato = ({ etiqueta, valor }) => (
    <View style={styles.filaDato}>
      <Text style={styles.etiquetaDato}>{etiqueta}</Text>
      <Text style={styles.valorDato}>{mostrarDato(valor)}</Text>
    </View>
  );

  // ======================================================
  // PANTALLA DE CARGA
  // ======================================================
  if (cargando) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={C.blanco}
        />

        <EncabezadoPetCare
          onAbrirMenu={() => setMenuAbierto(true)}
        />

        <View style={styles.contenedorCarga}>
          <ActivityIndicator size="large" color={C.primario} />
          <Text style={styles.textoCarga}>
            Cargando información del propietario...
          </Text>
        </View>

        <MenuLateralDerecho
          visible={menuAbierto}
          onCerrar={() => setMenuAbierto(false)}
          nombreUsuario={nombreUsuario}
          rolUsuario={rolUsuario}
        />
      </SafeAreaView>
    );
  }

  // ======================================================
  // PANTALLA PRINCIPAL
  // ======================================================
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.blanco}
      />

      {/* Encabezado compartido de PetCare */}
      <EncabezadoPetCare
        onAbrirMenu={() => setMenuAbierto(true)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenidoScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Migas de navegación */}
        <View style={styles.migasPan}>
          <Text style={styles.migaTexto}>Inicio</Text>
          <Text style={styles.migaSeparador}>/</Text>

          <TouchableOpacity onPress={volverAlListado}>
            <Text style={styles.migaEnlace}>Propietarios</Text>
          </TouchableOpacity>

          <Text style={styles.migaSeparador}>/</Text>
          <Text style={styles.migaActual}>
            Información del propietario
          </Text>
        </View>

        {/* Título, botón de retroceso y botón Editar */}
        <View style={styles.filaTitulo}>
          <View style={styles.tituloIzquierda}>
            <TouchableOpacity
              style={styles.botonVolver}
              onPress={volverAlListado}
              accessibilityLabel="Volver al listado de propietarios"
            >
              <Text style={styles.iconoVolver}>‹</Text>
            </TouchableOpacity>

            <View style={styles.contenedorTitulo}>
              <Text style={styles.titulo}>
                Información del propietario
              </Text>
              <Text style={styles.subtitulo}>
                Consulta los datos registrados y sus mascotas.
              </Text>
            </View>
          </View>

          {/* Editar está a la derecha del título */}
          {propietario && (
<TouchableOpacity
  style={styles.botonEditar}
  onPress={editarPropietario}
  activeOpacity={0.8}
>
  <Text style={styles.textoBotonEditar}>Editar</Text>
</TouchableOpacity>
          )}
        </View>

        {/* Mensaje de error */}
        {error ? (
          <View style={styles.mensajeError}>
            <Text style={styles.textoMensajeError}>{error}</Text>

            <TouchableOpacity
              style={styles.botonReintentar}
              onPress={cargarInformacion}
            >
              <Text style={styles.textoReintentar}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Información del propietario */}
        {propietario && !error && (
          <>
            <View style={styles.tarjeta}>
              <View style={styles.encabezadoTarjeta}>
                <View style={styles.avatar}>
                  <Text style={styles.textoAvatar}>
                    {obtenerIniciales()}
                  </Text>
                </View>

                <View style={styles.informacionPrincipal}>
                  <Text style={styles.nombrePropietario}>
                    {`${propietario.nombre || ''} ${
                      propietario.apellido || ''
                    }`.trim() || 'Propietario sin nombre'}
                  </Text>

                  <Text style={styles.documentoPrincipal}>
                    DNI: {mostrarDato(propietario.documento_identidad)}
                  </Text>

                  <View style={styles.etiquetaRegistrado}>
                    <Text style={styles.textoEtiquetaRegistrado}>
                      Propietario registrado
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.separador} />

              <Text style={styles.tituloSeccionDatos}>
                Datos personales
              </Text>

              <FilaDato
                etiqueta="Nombres"
                valor={propietario.nombre}
              />

              <FilaDato
                etiqueta="Apellidos"
                valor={propietario.apellido}
              />

              <FilaDato
                etiqueta="Documento de identidad"
                valor={propietario.documento_identidad}
              />

              <FilaDato
                etiqueta="Teléfono"
                valor={propietario.telefono}
              />

              <FilaDato
                etiqueta="Correo electrónico"
                valor={propietario.correo}
              />

              <FilaDato
                etiqueta="Dirección"
                valor={propietario.direccion}
              />

              <FilaDato
                etiqueta="Observaciones"
                valor={propietario.observaciones}
              />
            </View>

            {/* Encabezado de mascotas asociadas */}
            <View style={styles.encabezadoMascotas}>
              <View>
                <Text style={styles.tituloMascotas}>
                  Mascotas asociadas
                </Text>
                <Text style={styles.subtituloMascotas}>
                  Consulta las mascotas registradas para este propietario.
                </Text>
              </View>

              <View style={styles.contadorMascotas}>
                <Text style={styles.textoContadorMascotas}>
                  {mascotas.length}
                </Text>
              </View>
            </View>

            {/* Lista de mascotas */}
            {mascotas.length > 0 ? (
              <View style={styles.tarjetaMascotas}>
                {mascotas.map((mascota, indice) => (
                  <View
                    key={
                      mascota.numero_historia ||
                      mascota.mascota_id ||
                      `${mascota.nombre}-${indice}`
                    }
                    style={[
                      styles.filaMascota,
                      indice === mascotas.length - 1 &&
                        styles.ultimaFilaMascota,
                    ]}
                  >
                    <View style={styles.iconoMascota}>
                      <Text style={styles.emojiMascota}>🐾</Text>
                    </View>

                    <View style={styles.datosMascota}>
                      <Text style={styles.nombreMascota}>
                        {mostrarDato(mascota.nombre)}
                      </Text>

                      <Text style={styles.detalleMascota}>
                        {mostrarDato(mascota.especie)}
                        {mascota.raza ? ` · ${mascota.raza}` : ''}
                      </Text>

                      {mascota.numero_historia ? (
                        <Text style={styles.historiaMascota}>
                          Historia clínica: {mascota.numero_historia}
                        </Text>
                      ) : null}

                      {/* Opción para abrir la ficha de la mascota */}
                      <TouchableOpacity
                        style={styles.botonVerFichaMascota}
                        onPress={() => verFichaMascota(mascota)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.textoVerFichaMascota}>
                          Ver ficha
                        </Text>
                        <Text style={styles.flechaVerFichaMascota}>
                          ›
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.tarjetaVacia}>
                <Text style={styles.emojiVacio}>🐾</Text>
                <Text style={styles.tituloVacio}>
                  No hay mascotas registradas
                </Text>
                <Text style={styles.textoVacio}>
                 Este propietario no tiene mascotas asociadas.
                </Text>
              </View>
            )}
          </>
        )}

        {/* Espacio al final de la página */}
        <View style={styles.espacioFinal} />
      </ScrollView>

      {/* Menú lateral compartido */}
      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        nombreUsuario={nombreUsuario}
        rolUsuario={rolUsuario}
      />
    </SafeAreaView>
  );
}

// ======================================================
// ESTILOS
// ======================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  scroll: {
    flex: 1,
  },

  contenidoScroll: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 0,
  },

  // Carga
  contenedorCarga: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  textoCarga: {
    marginTop: 14,
    fontSize: 14,
    color: C.textoSecundario,
  },

  // Migas de navegación
  migasPan: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
  },

  migaTexto: {
    fontSize: 12,
    color: C.textoSecundario,
  },

  migaSeparador: {
    fontSize: 12,
    color: '#A0AEC0',
    marginHorizontal: 8,
  },

  migaEnlace: {
    fontSize: 12,
    color: C.primario,
    fontWeight: '600',
  },

  migaActual: {
    fontSize: 12,
    color: C.texto,
    fontWeight: '500',
  },

  // Título y botones
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 22,
  },

  tituloIzquierda: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  botonVolver: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  iconoVolver: {
    fontSize: 31,
    lineHeight: 33,
    color: C.texto,
    marginTop: -3,
  },

  contenedorTitulo: {
    flex: 1,
    minWidth: 0,
  },

  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: C.texto,
  },

  subtitulo: {
    fontSize: 12,
    lineHeight: 18,
    color: C.textoSecundario,
    marginTop: 4,
  },

  botonEditar: {
    minHeight: 40,
    paddingHorizontal: 13,
    borderRadius: 10,
    backgroundColor: C.primario,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  iconoEditar: {
    color: C.blanco,
    fontSize: 17,
    fontWeight: '700',
  },

  textoBotonEditar: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '700',
  },

  // Mensaje de error
  mensajeError: {
    backgroundColor: C.rojoClaro,
    borderColor: '#F5C6CB',
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 18,
  },

  textoMensajeError: {
    color: C.rojo,
    fontSize: 13,
    lineHeight: 19,
  },

  botonReintentar: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 7,
    backgroundColor: C.blanco,
  },

  textoReintentar: {
    color: C.rojo,
    fontWeight: '700',
    fontSize: 12,
  },

  // Tarjeta del propietario
  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 20,
    marginBottom: 26,
    elevation: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.035,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  encabezadoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },

  textoAvatar: {
    fontSize: 21,
    fontWeight: '800',
    color: C.primario,
  },

  informacionPrincipal: {
    flex: 1,
  },

  nombrePropietario: {
    fontSize: 18,
    fontWeight: '700',
    color: C.texto,
    marginBottom: 5,
  },

  documentoPrincipal: {
    fontSize: 13,
    color: C.textoSecundario,
  },

  etiquetaRegistrado: {
    alignSelf: 'flex-start',
    marginTop: 9,
    backgroundColor: C.verdeClaro,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  textoEtiquetaRegistrado: {
    color: C.primarioOscuro,
    fontSize: 11,
    fontWeight: '700',
  },

  separador: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 21,
  },

  tituloSeccionDatos: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },

  filaDato: {
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F5',
  },

  etiquetaDato: {
    fontSize: 12,
    fontWeight: '500',
    color: C.textoSecundario,
    marginBottom: 6,
  },

  valorDato: {
    fontSize: 14,
    lineHeight: 20,
    color: C.texto,
    fontWeight: '500',
  },

  // Encabezado de mascotas
  encabezadoMascotas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  tituloMascotas: {
    fontSize: 18,
    fontWeight: '700',
    color: C.texto,
  },

  subtituloMascotas: {
    fontSize: 12,
    color: C.textoSecundario,
    marginTop: 5,
    flexShrink: 1,
  },

  contadorMascotas: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  textoContadorMascotas: {
    fontSize: 14,
    fontWeight: '800',
    color: C.primario,
  },

  // Tarjeta y filas de mascotas
  tarjetaMascotas: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 15,
    paddingHorizontal: 16,
  },

  filaMascota: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F5',
  },

  ultimaFilaMascota: {
    borderBottomWidth: 0,
  },

  iconoMascota: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: C.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  emojiMascota: {
    fontSize: 23,
  },

  datosMascota: {
    flex: 1,
    minWidth: 0,
  },

  nombreMascota: {
    fontSize: 15,
    fontWeight: '700',
    color: C.texto,
    marginBottom: 5,
  },

  detalleMascota: {
    fontSize: 12,
    color: C.textoSecundario,
  },

  historiaMascota: {
    fontSize: 11,
    color: C.primario,
    marginTop: 6,
  },

  // Botón Ver ficha de la mascota
  botonVerFichaMascota: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 8,
    backgroundColor: C.verdeClaro,
  },

  textoVerFichaMascota: {
    color: C.primario,
    fontSize: 12,
    fontWeight: '700',
  },

  flechaVerFichaMascota: {
    color: C.primario,
    fontSize: 19,
    fontWeight: '700',
    marginLeft: 7,
    lineHeight: 20,
  },

  // Estado sin mascotas
  tarjetaVacia: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 15,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  emojiVacio: {
    fontSize: 31,
    marginBottom: 10,
  },

  tituloVacio: {
    fontSize: 14,
    fontWeight: '700',
    color: C.texto,
    textAlign: 'center',
  },

  textoVacio: {
    fontSize: 12,
    lineHeight: 18,
    color: C.textoSecundario,
    textAlign: 'center',
    marginTop: 6,
  },

  // Espacio al final de la página
  espacioFinal: {
    height: 55,
  },
});
