
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { supabase } from '../../services/supabase';
import { cerrarSesionServicio } from '../../services/cerrarSesionServicio';

const ANCHO_PANTALLA = Dimensions.get('window').width;
const ANCHO_MENU = ANCHO_PANTALLA * 0.689;

const C = {
  fondo: '#173D39',
  superficie: '#204A44',
  superficieActiva: '#315F57',
  superficieIcono: '#294F49',
  blanco: '#F1F4F2',
  texto: '#D1DEDA',
  secundario: '#A6B9B3',
  borde: '#355A53',
  acento: '#D6B77C',
  peligro: '#E2AAA3',
  fondoPeligro: '#493936',
};

const OPCIONES_MENU = [
  { titulo: 'Inicio', ruta: '/inicio', glifo: '⌂' },
  { titulo: 'Atenciones', ruta: '/atenciones/atenciones', glifo: '▤' },
  { titulo: 'Propietarios', ruta: '/propietarios', glifo: '♙' },
  { titulo: 'Mascotas', ruta: '/mascotas', glifo: '♧' },
  { titulo: 'Seguimiento', ruta: '/seguimiento', glifo: '↗' },
  {
    titulo: 'Administración',
    ruta: '/administracion/administracion',
    soloAdministrador: true,
    glifo: '⚙',
  },
];

