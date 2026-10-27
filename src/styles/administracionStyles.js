
import { StyleSheet } from 'react-native';

const C = {
  primario: '#187C72',
  primarioOscuro: '#12665E',
  fondo: '#F5F8F8',
  blanco: '#FFFFFF',
  texto: '#263238',
  textoSecundario: '#718096',
  borde: '#E2E8F0',
  sombra: '#000000',
  verdeClaro: '#E5F5F1',
  azulClaro: '#EAF2FF',
  naranjaClaro: '#FFF3E0',
  moradoClaro: '#F1EAFE',
};

export const administracionStyles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  contenido: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
  },

  // Navegación y encabezado
  ruta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
  },

  textoRuta: {
    fontSize: 13,
    color: C.textoSecundario,
  },

  separadorRuta: {
    marginHorizontal: 9,
    fontSize: 13,
    color: '#A0AEC0',
  },

  rutaActual: {
    color: C.primario,
    fontWeight: '600',
  },

  encabezado: {
    marginBottom: 24,
  },

  encabezadoSeccion: {
    marginBottom: 24,
  },

  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },

  titulo: {
    flex: 1,
    fontSize: 25,
    fontWeight: '700',
    color: C.texto,
  },

  tituloPagina: {
    fontSize: 26,
    fontWeight: '700',
    color: C.texto,
    marginBottom: 7,
  },

  subtitulo: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: C.textoSecundario,
  },

  subtituloPagina: {
    fontSize: 14,
    lineHeight: 21,
    color: C.textoSecundario,
  },

  iconoUsuario: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoIconoUsuario: {
    fontSize: 21,
  },

  // Secciones
  seccion: {
    marginTop: 8,
    marginBottom: 18,
  },

  tituloSeccion: {
    fontSize: 17,
    fontWeight: '700',
    color: C.texto,
    marginBottom: 12,
  },

  descripcionSeccion: {
    fontSize: 13,
    lineHeight: 19,
    color: C.textoSecundario,
  },

  etiquetaAdministracion: {
    color: C.primario,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },

  // Una sola columna para todas las tarjetas
  listaTarjetas: {
    flexDirection: 'column',
    width: '100%',
    alignItems: 'stretch',
    gap: 16,
  },

  // Tarjetas
  tarjeta: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: C.blanco,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: C.borde,
    shadowColor: C.sombra,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },

  encabezadoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  iconoContenedor: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  iconoTarjeta: {
    fontSize: 24,
    textAlign: 'center',
  },

  contenidoEncabezadoTarjeta: {
    flex: 1,
  },

  tituloTarjeta: {
    fontSize: 16,
    fontWeight: '700',
    color: C.texto,
    marginBottom: 5,
  },

  descripcionTarjeta: {
    fontSize: 13,
    lineHeight: 19,
    color: C.textoSecundario,
  },

  // Indicadores
  filaResumen: {
    flexDirection: 'row',
    width: '100%',
    gap: 8,
    marginBottom: 18,
  },

  indicadorResumen: {
    flex: 1,
    minWidth: 0,
    backgroundColor: C.fondo,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },

  indicadorResumenUnico: {
    flex: 1,
  },

  indicadorResumenDoble: {
    flex: 1,
  },

  indicadorResumenTriple: {
    flex: 1,
  },

  numeroTotal: {
    fontSize: 23,
    fontWeight: '700',
    color: C.primario,
    textAlign: 'center',
  },

  etiquetaResumen: {
    fontSize: 11,
    color: C.textoSecundario,
    textAlign: 'center',
    marginTop: 5,
  },

  // Botón
  boton: {
    minHeight: 46,
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.primario,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  botonDeshabilitado: {
    opacity: 0.55,
  },

  textoBoton: {
    flex: 1,
    color: C.blanco,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },

  flechaBoton: {
    fontSize: 22,
    fontWeight: '600',
    color: C.blanco,
  },

  // Estilos auxiliares existentes
  filaTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoUsuarios: {
    backgroundColor: C.azulClaro,
  },

  iconoMascotas: {
    backgroundColor: C.verdeClaro,
  },

  iconoPropietarios: {
    backgroundColor: C.naranjaClaro,
  },

  emojiTarjeta: {
    fontSize: 24,
  },

  informacionTarjeta: {
    flex: 1,
  },

  indicador: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 8,
    borderRadius: 17,
    backgroundColor: C.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  textoIndicador: {
    fontSize: 14,
    fontWeight: '700',
    color: C.primario,
  },

  pieTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 17,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: '#EDF1F2',
  },

  textoAccion: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primario,
  },

  flechaAccion: {
    fontSize: 20,
    color: C.primario,
  },

  mensajeVacio: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoVacio: {
    fontSize: 14,
    color: C.textoSecundario,
    textAlign: 'center',
  },

  separacion: {
    height: 16,
  },
});

export default administracionStyles;
