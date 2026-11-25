
import React, { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
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
  registrarRecetaServicio,
  obtenerMedicamentosServicio,
  registrarMedicamentosRecetaServicio,
} from '../../services/recetas/recetasServicio';

import {
  obtenerTiposDietaServicio,
  registrarDietaServicio,
} from '../../services/dieta/dietaServicio';

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';

// ============================================================
// CONFIGURACIÓN VISUAL
// ============================================================

const COLORES = {
  primario: '#176B57',
  primarioOscuro: '#105344',
  fondo: '#F4F7F6',
  blanco: '#FFFFFF',
  texto: '#24332F',
  secundario: '#687873',
  borde: '#DCE6E2',
  peligro: '#C0392B',
  suave: '#E8F3EF',
};

// ============================================================
// CAMPOS DINÁMICOS POR TIPO DE DIETA
// ============================================================

const CAMPOS_POR_DIETA = {
  'Dieta natural': [
    {
      campo: 'opciones_proteina',
      etiqueta: 'Proteínas',
      placeholder: 'Ej. Pollo, pescado, pavo, carne...',
    },
    {
      campo: 'opciones_vegetales',
      etiqueta: 'Vegetales',
      placeholder: 'Ej. Zanahoria, zapallo, brócoli...',
    },
    {
      campo: 'restriccion_nutricional',
      etiqueta: 'Restricciones nutricionales',
      placeholder: 'Ej. Evitar determinados alimentos...',
    },
  ],

  'Dieta casera cocida': [
    {
      campo: 'opciones_proteina',
      etiqueta: 'Proteínas cocidas',
      placeholder: 'Ej. Pollo sancochado, pescado cocido...',
    },
    {
      campo: 'opciones_vegetales',
      etiqueta: 'Vegetales cocidos',
      placeholder: 'Ej. Zanahoria, zapallo, vainitas...',
    },
    {
      campo: 'preparacion',
      etiqueta: 'Preparación',
      placeholder: 'Ej. Cocinar sin sal ni condimentos...',
    },
    {
      campo: 'restriccion_nutricional',
      etiqueta: 'Restricciones',
      placeholder: 'Indicar alimentos que debe evitar...',
    },
  ],

  'Dieta BARF': [
    {
      campo: 'opciones_proteina',
      etiqueta: 'Carnes y proteínas',
      placeholder: 'Ej. Pollo, pavo, res, pescado...',
    },
    {
      campo: 'huesos_carnosos',
      etiqueta: 'Huesos carnosos',
      placeholder: 'Indicar los huesos carnosos considerados...',
    },
    {
      campo: 'organos',
      etiqueta: 'Vísceras y órganos',
      placeholder: 'Ej. Hígado, corazón, riñón...',
    },
    {
      campo: 'opciones_vegetales',
      etiqueta: 'Vegetales y frutas',
      placeholder: 'Ej. Zanahoria, espinaca, manzana...',
    },
    {
      campo: 'suplementos',
      etiqueta: 'Suplementos',
      placeholder: 'Indicar los suplementos recomendados...',
    },
    {
      campo: 'restriccion_nutricional',
      etiqueta: 'Restricciones',
      placeholder: 'Indicar restricciones alimentarias...',
    },
  ],

  'Dieta renal': [
    {
      campo: 'fuente_proteina',
      etiqueta: 'Fuente de proteína',
      placeholder: 'Indicar la fuente de proteína recomendada...',
    },
    {
      campo: 'opciones_proteina',
      etiqueta: 'Proteínas indicadas',
      placeholder: 'Indicar alimentos proteicos permitidos...',
    },
    {
      campo: 'opciones_vegetales',
      etiqueta: 'Vegetales permitidos',
      placeholder: 'Indicar vegetales recomendados...',
    },
    {
      campo: 'alimentos_restringidos',
      etiqueta: 'Alimentos restringidos',
      placeholder: 'Ej. Alimentos altos en fósforo...',
    },
    {
      campo: 'restriccion_nutricional',
      etiqueta: 'Restricciones nutricionales',
      placeholder: 'Indicar restricciones adicionales...',
    },
    {
      campo: 'observaciones',
      etiqueta: 'Observaciones',
      placeholder: 'Indicaciones adicionales del veterinario...',
    },
  ],

  Otros: [
    {
      campo: 'descripcion',
      etiqueta: 'Descripción de la dieta',
      placeholder: 'Describe el tipo de dieta...',
    },
    {
      campo: 'indicaciones',
      etiqueta: 'Indicaciones alimentarias',
      placeholder: 'Indica los alimentos y la preparación...',
    },
    {
      campo: 'restriccion_nutricional',
      etiqueta: 'Restricciones nutricionales',
      placeholder: 'Indicar restricciones...',
    },
    {
      campo: 'observaciones',
      etiqueta: 'Observaciones',
      placeholder: 'Otras indicaciones...',
    },
  ],
};