function normalizarRol(rol) {
  return String(rol || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function obtenerIniciales(nombre) {
  if (!nombre) return 'PC';

  const palabras = nombre
    .replace(/^(dra?\.?)\s*/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (palabras.length === 0) return 'PC';

  if (palabras.length === 1) {
    return palabras[0].substring(0, 2).toUpperCase();
  }

  return (palabras[0][0] + palabras[1][0]).toUpperCase();
}

export default function MenuLateralDerecho({
  visible,
  onCerrar,
  nombreUsuario,
  rolUsuario,
  onCerrarSesion,
}) {
  const pathname = usePathname();
  const desplazamiento = useRef(new Animated.Value(ANCHO_MENU)).current;
  const opacidadFondo = useRef(new Animated.Value(0)).current;

  const [rolVerificado, setRolVerificado] = useState('');
  const [verificandoRol, setVerificandoRol] = useState(false);

  // Estado independiente para la confirmación de cierre de sesión.
  const [modalCerrarSesion, setModalCerrarSesion] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);

  const rolActual = rolVerificado || rolUsuario || '';
  const esAdministrador =
    normalizarRol(rolActual) === 'administrador';

  const opcionesVisibles = OPCIONES_MENU.filter(
    (opcion) =>
      !opcion.soloAdministrador || esAdministrador
  );

  useEffect(() => {
    if (!visible) return;

    desplazamiento.setValue(ANCHO_MENU);
    opacidadFondo.setValue(0);

    Animated.parallel([
      Animated.timing(desplazamiento, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacidadFondo, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();

    if (rolUsuario) setRolVerificado(rolUsuario);
  }, [visible, desplazamiento, opacidadFondo, rolUsuario]);

  function cerrarMenu() {
    Animated.parallel([
      Animated.timing(desplazamiento, {
        toValue: ANCHO_MENU,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacidadFondo, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onCerrar?.();
    });
  }

  async function consultarPerfilActual() {
    const {
      data: { user },
      error: errorUsuario,
    } = await supabase.auth.getUser();

    if (errorUsuario || !user) {
      throw new Error('No se encontró una sesión activa.');
    }

    const { data: perfil, error } = await supabase
      .from('perfiles')
      .select('rol, estado_cuenta')
      .eq('perfil_id', user.id)
      .maybeSingle();

    if (error || !perfil) {
      throw new Error('No se pudo consultar el perfil del usuario.');
    }

    if (normalizarRol(perfil.estado_cuenta) !== 'activo') {
      throw new Error('Tu cuenta no se encuentra activa.');
    }

    setRolVerificado(perfil.rol || '');
    return perfil;
  }

  async function navegarA(opcion) {
    if (verificandoRol) return;

    try {
      if (opcion.soloAdministrador) {
        setVerificandoRol(true);
        const perfil = await consultarPerfilActual();

        if (normalizarRol(perfil.rol) !== 'administrador') {
          Alert.alert(
            'Acceso restringido',
            'Solo el administrador puede acceder a esta sección.'
          );
          return;
        }
      }

      cerrarMenu();

      setTimeout(() => {
        if (opcion.ruta === '/inicio') {
          router.replace(opcion.ruta);
        } else {
          router.push(opcion.ruta);
        }
      }, 230);
    } catch (error) {
      Alert.alert(
        'No se pudo acceder',
        error.message || 'Ocurrió un problema al verificar los permisos.'
      );
    } finally {
      setVerificandoRol(false);
    }
  }

  function esRutaActiva(ruta) {
    if (
      pathname === '/propietarioAdmin/gestionPropietarios' &&
      ruta === '/administracion/administracion'
    ) {
      return true;
    }

    return (
      pathname === ruta ||
      pathname?.startsWith(`${ruta}/`)
    );
  }

  function abrirPerfil() {
    cerrarMenu();
    setTimeout(() => router.push('/perfil'), 230);
  }

  /**
   * RF07: abrir la confirmación personalizada.
   * No se cierra sesión hasta que el usuario confirme.
   */
  function confirmarCerrarSesion() {
    if (cerrandoSesion || modalCerrarSesion) return;
    setModalCerrarSesion(true);
  }

  function cancelarCerrarSesion() {
    if (cerrandoSesion) return;
    setModalCerrarSesion(false);
  }

  /**
   * RF07: ejecutar el cierre una sola vez.
   * La pantalla receptora no debe mostrar otra confirmación.
   */
  async function ejecutarCerrarSesion() {
    if (cerrandoSesion) return;

    setCerrandoSesion(true);

    try {
      if (onCerrarSesion) {
        // Las pantallas que reciben esta función cierran sesión
        // directamente, sin volver a solicitar confirmación.
        await onCerrarSesion();
      } else {
        await cerrarSesionServicio(supabase);
        router.replace('/');
      }

      setModalCerrarSesion(false);
      cerrarMenu();
    } catch (error) {
      setModalCerrarSesion(false);

      Alert.alert(
        'No se pudo cerrar la sesión',
        error?.message || 'Ocurrió un error. Inténtalo nuevamente.'
      );
    } finally {
      setCerrandoSesion(false);
    }
  }

  if (!visible) return null;

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={cerrarMenu}
      >
        <View style={estilos.contenedorModal}>
          <StatusBar backgroundColor="#103F3B" barStyle="light-content" />

          <Animated.View
            style={[estilos.fondoOscuro, { opacity: opacidadFondo }]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={cerrarMenu}
            />
          </Animated.View>

          <Animated.View
            style={[
              estilos.menu,
              {
                width: ANCHO_MENU,
                transform: [{ translateX: desplazamiento }],
              },
            ]}
          >
            <View style={estilos.encabezado}>
              <View style={estilos.logo}>
                <View style={estilos.logoIcono}>
                  <Text style={estilos.logoGlifo}>✚</Text>
                </View>

                <View>
                  <Text style={estilos.nombreMarca}>PetCare</Text>
                  <Text style={estilos.subtituloMarca}>VETERINARIA</Text>
                </View>
              </View>

              <TouchableOpacity
                style={estilos.botonCerrar}
                onPress={cerrarMenu}
                accessibilityLabel="Cerrar menú"
              >
                <Text style={estilos.iconoCerrar}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={estilos.separador} />

            <ScrollView
              style={estilos.lista}
              contentContainerStyle={estilos.contenidoLista}
              showsVerticalScrollIndicator={false}
            >
              <View style={estilos.tarjetaUsuario}>
                <View style={estilos.avatar}>
                  <Text style={estilos.iniciales}>
                    {obtenerIniciales(nombreUsuario)}
                  </Text>
                </View>

                <View style={estilos.datosUsuario}>
                  <Text style={estilos.nombreUsuario} numberOfLines={2}>
                    {nombreUsuario || 'Usuario'}
                  </Text>

                  <Text style={estilos.rolUsuario} numberOfLines={1}>
                    {rolActual || 'Personal veterinario'}
                  </Text>
                </View>

                <View style={estilos.indicadorActivo} />
              </View>

              <Text style={estilos.tituloSeccion}>MENÚ PRINCIPAL</Text>

              {opcionesVisibles.map((opcion) => {
                const activa = esRutaActiva(opcion.ruta);

                return (
                  <TouchableOpacity
                    key={opcion.ruta}
                    style={[
                      estilos.opcion,
                      activa && estilos.opcionActiva,
                    ]}
                    onPress={() => navegarA(opcion)}
                    disabled={verificandoRol}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        estilos.iconoContenedor,
                        activa && estilos.iconoContenedorActivo,
                      ]}
                    >
                      <Text
                        style={[
                          estilos.iconoOpcion,
                          activa && estilos.iconoOpcionActivo,
                        ]}
                      >
                        {opcion.glifo}
                      </Text>
                    </View>

                    <Text
                      style={[
                        estilos.textoOpcion,
                        activa && estilos.textoOpcionActivo,
                      ]}
                      numberOfLines={1}
                    >
                      {opcion.titulo}
                    </Text>

                    {activa && (
                      <View style={estilos.indicadorSeleccionado} />
                    )}
                  </TouchableOpacity>
                );
              })}

              <Text style={estilos.tituloSeccion}>MI CUENTA</Text>

              <TouchableOpacity
                style={[
                  estilos.opcion,
                  esRutaActiva('/perfil') && estilos.opcionActiva,
                ]}
                onPress={abrirPerfil}
                activeOpacity={0.75}
              >
                <View style={estilos.iconoContenedor}>
                  <Text style={estilos.iconoOpcion}>♙</Text>
                </View>

                <Text style={estilos.textoOpcion}>Mi perfil</Text>
              </TouchableOpacity>
            </ScrollView>

            {verificandoRol && (
              <View style={estilos.cargando}>
                <ActivityIndicator color={C.acento} size="small" />
                <Text style={estilos.textoCargando}>
                  Verificando permisos...
                </Text>
              </View>
            )}

            <View style={estilos.pieMenu}>
              <TouchableOpacity
                style={estilos.opcionCerrarSesion}
                onPress={confirmarCerrarSesion}
                activeOpacity={0.8}
                disabled={cerrandoSesion}
              >
                <View style={estilos.iconoSalir}>
                  <Text style={estilos.glifoSalir}>⇥</Text>
                </View>

                <Text style={estilos.textoCerrarSesion}>
                  Cerrar sesión
                </Text>
              </TouchableOpacity>

              <Text style={estilos.version}>
                PetCare · Seguimiento veterinario
              </Text>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal de confirmación personalizado */}
      <Modal
        visible={modalCerrarSesion}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={cancelarCerrarSesion}
      >
        <View style={estilos.fondoConfirmacion}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={cancelarCerrarSesion}
            disabled={cerrandoSesion}
          />

          <View style={estilos.tarjetaConfirmacion}>
            <View style={estilos.iconoConfirmacion}>
              <Text style={estilos.glifoConfirmacion}>⇥</Text>
            </View>

            <Text style={estilos.tituloConfirmacion}>
              ¿Cerrar sesión?
            </Text>

            <Text style={estilos.descripcionConfirmacion}>
              ¿Estás seguro de que deseas salir de PetCare?
            </Text>

            <View style={estilos.accionesConfirmacion}>
              <TouchableOpacity
                style={estilos.botonConfirmar}
                onPress={ejecutarCerrarSesion}
                activeOpacity={0.85}
                disabled={cerrandoSesion}
              >
                {cerrandoSesion ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={estilos.textoBotonConfirmar}>
                    Cerrar sesión
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={estilos.botonCancelar}
                onPress={cancelarCerrarSesion}
                activeOpacity={0.85}
                disabled={cerrandoSesion}
              >
                <Text style={estilos.textoBotonCancelar}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={estilos.notaConfirmacion}>
              Tu sesión permanecerá activa si cancelas.
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  contenedorModal: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  fondoOscuro: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 20, 18, 0.55)',
  },
  menu: {
    height: '100%',
    backgroundColor: C.fondo,
    overflow: 'hidden',
    borderTopLeftRadius: 22,
    borderBottomLeftRadius: 22,
    borderLeftWidth: 1,
    borderLeftColor: C.borde,
  },
  encabezado: {
    minHeight: 76,
    paddingTop: 27,
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcono: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.superficieActiva,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlifo: {
    color: C.blanco,
    fontSize: 23,
    fontWeight: '800',
  },
  nombreMarca: {
    color: C.blanco,
    fontSize: 21,
    fontWeight: '800',
  },
  subtituloMarca: {
    color: C.secundario,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  botonCerrar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoCerrar: {
    color: C.blanco,
    fontSize: 27,
    fontWeight: '300',
    lineHeight: 30,
  },
  separador: {
    height: 1,
    backgroundColor: C.borde,
    marginHorizontal: 18,
  },
  lista: {
    flex: 1,
  },
  contenidoLista: {
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 16,
  },
  tarjetaUsuario: {
    backgroundColor: C.superficie,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.borde,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#D9E9E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iniciales: {
    color: C.fondo,
    fontSize: 17,
    fontWeight: '900',
  },
  datosUsuario: {
    flex: 1,
    minWidth: 0,
  },
  nombreUsuario: {
    color: C.blanco,
    fontSize: 15,
    fontWeight: '800',
  },
  rolUsuario: {
    color: C.secundario,
    fontSize: 12,
    marginTop: 5,
    fontWeight: '500',
  },
  indicadorActivo: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#71D4A1',
    marginLeft: 7,
  },
  tituloSeccion: {
    color: C.secundario,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 5,
    marginLeft: 7,
  },
  opcion: {
    minHeight: 54,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  opcionActiva: {
    backgroundColor: C.superficieActiva,
    borderColor: '#43877D',
  },
  iconoContenedor: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.superficieIcono,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconoContenedorActivo: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  iconoOpcion: {
    color: C.texto,
    fontSize: 23,
    textAlign: 'center',
  },
  iconoOpcionActivo: {
    color: C.blanco,
  },
  textoOpcion: {
    flex: 1,
    color: C.texto,
    fontSize: 15,
    fontWeight: '600',
  },
  textoOpcionActivo: {
    color: C.blanco,
    fontWeight: '800',
  },
  indicadorSeleccionado: {
    width: 4,
    height: 24,
    borderRadius: 4,
    backgroundColor: C.acento,
    marginLeft: 8,
  },
  cargando: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    gap: 9,
  },
  textoCargando: {
    color: C.secundario,
    fontSize: 12,
  },
  pieMenu: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 42,
    backgroundColor: C.fondo,
    borderTopWidth: 1,
    borderTopColor: C.borde,
  },
  opcionCerrarSesion: {
    minHeight: 54,
    borderRadius: 13,
    backgroundColor: C.fondoPeligro,
    borderWidth: 1,
    borderColor: '#805652',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  iconoSalir: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(255,180,171,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glifoSalir: {
    color: C.peligro,
    fontSize: 24,
    fontWeight: '700',
  },
  textoCerrarSesion: {
    color: C.blanco,
    fontSize: 15,
    fontWeight: '800',
  },
  version: {
    color: C.secundario,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 10,
  },

  // Estilos del modal personalizado de confirmación.
  fondoConfirmacion: {
    flex: 1,
    backgroundColor: 'rgba(5, 24, 22, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  tarjetaConfirmacion: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0EBE8',
    elevation: 15,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
  },
  iconoConfirmacion: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E5F5F1',
    borderWidth: 1,
    borderColor: '#D1EAE4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 19,
  },
  glifoConfirmacion: {
    color: '#187C72',
    fontSize: 39,
    fontWeight: '700',
  },
  tituloConfirmacion: {
    color: '#263238',
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  descripcionConfirmacion: {
    color: '#718096',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 25,
  },
  accionesConfirmacion: {
    width: '100%',
    gap: 11,
  },
  botonConfirmar: {
    minHeight: 51,
    borderRadius: 13,
    backgroundColor: '#187C72',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#12645C',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  textoBotonConfirmar: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  botonCancelar: {
    minHeight: 49,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5E1E0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  textoBotonCancelar: {
    color: '#12645C',
    fontSize: 15,
    fontWeight: '700',
  },
  notaConfirmacion: {
    color: '#8A9895',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 17,
  },
});