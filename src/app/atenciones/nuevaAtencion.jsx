
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import {
  consultarMascotasParaAtencion,
  consultarAtencionActivaPorMascota,
  registrarAtencion,
} from '../../dao/atencionesDAO';

import { supabase } from '../../services/supabase';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import { logger } from '../../utils/logger';

const C = {
  fondo: '#F4F8F7',
  verde: '#12665E',
  oscuro: '#104F49',
  claro: '#E6F4EF',
  texto: '#243746',
  secundario: '#718096',
  blanco: '#FFFFFF',
  borde: '#E0EAE7',
  rojo: '#B42318',
  fondoError: '#FEF3F2',
  bordeError: '#FDA29B',
  fondoExito: '#ECFDF3',
};

function propietarioDe(mascota) {
  const relacion = mascota?.propietarios;
  return Array.isArray(relacion) ? relacion[0] : relacion;
}

function nombrePropietario(mascota) {
  const propietario = propietarioDe(mascota);

  return [propietario?.nombre, propietario?.apellido]
    .filter((parte) => String(parte ?? '').trim())
    .join(' ');
}

/**
 * Limita el número de dígitos y permite un solo separador decimal.
 * Peso: máximo 6 enteros y 2 decimales.
 * Temperatura: máximo 2 enteros y 1 decimal.
 */
function limitarDecimal(valor, maxEnteros, maxDecimales) {
  let texto = String(valor ?? '').replace(',', '.');
  texto = texto.replace(/[^\d.]/g, '');

  const primerPunto = texto.indexOf('.');

  if (primerPunto !== -1) {
    texto =
      texto.slice(0, primerPunto + 1) +
      texto.slice(primerPunto + 1).replace(/\./g, '');
  }

  const partes = texto.split('.');
  const enteros = partes[0].slice(0, maxEnteros);

  if (partes.length === 1) {
    return enteros;
  }

  const decimales = (partes[1] ?? '').slice(0, maxDecimales);

  return `${enteros}.${decimales}`;
}

function validarMedida(valor, nombre, minimo, maximo) {
  const texto = String(valor ?? '').trim().replace(',', '.');

  if (!texto) {
    return `${nombre} es obligatorio.`;
  }

  if (!/^\d+(\.\d+)?$/.test(texto)) {
    return `${nombre} debe ser un número válido.`;
  }

  const numero = Number(texto);

  if (!Number.isFinite(numero) || numero < minimo || numero > maximo) {
    return `${nombre} debe estar entre ${minimo} y ${maximo}.`;
  }

  return null;
}

