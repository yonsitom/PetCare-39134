import React, { useEffect, useMemo, useState } from 'react';
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

import { supabase } from '../../services/supabase';

import {
  validarDatosRegistroMascota,
} from '../../utils/validacionesRegistroMascota';

import {
  validarDatosEdicionMascota,
} from '../../utils/validacionesEdicionMascota';

// ======================================================
// COLORES PETCARE
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

const OPCIONES_ESPECIE = ['Perro', 'Gato', 'Ave', 'Otro'];

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

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

function textoSeguro(valor) {
  return valor === null || valor === undefined
    ? ''
    : String(valor);
}

function obtenerNombrePropietario(propietario) {
  if (!propietario) return '';

  return `${propietario.nombre ?? ''} ${
    propietario.apellido ?? ''
  }`.trim();
}

function fechaDesdeTexto(valor) {
  if (
    typeof valor !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(valor)
  ) {
    return null;
  }

  const [anio, mes, dia] = valor.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);

  if (
    fecha.getFullYear() !== anio ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }

  return fecha;
}

function fechaAISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

function fechaVisible(valor) {
  if (!valor) return '';

  const fecha = fechaDesdeTexto(valor);

  if (!fecha) return textoSeguro(valor);

  return fechaAISO(fecha).split('-').reverse().join('/');
}

function esEspeciePredefinida(valor) {
  return OPCIONES_ESPECIE.includes(textoSeguro(valor));
}

function obtenerEspecieSeleccionada(valor) {
  const especieGuardada = textoSeguro(valor).trim();

  if (!especieGuardada) return '';

  return esEspeciePredefinida(especieGuardada)
    ? especieGuardada
    : 'Otro';
}

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

function obtenerDiasDelMes(anio, mes) {
  return new Date(anio, mes + 1, 0).getDate();
}

function obtenerPrimerDiaDelMes(anio, mes) {
  return new Date(anio, mes, 1).getDay();
}

function esMismoDia(fechaA, fechaB) {
  return (
    fechaA.getFullYear() === fechaB.getFullYear() &&
    fechaA.getMonth() === fechaB.getMonth() &&
    fechaA.getDate() === fechaB.getDate()
  );
}

