
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../services/supabase';

// ======================================================
// COLORES PETCARE: PALETA SUAVE Y MINIMALISTA
// ======================================================
const C = {
  primario: '#187C72',
  primarioOscuro: '#12665E',
  fondo: '#FFFFFF',
  texto: '#243A37',
  secundario: '#71817D',
  borde: '#E0E8E5',
  verdeClaro: '#EAF5F2',
  rojo: '#DC2626',
  grisClaro: '#F5F7F6',
  placeholder: '#9AA8A4',
};

// Se eliminaron las opciones Roedor y Reptil.
const OPCIONES_ESPECIE = [
  'Perro',
  'Gato',
  'Ave',
  'Conejo',
  'Otro',
];

const OPCIONES_SEXO = [
  'Macho',
  'Hembra',
  'No registrado',
];

const OPCIONES_ESTERILIZACION = [
  'Esterilizado',
  'No esterilizado',
  'No aplica',
];

// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

function textoSeguro(valor) {
  return valor === null || valor === undefined
    ? ''
    : String(valor);
}

// Devuelve el nombre completo del propietario.
function obtenerNombrePropietario(propietario) {
  if (!propietario) return '';

  return `${propietario.nombre ?? ''} ${
    propietario.apellido ?? ''
  }`.trim();
}

// Convierte AAAA-MM-DD en una fecha local.
function fechaDesdeTexto(valor) {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return new Date();
  }

  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);

  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return new Date();
  }

  return fecha;
}

// Formato de fecha requerido por Supabase.
function fechaAISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

// Formato visible DD/MM/AAAA.
function fechaVisible(valor) {
  if (!valor) return '';

  return fechaAISO(fechaDesdeTexto(valor))
    .split('-')
    .reverse()
    .join('/');
}

// Comprueba si la especie guardada pertenece a las opciones normales.
function esEspeciePredefinida(valor) {
  return OPCIONES_ESPECIE.includes(textoSeguro(valor));
}

// Obtiene el nombre que debe mostrarse en el campo personalizado.
// Si Supabase tiene una especie no incluida en las opciones,
// el formulario la representa mediante "Otro".
function obtenerEspecieSeleccionada(valor) {
  const especieGuardada = textoSeguro(valor).trim();

  if (!especieGuardada) return '';

  return esEspeciePredefinida(especieGuardada)
    ? especieGuardada
    : 'Otro';
}

// Obtiene el detalle de la especie cuando se edita una mascota.
function obtenerEspeciePersonalizada(valor) {
  const especieGuardada = textoSeguro(valor).trim();

  if (
    especieGuardada &&
    !esEspeciePredefinida(especieGuardada)
  ) {
    return especieGuardada;
  }

  return '';
}

// ======================================================
// FORMULARIO DE MASCOTA
// ======================================================

