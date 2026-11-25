
/**
 * ============================================================
 * PETCARE - EDITAR ACTIVIDAD
 * ============================================================
 *
 * RF32: Modificar actividad.
 *
 * Arquitectura:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase.
 *
 * Confirmación:
 * - Modal de éxito después de guardar.
 * - Modal de error si falla la actualización.
 * - Al aceptar el éxito, regresa a la pantalla anterior.
 * - Si no existe historial de navegación, abre el detalle
 *   de la actividad sin ejecutar GO_BACK.
 * ============================================================
 */

import React, { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
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

import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';

import {
  consultarActividadPorId,
  editarActividad,
} from '../../controllers/actividades/actividadesControlador';

const C = {
  fondo: '#F4F8F7',
  verde: '#12665E',
  verdeOscuro: '#104F49',
  verdeClaro: '#E6F4EF',
  texto: '#243746',
  secundario: '#718096',
  blanco: '#FFFFFF',
  borde: '#E0EAE7',
  rojo: '#B42318',
  rojoClaro: '#FCE8E8',
};

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril',
  'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function obtenerParametro(valor) {
  if (Array.isArray(valor)) return valor[0] || '';
  return valor || '';
}

function fechaActualISO() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function obtenerDiaSiguienteISO() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

function validarFecha(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;

  const [anio, mes, dia] = fecha.split('-').map(Number);
  const comprobada = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    comprobada.getUTCFullYear() === anio &&
    comprobada.getUTCMonth() === mes - 1 &&
    comprobada.getUTCDate() === dia
  );
}

function formatearFechaVisible(fecha) {
  if (!validarFecha(fecha)) return '';
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

function obtenerDiasCalendario(fecha) {
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth();
  const primerDia = new Date(anio, mes, 1);
  const cantidadDias = new Date(anio, mes + 1, 0).getDate();
  const desplazamiento = (primerDia.getDay() + 6) % 7;

  return [
    ...Array(desplazamiento).fill(null),
    ...Array.from({ length: cantidadDias }, (_, i) => i + 1),
  ];
}

function obtenerTexto(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor);
}

function normalizarTipo(actividad) {
  const codigo =
    actividad?.tipos_actividad?.codigo ||
    actividad?.tipo_codigo ||
    actividad?.codigo_tipo ||
    '';

  const nombre =
    actividad?.tipos_actividad?.nombre ||
    actividad?.tipo_nombre ||
    actividad?.tipo_actividad ||
    '';

  const valor = `${codigo} ${nombre}`.toLowerCase();

  if (valor.includes('consulta')) return 'CONSULTA';
  if (valor.includes('medic')) return 'MEDICACION';
  if (valor.includes('vacun')) return 'VACUNACION';
  if (valor.includes('ecograf')) return 'ECOGRAFIA';
  if (valor.includes('esteriliz')) return 'ESTERILIZACION';

  return 'OTRO';
}

function obtenerDetalle(actividad) {
  let detalle = actividad?.detalle;

  if (typeof detalle === 'string') {
    try {
      detalle = JSON.parse(detalle);
    } catch {
      detalle = {};
    }
  }

  return detalle && typeof detalle === 'object' ? detalle : {};
}

