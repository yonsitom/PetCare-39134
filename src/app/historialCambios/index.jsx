
/**
 * PETCARE - HISTORIAL DE CAMBIOS
 * Archivo: src/app/historialCambios.jsx
 *
 * RF: Consultar historial de cambios.
 * RF: Filtrar cambios por acción y fechas.
 * RF: Consultar detalle de los cambios.
 *
 * Acceso previsto: Administrador.
 */

import React, { useCallback, useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useFocusEffect, useRouter } from "expo-router";

import EncabezadoPetCare from "../../components/layout/EncabezadoPetCare";

import {
  cargarHistorialCambios,
  cargarDetalleHistorial,
} from "../../controllers/historial/historialCambiosControlador";
import { logger } from '../../utils/logger';

// --------------------------------------------------
// FUNCIONES AUXILIARES
// --------------------------------------------------

function formatearFechaHora(fecha) {
  if (!fecha) return "Fecha no disponible";

  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return String(fecha);
  }

  return valor.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatearJSON(valor) {
  if (valor === null || valor === undefined) {
    return "Sin información";
  }

  if (typeof valor === "string") {
    try {
      return JSON.stringify(JSON.parse(valor), null, 2);
    } catch {
      return valor;
    }
  }

  return JSON.stringify(valor, null, 2);
}

function colorAccion(accion) {
  switch (String(accion || "").toUpperCase()) {
    case "CREAR":
      return "#E4F4EC";
    case "MODIFICAR":
      return "#E8F0FC";
    case "CAMBIAR_ESTADO":
      return "#FFF2DC";
    case "ELIMINAR":
      return "#FCE9E7";
    default:
      return "#EDF1EF";
  }
}

function colorTextoAccion(accion) {
  switch (String(accion || "").toUpperCase()) {
    case "CREAR":
      return "#26764D";
    case "MODIFICAR":
      return "#3565A5";
    case "CAMBIAR_ESTADO":
      return "#A46B1D";
    case "ELIMINAR":
      return "#B4473D";
    default:
      return "#53645F";
  }
}

// --------------------------------------------------
// COMPONENTE
// --------------------------------------------------

