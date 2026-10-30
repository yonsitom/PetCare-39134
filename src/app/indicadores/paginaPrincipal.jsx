
/**
 * PETCARE - INDICADORES HISTÓRICOS
 * Archivo: src/app/indicadores/paginaPrincipal.jsx
 *
 * Arquitectura:
 * - Vista: React Native
 * - Controlador: indicadoresControlador.js
 * - DAO: indicadoresDAO.js
 *
 * Funcionalidades:
 * - RF: Consultar indicadores históricos.
 * - RF: Filtrar atenciones por período.
 * - RF: Filtrar atenciones por estado.
 * - RF: Visualizar atenciones en un gráfico.
 * - RF: Consultar resumen de atenciones.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
import MenuLateralDerecho from "../../components/layout/MenuLateralDerecho";

import {
  cargarIndicadores,
} from "../../controllers/indicadores/indicadoresControlador";
import { logger } from '../../utils/logger';

// --------------------------------------------------
// FUNCIONES AUXILIARES
// --------------------------------------------------

const formatearFecha = (fecha) => {
  if (!fecha) return "";

  const valor = String(fecha).slice(0, 10);
  const partes = valor.split("-");

  if (partes.length !== 3) return valor;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const convertirFecha = (fecha) => {
  if (!fecha) return null;

  const partes = String(fecha).slice(0, 10).split("-");

  if (partes.length !== 3) return null;

  const resultado = new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2])
  );

  return Number.isNaN(resultado.getTime()) ? null : resultado;
};

const obtenerEstado = (estado) => {
  const valor = String(estado ?? "")
    .trim()
    .toLowerCase();

  if (["activa", "activo", "en proceso", "en_proceso"].includes(valor)) {
    return "Activa";
  }

  if (["finalizada", "finalizado", "completada", "completado"].includes(valor)) {
    return "Finalizada";
  }

  return estado || "Sin estado";
};

// --------------------------------------------------
// COMPONENTE PRINCIPAL
// --------------------------------------------------

export default function PaginaPrincipalIndicadores() {
  const router = useRouter();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState("");

  const [fechaInicio, setFechaInicio] = useState("17/09/2026");
  const [fechaFin, setFechaFin] = useState("18/09/2026");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState("Todos");

  const [filtroAplicado, setFiltroAplicado] = useState({
    fechaInicio: "17/09/2026",
    fechaFin: "18/09/2026",
    estado: "Todos",
  });

  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [mostrarEstados, setMostrarEstados] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  // ------------------------------------------------
  // CARGAR INFORMACIÓN DESDE EL CONTROLADOR
  // ------------------------------------------------

  const cargarDatos = useCallback(async (esActualizacion = false) => {
    try {
      if (esActualizacion) {
        setActualizando(true);
      } else {
        setCargando(true);
      }

      setError("");

      const respuesta = await cargarIndicadores();

      if (!respuesta || respuesta.correcto !== true) {
        throw new Error(
          respuesta?.mensaje ||
          "No se pudieron cargar los indicadores."
        );
      }

      setDatos(respuesta.datos);

    } catch (e) {
      logger.error("Error en pantalla de indicadores:", e);

      setError(
        e?.message ||
        "No se pudo cargar la información. Intente nuevamente."
      );
    } finally {
      setCargando(false);
      setActualizando(false);
    }
  }, []);

  // Carga inicial.
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Actualizar cuando el usuario regresa a esta pantalla.
  useFocusEffect(
    useCallback(() => {
      cargarDatos(true);
    }, [cargarDatos])
  );

  // ------------------------------------------------
  // FILTRAR ATENCIONES
  // ------------------------------------------------

  const atenciones = useMemo(() => {
    if (!datos || !Array.isArray(datos.atenciones)) {
      return [];
    }

    const inicio = convertirFecha(filtroAplicado.fechaInicio.split("/").reverse().join("-"));
    const fin = convertirFecha(filtroAplicado.fechaFin.split("/").reverse().join("-"));

    return datos.atenciones.filter((atencion) => {
      const fechaAtencion = convertirFecha(atencion.fecha_inicio);

      if (!fechaAtencion) return false;

      if (inicio && fechaAtencion < inicio) return false;

      if (fin) {
        const limiteFin = new Date(fin);
        limiteFin.setHours(23, 59, 59, 999);

        if (fechaAtencion > limiteFin) return false;
      }

      if (filtroAplicado.estado !== "Todos") {
        if (obtenerEstado(atencion.estado) !== filtroAplicado.estado) {
          return false;
        }
      }

      return true;
    });
  }, [datos, filtroAplicado]);

  // ------------------------------------------------
  // RESUMEN
  // ------------------------------------------------

  const totalAtenciones = atenciones.length;

  const totalActivas = atenciones.filter(
    (a) => obtenerEstado(a.estado) === "Activa"
  ).length;

  const totalFinalizadas = atenciones.filter(
    (a) => obtenerEstado(a.estado) === "Finalizada"
  ).length;

  // ------------------------------------------------
  // DATOS PARA EL GRÁFICO
  // ------------------------------------------------

  const datosGrafico = useMemo(() => {
    const agrupados = {};

    atenciones.forEach((atencion) => {
      const fecha = String(atencion.fecha_inicio ?? "").slice(0, 10);

      if (!fecha) return;

      agrupados[fecha] = (agrupados[fecha] || 0) + 1;
    });

    return Object.entries(agrupados)
      .sort(([fechaA], [fechaB]) => fechaA.localeCompare(fechaB))
      .map(([fecha, cantidad]) => ({
        fecha,
        etiqueta: fecha.slice(8, 10) + "/" + fecha.slice(5, 7),
        cantidad,
      }));
  }, [atenciones]);

  const maximoGrafico = Math.max(
    1,
    ...datosGrafico.map((item) => item.cantidad)
  );

  // ------------------------------------------------
  // BUSCAR
  // ------------------------------------------------

  const aplicarFiltros = () => {
    const formatoFecha = /^\d{2}\/\d{2}\/\d{4}$/;

    if (!formatoFecha.test(fechaInicio) || !formatoFecha.test(fechaFin)) {
      Alert.alert(
        "Fecha inválida",
        "Ingrese las fechas en formato DD/MM/AAAA."
      );
      return;
    }

    const inicio = convertirFecha(
      fechaInicio.split("/").reverse().join("-")
    );

    const fin = convertirFecha(
      fechaFin.split("/").reverse().join("-")
    );

    if (!inicio || !fin) {
      Alert.alert("Fecha inválida", "Verifique las fechas ingresadas.");
      return;
    }

    if (inicio > fin) {
      Alert.alert(
        "Período inválido",
        "La fecha inicial no puede ser posterior a la fecha final."
      );
      return;
    }

    setFiltroAplicado({
      fechaInicio,
      fechaFin,
      estado: estadoSeleccionado,
    });
  };

  const limpiarFiltros = () => {
    setFechaInicio("17/09/2026");
    setFechaFin("18/09/2026");
    setEstadoSeleccionado("Todos");

    setFiltroAplicado({
      fechaInicio: "17/09/2026",
      fechaFin: "18/09/2026",
      estado: "Todos",
    });
  };

  // ------------------------------------------------
  // CARGA
  // ------------------------------------------------

  if (cargando && !datos) {
    return (
      <View style={styles.pantallaCarga}>
        <StatusBar backgroundColor="#12665E" barStyle="light-content" />

        <ActivityIndicator size="large" color="#12665E" />

        <Text style={styles.textoCarga}>
          Cargando indicadores...
        </Text>
      </View>
    );
  }

  // ------------------------------------------------
  // ERROR
  // ------------------------------------------------

  if (error && !datos) {
    return (
      <View style={styles.pantallaCarga}>
        <StatusBar backgroundColor="#12665E" barStyle="light-content" />

        <Text style={styles.iconoError}>!</Text>

        <Text style={styles.tituloError}>
          No se pudieron cargar los indicadores
        </Text>

        <Text style={styles.mensajeError}>
          {error}
        </Text>

        <TouchableOpacity
          style={styles.botonReintentar}
          onPress={() => cargarDatos()}
        >
          <Text style={styles.textoBotonReintentar}>
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ------------------------------------------------
  // INTERFAZ
  // ------------------------------------------------

  return (
    <View style={styles.contenedor}>
      <StatusBar backgroundColor="#12665E" barStyle="light-content" />

      <EncabezadoPetCare
        titulo="Indicadores"
        onAbrirMenu={() => setMostrarMenu(true)}
        mostrarNotificaciones={true}
        onAbrirNotificaciones={() => {
          Alert.alert(
            "Notificaciones",
            "No hay notificaciones nuevas."
          );
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => cargarDatos(true)}
            colors={["#12665E"]}
          />
        }
      >
        {/* TÍTULO */}

        <View style={styles.encabezadoSeccion}>
          <Text style={styles.titulo}>
            Indicadores históricos
          </Text>

          <Text style={styles.subtitulo}>
            Consulta y seguimiento de las atenciones veterinarias.
          </Text>
        </View>

        {/* FILTROS */}

        <View style={styles.tarjeta}>
          <Text style={styles.tituloTarjeta}>
            FILTROS DE CONSULTA
          </Text>

          <Text style={styles.etiqueta}>
            PERÍODO
          </Text>

          <View style={styles.filaFechas}>
            <View style={styles.campoFecha}>
              <Text style={styles.etiquetaPequena}>
                Desde
              </Text>

              <TextInput
                style={styles.inputFecha}
                value={fechaInicio}
                onChangeText={setFechaInicio}
                placeholder="DD/MM/AAAA"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>

            <View style={styles.campoFecha}>
              <Text style={styles.etiquetaPequena}>
                Hasta
              </Text>

              <TextInput
                style={styles.inputFecha}
                value={fechaFin}
                onChangeText={setFechaFin}
                placeholder="DD/MM/AAAA"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
            </View>
          </View>

          <Text style={styles.etiqueta}>
            ESTADO
          </Text>

          <TouchableOpacity
            style={styles.selectorEstado}
            onPress={() => setMostrarEstados(!mostrarEstados)}
          >
            <Text style={styles.textoSelector}>
              {estadoSeleccionado}
            </Text>

            <Text style={styles.flecha}>
              {mostrarEstados ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {mostrarEstados && (
            <View style={styles.listaEstados}>
              {["Todos", "Activa", "Finalizada"].map((estado) => (
                <TouchableOpacity
                  key={estado}
                  style={styles.opcionEstado}
                  onPress={() => {
                    setEstadoSeleccionado(estado);
                    setMostrarEstados(false);
                  }}
                >
                  <Text
                    style={[
                      styles.textoOpcionEstado,
                      estadoSeleccionado === estado &&
                        styles.estadoSeleccionado,
                    ]}
                  >
                    {estado}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

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

        {/* GRÁFICO */}

        <View style={styles.tarjeta}>
          <Text style={styles.tituloTarjeta}>
            Atenciones por período
          </Text>

          <Text style={styles.descripcionGrafico}>
            Cantidad de atenciones registradas por fecha.
          </Text>

          {datosGrafico.length === 0 ? (
            <View style={styles.sinDatos}>
              <Text style={styles.iconoSinDatos}>
                ▥
              </Text>

              <Text style={styles.textoSinDatos}>
                No hay atenciones para el período seleccionado.
              </Text>
            </View>
          ) : (
            <View style={styles.grafico}>
              {datosGrafico.map((item) => (
                <View
                  key={item.fecha}
                  style={styles.columnaGrafico}
                >
                  <Text style={styles.valorGrafico}>
                    {item.cantidad}
                  </Text>

                  <View style={styles.areaBarra}>
                    <View
                      style={[
                        styles.barra,
                        {
                          height: `${Math.max(
                            8,
                            (item.cantidad / maximoGrafico) * 100
                          )}%`,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.etiquetaGrafico}>
                    {item.etiqueta}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* RESUMEN */}

        <View style={styles.tarjeta}>
          <Text style={styles.tituloTarjeta}>
            Resumen de atenciones
          </Text>

          <View style={styles.resumenPrincipal}>
            <Text style={styles.numeroPrincipal}>
              {totalAtenciones}
            </Text>

            <Text style={styles.textoResumenPrincipal}>
              atenciones
            </Text>
          </View>

          <View style={styles.filaResumen}>
            <View style={styles.indicadorResumen}>
              <View style={styles.puntoActivo} />

              <Text style={styles.textoResumen}>
                {totalActivas} activas
              </Text>
            </View>

            <View style={styles.indicadorResumen}>
              <View style={styles.puntoFinalizado} />

              <Text style={styles.textoResumen}>
                {totalFinalizadas} finalizadas
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.botonMasInformacion}
            onPress={() => setMostrarDetalle(!mostrarDetalle)}
          >
            <Text style={styles.textoBotonMas}>
              {mostrarDetalle
                ? "Ocultar información"
                : "Ver más información"}
            </Text>

            <Text style={styles.flechaBoton}>
              {mostrarDetalle ? "▲" : "→"}
            </Text>
          </TouchableOpacity>

          {mostrarDetalle && (
            <View style={styles.detalleResumen}>
              <Text style={styles.textoDetalle}>
                Período: {filtroAplicado.fechaInicio} al{" "}
                {filtroAplicado.fechaFin}
              </Text>

              <Text style={styles.textoDetalle}>
                Estado: {filtroAplicado.estado}
              </Text>

              <Text style={styles.textoDetalle}>
                Atenciones activas: {totalActivas}
              </Text>

              <Text style={styles.textoDetalle}>
                Atenciones finalizadas: {totalFinalizadas}
              </Text>

              <Text style={styles.textoDetalle}>
                Total de atenciones: {totalAtenciones}
              </Text>
            </View>
          )}
        </View>

        {/* ACTUALIZAR */}

        {error !== "" && (
          <View style={styles.avisoError}>
            <Text style={styles.textoAvisoError}>
              {error}
            </Text>

            <TouchableOpacity onPress={() => cargarDatos(true)}>
              <Text style={styles.enlaceReintentar}>
                Intentar nuevamente
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.botonActualizar}
          onPress={() => cargarDatos(true)}
          disabled={actualizando}
        >
          {actualizando ? (
            <ActivityIndicator color="#12665E" />
          ) : (
            <Text style={styles.textoActualizar}>
              ↻ Actualizar indicadores
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.espacioFinal} />
      </ScrollView>

      {/* MENÚ LATERAL */}

      {mostrarMenu && (
        <MenuLateralDerecho
          visible={mostrarMenu}
          onCerrar={() => setMostrarMenu(false)}
          onNavigate={(ruta) => {
            setMostrarMenu(false);
            router.push(ruta);
          }}
        />
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
    paddingBottom: 30,
  },

  pantallaCarga: {
    flex: 1,
    backgroundColor: "#F4F7F6",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  textoCarga: {
    marginTop: 14,
    color: "#53645F",
    fontSize: 15,
  },

  encabezadoSeccion: {
    marginBottom: 18,
  },

  titulo: {
    color: "#173D38",
    fontSize: 23,
    fontWeight: "bold",
  },

  subtitulo: {
    color: "#71817C",
    fontSize: 13,
    marginTop: 5,
    lineHeight: 19,
  },

  tarjeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 17,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8EFEC",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  tituloTarjeta: {
    color: "#244B44",
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 17,
  },

  etiqueta: {
    color: "#53645F",
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 0.7,
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
    color: "#82908B",
    fontSize: 11,
    marginBottom: 5,
  },

  inputFecha: {
    height: 45,
    borderWidth: 1,
    borderColor: "#DCE6E2",
    borderRadius: 9,
    paddingHorizontal: 10,
    color: "#28433D",
    fontSize: 13,
    backgroundColor: "#FFFFFF",
  },

  selectorEstado: {
    height: 45,
    borderWidth: 1,
    borderColor: "#DCE6E2",
    borderRadius: 9,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  textoSelector: {
    color: "#28433D",
    fontSize: 14,
  },

  flecha: {
    color: "#12665E",
    fontSize: 12,
  },

  listaEstados: {
    borderWidth: 1,
    borderColor: "#DCE6E2",
    borderRadius: 9,
    marginBottom: 14,
    overflow: "hidden",
  },

  opcionEstado: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF1EF",
  },

  textoOpcionEstado: {
    color: "#53645F",
    fontSize: 13,
  },

  estadoSeleccionado: {
    color: "#12665E",
    fontWeight: "bold",
  },

  filaBotones: {
    flexDirection: "row",
    gap: 10,
  },

  botonBuscar: {
    flex: 1,
    height: 45,
    backgroundColor: "#12665E",
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },

  textoBotonBuscar: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14,
  },

  botonLimpiar: {
    paddingHorizontal: 18,
    height: 45,
    backgroundColor: "#EAF2EF",
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },

  textoBotonLimpiar: {
    color: "#12665E",
    fontWeight: "bold",
    fontSize: 13,
  },

  descripcionGrafico: {
    color: "#82908B",
    fontSize: 12,
    marginTop: -9,
    marginBottom: 18,
  },

  grafico: {
    height: 190,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#DCE6E2",
  },

  columnaGrafico: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
    paddingHorizontal: 4,
  },

  valorGrafico: {
    color: "#53645F",
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 5,
  },

  areaBarra: {
    height: 125,
    width: "65%",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  barra: {
    width: "100%",
    minHeight: 5,
    backgroundColor: "#279889",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },

  etiquetaGrafico: {
    color: "#71817C",
    fontSize: 10,
    marginTop: 8,
    marginBottom: 7,
  },

  sinDatos: {
    minHeight: 145,
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
  },

  iconoSinDatos: {
    fontSize: 30,
    color: "#A7B8B1",
    marginBottom: 8,
  },

  textoSinDatos: {
    color: "#82908B",
    fontSize: 13,
    textAlign: "center",
  },

  resumenPrincipal: {
    alignItems: "center",
    marginBottom: 18,
  },

  numeroPrincipal: {
    color: "#12665E",
    fontSize: 42,
    fontWeight: "bold",
  },

  textoResumenPrincipal: {
    color: "#71817C",
    fontSize: 13,
    marginTop: 2,
  },

  filaResumen: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 25,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#EDF1EF",
  },

  indicadorResumen: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  puntoActivo: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#279889",
  },

  puntoFinalizado: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#6684B8",
  },

  textoResumen: {
    color: "#53645F",
    fontSize: 12,
  },

  botonMasInformacion: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },

  textoBotonMas: {
    color: "#12665E",
    fontWeight: "bold",
    fontSize: 13,
  },

  flechaBoton: {
    color: "#12665E",
    fontSize: 18,
  },

  detalleResumen: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#F4F8F6",
    borderRadius: 9,
  },

  textoDetalle: {
    color: "#53645F",
    fontSize: 12,
    marginBottom: 7,
  },

  botonActualizar: {
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#12665E",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },

  textoActualizar: {
    color: "#12665E",
    fontWeight: "bold",
    fontSize: 13,
  },

  avisoError: {
    backgroundColor: "#FFF1EF",
    borderRadius: 9,
    padding: 12,
    marginBottom: 14,
  },

  textoAvisoError: {
    color: "#A33B32",
    fontSize: 12,
  },

  enlaceReintentar: {
    color: "#12665E",
    fontWeight: "bold",
    marginTop: 8,
    fontSize: 12,
  },

  iconoError: {
    fontSize: 40,
    color: "#B94B42",
    fontWeight: "bold",
  },

  tituloError: {
    color: "#28433D",
    fontSize: 17,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 12,
  },

  mensajeError: {
    color: "#71817C",
    textAlign: "center",
    marginTop: 8,
    fontSize: 13,
  },

  botonReintentar: {
    backgroundColor: "#12665E",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 9,
    marginTop: 18,
  },

  textoBotonReintentar: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  espacioFinal: {
    height: 15,
  },
});
