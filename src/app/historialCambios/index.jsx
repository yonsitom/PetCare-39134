/**
 * ============================================================
 * PETCARE - HISTORIAL DE CAMBIOS
 * Archivo: src/app/historialCambios/index.jsx
 *
 * RF42: Registrar auditoría automática.
 * RF50: Consultar historial de cambios.
 *
 * Arquitectura:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase.
 *
 * Acceso: Administrador.
 * ============================================================
 */

import React, { useCallback, useState } from "react";

import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    useFocusEffect,
    useRouter,
} from "expo-router";

import EncabezadoPetCare from "../../components/layout/EncabezadoPetCare";

import {
    cargarHistorialCambios,
} from "../../controllers/historial/historialCambiosControlador";

// ============================================================
// CONSTANTES
// ============================================================

const ACCIONES = [
    { valor: "Todos", etiqueta: "Todas" },
    { valor: "CREAR", etiqueta: "Crear" },
    { valor: "MODIFICAR", etiqueta: "Modificar" },
    { valor: "CAMBIAR_ESTADO", etiqueta: "Cambiar estado" },
    { valor: "ELIMINAR", etiqueta: "Eliminar" },
];

const LIMITE_PAGINA = 20;

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

function formatearFechaHora(fecha) {
    if (!fecha) return "Fecha no disponible";

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return String(fecha);
    }

    return valor.toLocaleString("es-PE", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function obtenerEtiquetaEntidad(entidad) {
    const etiquetas = {
        propietarios: "Propietarios",
        mascotas: "Mascotas",
        atenciones: "Atenciones",
        actividades: "Actividades",
        perfiles: "Usuarios",
    };

    return etiquetas[entidad] || entidad || "Sin entidad";
}

function obtenerDescripcionRegistro(registro) {
    const entidad = registro.entidad;

    const datos =
        registro.datos_nuevos ||
        registro.datos_anteriores ||
        {};

    if (entidad === "propietarios") {
        return datos.nombre
            ? `Propietario: ${datos.nombre} ${datos.apellido || ""}`.trim()
            : "Registro de propietario";
    }

    if (entidad === "mascotas") {
        return datos.nombre
            ? `Mascota: ${datos.nombre}`
            : "Registro de mascota";
    }

    if (entidad === "actividades") {
        return datos.tipo
            ? `Actividad: ${datos.tipo}`
            : "Registro de actividad";
    }

    if (entidad === "atenciones") {
        return datos.numero_historia
            ? `Historia: ${datos.numero_historia}`
            : "Registro de atención";
    }

    if (entidad === "perfiles") {
        return datos.nombre_completo
            ? `Usuario: ${datos.nombre_completo}`
            : "Registro de usuario";
    }

    return "Registro general";
}

function obtenerColorAccion(accion) {
    switch (String(accion || "").toUpperCase()) {
        case "CREAR":
            return {
                fondo: "#E7F5ED",
                texto: "#26764D",
            };

        case "MODIFICAR":
            return {
                fondo: "#EAF1FC",
                texto: "#3565A5",
            };

        case "CAMBIAR_ESTADO":
            return {
                fondo: "#FFF3DF",
                texto: "#A46B1D",
            };

        case "ELIMINAR":
            return {
                fondo: "#FCEBE9",
                texto: "#B4473D",
            };

        default:
            return {
                fondo: "#EDF1EF",
                texto: "#53645F",
            };
    }
}

function formatearAccion(accion) {
    return String(accion || "SIN ACCIÓN").replace(/_/g, " ");
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function HistorialCambios() {
    const router = useRouter();

    const [registros, setRegistros] = useState([]);
    const [total, setTotal] = useState(0);

    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);

    const [cargando, setCargando] = useState(true);
    const [actualizando, setActualizando] = useState(false);
    const [error, setError] = useState("");

    const [accion, setAccion] = useState("Todos");

    const [filtrosAplicados, setFiltrosAplicados] = useState({
        tipoAccion: "Todos",
        entidad: "Todos",
        fechaDesde: "",
        fechaHasta: "",
        pagina: 1,
        limite: LIMITE_PAGINA,
    });

    // --------------------------------------------------------
    // CONSULTAR HISTORIAL
    // --------------------------------------------------------

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
                    respuesta?.mensaje ||
                    "No se pudo consultar el historial."
                );
            }

            const datos = Array.isArray(respuesta.datos)
                ? respuesta.datos
                : [];

            const cantidadTotal = Number(respuesta.total) || 0;

            const limite =
                Number(respuesta.limite) || LIMITE_PAGINA;

            setRegistros(datos);
            setTotal(cantidadTotal);

            setPagina(
                Number(respuesta.pagina) ||
                Number(filtros.pagina) ||
                1
            );

            setTotalPaginas(
                Number(respuesta.totalPaginas) ||
                Math.max(1, Math.ceil(cantidadTotal / limite))
            );
        } catch (e) {
            console.error(
                "Error al consultar historial:",
                e
            );

            setError(
                e?.message ||
                "Ocurrió un error al consultar el historial."
            );

            setRegistros([]);
            setTotal(0);
            setPagina(1);
            setTotalPaginas(1);
        } finally {
            setCargando(false);
            setActualizando(false);
        }
    }, []);

    // --------------------------------------------------------
    // RECARGAR AL ENTRAR A LA PANTALLA
    // --------------------------------------------------------

    useFocusEffect(
        useCallback(() => {
            consultar(filtrosAplicados);

            return undefined;
        }, [consultar, filtrosAplicados])
    );

    // --------------------------------------------------------
    // VOLVER A ADMINISTRACIÓN
    // --------------------------------------------------------

    function volverAdministracion() {
        router.replace('/administracion/administracion');
    }

    // --------------------------------------------------------
    // APLICAR FILTRO DE ACCIÓN
    // --------------------------------------------------------

    function seleccionarAccion(valor) {
        setAccion(valor);

        setFiltrosAplicados({
            tipoAccion: valor,

            // Se mantienen estos valores neutros para conservar
            // la estructura esperada por el controlador actual.
            entidad: "Todos",
            fechaDesde: "",
            fechaHasta: "",

            pagina: 1,
            limite: LIMITE_PAGINA,
        });
    }

    // --------------------------------------------------------
    // PAGINACIÓN
    // --------------------------------------------------------

    function cambiarPagina(nuevaPagina) {
        if (
            nuevaPagina < 1 ||
            nuevaPagina > totalPaginas ||
            nuevaPagina === pagina ||
            cargando
        ) {
            return;
        }

        setFiltrosAplicados((actuales) => ({
            ...actuales,
            pagina: nuevaPagina,
        }));
    }

    // --------------------------------------------------------
    // ABRIR DETALLE
    // --------------------------------------------------------

    function abrirDetalle(registro) {
        const id = registro?.historial_cambio_id;

        if (!id) {
            setError(
                "No se encontró el identificador del registro seleccionado."
            );
            return;
        }

        router.push({
            pathname: "/historialCambios/detalle",
            params: {
                id: String(id),
            },
        });
    }

    // ========================================================
    // INTERFAZ
    // ========================================================

    return (
        <View style={styles.contenedor}>
            <StatusBar
                backgroundColor="#105D55"
                barStyle="light-content"
            />

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
                {/* RUTA Y TÍTULO */}

                <View style={styles.encabezadoPagina}>
                    <Text style={styles.ruta}>
                        <Text
                            style={styles.rutaEnlace}
                            onPress={() => router.push("/inicio")}
                        >
                            Inicio
                        </Text>

                        <Text style={styles.separadorRuta}>
                            {" / "}
                        </Text>

                        <Text
                            style={styles.rutaEnlace}
                            onPress={volverAdministracion}
                        >
                            Administración
                        </Text>

                        <Text style={styles.separadorRuta}>
                            {" / "}
                        </Text>

                        <Text style={styles.rutaActual}>
                            Historial de cambios
                        </Text>
                    </Text>

                    <View style={styles.filaTitulo}>
                        <TouchableOpacity
                            style={styles.botonVolver}
                            onPress={volverAdministracion}
                            accessibilityLabel="Volver a administración"
                        >
                            <Text style={styles.simboloVolver}>
                                {"<"}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.titulo}>
                            Historial de cambios
                        </Text>
                    </View>

                    <Text style={styles.subtitulo}>
                        Consulta las operaciones registradas en el sistema.
                    </Text>
                </View>

                {/* FILTRO ÚNICO */}

                <View style={styles.tarjetaFiltro}>
                    <Text style={styles.etiquetaFiltro}>
                        TIPO DE ACCIÓN
                    </Text>

                    <View style={styles.opcionesFiltro}>
                        {ACCIONES.map((opcion) => {
                            const seleccionada =
                                accion === opcion.valor;

                            return (
                                <TouchableOpacity
                                    key={opcion.valor}
                                    style={[
                                        styles.opcionFiltro,
                                        seleccionada &&
                                        styles.opcionFiltroActiva,
                                    ]}
                                    onPress={() =>
                                        seleccionarAccion(opcion.valor)
                                    }
                                    disabled={cargando}
                                    activeOpacity={0.75}
                                >
                                    <Text
                                        style={[
                                            styles.textoOpcion,
                                            seleccionada &&
                                            styles.textoOpcionActivo,
                                        ]}
                                    >
                                        {opcion.etiqueta}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ERROR */}

                {!!error && (
                    <View style={styles.tarjetaError}>
                        <Text style={styles.textoError}>
                            {error}
                        </Text>

                        <TouchableOpacity
                            onPress={() => consultar(filtrosAplicados)}
                            style={styles.botonReintentar}
                        >
                            <Text style={styles.textoReintentar}>
                                Reintentar
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ENCABEZADO DE LISTA */}

                <View style={styles.encabezadoLista}>
                    <View>
                        <Text style={styles.tituloLista}>
                            Registros de actividad
                        </Text>

                        <Text style={styles.subtituloLista}>
                            Selecciona un registro para consultar su detalle.
                        </Text>
                    </View>

                    <Text style={styles.totalDiscreto}>
                        {total} {total === 1 ? "registro" : "registros"}
                    </Text>
                </View>

                {/* CARGA */}

                {cargando && (
                    <View style={styles.estadoCarga}>
                        <ActivityIndicator
                            size="large"
                            color="#12665E"
                        />

                        <Text style={styles.textoCarga}>
                            Consultando historial...
                        </Text>
                    </View>
                )}

                {/* SIN REGISTROS */}

                {!cargando && registros.length === 0 && !error && (
                    <View style={styles.sinRegistros}>
                        <Text style={styles.iconoVacio}>
                            {"▤"}
                        </Text>

                        <Text style={styles.tituloVacio}>
                            No hay cambios registrados
                        </Text>

                        <Text style={styles.textoVacio}>
                            No se encontraron registros para el tipo de acción seleccionado.
                        </Text>
                    </View>
                )}

                {/* LISTA DE REGISTROS */}

                {!cargando && registros.map((registro) => {
                    const colores = obtenerColorAccion(
                        registro.tipo_accion
                    );

                    return (
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
                                            backgroundColor: colores.fondo,
                                        },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.textoAccion,
                                            {
                                                color: colores.texto,
                                            },
                                        ]}
                                    >
                                        {formatearAccion(
                                            registro.tipo_accion
                                        )}
                                    </Text>
                                </View>

                                <Text style={styles.fechaRegistro}>
                                    {formatearFechaHora(
                                        registro.fecha_cambio
                                    )}
                                </Text>
                            </View>

                            <Text style={styles.descripcionRegistro}>
                                {obtenerDescripcionRegistro(registro)}
                            </Text>

                            <View style={styles.detallesRegistro}>
                                <View style={styles.datoRegistro}>
                                    <Text style={styles.etiquetaDato}>
                                        REGISTRO
                                    </Text>

                                    <Text style={styles.valorDato}>
                                        {obtenerEtiquetaEntidad(
                                            registro.entidad
                                        )}
                                    </Text>
                                </View>

                                <View style={styles.datoRegistro}>
                                    <Text style={styles.etiquetaDato}>
                                        IDENTIFICADOR
                                    </Text>

                                    <Text
                                        style={styles.valorDato}
                                        numberOfLines={1}
                                    >
                                        {registro.registro_id || "No disponible"}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.separadorRegistro} />

                            <View style={styles.pieRegistro}>
                                <Text style={styles.usuarioRegistro}>
                                    Usuario: {registro.usuario_id || "No identificado"}
                                </Text>

                                <Text style={styles.verDetalle}>
                                    Ver detalle →
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}

                {/* PAGINACIÓN */}

                {!cargando && totalPaginas > 1 && (
                    <View style={styles.paginacion}>
                        <TouchableOpacity
                            style={[
                                styles.botonPagina,
                                pagina <= 1 &&
                                styles.botonPaginaDesactivado,
                            ]}
                            disabled={pagina <= 1}
                            onPress={() =>
                                cambiarPagina(pagina - 1)
                            }
                        >
                            <Text style={styles.textoPagina}>
                                {"<"} Anterior
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.numeroPagina}>
                            {pagina} / {totalPaginas}
                        </Text>

                        <TouchableOpacity
                            style={[
                                styles.botonPagina,
                                pagina >= totalPaginas &&
                                styles.botonPaginaDesactivado,
                            ]}
                            disabled={pagina >= totalPaginas}
                            onPress={() =>
                                cambiarPagina(pagina + 1)
                            }
                        >
                            <Text style={styles.textoPagina}>
                                Siguiente {">"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ACTUALIZAR */}

                <TouchableOpacity
                    style={styles.botonActualizar}
                    onPress={() => consultar(filtrosAplicados, true)}
                    disabled={actualizando || cargando}
                >
                    {actualizando ? (
                        <ActivityIndicator color="#12665E" />
                    ) : (
                        <Text style={styles.textoActualizar}>
                            Actualizar historial
                        </Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

// ============================================================
// ESTILOS
// ============================================================

const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: "#F4F7F6",
    },

    scroll: {
        flex: 1,
    },

    contenido: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 45,
        maxWidth: 1200,
        width: "100%",
        alignSelf: "center",
    },

    encabezadoPagina: {
        marginBottom: 23,
    },

    ruta: {
        fontSize: 11,
        marginBottom: 17,
        color: "#84928C",
    },

    rutaEnlace: {
        color: "#71847B",
    },

    separadorRuta: {
        color: "#AAB6B0",
    },

    rutaActual: {
        color: "#315A4E",
        fontWeight: "700",
    },

    filaTitulo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },

    botonVolver: {
        width: 34,
        height: 34,
        borderRadius: 8,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#DCE7E2",
        justifyContent: "center",
        alignItems: "center",
    },

    simboloVolver: {
        color: "#12665E",
        fontSize: 21,
        fontWeight: "500",
        lineHeight: 25,
    },

    titulo: {
        color: "#173D38",
        fontSize: 25,
        fontWeight: "800",
        flex: 1,
    },

    subtitulo: {
        color: "#7B8983",
        fontSize: 12,
        marginTop: 8,
        marginLeft: 46,
    },

    tarjetaFiltro: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 18,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#E5ECE9",
    },

    etiquetaFiltro: {
        color: "#65776F",
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.7,
        marginBottom: 13,
    },

    opcionesFiltro: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 9,
    },

    opcionFiltro: {
        minHeight: 37,
        paddingHorizontal: 15,
        paddingVertical: 9,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: "#E0E8E4",
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
    },

    opcionFiltroActiva: {
        backgroundColor: "#E8F3EF",
        borderColor: "#12665E",
    },

    textoOpcion: {
        color: "#66776F",
        fontSize: 11,
        fontWeight: "600",
    },

    textoOpcionActivo: {
        color: "#12665E",
        fontWeight: "800",
    },

    encabezadoLista: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 13,
        gap: 10,
    },

    tituloLista: {
        color: "#31564C",
        fontSize: 15,
        fontWeight: "800",
    },

    subtituloLista: {
        color: "#8A9791",
        fontSize: 11,
        marginTop: 4,
    },

    totalDiscreto: {
        color: "#8A9791",
        fontSize: 10,
    },

    estadoCarga: {
        backgroundColor: "#FFFFFF",
        borderRadius: 11,
        padding: 28,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5ECE9",
    },

    textoCarga: {
        color: "#7B8983",
        fontSize: 12,
        marginTop: 11,
    },

    tarjetaRegistro: {
        backgroundColor: "#FFFFFF",
        borderRadius: 11,
        padding: 17,
        marginBottom: 11,
        borderWidth: 1,
        borderColor: "#E5ECE9",
    },

    filaRegistro: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 9,
        marginBottom: 12,
    },

    etiquetaAccion: {
        borderRadius: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },

    textoAccion: {
        fontSize: 10,
        fontWeight: "800",
    },

    fechaRegistro: {
        color: "#899690",
        fontSize: 10,
    },

    descripcionRegistro: {
        color: "#24483F",
        fontSize: 14,
        fontWeight: "800",
        marginBottom: 14,
    },

    detallesRegistro: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 28,
    },

    datoRegistro: {
        minWidth: 130,
        maxWidth: "100%",
        flex: 1,
    },

    etiquetaDato: {
        color: "#9AA6A1",
        fontSize: 9,
        fontWeight: "800",
        marginBottom: 5,
    },

    valorDato: {
        color: "#526A61",
        fontSize: 11,
        fontWeight: "600",
    },

    separadorRegistro: {
        height: 1,
        backgroundColor: "#EDF1EF",
        marginTop: 14,
        marginBottom: 10,
    },

    pieRegistro: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
    },

    usuarioRegistro: {
        color: "#83918B",
        fontSize: 10,
    },

    verDetalle: {
        color: "#12665E",
        fontSize: 11,
        fontWeight: "800",
    },

    sinRegistros: {
        backgroundColor: "#FFFFFF",
        borderRadius: 11,
        padding: 30,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5ECE9",
    },

    iconoVacio: {
        color: "#A5B5AE",
        fontSize: 35,
        marginBottom: 10,
    },

    tituloVacio: {
        color: "#34564E",
        fontSize: 14,
        fontWeight: "800",
    },

    textoVacio: {
        color: "#899690",
        fontSize: 11,
        lineHeight: 18,
        textAlign: "center",
        marginTop: 7,
        maxWidth: 420,
    },

    tarjetaError: {
        backgroundColor: "#FCEBE9",
        borderRadius: 9,
        padding: 14,
        marginBottom: 15,
    },

    textoError: {
        color: "#A33B32",
        fontSize: 12,
        lineHeight: 18,
    },

    botonReintentar: {
        alignSelf: "flex-start",
        marginTop: 9,
    },

    textoReintentar: {
        color: "#12665E",
        fontWeight: "800",
        fontSize: 12,
    },

    paginacion: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginVertical: 18,
        gap: 10,
    },

    botonPagina: {
        backgroundColor: "#12665E",
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 7,
    },

    botonPaginaDesactivado: {
        backgroundColor: "#AABAB5",
    },

    textoPagina: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "800",
    },

    numeroPagina: {
        color: "#526A61",
        fontSize: 11,
        fontWeight: "800",
    },

    botonActualizar: {
        minHeight: 42,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#D5E3DD",
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 8,
    },

    textoActualizar: {
        color: "#12665E",
        fontWeight: "800",
        fontSize: 12,
    },
});