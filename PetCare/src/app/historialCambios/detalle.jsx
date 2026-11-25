/**
 * ============================================================
 * PETCARE - DETALLE DEL HISTORIAL DE CAMBIOS
 * Archivo: src/app/historialCambios/detalle.jsx
 *
 * RF50: Consultar detalle del historial de cambios.
 *
 * Arquitectura:
 * Vista -> Controlador -> Servicio -> DAO -> Supabase.
 * ============================================================
 */

import React, { useEffect, useState } from "react";

import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    useLocalSearchParams,
    useRouter,
} from "expo-router";

import EncabezadoPetCare from "../../components/layout/EncabezadoPetCare";

import {
    cargarDetalleHistorial,
} from "../../controllers/historial/historialCambiosControlador";

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

const ENTIDADES = [
    { valor: "propietarios", etiqueta: "Propietarios" },
    { valor: "mascotas", etiqueta: "Mascotas" },
    { valor: "atenciones", etiqueta: "Atenciones" },
    { valor: "actividades", etiqueta: "Actividades" },
    { valor: "perfiles", etiqueta: "Usuarios" },
];

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

function formatearJSON(valor) {
    if (valor === null || valor === undefined) {
        return "Sin información";
    }

    if (typeof valor === "string") {
        try {
            return JSON.stringify(
                JSON.parse(valor),
                null,
                2
            );
        } catch {
            return valor;
        }
    }

    try {
        return JSON.stringify(valor, null, 2);
    } catch {
        return String(valor);
    }
}