function Campo({
  etiqueta,
  valor,
  onChange,
  multiline = false,
  placeholder,
  editable = true,
  keyboardType = 'default',
}) {
  return (
    <View>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        style={multiline ? estilos.campoMultilinea : estilos.campo}
        value={obtenerTexto(valor)}
        onChangeText={onChange}
        placeholder={placeholder || `Ingrese ${etiqueta.toLowerCase()}`}
        placeholderTextColor={C.secundario}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        editable={editable}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function Seccion({ titulo, children }) {
  return (
    <View style={estilos.seccion}>
      <Text style={estilos.tituloSeccion}>{titulo}</Text>
      {children}
    </View>
  );
}

export default function EditarActividadScreen() {
  const parametros = useLocalSearchParams();
  const actividadId = obtenerParametro(parametros.actividad_id);

  const [actividad, setActividad] = useState(null);
  const [tipo, setTipo] = useState('OTRO');
  const [detalleOriginal, setDetalleOriginal] = useState({});
  const [medicamentos, setMedicamentos] = useState([]);
  const [vacunas, setVacunas] = useState([]);

  const [descripcion, setDescripcion] = useState('');
  const [fechaPrevista, setFechaPrevista] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [campos, setCampos] = useState({});

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Modal de resultado del guardado.
  const [modalResultadoVisible, setModalResultadoVisible] = useState(false);
  const [resultadoGuardado, setResultadoGuardado] = useState('exito');
  const [mensajeResultado, setMensajeResultado] = useState('');

  // Calendario.
  const [calendarioAbierto, setCalendarioAbierto] = useState(false);
  const [mesCalendario, setMesCalendario] = useState(() => new Date());

  const fechaHoy = fechaActualISO();
  const diasCalendario = obtenerDiasCalendario(mesCalendario);
  const anioCalendario = mesCalendario.getFullYear();
  const numeroMesCalendario = mesCalendario.getMonth();

  const actualizarCampo = useCallback((nombre, valor) => {
    setCampos((anterior) => ({
      ...anterior,
      [nombre]: valor,
    }));
  }, []);

  const cargarActividad = useCallback(async () => {
    if (!actividadId || !Number.isInteger(Number(actividadId))) {
      setError('No se recibió un identificador de actividad válido.');
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');

      const resultado = await consultarActividadPorId(actividadId);

      if (!resultado) {
        throw new Error('No se encontró la actividad.');
      }

      const detalle = obtenerDetalle(resultado);
      const tipoActividad = normalizarTipo(resultado);

      setActividad(resultado);
      setTipo(tipoActividad);
      setDetalleOriginal(detalle);

      setDescripcion(
        obtenerTexto(resultado.observaciones || resultado.descripcion)
      );

      setFechaPrevista(
        obtenerTexto(resultado.fecha_prevista).slice(0, 10)
      );

      setObservaciones(obtenerTexto(detalle.observaciones));

      const medicamentosCargados = (
        resultado.medicamentos_asociados || []
      ).map((item) => ({
        medicamento_id: item.medicamento_id,
        nombre_medicamento: item.nombre_medicamento || '',
        dosis: obtenerTexto(item.dosis),
        frecuencia: obtenerTexto(item.frecuencia),
        via_administracion: obtenerTexto(item.via_administracion),
        duracion: obtenerTexto(item.duracion || detalle.duracion),
      }));

      const vacunasCargadas = (
        resultado.vacunas_asociadas || []
      ).map((item) => ({
        medicamento_id: item.medicamento_id,
        nombre_medicamento: item.nombre_medicamento || '',
        dosis: obtenerTexto(item.dosis),
      }));

      setMedicamentos(medicamentosCargados);
      setVacunas(vacunasCargadas);

      setCampos({
        zona: obtenerTexto(detalle.zona),
        motivo: obtenerTexto(detalle.motivo),
        indicaciones: obtenerTexto(detalle.indicaciones),
        procedimiento: obtenerTexto(detalle.procedimiento),
        evaluacion_preoperatoria: obtenerTexto(
          detalle.evaluacion_preoperatoria
        ),
        nombre_actividad: obtenerTexto(detalle.nombre_actividad),
        motivo_realizacion: obtenerTexto(detalle.motivo_realizacion),

        motivo_consulta: obtenerTexto(resultado.motivo_consulta),
        sintomas: obtenerTexto(resultado.sintomas),
        peso: obtenerTexto(resultado.peso),
        temperatura: obtenerTexto(resultado.temperatura),
        diagnostico: obtenerTexto(resultado.receta?.diagnostico),
        recomendaciones: obtenerTexto(resultado.receta?.recomendaciones),
        proxima_cita: obtenerTexto(resultado.receta?.proxima_cita),
      });
    } catch (e) {
      console.error('RF32 - Error al cargar actividad:', e);
      setError(e?.message || 'No se pudo cargar la actividad.');
    } finally {
      setCargando(false);
    }
  }, [actividadId]);

  useEffect(() => {
    cargarActividad();
  }, [cargarActividad]);

  const estadoActividad = String(
    actividad?.estado || obtenerParametro(parametros.estado)
  ).trim().toLowerCase();

  const estadoAtencion = String(
    actividad?.atencion?.estado ||
    actividad?.estado_atencion ||
    obtenerParametro(parametros.atencion_estado)
  ).trim().toLowerCase();

  const atencionActiva = estadoAtencion === 'activa';

  const estadoEditable = [
    'pendiente',
    'no realizada',
  ].includes(estadoActividad);

  // ==========================================================
  // NAVEGACIÓN SEGURA
  // ==========================================================

  /**
   * Regresa a la pantalla anterior cuando existe historial.
   *
   * Cuando el usuario abre directamente esta ruta o actualiza
   * el navegador, no existe una pantalla anterior a la cual
   * regresar. En ese caso se abre el detalle de la actividad.
   *
   * Esto evita el error:
   * The action 'GO_BACK' was not handled by any navigator.
   */
  function volverSeguro() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    const atencionIdParametro = obtenerParametro(
      parametros.atencion_id
    );

    const numeroHistoriaParametro = obtenerParametro(
      parametros.numero_historia
    );

    const estadoAtencionParametro = obtenerParametro(
      parametros.atencion_estado
    );

    if (actividad?.actividad_id) {
      router.replace({
        pathname: '/actividades/detalleActividad',
        params: {
          actividad_id: String(actividad.actividad_id),
          actividad: JSON.stringify(actividad),
          atencion_id: String(
            atencionIdParametro ||
            actividad.atencion_id ||
            ''
          ),
          numero_historia: String(
            numeroHistoriaParametro ||
            actividad.numero_historia ||
            ''
          ),
          atencion_estado: String(
            estadoAtencionParametro ||
            actividad.atencion?.estado ||
            actividad.estado_atencion ||
            ''
          ),
        },
      });

      return;
    }

    if (atencionIdParametro) {
      router.replace({
        pathname: '/atenciones/detalleAtencion',
        params: {
          atencion_id: String(atencionIdParametro),
        },
      });

      return;
    }

    router.replace('/actividades/actividades');
  }

  // ==========================================================
  // CALENDARIO
  // ==========================================================

  function abrirCalendario() {
    if (guardando) return;

    let fechaBase;

    if (validarFecha(fechaPrevista) && fechaPrevista > fechaHoy) {
      const [anio, mes, dia] = fechaPrevista.split('-').map(Number);
      fechaBase = new Date(anio, mes - 1, dia);
    } else {
      const fechaMinima = obtenerDiaSiguienteISO();
      const [anio, mes, dia] = fechaMinima.split('-').map(Number);
      fechaBase = new Date(anio, mes - 1, dia);
    }

    setMesCalendario(
      new Date(fechaBase.getFullYear(), fechaBase.getMonth(), 1)
    );

    setCalendarioAbierto(true);
  }

  function cambiarMes(diferencia) {
    setMesCalendario((actual) => {
      const siguiente = new Date(
        actual.getFullYear(),
        actual.getMonth() + diferencia,
        1
      );

      const primerMesPermitido = new Date(
        Number(fechaHoy.slice(0, 4)),
        Number(fechaHoy.slice(5, 7)) - 1,
        1
      );

      if (siguiente < primerMesPermitido) return actual;
      return siguiente;
    });
  }

  function seleccionarFecha(dia) {
    if (!dia || guardando) return;

    const fechaSeleccionada = [
      anioCalendario,
      String(numeroMesCalendario + 1).padStart(2, '0'),
      String(dia).padStart(2, '0'),
    ].join('-');

    if (fechaSeleccionada <= fechaHoy) return;

    setFechaPrevista(fechaSeleccionada);
    setError('');
    setCalendarioAbierto(false);
  }

  // ==========================================================
  // VALIDACIONES
  // ==========================================================

  function validarFormulario() {
    if (!descripcion.trim()) {
      return 'La descripción es obligatoria.';
    }

    if (!fechaPrevista.trim()) {
      return 'La fecha prevista es obligatoria.';
    }

    if (!validarFecha(fechaPrevista.trim())) {
      return 'La fecha debe ser válida.';
    }

    if (fechaPrevista.trim() <= fechaHoy) {
      return 'La fecha prevista debe ser posterior al día de hoy.';
    }

    if (!atencionActiva) {
      return 'No se puede modificar una actividad de una atención finalizada.';
    }

    if (!estadoEditable) {
      return 'El estado actual de la actividad no permite modificarla.';
    }

    if (
      tipo === 'MEDICACION' &&
      medicamentos.some((item) =>
        !item.medicamento_id ||
        !item.dosis.trim() ||
        !item.frecuencia.trim() ||
        !item.via_administracion.trim()
      )
    ) {
      return 'Completa la dosis, frecuencia y vía de administración de los medicamentos.';
    }

    if (
      tipo === 'VACUNACION' &&
      vacunas.some((item) => !item.dosis.trim())
    ) {
      return 'Completa la dosis de las vacunas.';
    }

    return '';
  }

  function actualizarMedicamento(indice, campo, valor) {
    setMedicamentos((actuales) =>
      actuales.map((item, i) =>
        i === indice ? { ...item, [campo]: valor } : item
      )
    );
  }

  function actualizarVacuna(indice, campo, valor) {
    setVacunas((actuales) =>
      actuales.map((item, i) =>
        i === indice ? { ...item, [campo]: valor } : item
      )
    );
  }

  // ==========================================================
  // MODAL DE RESULTADO
  // ==========================================================

  function mostrarResultado(tipoResultado, mensaje) {
    setResultadoGuardado(tipoResultado);
    setMensajeResultado(mensaje);
    setModalResultadoVisible(true);
  }

  function cerrarModalResultado() {
    setModalResultadoVisible(false);

    if (resultadoGuardado === 'exito') {
      volverSeguro();
    }
  }

  // ==========================================================
  // RF32 - GUARDAR CAMBIOS
  // ==========================================================

  async function guardarCambios() {
    if (guardando) return;

    const mensajeValidacion = validarFormulario();

    if (mensajeValidacion) {
      setError(mensajeValidacion);
      return;
    }

    try {
      setGuardando(true);
      setError('');

      const detalleActualizado = {
        ...detalleOriginal,
        ...campos,
        observaciones,
      };

      const datosActualizacion = {
        descripcion: descripcion.trim(),
        observaciones: descripcion.trim(),
        fechaPrevista: fechaPrevista.trim(),
        fecha_prevista: fechaPrevista.trim(),
        detalle: detalleActualizado,
      };

      if (tipo === 'MEDICACION') {
        datosActualizacion.medicamentos = medicamentos.map((item) => ({
          medicamento_id: item.medicamento_id,
          dosis: item.dosis.trim(),
          frecuencia: item.frecuencia.trim(),
          via_administracion: item.via_administracion.trim(),
          duracion: item.duracion.trim(),
        }));
      }

      if (tipo === 'VACUNACION') {
        datosActualizacion.vacunas = vacunas.map((item) => ({
          medicamento_id: item.medicamento_id,
          dosis: item.dosis.trim(),
        }));
      }

      if (tipo === 'CONSULTA') {
        datosActualizacion.datosConsulta = {
          motivo_consulta: campos.motivo_consulta,
          sintomas: campos.sintomas,
          peso: campos.peso,
          temperatura: campos.temperatura,
          diagnostico: campos.diagnostico,
          recomendaciones: campos.recomendaciones,
          proxima_cita: campos.proxima_cita,
        };
      }

      console.log('RF32 - Enviando actualización:', {
        actividadId,
        tipo,
        datosActualizacion,
      });

      const respuesta = await editarActividad(
        actividadId,
        datosActualizacion
      );

      if (respuesta === false || respuesta === null) {
        throw new Error(
          'El servicio no confirmó la actualización de la actividad.'
        );
      }

      console.log('RF32 - Actualización completada:', respuesta);

      mostrarResultado(
        'exito',
        'Los cambios de la actividad se guardaron correctamente.'
      );
    } catch (e) {
      console.error('RF32 - Error al guardar:', e);

      const mensajeError =
        e?.message ||
        e?.error_description ||
        'No se pudo actualizar la actividad.';

      setError(mensajeError);

      mostrarResultado(
        'error',
        mensajeError
      );
    } finally {
      setGuardando(false);
    }
  }

  function volverAlDetalle() {
    if (guardando) return;
    volverSeguro();
  }

  // ==========================================================
  // CARGA
  // ==========================================================

  if (cargando) {
    return (
      <SafeAreaView style={estilos.contenedor}>
        <EncabezadoPetCare
          titulo="PetCare"
          onAbrirMenu={volverAlDetalle}
          onAbrirNotificaciones={volverAlDetalle}
        />

        <View style={estilos.cargando}>
          <ActivityIndicator size="large" color={C.verde} />
          <Text style={estilos.textoCargando}>
            Cargando información de la actividad...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!actividad) {
    return (
      <SafeAreaView style={estilos.contenedor}>
        <EncabezadoPetCare
          titulo="PetCare"
          onAbrirMenu={volverAlDetalle}
          onAbrirNotificaciones={volverAlDetalle}
        />

        <View style={estilos.contenido}>
          <View style={estilos.contenedorError}>
            <Text style={estilos.textoError}>{error}</Text>
          </View>

          <Pressable style={estilos.botonGuardar} onPress={volverAlDetalle}>
            <Text style={estilos.textoGuardar}>Volver</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================================
  // VISTA PRINCIPAL
  // ==========================================================

  return (
    <SafeAreaView style={estilos.contenedor}>
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={volverAlDetalle}
        onAbrirNotificaciones={volverAlDetalle}
      />

      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
      >
        <View style={estilos.migas}>
          <Text style={estilos.textoMiga}>Actividades / </Text>
          <Text style={estilos.migaActual}>Editar actividad</Text>
        </View>

        <View style={estilos.encabezado}>
          <Pressable
            style={estilos.botonVolver}
            onPress={volverAlDetalle}
          >
            <Text style={estilos.flecha}>←</Text>
          </Pressable>

          <View style={estilos.encabezadoTexto}>
            <Text style={estilos.titulo}>Editar actividad</Text>
            <Text style={estilos.subtitulo}>
              Modifica los datos registrados originalmente.
            </Text>
          </View>
        </View>

        <View style={estilos.tarjeta}>
          <Seccion titulo="Información general">
            <Text style={estilos.etiqueta}>Identificador</Text>
            <Text style={estilos.valorSoloLectura}>{actividadId}</Text>

            <Text style={estilos.etiqueta}>Tipo de actividad</Text>
            <Text style={estilos.valorSoloLectura}>{tipo}</Text>

            <Campo
              etiqueta="Descripción *"
              valor={descripcion}
              onChange={setDescripcion}
              multiline
              editable={!guardando}
            />

            <Text style={estilos.contador}>
              {descripcion.length}/500 caracteres
            </Text>

            <Text style={estilos.etiqueta}>Fecha prevista *</Text>

            <Pressable
              style={[
                estilos.campoFecha,
                guardando && estilos.campoDeshabilitado,
              ]}
              onPress={abrirCalendario}
              disabled={guardando}
              accessibilityRole="button"
              accessibilityLabel="Abrir calendario para seleccionar fecha prevista"
            >
              <Text
                style={[
                  estilos.textoFecha,
                  !fechaPrevista && estilos.textoFechaPlaceholder,
                ]}
              >
                {validarFecha(fechaPrevista)
                  ? formatearFechaVisible(fechaPrevista)
                  : 'Seleccionar fecha'}
              </Text>

              <Text style={estilos.iconoCalendario}>▦</Text>
            </Pressable>

            <Text style={estilos.notaFecha}>
              Selecciona una fecha posterior a hoy.
            </Text>

            <Campo
              etiqueta="Observaciones"
              valor={observaciones}
              onChange={setObservaciones}
              multiline
              editable={!guardando}
            />
          </Seccion>

          {tipo === 'MEDICACION' && (
            <Seccion titulo="Medicamentos registrados">
              {medicamentos.length === 0 ? (
                <Text style={estilos.textoInformativo}>
                  No se encontraron medicamentos asociados.
                </Text>
              ) : medicamentos.map((item, indice) => (
                <View
                  key={`${item.medicamento_id}-${indice}`}
                  style={estilos.itemDetalle}
                >
                  <Text style={estilos.nombreItem}>
                    {item.nombre_medicamento || `Medicamento ${indice + 1}`}
                  </Text>

                  <Campo
                    etiqueta="Dosis"
                    valor={item.dosis}
                    onChange={(v) => actualizarMedicamento(indice, 'dosis', v)}
                    editable={!guardando}
                  />

                  <Campo
                    etiqueta="Frecuencia"
                    valor={item.frecuencia}
                    onChange={(v) => actualizarMedicamento(indice, 'frecuencia', v)}
                    editable={!guardando}
                  />

                  <Campo
                    etiqueta="Vía de administración"
                    valor={item.via_administracion}
                    onChange={(v) => actualizarMedicamento(indice, 'via_administracion', v)}
                    editable={!guardando}
                  />

                  <Campo
                    etiqueta="Duración"
                    valor={item.duracion}
                    onChange={(v) => actualizarMedicamento(indice, 'duracion', v)}
                    editable={!guardando}
                  />
                </View>
              ))}
            </Seccion>
          )}

          {tipo === 'VACUNACION' && (
            <Seccion titulo="Vacunas registradas">
              {vacunas.length === 0 ? (
                <Text style={estilos.textoInformativo}>
                  No se encontraron vacunas asociadas.
                </Text>
              ) : vacunas.map((item, indice) => (
                <View
                  key={`${item.medicamento_id}-${indice}`}
                  style={estilos.itemDetalle}
                >
                  <Text style={estilos.nombreItem}>
                    {item.nombre_medicamento || `Vacuna ${indice + 1}`}
                  </Text>

                  <Campo
                    etiqueta="Dosis"
                    valor={item.dosis}
                    onChange={(v) => actualizarVacuna(indice, 'dosis', v)}
                    editable={!guardando}
                  />
                </View>
              ))}
            </Seccion>
          )}

          {tipo === 'ECOGRAFIA' && (
            <Seccion titulo="Datos de ecografía">
              <Campo
                etiqueta="Zona"
                valor={campos.zona}
                onChange={(v) => actualizarCampo('zona', v)}
                editable={!guardando}
              />

              <Campo
                etiqueta="Motivo"
                valor={campos.motivo}
                onChange={(v) => actualizarCampo('motivo', v)}
                multiline
                editable={!guardando}
              />

              <Campo
                etiqueta="Indicaciones"
                valor={campos.indicaciones}
                onChange={(v) => actualizarCampo('indicaciones', v)}
                multiline
                editable={!guardando}
              />
            </Seccion>
          )}

          {tipo === 'ESTERILIZACION' && (
            <Seccion titulo="Datos de esterilización">
              <Campo
                etiqueta="Procedimiento"
                valor={campos.procedimiento}
                onChange={(v) => actualizarCampo('procedimiento', v)}
                multiline
                editable={!guardando}
              />

              <Campo
                etiqueta="Evaluación preoperatoria"
                valor={campos.evaluacion_preoperatoria}
                onChange={(v) => actualizarCampo('evaluacion_preoperatoria', v)}
                multiline
                editable={!guardando}
              />
            </Seccion>
          )}

          {tipo === 'OTRO' && (
            <Seccion titulo="Datos de la actividad">
              <Campo
                etiqueta="Nombre de la actividad"
                valor={campos.nombre_actividad}
                onChange={(v) => actualizarCampo('nombre_actividad', v)}
                editable={!guardando}
              />

              <Campo
                etiqueta="Motivo de realización"
                valor={campos.motivo_realizacion}
                onChange={(v) => actualizarCampo('motivo_realizacion', v)}
                multiline
                editable={!guardando}
              />
            </Seccion>
          )}

          {tipo === 'CONSULTA' && (
            <Seccion titulo="Datos de consulta">
              <Campo
                etiqueta="Motivo de consulta"
                valor={campos.motivo_consulta}
                onChange={(v) => actualizarCampo('motivo_consulta', v)}
                multiline
                editable={!guardando}
              />

              <Campo
                etiqueta="Síntomas"
                valor={campos.sintomas}
                onChange={(v) => actualizarCampo('sintomas', v)}
                multiline
                editable={!guardando}
              />

              <Campo
                etiqueta="Peso"
                valor={campos.peso}
                onChange={(v) => actualizarCampo('peso', v)}
                keyboardType="decimal-pad"
                editable={!guardando}
              />

              <Campo
                etiqueta="Temperatura"
                valor={campos.temperatura}
                onChange={(v) => actualizarCampo('temperatura', v)}
                keyboardType="decimal-pad"
                editable={!guardando}
              />

              <Campo
                etiqueta="Diagnóstico"
                valor={campos.diagnostico}
                onChange={(v) => actualizarCampo('diagnostico', v)}
                multiline
                editable={!guardando}
              />

              <Campo
                etiqueta="Recomendaciones"
                valor={campos.recomendaciones}
                onChange={(v) => actualizarCampo('recomendaciones', v)}
                multiline
                editable={!guardando}
              />

              <Campo
                etiqueta="Próxima cita"
                valor={campos.proxima_cita}
                onChange={(v) => actualizarCampo('proxima_cita', v)}
                placeholder="AAAA-MM-DD"
                editable={!guardando}
              />
            </Seccion>
          )}

          {!!error && (
            <View style={estilos.contenedorError}>
              <Text style={estilos.textoError}>{error}</Text>
            </View>
          )}

          <View style={estilos.botones}>
            <Pressable
              style={estilos.botonCancelar}
              disabled={guardando}
              onPress={volverAlDetalle}
            >
              <Text style={estilos.textoCancelar}>Cancelar</Text>
            </Pressable>

            <Pressable
              style={[
                estilos.botonGuardar,
                guardando && estilos.deshabilitado,
              ]}
              disabled={guardando}
              onPress={guardarCambios}
              accessibilityRole="button"
            >
              {guardando ? (
                <View style={estilos.contenidoBotonGuardar}>
                  <ActivityIndicator color={C.blanco} size="small" />
                  <Text style={estilos.textoGuardar}>Guardando...</Text>
                </View>
              ) : (
                <Text style={estilos.textoGuardar}>Guardar cambios</Text>
              )}
            </Pressable>
          </View>
        </View>

        <Text style={estilos.pie}>
          PetCare · Seguimiento de atención veterinaria
        </Text>
      </ScrollView>

      {/* ======================================================
          MODAL DEL CALENDARIO
      ====================================================== */}

      <Modal
        visible={calendarioAbierto}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setCalendarioAbierto(false)}
      >
        <View style={estilos.modalFondo}>
          <View style={estilos.modalCalendario}>
            <View style={estilos.modalEncabezado}>
              <View>
                <Text style={estilos.modalTitulo}>
                  Seleccionar fecha
                </Text>
                <Text style={estilos.modalSubtitulo}>
                  Elige una fecha posterior al día de hoy.
                </Text>
              </View>

              <Pressable
                style={estilos.cerrarCalendario}
                onPress={() => setCalendarioAbierto(false)}
              >
                <Text style={estilos.cerrarCalendarioTexto}>×</Text>
              </Pressable>
            </View>

            <View style={estilos.navegacionMes}>
              <Pressable
                style={estilos.botonMes}
                onPress={() => cambiarMes(-1)}
                accessibilityLabel="Mes anterior"
              >
                <Text style={estilos.flechaMes}>‹</Text>
              </Pressable>

              <Text style={estilos.nombreMes}>
                {MESES[numeroMesCalendario]} {anioCalendario}
              </Text>

              <Pressable
                style={estilos.botonMes}
                onPress={() => cambiarMes(1)}
                accessibilityLabel="Mes siguiente"
              >
                <Text style={estilos.flechaMes}>›</Text>
              </Pressable>
            </View>

            <View style={estilos.grillaCalendario}>
              {DIAS_SEMANA.map((dia, indice) => (
                <View
                  key={`semana-${indice}`}
                  style={estilos.celdaSemana}
                >
                  <Text style={estilos.textoSemana}>{dia}</Text>
                </View>
              ))}
            </View>

            <View style={estilos.grillaCalendario}>
              {diasCalendario.map((dia, indice) => {
                if (dia === null) {
                  return (
                    <View
                      key={`vacio-${indice}`}
                      style={estilos.celdaDia}
                    />
                  );
                }

                const fechaDia = [
                  anioCalendario,
                  String(numeroMesCalendario + 1).padStart(2, '0'),
                  String(dia).padStart(2, '0'),
                ].join('-');

                const seleccionado = fechaDia === fechaPrevista;
                const esHoy = fechaDia === fechaHoy;
                const fechaNoPermitida = fechaDia <= fechaHoy;

                return (
                  <View key={fechaDia} style={estilos.celdaDia}>
                    <Pressable
                      style={[
                        estilos.botonDia,
                        esHoy && estilos.botonDiaHoy,
                        seleccionado && estilos.botonDiaSeleccionado,
                        fechaNoPermitida && estilos.botonDiaDeshabilitado,
                      ]}
                      onPress={() => seleccionarFecha(dia)}
                      disabled={fechaNoPermitida}
                      accessibilityRole="button"
                      accessibilityLabel={`Seleccionar ${dia} de ${MESES[numeroMesCalendario]} de ${anioCalendario}`}
                      accessibilityState={{
                        selected: seleccionado,
                        disabled: fechaNoPermitida,
                      }}
                    >
                      <Text
                        style={[
                          estilos.textoDia,
                          esHoy && estilos.textoDiaHoy,
                          seleccionado && estilos.textoDiaSeleccionado,
                          fechaNoPermitida && estilos.textoDiaDeshabilitado,
                        ]}
                      >
                        {dia}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View style={estilos.resumenFecha}>
              <Text style={estilos.resumenFechaEtiqueta}>
                Fecha seleccionada
              </Text>

              <Text style={estilos.resumenFechaValor}>
                {validarFecha(fechaPrevista)
                  ? formatearFechaVisible(fechaPrevista)
                  : 'Ninguna'}
              </Text>
            </View>

            <Pressable
              style={estilos.botonAceptarFecha}
              onPress={() => {
                if (
                  !validarFecha(fechaPrevista) ||
                  fechaPrevista <= fechaHoy
                ) {
                  setCalendarioAbierto(false);
                  setError('Selecciona una fecha posterior a hoy.');
                  return;
                }

                setCalendarioAbierto(false);
              }}
            >
              <Text style={estilos.botonAceptarFechaTexto}>
                Confirmar fecha
              </Text>
            </Pressable>

            <Pressable
              style={estilos.botonCancelarFecha}
              onPress={() => setCalendarioAbierto(false)}
            >
              <Text style={estilos.botonCancelarFechaTexto}>
                Cancelar
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ======================================================
          MODAL DE CONFIRMACIÓN O ERROR DEL GUARDADO
      ====================================================== */}

      <Modal
        visible={modalResultadoVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (resultadoGuardado === 'error') {
            setModalResultadoVisible(false);
          }
        }}
      >
        <View style={estilos.modalFondo}>
          <View style={estilos.modalResultado}>
            <View
              style={[
                estilos.iconoResultado,
                resultadoGuardado === 'exito'
                  ? estilos.iconoResultadoExito
                  : estilos.iconoResultadoError,
              ]}
            >
              <Text
                style={[
                  estilos.simboloResultado,
                  resultadoGuardado === 'exito'
                    ? estilos.simboloExito
                    : estilos.simboloError,
                ]}
              >
                {resultadoGuardado === 'exito' ? '✓' : '!'}
              </Text>
            </View>

            <Text style={estilos.tituloResultado}>
              {resultadoGuardado === 'exito'
                ? '¡Actividad actualizada!'
                : 'No se pudo guardar'}
            </Text>

            <Text style={estilos.mensajeResultado}>
              {mensajeResultado}
            </Text>

            <Pressable
              style={[
                estilos.botonResultado,
                resultadoGuardado === 'error' &&
                  estilos.botonResultadoError,
              ]}
              onPress={cerrarModalResultado}
            >
              <Text style={estilos.textoBotonResultado}>
                {resultadoGuardado === 'exito'
                  ? 'Aceptar'
                  : 'Cerrar'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================
// ESTILOS
// ============================================================

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  contenido: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  cargando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCargando: {
    color: C.secundario,
    marginTop: 12,
  },
  migas: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  textoMiga: {
    color: C.secundario,
    fontSize: 12,
  },
  migaActual: {
    color: C.verde,
    fontSize: 12,
    fontWeight: '700',
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  flecha: {
    color: C.verde,
    fontSize: 26,
    fontWeight: '700',
  },
  encabezadoTexto: {
    flex: 1,
  },
  titulo: {
    color: C.texto,
    fontSize: 23,
    fontWeight: '800',
  },
  subtitulo: {
    color: C.secundario,
    fontSize: 13,
    marginTop: 5,
  },
  tarjeta: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 15,
    padding: 18,
  },
  seccion: {
    marginBottom: 22,
  },
  tituloSeccion: {
    color: C.verdeOscuro,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  etiqueta: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 14,
  },
  valorSoloLectura: {
    backgroundColor: '#F1F5F4',
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    padding: 13,
    color: C.secundario,
    fontSize: 13,
  },
  campo: {
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    padding: 13,
    color: C.texto,
    fontSize: 13,
  },
  campoMultilinea: {
    minHeight: 85,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    padding: 12,
    color: C.texto,
    fontSize: 13,
  },
  campoFecha: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.blanco,
  },
  campoDeshabilitado: {
    opacity: 0.55,
  },
  textoFecha: {
    color: C.texto,
    fontSize: 13,
  },
  textoFechaPlaceholder: {
    color: C.secundario,
  },
  iconoCalendario: {
    color: C.verde,
    fontSize: 22,
    fontWeight: '700',
  },
  notaFecha: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 7,
  },
  contador: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 5,
  },
  itemDetalle: {
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    backgroundColor: '#FAFCFB',
  },
  nombreItem: {
    color: C.verdeOscuro,
    fontWeight: '800',
    fontSize: 14,
  },
  textoInformativo: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 8,
  },
  contenedorError: {
    backgroundColor: C.rojoClaro,
    borderRadius: 9,
    padding: 12,
    marginTop: 16,
  },
  textoError: {
    color: C.rojo,
    fontSize: 12,
    lineHeight: 18,
  },
  botones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 25,
  },
  botonCancelar: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  textoCancelar: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '800',
  },
  botonGuardar: {
    flex: 1.4,
    backgroundColor: C.verde,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenidoBotonGuardar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  textoGuardar: {
    color: C.blanco,
    fontSize: 12,
    fontWeight: '800',
  },
  deshabilitado: {
    opacity: 0.55,
  },
  pie: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 25,
  },

  // Calendario.

  modalFondo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCalendario: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: C.blanco,
    borderRadius: 20,
    padding: 19,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    elevation: 8,
  },
  modalEncabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  modalTitulo: {
    color: C.texto,
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitulo: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 5,
    lineHeight: 17,
  },
  cerrarCalendario: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: C.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  cerrarCalendarioTexto: {
    color: C.secundario,
    fontSize: 24,
    lineHeight: 27,
    fontWeight: '500',
  },
  navegacionMes: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 13,
  },
  botonMes: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flechaMes: {
    color: C.verde,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '600',
    marginTop: -3,
  },
  nombreMes: {
    color: C.verdeOscuro,
    fontSize: 15,
    fontWeight: '800',
  },
  grillaCalendario: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  celdaSemana: {
    width: '14.2857%',
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoSemana: {
    color: C.secundario,
    fontSize: 12,
    fontWeight: '800',
  },
  celdaDia: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  botonDia: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonDiaHoy: {
    borderWidth: 1,
    borderColor: C.verde,
  },
  botonDiaSeleccionado: {
    backgroundColor: C.verde,
  },
  botonDiaDeshabilitado: {
    backgroundColor: '#F4F5F5',
  },
  textoDia: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '600',
  },
  textoDiaHoy: {
    color: C.verde,
    fontWeight: '800',
  },
  textoDiaSeleccionado: {
    color: C.blanco,
    fontWeight: '800',
  },
  textoDiaDeshabilitado: {
    color: '#B8C0C0',
  },
  resumenFecha: {
    backgroundColor: C.verdeClaro,
    borderRadius: 11,
    padding: 12,
    marginTop: 15,
  },
  resumenFechaEtiqueta: {
    color: C.secundario,
    fontSize: 11,
    fontWeight: '600',
  },
  resumenFechaValor: {
    color: C.verdeOscuro,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  botonAceptarFecha: {
    backgroundColor: C.verde,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 15,
  },
  botonAceptarFechaTexto: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },
  botonCancelarFecha: {
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 9,
  },
  botonCancelarFechaTexto: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '800',
  },

  // Modal de resultado.

  modalResultado: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: C.blanco,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  iconoResultado: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 17,
  },
  iconoResultadoExito: {
    backgroundColor: C.verdeClaro,
  },
  iconoResultadoError: {
    backgroundColor: C.rojoClaro,
  },
  simboloResultado: {
    fontSize: 36,
    fontWeight: '800',
  },
  simboloExito: {
    color: C.verde,
  },
  simboloError: {
    color: C.rojo,
  },
  tituloResultado: {
    color: C.texto,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  mensajeResultado: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  botonResultado: {
    width: '100%',
    backgroundColor: C.verde,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  botonResultadoError: {
    backgroundColor: C.rojo,
  },
  textoBotonResultado: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },
});
