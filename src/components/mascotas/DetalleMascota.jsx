
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Colores utilizados en la interfaz de PetCare.
const C = {
  primario: '#187C72',
  primarioClaro: '#E4F3F0',
  fondo: '#F5F8F8',
  blanco: '#FFFFFF',
  texto: '#243746',
  secundario: '#64748B',
  borde: '#DCE5E5',
  verde: '#25834B',
  verdeFondo: '#E8F6EC',
  rojo: '#B42318',
  rojoFondo: '#FEF3F2',
};

// Evita mostrar valores vacíos en la ficha.
function mostrarDato(valor) {
  if (
    valor === null ||
    valor === undefined ||
    String(valor).trim() === ''
  ) {
    return 'No registrado';
  }

  return String(valor);
}

// Convierte fechas YYYY-MM-DD a formato peruano.
function formatearFecha(fecha) {
  if (!fecha) return 'No registrado';

  const textoFecha = String(fecha).slice(0, 10);
  const partes = textoFecha.split('-');

  // Evita problemas de zona horaria al mostrar la fecha.
  if (
    partes.length === 3 &&
    partes[0].length === 4
  ) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  const fechaConvertida = new Date(fecha);

  if (Number.isNaN(fechaConvertida.getTime())) {
    return 'No registrado';
  }

  return fechaConvertida.toLocaleDateString('es-PE');
}

