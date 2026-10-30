
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import FormularioPropietario from './formularioPropietario';
import { registrarPropietario } from '../../dao/propietarioDAO';
import { logger } from '../../utils/logger';

const C = {
  primario: '#187C72',
  texto: '#253746',
  secundario: '#64748B',
  borde: '#DCE4E8',
  fondo: '#F5F8FA',
  blanco: '#FFFFFF',
  error: '#C62828',
};

const DATOS_INICIALES = {
  nombre: '',
  apellido: '',
  documento_identidad: '',
  telefono: '',
  correo: '',
  direccion: '',
  observaciones: '',
};

export default function RegistrarPropietario({
  onCancelar,
  onVolver,
  onRegistrado,
}) {
  const [datos, setDatos] = useState(DATOS_INICIALES);
  const [errores, setErrores] = useState({});
  const [campoConError, setCampoConError] = useState('');
  const [mensajeGeneral, setMensajeGeneral] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [modalConfirmacion, setModalConfirmacion] = useState(false);

  // Actualiza el dato y elimina el error del campo que se está corrigiendo.
  const actualizarCampo = (campo, valor) => {
    setDatos((actuales) => ({
      ...actuales,
      [campo]: valor,
    }));

    setErrores((actuales) => ({
      ...actuales,
      [campo]: '',
    }));

    setCampoConError((actual) => (
      actual === campo ? '' : actual
    ));

    setMensajeGeneral('');
  };

  // Valida los datos antes de solicitar confirmación.
  const validarFormulario = () => {
    const nuevosErrores = {};

    const nombre = datos.nombre.trim();
    const apellido = datos.apellido.trim();
    const dni = datos.documento_identidad.trim();
    const telefono = datos.telefono.trim().replace(/\s+/g, '');
    const correo = datos.correo.trim().toLowerCase();

    const obligatorios = {
      nombre,
      apellido,
      documento_identidad: dni,
      telefono,
      correo,
    };

    Object.entries(obligatorios).forEach(([campo, valor]) => {
      if (!valor) {
        nuevosErrores[campo] = 'Este campo es obligatorio.';
      }
    });

    if (dni && !/^\d{8}$/.test(dni)) {
      nuevosErrores.documento_identidad =
        'Verifique el formato del DNI ingresado.';
    }

    const telefonoNormalizado = telefono.replace(/^\+51/, '');

    if (telefono && !/^9\d{8}$/.test(telefonoNormalizado)) {
      nuevosErrores.telefono =
        'Verifique el formato de los datos ingresados.';
    }

    if (
      correo &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)
    ) {
      nuevosErrores.correo =
        'Verifique el formato del correo electrónico ingresado.';
    }

    const orden = [
      'nombre',
      'apellido',
      'documento_identidad',
      'telefono',
      'correo',
    ];

    const primerError = orden.find((campo) => nuevosErrores[campo]) || '';

    setErrores(nuevosErrores);
    setCampoConError(primerError);

    if (Object.keys(nuevosErrores).length > 0) {
      setMensajeGeneral(
        'Complete los campos obligatorios para continuar.'
      );
      return false;
    }

    setMensajeGeneral('');
    return true;
  };

  const revisarDatos = () => {
    if (validarFormulario()) {
      setModalConfirmacion(true);
    }
  };

  // Convierte errores de Supabase/DAO en mensajes para el usuario.
  const obtenerMensajeError = (error) => {
    if (
      error?.code === 'DUPLICADO_DNI' ||
      error?.campo === 'documento_identidad'
    ) {
      return 'El DNI ya está registrado. Ingrese otro DNI antes de continuar.';
    }

    if (
      error?.code === 'DUPLICADO_CORREO' ||
      error?.campo === 'correo'
    ) {
      return 'El correo electrónico ya se encuentra registrado';
    }

    return 'No se pudo registrar al propietario. Intente nuevamente.';
  };

  // Registra después de que el usuario confirme.
  const confirmarRegistro = async () => {
    if (guardando) return;

    setGuardando(true);
    setMensajeGeneral('');

    try {
      const datosLimpios = {
        ...datos,
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        documento_identidad: datos.documento_identidad.trim(),
        telefono: datos.telefono.trim().replace(/\s+/g, ''),
        correo: datos.correo.trim().toLowerCase(),
        direccion: datos.direccion.trim(),
        observaciones: datos.observaciones.trim(),
      };

      const propietario = await registrarPropietario(datosLimpios);

      setModalConfirmacion(false);
      setDatos(DATOS_INICIALES);
      setErrores({});
      setCampoConError('');

      // Regresa al listado; el padre mostrará el mensaje verde.
      if (onRegistrado) {
        onRegistrado(propietario || datosLimpios);
      }
    } catch (error) {
      logger.error('Error al registrar propietario:', error);

      setModalConfirmacion(false);

      if (
        error?.code === 'DUPLICADO_DNI' ||
        error?.campo === 'documento_identidad'
      ) {
        const mensaje =
          'El DNI ya está registrado. Ingrese otro DNI antes de continuar.';

        setErrores((actuales) => ({
          ...actuales,
          documento_identidad: mensaje,
        }));

        setCampoConError('documento_identidad');
        setMensajeGeneral(mensaje);
      } else if (
        error?.code === 'DUPLICADO_CORREO' ||
        error?.campo === 'correo'
      ) {
        const mensaje =
          'El correo electrónico ya se encuentra registrado';

        setErrores((actuales) => ({
          ...actuales,
          correo: mensaje,
        }));

        setCampoConError('correo');
        setMensajeGeneral(mensaje);
      } else {
        setMensajeGeneral(obtenerMensajeError(error));
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <View style={estilos.contenedor}>
      {mensajeGeneral !== '' && (
        <View
          style={[
            estilos.alerta,
            campoConError === 'documento_identidad' ||
            campoConError === 'correo'
              ? estilos.alertaError
              : estilos.alertaInformativa,
          ]}
        >
          <Text style={estilos.textoAlerta}>{mensajeGeneral}</Text>
        </View>
      )}

      <FormularioPropietario
        datos={datos}
        actualizarCampo={actualizarCampo}
        errores={errores}
        campoConError={campoConError}
        mensajeGeneral={mensajeGeneral}
        guardando={guardando}
        onCancelar={onCancelar || onVolver}
        onContinuar={revisarDatos}
      />

      {guardando && (
        <View style={estilos.capaCarga}>
          <ActivityIndicator size="large" color={C.primario} />
          <Text style={estilos.textoCarga}>
            Registrando propietario...
          </Text>
        </View>
      )}

      {/* Confirmación previa al registro. */}
      <Modal
        visible={modalConfirmacion}
        transparent
        animationType="fade"
        onRequestClose={() => setModalConfirmacion(false)}
      >
        <View style={estilos.fondoModal}>
          <View style={estilos.modal}>
            <Text style={estilos.tituloModal}>
              Confirmar registro
            </Text>

            <Text style={estilos.descripcionModal}>
              ¿Desea registrar al propietario con los siguientes datos?
            </Text>

            <ScrollView
              style={estilos.datosConfirmacion}
              showsVerticalScrollIndicator={false}
            >
              <FilaResumen etiqueta="Nombres" valor={datos.nombre} />
              <FilaResumen etiqueta="Apellidos" valor={datos.apellido} />
              <FilaResumen
                etiqueta="DNI"
                valor={datos.documento_identidad}
              />
              <FilaResumen etiqueta="Celular" valor={datos.telefono} />
              <FilaResumen etiqueta="Correo" valor={datos.correo} />
              <FilaResumen
                etiqueta="Dirección"
                valor={datos.direccion || 'No especificada'}
              />
              <FilaResumen
                etiqueta="Observaciones"
                valor={datos.observaciones || 'Sin observaciones'}
              />
            </ScrollView>

            <View style={estilos.botonesModal}>
              <TouchableOpacity
                style={[estilos.botonModal, estilos.botonSecundario]}
                onPress={() => setModalConfirmacion(false)}
                disabled={guardando}
              >
                <Text style={estilos.textoSecundario}>
                  Volver a editar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[estilos.botonModal, estilos.botonPrincipal]}
                onPress={confirmarRegistro}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoPrincipal}>
                    Confirmar y guardar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FilaResumen({ etiqueta, valor }) {
  return (
    <View style={estilos.filaResumen}>
      <Text style={estilos.etiquetaFila}>{etiqueta}</Text>
      <Text style={estilos.valorFila}>{valor || '—'}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  alerta: {
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 9,
    borderWidth: 1,
  },
  alertaError: {
    backgroundColor: '#FFF1F0',
    borderColor: '#F2B8B5',
  },
  alertaInformativa: {
    backgroundColor: '#F1F7F6',
    borderColor: '#CDE5E1',
  },
  textoAlerta: {
    color: C.error,
    fontSize: 13,
    lineHeight: 19,
  },
  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modal: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    backgroundColor: C.blanco,
    borderRadius: 16,
    padding: 22,
  },
  tituloModal: {
    fontSize: 21,
    fontWeight: '700',
    color: C.texto,
    marginBottom: 8,
  },
  descripcionModal: {
    fontSize: 14,
    color: C.secundario,
    lineHeight: 21,
    marginBottom: 14,
  },
  datosConfirmacion: {
    flexGrow: 0,
    marginBottom: 18,
  },
  filaResumen: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F3',
  },
  etiquetaFila: {
    fontSize: 12,
    color: C.secundario,
    marginBottom: 4,
  },
  valorFila: {
    fontSize: 14,
    color: C.texto,
    fontWeight: '600',
  },
  botonesModal: {
    flexDirection: 'row',
    gap: 10,
  },
  botonModal: {
    flex: 1,
    minHeight: 46,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  botonSecundario: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
  },
  textoSecundario: {
    color: C.texto,
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  botonPrincipal: {
    backgroundColor: C.primario,
  },
  textoPrincipal: {
    color: C.blanco,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  capaCarga: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoCarga: {
    marginTop: 12,
    color: C.texto,
    fontWeight: '600',
  },
});
