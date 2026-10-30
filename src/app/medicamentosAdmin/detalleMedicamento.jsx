
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../services/supabase';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import {
  consultarMedicamentoPorId,
  desactivarMedicamento,
  reactivarMedicamento,
} from '../../services/administracion/medicamentosService';
import { logger } from '../../utils/logger';

const C = {
  primario: '#187C72',
  primarioOscuro: '#12665E',
  fondo: '#F5F8F8',
  blanco: '#FFFFFF',
  texto: '#243746',
  secundario: '#72818D',
  borde: '#E1E9E7',
  verde: '#25834B',
  verdeFondo: '#E8F6EC',
  rojo: '#B42318',
  rojoFondo: '#FDECEC',
};

function formatearFecha(fecha) {
  if (!fecha) return 'No registrada';

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) return 'No registrada';

  return valor.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function FilaDato({ etiqueta, valor }) {
  const mostrar =
    valor !== null &&
    valor !== undefined &&
    String(valor).trim() !== '';

  return (
    <View style={styles.filaDato}>
      <Text style={styles.etiquetaDato}>{etiqueta}</Text>
      <Text style={styles.valorDato}>
        {mostrar ? String(valor) : 'No registrado'}
      </Text>
    </View>
  );
}

export default function DetalleMedicamento() {
  const { id } = useLocalSearchParams();

  const [medicamento, setMedicamento] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
  const [rolUsuario, setRolUsuario] = useState('Administrador');
  const [modalVisible, setModalVisible] = useState(false);

  const cargarPerfil = useCallback(async () => {
    const {
      data: { user },
      error: errorUsuario,
    } = await supabase.auth.getUser();

    if (errorUsuario) throw errorUsuario;

    if (!user) {
      router.replace('/');
      return;
    }

    const { data, error: errorPerfil } = await supabase
      .from('perfiles')
      .select('nombre_completo, rol, estado_cuenta')
      .eq('perfil_id', user.id)
      .single();

    if (errorPerfil) throw errorPerfil;

    if (
      String(data.estado_cuenta || '').trim().toLowerCase() !== 'activo'
    ) {
      await supabase.auth.signOut();
      Alert.alert('Cuenta inactiva', 'Tu cuenta no se encuentra activa.');
      router.replace('/');
      return;
    }

    setNombreUsuario(data.nombre_completo || 'Usuario');
    setRolUsuario(data.rol || 'Asistente');
  }, []);

  const cargarDetalle = useCallback(async () => {
    try {
      setCargando(true);
      setError('');

      if (!id || Array.isArray(id) || !/^\d+$/.test(String(id))) {
        throw new Error('El identificador del medicamento no es válido.');
      }

      const resultado = await consultarMedicamentoPorId(Number(id));

      if (!resultado) {
        throw new Error('No se encontró el medicamento solicitado.');
      }

      setMedicamento(resultado);
    } catch (e) {
      logger.error('Error al consultar el medicamento:', e);
      setError(
        e?.message || 'No se pudo cargar la información del medicamento.'
      );
    } finally {
      setCargando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      const inicializar = async () => {
        try {
          await cargarPerfil();

          if (activo) {
            await cargarDetalle();
          }
        } catch (e) {
          logger.error('Error al inicializar detalle:', e);
          if (activo) {
            setError(e?.message || 'No se pudo cargar la pantalla.');
            setCargando(false);
          }
        }
      };

      inicializar();

      return () => {
        activo = false;
      };
    }, [cargarPerfil, cargarDetalle])
  );

  const esAdministrador =
    String(rolUsuario).trim().toLowerCase() === 'administrador';

  const activo = medicamento?.activo === true;

  const solicitarCambioEstado = () => {
    if (!esAdministrador) {
      Alert.alert(
        'Acceso restringido',
        'Solo un administrador puede cambiar el estado del medicamento.'
      );
      return;
    }

    setModalVisible(true);
  };

  const confirmarCambioEstado = async () => {
    if (!medicamento || procesando) return;

    try {
      setProcesando(true);

      // RF52 — La operación se delega al servicio y al DAO.
      const resultado = activo
        ? await desactivarMedicamento(medicamento.medicamento_id, true)
        : await reactivarMedicamento(medicamento.medicamento_id, true);

      if (resultado?.cancelado) {
        setModalVisible(false);
        return;
      }

      if (!resultado?.medicamento) {
        throw new Error('No se recibió confirmación del cambio de estado.');
      }

      setMedicamento(resultado.medicamento);
      setModalVisible(false);

      Alert.alert(
        'Operación completada',
        activo
          ? 'El medicamento se desactivó correctamente.'
          : 'El medicamento se reactivó correctamente.'
      );
    } catch (e) {
      logger.error('Error al cambiar el estado:', e);

      setModalVisible(false);

      Alert.alert(
        'No se pudo completar',
        e?.message || 'No se pudo actualizar el estado del medicamento.'
      );
    } finally {
      setProcesando(false);
    }
  };

  const cerrarSesion = async () => {
    try {
      const { error: errorSesion } = await supabase.auth.signOut();

      if (errorSesion) throw errorSesion;

      setMenuAbierto(false);
      router.replace('/');
    } catch (e) {
      Alert.alert('Error', 'No se pudo cerrar la sesión.');
    }
  };

  const volverAlListado = () => {
    router.replace('/medicamentosAdmin/medicamentos');
  };

  const abrirEdicion = () => {
    if (!medicamento) return;

    if (!esAdministrador) {
      Alert.alert(
        'Acceso restringido',
        'Solo un administrador puede editar medicamentos.'
      );
      return;
    }
    router.push({
      pathname: '/medicamentosAdmin/editarMedicamento',
      params: {
        id: String(medicamento.medicamento_id),
      },
    });
  };

  return (
    <SafeAreaView style={styles.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor={C.blanco} />

      <EncabezadoPetCare
        nombreUsuario={nombreUsuario}
        rolUsuario={rolUsuario}
        onAbrirMenu={() => setMenuAbierto(true)}
      />

      <View style={styles.contenido}>
        <View style={styles.migas}>
          <Text
            style={styles.enlaceMiga}
            onPress={() => router.replace('/inicio')}
          >
            Inicio
          </Text>
          <Text style={styles.separador}> / </Text>
          <Text
            style={styles.enlaceMiga}
            onPress={() => router.replace('/administracion')}
          >
            Administración
          </Text>
          <Text style={styles.separador}> / </Text>
          <Text
            style={styles.enlaceMiga}
            onPress={volverAlListado}
          >
            Medicamentos
          </Text>
          <Text style={styles.separador}> / </Text>
          <Text style={styles.migaActual}>Detalle</Text>
        </View>

        <View style={styles.encabezadoPagina}>
          <TouchableOpacity
            style={styles.botonVolver}
            onPress={volverAlListado}
            accessibilityLabel="Volver al listado de medicamentos"
          >
            <Text style={styles.flechaVolver}>‹</Text>
          </TouchableOpacity>

          <View style={styles.bloqueTitulo}>
            <Text style={styles.titulo}>Detalle del medicamento</Text>
            <Text style={styles.subtitulo}>
              Información registrada en el catálogo de PetCare.
            </Text>
          </View>
        </View>

        {cargando ? (
          <View style={styles.estadoCarga}>
            <ActivityIndicator size="large" color={C.primario} />
            <Text style={styles.textoEstado}>
              Cargando información del medicamento...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.estadoVacio}>
            <Text style={styles.tituloEstado}>
              No se pudo cargar el medicamento
            </Text>
            <Text style={styles.textoEstado}>{error}</Text>
            <TouchableOpacity
              style={styles.botonPrimario}
              onPress={cargarDetalle}
            >
              <Text style={styles.textoBotonPrimario}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : medicamento ? (
          <ScrollView
            style={styles.lista}
            contentContainerStyle={styles.contenidoFicha}
          >
            <View style={styles.ficha}>
              <View style={styles.iconoFicha}>
                <Text style={styles.iconoTexto}>💊</Text>
              </View>

              <Text style={styles.nombreFicha}>
                {medicamento.nombre_medicamento || 'Medicamento sin nombre'}
              </Text>

              <View
                style={[
                  styles.etiquetaEstado,
                  activo ? styles.estadoActivo : styles.estadoInactivo,
                ]}
              >
                <View
                  style={[
                    styles.puntoEstado,
                    { backgroundColor: activo ? C.verde : C.rojo },
                  ]}
                />
                <Text
                  style={[
                    styles.textoEstadoEtiqueta,
                    { color: activo ? C.verde : C.rojo },
                  ]}
                >
                  {activo ? 'Activo' : 'Desactivado'}
                </Text>
              </View>

              <View style={styles.separadorFicha} />

              <Text style={styles.tituloSeccion}>
                Información del medicamento
              </Text>

              <FilaDato
                etiqueta="Código"
                valor={medicamento.medicamento_id}
              />
              <FilaDato
                etiqueta="Nombre"
                valor={medicamento.nombre_medicamento}
              />
              <FilaDato
                etiqueta="Concentración"
                valor={medicamento.concentracion}
              />
              <FilaDato
                etiqueta="Categoría"
                valor={medicamento.categoria}
              />
              <FilaDato
                etiqueta="Fecha de registro"
                valor={formatearFecha(medicamento.fecha_registro)}
              />
              <FilaDato
                etiqueta="Estado"
                valor={activo ? 'Activo' : 'Desactivado'}
              />

              {esAdministrador && (
                <View style={styles.acciones}>
                  {activo && (
                    <TouchableOpacity
                      style={styles.botonEditar}
                      onPress={abrirEdicion}
                    >
                      <Text style={styles.textoBotonEditar}>Editar</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.botonEstado,
                      activo ? styles.botonDesactivar : styles.botonReactivar,
                    ]}
                    onPress={solicitarCambioEstado}
                    disabled={procesando}
                  >
                    <Text
                      style={[
                        styles.textoBotonEstado,
                        {
                          color: activo ? C.rojo : C.verde,
                        },
                      ]}
                    >
                      {activo ? 'Desactivar medicamento' : 'Reactivar medicamento'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        ) : null}
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!procesando) setModalVisible(false);
        }}
      >
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <View
              style={[
                styles.modalIcono,
                activo ? styles.modalIconoRojo : styles.modalIconoVerde,
              ]}
            >
              <Text
                style={[
                  styles.modalIconoTexto,
                  { color: activo ? C.rojo : C.verde },
                ]}
              >
                {activo ? '!' : '✓'}
              </Text>
            </View>

            <Text style={styles.modalTitulo}>
              {activo ? 'Desactivar medicamento' : 'Reactivar medicamento'}
            </Text>

            <Text style={styles.modalDescripcion}>
              {activo
                ? `¿Deseas desactivar ${medicamento?.nombre_medicamento}? El registro se conservará en el catálogo.`
                : `¿Deseas reactivar ${medicamento?.nombre_medicamento}? Volverá a estar disponible como medicamento activo.`}
            </Text>

            <View style={styles.modalAcciones}>
              <TouchableOpacity
                style={[styles.modalBoton, styles.modalCancelar]}
                onPress={() => setModalVisible(false)}
                disabled={procesando}
              >
                <Text style={styles.textoCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalBoton,
                  activo ? styles.modalConfirmarRojo : styles.modalConfirmarVerde,
                ]}
                onPress={confirmarCambioEstado}
                disabled={procesando}
              >
                {procesando ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <Text style={styles.textoConfirmar}>
                    {activo ? 'Desactivar' : 'Reactivar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        nombreUsuario={nombreUsuario}
        rolUsuario={rolUsuario}
        onCerrarSesion={cerrarSesion}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.fondo },
  contenido: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  migas: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  enlaceMiga: { color: C.primario, fontSize: 13, fontWeight: '600' },
  separador: { color: C.secundario, fontSize: 13 },
  migaActual: { color: C.secundario, fontSize: 13 },
  encabezadoPagina: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 18,
  },
  botonVolver: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flechaVolver: {
    color: C.primario,
    fontSize: 34,
    lineHeight: 38,
    marginTop: -3,
  },
  bloqueTitulo: { flex: 1 },
  titulo: { color: C.texto, fontSize: 23, fontWeight: '800' },
  subtitulo: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },
  lista: { flex: 1 },
  contenidoFicha: { paddingBottom: 28 },
  ficha: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  iconoFicha: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2F2EE',
  },
  iconoTexto: { fontSize: 32 },
  nombreFicha: {
    color: C.texto,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  etiquetaEstado: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 12,
  },
  estadoActivo: { backgroundColor: C.verdeFondo },
  estadoInactivo: { backgroundColor: C.rojoFondo },
  puntoEstado: { width: 7, height: 7, borderRadius: 4 },
  textoEstadoEtiqueta: { fontSize: 12, fontWeight: '800' },
  separadorFicha: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 20,
  },
  tituloSeccion: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  filaDato: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F1',
  },
  etiquetaDato: { flex: 1, color: C.secundario, fontSize: 13 },
  valorDato: {
    flex: 1,
    color: C.texto,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  acciones: { gap: 10, marginTop: 22 },
  botonEditar: {
    minHeight: 47,
    borderRadius: 10,
    backgroundColor: C.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotonEditar: { color: C.blanco, fontSize: 14, fontWeight: '800' },
  botonEstado: {
    minHeight: 47,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonDesactivar: {
    backgroundColor: C.rojoFondo,
    borderColor: '#F5C7C4',
  },
  botonReactivar: {
    backgroundColor: C.verdeFondo,
    borderColor: '#B7E2C4',
  },
  textoBotonEstado: { fontSize: 14, fontWeight: '800' },
  estadoCarga: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  textoEstado: {
    color: C.secundario,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  estadoVacio: {
    backgroundColor: C.blanco,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    padding: 24,
  },
  tituloEstado: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  botonPrimario: {
    backgroundColor: C.primario,
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 15,
  },
  textoBotonPrimario: { color: C.blanco, fontSize: 12, fontWeight: '700' },
  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(20,35,40,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  modalCaja: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: C.blanco,
    borderRadius: 18,
    padding: 22,
  },
  modalIcono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalIconoRojo: { backgroundColor: C.rojoFondo },
  modalIconoVerde: { backgroundColor: C.verdeFondo },
  modalIconoTexto: { fontSize: 26, fontWeight: '800' },
  modalTitulo: {
    color: C.texto,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalDescripcion: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  modalAcciones: { flexDirection: 'row', gap: 10 },
  modalBoton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelar: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
  },
  modalConfirmarRojo: { backgroundColor: C.rojo },
  modalConfirmarVerde: { backgroundColor: C.verde },
  textoCancelar: { color: C.texto, fontSize: 14, fontWeight: '700' },
  textoConfirmar: {
    color: C.blanco,
    fontSize: 14,
    fontWeight: '800',
  },
});
