import { StyleSheet } from 'react-native';

const mascotaStyles = StyleSheet.create({
  // CONTENEDOR GENERAL
  contenedor: {
    flex: 1,
    backgroundColor: '#F5F8F7',
  },

  contenido: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },

  // ENCABEZADO
  encabezado: {
    marginBottom: 24,
  },

  titulo: {
    fontSize: 25,
    fontWeight: '700',
    color: '#12645C',
    marginBottom: 6,
  },

  subtitulo: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 21,
  },

  textoSeccion: {
    fontSize: 18,
    fontWeight: '700',
    color: '#263B39',
    marginBottom: 14,
  },

  // BÚSQUEDA Y FILTROS
  contenedorBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE6E3',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
    minHeight: 48,
  },

  iconoBusqueda: {
    fontSize: 18,
    color: '#64748B',
    marginRight: 10,
  },

  inputBusqueda: {
    flex: 1,
    fontSize: 14,
    color: '#263B39',
    paddingVertical: 12,
  },

  // LISTADO DE MASCOTAS
  lista: {
    paddingBottom: 20,
  },

  tarjetaMascota: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2EBE8',
    elevation: 2,
    shadowColor: '#173B36',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },

  encabezadoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  avatarMascota: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E1F2EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  iconoMascota: {
    fontSize: 25,
  },

  informacionMascota: {
    flex: 1,
  },

  nombreMascota: {
    fontSize: 17,
    fontWeight: '700',
    color: '#263B39',
    marginBottom: 4,
  },

  textoSecundario: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },

  numeroHistoria: {
    fontSize: 12,
    fontWeight: '600',
    color: '#187C72',
    marginTop: 3,
  },

  separador: {
    height: 1,
    backgroundColor: '#E8EFED',
    marginVertical: 12,
  },

  filaInformacion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  etiquetaInformacion: {
    width: 112,
    fontSize: 13,
    color: '#64748B',
  },

  valorInformacion: {
    flex: 1,
    fontSize: 13,
    color: '#263B39',
    fontWeight: '500',
  },

  // ESTADOS
  etiquetaEstado: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#E1F2EE',
  },

  textoEstado: {
    fontSize: 11,
    fontWeight: '700',
    color: '#12645C',
  },

  etiquetaInactiva: {
    backgroundColor: '#F1F5F9',
  },

  textoEstadoInactivo: {
    color: '#64748B',
  },

  // BOTONES
  botonPrimario: {
    minHeight: 48,
    backgroundColor: '#187C72',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  textoBotonPrimario: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  botonSecundario: {
    minHeight: 46,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#187C72',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoBotonSecundario: {
    color: '#187C72',
    fontSize: 14,
    fontWeight: '700',
  },

  botonPeligro: {
    minHeight: 44,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoBotonPeligro: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },

  filaBotones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },

  botonFlexible: {
    flex: 1,
  },

  // FORMULARIO
  formulario: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2EBE8',
    marginBottom: 20,
  },

  encabezadoFormulario: {
    marginBottom: 22,
  },

  tituloFormulario: {
    fontSize: 21,
    fontWeight: '700',
    color: '#12645C',
    marginBottom: 6,
  },

  subtituloFormulario: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
  },

  grupoCampo: {
    marginBottom: 18,
  },

  etiquetaCampo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334A46',
    marginBottom: 8,
  },

  indicadorObligatorio: {
    color: '#DC2626',
    fontWeight: '700',
  },

  input: {
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5E1DD',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: '#263B39',
  },

  inputMultilinea: {
    minHeight: 85,
    textAlignVertical: 'top',
  },

  inputDeshabilitado: {
    backgroundColor: '#F1F5F4',
    color: '#64748B',
  },

  textoAyuda: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 18,
  },

  textoErrorCampo: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 6,
  },

  // SELECTORES HORIZONTALES
  contenedorOpciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  opcion: {
    minHeight: 42,
    flexGrow: 1,
    flexBasis: '30%',
    borderWidth: 1,
    borderColor: '#D5E1DD',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  opcionSeleccionada: {
    backgroundColor: '#E1F2EE',
    borderColor: '#187C72',
    borderWidth: 1.5,
  },

  textoOpcion: {
    fontSize: 12,
    color: '#526662',
    fontWeight: '500',
    textAlign: 'center',
  },

  textoOpcionSeleccionada: {
    color: '#12645C',
    fontWeight: '700',
  },

  // PROPIETARIO
  contenedorPropietario: {
    borderWidth: 1,
    borderColor: '#D5E1DD',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },

  opcionPropietario: {
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EFED',
  },

  nombrePropietario: {
    fontSize: 14,
    fontWeight: '600',
    color: '#263B39',
  },

  documentoPropietario: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },

  propietarioSeleccionado: {
    backgroundColor: '#E1F2EE',
    borderColor: '#187C72',
    borderWidth: 1,
    borderRadius: 10,
    padding: 13,
  },

  textoPropietarioSeleccionado: {
    fontSize: 14,
    fontWeight: '600',
    color: '#12645C',
  },

  // FECHA DE NACIMIENTO Y EDAD
  filaFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  inputFecha: {
    flex: 1,
  },

  botonCalendario: {
    minHeight: 48,
    minWidth: 48,
    borderRadius: 10,
    backgroundColor: '#E1F2EE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  textoCalendario: {
    fontSize: 20,
    color: '#12645C',
  },

  tarjetaEdad: {
    backgroundColor: '#F0F8F6',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },

  etiquetaEdad: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },

  valorEdad: {
    fontSize: 14,
    color: '#12645C',
    fontWeight: '700',
  },

  // DETALLE DE MASCOTA
  tarjetaDetalle: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2EBE8',
    marginBottom: 20,
  },

  encabezadoDetalle: {
    alignItems: 'center',
    marginBottom: 20,
  },

  avatarDetalle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: '#E1F2EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  iconoDetalle: {
    fontSize: 40,
  },

  nombreDetalle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#12645C',
    textAlign: 'center',
    marginBottom: 5,
  },

  subtituloDetalle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },

  // CARGA, LISTA VACÍA Y MENSAJES
  contenedorCentrado: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 35,
    paddingHorizontal: 20,
  },

  textoCargando: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },

  tituloVacio: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334A46',
    textAlign: 'center',
    marginBottom: 8,
  },

  textoVacio: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },

  mensaje: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },

  mensajeError: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  textoMensajeError: {
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 19,
  },

  mensajeExito: {
    backgroundColor: '#E1F2EE',
    borderWidth: 1,
    borderColor: '#B8E3D9',
  },

  textoMensajeExito: {
    fontSize: 13,
    color: '#12645C',
    lineHeight: 19,
  },

  // CONFIRMACIÓN DE OPERACIÓN EXITOSA
  contenedorExito: {
    flex: 1,
    backgroundColor: '#F5F8F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  tarjetaExito: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2EBE8',
  },

  iconoExito: {
    fontSize: 52,
    color: '#187C72',
    marginBottom: 14,
  },

  tituloExito: {
    fontSize: 22,
    fontWeight: '700',
    color: '#12645C',
    textAlign: 'center',
    marginBottom: 8,
  },

  textoExito: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  inputError: {
  borderColor: '#DC2626',
},

filaInformacion: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginTop: 10,
},
});

export default mascotaStyles;