export default function HistorialCambios() {
  const router = useRouter();

  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");

  const [accion, setAccion] = useState("Todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const [filtrosAplicados, setFiltrosAplicados] = useState({
    tipoAccion: "Todos",
    fechaDesde: "",
    fechaHasta: "",
    desde: 0,
    limite: 50,
  });

  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // ------------------------------------------------
  // CONSULTAR HISTORIAL
  // ------------------------------------------------

  const consultar = useCallback(async (filtros, refrescar = false) => {
    try {
      if (refrescar) {
        setActualizando(true);
      } else {
        setCargando(true);
      }

      setError("");

      const respuesta = await cargarHistorialCambios(filtros);

      if (!respuesta?.correcto) {
        throw new Error(
          respuesta?.mensaje || "No se pudo consultar el historial."
        );
      }

      setRegistros(respuesta.datos || []);
    } catch (e) {
      logger.error("Error al consultar historial:", e);
      setError(e?.message || "Ocurrió un error al consultar el historial.");
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  useEffect(() => {
    consultar(filtrosAplicados);
  }, [consultar, filtrosAplicados]);

  useFocusEffect(
    useCallback(() => {
      consultar(filtrosAplicados, true);
    }, [consultar, filtrosAplicados])
  );

  // ------------------------------------------------
  // APLICAR FILTROS
  // ------------------------------------------------

  function aplicarFiltros() {
    const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;

    if (fechaDesde && !formatoFecha.test(fechaDesde)) {
      Alert.alert("Fecha inválida", "Ingrese la fecha inicial como AAAA-MM-DD.");
      return;
    }

    if (fechaHasta && !formatoFecha.test(fechaHasta)) {
      Alert.alert("Fecha inválida", "Ingrese la fecha final como AAAA-MM-DD.");
      return;
    }

    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      Alert.alert(
        "Período inválido",
        "La fecha inicial no puede ser posterior a la fecha final."
      );
      return;
    }

    setFiltrosAplicados({
      tipoAccion: accion,
      fechaDesde,
      fechaHasta,
      desde: 0,
      limite: 50,
    });
  }

  function limpiarFiltros() {
    setAccion("Todos");
    setFechaDesde("");
    setFechaHasta("");

    setFiltrosAplicados({
      tipoAccion: "Todos",
      fechaDesde: "",
      fechaHasta: "",
      desde: 0,
      limite: 50,
    });
  }

  // ------------------------------------------------
  // DETALLE DEL CAMBIO
  // ------------------------------------------------

  async function abrirDetalle(registro) {
    setCargandoDetalle(true);
    setDetalle(null);

    const respuesta = await cargarDetalleHistorial(
      registro.historial_cambio_id
    );

    setCargandoDetalle(false);

    if (!respuesta?.correcto) {
      Alert.alert(
        "No se pudo consultar el detalle",
        respuesta?.mensaje || "Intente nuevamente."
      );
      return;
    }

    setDetalle(respuesta.datos);
  }

  // ------------------------------------------------
  // ESTADOS DE CARGA Y ERROR
  // ------------------------------------------------

  if (cargando && registros.length === 0 && !error) {
    return (
      <View style={styles.centro}>
        <StatusBar backgroundColor="#12665E" barStyle="light-content" />
        <ActivityIndicator size="large" color="#12665E" />
        <Text style={styles.textoCarga}>
          Consultando historial de cambios...
        </Text>
      </View>
    );
  }

  // ------------------------------------------------
  // INTERFAZ PRINCIPAL
  // ------------------------------------------------

  return (
    <View style={styles.contenedor}>
      <StatusBar backgroundColor="#12665E" barStyle="light-content" />

      <EncabezadoPetCare
        titulo="Historial de cambios"
        mostrarNotificaciones={false}
        onAbrirMenu={() => router.push("/inicio")}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => consultar(filtrosAplicados, true)}
            colors={["#12665E"]}
          />
        }
      >
        <View style={styles.encabezado}>
          <Text style={styles.titulo}>
            Historial de cambios
          </Text>

          <Text style={styles.subtitulo}>
            Consulta las acciones realizadas en el sistema PetCare.
          </Text>
        </View>

        {/* FILTROS */}

        <View style={styles.tarjeta}>
          <Text style={styles.tituloTarjeta}>
            FILTRAR REGISTROS
          </Text>

          <Text style={styles.etiqueta}>
            TIPO DE ACCIÓN
          </Text>

          <View style={styles.opcionesAccion}>
            {[
              "Todos",
              "CREAR",
              "MODIFICAR",
              "CAMBIAR_ESTADO",
              "ELIMINAR",
            ].map((opcion) => (
              <TouchableOpacity
                key={opcion}
                style={[
                  styles.opcion,
                  accion === opcion && styles.opcionActiva,
                ]}
                onPress={() => setAccion(opcion)}
              >
                <Text
                  style={[
                    styles.textoOpcion,
                    accion === opcion && styles.textoOpcionActivo,
                  ]}
                >
                  {opcion === "CAMBIAR_ESTADO"
                    ? "CAMBIAR ESTADO"
                    : opcion}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.etiqueta}>
            PERÍODO
          </Text>

          <View style={styles.filaFechas}>
            <View style={styles.campoFecha}>
              <Text style={styles.etiquetaPequena}>
                Desde
              </Text>

              <TextInput
                style={styles.input}
                value={fechaDesde}
                onChangeText={setFechaDesde}
                placeholder="AAAA-MM-DD"
                maxLength={10}
              />
            </View>

            <View style={styles.campoFecha}>
              <Text style={styles.etiquetaPequena}>
                Hasta
              </Text>

              <TextInput
                style={styles.input}
                value={fechaHasta}
                onChangeText={setFechaHasta}
                placeholder="AAAA-MM-DD"
                maxLength={10}
              />
            </View>
          </View>

          <View style={styles.filaBotones}>
            <TouchableOpacity
              style={styles.botonBuscar}
              onPress={aplicarFiltros}
            >
              <Text style={styles.textoBotonBuscar}>
                Buscar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonLimpiar}
              onPress={limpiarFiltros}
            >
              <Text style={styles.textoBotonLimpiar}>
                Limpiar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* RESUMEN */}

        <View style={styles.resumen}>
          <View>
            <Text style={styles.numeroResumen}>
              {registros.length}
            </Text>

            <Text style={styles.textoResumen}>
              Registros encontrados en esta consulta
            </Text>
          </View>

          <Text style={styles.iconoResumen}>
            ◷
          </Text>
        </View>

        {/* ERROR */}

        {error !== "" && (
          <View style={styles.error}>
            <Text style={styles.textoError}>
              {error}
            </Text>

            <TouchableOpacity
              onPress={() => consultar(filtrosAplicados)}
            >
              <Text style={styles.reintentar}>
                Reintentar
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LISTA */}

        <Text style={styles.tituloLista}>
          REGISTROS DE ACTIVIDAD
        </Text>

        {cargando && (
          <ActivityIndicator
            color="#12665E"
            style={{ margin: 15 }}
          />
        )}

        {!cargando && registros.length === 0 && !error && (
          <View style={styles.sinRegistros}>
            <Text style={styles.iconoVacio}>▤</Text>

            <Text style={styles.tituloVacio}>
              No hay cambios registrados
            </Text>

            <Text style={styles.textoVacio}>
              Cuando se registren modificaciones en el sistema,
              aparecerán aquí.
            </Text>
          </View>
        )}

        {registros.map((registro) => (
          <TouchableOpacity
            key={String(registro.historial_cambio_id)}
            style={styles.tarjetaRegistro}
            onPress={() => abrirDetalle(registro)}
            activeOpacity={0.75}
          >
            <View style={styles.filaRegistro}>
              <View
                style={[
                  styles.etiquetaAccion,
                  {
                    backgroundColor: colorAccion(registro.tipo_accion),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.textoAccion,
                    {
                      color: colorTextoAccion(registro.tipo_accion),
                    },
                  ]}
                >
                  {String(registro.tipo_accion || "SIN ACCIÓN").replace(
                    "_",
                    " "
                  )}
                </Text>
              </View>

              <Text style={styles.fechaRegistro}>
                {formatearFechaHora(registro.fecha_cambio)}
              </Text>
            </View>

            <Text style={styles.usuarioRegistro}>
              Usuario: {registro.usuario_id ?? "No identificado"}
            </Text>

            <Text style={styles.rolRegistro}>
              Rol: {registro.rol_usuario || "No especificado"}
            </Text>

            <Text style={styles.registroRelacionado}>
              {registro.actividad_id
                ? `Actividad: ${registro.actividad_id}`
                : registro.atencion_id
                  ? `Atención: ${registro.atencion_id}`
                  : "Registro general"}
            </Text>

            <Text style={styles.verDetalle}>
              Ver detalle →
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.botonActualizar}
          onPress={() => consultar(filtrosAplicados, true)}
          disabled={actualizando}
        >
          {actualizando ? (
            <ActivityIndicator color="#12665E" />
          ) : (
            <Text style={styles.textoActualizar}>
              ↻ Actualizar historial
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* DETALLE */}

      {(detalle || cargandoDetalle) && (
        <View style={styles.fondoModal}>
          <View style={styles.modal}>
            <View style={styles.filaModal}>
              <Text style={styles.tituloModal}>
                Detalle del cambio
              </Text>

              <TouchableOpacity
                onPress={() => setDetalle(null)}
              >
                <Text style={styles.cerrarModal}>✕</Text>
              </TouchableOpacity>
            </View>

            {cargandoDetalle ? (
              <ActivityIndicator
                size="large"
                color="#12665E"
                style={{ margin: 25 }}
              />
            ) : (
              <ScrollView style={styles.contenidoModal}>
                <Text style={styles.etiquetaDetalle}>
                  TIPO DE ACCIÓN
                </Text>

                <Text style={styles.valorDetalle}>
                  {detalle?.tipo_accion}
                </Text>

                <Text style={styles.etiquetaDetalle}>
                  FECHA Y HORA
                </Text>

                <Text style={styles.valorDetalle}>
                  {formatearFechaHora(detalle?.fecha_cambio)}
                </Text>

                <Text style={styles.etiquetaDetalle}>
                  USUARIO
                </Text>

                <Text style={styles.valorDetalle}>
                  {detalle?.usuario_id ?? "No identificado"}
                </Text>

                <Text style={styles.etiquetaDetalle}>
                  ROL
                </Text>

                <Text style={styles.valorDetalle}>
                  {detalle?.rol_usuario || "No especificado"}
                </Text>

                <Text style={styles.etiquetaDetalle}>
                  DATOS ANTERIORES
                </Text>

                <Text style={styles.json}>
                  {formatearJSON(detalle?.datos_anteriores)}
                </Text>

                <Text style={styles.etiquetaDetalle}>
                  DATOS NUEVOS
                </Text>

                <Text style={styles.json}>
                  {formatearJSON(detalle?.datos_nuevos)}
                </Text>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.botonCerrar}
              onPress={() => setDetalle(null)}
            >
              <Text style={styles.textoBotonCerrar}>
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// --------------------------------------------------
// ESTILOS
// --------------------------------------------------

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: "#F4F7F6",
  },

  scroll: {
    flex: 1,
  },

  contenido: {
    padding: 16,
    paddingBottom: 35,
  },

  centro: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F7F6",
  },

  textoCarga: {
    color: "#53645F",
    marginTop: 12,
    fontSize: 14,
  },

  encabezado: {
    marginBottom: 18,
  },

  titulo: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#173D38",
  },

  subtitulo: {
    fontSize: 13,
    color: "#71817C",
    marginTop: 5,
    lineHeight: 19,
  },

  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E7EEEB",
    elevation: 2,
  },

  tituloTarjeta: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#244B44",
    marginBottom: 16,
  },

  etiqueta: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#53645F",
    marginBottom: 9,
    letterSpacing: 0.5,
  },

  opcionesAccion: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 16,
  },

  opcion: {
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: "#DCE6E2",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },

  opcionActiva: {
    backgroundColor: "#E5F2EE",
    borderColor: "#12665E",
  },

  textoOpcion: {
    color: "#53645F",
    fontSize: 10,
    fontWeight: "600",
  },

  textoOpcionActivo: {
    color: "#12665E",
  },

  filaFechas: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  campoFecha: {
    flex: 1,
  },

  etiquetaPequena: {
    fontSize: 11,
    color: "#82908B",
    marginBottom: 5,
  },

  input: {
    height: 43,
    borderWidth: 1,
    borderColor: "#DCE6E2",
    borderRadius: 8,
    paddingHorizontal: 9,
    fontSize: 12,
    color: "#28433D",
  },

  filaBotones: {
    flexDirection: "row",
    gap: 10,
  },

  botonBuscar: {
    flex: 1,
    height: 43,
    borderRadius: 8,
    backgroundColor: "#12665E",
    justifyContent: "center",
    alignItems: "center",
  },

  textoBotonBuscar: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },

  botonLimpiar: {
    height: 43,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: "#EAF2EF",
    justifyContent: "center",
    alignItems: "center",
  },

  textoBotonLimpiar: {
    color: "#12665E",
    fontWeight: "bold",
    fontSize: 13,
  },

  resumen: {
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    padding: 17,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E7EEEB",
  },

  numeroResumen: {
    color: "#12665E",
    fontSize: 30,
    fontWeight: "bold",
  },

  textoResumen: {
    color: "#71817C",
    fontSize: 12,
    marginTop: 3,
  },

  iconoResumen: {
    fontSize: 32,
    color: "#279889",
  },

  tituloLista: {
    color: "#53645F",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  tarjetaRegistro: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 15,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#E7EEEB",
  },

  filaRegistro: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  etiquetaAccion: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },

  textoAccion: {
    fontSize: 10,
    fontWeight: "bold",
  },

  fechaRegistro: {
    color: "#82908B",
    fontSize: 10,
  },

  usuarioRegistro: {
    color: "#28433D",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 6,
  },

  rolRegistro: {
    color: "#71817C",
    fontSize: 12,
    marginBottom: 5,
  },

  registroRelacionado: {
    color: "#71817C",
    fontSize: 12,
  },

  verDetalle: {
    color: "#12665E",
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "right",
    marginTop: 13,
  },

  sinRegistros: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 25,
    alignItems: "center",
    marginBottom: 15,
  },

  iconoVacio: {
    color: "#A7B8B1",
    fontSize: 35,
    marginBottom: 10,
  },

  tituloVacio: {
    color: "#28433D",
    fontWeight: "bold",
    fontSize: 14,
  },

  textoVacio: {
    color: "#82908B",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },

  error: {
    padding: 13,
    borderRadius: 9,
    backgroundColor: "#FCE9E7",
    marginBottom: 15,
  },

  textoError: {
    color: "#A33B32",
    fontSize: 12,
  },

  reintentar: {
    color: "#12665E",
    fontWeight: "bold",
    marginTop: 8,
    fontSize: 12,
  },

  botonActualizar: {
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#12665E",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  textoActualizar: {
    color: "#12665E",
    fontWeight: "bold",
    fontSize: 13,
  },

  fondoModal: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },

  modal: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 17,
  },

  filaModal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  tituloModal: {
    color: "#244B44",
    fontSize: 17,
    fontWeight: "bold",
  },

  cerrarModal: {
    color: "#53645F",
    fontSize: 21,
    paddingHorizontal: 5,
  },

  contenidoModal: {
    flexGrow: 0,
  },

  etiquetaDetalle: {
    color: "#12665E",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 13,
    marginBottom: 5,
  },

  valorDetalle: {
    color: "#28433D",
    fontSize: 13,
  },

  json: {
    color: "#53645F",
    backgroundColor: "#F4F7F6",
    padding: 10,
    borderRadius: 7,
    fontSize: 11,
    lineHeight: 17,
  },

  botonCerrar: {
    backgroundColor: "#12665E",
    height: 43,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },

  textoBotonCerrar: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});
