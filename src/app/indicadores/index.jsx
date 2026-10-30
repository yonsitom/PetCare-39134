import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useFocusEffect, router } from "expo-router";

import EncabezadoPetCare from "../../components/layout/EncabezadoPetCare";

import {
    cargarHistorialCambios,
    cargarDetalleHistorial,
} from "../../controllers/historial/historialCambiosControlador";

const ACCIONES = [
    "Todos",
    "CREAR",
    "MODIFICAR",
    "CAMBIAR_ESTADO",
    "ELIMINAR",
];

export default function HistorialCambios() {
    const [registros, setRegistros] = useState([]);
    const [total, setTotal] = useState(0);

    const [tipoAccion, setTipoAccion] = useState("Todos");
    const [fechaDesde, setFechaDesde] = useState("");
    const [fechaHasta, setFechaHasta] = useState("");

    const [cargando, setCargando] = useState(true);
    const [actualizando, setActualizando] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    const consultarHistorial = useCallback(async () => {
        setCargando(true);

        const respuesta = await cargarHistorialCambios({
            tipoAccion,
            fechaDesde: fechaDesde.trim(),
            fechaHasta: fechaHasta.trim(),
            pagina: 1,
            limite: 50,
        });

        if (respuesta.correcto) {
            setRegistros(respuesta.datos);
            setTotal(respuesta.total);
        } else {
            setRegistros([]);
            setTotal(0);
            Alert.alert("Historial de cambios", respuesta.mensaje);
        }

        setCargando(false);
        setActualizando(false);
    }, [tipoAccion, fechaDesde, fechaHasta]);

    useFocusEffect(
        useCallback(() => {
            consultarHistorial();
        }, [consultarHistorial])
    );

    const actualizar = () => {
        setActualizando(true);
        consultarHistorial();
    };

    const limpiarFiltros = () => {
        setTipoAccion("Todos");
        setFechaDesde("");
        setFechaHasta("");
    };

    const abrirDetalle = async (registro) => {
        setModalVisible(true);
        setDetalle(null);
        setCargandoDetalle(true);

        const respuesta = await cargarDetalleHistorial(
            registro.historial_cambio_id
        );

        if (respuesta.correcto) {
            setDetalle(respuesta.datos);
        } else {
            setModalVisible(false);
            Alert.alert("Detalle del historial", respuesta.mensaje);
        }

        setCargandoDetalle(false);
    };

    const cerrarDetalle = () => {
        setModalVisible(false);
        setDetalle(null);
    };

    const formatearFecha = (fecha) => {
        if (!fecha) return "Sin fecha";

        const fechaObj = new Date(fecha);

        if (Number.isNaN(fechaObj.getTime())) {
            return fecha;
        }

        return fechaObj.toLocaleString("es-PE", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const obtenerColorAccion = (accion) => {
        switch (accion) {
            case "CREAR":
                return "#16834A";
            case "MODIFICAR":
                return "#2563EB";
            case "CAMBIAR_ESTADO":
                return "#B7791F";
            case "ELIMINAR":
                return "#C0392B";
            default:
                return "#64748B";
        }
    };

    const renderRegistro = ({ item }) => (
        <Pressable
            style={styles.tarjeta}
            onPress={() => abrirDetalle(item)}
        >
            <View style={styles.filaSuperior}>
                <Text style={styles.idRegistro}>
                    Registro #{item.historial_cambio_id}
                </Text>

                <View
                    style={[
                        styles.etiquetaAccion,
                        {
                            backgroundColor: obtenerColorAccion(
                                item.tipo_accion
                            ),
                        },
                    ]}
                >
                    <Text style={styles.textoEtiqueta}>
                        {item.tipo_accion || "SIN ACCIÓN"}
                    </Text>
                </View>
            </View>

            <Text style={styles.textoRegistro}>
                Usuario: {item.usuario_id || "No especificado"}
            </Text>

            <Text style={styles.textoRegistro}>
                Rol: {item.rol_usuario || "No especificado"}
            </Text>

            <Text style={styles.fechaRegistro}>
                {formatearFecha(item.fecha_cambio)}
            </Text>

            <Text style={styles.verDetalle}>
                Ver detalle
            </Text>
        </Pressable>
    );

    const renderContenidoDetalle = (titulo, contenido) => (
        <View style={styles.bloqueDetalle}>
            <Text style={styles.tituloBloque}>{titulo}</Text>

            <Text style={styles.contenidoBloque}>
                {contenido
                    ? JSON.stringify(contenido, null, 2)
                    : "Sin información registrada"}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.contenedor}>
            <EncabezadoPetCare
                titulo="Historial de cambios"
                onAbrirMenu={() => router.push("/inicio")}
                mostrarNotificaciones={false}
            />

            <ScrollView
                style={styles.contenido}
                contentContainerStyle={styles.contenidoInterior}
                refreshControl={
                    <RefreshControl
                        refreshing={actualizando}
                        onRefresh={actualizar}
                    />
                }
            >
                <View style={styles.encabezadoSeccion}>
                    <Text style={styles.titulo}>
                        Historial de cambios
                    </Text>

                    <Text style={styles.descripcion}>
                        Consulta las acciones registradas en el sistema.
                    </Text>
                </View>

                <View style={styles.resumen}>
                    <Text style={styles.resumenTitulo}>
                        Registros encontrados
                    </Text>

                    <Text style={styles.resumenNumero}>
                        {total}
                    </Text>
                </View>

                <View style={styles.panelFiltros}>
                    <Text style={styles.tituloPanel}>
                        Filtros de búsqueda
                    </Text>

                    <Text style={styles.etiquetaCampo}>
                        Tipo de acción
                    </Text>

                    <View style={styles.contenedorAcciones}>
                        {ACCIONES.map((accion) => (
                            <Pressable
                                key={accion}
                                style={[
                                    styles.botonAccion,
                                    tipoAccion === accion &&
                                        styles.botonAccionSeleccionado,
                                ]}
                                onPress={() => setTipoAccion(accion)}
                            >
                                <Text
                                    style={[
                                        styles.textoAccion,
                                        tipoAccion === accion &&
                                            styles.textoAccionSeleccionado,
                                    ]}
                                >
                                    {accion === "Todos" ? "Todos" : accion}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <Text style={styles.etiquetaCampo}>
                        Fecha desde (AAAA-MM-DD)
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={fechaDesde}
                        onChangeText={setFechaDesde}
                        placeholder="Ejemplo: 2026-10-01"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                    />

                    <Text style={styles.etiquetaCampo}>
                        Fecha hasta (AAAA-MM-DD)
                    </Text>

                    <TextInput
                        style={styles.input}
                        value={fechaHasta}
                        onChangeText={setFechaHasta}
                        placeholder="Ejemplo: 2026-10-29"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="none"
                    />

                    <View style={styles.filaBotones}>
                        <Pressable
                            style={styles.botonBuscar}
                            onPress={consultarHistorial}
                        >
                            <Text style={styles.textoBotonBuscar}>
                                Buscar
                            </Text>
                        </Pressable>

                        <Pressable
                            style={styles.botonLimpiar}
                            onPress={limpiarFiltros}
                        >
                            <Text style={styles.textoBotonLimpiar}>
                                Limpiar
                            </Text>
                        </Pressable>
                    </View>
                </View>

                <View style={styles.seccionRegistros}>
                    <Text style={styles.tituloPanel}>
                        Registros del sistema
                    </Text>

                    {cargando ? (
                        <View style={styles.estado}>
                            <ActivityIndicator
                                size="large"
                                color="#2563EB"
                            />
                            <Text style={styles.textoEstado}>
                                Cargando historial...
                            </Text>
                        </View>
                    ) : registros.length === 0 ? (
                        <View style={styles.estadoVacio}>
                            <Text style={styles.textoVacio}>
                                No se encontraron registros.
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={registros}
                            renderItem={renderRegistro}
                            keyExtractor={(item) =>
                                String(item.historial_cambio_id)
                            }
                            scrollEnabled={false}
                        />
                    )}
                </View>
            </ScrollView>

            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={cerrarDetalle}
            >
                <View style={styles.fondoModal}>
                    <View style={styles.contenedorModal}>
                        <View style={styles.encabezadoModal}>
                            <Text style={styles.tituloModal}>
                                Detalle del cambio
                            </Text>

                            <Pressable onPress={cerrarDetalle}>
                                <Text style={styles.cerrarModal}>✕</Text>
                            </Pressable>
                        </View>

                        {cargandoDetalle ? (
                            <View style={styles.estado}>
                                <ActivityIndicator
                                    size="large"
                                    color="#2563EB"
                                />
                                <Text style={styles.textoEstado}>
                                    Consultando detalle...
                                </Text>
                            </View>
                        ) : detalle ? (
                            <ScrollView>
                                <Text style={styles.textoRegistro}>
                                    Registro: {detalle.historial_cambio_id}
                                </Text>

                                <Text style={styles.textoRegistro}>
                                    Acción: {detalle.tipo_accion}
                                </Text>

                                <Text style={styles.textoRegistro}>
                                    Usuario: {detalle.usuario_id || "No especificado"}
                                </Text>

                                <Text style={styles.textoRegistro}>
                                    Rol: {detalle.rol_usuario || "No especificado"}
                                </Text>

                                <Text style={styles.textoRegistro}>
                                    Fecha: {formatearFecha(detalle.fecha_cambio)}
                                </Text>

                                <Text style={styles.textoRegistro}>
                                    Atención: {detalle.atencion_id || "No aplica"}
                                </Text>

                                <Text style={styles.textoRegistro}>
                                    Actividad: {detalle.actividad_id || "No aplica"}
                                </Text>

                                {renderContenidoDetalle(
                                    "Datos anteriores",
                                    detalle.datos_anteriores
                                )}

                                {renderContenidoDetalle(
                                    "Datos nuevos",
                                    detalle.datos_nuevos
                                )}
                            </ScrollView>
                        ) : (
                            <Text style={styles.textoEstado}>
                                No hay información para mostrar.
                            </Text>
                        )}

                        <Pressable
                            style={styles.botonCerrar}
                            onPress={cerrarDetalle}
                        >
                            <Text style={styles.textoBotonCerrar}>
                                Cerrar
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    contenedor: {
        flex: 1,
        backgroundColor: "#F4F6FA",
    },
    contenido: {
        flex: 1,
    },
    contenidoInterior: {
        padding: 18,
        paddingBottom: 35,
    },
    encabezadoSeccion: {
        marginBottom: 18,
    },
    titulo: {
        fontSize: 23,
        fontWeight: "bold",
        color: "#172033",
    },
    descripcion: {
        fontSize: 14,
        color: "#64748B",
        marginTop: 5,
    },
    resumen: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 18,
        marginBottom: 18,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    resumenTitulo: {
        color: "#64748B",
        fontSize: 14,
    },
    resumenNumero: {
        fontSize: 30,
        fontWeight: "bold",
        color: "#2563EB",
        marginTop: 5,
    },
    panelFiltros: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    tituloPanel: {
        fontSize: 17,
        fontWeight: "bold",
        color: "#172033",
        marginBottom: 14,
    },
    etiquetaCampo: {
        fontSize: 13,
        fontWeight: "600",
        color: "#334155",
        marginTop: 12,
        marginBottom: 7,
    },
    contenedorAcciones: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 7,
    },
    botonAccion: {
        paddingVertical: 9,
        paddingHorizontal: 11,
        borderRadius: 8,
        backgroundColor: "#F1F5F9",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    botonAccionSeleccionado: {
        backgroundColor: "#2563EB",
        borderColor: "#2563EB",
    },
    textoAccion: {
        fontSize: 11,
        color: "#475569",
        fontWeight: "600",
    },
    textoAccionSeleccionado: {
        color: "#FFFFFF",
    },
    input: {
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 8,
        padding: 12,
        color: "#172033",
        backgroundColor: "#FFFFFF",
    },
    filaBotones: {
        flexDirection: "row",
        gap: 10,
        marginTop: 18,
    },
    botonBuscar: {
        flex: 1,
        backgroundColor: "#2563EB",
        padding: 13,
        borderRadius: 8,
        alignItems: "center",
    },
    textoBotonBuscar: {
        color: "#FFFFFF",
        fontWeight: "bold",
    },
    botonLimpiar: {
        flex: 1,
        backgroundColor: "#E2E8F0",
        padding: 13,
        borderRadius: 8,
        alignItems: "center",
    },
    textoBotonLimpiar: {
        color: "#334155",
        fontWeight: "bold",
    },
    seccionRegistros: {
        marginBottom: 20,
    },
    tarjeta: {
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        padding: 15,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    filaSuperior: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 12,
    },
    idRegistro: {
        color: "#172033",
        fontWeight: "bold",
        fontSize: 14,
    },
    etiquetaAccion: {
        paddingVertical: 5,
        paddingHorizontal: 9,
        borderRadius: 6,
    },
    textoEtiqueta: {
        color: "#FFFFFF",
        fontSize: 10,
        fontWeight: "bold",
    },
    textoRegistro: {
        fontSize: 13,
        color: "#475569",
        marginBottom: 7,
    },
    fechaRegistro: {
        fontSize: 12,
        color: "#64748B",
        marginTop: 5,
    },
    verDetalle: {
        color: "#2563EB",
        fontSize: 13,
        fontWeight: "bold",
        marginTop: 12,
        textAlign: "right",
    },
    estado: {
        padding: 25,
        alignItems: "center",
        justifyContent: "center",
    },
    textoEstado: {
        color: "#64748B",
        marginTop: 10,
        textAlign: "center",
    },
    estadoVacio: {
        padding: 25,
        backgroundColor: "#FFFFFF",
        borderRadius: 10,
        alignItems: "center",
    },
    textoVacio: {
        color: "#64748B",
        fontSize: 14,
    },
    fondoModal: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        justifyContent: "center",
        padding: 18,
    },
    contenedorModal: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 18,
        maxHeight: "85%",
    },
    encabezadoModal: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 18,
    },
    tituloModal: {
        fontSize: 19,
        fontWeight: "bold",
        color: "#172033",
    },
    cerrarModal: {
        fontSize: 23,
        color: "#64748B",
        paddingHorizontal: 5,
    },
    bloqueDetalle: {
        marginTop: 18,
    },
    tituloBloque: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#172033",
        marginBottom: 8,
    },
    contenidoBloque: {
        backgroundColor: "#F1F5F9",
        padding: 12,
        borderRadius: 8,
        color: "#334155",
        fontSize: 12,
    },
    botonCerrar: {
        backgroundColor: "#2563EB",
        borderRadius: 8,
        padding: 13,
        alignItems: "center",
        marginTop: 18,
    },
    textoBotonCerrar: {
        color: "#FFFFFF",
        fontWeight: "bold",
    },
});