export default function NuevaAtencionScreen() {
  const scrollRef = useRef(null);
  const formularioRef = useRef(null);

  const [mascotas, setMascotas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState(null);

  const [motivo, setMotivo] = useState('');
  const [peso, setPeso] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [prediagnostico, setPrediagnostico] = useState('');

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [nombreUsuario, setNombreUsuario] = useState('');
  const [rolUsuario, setRolUsuario] = useState('');

  // Los errores de validación se muestran dentro de la pantalla.
  const [mensajeInline, setMensajeInline] = useState(null);

  // El modal se reserva para confirmación, atención existente y resultado.
  const [modal, setModal] = useState({
    visible: false,
    tipo: 'info',
    pregunta: '',
    titulo: '',
    mensaje: '',
    acciones: [],
  });

  function mostrarMensaje(texto, tipo = 'error') {
    setMensajeInline({ texto, tipo });

    // Lleva la pantalla hasta el inicio del formulario.
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  }

  function limpiarMensaje() {
    setMensajeInline(null);
  }

  function mostrarModal({
    tipo = 'info',
    pregunta = '',
    titulo = '',
    mensaje = '',
    acciones = [],
  }) {
    setModal({
      visible: true,
      tipo,
      pregunta,
      titulo,
      mensaje,
      acciones,
    });
  }

  function cerrarModal() {
    setModal((actual) => ({
      ...actual,
      visible: false,
      acciones: [],
    }));
  }

  useEffect(() => {
    let activo = true;

    async function cargar() {
      try {
        const [listaMascotas, resultadoUsuario] = await Promise.all([
          consultarMascotasParaAtencion(),
          supabase.auth.getUser(),
        ]);

        if (resultadoUsuario.error) {
          throw resultadoUsuario.error;
        }

        if (activo) {
          setMascotas(listaMascotas);

          const usuario = resultadoUsuario.data?.user;

          setNombreUsuario(
            usuario?.user_metadata?.nombre ||
              usuario?.user_metadata?.full_name ||
              usuario?.email ||
              ''
          );

          setRolUsuario(usuario?.user_metadata?.rol || '');
        }
      } catch (error) {
        logger.error('Error cargando Nueva atención:', error);

        if (activo) {
          mostrarMensaje(
            error?.message || 'No se pudieron cargar las mascotas.',
            'error'
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargar();

    return () => {
      activo = false;
    };
  }, []);

  const mascotasFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase();

    if (!termino) {
      return mascotas;
    }

    return mascotas.filter((mascota) => {
      const propietario = nombrePropietario(mascota);

      return [
        mascota.nombre,
        mascota.raza,
        propietario,
        mascota.numero_historia,
      ].some((valor) =>
        String(valor ?? '').toLocaleLowerCase().includes(termino)
      );
    });
  }, [mascotas, busqueda]);

  function limpiarFormulario() {
    if (guardando) return;

    setSeleccionada(null);
    setMotivo('');
    setPeso('');
    setTemperatura('');
    setSintomas('');
    setPrediagnostico('');
    limpiarMensaje();
  }

  function abrirAtencion(atencionId) {
    cerrarModal();

    if (!atencionId) {
      mostrarMensaje(
        'No se pudo identificar la atención que debes consultar.',
        'error'
      );
      return;
    }

    router.replace({
      pathname: '/detalleAtencion',
      params: { atencion_id: String(atencionId) },
    });
  }

  function abrirAtencionRegistrada(atencionId) {
    cerrarModal();

    if (!atencionId) {
      mostrarMensaje(
        'La atención se registró, pero no se recibió su identificador.',
        'error'
      );
      return;
    }

    router.replace({
      pathname: '/detalleAtencion',
      params: { atencion_id: String(atencionId) },
    });
  }

  async function registrarConfirmado() {
    if (guardando) return;

    cerrarModal();
    setGuardando(true);
    limpiarMensaje();

    try {
      const resultado = await registrarAtencion({
        numero_historia: seleccionada.numero_historia,
        motivo_consulta: motivo.trim(),
        peso: peso.trim(),
        temperatura: temperatura.trim(),
        sintomas: sintomas.trim(),

        // El prediagnóstico no es obligatorio.
        diagnostico: prediagnostico.trim() || null,
      });

      const atencionId = resultado?.atencion_id;

      if (!atencionId) {
        throw new Error(
          'No se recibió el identificador de la atención creada.'
        );
      }

      setGuardando(false);

      mostrarModal({
        tipo: 'exito',
        titulo: 'Atención registrada',
        mensaje: `La atención N.º ${atencionId} se registró correctamente para ${seleccionada.nombre}.`,
        acciones: [
          {
            texto: 'Aceptar',
            estilo: 'principal',
            onPress: () => abrirAtencionRegistrada(atencionId),
          },
        ],
      });
    } catch (error) {
      logger.error('Error registrando atención:', error);
      setGuardando(false);

      if (error?.code === 'ATENCION_ACTIVA_EXISTENTE') {
        const atencionId = error?.atencion?.atencion_id;

        mostrarModal({
          tipo: 'info',
          titulo: 'Atención activa existente',
          mensaje: atencionId
            ? `${seleccionada.nombre} ya tiene la atención N.º ${atencionId} activa. No se creará otra atención.`
            : `${seleccionada.nombre} ya tiene una atención activa. No se creará otra atención.`,
          acciones: [
            { texto: 'Cerrar', estilo: 'secundario' },
            ...(atencionId
              ? [
                  {
                    texto: 'Ver atención activa',
                    estilo: 'principal',
                    onPress: () => abrirAtencion(atencionId),
                  },
                ]
              : []),
          ],
        });

        return;
      }

      // Los errores relacionados con datos se muestran en la pantalla,
      // no en otro modal que interrumpa la corrección.
      mostrarMensaje(
        error?.message ||
          'Ocurrió un error al registrar la atención. Revisa los datos e inténtalo nuevamente.',
        'error'
      );
    }
  }

  async function guardar() {
    if (guardando) return;

    limpiarMensaje();

    if (!seleccionada?.numero_historia) {
      mostrarMensaje('Selecciona una mascota antes de continuar.');
      return;
    }

    if (!motivo.trim()) {
      mostrarMensaje('Ingresa el motivo de consulta antes de continuar.');
      return;
    }

    if (!sintomas.trim()) {
      mostrarMensaje('Ingresa los síntomas observados antes de continuar.');
      return;
    }

    const errorPeso = validarMedida(peso, 'El peso', 0.01, 500);

    if (errorPeso) {
      mostrarMensaje(errorPeso);
      return;
    }

    const errorTemperatura = validarMedida(
      temperatura,
      'La temperatura',
      25,
      45
    );

    if (errorTemperatura) {
      mostrarMensaje(errorTemperatura);
      return;
    }

    setGuardando(true);

    try {
      // Se conserva la verificación previa de atención activa.
      const activa = await consultarAtencionActivaPorMascota(
        seleccionada.numero_historia
      );

      setGuardando(false);

      if (activa) {
        mostrarModal({
          tipo: 'info',
          titulo: 'Atención activa existente',
          mensaje: `${seleccionada.nombre} ya tiene la atención N.º ${activa.atencion_id} activa. No se creará otra atención.`,
          acciones: [
            { texto: 'Cerrar', estilo: 'secundario' },
            {
              texto: 'Ver atención activa',
              estilo: 'principal',
              onPress: () => abrirAtencion(activa.atencion_id),
            },
          ],
        });

        return;
      }

      // La confirmación contiene únicamente la pregunta y los dos botones.
      mostrarModal({
        tipo: 'confirmacion',
        pregunta: `¿Deseas iniciar una atención para ${seleccionada.nombre}?`,
        acciones: [
          {
            texto: 'No, cancelar',
            estilo: 'secundario',
            onPress: cerrarModal,
          },
          {
            texto: 'Sí, registrar',
            estilo: 'principal',
            onPress: registrarConfirmado,
          },
        ],
      });
    } catch (error) {
      logger.error('Error verificando atención activa:', error);
      setGuardando(false);

      mostrarMensaje(
        error?.message ||
          'No se pudo comprobar si existe una atención activa. No se ha creado una nueva atención.',
        'error'
      );
    }
  }

  async function cerrarSesion() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setMenuAbierto(false);
      router.replace('/login');
    } catch (error) {
      mostrarMensaje(
        error?.message || 'No se pudo cerrar la sesión.',
        'error'
      );
    }
  }

  return (
    <SafeAreaView style={s.contenedor}>
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() =>
          mostrarModal({
            tipo: 'info',
            titulo: 'Notificaciones',
            mensaje: 'No tienes notificaciones nuevas.',
            acciones: [
              { texto: 'Entendido', estilo: 'principal' },
            ],
          })
        }
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.contenido}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={s.migas}
          onPress={() => router.replace('/atenciones')}
        >
          Atenciones / Nueva atención
        </Text>

        <View style={s.filaTitulo}>
          <Pressable
            style={s.botonRegresar}
            onPress={() => router.back()}
            disabled={guardando}
            accessibilityRole="button"
            accessibilityLabel="Regresar a la pantalla anterior"
          >
            <Text style={s.flechaRegresar}>‹</Text>
          </Pressable>

          <Text style={s.titulo}>Nueva atención</Text>
        </View>

        <Text style={s.subtitulo}>
          Registra el motivo de consulta, los síntomas y la evaluación
          clínica inicial de la mascota.
        </Text>

        {/* Mensaje visible en la pantalla; no abre un modal. */}
        {mensajeInline && (
          <View
            style={[
              s.mensajeInline,
              mensajeInline.tipo === 'error'
                ? s.mensajeInlineError
                : s.mensajeInlineExito,
            ]}
            accessibilityRole="alert"
          >
            <Text
              style={[
                s.mensajeInlineTexto,
                mensajeInline.tipo === 'error'
                  ? s.mensajeInlineTextoError
                  : s.mensajeInlineTextoExito,
              ]}
            >
              {mensajeInline.texto}
            </Text>
          </View>
        )}

        {!seleccionada ? (
          <View style={s.tarjeta}>
            <Text style={s.seccionTitulo}>
              Selecciona una mascota
            </Text>

            <TextInput
              value={busqueda}
              onChangeText={setBusqueda}
              placeholder="Buscar por mascota, propietario o raza"
              placeholderTextColor={C.secundario}
              style={[s.input, s.inputBusqueda]}
              accessibilityLabel="Buscar mascota, propietario o raza"
            />

            {cargando ? (
              <ActivityIndicator
                color={C.verde}
                style={s.cargando}
              />
            ) : mascotasFiltradas.length === 0 ? (
              <Text style={s.ayuda}>
                No se encontraron mascotas que coincidan con la búsqueda.
              </Text>
            ) : (
              mascotasFiltradas.map((mascota) => (
                <Pressable
                  key={mascota.numero_historia}
                  style={s.mascota}
                  onPress={() => {
                    setSeleccionada(mascota);
                    limpiarMensaje();
                  }}
                  accessibilityRole="button"
                >
                  <Text style={s.nombreMascota}>
                    {mascota.nombre}
                  </Text>

                  <Text style={s.ayuda}>
                    {[mascota.especie, mascota.raza]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>

                  <Text style={s.propietario}>
                    Propietario:{' '}
                    {nombrePropietario(mascota) || 'Sin información'}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <View ref={formularioRef} style={s.tarjeta}>
            <View style={s.cabeceraSeleccion}>
              <Text style={s.seccionTitulo}>
                Datos de la consulta
              </Text>

              <Pressable
                onPress={limpiarFormulario}
                disabled={guardando}
              >
                <Text style={s.cambiar}>Cambiar mascota</Text>
              </Pressable>
            </View>

            <View style={s.mascotaSeleccionada}>
              <Text style={s.nombreMascota}>
                {seleccionada.nombre}
              </Text>

              <Text style={s.ayuda}>
                {[seleccionada.especie, seleccionada.raza]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>

              <Text style={s.propietario}>
                Propietario:{' '}
                {nombrePropietario(seleccionada) || 'Sin información'}
              </Text>
            </View>

            <Text style={s.etiqueta}>
              Motivo de consulta *
            </Text>

            <TextInput
              value={motivo}
              onChangeText={setMotivo}
              placeholder="Describe el motivo de la consulta"
              placeholderTextColor={C.secundario}
              style={[s.input, s.multilinea]}
              multiline
              textAlignVertical="top"
              editable={!guardando}
            />

            <Text style={s.etiqueta}>Peso (kg) *</Text>

            <TextInput
              value={peso}
              onChangeText={(valor) =>
                setPeso(limitarDecimal(valor, 6, 2))
              }
              placeholder="Ej. 8.50"
              placeholderTextColor={C.secundario}
              style={s.input}
              keyboardType="decimal-pad"
              maxLength={9}
              editable={!guardando}
            />

            <Text style={s.ayuda}>
              Obligatorio. De 0.01 a 500 kg.
            </Text>

            <Text style={s.etiqueta}>
              Temperatura (°C) *
            </Text>

            <TextInput
              value={temperatura}
              onChangeText={(valor) =>
                setTemperatura(limitarDecimal(valor, 2, 1))
              }
              placeholder="Ej. 38.5"
              placeholderTextColor={C.secundario}
              style={s.input}
              keyboardType="decimal-pad"
              maxLength={4}
              editable={!guardando}
            />

            <Text style={s.ayuda}>
              Obligatoria. De 25 a 45 °C.
            </Text>

            <Text style={s.etiqueta}>
              Síntomas observados *
            </Text>

            <TextInput
              value={sintomas}
              onChangeText={setSintomas}
              placeholder="Describe los síntomas observados"
              placeholderTextColor={C.secundario}
              style={[s.input, s.multilinea]}
              multiline
              textAlignVertical="top"
              editable={!guardando}
            />

            <Text style={s.etiqueta}>
              Prediagnóstico (opcional)
            </Text>

            <TextInput
              value={prediagnostico}
              onChangeText={setPrediagnostico}
              placeholder="Puedes dejar este campo vacío"
              placeholderTextColor={C.secundario}
              style={[s.input, s.multilinea]}
              multiline
              textAlignVertical="top"
              editable={!guardando}
            />

            <Pressable
              style={[
                s.guardar,
                guardando && s.deshabilitado,
              ]}
              onPress={guardar}
              disabled={guardando}
              accessibilityRole="button"
            >
              {guardando ? (
                <ActivityIndicator color={C.blanco} />
              ) : (
                <Text style={s.guardarTexto}>
                  Iniciar atención
                </Text>
              )}
            </Pressable>

            <Pressable
              style={s.cancelar}
              onPress={() => {
                if (!guardando) router.back();
              }}
              disabled={guardando}
              accessibilityRole="button"
            >
              <Text style={s.cancelarTexto}>Cancelar</Text>
            </Pressable>
          </View>
        )}

        <Text style={s.pie}>
          PetCare · Seguimiento de atención veterinaria
        </Text>
      </ScrollView>

      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        nombreUsuario={nombreUsuario}
        rolUsuario={rolUsuario}
        onCerrarSesion={cerrarSesion}
      />

      <Modal
        visible={modal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={cerrarModal}
      >
        <View style={s.fondoModal}>
          <View style={s.tarjetaModal}>
            {modal.tipo === 'confirmacion' ? (
              <>
                {/* Confirmación: solo pregunta y botones. */}
                <Text style={s.preguntaModal}>
                  {modal.pregunta}
                </Text>

                <View style={s.accionesConfirmacion}>
                  {modal.acciones.map((accion, indice) => (
                    <Pressable
                      key={`${accion.texto}-${indice}`}
                      style={[
                        s.botonModal,
                        s.botonConfirmacion,
                        accion.estilo === 'principal' &&
                          s.botonModalPrincipal,
                        accion.estilo === 'secundario' &&
                          s.botonModalSecundario,
                      ]}
                      onPress={() => {
                        if (accion.onPress) {
                          accion.onPress();
                        } else {
                          cerrarModal();
                        }
                      }}
                      disabled={guardando}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          s.textoBotonModal,
                          accion.estilo === 'principal' &&
                            s.textoBotonPrincipal,
                          accion.estilo === 'secundario' &&
                            s.textoBotonSecundario,
                        ]}
                      >
                        {accion.texto}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <>
                <Text style={s.tituloModal}>
                  {modal.titulo}
                </Text>

                <Text style={s.mensajeModal}>
                  {modal.mensaje}
                </Text>

                <View style={s.accionesModal}>
                  {modal.acciones.map((accion, indice) => (
                    <Pressable
                      key={`${accion.texto}-${indice}`}
                      style={[
                        s.botonModal,
                        accion.estilo === 'principal' &&
                          s.botonModalPrincipal,
                        accion.estilo === 'secundario' &&
                          s.botonModalSecundario,
                      ]}
                      onPress={() => {
                        if (accion.onPress) {
                          accion.onPress();
                        } else {
                          cerrarModal();
                        }
                      }}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          s.textoBotonModal,
                          accion.estilo === 'principal' &&
                            s.textoBotonPrincipal,
                          accion.estilo === 'secundario' &&
                            s.textoBotonSecundario,
                        ]}
                      >
                        {accion.texto}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  contenido: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },

  migas: {
    color: C.verde,
    fontSize: 13,
    marginBottom: 18,
  },

  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },

  botonRegresar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.claro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  flechaRegresar: {
    color: C.verde,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '600',
    marginTop: -3,
  },

  titulo: {
    color: C.texto,
    fontSize: 26,
    fontWeight: '800',
  },

  subtitulo: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    marginBottom: 20,
  },

  mensajeInline: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },

  mensajeInlineError: {
    backgroundColor: C.fondoError,
    borderColor: C.bordeError,
  },

  mensajeInlineExito: {
    backgroundColor: C.fondoExito,
    borderColor: '#ABEFC6',
  },

  mensajeInlineTexto: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },

  mensajeInlineTextoError: {
    color: C.rojo,
  },

  mensajeInlineTextoExito: {
    color: C.oscuro,
  },

  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 18,
  },

  seccionTitulo: {
    color: C.oscuro,
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },

  input: {
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: C.texto,
    backgroundColor: C.blanco,
    fontSize: 14,
  },

  inputBusqueda: {
    marginTop: 14,
  },

  multilinea: {
    minHeight: 85,
    textAlignVertical: 'top',
  },

  cargando: {
    margin: 20,
  },

  ayuda: {
    color: C.secundario,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 5,
  },

  mascota: {
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    padding: 13,
    marginTop: 10,
  },

  mascotaSeleccionada: {
    backgroundColor: C.claro,
    borderRadius: 10,
    padding: 13,
    marginTop: 15,
  },

  nombreMascota: {
    color: C.oscuro,
    fontSize: 16,
    fontWeight: '800',
  },

  propietario: {
    color: C.texto,
    fontSize: 13,
    marginTop: 5,
  },

  cabeceraSeleccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  cambiar: {
    color: C.verde,
    fontSize: 12,
    fontWeight: '700',
  },

  etiqueta: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
  },

  guardar: {
    backgroundColor: C.verde,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
  },

  deshabilitado: {
    opacity: 0.65,
  },

  guardarTexto: {
    color: C.blanco,
    fontSize: 15,
    fontWeight: '700',
  },

  cancelar: {
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },

  cancelarTexto: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '600',
  },

  pie: {
    color: C.secundario,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 25,
  },

  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(16, 35, 40, 0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  tarjetaModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.blanco,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    elevation: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },

  preguntaModal: {
    color: C.oscuro,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '700',
    textAlign: 'center',
  },

  tituloModal: {
    color: C.oscuro,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },

  mensajeModal: {
    color: C.texto,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 12,
  },

  accionesConfirmacion: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 22,
  },

  accionesModal: {
    width: '100%',
    gap: 10,
    marginTop: 24,
  },

  botonModal: {
    minHeight: 46,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.borde,
  },

  botonConfirmacion: {
    flex: 1,
  },

  botonModalPrincipal: {
    backgroundColor: C.verde,
    borderColor: C.verde,
  },

  botonModalSecundario: {
    backgroundColor: C.blanco,
  },

  textoBotonModal: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  textoBotonPrincipal: {
    color: C.blanco,
  },

  textoBotonSecundario: {
    color: C.texto,
  },
});