// Obtiene el nombre completo del propietario relacionado.
function obtenerNombrePropietario(mascota) {
  const propietario = mascota?.propietarios;

  if (!propietario) {
    return 'Propietario no registrado';
  }

  const nombreCompleto = [
    propietario.nombre,
    propietario.apellido,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return nombreCompleto || 'Propietario no registrado';
}

// Componente de detalle de una mascota.
// Recibe la mascota ya consultada por la pantalla padre.
export default function DetalleMascota({
  mascota = null,
  cargando = false,
  error = '',
  onVolver,
  onEditar,
  onReintentar,
}) {
  // Muestra el indicador mientras se obtiene la información.
  if (cargando) {
    return (
      <View style={styles.estadoContenedor}>
        <ActivityIndicator size="large" color={C.primario} />
        <Text style={styles.estadoTexto}>
          Cargando información de la mascota...
        </Text>
      </View>
    );
  }

  // Muestra el error si la consulta no se pudo completar.
  if (error) {
    return (
      <View style={styles.estadoContenedor}>
        <Text style={styles.iconoEstado}>!</Text>

        <Text style={styles.tituloEstado}>
          No se pudo cargar la mascota
        </Text>

        <Text style={styles.estadoTexto}>
          {error}
        </Text>

        <View style={styles.botonesEstado}>
          <TouchableOpacity
            style={styles.botonSecundario}
            onPress={onVolver}
          >
            <Text style={styles.textoBotonSecundario}>
              Volver
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botonPrincipal}
            onPress={onReintentar}
          >
            <Text style={styles.textoBotonPrincipal}>
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Controla el caso en que no se encuentre el registro.
  if (!mascota) {
    return (
      <View style={styles.estadoContenedor}>
        <Text style={styles.iconoEstado}>🐾</Text>

        <Text style={styles.tituloEstado}>
          Mascota no encontrada
        </Text>

        <Text style={styles.estadoTexto}>
          No se encontró información para mostrar.
        </Text>

        <TouchableOpacity
          style={styles.botonPrincipal}
          onPress={onVolver}
        >
          <Text style={styles.textoBotonPrincipal}>
            Volver a mascotas
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Normaliza el estado de la mascota para mostrarlo.
  const estado = String(mascota.estado ?? 'Activo')
    .trim()
    .toLowerCase();

  const mascotaActiva = ![
    'inactivo',
    'inactiva',
    'desactivado',
    'desactivada',
  ].includes(estado);

  // Agrupa los campos de la ficha.
  const datosGenerales = [
    ['Número de historia clínica', mascota.numero_historia],
    ['Nombre', mascota.nombre],
    ['Especie', mascota.especie],
    ['Raza', mascota.raza],
    ['Sexo', mascota.sexo],
    [
      'Fecha de nacimiento',
      formatearFecha(mascota.fecha_nacimiento),
    ],
    ['Color', mascota.color],
    ['Estado de esterilización', mascota.estado_esterilizacion],
  ];

  const datosAdicionales = [
    ['Propietario asociado', obtenerNombrePropietario(mascota)],
    ['Observaciones', mascota.observaciones],
  ];

  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
      showsVerticalScrollIndicator={false}
    >
      {/* Ruta de navegación. */}
      <Text style={styles.migas}>
        Inicio  /  Mascotas  /  Detalle de mascota
      </Text>

      {/* Encabezado de la pantalla. */}
      <View style={styles.encabezado}>
        <TouchableOpacity
          style={styles.botonVolverIcono}
          onPress={onVolver}
          accessibilityLabel="Volver a la ficha de la mascota"
        >
          <Text style={styles.flechaVolver}>‹</Text>
        </TouchableOpacity>

        <View style={styles.encabezadoTexto}>
          <Text style={styles.titulo}>
            Detalle de mascota
          </Text>

          <Text style={styles.subtitulo}>
            Consulta la información registrada.
          </Text>
        </View>
      </View>

      {/* Resumen principal de la mascota. */}
      <View style={styles.tarjetaPrincipal}>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>🐾</Text>
        </View>

        <View style={styles.resumenTexto}>
          <Text style={styles.nombre}>
            {mostrarDato(mascota.nombre)}
          </Text>

          <Text style={styles.historia}>
            Historia clínica: {mostrarDato(mascota.numero_historia)}
          </Text>

          <Text style={styles.especie}>
            {[
              mascota.especie,
              mascota.raza,
            ]
              .filter(Boolean)
              .join(' · ') || 'Especie no registrada'}
          </Text>

          <View
            style={[
              styles.etiquetaEstado,
              mascotaActiva
                ? styles.etiquetaActiva
                : styles.etiquetaInactiva,
            ]}
          >
            <View
              style={[
                styles.puntoEstado,
                {
                  backgroundColor: mascotaActiva
                    ? C.verde
                    : C.rojo,
                },
              ]}
            />

            <Text
              style={[
                styles.textoEstado,
                {
                  color: mascotaActiva
                    ? C.verde
                    : C.rojo,
                },
              ]}
            >
              {mascotaActiva ? 'Activa' : 'Inactiva'}
            </Text>
          </View>
        </View>
      </View>

      {/* Información general. */}
      <View style={styles.tarjeta}>
        <Text style={styles.tituloSeccion}>
          Información general
        </Text>

        {datosGenerales.map(([etiqueta, valor]) => (
          <View key={etiqueta} style={styles.fila}>
            <Text style={styles.etiqueta}>
              {etiqueta}
            </Text>

            <Text style={styles.valor}>
              {mostrarDato(valor)}
            </Text>
          </View>
        ))}
      </View>

      {/* Propietario y observaciones. */}
      <View style={styles.tarjeta}>
        <Text style={styles.tituloSeccion}>
          Información adicional
        </Text>

        {datosAdicionales.map(([etiqueta, valor]) => (
          <View key={etiqueta} style={styles.fila}>
            <Text style={styles.etiqueta}>
              {etiqueta}
            </Text>

            <Text style={styles.valor}>
              {mostrarDato(valor)}
            </Text>
          </View>
        ))}
      </View>

      {/* Acciones disponibles para la ficha. */}
      <View style={styles.botones}>
        <TouchableOpacity
          style={styles.botonSecundario}
          onPress={onVolver}
          accessibilityRole="button"
        >
          <Text style={styles.textoBotonSecundario}>
            Volver
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botonPrincipal}
          onPress={onEditar}
          accessibilityRole="button"
        >
          <Text style={styles.textoBotonPrincipal}>
            Editar mascota
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  contenido: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 35,
  },

  migas: {
    color: C.secundario,
    fontSize: 12,
    marginBottom: 20,
  },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },

  botonVolverIcono: {
    width: 42,
    height: 42,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  flechaVolver: {
    color: C.primario,
    fontSize: 30,
    lineHeight: 34,
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

  tarjetaPrincipal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 15,
    padding: 17,
    marginBottom: 15,
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 17,
    backgroundColor: C.primarioClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarTexto: {
    fontSize: 27,
  },

  resumenTexto: {
    flex: 1,
    minWidth: 0,
  },

  nombre: {
    color: C.texto,
    fontSize: 19,
    fontWeight: '800',
  },

  historia: {
    color: C.primario,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },

  especie: {
    color: C.secundario,
    fontSize: 13,
    marginTop: 6,
  },

  etiquetaEstado: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 10,
  },

  etiquetaActiva: {
    backgroundColor: C.verdeFondo,
  },

  etiquetaInactiva: {
    backgroundColor: C.rojoFondo,
  },

  puntoEstado: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  textoEstado: {
    fontSize: 11,
    fontWeight: '800',
  },

  tarjeta: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 15,
  },

  tituloSeccion: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
    paddingVertical: 12,
  },

  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EDF1F1',
  },

  etiqueta: {
    flex: 0.9,
    color: C.secundario,
    fontSize: 12,
  },

  valor: {
    flex: 1.1,
    color: C.texto,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },

  botones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },

  botonSecundario: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  textoBotonSecundario: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
  },

  botonPrincipal: {
    flex: 1.3,
    minHeight: 46,
    backgroundColor: C.primario,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  textoBotonPrincipal: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },

  estadoContenedor: {
    flex: 1,
    backgroundColor: C.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 25,
  },

  iconoEstado: {
    color: C.primario,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 10,
  },

  tituloEstado: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },

  estadoTexto: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },

  botonesEstado: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
});
