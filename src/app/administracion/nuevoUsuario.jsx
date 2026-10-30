import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../services/supabase';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import { gestionarRegistroUsuario } from '../../services/administracion/gestionRegistroUsuario';
import { logger } from '../../utils/logger';

const C = {
  primario: '#187C72',
  primarioOscuro: '#12645C',
  texto: '#263238',
  secundario: '#718096',
  fondo: '#F5F8F8',
  blanco: '#FFFFFF',
  borde: '#E2E8F0',
  rojo: '#C0392B',
  rojoFondo: '#FDECEC',
  verdeClaro: '#E5F5F1',
  verde: '#16805D',
  verdeFondo: '#EAF8F0',
};

const FORMULARIO_INICIAL = {
  nombres: '',
  apellidos: '',
  dni: '',
  correo: '',
  telefono: '',
  direccion: '',
  contrasena: '',
  confirmarContrasena: '',
  rol: 'Asistente',
};

export default function NuevoUsuario() {
  const scrollRef = useRef(null);
  const posicionesCampos = useRef({});

  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmacionContrasena, setMostrarConfirmacionContrasena] =
    useState(false);
  const [modalConfirmacionVisible, setModalConfirmacionVisible] =
    useState(false);
  const [registroExitoso, setRegistroExitoso] = useState(false);
  const [usuarioRegistrado, setUsuarioRegistrado] = useState(null);

  const actualizarCampo = (campo, valor) => {
    setFormulario((actual) => ({ ...actual, [campo]: valor }));
    setErrores((actual) => ({ ...actual, [campo]: '', general: '' }));
    setErrorGeneral('');
  };

  const registrarPosicion = (campo, evento) => {
    posicionesCampos.current[campo] = evento.nativeEvent.layout.y;
  };

  const irAlCampo = (campo) => {
    const posicion = posicionesCampos.current[campo];
    if (typeof posicion === 'number') {
      scrollRef.current?.scrollTo({
        y: Math.max(0, posicion - 24),
        animated: true,
      });
    }
  };

  const mostrarErrores = (nuevosErrores) => {
    setErrores(nuevosErrores);
    const ordenCampos = [
      'nombres',
      'apellidos',
      'dni',
      'correo',
      'telefono',
      'rol',
      'contrasena',
      'confirmarContrasena',
      'general',
    ];
    const primerCampo = ordenCampos.find((campo) =>
      Boolean(nuevosErrores[campo])
    );
    if (primerCampo) {
      requestAnimationFrame(() => irAlCampo(primerCampo));
    }
  };

  const validarFormulario = () => {
    const e = {};
    const {
      nombres,
      apellidos,
      dni,
      correo,
      telefono,
      contrasena,
      confirmarContrasena,
      rol,
    } = formulario;

    if (!nombres.trim()) e.nombres = 'Ingresa los nombres del usuario.';
    if (!apellidos.trim()) e.apellidos = 'Ingresa los apellidos del usuario.';

    if (!dni.trim()) {
      e.dni = 'Ingresa el DNI del usuario.';
    } else if (!/^\d{8}$/.test(dni.trim())) {
      e.dni = 'El DNI debe contener exactamente 8 dígitos.';
    }

    if (!correo.trim()) {
      e.correo = 'Ingresa el correo electrónico.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      e.correo = 'Ingresa un correo electrónico válido.';
    }

    if (telefono.trim() && !/^9\d{8}$/.test(telefono.trim())) {
      e.telefono = 'El celular debe tener 9 dígitos y comenzar con 9.';
    }

    if (!rol || !['Administrador', 'Asistente'].includes(rol)) {
      e.rol = 'Selecciona un rol válido.';
    }

    if (!contrasena) {
      e.contrasena = 'Ingresa una contraseña.';
    } else if (contrasena.length < 8) {
      e.contrasena = 'La contraseña debe tener al menos 8 caracteres.';
    }

    if (!confirmarContrasena) {
      e.confirmarContrasena = 'Confirma la contraseña.';
    } else if (contrasena !== confirmarContrasena) {
      e.confirmarContrasena = 'Las contraseñas no coinciden.';
    }

    if (Object.keys(e).length > 0) {
      mostrarErrores(e);
      return false;
    }

    setErrores({});
    setErrorGeneral('');
    return true;
  };

  const interpretarErrorServidor = (error, data) => {
    const mensaje = String(
      data?.mensaje || data?.message || error?.message || ''
    ).toLowerCase();
    const codigo = String(data?.code || error?.code || '').toUpperCase();

    if (
      codigo === 'EMAIL_EXISTS' ||
      codigo === 'USER_ALREADY_EXISTS' ||
      mensaje.includes('email_exists') ||
      mensaje.includes('already registered') ||
      mensaje.includes('already been registered') ||
      (mensaje.includes('correo') && mensaje.includes('registrado')) ||
      mensaje.includes('user already registered')
    ) {
      return { correo: 'El correo electrónico ya se encuentra registrado.' };
    }

    if (
      mensaje.includes('dni') &&
      (mensaje.includes('duplicate') ||
        mensaje.includes('registrado') ||
        mensaje.includes('exists') ||
        mensaje.includes('ya existe'))
    ) {
      return { dni: 'El DNI ya se encuentra registrado.' };
    }

    return {
      general:
        data?.mensaje ||
        'No se pudo completar el registro. Verifica los datos e inténtalo nuevamente.',
    };
  };

  // El botón del formulario solo valida y abre el modal. Todavía no guarda.
  const registrarUsuario = () => {
    if (cargando || registroExitoso) return;
    if (!validarFormulario()) return;
    setModalConfirmacionVisible(true);
  };

  // Esta función solo se ejecuta al pulsar "Sí, registrar" en el modal.
    // RF44 - CP01–CP05: registro integrado con el servicio de negocio.
  // CP06 se bloquea en validarFormulario antes de abrir la confirmación.
  const confirmarRegistro = async () => {
    if (cargando) return;

    setModalConfirmacionVisible(false);
    setCargando(true);
    setErrorGeneral('');
    setErrores({});

    try {
      // ARRANGE: comprobar que existe una sesión válida.
      const {
        data: { user },
        error: errorSesion,
      } = await supabase.auth.getUser();

      if (errorSesion) throw errorSesion;

      if (!user) {
        setErrorGeneral(
          'Tu sesión ha expirado. Inicia sesión nuevamente.'
        );
        router.replace('/');
        return;
      }

      // ARRANGE: comprobar que el usuario es Administrador activo.
      const { data: perfil, error: errorPerfil } = await supabase
        .from('perfiles')
        .select('rol, estado_cuenta')
        .eq('perfil_id', user.id)
        .single();

      if (errorPerfil) throw errorPerfil;

      if (
        perfil?.rol !== 'Administrador' ||
        perfil?.estado_cuenta !== 'Activo'
      ) {
        const mensaje = 'No tienes permisos para registrar usuarios.';
        mostrarErrores({ general: mensaje });
        setErrorGeneral(mensaje);
        return;
      }

      // ACT: delegar validación y coordinación al servicio RF44.
      const resultado = await gestionarRegistroUsuario(
        formulario,
        async (datos) => {
          // ACT: mantener el registro seguro en la Edge Function.
          const { data, error } = await supabase.functions.invoke(
            'administrar-usuarios',
            {
              body: {
                accion: 'crear',
                ...datos,
              },
            }
          );

          // ASSERT: una respuesta incompleta o con error no es éxito.
          if (error || !data?.usuario) {
            logger.error('Respuesta del registro:', data);
            logger.error('Error del registro:', error?.message);

            return {
              error,
              mensaje:
                data?.mensaje ||
                data?.message ||
                error?.message ||
                '',
              code: data?.code || error?.code || '',
            };
          }

          return { usuario: data.usuario };
        }
      );

      // ASSERT: mostrar los errores de validación o del servidor.
      if (!resultado.ok) {
        if (resultado.errores) {
          mostrarErrores(resultado.errores);
        }

        if (resultado.mensaje) {
          setErrorGeneral(resultado.mensaje);
          mostrarErrores({ general: resultado.mensaje });
        }

        return;
      }

      // ASSERT: solo mostrar éxito cuando el servicio lo confirme.
      setUsuarioRegistrado({
        nombres: formulario.nombres.trim(),
        apellidos: formulario.apellidos.trim(),
        dni: formulario.dni.trim(),
        correo: formulario.correo.trim().toLowerCase(),
        telefono: formulario.telefono.trim(),
        direccion: formulario.direccion.trim(),
        rol: formulario.rol,
      });

      setRegistroExitoso(true);
    } catch (error) {
      logger.error('Error al registrar usuario:', error);

      const mensaje =
        'No se pudo verificar el registro. Inténtalo nuevamente.';

      setErrorGeneral(mensaje);
      mostrarErrores({ general: mensaje });
    } finally {
      setCargando(false);
    }
  };

  const volver = () => {
    if (!cargando) router.back();
  };

  const campoTexto = (etiqueta, campo, opciones = {}) => (
    <View
      style={styles.grupoCampo}
      key={campo}
      onLayout={(evento) => registrarPosicion(campo, evento)}
    >
      <Text style={styles.etiqueta}>
        {etiqueta}
        {opciones.obligatorio ? (
          <Text style={styles.asterisco}> *</Text>
        ) : (
          <Text style={styles.opcional}> (opcional)</Text>
        )}
      </Text>

      <TextInput
        style={[styles.entrada, errores[campo] && styles.entradaError]}
        value={formulario[campo]}
        onChangeText={(valor) => actualizarCampo(campo, valor)}
        placeholder={
          opciones.placeholder || `Ingrese ${etiqueta.toLowerCase()}`
        }
        placeholderTextColor="#94A3B8"
        keyboardType={opciones.keyboardType || 'default'}
        autoCapitalize={opciones.autoCapitalize || 'sentences'}
        autoCorrect={false}
        editable={!cargando}
        maxLength={opciones.maxLength}
      />

      {!!errores[campo] && (
        <Text style={styles.textoError}>⚠ {errores[campo]}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.pantalla}>
      <StatusBar barStyle="dark-content" backgroundColor={C.blanco} />

      <EncabezadoPetCare
        onAbrirMenu={() => {}}
        onAbrirNotificaciones={() => {}}
      />

      <KeyboardAvoidingView
        style={styles.contenedorTeclado}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
        >
          {registroExitoso && usuarioRegistrado ? (
            <View style={styles.tarjetaExito}>
              <View style={styles.iconoExito}>
                <Text style={styles.textoIconoExito}>✓</Text>
              </View>

              <Text style={styles.tituloExito}>Registro exitoso</Text>
              <Text style={styles.mensajeExito}>
                Los datos del usuario se registraron correctamente.
              </Text>

              <View style={styles.resumenUsuario}>
                <Text style={styles.tituloResumen}>
                  Resumen del usuario agregado
                </Text>

                <View style={styles.filaResumen}>
                  <Text style={styles.etiquetaResumen}>Nombres y apellidos</Text>
                  <Text style={styles.valorResumen}>
                    {usuarioRegistrado.nombres} {usuarioRegistrado.apellidos}
                  </Text>
                </View>

                <View style={styles.filaResumen}>
                  <Text style={styles.etiquetaResumen}>DNI</Text>
                  <Text style={styles.valorResumen}>{usuarioRegistrado.dni}</Text>
                </View>

                <View style={styles.filaResumen}>
                  <Text style={styles.etiquetaResumen}>Correo electrónico</Text>
                  <Text style={styles.valorResumen}>
                    {usuarioRegistrado.correo}
                  </Text>
                </View>

                <View style={styles.filaResumen}>
                  <Text style={styles.etiquetaResumen}>Rol</Text>
                  <Text style={styles.valorResumen}>{usuarioRegistrado.rol}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.botonContinuar}
                onPress={() =>
                  router.replace('/administracion/gestionUsuario')
                }
                activeOpacity={0.8}
              >
                <Text style={styles.textoBotonContinuar}>
                  Continuar a Gestión de usuarios
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.ruta}>
                <TouchableOpacity onPress={() => router.replace('/inicio')}>
                  <Text style={styles.enlaceRuta}>Inicio</Text>
                </TouchableOpacity>
                <Text style={styles.separador}> / </Text>
                <TouchableOpacity
                  onPress={() =>
                    router.replace('/administracion/gestionUsuario')
                  }
                >
                  <Text style={styles.enlaceRuta}>Gestión de usuarios</Text>
                </TouchableOpacity>
                <Text style={styles.separador}> / </Text>
                <Text style={styles.rutaActual}>Registro</Text>
              </View>

              <View style={styles.encabezado}>
                <Text style={styles.titulo}>Registrar nuevo usuario</Text>
                <Text style={styles.descripcion}>
                  Registra una cuenta para el personal de la veterinaria.
                  Los campos marcados con * son obligatorios.
                </Text>
              </View>

              <View style={styles.tarjeta}>
                <Text style={styles.tituloSeccion}>Información personal</Text>

                {campoTexto('Nombres', 'nombres', { obligatorio: true })}
                {campoTexto('Apellidos', 'apellidos', { obligatorio: true })}
                {campoTexto('DNI', 'dni', {
                  obligatorio: true,
                  placeholder: 'Ingrese los 8 dígitos del DNI',
                  keyboardType: 'numeric',
                  autoCapitalize: 'none',
                  maxLength: 8,
                })}
                {campoTexto('Correo electrónico', 'correo', {
                  obligatorio: true,
                  placeholder: 'ejemplo@correo.com',
                  keyboardType: 'email-address',
                  autoCapitalize: 'none',
                })}
                {campoTexto('Celular', 'telefono', {
                  placeholder: 'Ejemplo: 987654321',
                  keyboardType: 'phone-pad',
                  autoCapitalize: 'none',
                  maxLength: 9,
                })}
                {campoTexto('Dirección', 'direccion', {
                  autoCapitalize: 'sentences',
                })}
              </View>

              <View style={styles.tarjeta}>
                <Text style={styles.tituloSeccion}>Acceso al sistema</Text>

                <View
                  style={styles.grupoCampo}
                  onLayout={(evento) => registrarPosicion('rol', evento)}
                >
                  <Text style={styles.etiqueta}>
                    Rol <Text style={styles.asterisco}>*</Text>
                  </Text>

                  <View style={styles.roles}>
                    {['Asistente', 'Administrador'].map((rol) => {
                      const seleccionado = formulario.rol === rol;
                      return (
                        <TouchableOpacity
                          key={rol}
                          style={[
                            styles.opcionRol,
                            seleccionado && styles.opcionRolSeleccionada,
                            errores.rol && styles.entradaError,
                          ]}
                          onPress={() => actualizarCampo('rol', rol)}
                          disabled={cargando}
                        >
                          <Text
                            style={[
                              styles.textoRol,
                              seleccionado && styles.textoRolSeleccionado,
                            ]}
                          >
                            {seleccionado ? '● ' : '○ '}
                            {rol}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {!!errores.rol && (
                    <Text style={styles.textoError}>⚠ {errores.rol}</Text>
                  )}
                </View>

                <View
                  style={styles.grupoCampo}
                  onLayout={(evento) =>
                    registrarPosicion('contrasena', evento)
                  }
                >
                  <Text style={styles.etiqueta}>
                    Contraseña <Text style={styles.asterisco}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.contenedorContrasena,
                      errores.contrasena && styles.entradaError,
                    ]}
                  >
                    <TextInput
                      style={styles.entradaContrasena}
                      value={formulario.contrasena}
                      onChangeText={(valor) =>
                        actualizarCampo('contrasena', valor)
                      }
                      placeholder="Mínimo 8 caracteres"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!mostrarContrasena}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!cargando}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setMostrarContrasena((actual) => !actual)
                      }
                      disabled={cargando}
                    >
                      <Text style={styles.textoMostrar}>
                        {mostrarContrasena ? 'Ocultar' : 'Mostrar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {!!errores.contrasena && (
                    <Text style={styles.textoError}>
                      ⚠ {errores.contrasena}
                    </Text>
                  )}
                </View>

                <View
                  style={styles.grupoCampo}
                  onLayout={(evento) =>
                    registrarPosicion('confirmarContrasena', evento)
                  }
                >
                  <Text style={styles.etiqueta}>
                    Confirmar contraseña{' '}
                    <Text style={styles.asterisco}>*</Text>
                  </Text>
                  <View
                    style={[
                      styles.contenedorContrasena,
                      errores.confirmarContrasena && styles.entradaError,
                    ]}
                  >
                    <TextInput
                      style={styles.entradaContrasena}
                      value={formulario.confirmarContrasena}
                      onChangeText={(valor) =>
                        actualizarCampo('confirmarContrasena', valor)
                      }
                      placeholder="Repita la contraseña"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!mostrarConfirmacionContrasena}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!cargando}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setMostrarConfirmacionContrasena((actual) => !actual)
                      }
                      disabled={cargando}
                    >
                      <Text style={styles.textoMostrar}>
                        {mostrarConfirmacionContrasena ? 'Ocultar' : 'Mostrar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {!!errores.confirmarContrasena && (
                    <Text style={styles.textoError}>
                      ⚠ {errores.confirmarContrasena}
                    </Text>
                  )}
                </View>
              </View>

              <View onLayout={(evento) => registrarPosicion('general', evento)}>
                {!!errorGeneral && (
                  <View style={styles.mensajeGeneral}>
                    <Text style={styles.textoErrorGeneral}>
                      ⚠ {errorGeneral}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.acciones}>
                <TouchableOpacity
                  style={styles.botonCancelar}
                  onPress={volver}
                  disabled={cargando}
                >
                  <Text style={styles.textoCancelar}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.botonGuardar,
                    cargando && styles.botonDeshabilitado,
                  ]}
                  onPress={registrarUsuario}
                  disabled={cargando}
                  activeOpacity={0.8}
                >
                  {cargando ? (
                    <ActivityIndicator color={C.blanco} />
                  ) : (
                    <Text style={styles.textoGuardar}>Registrar usuario</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.piePaginaBlanco} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={modalConfirmacionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!cargando) setModalConfirmacionVisible(false);
        }}
      >
        <View style={styles.fondoModal}>
          <View style={styles.tarjetaModal}>
            <View style={styles.iconoPregunta}>
              <Text style={styles.textoIconoPregunta}>?</Text>
            </View>

            <Text style={styles.tituloModal}>¿Confirmar registro?</Text>
            <Text style={styles.mensajeModal}>
              ¿Deseas registrar esta cuenta de usuario con los datos ingresados?
            </Text>

            <View style={styles.botonesModal}>
              <TouchableOpacity
                style={styles.botonModalCancelar}
                onPress={() => setModalConfirmacionVisible(false)}
                disabled={cargando}
                activeOpacity={0.8}
              >
                <Text style={styles.textoModalCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botonModalConfirmar,
                  cargando && styles.botonDeshabilitado,
                ]}
                onPress={confirmarRegistro}
                disabled={cargando}
                activeOpacity={0.8}
              >
                {cargando ? (
                  <ActivityIndicator color={C.blanco} />
                ) : (
                  <Text style={styles.textoModalConfirmar}>Sí, registrar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: C.fondo,
  },
  contenedorTeclado: {
    flex: 1,
  },
  contenido: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 0,
  },
  ruta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  enlaceRuta: {
    fontSize: 12,
    color: C.primario,
    fontWeight: '700',
  },
  separador: {
    fontSize: 12,
    color: C.secundario,
  },
  rutaActual: {
    fontSize: 12,
    color: C.secundario,
    fontWeight: '600',
  },
  encabezado: {
    marginBottom: 20,
  },
  titulo: {
    fontSize: 23,
    fontWeight: '800',
    color: C.texto,
  },
  descripcion: {
    fontSize: 13,
    lineHeight: 20,
    color: C.secundario,
    marginTop: 7,
  },
  tarjeta: {
    backgroundColor: C.blanco,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 17,
    marginBottom: 16,
  },
  tituloSeccion: {
    fontSize: 16,
    fontWeight: '800',
    color: C.texto,
    marginBottom: 18,
  },
  grupoCampo: {
    marginBottom: 16,
  },
  etiqueta: {
    fontSize: 13,
    color: C.texto,
    fontWeight: '700',
    marginBottom: 8,
  },
  asterisco: {
    color: C.rojo,
  },
  opcional: {
    color: C.secundario,
    fontSize: 11,
    fontWeight: '400',
  },
  entrada: {
    minHeight: 47,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: C.texto,
    backgroundColor: C.blanco,
  },
  entradaError: {
    borderColor: C.rojo,
    backgroundColor: '#FFFAFA',
  },
  textoError: {
    color: C.rojo,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  mensajeGeneral: {
    backgroundColor: C.rojoFondo,
    borderWidth: 1,
    borderColor: '#F5C6C6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  textoErrorGeneral: {
    color: C.rojo,
    fontSize: 13,
    lineHeight: 19,
  },
  roles: {
    flexDirection: 'row',
    gap: 10,
  },
  opcionRol: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    alignItems: 'center',
  },
  opcionRolSeleccionada: {
    borderColor: C.primario,
    backgroundColor: C.verdeClaro,
  },
  textoRol: {
    color: C.secundario,
    fontSize: 12,
    fontWeight: '600',
  },
  textoRolSeleccionado: {
    color: C.primarioOscuro,
    fontWeight: '800',
  },
  contenedorContrasena: {
    minHeight: 47,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: C.blanco,
  },
  entradaContrasena: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    fontSize: 13,
    color: C.texto,
  },
  textoMostrar: {
    color: C.primario,
    fontWeight: '700',
    fontSize: 12,
    paddingLeft: 8,
  },
  acciones: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 3,
  },
  botonCancelar: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 10,
  },
  textoCancelar: {
    color: C.secundario,
    fontSize: 13,
    fontWeight: '700',
  },
  botonGuardar: {
    flex: 1.5,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primario,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  botonDeshabilitado: {
    opacity: 0.65,
  },
  textoGuardar: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
  },
  piePaginaBlanco: {
    height: 60,
    backgroundColor: C.blanco,
    marginTop: 24,
    marginHorizontal: -18,
  },

  // Modal de confirmación
  fondoModal: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tarjetaModal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: C.blanco,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  iconoPregunta: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.verdeClaro,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  textoIconoPregunta: {
    fontSize: 30,
    fontWeight: '800',
    color: C.primario,
  },
  tituloModal: {
    fontSize: 20,
    fontWeight: '800',
    color: C.texto,
    textAlign: 'center',
  },
  mensajeModal: {
    fontSize: 14,
    lineHeight: 21,
    color: C.secundario,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  botonesModal: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  botonModalCancelar: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borde,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.blanco,
  },
  textoModalCancelar: {
    fontSize: 13,
    fontWeight: '700',
    color: C.secundario,
  },
  botonModalConfirmar: {
    flex: 1.25,
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primario,
    paddingHorizontal: 8,
  },
  textoModalConfirmar: {
    fontSize: 13,
    fontWeight: '800',
    color: C.blanco,
  },

  // Pantalla de registro exitoso
  tarjetaExito: {
    backgroundColor: C.blanco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBE9D7',
    padding: 22,
    marginTop: 18,
    marginBottom: 30,
    alignItems: 'center',
  },
  iconoExito: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.verdeFondo,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  textoIconoExito: {
    color: C.verde,
    fontSize: 36,
    fontWeight: '800',
  },
  tituloExito: {
    fontSize: 22,
    fontWeight: '800',
    color: C.texto,
    textAlign: 'center',
  },
  mensajeExito: {
    color: C.verde,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 22,
  },
  resumenUsuario: {
    width: '100%',
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 12,
    padding: 15,
    marginBottom: 22,
  },
  tituloResumen: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 14,
  },
  filaResumen: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF1F4',
  },
  etiquetaResumen: {
    color: C.secundario,
    fontSize: 12,
    marginBottom: 4,
  },
  valorResumen: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '700',
  },
  botonContinuar: {
    width: '100%',
    minHeight: 49,
    borderRadius: 10,
    backgroundColor: C.primario,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  textoBotonContinuar: {
    color: C.blanco,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
});