// ============================================================
// ESTADO INICIAL DE LA DIETA
// ============================================================

const crearDetalleDietaVacio = () => ({
  opciones_proteina: '',
  opciones_vegetales: '',
  preparacion: '',
  huesos_carnosos: '',
  organos: '',
  suplementos: '',
  fuente_proteina: '',
  alimentos_restringidos: '',
  descripcion: '',
  indicaciones: '',
  restriccion_nutricional: '',
  observaciones: '',
});

// ============================================================
// PANTALLA PRINCIPAL
// ============================================================

export default function RegistrarRecetaScreen() {
  const params = useLocalSearchParams();

  const atencionId = String(params.atencion_id ?? '');
  const numeroHistoria = String(params.numero_historia ?? '');

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');
  const [menuAbierto, setMenuAbierto] = useState(false);

  // ==========================================================
  // DATOS GENERALES DE LA RECETA
  // ==========================================================

  const [diagnostico, setDiagnostico] = useState('');
  const [recomendaciones, setRecomendaciones] = useState('');

  // ==========================================================
  // MEDICAMENTOS
  // ==========================================================

  const [medicamentosDisponibles, setMedicamentosDisponibles] =
    useState([]);

  const [medicamentoSeleccionado, setMedicamentoSeleccionado] =
    useState('');

  const [mostrarMedicamentos, setMostrarMedicamentos] =
    useState(false);

  const [medicamentos, setMedicamentos] = useState([]);

  // ==========================================================
  // DIETAS
  // ==========================================================

  const [tiposDieta, setTiposDieta] = useState([]);

  const [tipoDietaSeleccionado, setTipoDietaSeleccionado] =
    useState('');

  const [mostrarTiposDieta, setMostrarTiposDieta] =
    useState(false);

  const [detalleDieta, setDetalleDieta] = useState(
    crearDetalleDietaVacio()
  );

  // ==========================================================
  // CONTROL DE REGISTRO
  // ==========================================================

  const [recetaPendienteId, setRecetaPendienteId] = useState(null);
  const [medicamentosGuardados, setMedicamentosGuardados] =
    useState(false);
  const [dietaGuardada, setDietaGuardada] = useState(false);

  // ==========================================================
  // MODAL
  // ==========================================================

  const [modalVisible, setModalVisible] = useState(false);
  const [modalTipo, setModalTipo] = useState('exito');
  const [modalTitulo, setModalTitulo] = useState('');
  const [modalMensaje, setModalMensaje] = useState('');
  const [resultadoRegistro, setResultadoRegistro] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  // ============================================================
  // CARGAR INFORMACIÓN
  // ============================================================

  async function cargarDatos() {
    try {
      setCargando(true);

      if (!atencionId || !/^\d+$/.test(atencionId)) {
        throw new Error(
          'No se recibió un identificador válido de atención.'
        );
      }

      const { data: usuarioData, error: usuarioError } =
        await supabase.auth.getUser();

      if (usuarioError) {
        throw usuarioError;
      }

      const usuario = usuarioData?.user;

      if (usuario) {
        setNombreUsuario(
          usuario.user_metadata?.nombre_completo ||
          usuario.user_metadata?.nombre ||
          usuario.user_metadata?.full_name ||
          usuario.email ||
          'Usuario'
        );

        setRolUsuario(usuario.user_metadata?.rol || '');
      }

      // No se consulta tipos_actividad.
      // La receta es independiente de las actividades y consultas.

      const [
        listaMedicamentos,
        listaTiposDieta,
      ] = await Promise.all([
        obtenerMedicamentosServicio(),
        obtenerTiposDietaServicio(),
      ]);

      setMedicamentosDisponibles(
        Array.isArray(listaMedicamentos)
          ? listaMedicamentos
          : []
      );

      setTiposDieta(
        Array.isArray(listaTiposDieta)
          ? listaTiposDieta.filter((tipo) => tipo.activo !== false)
          : []
      );

    } catch (error) {
      console.error(
        'Error cargando formulario de receta:',
        error
      );

      Alert.alert(
        'No se pudo cargar el formulario',
        error.message || 'Intenta nuevamente.'
      );
    } finally {
      setCargando(false);
    }
  }

  // ============================================================
  // MEDICAMENTOS
  // ============================================================

  function seleccionarMedicamento(medicamentoId) {
    setMedicamentoSeleccionado(String(medicamentoId));
    setMostrarMedicamentos(false);
  }

  function agregarMedicamento() {
    if (!medicamentoSeleccionado) {
      Alert.alert(
        'Medicamento',
        'Selecciona un medicamento de la lista.'
      );
      return;
    }

    const medicamento = medicamentosDisponibles.find(
      (item) =>
        String(item.medicamento_id) ===
        String(medicamentoSeleccionado)
    );

    if (!medicamento) {
      Alert.alert(
        'Medicamento',
        'El medicamento seleccionado no existe.'
      );
      return;
    }

    const yaAgregado = medicamentos.some(
      (item) =>
        String(item.medicamento_id) ===
        String(medicamento.medicamento_id)
    );

    if (yaAgregado) {
      Alert.alert(
        'Medicamento duplicado',
        'Este medicamento ya fue agregado a la receta.'
      );
      return;
    }

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
        i === indice
          ? { ...item, [campo]: valor }
          : item
      )
    );
  }

  function quitarMedicamento(indice) {
    setMedicamentos((actual) =>
      actual.filter((_, i) => i !== indice)
    );
  }

  // ============================================================
  // DIETAS
  // ============================================================

  function seleccionarTipoDieta(nombre) {
    setTipoDietaSeleccionado(nombre);
    setMostrarTiposDieta(false);
    setDetalleDieta(crearDetalleDietaVacio());
  }

  function cambiarCampoDieta(campo, valor) {
    setDetalleDieta((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function obtenerCamposDieta() {
    return CAMPOS_POR_DIETA[tipoDietaSeleccionado] || [];
  }

  function obtenerDetalleDietaLimpio() {
    const detalle = {};

    obtenerCamposDieta().forEach((campo) => {
      const valor = String(
        detalleDieta[campo.campo] ?? ''
      ).trim();

      if (valor) {
        detalle[campo.campo] = valor;
      }
    });

    return detalle;
  }

  // ============================================================
  // VALIDAR FORMULARIO
  // ============================================================

  function validarFormulario() {
    if (!atencionId || !/^\d+$/.test(atencionId)) {
      throw new Error(
        'La atención seleccionada no es válida.'
      );
    }

    // Validar medicamentos.
    for (const medicamento of medicamentos) {
      if (!String(medicamento.dosis ?? '').trim()) {
        throw new Error(
          `Completa la dosis del medicamento ${medicamento.nombre_medicamento}.`
        );
      }

      if (!String(medicamento.frecuencia ?? '').trim()) {
        throw new Error(
          `Completa la frecuencia del medicamento ${medicamento.nombre_medicamento}.`
        );
      }
    }

    // La dieta es opcional.
    // Si se selecciona un tipo, debe completarse al menos un campo.
    if (tipoDietaSeleccionado) {
      const detalle = obtenerDetalleDietaLimpio();

      if (Object.keys(detalle).length === 0) {
        throw new Error(
          'Completa al menos un campo de la dieta seleccionada.'
        );
      }
    }
  }

  // ============================================================
  // GUARDAR RECETA, MEDICAMENTOS Y DIETA
  // ============================================================

  async function guardar() {
    if (guardando) return;

    try {
      validarFormulario();

      setGuardando(true);

      let recetaId = recetaPendienteId;

      // 1. Registrar directamente la receta en la atención.
      // Si la receta ya se creó en un intento anterior,
      // se reutiliza su identificador para evitar otra receta.
      if (!recetaId) {
        const resultado = await registrarRecetaServicio({
          atencion_id: atencionId,
          diagnostico: diagnostico.trim() || null,
          recomendaciones: recomendaciones.trim() || null,
        });

        if (!resultado?.receta_id) {
          throw new Error(
            'No se recibió el identificador de la receta creada.'
          );
        }

        recetaId = resultado.receta_id;
        setRecetaPendienteId(recetaId);
      }

      // 2. Registrar medicamentos.
      if (!medicamentosGuardados && medicamentos.length > 0) {
        await registrarMedicamentosRecetaServicio(
          recetaId,
          medicamentos
        );

        setMedicamentosGuardados(true);
      } else if (medicamentos.length === 0) {
        setMedicamentosGuardados(true);
      }

      // 3. Registrar dieta directamente en la receta.
      if (
        tipoDietaSeleccionado &&
        !dietaGuardada
      ) {
        const detalle = obtenerDetalleDietaLimpio();

        await registrarDietaServicio({
          receta_id: recetaId,
          tipo_dieta: tipoDietaSeleccionado,
          detalle_dieta: detalle,
        });

        setDietaGuardada(true);
      }

      setResultadoRegistro({
        receta_id: recetaId,
        atencion_id: atencionId,
      });

      setModalTipo('exito');
      setModalTitulo('Registro completado');

      setModalMensaje(
        tipoDietaSeleccionado
          ? 'La receta, los medicamentos y la dieta se registraron correctamente.'
          : 'La receta y los medicamentos se registraron correctamente.'
      );

      setModalVisible(true);

    } catch (error) {
      console.error(
        'Error registrando receta:',
        error
      );

      Alert.alert(
        'No se pudo completar el registro',
        error.message ||
          'Ocurrió un error al guardar la información.'
      );
    } finally {
      setGuardando(false);
    }
  }

  // ============================================================
  // CANCELAR Y MODALES
  // ============================================================

  function solicitarCancelar() {
    if (recetaPendienteId) {
      Alert.alert(
        'Receta parcialmente registrada',
        'La receta ya fue creada. Completa el registro de sus medicamentos o dieta antes de salir.'
      );
      return;
    }

    setModalTipo('cancelar');
    setModalTitulo('¿Cancelar registro?');

    setModalMensaje(
      'Se descartarán los datos que todavía no hayas guardado. ¿Deseas salir?'
    );

    setModalVisible(true);
  }

  function confirmarModal() {
    setModalVisible(false);

    if (modalTipo === 'cancelar') {
      router.replace({
        pathname: '/atenciones/detalleAtencion',
        params: {
          atencion_id: atencionId,
        },
      });

      return;
    }

    if (modalTipo === 'exito' && resultadoRegistro) {
      router.replace({
        pathname: '/atenciones/detalleAtencion',
        params: {
          atencion_id: resultadoRegistro.atencion_id,
        },
      });
    }
  }

  function cerrarModal() {
    setModalVisible(false);
  }

  // ============================================================
  // CARGANDO
  // ============================================================

  if (cargando) {
    return (
      <SafeAreaView style={styles.cargando}>
        <ActivityIndicator
          size="large"
          color={COLORES.primario}
        />

        <Text style={styles.textoCargando}>
          Cargando formulario...
        </Text>
      </SafeAreaView>
    );
  }

  // ============================================================
  // VISTA PRINCIPAL
  // ============================================================

  return (
    <SafeAreaView style={styles.contenedor}>
      <EncabezadoPetCare
        nombreUsuario={nombreUsuario}
        rolUsuario={rolUsuario}
        onMenuPress={() => setMenuAbierto(true)}
      />

      <MenuLateralDerecho
        visible={menuAbierto}
        menuAbierto={menuAbierto}
        onClose={() => setMenuAbierto(false)}
        nombreUsuario={nombreUsuario}
        rolUsuario={rolUsuario}
      />

      <ScrollView
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
      >

        {/* ENCABEZADO */}

        <View style={styles.encabezadoPagina}>
          <Pressable
            style={styles.botonVolver}
            onPress={solicitarCancelar}
          >
            <Text style={styles.textoVolver}>‹</Text>
          </Pressable>

          <View style={styles.titulos}>
            <Text style={styles.titulo}>
              Registrar receta
            </Text>

            <Text style={styles.subtitulo}>
              Atención: {numeroHistoria || atencionId}
            </Text>
          </View>
        </View>

        {/* ================================================== */}
        {/* 1. DATOS GENERALES DE LA RECETA */}
        {/* ================================================== */}

        <View style={styles.tarjeta}>
          <Text style={styles.tituloSeccion}>
            1. Datos de la receta
          </Text>

          <Campo
            etiqueta="Diagnóstico"
            valor={diagnostico}
            cambiar={setDiagnostico}
            placeholder="Escribe el diagnóstico médico..."
            multilinea
          />

          <Campo
            etiqueta="Recomendaciones"
            valor={recomendaciones}
            cambiar={setRecomendaciones}
            placeholder="Escribe las recomendaciones para el cuidado de la mascota..."
            multilinea
          />

          <Text style={styles.textoFecha}>
            La fecha de registro se asignará automáticamente.
          </Text>
        </View>

        {/* ================================================== */}
        {/* 2. MEDICAMENTOS */}
        {/* ================================================== */}

        <View style={styles.tarjeta}>
          <Text style={styles.tituloSeccion}>
            2. Medicamentos
          </Text>

          <Text style={styles.etiqueta}>
            Seleccionar medicamento
          </Text>

          <Pressable
            style={styles.selectorReceta}
            onPress={() =>
              setMostrarMedicamentos((actual) => !actual)
            }
          >
            <Text
              style={[
                styles.textoSelectorReceta,
                !medicamentoSeleccionado &&
                  styles.textoPlaceholder,
              ]}
            >
              {medicamentoSeleccionado
                ? (() => {
                    const medicamento =
                      medicamentosDisponibles.find(
                        (item) =>
                          String(item.medicamento_id) ===
                          String(medicamentoSeleccionado)
                      );

                    return medicamento
                      ? `${medicamento.nombre_medicamento}${
                          medicamento.concentracion
                            ? ` - ${medicamento.concentracion}`
                            : ''
                        }`
                      : 'Seleccionar medicamento';
                  })()
                : 'Seleccionar medicamento'}
            </Text>

            <Text style={styles.flecha}>
              {mostrarMedicamentos ? '▲' : '▼'}
            </Text>
          </Pressable>

          {mostrarMedicamentos && (
            <View style={styles.listaDesplegable}>
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                style={styles.listaMedicamentos}
              >
                {medicamentosDisponibles.length === 0 ? (
                  <Text style={styles.textoVacio}>
                    No hay medicamentos activos disponibles.
                  </Text>
                ) : (
                  medicamentosDisponibles.map((item) => (
                    <Pressable
                      key={String(item.medicamento_id)}
                      style={[
                        styles.opcion,
                        String(medicamentoSeleccionado) ===
                          String(item.medicamento_id) &&
                          styles.opcionSeleccionada,
                      ]}
                      onPress={() =>
                        seleccionarMedicamento(
                          item.medicamento_id
                        )
                      }
                    >
                      <View style={styles.opcionContenido}>
                        <Text style={styles.textoOpcion}>
                          {item.nombre_medicamento}
                        </Text>

                        {!!item.concentracion && (
                          <Text style={styles.textoSecundario}>
                            {item.concentracion}
                          </Text>
                        )}
                      </View>

                      {String(medicamentoSeleccionado) ===
                        String(item.medicamento_id) && (
                        <Text style={styles.check}>✓</Text>
                      )}
                    </Pressable>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          <Pressable
            style={styles.botonSecundario}
            onPress={agregarMedicamento}
          >
            <Text style={styles.textoBotonSecundario}>
              + Agregar medicamento
            </Text>
          </Pressable>

          {/* MEDICAMENTOS AGREGADOS */}

          {medicamentos.map((item, indice) => (
            <View
              key={`${item.medicamento_id}-${indice}`}
              style={styles.itemMedicamento}
            >
              <View style={styles.filaTituloMedicamento}>
                <View style={styles.columna}>
                  <Text style={styles.nombreMedicamento}>
                    {item.nombre_medicamento}
                  </Text>

                  {!!item.concentracion && (
                    <Text style={styles.textoSecundario}>
                      {item.concentracion}
                    </Text>
                  )}
                </View>

                <Pressable
                  onPress={() => quitarMedicamento(indice)}
                >
                  <Text style={styles.textoEliminar}>
                    Quitar
                  </Text>
                </Pressable>
              </View>

              <Campo
                etiqueta="Dosis *"
                valor={item.dosis}
                cambiar={(valor) =>
                  actualizarMedicamento(
                    indice,
                    'dosis',
                    valor
                  )
                }
                placeholder="Ej. 1 tableta, 2 ml..."
              />

              <Campo
                etiqueta="Condición de ingesta"
                valor={item.condicion_ingesta}
                cambiar={(valor) =>
                  actualizarMedicamento(
                    indice,
                    'condicion_ingesta',
                    valor
                  )
                }
                placeholder="Ej. Después de comer"
              />

              <Campo
                etiqueta="Frecuencia *"
                valor={item.frecuencia}
                cambiar={(valor) =>
                  actualizarMedicamento(
                    indice,
                    'frecuencia',
                    valor
                  )
                }
                placeholder="Ej. Cada 8 horas, cada 12 horas..."
              />

              <Campo
                etiqueta="Duración del tratamiento"
                valor={item.duracion_tratamiento}
                cambiar={(valor) =>
                  actualizarMedicamento(
                    indice,
                    'duracion_tratamiento',
                    valor
                  )
                }
                placeholder="Ej. 5 días, 7 días..."
              />
            </View>
          ))}

          {medicamentos.length === 0 && (
            <Text style={styles.textoVacio}>
              Todavía no agregaste medicamentos.
            </Text>
          )}
        </View>

        {/* ================================================== */}
        {/* 3. DIETA */}
        {/* ================================================== */}

        <View style={styles.tarjeta}>
          <Text style={styles.tituloSeccion}>
            3. Dieta
          </Text>

          <Text style={styles.descripcion}>
            Registra las indicaciones alimentarias de la mascota.
            Esta sección es opcional y la dieta se asociará
            directamente a esta receta.
          </Text>

          <Text style={styles.etiqueta}>
            Tipo de dieta
          </Text>

          <Pressable
            style={styles.selectorReceta}
            onPress={() =>
              setMostrarTiposDieta((actual) => !actual)
            }
          >
            <Text
              style={[
                styles.textoSelectorReceta,
                !tipoDietaSeleccionado &&
                  styles.textoPlaceholder,
              ]}
            >
              {tipoDietaSeleccionado ||
                'Seleccionar tipo de dieta'}
            </Text>

            <Text style={styles.flecha}>
              {mostrarTiposDieta ? '▲' : '▼'}
            </Text>
          </Pressable>

          {mostrarTiposDieta && (
            <View style={styles.listaDesplegable}>
              {tiposDieta.map((tipo) => (
                <Pressable
                  key={String(tipo.tipo_dieta_id)}
                  style={[
                    styles.opcion,
                    tipoDietaSeleccionado === tipo.nombre &&
                      styles.opcionSeleccionada,
                  ]}
                  onPress={() =>
                    seleccionarTipoDieta(tipo.nombre)
                  }
                >
                  <Text style={styles.textoOpcion}>
                    {tipo.nombre}
                  </Text>

                  {tipoDietaSeleccionado === tipo.nombre && (
                    <Text style={styles.check}>✓</Text>
                  )}
                </Pressable>
              ))}

              {tiposDieta.length === 0 && (
                <Text style={styles.textoVacio}>
                  No hay tipos de dieta activos en Supabase.
                </Text>
              )}
            </View>
          )}

          {/* CAMPOS DINÁMICOS */}

          {!!tipoDietaSeleccionado && (
            <View style={styles.contenedorCamposDieta}>
              <Text style={styles.subtituloDieta}>
                Indicaciones: {tipoDietaSeleccionado}
              </Text>

              {obtenerCamposDieta().map((campo) => (
                <Campo
                  key={campo.campo}
                  etiqueta={campo.etiqueta}
                  valor={detalleDieta[campo.campo] || ''}
                  cambiar={(valor) =>
                    cambiarCampoDieta(
                      campo.campo,
                      valor
                    )
                  }
                  placeholder={campo.placeholder}
                  multilinea
                />
              ))}
            </View>
          )}
        </View>

        {/* ================================================== */}
        {/* BOTONES */}
        {/* ================================================== */}

        <View style={styles.acciones}>
          <Pressable
            style={styles.botonCancelar}
            onPress={solicitarCancelar}
            disabled={guardando}
          >
            <Text style={styles.textoCancelar}>
              Cancelar
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.botonGuardar,
              guardando && styles.botonDeshabilitado,
            ]}
            onPress={guardar}
            disabled={guardando}
          >
            {guardando ? (
              <ActivityIndicator
                color={COLORES.blanco}
              />
            ) : (
              <Text style={styles.textoGuardar}>
                Guardar receta
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* ================================================== */}
      {/* MODAL */}
      {/* ================================================== */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={cerrarModal}
      >
        <View style={styles.fondoModal}>
          <View style={styles.contenidoModal}>
            <View
              style={[
                styles.iconoModal,
                modalTipo === 'exito'
                  ? styles.iconoModalExito
                  : styles.iconoModalCancelar,
              ]}
            >
              <Text style={styles.textoIconoModal}>
                {modalTipo === 'exito' ? '✓' : '!'}
              </Text>
            </View>

            <Text style={styles.tituloModal}>
              {modalTitulo}
            </Text>

            <Text style={styles.mensajeModal}>
              {modalMensaje}
            </Text>

            {modalTipo === 'cancelar' ? (
              <View style={styles.accionesModal}>
                <Pressable
                  style={styles.botonModalSecundario}
                  onPress={cerrarModal}
                >
                  <Text style={styles.textoModalSecundario}>
                    Seguir editando
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.botonModalPeligro}
                  onPress={confirmarModal}
                >
                  <Text style={styles.textoModalPrincipal}>
                    Sí, cancelar
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.botonModalPrincipal}
                onPress={confirmarModal}
              >
                <Text style={styles.textoModalPrincipal}>
                  Volver a la atención
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================
// COMPONENTE DE CAMPO REUTILIZABLE
// ============================================================

function Campo({
  etiqueta,
  valor,
  cambiar,
  placeholder,
  multilinea = false,
  teclado = 'default',
}) {
  return (
    <View style={styles.campo}>
      <Text style={styles.etiqueta}>
        {etiqueta}
      </Text>

      <TextInput
        style={[
          styles.input,
          multilinea && styles.inputMultilinea,
        ]}
        value={valor}
        onChangeText={cambiar}
        placeholder={placeholder || 'Escribir aquí'}
        placeholderTextColor="#9AA8A3"
        multiline={multilinea}
        textAlignVertical={
          multilinea ? 'top' : 'center'
        }
        keyboardType={teclado}
      />
    </View>
  );
}

// ============================================================
// ESTILOS
// ============================================================

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: COLORES.fondo,
  },

  cargando: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORES.fondo,
  },

  textoCargando: {
    marginTop: 12,
    color: COLORES.secundario,
  },

  contenido: {
    padding: 16,
    paddingBottom: 35,
  },

  encabezadoPagina: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  botonVolver: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORES.blanco,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },

  textoVolver: {
    fontSize: 32,
    lineHeight: 35,
    color: COLORES.primario,
  },

  titulos: {
    flex: 1,
  },

  titulo: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORES.texto,
  },

  subtitulo: {
    marginTop: 4,
    color: COLORES.secundario,
    fontSize: 13,
  },

  tarjeta: {
    backgroundColor: COLORES.blanco,
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORES.borde,
  },

  tituloSeccion: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORES.primarioOscuro,
    marginBottom: 16,
  },

  campo: {
    marginBottom: 13,
  },

  etiqueta: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORES.texto,
    marginBottom: 7,
  },

  input: {
    minHeight: 45,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORES.texto,
    backgroundColor: '#FCFDFC',
    fontSize: 14,
  },

  inputMultilinea: {
    minHeight: 85,
  },

  textoFecha: {
    color: COLORES.secundario,
    fontSize: 12,
    marginTop: 2,
  },

  columna: {
    flex: 1,
  },

  // SELECTORES DESPLEGABLES

  selectorReceta: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 9,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: '#FCFDFC',
  },

  textoSelectorReceta: {
    color: COLORES.texto,
    fontSize: 13,
    flex: 1,
  },

  textoPlaceholder: {
    color: '#9AA8A3',
  },

  flecha: {
    color: COLORES.primario,
    fontWeight: '800',
    marginLeft: 8,
  },

  listaDesplegable: {
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 9,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: COLORES.blanco,
  },

  listaMedicamentos: {
    maxHeight: 190,
  },

  opcion: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1EF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  opcionSeleccionada: {
    backgroundColor: COLORES.suave,
  },

  opcionContenido: {
    flex: 1,
  },

  textoOpcion: {
    color: COLORES.texto,
    fontSize: 14,
    fontWeight: '600',
  },

  textoSecundario: {
    color: COLORES.secundario,
    fontSize: 12,
    marginTop: 3,
  },

  check: {
    color: COLORES.primario,
    fontSize: 19,
    fontWeight: '800',
  },

  botonSecundario: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: COLORES.primario,
    borderRadius: 9,
    padding: 12,
    alignItems: 'center',
  },

  textoBotonSecundario: {
    color: COLORES.primario,
    fontWeight: '700',
  },

  // MEDICAMENTOS AGREGADOS

  itemMedicamento: {
    marginTop: 15,
    padding: 13,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 10,
  },

  filaTituloMedicamento: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  nombreMedicamento: {
    fontWeight: '800',
    color: COLORES.texto,
    fontSize: 14,
  },

  textoEliminar: {
    color: COLORES.peligro,
    fontWeight: '700',
    padding: 5,
  },

  textoVacio: {
    padding: 13,
    color: COLORES.secundario,
    fontSize: 13,
    textAlign: 'center',
  },

  // DIETA

  descripcion: {
    color: COLORES.secundario,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },

  contenedorCamposDieta: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAF9',
    borderWidth: 1,
    borderColor: COLORES.borde,
  },

  subtituloDieta: {
    color: COLORES.primarioOscuro,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 14,
  },

  // BOTONES

  acciones: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 3,
    marginBottom: 25,
  },

  botonCancelar: {
    flex: 1,
    minHeight: 49,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORES.borde,
    backgroundColor: COLORES.blanco,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoCancelar: {
    color: COLORES.secundario,
    fontWeight: '800',
  },

  botonGuardar: {
    flex: 1.5,
    minHeight: 49,
    borderRadius: 10,
    backgroundColor: COLORES.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },

  botonDeshabilitado: {
    opacity: 0.6,
  },

  textoGuardar: {
    color: COLORES.blanco,
    fontWeight: '800',
    fontSize: 15,
  },

  // MODAL

  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },

  contenidoModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORES.blanco,
    borderRadius: 17,
    padding: 22,
    alignItems: 'center',
  },

  iconoModal: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  iconoModalExito: {
    backgroundColor: '#E3F4EC',
  },

  iconoModalCancelar: {
    backgroundColor: '#FCEBE8',
  },

  textoIconoModal: {
    fontSize: 27,
    fontWeight: '900',
    color: COLORES.primario,
  },

  tituloModal: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORES.texto,
    textAlign: 'center',
  },

  mensajeModal: {
    marginTop: 9,
    color: COLORES.secundario,
    textAlign: 'center',
    lineHeight: 20,
    fontSize: 14,
  },

  accionesModal: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
    width: '100%',
  },

  botonModalSecundario: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORES.borde,
    borderRadius: 9,
    alignItems: 'center',
  },

  textoModalSecundario: {
    color: COLORES.texto,
    fontWeight: '700',
    fontSize: 12,
  },

  botonModalPeligro: {
    flex: 1,
    padding: 12,
    borderRadius: 9,
    backgroundColor: COLORES.peligro,
    alignItems: 'center',
  },

  botonModalPrincipal: {
    width: '100%',
    marginTop: 22,
    padding: 13,
    borderRadius: 9,
    backgroundColor: COLORES.primario,
    alignItems: 'center',
  },

  textoModalPrincipal: {
    color: COLORES.blanco,
    fontWeight: '800',
    fontSize: 13,
  },

  textoModalSecundario: {
    color: COLORES.texto,
    fontWeight: '700',
    fontSize: 12,
  },
});
