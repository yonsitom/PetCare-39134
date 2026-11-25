
/**
 * ============================================================
 * PETCARE - PANTALLA PRINCIPAL DE INDICADORES
 * Archivo: src/app/indicadores/paginaPrincipal.jsx
 *
 * RF:
 * - Consultar indicadores.
 * - Filtrar por periodo mediante calendario.
 * - Mostrar estadísticas de PetCare.
 * - Exportar reporte PDF completo.
 *
 * Arquitectura:
 * Vista -> Controlador -> DAO -> Supabase RPC
 * ============================================================
 */

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import EncabezadoPetCare from "../../components/layout/EncabezadoPetCare";
import MenuLateralDerecho from "../../components/layout/MenuLateralDerecho";

import {
  cargarIndicadores,
} from "../../controllers/indicadores/indicadoresControlador";

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

const numero = (valor) => {
  const resultado = Number(valor ?? 0);
  return Number.isFinite(resultado) ? resultado : 0;
};

const fechaLocalISO = (fecha) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
};

const convertirFecha = (valor) => {
  if (!valor) return new Date();

  const partes = String(valor).split("-");

  if (partes.length !== 3) return new Date();

  const fecha = new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2])
  );

  return Number.isNaN(fecha.getTime()) ? new Date() : fecha;
};