function fechaEsFutura(fecha) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fechaComparar = new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate()
  );

  return fechaComparar > hoy;
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

  const [especie, setEspecie] = useState(
    obtenerEspecieSeleccionada(datosIniciales?.especie)
  );

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

  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');

  const [modalPropietariosVisible, setModalPropietariosVisible] =
    useState(false);

  const [busquedaPropietario, setBusquedaPropietario] =
    useState('');

  const [calendarioVisible, setCalendarioVisible] =
    useState(false);

  const [mesCalendario, setMesCalendario] = useState(() => {
    const fechaInicial = fechaDesdeTexto(
      datosIniciales?.fecha_nacimiento
    );

    return fechaInicial || new Date();
  });

  const [fechaTemporal, setFechaTemporal] = useState(
    fechaDesdeTexto(datosIniciales?.fecha_nacimiento)
  );

  // Nueva vista para seleccionar directamente mes y año.
  const [vistaSelectorFecha, setVistaSelectorFecha] =
    useState(false);

  const [anioTexto, setAnioTexto] = useState(
    String(new Date().getFullYear())
  );

  const esEdicion = modo === 'edicion';

  // ----------------------------------------------------
  // CARGAR DATOS INICIALES PARA EDICIÓN
  // ----------------------------------------------------

  useEffect(() => {
    if (!datosIniciales) return;

    setPropietarioId(
      textoSeguro(datosIniciales.propietario_id)
    );

    setNombre(textoSeguro(datosIniciales.nombre));

    setEspecie(
      obtenerEspecieSeleccionada(datosIniciales.especie)
    );

    setEspeciePersonalizada(
      obtenerEspeciePersonalizada(datosIniciales.especie)
    );

    setRaza(textoSeguro(datosIniciales.raza));
    setSexo(datosIniciales.sexo || 'No registrado');

    setFechaNacimiento(
      textoSeguro(datosIniciales.fecha_nacimiento)
    );

    const fechaInicial = fechaDesdeTexto(
      datosIniciales.fecha_nacimiento
    );

    setMesCalendario(fechaInicial || new Date());
    setFechaTemporal(fechaInicial);

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
    setErrorGeneral('');
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
          error
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

  // ----------------------------------------------------
  // PROPIETARIO SELECCIONADO Y FILTRADO
  // ----------------------------------------------------

  const propietarioSeleccionado =
    propietarios.find(
      (propietario) =>
        String(propietario.propietario_id) ===
        String(propietarioId)
    ) ||
    datosIniciales?.propietarios ||
    null;

  const propietariosFiltrados = useMemo(() => {
    const termino = busquedaPropietario.trim().toLowerCase();

    return propietarios.filter((propietario) => {
      const nombreCompleto =
        obtenerNombrePropietario(propietario).toLowerCase();

      const documento = textoSeguro(
        propietario.documento_identidad
      ).toLowerCase();

      return (
        nombreCompleto.includes(termino) ||
        documento.includes(termino)
      );
    });
  }, [propietarios, busquedaPropietario]);

  // ----------------------------------------------------
  // LIMPIEZA DE ERRORES
  // ----------------------------------------------------

  function limpiarError(campo) {
    setErrores((actuales) => ({
      ...actuales,
      [campo]: '',
    }));

    setErrorGeneral('');
  }

  // ----------------------------------------------------
  // VALIDACIONES DE INTERFAZ
  // ----------------------------------------------------

  function validarFormulario() {
    const nuevosErrores = {};

    if (
      propietarioId === null ||
      propietarioId === undefined ||
      String(propietarioId).trim() === ''
    ) {
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

    if (
      especie === 'Otro' &&
      !especiePersonalizada.trim()
    ) {
      nuevosErrores.especiePersonalizada =
        'Especifica la especie de la mascota.';
    }

    if (fechaNacimiento) {
      const fechaValida = fechaDesdeTexto(fechaNacimiento);

      if (!fechaValida) {
        nuevosErrores.fecha_nacimiento =
          'Selecciona una fecha válida.';
      } else if (fechaEsFutura(fechaValida)) {
        nuevosErrores.fecha_nacimiento =
          'La fecha no puede ser futura.';
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

    return Object.keys(nuevosErrores).length === 0;
  }

  // ----------------------------------------------------
  // PREPARAR Y VALIDAR LOS DATOS
  // ----------------------------------------------------

  async function manejarContinuar() {
    if (cargando) return;

    const formularioValido = validarFormulario();

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

    if (!formularioValido) {
      setErrorGeneral(
        'Verifique los campos señalados antes de continuar.'
      );
      return;
    }

    // RF17 valida el registro; RF18 valida la modificación.
    const resultado = esEdicion
      ? validarDatosEdicionMascota(datosMascota)
      : validarDatosRegistroMascota(datosMascota);

    if (!resultado.valido) {
      setErrorGeneral(resultado.mensaje);
      return;
    }

    setErrorGeneral('');

    try {
      if (typeof onContinuar === 'function') {
        await onContinuar(datosMascota);
      }
    } catch (error) {
      console.error(
        'Error al enviar los datos de la mascota:',
        error
      );

      Alert.alert(
        'Error',
        'No se pudieron procesar los datos de la mascota.'
      );
    }
  }

  // ----------------------------------------------------
  // CAMBIOS DE ESPECIE Y PROPIETARIO
  // ----------------------------------------------------

  function seleccionarEspecie(nuevaEspecie) {
    setEspecie(nuevaEspecie);
    limpiarError('especie');

    if (nuevaEspecie !== 'Otro') {
      setEspeciePersonalizada('');
      limpiarError('especiePersonalizada');
    }
  }

  function seleccionarPropietario(propietario) {
    setPropietarioId(
      String(propietario.propietario_id)
    );

    setModalPropietariosVisible(false);
    setBusquedaPropietario('');
    limpiarError('propietario_id');
  }

  // ----------------------------------------------------
  // CALENDARIO PROPIO COMPATIBLE CON EXPO WEB
  // ----------------------------------------------------

  function abrirCalendario() {
    const fechaActual =
      fechaDesdeTexto(fechaNacimiento) || new Date();

    setFechaTemporal(fechaActual);
    setMesCalendario(fechaActual);
    setAnioTexto(String(fechaActual.getFullYear()));
    setVistaSelectorFecha(false);
    setCalendarioVisible(true);
  }

  function cambiarMes(direccion) {
    setMesCalendario((actual) => {
      const nuevaFecha = new Date(
        actual.getFullYear(),
        actual.getMonth() + direccion,
        1
      );

      const hoy = new Date();

      if (
        nuevaFecha.getFullYear() > hoy.getFullYear() ||
        (
          nuevaFecha.getFullYear() === hoy.getFullYear() &&
          nuevaFecha.getMonth() > hoy.getMonth()
        )
      ) {
        return actual;
      }

      return nuevaFecha;
    });
  }

  function abrirSelectorMesAnio() {
    setAnioTexto(String(mesCalendario.getFullYear()));
    setVistaSelectorFecha(true);
  }

  function seleccionarMes(mes) {
    const anio = Number(anioTexto);
    const anioActual = new Date().getFullYear();

    if (
      !Number.isInteger(anio) ||
      anio < 1900 ||
      anio > anioActual
    ) {
      Alert.alert(
        'Año no válido',
        `Ingresa un año entre 1900 y ${anioActual}.`
      );
      return;
    }

    const hoy = new Date();

    if (
      anio === hoy.getFullYear() &&
      mes > hoy.getMonth()
    ) {
      Alert.alert(
        'Mes no válido',
        'No puedes seleccionar un mes futuro.'
      );
      return;
    }

    setMesCalendario(new Date(anio, mes, 1));
    setVistaSelectorFecha(false);
  }

  function seleccionarDia(dia) {
    const anio = mesCalendario.getFullYear();
    const mes = mesCalendario.getMonth();
    const fechaSeleccionada = new Date(anio, mes, dia);

    if (fechaEsFutura(fechaSeleccionada)) {
      return;
    }

    setFechaTemporal(fechaSeleccionada);
  }

  function confirmarFecha() {
    if (!fechaTemporal) {
      setCalendarioVisible(false);
      return;
    }

    if (fechaEsFutura(fechaTemporal)) {
      setErrores((actuales) => ({
        ...actuales,
        fecha_nacimiento: 'La fecha no puede ser futura.',
      }));
      return;
    }

    setFechaNacimiento(fechaAISO(fechaTemporal));
    setCalendarioVisible(false);
    setVistaSelectorFecha(false);
    limpiarError('fecha_nacimiento');
  }

  function limpiarFecha() {
    setFechaNacimiento('');
    setFechaTemporal(null);
    limpiarError('fecha_nacimiento');
  }

  const anioCalendario = mesCalendario.getFullYear();
  const mesCalendarioNumero = mesCalendario.getMonth();

  const cantidadDias = obtenerDiasDelMes(
    anioCalendario,
    mesCalendarioNumero
  );

  const primerDia = obtenerPrimerDiaDelMes(
    anioCalendario,
    mesCalendarioNumero
  );

  const diasCalendario = [
    ...Array(primerDia).fill(null),
    ...Array.from(
      { length: cantidadDias },
      (_, indice) => indice + 1
    ),
  ];

  const anioActual = new Date().getFullYear();
  const mesActual = new Date().getMonth();

  const puedeAvanzarMes =
    anioCalendario < anioActual ||
    (
      anioCalendario === anioActual &&
      mesCalendarioNumero < mesActual
    );

  // ----------------------------------------------------
  // COMPONENTES REUTILIZABLES DEL FORMULARIO
  // ----------------------------------------------------

  function renderError(campo) {
    if (!errores[campo]) return null;

    return (
      <Text style={styles.textoError}>
        {errores[campo]}
      </Text>
    );
  }

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
          textAlignVertical={multilinea ? 'top' : 'center'}
          editable={!cargando}
        />

        {renderError(campo)}
      </View>
    );
  }

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
                  seleccionada && styles.opcionSeleccionada,
                ]}
                onPress={() => {
                  seleccionar(opcion);
                  limpiarError(campo);
                }}
                disabled={cargando}
                activeOpacity={0.75}
              >
                {seleccionada && (
                  <View style={styles.puntoSeleccionado} />
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

  function renderTitulo(titulo) {
    return (
      <Text style={styles.tituloSeccion}>
        {titulo}
      </Text>
    );
  }

  // ====================================================
  // INTERFAZ
  // ====================================================

  return (
    <View style={styles.contenedorPrincipal}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {!!errorGeneral && (
          <View
            style={styles.contenedorErrorGeneral}
            accessibilityRole="alert"
          >
            <Text style={styles.textoErrorGeneral}>
              {errorGeneral}
            </Text>
          </View>
        )}

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
                errores.propietario_id && styles.inputConError,
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
                  <Text style={styles.textoIconoPropietario}>
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
                    <Text style={styles.documentoPropietario}>
                      DNI: {propietarioSeleccionado.documento_identidad}
                    </Text>
                  )}
                </View>
              </View>

              <Text style={styles.flechaSelector}>⌄</Text>
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

          {/* FECHA DE NACIMIENTO */}
          <View style={styles.campo}>
            <Text style={styles.etiqueta}>
              Fecha de nacimiento
            </Text>

            <View
              style={[
                styles.filaFecha,
                errores.fecha_nacimiento && styles.inputConError,
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
                  onPress={limpiarFecha}
                  disabled={cargando}
                  accessibilityLabel="Limpiar fecha"
                >
                  <Text style={styles.textoLimpiarFecha}>×</Text>
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
                <Text style={styles.iconoCalendario}>▦</Text>
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
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.textoBotonContinuar}>
                {esEdicion ? 'Guardar cambios' : 'Registrar mascota'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.espacioFinal} />
      </ScrollView>

      {/* MODAL CALENDARIO */}
      <Modal
        visible={calendarioVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCalendarioVisible(false);
          setVistaSelectorFecha(false);
        }}
      >
        <View style={styles.fondoModalCalendario}>
          <View style={styles.tarjetaCalendario}>
            <View style={styles.encabezadoCalendario}>
              <Text style={styles.tituloCalendario}>
                Fecha de nacimiento
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setCalendarioVisible(false);
                  setVistaSelectorFecha(false);
                }}
                style={styles.cerrarCalendario}
              >
                <Text style={styles.textoCerrarCalendario}>×</Text>
              </TouchableOpacity>
            </View>

            {vistaSelectorFecha ? (
              <>
                {/* SELECTOR DIRECTO DE AÑO */}
                <View style={styles.contenedorSelectorAnio}>
                  <Text style={styles.etiquetaSelectorAnio}>
                    Escribe el año
                  </Text>

                  <TextInput
                    style={styles.inputAnio}
                    value={anioTexto}
                    onChangeText={(texto) => {
                      setAnioTexto(
                        texto.replace(/[^0-9]/g, '').slice(0, 4)
                      );
                    }}
                    keyboardType="numeric"
                    maxLength={4}
                    placeholder="Ej. 2018"
                    placeholderTextColor={C.placeholder}
                    selectTextOnFocus
                  />
                </View>

                <Text style={styles.etiquetaSelectorMes}>
                  Selecciona el mes
                </Text>

                <View style={styles.grillaMeses}>
                  {MESES.map((mes, indice) => {
                    const anio = Number(anioTexto);
                    const anioValido =
                      Number.isInteger(anio) &&
                      anio >= 1900 &&
                      anio <= anioActual;

                    const mesFuturo =
                      anioValido &&
                      anio === anioActual &&
                      indice > mesActual;

                    const seleccionado =
                      anio === anioCalendario &&
                      indice === mesCalendarioNumero;

                    return (
                      <TouchableOpacity
                        key={mes}
                        style={[
                          styles.botonSeleccionMes,
                          seleccionado &&
                            styles.botonSeleccionMesActivo,
                          mesFuturo &&
                            styles.botonSeleccionMesDeshabilitado,
                        ]}
                        onPress={() => seleccionarMes(indice)}
                        disabled={!anioValido || mesFuturo}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.textoSeleccionMes,
                            seleccionado &&
                              styles.textoSeleccionMesActivo,
                            mesFuturo &&
                              styles.textoSeleccionMesDeshabilitado,
                          ]}
                        >
                          {mes.substring(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={styles.botonVolverDias}
                  onPress={() => setVistaSelectorFecha(false)}
                >
                  <Text style={styles.textoVolverDias}>
                    Volver al calendario
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.navegacionCalendario}>
                  <TouchableOpacity
                    style={styles.botonMes}
                    onPress={() => cambiarMes(-1)}
                  >
                    <Text style={styles.textoBotonMes}>‹</Text>
                  </TouchableOpacity>

                  {/* Al pulsar el encabezado se abre el selector */}
                  <TouchableOpacity
                    style={styles.botonMesAnio}
                    onPress={abrirSelectorMesAnio}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.mesAnio}>
                      {MESES[mesCalendarioNumero]} {anioCalendario}
                    </Text>
                    <Text style={styles.indicadorSelector}>
                      ▾
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.botonMes,
                      !puedeAvanzarMes &&
                        styles.botonMesDeshabilitado,
                    ]}
                    onPress={() => cambiarMes(1)}
                    disabled={!puedeAvanzarMes}
                  >
                    <Text
                      style={[
                        styles.textoBotonMes,
                        !puedeAvanzarMes &&
                          styles.textoMesDeshabilitado,
                      ]}
                    >
                      ›
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.ayudaSelectorFecha}>
                  Pulsa el mes y año para cambiar directamente.
                </Text>

                <View style={styles.grillaCalendario}>
                  {DIAS_SEMANA.map((dia, indice) => (
                    <View
                      key={`dia-${indice}`}
                      style={styles.celdaDiaSemana}
                    >
                      <Text style={styles.textoDiaSemana}>
                        {dia}
                      </Text>
                    </View>
                  ))}

                  {diasCalendario.map((dia, indice) => {
                    if (dia === null) {
                      return (
                        <View
                          key={`vacio-${indice}`}
                          style={styles.celdaCalendario}
                        />
                      );
                    }

                    const fechaDia = new Date(
                      anioCalendario,
                      mesCalendarioNumero,
                      dia
                    );

                    const seleccionado =
                      fechaTemporal &&
                      esMismoDia(fechaTemporal, fechaDia);

                    const futuro = fechaEsFutura(fechaDia);

                    return (
                      <TouchableOpacity
                        key={`fecha-${dia}`}
                        style={[
                          styles.celdaCalendario,
                          seleccionado && styles.diaSeleccionado,
                        ]}
                        onPress={() => seleccionarDia(dia)}
                        disabled={futuro}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.textoDiaCalendario,
                            seleccionado &&
                              styles.textoDiaSeleccionado,
                            futuro && styles.textoDiaFuturo,
                          ]}
                        >
                          {dia}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.notaCalendario}>
                  No puedes seleccionar una fecha futura.
                </Text>
              </>
            )}

            <View style={styles.accionesCalendario}>
              <TouchableOpacity
                style={styles.botonCancelarCalendario}
                onPress={() => {
                  setCalendarioVisible(false);
                  setVistaSelectorFecha(false);
                }}
              >
                <Text style={styles.textoCancelarCalendario}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              {!vistaSelectorFecha && (
                <TouchableOpacity
                  style={styles.botonAceptarCalendario}
                  onPress={confirmarFecha}
                  disabled={!fechaTemporal}
                >
                  <Text style={styles.textoAceptarCalendario}>
                    Aceptar
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE PROPIETARIOS */}
      <Modal
        visible={modalPropietariosVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalPropietariosVisible(false)}
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
                onPress={() => setModalPropietariosVisible(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.textoCerrarModal}>×</Text>
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
                <ActivityIndicator color={C.primario} size="large" />
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
                      key={String(propietario.propietario_id)}
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
                        <Text style={styles.nombreListaPropietario}>
                          {obtenerNombrePropietario(propietario)}
                        </Text>

                        <Text style={styles.documentoListaPropietario}>
                          DNI: {propietario.documento_identidad || 'No registrado'}
                        </Text>

                        {!!propietario.telefono && (
                          <Text style={styles.telefonoPropietario}>
                            {propietario.telefono}
                          </Text>
                        )}
                      </View>

                      {seleccionado && (
                        <Text style={styles.marcaSeleccion}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.botonCerrarInferior}
              onPress={() => setModalPropietariosVisible(false)}
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

// ======================================================
// ESTILOS
// ======================================================

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
  contenedorErrorGeneral: {
    marginHorizontal: 18,
    marginTop: 10,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F2C7C3',
    borderRadius: 9,
    backgroundColor: '#FFF2F1',
  },
  textoErrorGeneral: {
    color: '#B42318',
    fontSize: 12,
    lineHeight: 18,
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

  // Calendario
  fondoModalCalendario: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  tarjetaCalendario: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: C.fondo,
    borderRadius: 17,
    padding: 18,
  },
  encabezadoCalendario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tituloCalendario: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
  },
  cerrarCalendario: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: C.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCerrarCalendario: {
    color: C.texto,
    fontSize: 24,
    lineHeight: 27,
  },
  navegacionCalendario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  botonMes: {
    width: 38,
    height: 36,
    borderRadius: 9,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonMesDeshabilitado: {
    backgroundColor: C.grisClaro,
  },
  textoBotonMes: {
    color: C.primario,
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '700',
  },
  textoMesDeshabilitado: {
    color: '#B7C3BF',
  },
  botonMesAnio: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: C.grisClaro,
  },
  mesAnio: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
  },
  indicadorSelector: {
    color: C.primario,
    fontSize: 13,
    fontWeight: '800',
  },
  ayudaSelectorFecha: {
    color: C.secundario,
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 8,
  },
  grillaCalendario: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  celdaDiaSemana: {
    width: '14.2857%',
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoDiaSemana: {
    color: C.secundario,
    fontSize: 12,
    fontWeight: '800',
  },
  celdaCalendario: {
    width: '14.2857%',
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  diaSeleccionado: {
    backgroundColor: C.primario,
  },
  textoDiaCalendario: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '600',
  },
  textoDiaSeleccionado: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  textoDiaFuturo: {
    color: '#C8D0CD',
  },
  notaCalendario: {
    color: C.secundario,
    fontSize: 11,
    marginTop: 10,
    textAlign: 'center',
  },

  // Selector directo de mes y año
  contenedorSelectorAnio: {
    marginBottom: 14,
  },
  etiquetaSelectorAnio: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputAnio: {
    height: 43,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 9,
    backgroundColor: C.grisClaro,
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  etiquetaSelectorMes: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 9,
  },
  grillaMeses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 9,
  },
  botonSeleccionMes: {
    width: '23%',
    minHeight: 42,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.fondo,
  },
  botonSeleccionMesActivo: {
    backgroundColor: C.verdeClaro,
    borderColor: C.primario,
  },
  botonSeleccionMesDeshabilitado: {
    backgroundColor: C.grisClaro,
    borderColor: C.grisClaro,
  },
  textoSeleccionMes: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '700',
  },
  textoSeleccionMesActivo: {
    color: C.primarioOscuro,
    fontWeight: '800',
  },
  textoSeleccionMesDeshabilitado: {
    color: '#B7C3BF',
  },
  botonVolverDias: {
    marginTop: 13,
    minHeight: 39,
    borderRadius: 9,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoVolverDias: {
    color: C.primarioOscuro,
    fontSize: 12,
    fontWeight: '800',
  },

  accionesCalendario: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 17,
  },
  botonCancelarCalendario: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCancelarCalendario: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  botonAceptarCalendario: {
    flex: 1,
    minHeight: 42,
    backgroundColor: C.primario,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoAceptarCalendario: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // Modal propietarios
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