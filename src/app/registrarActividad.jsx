
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { supabase } from '../services/supabase';
import { registrarActividadServicio } from '../services/actividadesServicio';
import EncabezadoPetCare from '../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../components/layout/MenuLateralDerecho';
import { logger } from '../utils/logger';

const C = {
  fondo: '#F4F8F7',
  verde: '#12665E',
  oscuro: '#104F49',
  claro: '#E6F4EF',
  texto: '#243746',
  secundario: '#718096',
  blanco: '#FFFFFF',
  borde: '#E0EAE7',
  rojo: '#B42318',
};

const CAMPOS_POR_TIPO = {
  medicacion: [
    { key: 'medicamento', label: 'Nombre del medicamento', placeholder: 'Nombre del medicamento' },
    { key: 'dosis', label: 'Dosis', placeholder: 'Ej. 5 mg o 2 ml' },
    { key: 'frecuencia', label: 'Frecuencia', placeholder: 'Ej. Cada 12 horas' },
    { key: 'duracion', label: 'Duración del tratamiento', placeholder: 'Ej. 7 días' },
    { key: 'via_administracion', label: 'Vía de administración', placeholder: 'Ej. Oral' },
  ],
  vacunacion: [
    { key: 'vacuna', label: 'Nombre de la vacuna', placeholder: 'Nombre de la vacuna' },
    { key: 'dosis', label: 'Dosis', placeholder: 'Ej. 1 ml' },
    { key: 'via_administracion', label: 'Vía de administración', placeholder: 'Ej. Subcutánea' },
    { key: 'lote', label: 'Lote de la vacuna', placeholder: 'Número de lote' },
  ],
  ecografia: [
    { key: 'zona', label: 'Zona a evaluar', placeholder: 'Ej. Abdomen' },
    { key: 'motivo', label: 'Motivo de la ecografía', placeholder: 'Indica el motivo' },
    { key: 'indicaciones', label: 'Indicaciones', placeholder: 'Indicaciones para el examen', multiline: true },
  ],
  esterilizacion: [
    { key: 'procedimiento', label: 'Procedimiento', placeholder: 'Ej. Ovariohisterectomía' },
    { key: 'evaluacion_preoperatoria', label: 'Evaluación preoperatoria', placeholder: 'Resultado de la evaluación', multiline: true },
    { key: 'indicaciones', label: 'Indicaciones preoperatorias', placeholder: 'Ayuno y otras indicaciones', multiline: true },
  ],
  otros: [
    { key: 'nombre_actividad', label: 'Nombre de la actividad', placeholder: 'Especifica la actividad' },
    { key: 'profesional', label: 'Profesional responsable', placeholder: 'Nombre del profesional' },
    { key: 'detalle', label: 'Detalles adicionales', placeholder: 'Describe la actividad', multiline: true },
  ],
};

// Orden de presentación y códigos existentes en Supabase.
const ORDEN_TIPOS = [
  'MEDICACION',
  'VACUNACION',
  'ECOGRAFIA',
  'ESTERILIZACION',
  'OTRO',
];

function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function claveTipo(tipo) {
  const codigo = normalizar(tipo?.codigo);
  const nombre = normalizar(tipo?.nombre);
  const texto = `${codigo} ${nombre}`;

  if (texto.includes('medicacion')) return 'medicacion';
  if (texto.includes('vacunacion')) return 'vacunacion';
  if (texto.includes('ecografia')) return 'ecografia';
  if (texto.includes('esterilizacion')) return 'esterilizacion';
  if (codigo === 'otro' || nombre === 'otro' || nombre === 'otros') {
    return 'otros';
  }

  return null;
}

function fechaActualISO() {
  const fecha = new Date();
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, '0'),
    String(fecha.getDate()).padStart(2, '0'),
  ].join('-');
}

function fechaValida(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor ?? '').trim())) {
    return false;
  }

  const [anio, mes, dia] = valor.trim().split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

