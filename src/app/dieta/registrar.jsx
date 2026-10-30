
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
import { supabase } from '../../services/supabase';
import {
  obtenerRecetasDisponiblesParaDietaServicio,
  registrarDietaServicio,
} from '../../services/dieta/dietaServicio';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import { logger } from '../../utils/logger';

const C = {
  fondo: '#F4F8F7',
  verde: '#12665E',
  oscuro: '#104F49',
  claro: '#E6F4EF',
  texto: '#243746',
  secundario: '#718096',
  blanco: '#FFFFFF',
  borde: '#E0EAE7',
};

export default function RegistrarDietaScreen() {
  const params = useLocalSearchParams();
  const atencionId = String(
    Array.isArray(params.atencion_id)
      ? params.atencion_id[0]
      : params.atencion_id || ''
  );

  const recetaParam = Array.isArray(params.receta_id)
    ? params.receta_id[0]
    : params.receta_id;

  const [recetas, setRecetas] = useState([]);
  const [recetaId, setRecetaId] = useState(recetaParam ? String(recetaParam) : '');
  const [datos, setDatos] = useState({
    tipo_dieta: '',
    opciones_proteina: '',
    opciones_vegetales: '',
    restriccion_nutricional: '',
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const { data: usuarioData } = await supabase.auth.getUser();
        const usuario = usuarioData?.user;

        if (activo && usuario) {
          setNombreUsuario(
            usuario.user_metadata?.nombre ||
            usuario.user_metadata?.full_name ||
            usuario.email ||
            ''
          );
          setRolUsuario(usuario.user_metadata?.rol || '');
        }

        const lista = await obtenerRecetasDisponiblesParaDietaServicio(atencionId);

        if (activo) setRecetas(lista);
      } catch (error) {
        logger.error('Error cargando recetas para dieta:', error);
        Alert.alert('Error', error.message || 'No se pudieron cargar las recetas.');
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargar();

    return () => {
      activo = false;
    };
  }, [atencionId]);

  function cambiar(campo, valor) {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardar() {
    if (guardando) return;

    if (!recetaId) {
      Alert.alert('Campo requerido', 'Selecciona una receta.');
      return;
    }

    if (!datos.tipo_dieta.trim()) {
      Alert.alert('Campo requerido', 'Ingresa el tipo de dieta.');
      return;
    }

    setGuardando(true);

    try {
      const dieta = await registrarDietaServicio({
        receta_id: recetaId,
        ...datos,
      });

      Alert.alert(
        'Dieta registrada',
        'La dieta se registró correctamente.',
        [{
          text: 'Aceptar',
          onPress: () => router.replace({
            pathname: '/dieta/detalle',
            params: {
              dieta_id: String(dieta.dieta_id),
              receta_id: recetaId,
              atencion_id: atencionId,
            },
          }),
        }],
        { cancelable: false }
      );
    } catch (error) {
      logger.error('Error registrando dieta:', error);
      Alert.alert('No se pudo registrar', error.message || 'Ocurrió un error.');
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
    } catch {
      Alert.alert('Error', 'No se pudo cerrar la sesión.');
    }
  }

  const campo = (label, key, placeholder, multiline = false) => (
    <View key={key}>
      <Text style={s.etiqueta}>{label}</Text>
      <TextInput
        value={datos[key]}
        onChangeText={(v) => cambiar(key, v)}
        placeholder={placeholder}
        placeholderTextColor={C.secundario}
        style={[s.input, multiline && s.multilinea]}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        editable={!guardando}
      />
    </View>
  );

  return (
    <SafeAreaView style={s.contenedor}>
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() => Alert.alert('Notificaciones', 'No tienes notificaciones nuevas.')}
      />

      <ScrollView contentContainerStyle={s.contenido} keyboardShouldPersistTaps="handled">
        <Text style={s.migas} onPress={() => router.back()}>
          Atención / Registrar dieta
        </Text>

        <Text style={s.titulo}>Plan alimenticio</Text>
        <Text style={s.subtitulo}>Registra las indicaciones nutricionales de la mascota.</Text>

        {cargando ? (
          <ActivityIndicator color={C.verde} size="large" />
        ) : (
          <View style={s.tarjeta}>
            <Text style={s.etiqueta}>Receta asociada *</Text>

            {recetas.length === 0 ? (
              <Text style={s.error}>
                No hay recetas disponibles para esta atención. Registra primero una receta médica.
              </Text>
            ) : (
              recetas.map((r) => (
                <Pressable
                  key={String(r.receta_id)}
                  onPress={() => setRecetaId(String(r.receta_id))}
                  style={[
                    s.opcion,
                    recetaId === String(r.receta_id) && s.opcionActiva,
                  ]}
                >
                  <Text style={s.opcionTexto}>
                    Receta médica N.º {r.receta_id}
                  </Text>
                  <Text style={s.ayuda}>
                    {r.diagnostico || 'Sin diagnóstico registrado'}
                  </Text>
                </Pressable>
              ))
            )}

            {campo('Tipo de dieta *', 'tipo_dieta', 'Ej. Dieta renal, gastrointestinal, natural')}
            {campo('Opciones de proteínas', 'opciones_proteina', 'Ej. Pollo cocido, pescado', true)}
            {campo('Opciones de vegetales', 'opciones_vegetales', 'Ej. Zanahoria, zapallo', true)}
            {campo('Restricción nutricional', 'restriccion_nutricional', 'Alimentos que debe evitar', true)}

            <Pressable
              style={[s.guardar, (guardando || recetas.length === 0) && s.deshabilitado]}
              onPress={guardar}
              disabled={guardando || recetas.length === 0}
            >
              {guardando
                ? <ActivityIndicator color={C.blanco} />
                : <Text style={s.guardarTexto}>Registrar dieta</Text>}
            </Pressable>

            <Pressable style={s.cancelar} onPress={() => router.back()} disabled={guardando}>
              <Text style={s.cancelarTexto}>Cancelar</Text>
            </Pressable>
          </View>
        )}

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
  contenido: { padding: 20, paddingBottom: 36 },
  migas: { color: C.verde, marginBottom: 16 },
  titulo: { color: C.texto, fontSize: 26, fontWeight: '800' },
  subtitulo: { color: C.secundario, marginTop: 7, marginBottom: 18, lineHeight: 21 },
  tarjeta: { backgroundColor: C.blanco, borderRadius: 16, borderWidth: 1, borderColor: C.borde, padding: 17 },
  etiqueta: { color: C.texto, fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: C.borde, borderRadius: 10, padding: 12, color: C.texto, marginBottom: 9 },
  multilinea: { minHeight: 85 },
  opcion: { borderWidth: 1, borderColor: C.borde, padding: 12, borderRadius: 9, marginBottom: 8 },
  opcionActiva: { borderColor: C.verde, backgroundColor: C.claro },
  opcionTexto: { color: C.texto, fontWeight: '700' },
  ayuda: { color: C.secundario, fontSize: 12, marginTop: 5 },
  error: { color: '#B42318', marginVertical: 10, lineHeight: 20 },
  guardar: { backgroundColor: C.verde, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  deshabilitado: { opacity: 0.6 },
  guardarTexto: { color: C.blanco, fontWeight: '800' },
  cancelar: { borderWidth: 1, borderColor: C.borde, padding: 13, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  cancelarTexto: { color: C.texto, fontWeight: '700' },
  pie: { color: C.secundario, textAlign: 'center', fontSize: 12, marginTop: 24 },
});