const formatearFecha = (fecha) => {
  if (!fecha) return "Sin límite";

  const partes = String(fecha).split("-");

  if (partes.length !== 3) return fecha;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const obtenerEntradas = (objeto) => {
  if (!objeto) return [];

  if (Array.isArray(objeto)) {
    return objeto.map((item, indice) => {
      if (typeof item === "object" && item !== null) {
        return [
          item.nombre ||
            item.rol ||
            item.estado ||
            item.tipo ||
            item.especie ||
            `Elemento ${indice + 1}`,
          numero(item.total ?? item.cantidad ?? item.valor),
        ];
      }

      return [`Elemento ${indice + 1}`, numero(item)];
    });
  }

  if (typeof objeto === "object") {
    return Object.entries(objeto).map(([clave, valor]) => [
      clave,
      numero(valor),
    ]);
  }

  return [];
};

const capitalizar = (texto) => {
  if (!texto) return "";

  return String(texto)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
};

const escaparHTML = (valor) => {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const fechaGeneracion = () => {
  return new Date().toLocaleString("es-PE", {
    dateStyle: "long",
    timeStyle: "short",
  });
};

// ============================================================
// GENERACIÓN DEL REPORTE HTML PARA PDF
// ============================================================

const generarHTMLIndicadores = (datos, fechaInicio, fechaFin) => {
  const atenciones = datos?.atenciones || {};
  const actividades = datos?.actividades || {};
  const seguimiento = datos?.seguimiento || {};
  const mascotas = datos?.mascotas || {};
  const usuarios = datos?.usuarios || {};

  const inicio = datos?.filtros?.fecha_inicio || fechaInicio;
  const fin = datos?.filtros?.fecha_fin || fechaFin;

  const crearTarjetas = (elementos) => `
    <div class="tarjetas">
      ${elementos.map(([titulo, valor]) => `
        <div class="tarjeta">
          <div class="tarjeta-titulo">${escaparHTML(titulo)}</div>
          <div class="tarjeta-valor">${numero(valor)}</div>
        </div>
      `).join("")}
    </div>
  `;

  const crearTabla = (titulo, objeto) => {
    const entradas = obtenerEntradas(objeto);

    const filas = entradas.length
      ? entradas.map(([etiqueta, valor]) => `
          <tr>
            <td>${escaparHTML(capitalizar(etiqueta))}</td>
            <td class="numero">${numero(valor)}</td>
          </tr>
        `).join("")
      : `
          <tr>
            <td colspan="2" class="sin-datos">
              No hay datos registrados para esta categoría.
            </td>
          </tr>
        `;

    return `
      <div class="bloque-tabla">
        <h3>${escaparHTML(titulo)}</h3>
        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th class="numero">Cantidad</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
          <tfoot>
            <tr>
              <td>Total de registros mostrados</td>
              <td class="numero">
                ${entradas.reduce((total, entrada) => total + numero(entrada[1]), 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  };

  const encabezadoPagina = (numeroPagina, titulo, descripcion) => `
    <div class="encabezado-pagina">
      <div class="marca-pequena">PETCARE</div>
      <div class="texto-marca">Centro Veterinario del Sur E.I.R.L.</div>
      <div class="numero-pagina">SECCIÓN ${numeroPagina}</div>
      <h1>${escaparHTML(titulo)}</h1>
      <p>${escaparHTML(descripcion)}</p>
    </div>
  `;

  const portada = `
    <section class="pagina portada">
      <div class="portada-superior">
        <div class="marca-portada">PETCARE</div>
        <div class="linea-portada"></div>
        <p class="submarca-portada">
          CENTRO VETERINARIO DEL SUR E.I.R.L.
        </p>
      </div>

      <div class="portada-contenido">
        <div class="etiqueta-documento">INFORME ESTADÍSTICO</div>
        <h1>Reporte de indicadores</h1>

        <p class="descripcion-portada">
          Resumen de la gestión veterinaria y seguimiento
          de las actividades registradas en el sistema PetCare.
        </p>

        <div class="datos-portada">
          <div class="dato-portada">
            <span>Periodo consultado</span>
            <strong>
              ${escaparHTML(formatearFecha(inicio))}
              al
              ${escaparHTML(formatearFecha(fin))}
            </strong>
          </div>

          <div class="dato-portada">
            <span>Fecha de generación</span>
            <strong>${escaparHTML(fechaGeneracion())}</strong>
          </div>

          <div class="dato-portada">
            <span>Sistema</span>
            <strong>PetCare - Seguimiento veterinario</strong>
          </div>
        </div>
      </div>

      <div class="pie-portada">
        DOCUMENTO GENERADO DESDE EL SISTEMA PETCARE
      </div>
    </section>
  `;

  const resumen = `
    <section class="pagina">
      ${encabezadoPagina(
        "01",
        "Resumen general",
        "Vista consolidada de los principales indicadores del sistema."
      )}

      <div class="resumen-introduccion">
        Este resumen presenta las cifras generales de las
        atenciones veterinarias, actividades, seguimiento,
        mascotas y usuarios registrados.
      </div>

      <h2>Indicadores principales</h2>

      ${crearTarjetas([
        ["Total de atenciones", atenciones.total],
        ["Total de actividades", actividades.total],
        ["Actividades pendientes", actividades.pendientes],
        ["Mascotas registradas", mascotas.total],
        ["Usuarios registrados", usuarios.total],
        ["Actividades vencidas", seguimiento.vencidas],
      ])}

      <h2>Estado de la gestión</h2>

      <table>
        <thead>
          <tr>
            <th>Área</th>
            <th>Indicador</th>
            <th class="numero">Cantidad</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Atenciones</td><td>Activas</td><td class="numero">${numero(atenciones.activas)}</td></tr>
          <tr><td>Atenciones</td><td>Finalizadas</td><td class="numero">${numero(atenciones.finalizadas)}</td></tr>
          <tr><td>Actividades</td><td>Completadas</td><td class="numero">${numero(actividades.completadas)}</td></tr>
          <tr><td>Actividades</td><td>No realizadas</td><td class="numero">${numero(actividades.no_realizadas)}</td></tr>
          <tr><td>Seguimiento</td><td>Por vencer</td><td class="numero">${numero(seguimiento.por_vencer)}</td></tr>
          <tr><td>Mascotas</td><td>Activas</td><td class="numero">${numero(mascotas.activas)}</td></tr>
          <tr><td>Usuarios</td><td>Activos</td><td class="numero">${numero(usuarios.activos)}</td></tr>
        </tbody>
      </table>

      <div class="nota">
        Los valores corresponden a la información devuelta
        por la consulta de indicadores de PetCare.
      </div>
    </section>
  `;

  const paginaAtenciones = `
    <section class="pagina">
      ${encabezadoPagina(
        "02",
        "Atenciones veterinarias",
        "Resumen de las atenciones registradas en el sistema."
      )}

      ${crearTarjetas([
        ["Total de atenciones", atenciones.total],
        ["Atenciones activas", atenciones.activas],
        ["Atenciones finalizadas", atenciones.finalizadas],
      ])}

      ${crearTabla("Distribución de atenciones por estado", atenciones.por_estado)}
    </section>
  `;

  const paginaActividades = `
    <section class="pagina">
      ${encabezadoPagina(
        "03",
        "Actividades",
        "Estado de las actividades realizadas y programadas."
      )}

      ${crearTarjetas([
        ["Total de actividades", actividades.total],
        ["Pendientes", actividades.pendientes],
        ["Completadas", actividades.completadas],
        ["No realizadas", actividades.no_realizadas],
      ])}

      ${crearTabla("Actividades por estado", actividades.por_estado)}
      ${crearTabla("Actividades por tipo", actividades.por_tipo)}
    </section>
  `;

  const paginaSeguimiento = `
    <section class="pagina">
      ${encabezadoPagina(
        "04",
        "Seguimiento",
        "Control del cumplimiento y estado de las actividades."
      )}

      ${crearTarjetas([
        ["Pendientes", seguimiento.pendientes],
        ["Completadas", seguimiento.completadas],
        ["No realizadas", seguimiento.no_realizadas],
        ["Vencidas", seguimiento.vencidas],
        ["Por vencer", seguimiento.por_vencer],
      ])}

      <div class="bloque-informativo">
        <h3>Resumen del seguimiento</h3>
        <p>Las actividades pendientes representan tareas que todavía requieren atención.</p>
        <p>Las actividades completadas corresponden a tareas registradas como realizadas.</p>
        <p>Las actividades no realizadas corresponden a tareas que no llegaron a ejecutarse.</p>
        <p>Las actividades vencidas y por vencer permiten identificar tareas que requieren atención según su fecha prevista.</p>
      </div>
    </section>
  `;

  const paginaMascotas = `
    <section class="pagina">
      ${encabezadoPagina(
        "05",
        "Mascotas",
        "Resumen de las mascotas registradas en PetCare."
      )}

      ${crearTarjetas([
        ["Total de mascotas", mascotas.total],
        ["Mascotas activas", mascotas.activas],
        ["Mascotas inactivas", mascotas.inactivas],
      ])}

      ${crearTabla("Distribución de mascotas por especie", mascotas.por_especie)}
    </section>
  `;

  const paginaUsuarios = `
    <section class="pagina">
      ${encabezadoPagina(
        "06",
        "Usuarios",
        "Resumen de las cuentas registradas en el sistema."
      )}

      ${crearTarjetas([
        ["Total de usuarios", usuarios.total],
        ["Usuarios activos", usuarios.activos],
        ["Usuarios inactivos", usuarios.inactivos],
        ["Administradores", usuarios.administradores],
        ["Asistentes", usuarios.asistentes],
      ])}

      ${crearTabla("Distribución de usuarios por rol", usuarios.por_rol)}
    </section>
  `;

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reporte de indicadores - PetCare</title>

        <style>
          * { box-sizing: border-box; }

          @page {
            size: A4;
            margin: 15mm 14mm 17mm;
          }

          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #263849;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            line-height: 1.5;
          }

          .pagina {
            width: 100%;
            min-height: 255mm;
            position: relative;
            page-break-after: always;
            break-after: page;
            padding: 0;
          }

          .pagina:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .portada {
            min-height: 255mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .portada-superior { padding-top: 30mm; }

          .marca-portada {
            color: #1769aa;
            font-size: 38px;
            font-weight: 900;
            letter-spacing: 4px;
          }

          .linea-portada {
            width: 100%;
            height: 5px;
            background: #1976d2;
            margin: 12px 0;
          }

          .submarca-portada {
            color: #64748b;
            font-size: 11px;
            letter-spacing: 2px;
            font-weight: bold;
          }

          .portada-contenido {
            margin-top: 20mm;
            margin-bottom: 35mm;
          }

          .etiqueta-documento {
            display: inline-block;
            background: #e8f1fa;
            color: #1769aa;
            padding: 7px 12px;
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 1px;
            margin-bottom: 20px;
          }

          .portada h1 {
            color: #17324d;
            font-size: 34px;
            line-height: 1.2;
            margin: 0 0 15px;
          }

          .descripcion-portada {
            color: #64748b;
            font-size: 15px;
            max-width: 440px;
            line-height: 1.7;
          }

          .datos-portada {
            margin-top: 35px;
            border-top: 1px solid #dce5ef;
          }

          .dato-portada {
            padding: 13px 0;
            border-bottom: 1px solid #dce5ef;
          }

          .dato-portada span {
            display: block;
            color: #718096;
            font-size: 10px;
            margin-bottom: 3px;
          }

          .dato-portada strong {
            color: #263849;
            font-size: 12px;
          }

          .pie-portada {
            border-top: 2px solid #1976d2;
            padding-top: 12px;
            color: #718096;
            font-size: 9px;
            letter-spacing: 1px;
          }

          .encabezado-pagina {
            border-bottom: 2px solid #1976d2;
            padding-bottom: 15px;
            margin-bottom: 22px;
          }

          .marca-pequena {
            color: #1976d2;
            font-size: 19px;
            font-weight: 900;
            letter-spacing: 2px;
          }

          .texto-marca {
            color: #718096;
            font-size: 9px;
          }

          .numero-pagina {
            float: right;
            color: #718096;
            font-size: 9px;
            font-weight: bold;
            margin-top: -25px;
          }

          .encabezado-pagina h1 {
            color: #17324d;
            font-size: 24px;
            margin: 20px 0 4px;
          }

          .encabezado-pagina p {
            color: #718096;
            font-size: 11px;
            margin: 0;
          }

          .resumen-introduccion {
            background: #f1f6fb;
            border-left: 4px solid #1976d2;
            padding: 13px;
            margin-bottom: 22px;
            color: #526579;
            line-height: 1.7;
          }

          h2 {
            color: #17324d;
            font-size: 15px;
            margin: 24px 0 12px;
            padding-bottom: 7px;
            border-bottom: 1px solid #dce5ef;
          }

          h3 {
            color: #34495e;
            font-size: 12px;
            margin: 20px 0 10px;
          }

          .tarjetas {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin: 15px 0 22px;
          }

          .tarjeta {
            border: 1px solid #dce5ef;
            border-left: 4px solid #1976d2;
            border-radius: 5px;
            padding: 12px;
            min-height: 68px;
            break-inside: avoid;
          }

          .tarjeta-titulo {
            color: #64748b;
            font-size: 10px;
            margin-bottom: 5px;
          }

          .tarjeta-valor {
            color: #17324d;
            font-size: 23px;
            font-weight: bold;
          }

          .bloque-tabla {
            margin-top: 18px;
            break-inside: avoid;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }

          thead { display: table-header-group; }
          tr { break-inside: avoid; }

          th {
            background: #eaf1f8;
            color: #34495e;
            text-align: left;
            font-weight: bold;
          }

          th, td {
            border: 1px solid #dce5ef;
            padding: 9px 10px;
          }

          tbody tr:nth-child(even) { background: #f8fafc; }

          .numero {
            text-align: right;
            width: 105px;
            font-weight: bold;
          }

          tfoot {
            background: #f1f6fb;
            font-weight: bold;
          }

          .sin-datos {
            color: #718096;
            text-align: center;
            padding: 15px;
          }

          .nota {
            background: #f1f6fb;
            color: #526579;
            border-radius: 5px;
            padding: 12px;
            margin-top: 25px;
            font-size: 10px;
          }

          .bloque-informativo {
            border: 1px solid #dce5ef;
            border-radius: 6px;
            padding: 15px;
            margin-top: 25px;
          }

          .bloque-informativo h3 { margin-top: 0; }

          .bloque-informativo p {
            color: #526579;
            font-size: 11px;
            line-height: 1.7;
            border-bottom: 1px solid #edf1f5;
            padding-bottom: 8px;
          }

          @media screen {
            body {
              background: #e8edf3;
              padding: 20px;
            }

            .pagina {
              background: #ffffff;
              max-width: 210mm;
              min-height: 297mm;
              margin: 0 auto 20px;
              padding: 20mm 18mm;
              box-shadow: 0 2px 12px rgba(0,0,0,0.10);
            }
          }

          @media print {
            body {
              background: #ffffff;
              padding: 0;
            }

            .pagina {
              min-height: 255mm;
              margin: 0;
              box-shadow: none;
            }

            .tarjeta,
            .bloque-tabla,
            .bloque-informativo {
              break-inside: avoid;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>

      <body>
        ${portada}
        ${resumen}
        ${paginaAtenciones}
        ${paginaActividades}
        ${paginaSeguimiento}
        ${paginaMascotas}
        ${paginaUsuarios}
      </body>
    </html>
  `;
};

// ============================================================
// COMPONENTES DE PRESENTACIÓN
// ============================================================

function TarjetaIndicador({
  titulo,
  valor,
  descripcion,
  icono,
  color,
}) {
  return (
    <View style={[styles.tarjetaIndicador, { borderLeftColor: color }]}>
      <View style={styles.tarjetaEncabezado}>
        <Text style={styles.tarjetaIcono}>{icono}</Text>
        <Text style={styles.tarjetaTitulo}>{titulo}</Text>
      </View>

      <Text style={styles.tarjetaValor}>{numero(valor)}</Text>

      {!!descripcion && (
        <Text style={styles.tarjetaDescripcion}>{descripcion}</Text>
      )}
    </View>
  );
}

function SeccionIndicadores({ titulo, descripcion, children }) {
  return (
    <View style={styles.seccion}>
      <View style={styles.seccionEncabezado}>
        <Text style={styles.seccionTitulo}>{titulo}</Text>

        {!!descripcion && (
          <Text style={styles.seccionDescripcion}>{descripcion}</Text>
        )}
      </View>

      {children}
    </View>
  );
}

function BarraIndicador({ etiqueta, valor, total, color }) {
  const cantidad = numero(valor);
  const cantidadTotal = numero(total);

  const porcentaje =
    cantidadTotal > 0
      ? Math.min((cantidad / cantidadTotal) * 100, 100)
      : 0;

  return (
    <View style={styles.barraContenedor}>
      <View style={styles.barraInformacion}>
        <Text style={styles.barraEtiqueta}>
          {capitalizar(etiqueta)}
        </Text>

        <Text style={styles.barraValor}>{cantidad}</Text>
      </View>

      <View style={styles.barraFondo}>
        <View
          style={[
            styles.barraProgreso,
            {
              width: `${porcentaje}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

function DesgloseIndicadores({ titulo, datos, color }) {
  const entradas = obtenerEntradas(datos);

  if (entradas.length === 0) {
    return (
      <View style={styles.sinDesglose}>
        <Text style={styles.textoSinDesglose}>
          No hay datos disponibles para esta categoría.
        </Text>
      </View>
    );
  }

  const total = entradas.reduce(
    (acumulado, entrada) => acumulado + numero(entrada[1]),
    0
  );

  return (
    <View style={styles.desglose}>
      <Text style={styles.desgloseTitulo}>{titulo}</Text>

      {entradas.map(([etiqueta, valor], indice) => (
        <BarraIndicador
          key={`${etiqueta}-${indice}`}
          etiqueta={etiqueta}
          valor={valor}
          total={total}
          color={color}
        />
      ))}
    </View>
  );
}

// ============================================================
// PANTALLA PRINCIPAL
// ============================================================

export default function PaginaPrincipalIndicadores() {
  const [datos, setDatos] = useState(null);

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const [menuVisible, setMenuVisible] = useState(false);

  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [campoFechaActivo, setCampoFechaActivo] = useState(null);

  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [exportandoPDF, setExportandoPDF] = useState(false);
  const [error, setError] = useState("");

  // ----------------------------------------------------------
  // CARGAR INDICADORES
  // ----------------------------------------------------------

  const consultarDatos = useCallback(
    async (mostrarCarga = true) => {
      if (mostrarCarga) {
        setCargando(true);
      } else {
        setActualizando(true);
      }

      setError("");

      try {
        const resultado = await cargarIndicadores({
          fechaInicio: fechaInicio.trim() || null,
          fechaFin: fechaFin.trim() || null,
        });

        if (!resultado.correcto) {
          setDatos(null);
          setError(
            resultado.mensaje ||
              "No fue posible cargar los indicadores."
          );
          return;
        }

        setDatos(resultado.datos);
      } catch (e) {
        console.error("Error al cargar indicadores:", e);

        setDatos(null);
        setError(
          e?.message ||
            "Ocurrió un error al consultar los indicadores."
        );
      } finally {
        setCargando(false);
        setActualizando(false);
      }
    },
    [fechaInicio, fechaFin]
  );

  useEffect(() => {
    consultarDatos(true);
  }, []);

  // ----------------------------------------------------------
  // CALENDARIO
  // ----------------------------------------------------------

  const abrirCalendario = (campo) => {
    setCampoFechaActivo(campo);
    setMostrarCalendario(true);
  };

  const seleccionarFecha = (evento, fechaSeleccionada) => {
    setMostrarCalendario(false);

    if (evento?.type === "dismissed" || !fechaSeleccionada) {
      return;
    }

    const fechaISO = fechaLocalISO(fechaSeleccionada);

    if (campoFechaActivo === "inicio") {
      setFechaInicio(fechaISO);
    } else if (campoFechaActivo === "fin") {
      setFechaFin(fechaISO);
    }

    setCampoFechaActivo(null);
  };

  // ----------------------------------------------------------
  // FILTROS
  // ----------------------------------------------------------

  const aplicarFiltros = () => {
    if (fechaInicio && fechaFin && fechaInicio > fechaFin) {
      Alert.alert(
        "Periodo inválido",
        "La fecha de inicio no puede ser posterior a la fecha de fin."
      );
      return;
    }

    consultarDatos(true);
  };

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
  };

  // ----------------------------------------------------------
  // EXPORTAR PDF
  // ----------------------------------------------------------

  const exportarPDF = async () => {
    if (!datos) {
      Alert.alert(
        "Sin información",
        "Primero debes cargar los indicadores."
      );
      return;
    }

    try {
      setExportandoPDF(true);

      const html = generarHTMLIndicadores(
        datos,
        fechaInicio,
        fechaFin
      );

      if (Platform.OS === "web") {
        const ventana = window.open("", "_blank");

        if (!ventana) {
          throw new Error(
            "El navegador bloqueó la ventana del reporte. Permite las ventanas emergentes e inténtalo nuevamente."
          );
        }

        ventana.document.open();
        ventana.document.write(html);
        ventana.document.close();
        ventana.focus();

        ventana.onload = () => {
          ventana.focus();
          ventana.print();
        };

        return;
      }

      const archivo = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (!archivo?.uri) {
        throw new Error("No se pudo generar el archivo PDF.");
      }

      const puedeCompartir = await Sharing.isAvailableAsync();

      if (!puedeCompartir) {
        Alert.alert(
          "PDF generado",
          `El documento se generó correctamente en: ${archivo.uri}`
        );
        return;
      }

      await Sharing.shareAsync(archivo.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Compartir reporte completo de indicadores",
        UTI: "com.adobe.pdf",
      });
    } catch (e) {
      console.error("Error al exportar indicadores PDF:", e);

      Alert.alert(
        "Error al exportar",
        e?.message || "No fue posible generar el reporte PDF."
      );
    } finally {
      setExportandoPDF(false);
    }
  };

  // ----------------------------------------------------------
  // DATOS DE SUPABASE
  // ----------------------------------------------------------

  const atenciones = datos?.atenciones || {};
  const actividades = datos?.actividades || {};
  const seguimiento = datos?.seguimiento || {};
  const mascotas = datos?.mascotas || {};
  const usuarios = datos?.usuarios || {};

  // ==========================================================
  // RENDERIZADO
  // ==========================================================

  return (
    <View style={styles.contenedor}>
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={() => setMenuVisible(true)}
      />

      <MenuLateralDerecho
        visible={menuVisible}
        onCerrar={() => setMenuVisible(false)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        refreshControl={
          <RefreshControl
            refreshing={actualizando}
            onRefresh={() => consultarDatos(false)}
            colors={["#1976D2"]}
          />
        }
      >
        {/* ENCABEZADO Y RUTA */}

        <View style={styles.encabezadoPagina}>
          <View style={styles.rutaNavegacion}>
            <TouchableOpacity
              onPress={() => router.replace("/inicio")}
              activeOpacity={0.7}
            >
              <Text style={styles.textoRutaInicio}>Inicio</Text>
            </TouchableOpacity>

            <Text style={styles.separadorRuta}>›</Text>

            <Text style={styles.textoRutaActual}>
              Indicadores históricos
            </Text>
          </View>

          <View style={styles.filaTitulo}>
            <TouchableOpacity
              style={styles.botonVolver}
              onPress={() => router.back()}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Text style={styles.textoVolver}>‹</Text>
            </TouchableOpacity>

            <View style={styles.contenedorTitulo}>
              <Text style={styles.tituloPagina}>
                Indicadores históricos
              </Text>

              <Text style={styles.subtituloPagina}>
                Resumen estadístico de la gestión veterinaria.
              </Text>
            </View>
          </View>
        </View>

        {/* FILTROS */}

        <View style={styles.tarjetaFiltros}>
          <Text style={styles.tituloFiltros}>
            Filtrar por periodo
          </Text>

          <Text style={styles.descripcionFiltros}>
            Selecciona las fechas para consultar las estadísticas.
          </Text>

          <Text style={styles.etiquetaCampo}>Fecha de inicio</Text>

          <View style={styles.filaFecha}>
            <TextInput
              style={styles.campoFecha}
              value={fechaInicio}
              onChangeText={setFechaInicio}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#9CA3AF"
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.botonCalendario}
              onPress={() => abrirCalendario("inicio")}
              activeOpacity={0.75}
              accessibilityLabel="Seleccionar fecha de inicio"
            >
              <Text style={styles.iconoCalendario}>▦</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.etiquetaCampo}>Fecha de fin</Text>

          <View style={styles.filaFecha}>
            <TextInput
              style={styles.campoFecha}
              value={fechaFin}
              onChangeText={setFechaFin}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#9CA3AF"
              keyboardType="numbers-and-punctuation"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={styles.botonCalendario}
              onPress={() => abrirCalendario("fin")}
              activeOpacity={0.75}
              accessibilityLabel="Seleccionar fecha de fin"
            >
              <Text style={styles.iconoCalendario}>▦</Text>
            </TouchableOpacity>
          </View>

          {mostrarCalendario && Platform.OS !== "web" && (
            <DateTimePicker
              value={convertirFecha(
                campoFechaActivo === "inicio"
                  ? fechaInicio
                  : fechaFin
              )}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={
                campoFechaActivo === "inicio" && fechaFin
                  ? convertirFecha(fechaFin)
                  : undefined
              }
              minimumDate={
                campoFechaActivo === "fin" && fechaInicio
                  ? convertirFecha(fechaInicio)
                  : undefined
              }
              onChange={seleccionarFecha}
            />
          )}

          {Platform.OS === "web" && (
            <Text style={styles.avisoCalendarioWeb}>
              En la versión web puedes escribir la fecha con formato AAAA-MM-DD.
            </Text>
          )}

          <View style={styles.filaBotones}>
            <TouchableOpacity
              style={styles.botonBuscar}
              onPress={aplicarFiltros}
              disabled={cargando || actualizando || exportandoPDF}
            >
              <Text style={styles.textoBotonBuscar}>
                Aplicar filtros
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.botonLimpiar}
              onPress={limpiarFiltros}
              disabled={cargando || actualizando || exportandoPDF}
            >
              <Text style={styles.textoBotonLimpiar}>
                Limpiar
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.textoPeriodo}>
            Periodo: {formatearFecha(fechaInicio)} al{" "}
            {formatearFecha(fechaFin)}
          </Text>
        </View>

        {/* CARGANDO */}

        {cargando && (
          <View style={styles.estadoCarga}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.textoCarga}>
              Consultando indicadores...
            </Text>
          </View>
        )}

        {/* ERROR */}

        {!cargando && !!error && (
          <View style={styles.tarjetaError}>
            <Text style={styles.tituloError}>
              No se pudieron cargar los indicadores
            </Text>

            <Text style={styles.textoError}>{error}</Text>

            <TouchableOpacity
              style={styles.botonReintentar}
              onPress={() => consultarDatos(true)}
            >
              <Text style={styles.textoBotonReintentar}>
                Reintentar
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* RESULTADOS */}

        {!cargando && !error && datos && (
          <>
            <SeccionIndicadores
              titulo="Atenciones"
              descripcion="Resumen de las atenciones veterinarias registradas."
            >
              <View style={styles.grilla}>
                <TarjetaIndicador
                  titulo="Total"
                  valor={atenciones.total}
                  descripcion="Atenciones registradas"
                  icono="📋"
                  color="#1976D2"
                />

                <TarjetaIndicador
                  titulo="Activas"
                  valor={atenciones.activas}
                  descripcion="En atención"
                  icono="🩺"
                  color="#2196A5"
                />

                <TarjetaIndicador
                  titulo="Finalizadas"
                  valor={atenciones.finalizadas}
                  descripcion="Atenciones concluidas"
                  icono="✓"
                  color="#2E9D62"
                />
              </View>

              <DesgloseIndicadores
                titulo="Atenciones por estado"
                datos={atenciones.por_estado}
                color="#1976D2"
              />
            </SeccionIndicadores>

            <SeccionIndicadores
              titulo="Actividades"
              descripcion="Estado de las actividades realizadas y programadas."
            >
              <View style={styles.grilla}>
                <TarjetaIndicador
                  titulo="Total"
                  valor={actividades.total}
                  icono="📝"
                  color="#1976D2"
                />

                <TarjetaIndicador
                  titulo="Pendientes"
                  valor={actividades.pendientes}
                  icono="⏳"
                  color="#E5A323"
                />

                <TarjetaIndicador
                  titulo="Completadas"
                  valor={actividades.completadas}
                  icono="✓"
                  color="#2E9D62"
                />

                <TarjetaIndicador
                  titulo="No realizadas"
                  valor={actividades.no_realizadas}
                  icono="!"
                  color="#D9534F"
                />
              </View>

              <DesgloseIndicadores
                titulo="Actividades por estado"
                datos={actividades.por_estado}
                color="#E5A323"
              />

              <DesgloseIndicadores
                titulo="Actividades por tipo"
                datos={actividades.por_tipo}
                color="#1976D2"
              />
            </SeccionIndicadores>

            <SeccionIndicadores
              titulo="Seguimiento"
              descripcion="Control de actividades pendientes y fechas de cumplimiento."
            >
              <View style={styles.grilla}>
                <TarjetaIndicador
                  titulo="Pendientes"
                  valor={seguimiento.pendientes}
                  icono="⏳"
                  color="#E5A323"
                />

                <TarjetaIndicador
                  titulo="Completadas"
                  valor={seguimiento.completadas}
                  icono="✓"
                  color="#2E9D62"
                />

                <TarjetaIndicador
                  titulo="No realizadas"
                  valor={seguimiento.no_realizadas}
                  icono="!"
                  color="#D9534F"
                />

                <TarjetaIndicador
                  titulo="Vencidas"
                  valor={seguimiento.vencidas}
                  icono="⚠"
                  color="#C0392B"
                />

                <TarjetaIndicador
                  titulo="Por vencer"
                  valor={seguimiento.por_vencer}
                  icono="📅"
                  color="#8E6BBE"
                />
              </View>
            </SeccionIndicadores>

            <SeccionIndicadores
              titulo="Mascotas"
              descripcion="Resumen de las mascotas registradas en el sistema."
            >
              <View style={styles.grilla}>
                <TarjetaIndicador
                  titulo="Total"
                  valor={mascotas.total}
                  icono="🐾"
                  color="#1976D2"
                />

                <TarjetaIndicador
                  titulo="Activas"
                  valor={mascotas.activas}
                  icono="✓"
                  color="#2E9D62"
                />

                <TarjetaIndicador
                  titulo="Inactivas"
                  valor={mascotas.inactivas}
                  icono="—"
                  color="#9CA3AF"
                />
              </View>

              <DesgloseIndicadores
                titulo="Mascotas por especie"
                datos={mascotas.por_especie}
                color="#2196A5"
              />
            </SeccionIndicadores>

            <SeccionIndicadores
              titulo="Usuarios"
              descripcion="Resumen de las cuentas registradas en PetCare."
            >
              <View style={styles.grilla}>
                <TarjetaIndicador
                  titulo="Total"
                  valor={usuarios.total}
                  icono="👥"
                  color="#1976D2"
                />

                <TarjetaIndicador
                  titulo="Activos"
                  valor={usuarios.activos}
                  icono="✓"
                  color="#2E9D62"
                />

                <TarjetaIndicador
                  titulo="Inactivos"
                  valor={usuarios.inactivos}
                  icono="—"
                  color="#9CA3AF"
                />

                <TarjetaIndicador
                  titulo="Administradores"
                  valor={usuarios.administradores}
                  icono="🛡"
                  color="#8E6BBE"
                />

                <TarjetaIndicador
                  titulo="Asistentes"
                  valor={usuarios.asistentes}
                  icono="👤"
                  color="#2196A5"
                />
              </View>

              <DesgloseIndicadores
                titulo="Usuarios por rol"
                datos={usuarios.por_rol}
                color="#8E6BBE"
              />
            </SeccionIndicadores>

            <View style={styles.pieIndicadores}>
              <Text style={styles.pieTitulo}>
                Información de consulta
              </Text>

              <Text style={styles.pieTexto}>
                Los datos se obtienen directamente de Supabase
                mediante la función segura de indicadores.
              </Text>

              <Text style={styles.pieTexto}>
                Último periodo consultado:{" "}
                {formatearFecha(datos.filtros?.fecha_inicio || fechaInicio)}{" "}
                al{" "}
                {formatearFecha(datos.filtros?.fecha_fin || fechaFin)}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.botonPDF,
                exportandoPDF && styles.botonPDFDeshabilitado,
              ]}
              onPress={exportarPDF}
              disabled={exportandoPDF}
            >
              {exportandoPDF ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.iconoPDF}>PDF</Text>
              )}

              <Text style={styles.textoBotonPDF}>
                {exportandoPDF
                  ? "Preparando reporte..."
                  : "Exportar reporte completo a PDF"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {!cargando && !error && !datos && (
          <View style={styles.tarjetaVacia}>
            <Text style={styles.textoVacio}>
              No hay información disponible para mostrar.
            </Text>
          </View>
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
    backgroundColor: "#F3F6FA",
  },

  scroll: {
    flex: 1,
  },

  contenido: {
    padding: 18,
    paddingBottom: 35,
  },

  encabezadoPagina: {
    marginBottom: 22,
  },

  rutaNavegacion: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 17,
    gap: 8,
  },

  textoRutaInicio: {
    color: "#1976D2",
    fontSize: 13,
    fontWeight: "700",
  },

  separadorRuta: {
    color: "#9AA8B7",
    fontSize: 19,
    fontWeight: "600",
  },

  textoRutaActual: {
    color: "#758397",
    fontSize: 13,
    fontWeight: "600",
  },

  filaTitulo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  botonVolver: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: "#E3EDF7",
    borderWidth: 1,
    borderColor: "#D3E1EF",
    alignItems: "center",
    justifyContent: "center",
  },

  textoVolver: {
    color: "#245B91",
    fontSize: 32,
    fontWeight: "500",
    lineHeight: 36,
    marginTop: -3,
  },

  contenedorTitulo: {
    flex: 1,
  },

  tituloPagina: {
    fontSize: 25,
    fontWeight: "800",
    color: "#17324D",
    marginBottom: 5,
  },

  subtituloPagina: {
    color: "#68788A",
    fontSize: 14,
    lineHeight: 21,
  },

  tarjetaFiltros: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 17,
    marginBottom: 22,
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  tituloFiltros: {
    fontSize: 17,
    fontWeight: "800",
    color: "#17324D",
    marginBottom: 5,
  },

  descripcionFiltros: {
    color: "#788797",
    fontSize: 12,
    marginBottom: 16,
  },

  etiquetaCampo: {
    color: "#46566A",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },

  filaFecha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 13,
  },

  campoFecha: {
    flex: 1,
    height: 45,
    borderWidth: 1,
    borderColor: "#D8E0EA",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    color: "#263849",
    fontSize: 14,
  },

  botonCalendario: {
    width: 48,
    height: 45,
    borderRadius: 8,
    backgroundColor: "#E5EDF7",
    borderWidth: 1,
    borderColor: "#D3E1EF",
    alignItems: "center",
    justifyContent: "center",
  },

  iconoCalendario: {
    color: "#245B91",
    fontSize: 25,
    fontWeight: "700",
  },

  avisoCalendarioWeb: {
    color: "#788797",
    fontSize: 11,
    marginBottom: 10,
  },

  filaBotones: {
    flexDirection: "row",
    gap: 10,
    marginTop: 5,
  },

  botonBuscar: {
    flex: 1,
    backgroundColor: "#1976D2",
    minHeight: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  textoBotonBuscar: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  botonLimpiar: {
    paddingHorizontal: 18,
    minHeight: 44,
    backgroundColor: "#E9EEF4",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  textoBotonLimpiar: {
    color: "#40536A",
    fontWeight: "700",
    fontSize: 14,
  },

  textoPeriodo: {
    marginTop: 13,
    fontSize: 12,
    color: "#788797",
  },

  estadoCarga: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 35,
  },

  textoCarga: {
    color: "#68788A",
    fontSize: 14,
    marginTop: 12,
  },

  tarjetaError: {
    backgroundColor: "#FFF1F0",
    borderColor: "#F1C4C0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 17,
    marginBottom: 20,
  },

  tituloError: {
    color: "#A93226",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 8,
  },

  textoError: {
    color: "#7B3933",
    fontSize: 13,
    lineHeight: 20,
  },

  botonReintentar: {
    alignSelf: "flex-start",
    backgroundColor: "#C0392B",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 13,
  },

  textoBotonReintentar: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  seccion: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 17,
    marginBottom: 19,
    borderWidth: 1,
    borderColor: "#E5EAF0",
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  seccionEncabezado: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDF3",
    paddingBottom: 12,
  },

  seccionTitulo: {
    color: "#17324D",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 5,
  },

  seccionDescripcion: {
    color: "#788797",
    fontSize: 12,
    lineHeight: 18,
  },

  grilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 11,
  },

  tarjetaIndicador: {
    flexGrow: 1,
    flexBasis: "45%",
    minWidth: 135,
    backgroundColor: "#F9FBFD",
    borderWidth: 1,
    borderColor: "#E4EAF1",
    borderLeftWidth: 4,
    borderRadius: 11,
    padding: 13,
    minHeight: 112,
  },

  tarjetaEncabezado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 9,
  },

  tarjetaIcono: {
    fontSize: 17,
  },

  tarjetaTitulo: {
    flex: 1,
    color: "#627286",
    fontSize: 12,
    fontWeight: "700",
  },

  tarjetaValor: {
    color: "#17324D",
    fontSize: 27,
    fontWeight: "900",
  },

  tarjetaDescripcion: {
    color: "#8995A4",
    fontSize: 11,
    marginTop: 4,
  },

  desglose: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#E8EDF3",
  },

  desgloseTitulo: {
    color: "#34495E",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 15,
  },

  barraContenedor: {
    marginBottom: 14,
  },

  barraInformacion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },

  barraEtiqueta: {
    color: "#526579",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  barraValor: {
    color: "#17324D",
    fontSize: 12,
    fontWeight: "800",
  },

  barraFondo: {
    height: 9,
    backgroundColor: "#E9EEF4",
    borderRadius: 10,
    overflow: "hidden",
  },

  barraProgreso: {
    height: "100%",
    borderRadius: 10,
  },

  sinDesglose: {
    padding: 15,
    backgroundColor: "#F7F9FC",
    borderRadius: 9,
    marginTop: 12,
  },

  textoSinDesglose: {
    color: "#8995A4",
    fontSize: 12,
    textAlign: "center",
  },

  pieIndicadores: {
    backgroundColor: "#EAF2FA",
    borderRadius: 12,
    padding: 16,
    marginTop: 5,
  },

  pieTitulo: {
    color: "#245B91",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8,
  },

  pieTexto: {
    color: "#526579",
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 5,
  },

  botonPDF: {
    marginTop: 22,
    marginBottom: 15,
    minHeight: 52,
    borderRadius: 9,
    backgroundColor: "#C0392B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 12,
  },

  botonPDFDeshabilitado: {
    backgroundColor: "#AEB8C2",
  },

  iconoPDF: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  textoBotonPDF: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  tarjetaVacia: {
    padding: 25,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    alignItems: "center",
  },

  textoVacio: {
    color: "#788797",
    fontSize: 14,
    textAlign: "center",
  },
});
