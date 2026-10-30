
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
  registrarConsultaYRecetaServicio,
  obtenerMedicamentosServicio,
  registrarMedicamentosRecetaServicio,
} from '../../services/recetas/recetasServicio';

import EncabezadoPetCareModulo from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerechoModulo from '../../components/layout/MenuLateralDerecho';
import { logger } from '../../utils/logger';

const EncabezadoPetCare =
  EncabezadoPetCareModulo?.default || EncabezadoPetCareModulo;

const MenuLateralDerecho =
  MenuLateralDerechoModulo?.default || MenuLateralDerechoModulo;

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

const fechaActual = () => {
  const f = new Date();

  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(
    f.getDate()
  ).padStart(2, '0')}`;
};

export default function RegistrarRecetaScreen() {
  const params = useLocalSearchParams();

  const atencionId = String(
    Array.isArray(params.atencion_id)
      ? params.atencion_id[0]
      : params.atencion_id || ''
  );

  const [tipoConsultaId, setTipoConsultaId] = useState(null);
  const [medicamentosDisponibles, setMedicamentosDisponibles] = useState([]);
  const [medicamentoSeleccionado, setMedicamentoSeleccionado] = useState('');
  const [medicamentos, setMedicamentos] = useState([]);

  const [datos, setDatos] = useState({
    fecha_prevista: fechaActual(),
    motivo_consulta: '',
    sintomas: '',
    diagnostico: '',
    peso: '',
    temperatura: '',
    recomendaciones: '',
    proxima_cita: '',
    observaciones: '',
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
        const { data: usuarioData, error: errorUsuario } =
          await supabase.auth.getUser();

        if (errorUsuario) throw errorUsuario;

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

        const { data: tipo, error } = await supabase
          .from('tipos_actividad')
          .select('tipo_id, codigo, nombre')
          .eq('activo', true)
          .eq('codigo', 'CONSULTA')
          .maybeSingle();

        if (error) throw error;

        if (!tipo) {
          throw new Error('El tipo CONSULTA no está activo.');
        }

        const listaMedicamentos = await obtenerMedicamentosServicio();

        if (activo) {
          setTipoConsultaId(tipo.tipo_id);
          setMedicamentosDisponibles(listaMedicamentos || []);
        }
      } catch (error) {
        logger.error('Error cargando formulario de receta:', error);

        Alert.alert(
          'Error',
          error.message || 'No se pudo cargar el formulario.'
        );
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargar();

    return () => {
      activo = false;
    };
  }, []);

  function cambiar(campo, valor) {
    setDatos((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function agregarMedicamento() {
    if (!medicamentoSeleccionado) {
      Alert.alert('Campo requerido', 'Selecciona un medicamento.');
      return;
    }

    if (
      medicamentos.some(
        (m) =>
          String(m.medicamento_id) === String(medicamentoSeleccionado)
      )
    ) {
      Alert.alert(
        'Medicamento agregado',
        'Ese medicamento ya está en la lista.'
      );
      return;
    }

    const medicamento = medicamentosDisponibles.find(
      (m) =>
        String(m.medicamento_id) === String(medicamentoSeleccionado)
    );

    if (!medicamento) return;

    setMedicamentos((actual) => [
      ...actual,
      {
        medicamento_id: medicamento.medicamento_id,
        nombre_medicamento: medicamento.nombre_medicamento,
        concentracion: medicamento.concentracion,
        dosis: '',
        condicion_ingesta: '',
        frecuencia: '',
        duracion_tratamiento: '',
      },
    ]);

    setMedicamentoSeleccionado('');
  }

  function actualizarMedicamento(indice, campo, valor) {
    setMedicamentos((actual) =>
      actual.map((item, i) =>
        i === indice ? { ...item, [campo]: valor } : item
      )
    );
  }

  function quitarMedicamento(indice) {
    setMedicamentos((actual) =>
      actual.filter((_, i) => i !== indice)
    );
  }

  async function guardar() {
    if (guardando) return;

    if (!/^\d+$/.test(atencionId)) {
      Alert.alert(
        'Atención no válida',
        'No se recibió una atención válida.'
      );
      return;
    }

    if (!tipoConsultaId) {
      Alert.alert(
        'Error',
        'No se encontró el tipo de actividad Consulta.'
      );
      return;
    }

    if (
      datos.fecha_prevista &&
      !/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha_prevista)
    ) {
      Alert.alert(
        'Fecha no válida',
        'Utiliza el formato AAAA-MM-DD.'
      );
      return;
    }

    if (datos.proxima_cita && !/^\d{4}-\d{2}-\d{2}$/.test(datos.proxima_cita)) {
      Alert.alert(
        'Fecha no válida',
        'La próxima cita debe tener el formato AAAA-MM-DD.'
      );
      return;
    }

    if (
      medicamentos.some(
        (m) => !String(m.dosis || '').trim()
      )
    ) {
      Alert.alert(
        'Campo requerido',
        'Completa la dosis de cada medicamento.'
      );
      return;
    }

    setGuardando(true);

    try {
      const resultado = await registrarConsultaYRecetaServicio({
        atencion_id: atencionId,
        tipo_id: tipoConsultaId,
        ...datos,
      });

      if (!resultado?.receta_id) {
        throw new Error(
          'No se recibió el identificador de la receta registrada.'
        );
      }

      if (medicamentos.length > 0) {
        await registrarMedicamentosRecetaServicio(
          resultado.receta_id,
          medicamentos
        );
      }

      Alert.alert(
        'Receta registrada',
        'La consulta y la receta médica se registraron correctamente.',
        [
          {
            text: 'Aceptar',
            onPress: () =>
              router.replace({
                pathname: '/recetas/detalle',
                params: {
                  receta_id: String(resultado.receta_id),
                  atencion_id: atencionId,
                },
              }),
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      logger.error('Error guardando receta:', error);

      Alert.alert(
        'No se pudo completar el registro',
        error.message || 'Ocurrió un error al guardar la receta.'
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

      Alert.alert(
        'Error',
        'No se pudo cerrar la sesión.'
      );
    }
  }

  const campo = (
    label,
    key,
    placeholder,
    multiline = false,
    keyboardType = 'default'
  ) => (
    <View key={key}>
      <Text style={s.etiqueta}>{label}</Text>

      <TextInput
        value={datos[key]}
        onChangeText={(valor) => cambiar(key, valor)}
        placeholder={placeholder}
        placeholderTextColor={C.secundario}
        style={[s.input, multiline && s.multilinea]}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType}
        editable={!guardando}
      />
    </View>
  );

  return (
    <SafeAreaView style={s.contenedor}>
      {typeof EncabezadoPetCare === 'function' ? (
        <EncabezadoPetCare
          titulo="PetCare"
          onAbrirMenu={() => setMenuAbierto(true)}
          onAbrirNotificaciones={() =>
            Alert.alert(
              'Notificaciones',
              'No tienes notificaciones nuevas.'
            )
          }
        />
      ) : (
        <View style={s.encabezadoAlternativo}>
          <Text style={s.encabezadoTexto}>PetCare</Text>
          <Pressable onPress={() => setMenuAbierto(true)}>
            <Text style={s.encabezadoBoton}>☰</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={s.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={s.migas}
          onPress={() =>
            router.replace({
              pathname: '/detalleAtencion',
              params: { atencion_id: atencionId },
            })
          }
        >
          Atención / Registrar receta
        </Text>

        <Text style={s.titulo}>Receta médica</Text>

        <Text style={s.subtitulo}>
          Registra los datos clínicos y el tratamiento de la mascota.
        </Text>

        {cargando ? (
          <ActivityIndicator color={C.verde} size="large" />
        ) : (
          <View style={s.tarjeta}>
            <Text style={s.seccion}>Datos de consulta</Text>

            {campo(
              'Fecha de consulta (AAAA-MM-DD)',
              'fecha_prevista',
              'AAAA-MM-DD'
            )}

            {campo(
              'Motivo de consulta',
              'motivo_consulta',
              'Describe el motivo',
              true
            )}

            {campo(
              'Síntomas',
              'sintomas',
              'Síntomas observados',
              true
            )}

            {campo(
              'Diagnóstico',
              'diagnostico',
              'Diagnóstico clínico',
              true
            )}

            {campo(
              'Peso (kg)',
              'peso',
              'Ej. 5.5',
              false,
              'decimal-pad'
            )}

            {campo(
              'Temperatura (°C)',
              'temperatura',
              'Ej. 38.5',
              false,
              'decimal-pad'
            )}

            {campo(
              'Recomendaciones',
              'recomendaciones',
              'Recomendaciones para el propietario',
              true
            )}

            {campo(
              'Próxima cita (AAAA-MM-DD)',
              'proxima_cita',
              'AAAA-MM-DD'
            )}

            {campo(
              'Observaciones de la actividad',
              'observaciones',
              'Observaciones adicionales',
              true
            )}

            <Text style={s.seccion}>Medicamentos</Text>

            <Text style={s.ayuda}>
              Selecciona los medicamentos registrados en el catálogo.
            </Text>

            {medicamentosDisponibles.length === 0 ? (
              <Text style={s.error}>
                No hay medicamentos activos en el catálogo.
              </Text>
            ) : (
              <>
                {medicamentosDisponibles.map((m) => (
                  <Pressable
                    key={String(m.medicamento_id)}
                    onPress={() =>
                      setMedicamentoSeleccionado(
                        String(m.medicamento_id)
                      )
                    }
                    disabled={guardando}
                    style={[
                      s.opcion,
                      String(medicamentoSeleccionado) ===
                        String(m.medicamento_id) &&
                        s.opcionActiva,
                    ]}
                  >
                    <Text style={s.opcionTexto}>
                      {m.nombre_medicamento}
                      {m.concentracion
                        ? ` · ${m.concentracion}`
                        : ''}
                    </Text>
                  </Pressable>
                ))}

                <Pressable
                  style={s.botonSecundario}
                  onPress={agregarMedicamento}
                  disabled={guardando}
                >
                  <Text style={s.botonSecundarioTexto}>
                    + Agregar medicamento seleccionado
                  </Text>
                </Pressable>
              </>
            )}

            {medicamentos.map((m, i) => (
              <View
                key={`${m.medicamento_id}-${i}`}
                style={s.medicamento}
              >
                <Text style={s.medicamentoTitulo}>
                  {m.nombre_medicamento}
                  {m.concentracion
                    ? ` · ${m.concentracion}`
                    : ''}
                </Text>

                <TextInput
                  style={s.input}
                  placeholder="Dosis *"
                  value={m.dosis}
                  onChangeText={(v) =>
                    actualizarMedicamento(i, 'dosis', v)
                  }
                  editable={!guardando}
                />

                <TextInput
                  style={s.input}
                  placeholder="Condición de ingesta"
                  value={m.condicion_ingesta}
                  onChangeText={(v) =>
                    actualizarMedicamento(
                      i,
                      'condicion_ingesta',
                      v
                    )
                  }
                  editable={!guardando}
                />

                <TextInput
                  style={s.input}
                  placeholder="Frecuencia"
                  value={m.frecuencia}
                  onChangeText={(v) =>
                    actualizarMedicamento(i, 'frecuencia', v)
                  }
                  editable={!guardando}
                />

                <TextInput
                  style={s.input}
                  placeholder="Duración del tratamiento"
                  value={m.duracion_tratamiento}
                  onChangeText={(v) =>
                    actualizarMedicamento(
                      i,
                      'duracion_tratamiento',
                      v
                    )
                  }
                  editable={!guardando}
                />

                <Pressable
                  onPress={() => quitarMedicamento(i)}
                  disabled={guardando}
                >
                  <Text style={s.quitar}>
                    Quitar medicamento
                  </Text>
                </Pressable>
              </View>
            ))}

            <Pressable
              style={[
                s.guardar,
                guardando && s.deshabilitado,
              ]}
              onPress={guardar}
              disabled={guardando}
            >
              {guardando ? (
                <ActivityIndicator color={C.blanco} />
              ) : (
                <Text style={s.guardarTexto}>
                  Registrar receta médica
                </Text>
              )}
            </Pressable>

            <Pressable
              style={s.cancelar}
              onPress={() => router.back()}
              disabled={guardando}
            >
              <Text style={s.cancelarTexto}>Cancelar</Text>
            </Pressable>
          </View>
        )}

        <Text style={s.pie}>
          PetCare · Seguimiento de atención veterinaria
        </Text>
      </ScrollView>

      {typeof MenuLateralDerecho === 'function' ? (
        <MenuLateralDerecho
          visible={menuAbierto}
          onCerrar={() => setMenuAbierto(false)}
          nombreUsuario={nombreUsuario}
          rolUsuario={rolUsuario}
          onCerrarSesion={cerrarSesion}
        />
      ) : menuAbierto ? (
        <View style={s.menuAlternativo}>
          <Pressable onPress={() => setMenuAbierto(false)}>
            <Text style={s.cancelarTexto}>Cerrar menú ✕</Text>
          </Pressable>

          <Text style={s.menuNombre}>
            {nombreUsuario || 'Usuario'}
          </Text>

          <Text style={s.ayuda}>{rolUsuario}</Text>

          <Pressable onPress={cerrarSesion}>
            <Text style={s.quitar}>Cerrar sesión</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  encabezadoAlternativo: {
    backgroundColor: C.verde,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  encabezadoTexto: {
    color: C.blanco,
    fontSize: 20,
    fontWeight: '800',
  },

  encabezadoBoton: {
    color: C.blanco,
    fontSize: 25,
  },

  contenido: {
    padding: 20,
    paddingBottom: 36,
  },

  migas: {
    color: C.verde,
    marginBottom: 16,
  },

  titulo: {
    color: C.texto,
    fontSize: 26,
    fontWeight: '800',
  },

  subtitulo: {
    color: C.secundario,
    marginTop: 7,
    marginBottom: 18,
    lineHeight: 21,
  },

  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 17,
  },

  seccion: {
    color: C.oscuro,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 8,
  },

  etiqueta: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 7,
  },

  ayuda: {
    color: C.secundario,
    fontSize: 13,
    marginBottom: 10,
  },

  input: {
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    padding: 12,
    color: C.texto,
    marginBottom: 9,
    backgroundColor: C.blanco,
  },

  multilinea: {
    minHeight: 82,
  },

  opcion: {
    borderWidth: 1,
    borderColor: C.borde,
    padding: 12,
    borderRadius: 9,
    marginBottom: 7,
  },

  opcionActiva: {
    borderColor: C.verde,
    backgroundColor: C.claro,
  },

  opcionTexto: {
    color: C.texto,
  },

  botonSecundario: {
    borderWidth: 1,
    borderColor: C.verde,
    padding: 12,
    borderRadius: 9,
    alignItems: 'center',
    marginTop: 5,
  },

  botonSecundarioTexto: {
    color: C.verde,
    fontWeight: '700',
  },

  medicamento: {
    backgroundColor: C.claro,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },

  medicamentoTitulo: {
    color: C.oscuro,
    fontWeight: '800',
    marginBottom: 9,
  },

  quitar: {
    color: C.rojo,
    fontWeight: '700',
    marginTop: 5,
  },

  error: {
    color: C.rojo,
    marginVertical: 10,
  },

  guardar: {
    backgroundColor: C.verde,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },

  deshabilitado: {
    opacity: 0.6,
  },

  guardarTexto: {
    color: C.blanco,
    fontWeight: '800',
  },

  cancelar: {
    borderWidth: 1,
    borderColor: C.borde,
    padding: 13,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },

  cancelarTexto: {
    color: C.texto,
    fontWeight: '700',
  },

  pie: {
    color: C.secundario,
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },

  menuAlternativo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '78%',
    maxWidth: 320,
    backgroundColor: C.blanco,
    padding: 22,
    elevation: 10,
    zIndex: 20,
  },

  menuNombre: {
    color: C.oscuro,
    fontWeight: '800',
    fontSize: 18,
    marginTop: 25,
  },
});