export default function FormularioMascota({
  modo = 'registro',
  datosIniciales = null,
  onContinuar,
  onCancelar,
  cargando = false,
}) {
  // ----------------------------------------------------
  // ESTADOS
  // ----------------------------------------------------

  const [propietarios, setPropietarios] = useState([]);
  const [cargandoPropietarios, setCargandoPropietarios] =
    useState(true);

  const [propietarioId, setPropietarioId] = useState(
    textoSeguro(datosIniciales?.propietario_id)
  );

  const [nombre, setNombre] = useState(
    textoSeguro(datosIniciales?.nombre)
  );

  // Estado de la opción principal de especie.
  const [especie, setEspecie] = useState(
    obtenerEspecieSeleccionada(datosIniciales?.especie)
  );

  // Nombre específico cuando la opción seleccionada es "Otro".
  const [especiePersonalizada, setEspeciePersonalizada] =
    useState(
      obtenerEspeciePersonalizada(datosIniciales?.especie)
    );

  const [raza, setRaza] = useState(
    textoSeguro(datosIniciales?.raza)
  );

  const [sexo, setSexo] = useState(
    datosIniciales?.sexo || 'No registrado'
  );

  const [fechaNacimiento, setFechaNacimiento] = useState(
    textoSeguro(datosIniciales?.fecha_nacimiento)
  );

  const [color, setColor] = useState(
    textoSeguro(datosIniciales?.color)
  );

  const [estadoEsterilizacion, setEstadoEsterilizacion] =
    useState(
      OPCIONES_ESTERILIZACION.includes(
        datosIniciales?.estado_esterilizacion
      )
        ? datosIniciales.estado_esterilizacion
        : 'No aplica'
    );

  const [observaciones, setObservaciones] = useState(
    textoSeguro(datosIniciales?.observaciones)
  );

  // Estados para los modales, el calendario y los errores.
  const [errores, setErrores] = useState({});

  const [modalPropietariosVisible, setModalPropietariosVisible] =
    useState(false);

  const [busquedaPropietario, setBusquedaPropietario] =
    useState('');

  const [calendarioVisible, setCalendarioVisible] =
    useState(false);

  const [fechaCalendario, setFechaCalendario] = useState(
    fechaDesdeTexto(datosIniciales?.fecha_nacimiento)
  );

  const esEdicion = modo === 'edicion';

  // ----------------------------------------------------
  // CARGAR LOS DATOS CUANDO SE EDITA UNA MASCOTA
  // ----------------------------------------------------

  useEffect(() => {
    if (!datosIniciales) return;

    setPropietarioId(
      textoSeguro(datosIniciales.propietario_id)
    );

    setNombre(textoSeguro(datosIniciales.nombre));

    // Si la especie no es una opción normal, seleccionar "Otro".
    setEspecie(
      obtenerEspecieSeleccionada(datosIniciales.especie)
    );

    // Recuperar el nombre de la especie personalizada.
    setEspeciePersonalizada(
      obtenerEspeciePersonalizada(datosIniciales.especie)
    );

    setRaza(textoSeguro(datosIniciales.raza));

    setSexo(datosIniciales.sexo || 'No registrado');

    setFechaNacimiento(
      textoSeguro(datosIniciales.fecha_nacimiento)
    );

    setFechaCalendario(
      fechaDesdeTexto(datosIniciales.fecha_nacimiento)
    );

    setColor(textoSeguro(datosIniciales.color));

    setEstadoEsterilizacion(
      OPCIONES_ESTERILIZACION.includes(
        datosIniciales.estado_esterilizacion
      )
        ? datosIniciales.estado_esterilizacion
        : 'No aplica'
    );

    setObservaciones(
      textoSeguro(datosIniciales.observaciones)
    );

    setErrores({});
  }, [datosIniciales]);

  // ----------------------------------------------------
  // CONSULTAR PROPIETARIOS EN SUPABASE
  // ----------------------------------------------------

  useEffect(() => {
    let activo = true;

    async function cargarPropietarios() {
      try {
        setCargandoPropietarios(true);

        const { data, error } = await supabase
          .from('propietarios')
          .select(`
            propietario_id,
            nombre,
            apellido,
            documento_identidad,
            telefono,
            correo,
            direccion
          `)
          .order('nombre', { ascending: true });

        if (error) throw error;

        if (activo) {
          setPropietarios(data || []);
        }
      } catch (error) {
        console.error(
          'Error al cargar propietarios:',
          error.message
        );

        if (activo) {
          Alert.alert(
            'Error',
            'No se pudieron cargar los propietarios. Inténtelo nuevamente.'
          );
        }
      } finally {
        if (activo) {
          setCargandoPropietarios(false);
        }
      }
    }

    cargarPropietarios();

    return () => {
      activo = false;
    };
  }, []);

  // Propietario seleccionado, tanto para registro como edición.
  const propietarioSeleccionado =
    propietarios.find(
      (propietario) =>
        String(propietario.propietario_id) ===
        String(propietarioId)
    ) ||
    datosIniciales?.propietarios ||
    null;

  // Filtrar por nombre o documento.
  const propietariosFiltrados = propietarios.filter(
    (propietario) => {
      const termino = busquedaPropietario.trim().toLowerCase();

      const nombreCompleto =
        obtenerNombrePropietario(propietario).toLowerCase();

      const documento = textoSeguro(
        propietario.documento_identidad
      ).toLowerCase();

      return (
        nombreCompleto.includes(termino) ||
        documento.includes(termino)
      );
    }
  );

  // ----------------------------------------------------
  // CAMBIO DE ESPECIE
  // ----------------------------------------------------

  function seleccionarEspecie(nuevaEspecie) {
    setEspecie(nuevaEspecie);
    limpiarError('especie');

    // Al elegir una especie normal, borrar el detalle de "Otro".
    if (nuevaEspecie !== 'Otro') {
      setEspeciePersonalizada('');
      limpiarError('especiePersonalizada');
    }
  }

  // ----------------------------------------------------
  // VALIDACIONES
  // ----------------------------------------------------

  function limpiarError(campo) {
    setErrores((actuales) => ({
      ...actuales,
      [campo]: '',
    }));
  }

  function validarFormulario() {
    const nuevosErrores = {};

    if (!propietarioId) {
      nuevosErrores.propietario_id =
        'Selecciona un propietario.';
    }

    if (!nombre.trim()) {
      nuevosErrores.nombre =
        'Ingresa el nombre de la mascota.';
    }

    if (!especie) {
      nuevosErrores.especie =
        'Selecciona una especie.';
    }

    // Si selecciona "Otro", debe especificar cuál.
    if (
      especie === 'Otro' &&
      !especiePersonalizada.trim()
    ) {
      nuevosErrores.especiePersonalizada =
        'Especifica la especie de la mascota.';
    }

    if (fechaNacimiento) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento)) {
        nuevosErrores.fecha_nacimiento =
          'Selecciona una fecha válida.';
      } else {
        const fecha = fechaDesdeTexto(fechaNacimiento);
        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999);

        if (fecha > hoy) {
          nuevosErrores.fecha_nacimiento =
            'La fecha no puede ser futura.';
        }
      }
    }

    if (
      !OPCIONES_ESTERILIZACION.includes(
        estadoEsterilizacion
      )
    ) {
      nuevosErrores.estado_esterilizacion =
        'Selecciona un estado válido.';
    }

    setErrores(nuevosErrores);

    return Object.values(nuevosErrores).every(
      (mensaje) => !mensaje
    );
  }

  // ----------------------------------------------------
  // PREPARAR Y ENVIAR LOS DATOS
  // ----------------------------------------------------

  async function manejarContinuar() {
    if (cargando || !validarFormulario()) return;

    // Si eligió "Otro", se guarda el nombre específico en
    // la columna existente "especie" de Supabase.
    const especieFinal =
      especie === 'Otro'
        ? especiePersonalizada.trim()
        : especie.trim();

    const datosMascota = {
      propietario_id: propietarioId,
      nombre: nombre.trim(),
      especie: especieFinal,
      raza: raza.trim() || null,
      sexo: sexo || 'No registrado',
      fecha_nacimiento: fechaNacimiento || null,
      color: color.trim() || null,
      estado_esterilizacion: estadoEsterilizacion,
      observaciones: observaciones.trim() || null,
    };

    try {
      if (typeof onContinuar === 'function') {
        await onContinuar(datosMascota);
      }
    } catch (error) {
      console.error(
        'Error al enviar la mascota:',
        error
      );

      Alert.alert(
        'Error',
        'No se pudieron procesar los datos de la mascota.'
      );
    }
  }

  // ----------------------------------------------------
  // PROPIETARIO Y CALENDARIO
  // ----------------------------------------------------

  function seleccionarPropietario(propietario) {
    setPropietarioId(
      String(propietario.propietario_id)
    );

    setModalPropietariosVisible(false);
    setBusquedaPropietario('');
    limpiarError('propietario_id');
  }

  function abrirCalendario() {
    setFechaCalendario(
      fechaDesdeTexto(fechaNacimiento)
    );

    setCalendarioVisible(true);
  }

  function seleccionarFecha(evento, fechaSeleccionada) {
    if (evento?.type === 'dismissed') {
      setCalendarioVisible(false);
      return;
    }

    if (fechaSeleccionada) {
      setFechaCalendario(fechaSeleccionada);
      setFechaNacimiento(fechaAISO(fechaSeleccionada));
      limpiarError('fecha_nacimiento');
    }

    setCalendarioVisible(false);
  }

  function renderError(campo) {
    if (!errores[campo]) return null;

    return (
      <Text style={styles.textoError}>
        {errores[campo]}
      </Text>
    );
  }

  // Campo de texto reutilizable para mantener el mismo estilo.
  function renderCampoTexto({
    etiqueta,
    valor,
    cambiarValor,
    placeholder,
    campo,
    multilinea = false,
  }) {
    return (
      <View style={styles.campo}>
        <Text style={styles.etiqueta}>{etiqueta}</Text>

        <TextInput
          style={[
            styles.input,
            multilinea && styles.inputMultilinea,
            errores[campo] && styles.inputConError,
          ]}
          value={valor}
          onChangeText={(texto) => {
            cambiarValor(texto);
            limpiarError(campo);
          }}
          placeholder={placeholder}
          placeholderTextColor={C.placeholder}
          multiline={multilinea}
          textAlignVertical={
            multilinea ? 'top' : 'center'
          }
          editable={!cargando}
        />

        {renderError(campo)}
      </View>
    );
  }

  // Opciones compactas en una sola fila.
  function renderOpciones({
    etiqueta,
    valor,
    opciones,
    seleccionar,
    campo,
  }) {
    return (
      <View style={styles.campo}>
        <Text style={styles.etiqueta}>{etiqueta}</Text>

        <View style={styles.filaOpciones}>
          {opciones.map((opcion) => {
            const seleccionada = valor === opcion;

            return (
              <TouchableOpacity
                key={opcion}
                style={[
                  styles.opcion,
                  seleccionada &&
                    styles.opcionSeleccionada,
                ]}
                onPress={() => {
                  seleccionar(opcion);
                  limpiarError(campo);
                }}
                disabled={cargando}
                activeOpacity={0.75}
              >
                {seleccionada && (
                  <View
                    style={styles.puntoSeleccionado}
                  />
                )}

                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                  style={[
                    styles.textoOpcion,
                    seleccionada &&
                      styles.textoOpcionSeleccionada,
                  ]}
                >
                  {opcion}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {renderError(campo)}
      </View>
    );
  }

  // Títulos sencillos: sin números ni descripciones repetitivas.
  function renderTitulo(titulo) {
    return (
      <Text style={styles.tituloSeccion}>
        {titulo}
      </Text>
    );
  }

  // ====================================================
  // INTERFAZ PRINCIPAL
  // ====================================================

  return (
    <View style={styles.contenedorPrincipal}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* PROPIETARIO */}
        <View style={styles.seccion}>
          {renderTitulo('Propietario')}

          <View style={styles.campo}>
            <Text style={styles.etiqueta}>
              Propietario *
            </Text>

            <TouchableOpacity
              style={[
                styles.selectorPropietario,
                errores.propietario_id &&
                  styles.inputConError,
              ]}
              onPress={() => {
                setBusquedaPropietario('');
                setModalPropietariosVisible(true);
              }}
              disabled={cargando}
              activeOpacity={0.75}
            >
              <View style={styles.contenidoSelector}>
                <View style={styles.iconoPropietario}>
                  <Text
                    style={styles.textoIconoPropietario}
                  >
                    P
                  </Text>
                </View>

                <View style={styles.infoPropietario}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.textoPropietario,
                      !propietarioSeleccionado &&
                        styles.textoPlaceholder,
                    ]}
                  >
                    {propietarioSeleccionado
                      ? obtenerNombrePropietario(
                          propietarioSeleccionado
                        ) || 'Propietario seleccionado'
                      : 'Seleccionar propietario'}
                  </Text>

                  {!!propietarioSeleccionado?.documento_identidad && (
                    <Text
                      style={styles.documentoPropietario}
                    >
                      DNI:{' '}
                      {propietarioSeleccionado.documento_identidad}
                    </Text>
                  )}
                </View>
              </View>

              <Text style={styles.flechaSelector}>
                ⌄
              </Text>
            </TouchableOpacity>

            {renderError('propietario_id')}
          </View>
        </View>

        <View style={styles.divisor} />

        {/* DATOS GENERALES */}
        <View style={styles.seccion}>
          {renderTitulo('Datos de la mascota')}

          {renderCampoTexto({
            etiqueta: 'Nombre *',
            valor: nombre,
            cambiarValor: setNombre,
            placeholder: 'Ej. Luna',
            campo: 'nombre',
          })}

          {renderOpciones({
            etiqueta: 'Especie *',
            valor: especie,
            opciones: OPCIONES_ESPECIE,
            seleccionar: seleccionarEspecie,
            campo: 'especie',
          })}

          {/* Este campo aparece únicamente si se elige "Otro". */}
          {especie === 'Otro' && (
            <View style={styles.campo}>
              <Text style={styles.etiqueta}>
                Especifique la especie *
              </Text>

              <TextInput
                style={[
                  styles.input,
                  errores.especiePersonalizada &&
                    styles.inputConError,
                ]}
                value={especiePersonalizada}
                onChangeText={(texto) => {
                  setEspeciePersonalizada(texto);
                  limpiarError('especiePersonalizada');
                }}
                placeholder="Ej. Hurón, erizo, cerdo..."
                placeholderTextColor={C.placeholder}
                editable={!cargando}
                autoCapitalize="sentences"
                maxLength={80}
              />

              {renderError('especiePersonalizada')}
            </View>
          )}

          {renderCampoTexto({
            etiqueta: 'Raza',
            valor: raza,
            cambiarValor: setRaza,
            placeholder: 'Ingresar raza',
            campo: 'raza',
          })}

          {renderOpciones({
            etiqueta: 'Sexo',
            valor: sexo,
            opciones: OPCIONES_SEXO,
            seleccionar: setSexo,
            campo: 'sexo',
          })}

          {/* Fecha con botón de calendario integrado. */}
          <View style={styles.campo}>
            <Text style={styles.etiqueta}>
              Fecha de nacimiento
            </Text>

            <View
              style={[
                styles.filaFecha,
                errores.fecha_nacimiento &&
                  styles.inputConError,
              ]}
            >
              <TextInput
                style={styles.inputFecha}
                value={fechaVisible(fechaNacimiento)}
                placeholder="Seleccionar fecha"
                placeholderTextColor={C.placeholder}
                editable={false}
                accessibilityLabel="Fecha de nacimiento"
              />

              {!!fechaNacimiento && (
                <TouchableOpacity
                  style={styles.botonLimpiarFecha}
                  onPress={() => {
                    setFechaNacimiento('');
                    limpiarError('fecha_nacimiento');
                  }}
                  disabled={cargando}
                  accessibilityLabel="Limpiar fecha"
                >
                  <Text style={styles.textoLimpiarFecha}>
                    ×
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.botonCalendario}
                onPress={abrirCalendario}
                disabled={cargando}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Abrir calendario"
              >
                <Text style={styles.iconoCalendario}>
                  ▦
                </Text>
              </TouchableOpacity>
            </View>

            {renderError('fecha_nacimiento')}
          </View>

          {renderCampoTexto({
            etiqueta: 'Color',
            valor: color,
            cambiarValor: setColor,
            placeholder: 'Ej. Marrón con blanco',
            campo: 'color',
          })}

          {renderOpciones({
            etiqueta: 'Esterilización',
            valor: estadoEsterilizacion,
            opciones: OPCIONES_ESTERILIZACION,
            seleccionar: setEstadoEsterilizacion,
            campo: 'estado_esterilizacion',
          })}
        </View>

        <View style={styles.divisor} />

        {/* INFORMACIÓN ADICIONAL */}
        <View style={styles.seccion}>
          {renderTitulo('Información adicional')}

          {renderCampoTexto({
            etiqueta: 'Observaciones',
            valor: observaciones,
            cambiarValor: setObservaciones,
            placeholder: 'Detalles relevantes (opcional)',
            campo: 'observaciones',
            multilinea: true,
          })}
        </View>

        {/* ACCIONES */}
        <View style={styles.contenedorBotones}>
          <TouchableOpacity
            style={styles.botonCancelar}
            onPress={onCancelar}
            disabled={cargando}
            activeOpacity={0.8}
          >
            <Text style={styles.textoBotonCancelar}>
              Cancelar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.botonContinuar,
              cargando && styles.botonDeshabilitado,
            ]}
            onPress={manejarContinuar}
            disabled={cargando}
            activeOpacity={0.8}
          >
            {cargando ? (
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
              />
            ) : (
              <Text style={styles.textoBotonContinuar}>
                {esEdicion
                  ? 'Guardar cambios'
                  : 'Registrar mascota'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.espacioFinal} />
      </ScrollView>

      {/* CALENDARIO DEL DISPOSITIVO */}
      {calendarioVisible && (
        <DateTimePicker
          value={fechaCalendario}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={seleccionarFecha}
        />
      )}

      {/* MODAL DE SELECCIÓN DE PROPIETARIO */}
      <Modal
        visible={modalPropietariosVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setModalPropietariosVisible(false)
        }
      >
        <View style={styles.fondoModal}>
          <View style={styles.contenedorModal}>
            <View style={styles.encabezadoModal}>
              <View style={styles.titulosModal}>
                <Text style={styles.tituloModal}>
                  Seleccionar propietario
                </Text>

                <Text style={styles.subtituloModal}>
                  Busca por nombre o documento.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.botonCerrarModal}
                onPress={() =>
                  setModalPropietariosVisible(false)
                }
                activeOpacity={0.75}
              >
                <Text style={styles.textoCerrarModal}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.inputBusqueda}
              placeholder="Buscar por nombre o DNI..."
              placeholderTextColor={C.placeholder}
              value={busquedaPropietario}
              onChangeText={setBusquedaPropietario}
              autoCapitalize="none"
            />

            {cargandoPropietarios ? (
              <View style={styles.estadoModal}>
                <ActivityIndicator
                  color={C.primario}
                  size="large"
                />

                <Text style={styles.textoEstadoModal}>
                  Cargando propietarios...
                </Text>
              </View>
            ) : propietariosFiltrados.length === 0 ? (
              <View style={styles.estadoModal}>
                <Text style={styles.textoSinResultados}>
                  No se encontraron propietarios.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.listaPropietarios}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {propietariosFiltrados.map((propietario) => {
                  const seleccionado =
                    String(propietario.propietario_id) ===
                    String(propietarioId);

                  return (
                    <TouchableOpacity
                      key={String(
                        propietario.propietario_id
                      )}
                      style={[
                        styles.itemPropietario,
                        seleccionado &&
                          styles.itemPropietarioSeleccionado,
                      ]}
                      onPress={() =>
                        seleccionarPropietario(propietario)
                      }
                      activeOpacity={0.75}
                    >
                      <View style={styles.avatarPropietario}>
                        <Text style={styles.textoAvatar}>
                          {obtenerNombrePropietario(propietario)
                            .charAt(0)
                            .toUpperCase() || 'P'}
                        </Text>
                      </View>

                      <View style={styles.detallePropietario}>
                        <Text
                          style={styles.nombreListaPropietario}
                        >
                          {obtenerNombrePropietario(propietario)}
                        </Text>

                        <Text
                          style={
                            styles.documentoListaPropietario
                          }
                        >
                          DNI:{' '}
                          {propietario.documento_identidad ||
                            'No registrado'}
                        </Text>

                        {!!propietario.telefono && (
                          <Text
                            style={styles.telefonoPropietario}
                          >
                            {propietario.telefono}
                          </Text>
                        )}
                      </View>

                      {seleccionado && (
                        <Text style={styles.marcaSeleccion}>
                          ✓
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.botonCerrarInferior}
              onPress={() =>
                setModalPropietariosVisible(false)
              }
              activeOpacity={0.8}
            >
              <Text style={styles.textoBotonCerrarInferior}>
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ====================================================
// ESTILOS: SIMPLES, COMPACTOS Y SIN TARJETAS EXTERIORES
// ====================================================

const styles = StyleSheet.create({
  contenedorPrincipal: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  scroll: {
    flex: 1,
  },

  contenido: {
    flexGrow: 1,
    paddingTop: 4,
    paddingBottom: 16,
  },

  seccion: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 0,
  },

  tituloSeccion: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 15,
  },

  divisor: {
    height: 1,
    backgroundColor: C.borde,
    marginHorizontal: 18,
    marginVertical: 5,
  },

  campo: {
    marginBottom: 13,
  },

  etiqueta: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },

  input: {
    minHeight: 43,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 9,
    backgroundColor: C.fondo,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: C.texto,
    fontSize: 14,
  },

  inputMultilinea: {
    minHeight: 76,
    paddingTop: 11,
  },

  inputConError: {
    borderColor: C.rojo,
  },

  textoError: {
    color: C.rojo,
    fontSize: 11,
    marginTop: 5,
  },

  // Selector de propietario.
  selectorPropietario: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 9,
    backgroundColor: C.fondo,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  contenidoSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoPropietario: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  textoIconoPropietario: {
    color: C.primario,
    fontSize: 14,
    fontWeight: '800',
  },

  infoPropietario: {
    flex: 1,
  },

  textoPropietario: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '600',
  },

  textoPlaceholder: {
    color: C.placeholder,
    fontWeight: '400',
  },

  documentoPropietario: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 3,
  },

  flechaSelector: {
    color: C.secundario,
    fontSize: 21,
    marginLeft: 8,
  },

  // Opciones compactas en una fila.
  filaOpciones: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 5,
  },

  opcion: {
    flex: 1,
    minWidth: 0,
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 3,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 8,
    backgroundColor: C.fondo,
  },

  opcionSeleccionada: {
    backgroundColor: C.verdeClaro,
    borderColor: C.primario,
  },

  puntoSeleccionado: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.primario,
  },

  textoOpcion: {
    flexShrink: 1,
    color: C.secundario,
    fontSize: 10,
    textAlign: 'center',
  },

  textoOpcionSeleccionada: {
    color: C.primarioOscuro,
    fontWeight: '800',
  },

  // Fecha y calendario.
  filaFecha: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 9,
    backgroundColor: C.fondo,
    overflow: 'hidden',
  },

  inputFecha: {
    flex: 1,
    minWidth: 0,
    color: C.texto,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  botonCalendario: {
    width: 43,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.verdeClaro,
    borderLeftWidth: 1,
    borderLeftColor: C.borde,
  },

  iconoCalendario: {
    color: C.primario,
    fontSize: 19,
    fontWeight: '700',
  },

  botonLimpiarFecha: {
    alignSelf: 'stretch',
    paddingHorizontal: 9,
    justifyContent: 'center',
  },

  textoLimpiarFecha: {
    color: C.secundario,
    fontSize: 21,
  },

  // Botones inferiores.
  contenedorBotones: {
    flexDirection: 'row',
    gap: 9,
    marginHorizontal: 18,
    marginTop: 5,
  },

  botonCancelar: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 9,
    backgroundColor: C.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  textoBotonCancelar: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '700',
  },

  botonContinuar: {
    flex: 1.5,
    minHeight: 44,
    borderRadius: 9,
    backgroundColor: C.primario,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },

  textoBotonContinuar: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  botonDeshabilitado: {
    opacity: 0.65,
  },

  espacioFinal: {
    height: 14,
  },

  // Modal de propietarios.
  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },

  contenedorModal: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '82%',
    backgroundColor: C.fondo,
    borderRadius: 15,
    padding: 16,
  },

  encabezadoModal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  titulosModal: {
    flex: 1,
    paddingRight: 10,
  },

  tituloModal: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
  },

  subtituloModal: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },

  botonCerrarModal: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: C.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoCerrarModal: {
    color: C.texto,
    fontSize: 24,
    lineHeight: 27,
  },

  inputBusqueda: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 9,
    paddingHorizontal: 11,
    color: C.texto,
    fontSize: 13,
    marginBottom: 10,
    backgroundColor: C.fondo,
  },

  listaPropietarios: {
    flexGrow: 0,
    flexShrink: 1,
  },

  itemPropietario: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.borde,
    borderRadius: 8,
  },

  itemPropietarioSeleccionado: {
    backgroundColor: C.verdeClaro,
  },

  avatarPropietario: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  textoAvatar: {
    color: C.primario,
    fontSize: 14,
    fontWeight: '800',
  },

  detallePropietario: {
    flex: 1,
  },

  nombreListaPropietario: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
  },

  documentoListaPropietario: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 3,
  },

  telefonoPropietario: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 2,
  },

  marcaSeleccion: {
    color: C.primario,
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 7,
  },

  estadoModal: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 25,
  },

  textoEstadoModal: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 9,
  },

  textoSinResultados: {
    color: C.secundario,
    fontSize: 13,
    paddingVertical: 22,
    textAlign: 'center',
  },

  botonCerrarInferior: {
    minHeight: 41,
    backgroundColor: C.grisClaro,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  textoBotonCerrarInferior: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
  },
});