export default function RegistrarActividadScreen() {
  const params = useLocalSearchParams();
  const valorId = Array.isArray(params.atencion_id)
    ? params.atencion_id[0]
    : params.atencion_id;
  const atencionId = valorId ? String(valorId) : '';

  const [tipos, setTipos] = useState([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState(null);
  const [fechaPrevista, setFechaPrevista] = useState(fechaActualISO());
  const [observaciones, setObservaciones] = useState('');
  const [detalle, setDetalle] = useState({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      try {
        const { data: sesion, error: errorSesion } =
          await supabase.auth.getUser();

        if (errorSesion) throw errorSesion;

        const usuario = sesion?.user;

        if (activo && usuario) {
          setNombreUsuario(
            usuario.user_metadata?.nombre ||
            usuario.user_metadata?.full_name ||
            usuario.email ||
            ''
          );
          setRolUsuario(usuario.user_metadata?.rol || '');
        }

        const { data, error } = await supabase
          .from('tipos_actividad')
          .select('tipo_id, codigo, nombre, activo')
          .eq('activo', true);

        if (error) throw error;

        const disponibles = (data || [])
          .filter((tipo) => ORDEN_TIPOS.includes(
            String(tipo.codigo || '').trim().toUpperCase()
          ))
          .sort((a, b) =>
            ORDEN_TIPOS.indexOf(String(a.codigo).toUpperCase()) -
            ORDEN_TIPOS.indexOf(String(b.codigo).toUpperCase())
          );

        if (activo) setTipos(disponibles);
      } catch (error) {
        logger.error('Error cargando tipos de actividad:', error);

        if (activo) {
          Alert.alert(
            'Error',
            'No se pudieron cargar los tipos de actividad. Verifica la conexión y vuelve a intentarlo.'
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarDatos();

    return () => {
      activo = false;
    };
  }, []);

  const campos = tipoSeleccionado
    ? CAMPOS_POR_TIPO[claveTipo(tipoSeleccionado)] || []
    : [];

  function seleccionarTipo(tipo) {
    if (guardando) return;

    setTipoSeleccionado(tipo);
    setDetalle({});
  }

  function actualizarDetalle(campo, valor) {
    setDetalle((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  async function guardarActividad() {
    if (guardando) return;

    if (!atencionId || !/^\d+$/.test(atencionId)) {
      Alert.alert(
        'Atención requerida',
        'No se recibió un identificador válido de la atención.'
      );
      return;
    }

    if (!tipoSeleccionado) {
      Alert.alert('Campo requerido', 'Selecciona un tipo de actividad.');
      return;
    }

    if (!fechaValida(fechaPrevista)) {
      Alert.alert(
        'Fecha no válida',
        'Ingresa una fecha real con el formato AAAA-MM-DD.'
      );
      return;
    }

    if (campos.length === 0) {
      Alert.alert('Error', 'Este tipo de actividad no tiene campos configurados.');
      return;
    }

    const faltante = campos.find(
      (campo) => !String(detalle[campo.key] ?? '').trim()
    );

    if (faltante) {
      Alert.alert('Campo requerido', `Completa: ${faltante.label}.`);
      return;
    }

    if (!observaciones.trim()) {
      Alert.alert(
        'Campo requerido',
        'Ingresa las observaciones generales de la actividad.'
      );
      return;
    }

    const tipoId = Number(tipoSeleccionado.tipo_id);

    if (!Number.isSafeInteger(tipoId) || tipoId <= 0) {
      Alert.alert('Error', 'El identificador del tipo de actividad no es válido.');
      return;
    }

    const detalleLimpio = {};

    campos.forEach((campo) => {
      detalleLimpio[campo.key] = String(detalle[campo.key] ?? '').trim();
    });

    setGuardando(true);

    try {
      await registrarActividadServicio({
        atencion_id: atencionId,
        tipo_id: tipoId,
        tipo: tipoSeleccionado.nombre,
        fecha_prevista: fechaPrevista.trim(),
        observaciones: observaciones.trim(),
        detalle: detalleLimpio,
      });

      Alert.alert(
        'Actividad registrada',
        'La actividad se registró correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: () => router.replace({
              pathname: '/detalleAtencion',
              params: { atencion_id: atencionId },
            }),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      logger.error('Error registrando actividad:', error);
      Alert.alert(
        'No se pudo registrar',
        error?.message || 'Ocurrió un error al registrar la actividad.'
      );
    } finally {
      setGuardando(false);
    }
  }

  async function cerrarSesion() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      setMenuAbierto(false);
      router.replace('/login');
    } catch (error) {
      logger.error('Error cerrando sesión:', error);
      Alert.alert('Error', 'No se pudo cerrar la sesión.');
    }
  }

  return (
    <SafeAreaView style={s.contenedor}>
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() =>
          Alert.alert('Notificaciones', 'No tienes notificaciones nuevas.')
        }
      />

      <ScrollView
        contentContainerStyle={s.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={s.migas}
          onPress={() => router.replace('/atenciones')}
        >
          Atenciones / Registrar actividad
        </Text>

        <Text style={s.titulo}>Actividades de la atención</Text>
        <Text style={s.subtitulo}>
          Selecciona el procedimiento y completa sus datos específicos.
        </Text>

        <View style={s.tarjeta}>
          <Text style={s.etiqueta}>Atención asociada</Text>
          <View style={s.atencion}>
            <Text style={s.atencionTexto}>
              {atencionId
                ? `Atención N.º ${atencionId}`
                : 'No se recibió una atención'}
            </Text>
          </View>

          <Text style={s.etiqueta}>Selecciona el tipo *</Text>

          {cargando ? (
            <ActivityIndicator color={C.verde} style={s.cargando} />
          ) : tipos.length === 0 ? (
            <Text style={s.error}>
              No se encontraron tipos activos. Verifica los códigos MEDICACION,
              VACUNACION, ECOGRAFIA, ESTERILIZACION y OTRO en Supabase.
            </Text>
          ) : (
            <View style={s.tipos}>
              {tipos.map((tipo) => {
                const seleccionado =
                  String(tipoSeleccionado?.tipo_id) === String(tipo.tipo_id);

                return (
                  <Pressable
                    key={String(tipo.tipo_id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: seleccionado }}
                    onPress={() => seleccionarTipo(tipo)}
                    disabled={guardando}
                    style={[s.tipo, seleccionado && s.tipoActivo]}
                  >
                    <View style={[s.radio, seleccionado && s.radioActivo]}>
                      {seleccionado && <View style={s.radioCentro} />}
                    </View>
                    <Text style={[s.tipoTexto, seleccionado && s.tipoTextoActivo]}>
                      {tipo.codigo === 'OTRO' ? 'Otros' : tipo.nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {tipoSeleccionado && (
            <>
              <View style={s.seccion}>
                <Text style={s.seccionTitulo}>
                  Datos de {tipoSeleccionado.codigo === 'OTRO'
                    ? 'Otros'
                    : tipoSeleccionado.nombre}
                </Text>
                <Text style={s.ayuda}>
                  Completa los campos específicos de este procedimiento.
                </Text>
              </View>

              {campos.map((campo) => (
                <View key={campo.key}>
                  <Text style={s.etiqueta}>{campo.label} *</Text>
                  <TextInput
                    value={detalle[campo.key] || ''}
                    onChangeText={(valor) => actualizarDetalle(campo.key, valor)}
                    placeholder={campo.placeholder}
                    placeholderTextColor={C.secundario}
                    style={[s.input, campo.multiline && s.multilinea]}
                    multiline={Boolean(campo.multiline)}
                    textAlignVertical={campo.multiline ? 'top' : 'center'}
                    accessibilityLabel={campo.label}
                    editable={!guardando}
                  />
                </View>
              ))}
            </>
          )}

          <Text style={s.etiqueta}>Fecha prevista * (AAAA-MM-DD)</Text>
          <TextInput
            value={fechaPrevista}
            onChangeText={setFechaPrevista}
            placeholder="2026-10-30"
            placeholderTextColor={C.secundario}
            style={s.input}
            autoCapitalize="none"
            editable={!guardando}
          />

          <Text style={s.etiqueta}>Observaciones generales *</Text>
          <TextInput
            value={observaciones}
            onChangeText={setObservaciones}
            placeholder="Observaciones adicionales de la actividad"
            placeholderTextColor={C.secundario}
            style={[s.input, s.multilinea]}
            multiline
            textAlignVertical="top"
            maxLength={1000}
            editable={!guardando}
          />
          <Text style={s.contador}>{observaciones.length}/1000 caracteres</Text>

          <Pressable
            style={[
              s.guardar,
              (guardando || cargando || !atencionId) && s.deshabilitado,
            ]}
            onPress={guardarActividad}
            disabled={guardando || cargando || !atencionId}
            accessibilityRole="button"
          >
            {guardando ? (
              <ActivityIndicator color={C.blanco} />
            ) : (
              <Text style={s.guardarTexto}>Registrar actividad</Text>
            )}
          </Pressable>

          <Pressable
            style={s.cancelar}
            onPress={() => atencionId
              ? router.replace({
                  pathname: '/detalleAtencion',
                  params: { atencion_id: atencionId },
                })
              : router.back()}
            disabled={guardando}
            accessibilityRole="button"
          >
            <Text style={s.cancelarTexto}>Cancelar</Text>
          </Pressable>
        </View>

        <Text style={s.pie}>PetCare · Seguimiento de atención veterinaria</Text>
      </ScrollView>

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

const s = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: C.fondo },
  contenido: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36 },
  migas: { color: C.verde, fontSize: 13, marginBottom: 18 },
  titulo: { color: C.texto, fontSize: 26, fontWeight: '800' },
  subtitulo: { color: C.secundario, fontSize: 14, lineHeight: 21, marginTop: 7, marginBottom: 20 },
  tarjeta: { backgroundColor: C.blanco, borderRadius: 16, borderWidth: 1, borderColor: C.borde, padding: 18 },
  etiqueta: { color: C.texto, fontSize: 14, fontWeight: '700', marginTop: 18, marginBottom: 8 },
  atencion: { backgroundColor: C.claro, borderRadius: 10, padding: 13 },
  atencionTexto: { color: C.oscuro, fontSize: 15, fontWeight: '700' },
  cargando: { margin: 20 },
  tipos: { gap: 9 },
  tipo: { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 10, borderWidth: 1, borderColor: C.borde },
  tipoActivo: { backgroundColor: C.claro, borderColor: C.verde },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: C.secundario, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  radioActivo: { borderColor: C.verde },
  radioCentro: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.verde },
  tipoTexto: { color: C.texto, fontSize: 14, flex: 1 },
  tipoTextoActivo: { color: C.oscuro, fontWeight: '700' },
  seccion: { marginTop: 22, padding: 13, borderRadius: 10, backgroundColor: C.claro },
  seccionTitulo: { color: C.oscuro, fontSize: 16, fontWeight: '800' },
  ayuda: { color: C.secundario, fontSize: 12, marginTop: 5 },
  input: { borderWidth: 1, borderColor: C.borde, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 12, color: C.texto, backgroundColor: C.blanco, fontSize: 14 },
  multilinea: { minHeight: 90 },
  contador: { color: C.secundario, fontSize: 12, textAlign: 'right', marginTop: 5 },
  error: { color: C.rojo, fontSize: 13, lineHeight: 20 },
  guardar: { backgroundColor: C.verde, borderRadius: 10, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 25 },
  deshabilitado: { opacity: 0.65 },
  guardarTexto: { color: C.blanco, fontSize: 15, fontWeight: '700' },
  cancelar: { borderWidth: 1, borderColor: C.borde, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 10 },
  cancelarTexto: { color: C.texto, fontSize: 14, fontWeight: '600' },
  pie: { color: C.secundario, fontSize: 12, textAlign: 'center', marginTop: 25 },
});