function obtenerEtiquetaEntidad(entidad) {
    const encontrada = ENTIDADES.find(
        (item) => item.valor === entidad
    );

    return encontrada?.etiqueta || entidad || "Sin entidad";
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

export default function DetalleHistorialCambios() {
    const router = useRouter();
    const parametros = useLocalSearchParams();

    const id = Array.isArray(parametros.id)
        ? parametros.id[0]
        : parametros.id;

    const [detalle, setDetalle] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [intento, setIntento] = useState(0);

    // --------------------------------------------------------
    // CONSULTAR DETALLE
    // --------------------------------------------------------

    useEffect(() => {
        let activo = true;

        async function consultarDetalle() {
            try {
                setCargando(true);
                setError("");
                setDetalle(null);

                if (!id) {
                    throw new Error(
                        "No se recibió el identificador del cambio."
                    );
                }

                const respuesta = await cargarDetalleHistorial(id);

                if (!respuesta?.correcto) {
                    throw new Error(
                        respuesta?.mensaje ||
                        "No fue posible consultar el detalle."
                    );
                }

                if (!respuesta.datos) {
                    throw new Error(
                        "No se encontró información para este registro."
                    );
                }

                if (activo) {
                    setDetalle(respuesta.datos);
                }
            } catch (e) {
                console.error(
                    "Error al consultar detalle:",
                    e
                );

                if (activo) {
                    setError(
                        e?.message ||
                        "Ocurrió un error al consultar el detalle."
                    );
                }
            } finally {
                if (activo) {
                    setCargando(false);
                }
            }
        }

        consultarDetalle();

        return () => {
            activo = false;
        };
    }, [id, intento]);

    // --------------------------------------------------------
    // VOLVER AL LISTADO
    // --------------------------------------------------------

    function volverHistorial() {
        router.replace('/administracion/administracion');
    }

    // --------------------------------------------------------
    // REINTENTAR CONSULTA
    // --------------------------------------------------------

    function reintentar() {
        setIntento((actual) => actual + 1);
    }

    const colores = obtenerColorAccion(
        detalle?.tipo_accion
    );

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
                            onPress={() => router.replace("/administracion")}
                        >
                            Administración
                        </Text>

                        <Text style={styles.separadorRuta}>
                            {" / "}
                        </Text>

                        <Text
                            style={styles.rutaEnlace}
                            onPress={volverHistorial}
                        >
                            Historial de cambios
                        </Text>

                        <Text style={styles.separadorRuta}>
                            {" / "}
                        </Text>

                        <Text style={styles.rutaActual}>
                            Detalle
                        </Text>
                    </Text>

                    <View style={styles.filaTitulo}>
                        <TouchableOpacity
                            style={styles.botonVolver}
                            onPress={volverHistorial}
                            accessibilityLabel="Volver al historial de cambios"
                        >
                            <Text style={styles.simboloVolver}>
                                {"<"}
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.titulo}>
                            Detalle del cambio
                        </Text>
                    </View>

                    <Text style={styles.subtitulo}>
                        Información completa de la operación registrada en PetCare.
                    </Text>
                </View>

                {/* CARGANDO */}

                {cargando && (
                    <View style={styles.estado}>
                        <ActivityIndicator
                            size="large"
                            color="#12665E"
                        />

                        <Text style={styles.textoEstado}>
                            Consultando información del registro...
                        </Text>
                    </View>
                )}

                {/* ERROR */}

                {!cargando && !!error && (
                    <View style={styles.error}>
                        <Text style={styles.tituloError}>
                            No se pudo cargar el detalle
                        </Text>

                        <Text style={styles.textoError}>
                            {error}
                        </Text>

                        <View style={styles.botonesError}>
                            <TouchableOpacity
                                style={styles.botonReintentar}
                                onPress={reintentar}
                            >
                                <Text style={styles.textoBotonReintentar}>
                                    Reintentar
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.botonVolverError}
                                onPress={volverHistorial}
                            >
                                <Text style={styles.textoBotonVolverError}>
                                    {"<"} Historial
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* INFORMACIÓN DEL REGISTRO */}

                {!cargando && !error && detalle && (
                    <>
                        {/* RESUMEN DE OPERACIÓN */}

                        <View style={styles.tarjetaPrincipal}>
                            <Text style={styles.etiquetaSeccion}>
                                OPERACIÓN REGISTRADA
                            </Text>

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
                                        detalle.tipo_accion
                                    )}
                                </Text>
                            </View>

                            <Text style={styles.nombreEntidad}>
                                {obtenerEtiquetaEntidad(
                                    detalle.entidad
                                )}
                            </Text>

                            <Text style={styles.fecha}>
                                {formatearFechaHora(
                                    detalle.fecha_cambio
                                )}
                            </Text>
                        </View>

                        {/* INFORMACIÓN GENERAL */}

                        <View style={styles.tarjeta}>
                            <Text style={styles.tituloTarjeta}>
                                Información general
                            </Text>

                            <View style={styles.gridDatos}>
                                <View style={styles.campo}>
                                    <Text style={styles.etiquetaCampo}>
                                        TIPO DE ACCIÓN
                                    </Text>

                                    <Text style={styles.valorCampo}>
                                        {formatearAccion(
                                            detalle.tipo_accion
                                        )}
                                    </Text>
                                </View>

                                <View style={styles.campo}>
                                    <Text style={styles.etiquetaCampo}>
                                        ENTIDAD
                                    </Text>

                                    <Text style={styles.valorCampo}>
                                        {obtenerEtiquetaEntidad(
                                            detalle.entidad
                                        )}
                                    </Text>
                                </View>

                                <View style={styles.campo}>
                                    <Text style={styles.etiquetaCampo}>
                                        IDENTIFICADOR DEL REGISTRO
                                    </Text>

                                    <Text style={styles.valorCampo}>
                                        {detalle.registro_id || "No disponible"}
                                    </Text>
                                </View>

                                <View style={styles.campo}>
                                    <Text style={styles.etiquetaCampo}>
                                        FECHA Y HORA
                                    </Text>

                                    <Text style={styles.valorCampo}>
                                        {formatearFechaHora(
                                            detalle.fecha_cambio
                                        )}
                                    </Text>
                                </View>

                                <View style={styles.campo}>
                                    <Text style={styles.etiquetaCampo}>
                                        USUARIO
                                    </Text>

                                    <Text style={styles.valorCampo}>
                                        {detalle.usuario_id || "No identificado"}
                                    </Text>
                                </View>

                                <View style={styles.campo}>
                                    <Text style={styles.etiquetaCampo}>
                                        ROL
                                    </Text>

                                    <Text style={styles.valorCampo}>
                                        {detalle.rol_usuario || "No especificado"}
                                    </Text>
                                </View>

                                <View style={styles.campo}>
                                    <Text style={styles.etiquetaCampo}>
                                        ATENCIÓN RELACIONADA
                                    </Text>

                                    <Text style={styles.valorCampo}>
                                        {detalle.atencion_id || "No aplica"}
                                    </Text>
                                </View>

                                <View style={styles.campo}>
                                    <Text style={styles.etiquetaCampo}>
                                        ACTIVIDAD RELACIONADA
                                    </Text>

                                    <Text style={styles.valorCampo}>
                                        {detalle.actividad_id || "No aplica"}
                                    </Text>
                                </View>

                                <View style={styles.campo}>
                                    <Text style={styles.etiquetaCampo}>
                                        IDENTIFICADOR DEL HISTORIAL
                                    </Text>

                                    <Text style={styles.valorCampo}>
                                        {detalle.historial_cambio_id || id}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* DATOS ANTERIORES */}

                        <View style={styles.tarjeta}>
                            <View style={styles.encabezadoDatos}>
                                <View style={styles.indicadorAnterior} />

                                <View style={styles.textosDatos}>
                                    <Text style={styles.tituloTarjeta}>
                                        Datos anteriores
                                    </Text>

                                    <Text style={styles.descripcionDatos}>
                                        Información que tenía el registro antes del cambio.
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.json}>
                                {formatearJSON(
                                    detalle.datos_anteriores
                                )}
                            </Text>
                        </View>

                        {/* DATOS NUEVOS */}

                        <View style={styles.tarjeta}>
                            <View style={styles.encabezadoDatos}>
                                <View style={styles.indicadorNuevo} />

                                <View style={styles.textosDatos}>
                                    <Text style={styles.tituloTarjeta}>
                                        Datos nuevos
                                    </Text>

                                    <Text style={styles.descripcionDatos}>
                                        Información resultante de la operación.
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.json}>
                                {formatearJSON(
                                    detalle.datos_nuevos
                                )}
                            </Text>
                        </View>
                    </>
                )}
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
        maxWidth: 1100,
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

    estado: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 35,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5ECE9",
    },

    textoEstado: {
        color: "#71817C",
        marginTop: 13,
        fontSize: 12,
    },

    error: {
        backgroundColor: "#FFFFFF",
        padding: 23,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#F0D5D2",
    },

    tituloError: {
        color: "#A33B32",
        fontSize: 16,
        fontWeight: "800",
    },

    textoError: {
        color: "#795B57",
        fontSize: 12,
        marginTop: 8,
        lineHeight: 19,
    },

    botonesError: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 18,
        flexWrap: "wrap",
    },

    botonReintentar: {
        backgroundColor: "#12665E",
        borderRadius: 7,
        paddingHorizontal: 15,
        paddingVertical: 10,
    },

    textoBotonReintentar: {
        color: "#FFFFFF",
        fontSize: 11,
        fontWeight: "800",
    },

    botonVolverError: {
        borderRadius: 7,
        borderWidth: 1,
        borderColor: "#DCE7E2",
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: "#FFFFFF",
    },

    textoBotonVolverError: {
        color: "#12665E",
        fontSize: 11,
        fontWeight: "800",
    },

    tarjetaPrincipal: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 21,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: "#E5ECE9",
    },

    etiquetaSeccion: {
        color: "#899690",
        fontSize: 10,
        fontWeight: "800",
        letterSpacing: 0.8,
        marginBottom: 13,
    },

    etiquetaAccion: {
        alignSelf: "flex-start",
        borderRadius: 5,
        paddingHorizontal: 11,
        paddingVertical: 7,
    },

    textoAccion: {
        fontSize: 10,
        fontWeight: "800",
    },

    nombreEntidad: {
        color: "#24483F",
        fontSize: 20,
        fontWeight: "800",
        marginTop: 13,
    },

    fecha: {
        color: "#84918C",
        fontSize: 11,
        marginTop: 7,
    },

    tarjeta: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: "#E5ECE9",
    },

    tituloTarjeta: {
        color: "#294D44",
        fontSize: 15,
        fontWeight: "800",
    },

    gridDatos: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 22,
        marginTop: 19,
    },

    campo: {
        width: "46%",
        minWidth: 210,
        flexGrow: 1,
    },

    etiquetaCampo: {
        color: "#899690",
        fontSize: 9,
        fontWeight: "800",
        letterSpacing: 0.5,
        marginBottom: 6,
    },

    valorCampo: {
        color: "#405B51",
        fontSize: 11,
        lineHeight: 18,
    },

    encabezadoDatos: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
        gap: 11,
    },

    indicadorAnterior: {
        width: 4,
        height: 39,
        borderRadius: 3,
        backgroundColor: "#D79B54",
    },

    indicadorNuevo: {
        width: 4,
        height: 39,
        borderRadius: 3,
        backgroundColor: "#279889",
    },

    textosDatos: {
        flex: 1,
    },

    descripcionDatos: {
        color: "#899690",
        fontSize: 10,
        marginTop: 4,
    },

    json: {
        color: "#405B51",
        backgroundColor: "#F4F7F6",
        padding: 14,
        borderRadius: 8,
        fontSize: 10,
        lineHeight: 18,
        overflow: "hidden",
    },
});