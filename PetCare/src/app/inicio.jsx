
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { router, useFocusEffect } from 'expo-router';

import { supabase } from '../services/supabase';
import { consultarPerfilPorId } from '../dao/autentificacion/perfilDAO';
import { crearControladorRolUsuario } from '../controllers/autenticacion/rolUsuarioControlador';
import { crearControladorInicio } from '../controllers/inicio/inicioControlador';

import MenuLateralDerecho from '../components/layout/MenuLateralDerecho';
import EncabezadoPetCare from '../components/layout/EncabezadoPetCare';

const C = {
  primario: '#0D9488',
  primarioOscuro: '#115E59',
  fondo: '#F0FDFA',
  blanco: '#FFFFFF',
  texto: '#243746',
  secundario: '#718096',
  borde: '#D9EDE8',
  verdeClaro: '#D1FAE5',
  amarilloClaro: '#FEF3C7',
  amarillo: '#F59E0B',
  rojoClaro: '#FEE2E2',
  rojo: '#EF4444',
  azulClaro: '#DBEAFE',
  azul: '#3B82F6',
};

const controladorInicio = crearControladorInicio();

const FUNCIONES_VACIAS = {
  atenciones: false,
  actividades: false,
  seguimiento: false,
  administracion: false,
  indicadores: false,
};

const INDICADORES_INICIALES = {
  atencionesRegistradas: 0,
  pendientes: 0,
  completadas: 0,
  noRealizadas: 0,
  activas: 0,
};

const MENSAJE_ERROR_ATENCIONES_ACTIVAS =
  'No se pudo cargar la cantidad de atenciones activas. Intente nuevamente.';

function obtenerIniciales(texto = '') {
  return (
    texto
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0].toUpperCase())
      .join('') || 'U'
  );
}

function obtenerFechaActual() {
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());
}

function formatearFecha(fecha) {
  if (!fecha) return 'Fecha no disponible';

  const partes = String(fecha).split('-');

  if (partes.length !== 3) return String(fecha);

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obtenerNombreActividad(actividad) {
  return (
    actividad?.tipo ||
    actividad?.tipos_actividad?.nombre ||
    'Actividad veterinaria'
  );
}

function obtenerMascotaActividad(actividad) {
  return actividad?.atencion?.mascota || null;
}

export default function InicioScreen() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState('');
  const [estadoCuenta, setEstadoCuenta] = useState('');

  const [funciones, setFunciones] = useState(FUNCIONES_VACIAS);

  const [cargandoPerfil, setCargandoPerfil] = useState(true);
  const [cargandoIndicadores, setCargandoIndicadores] = useState(false);
  const [cargandoAtencionesActivas, setCargandoAtencionesActivas] =
    useState(false);
  const [cargandoActividades, setCargandoActividades] = useState(false);

  const [accesoAutorizado, setAccesoAutorizado] = useState(false);

  const [errorPerfil, setErrorPerfil] = useState('');
  const [errorIndicadores, setErrorIndicadores] = useState('');
  const [errorAtencionesActivas, setErrorAtencionesActivas] = useState('');
  const [errorActividades, setErrorActividades] = useState('');

  const [indicadores, setIndicadores] = useState(
    INDICADORES_INICIALES
  );

  const [proximasActividades, setProximasActividades] = useState([]);

  /*
   * RF02: Administrador y Asistente pueden ingresar al panel.
   * Administración es exclusiva del Administrador.
   */
  const controladorRol = useMemo(
    () =>
      crearControladorRolUsuario({
        consultarPerfil: consultarPerfilPorId,

        cargarFunciones: async (rolIdentificado) => ({
          atenciones: true,
          actividades: true,
          seguimiento: true,
          administracion: rolIdentificado === 'Administrador',
          indicadores: true,
        }),

        cerrarSesion: async () => {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
        },
      }),
    []
  );

  /*
   * RF02: verificar sesión, rol y estado de cuenta.
   */
  const cargarPerfil = useCallback(async () => {
    setCargandoPerfil(true);
    setErrorPerfil('');
    setAccesoAutorizado(false);
    setFunciones(FUNCIONES_VACIAS);
    setIndicadores(INDICADORES_INICIALES);
    setProximasActividades([]);
    setErrorIndicadores('');
    setErrorAtencionesActivas('');
    setErrorActividades('');

    try {
      const {
        data: resultadoUsuario,
        error: errorSesion,
      } = await supabase.auth.getUser();

      if (errorSesion) throw errorSesion;

      const usuario = resultadoUsuario?.user;

      if (!usuario) {
        setNombre('');
        setRol('');
        setEstadoCuenta('');
        setErrorPerfil(
          'No hay una sesión activa. Inicia sesión nuevamente.'
        );
        return false;
      }

      const resultado = await controladorRol.identificarRol(usuario.id);

      if (!resultado.autorizado) {
        setNombre('');
        setRol('');
        setEstadoCuenta('');
        setFunciones(FUNCIONES_VACIAS);
        setErrorPerfil(resultado.mensaje);
        return false;
      }

      const perfil = await consultarPerfilPorId(usuario.id);

      setNombre(
        perfil.nombre_completo?.trim() ||
          usuario.user_metadata?.nombre_completo ||
          usuario.email?.split('@')[0] ||
          'Usuario'
      );

      setRol(resultado.rol);
      setEstadoCuenta(perfil.estado_cuenta || '');
      setFunciones(resultado.funciones);
      setAccesoAutorizado(true);

      return true;
    } catch (error) {
      console.error('Error al verificar el acceso a PetCare:', error);

      setNombre('');
      setRol('');
      setEstadoCuenta('');
      setFunciones(FUNCIONES_VACIAS);
      setIndicadores(INDICADORES_INICIALES);
      setProximasActividades([]);
      setAccesoAutorizado(false);

      setErrorPerfil(
        'No se pudo verificar el rol. Intente nuevamente.'
      );

      return false;
    } finally {
      setCargandoPerfil(false);
    }
  }, [controladorRol]);

  /*
   * RF08: cargar resumen y próximas actividades.
   * Las actividades no necesitan tener una cita asociada.
   */
  const cargarIndicadores = useCallback(async () => {
    if (!accesoAutorizado) {
      setIndicadores(INDICADORES_INICIALES);
      setProximasActividades([]);
      setCargandoIndicadores(false);
      setCargandoActividades(false);
      return;
    }

    setCargandoIndicadores(true);
    setErrorIndicadores('');

    try {
      const resumen = await controladorInicio.cargarResumen();

      setIndicadores((actuales) => ({
        ...actuales,
        ...resumen,
      }));
    } catch (error) {
      console.error('RF08: error al cargar el resumen:', error);

      setErrorIndicadores(
        error?.message ||
          'No se pudo cargar el resumen del panel. Intente nuevamente.'
      );
    } finally {
      setCargandoIndicadores(false);
    }

    /*
     * RF08: consultar actividades pendientes por fecha prevista.
     * No depende de citas ni de detalle_cita.
     */
    setCargandoActividades(true);
    setErrorActividades('');

    try {
      const resultado =
        await controladorInicio.cargarProximasActividades();

      setProximasActividades(
        Array.isArray(resultado) ? resultado : []
      );
    } catch (error) {
      console.error(
        'RF08: error al consultar próximas actividades:',
        error
      );

      setProximasActividades([]);
      setErrorActividades(
        error?.message ||
          'No se pudieron consultar las próximas actividades.'
      );
    } finally {
      setCargandoActividades(false);
    }
  }, [accesoAutorizado]);

  /*
   * RF09: consultar el contador real de atenciones activas.
   */
  const cargarAtencionesActivas = useCallback(async () => {
    if (!accesoAutorizado) {
      setIndicadores((actuales) => ({
        ...actuales,
        activas: 0,
      }));
      setErrorAtencionesActivas('');
      setCargandoAtencionesActivas(false);
      return;
    }

    setCargandoAtencionesActivas(true);
    setErrorAtencionesActivas('');

    try {
      const resultado = await controladorInicio.cargarIndicadores();

      setIndicadores((actuales) => ({
        ...actuales,
        activas: resultado.activas,
      }));
    } catch (error) {
      console.error(
        'RF09: error al consultar atenciones activas:',
        error
      );

      setErrorAtencionesActivas(
        error?.message || MENSAJE_ERROR_ATENCIONES_ACTIVAS
      );
    } finally {
      setCargandoAtencionesActivas(false);
    }
  }, [accesoAutorizado]);

  /*
   * RF09: navegar al módulo Atenciones mostrando las activas.
   */
  const abrirAtenciones = useCallback(() => {
    router.push({
      pathname: '/atenciones/atenciones',
      params: {
        estado: 'Activa',
      },
    });
  }, []);

  /*
   * RF10: navegar al listado de actividades con el filtro elegido.
   */
  const abrirActividadesPorEstado = useCallback((estado) => {
    router.push({
      pathname: '/actividades/actividades',
      params: {
        estadoActividad: estado,
      },
    });
  }, []);

  /*
   * RF02: verificar el acceso cuando Inicio recibe el foco.
   */
  useFocusEffect(
    useCallback(() => {
      cargarPerfil();
    }, [cargarPerfil])
  );

  /*
   * RF08 y RF09: cargar datos cuando el perfil está autorizado.
   */
  useEffect(() => {
    if (!cargandoPerfil && accesoAutorizado) {
      cargarIndicadores();
      cargarAtencionesActivas();
    }
  }, [
    cargandoPerfil,
    accesoAutorizado,
    cargarIndicadores,
    cargarAtencionesActivas,
  ]);

  /*
   * RF08 y RF09: actualizar indicadores y actividades.
   */
  const actualizarInicio = useCallback(async () => {
    await Promise.all([
      cargarIndicadores(),
      cargarAtencionesActivas(),
    ]);
  }, [cargarIndicadores, cargarAtencionesActivas]);

  /*
   * RF07: cerrar sesión.
   */
  async function cerrarSesion() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      setMenuAbierto(false);
      setAccesoAutorizado(false);
      setFunciones(FUNCIONES_VACIAS);

      router.replace('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      Alert.alert(
        'No se pudo cerrar sesión',
        'Intente nuevamente.'
      );
    }
  }

  if (cargandoPerfil) {
    return (
      <View style={styles.pantallaBloqueo}>
        <ActivityIndicator size="large" color={C.primario} />
        <Text style={styles.textoCargandoAcceso}>
          Verificando acceso a PetCare...
        </Text>
      </View>
    );
  }

  if (!accesoAutorizado) {
    return (
      <View style={styles.pantallaBloqueo}>
        <View style={styles.tarjetaBloqueo}>
          <Text style={styles.tituloBloqueo}>
            Acceso no disponible
          </Text>

          <Text style={styles.mensajeBloqueo}>
            {errorPerfil ||
              'No se pudo verificar el rol. Intente nuevamente.'}
          </Text>

          <TouchableOpacity
            style={styles.botonReintentar}
            onPress={cargarPerfil}
            activeOpacity={0.8}
          >
            <Text style={styles.textoBotonReintentar}>
              Reintentar
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.botonVolver}
            onPress={() => router.replace('/')}
            activeOpacity={0.8}
          >
            <Text style={styles.textoBotonVolver}>
              Volver al inicio de sesión
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EncabezadoPetCare
        titulo="PetCare"
        onAbrirMenu={() => setMenuAbierto(true)}
        onAbrirNotificaciones={() =>
          Alert.alert(
            'Notificaciones',
            'No tienes notificaciones nuevas.'
          )
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.migaActiva}>Inicio</Text>

        {/* RF02: bienvenida compartida por ambos roles. */}
        <View style={styles.bienvenida}>
          <View style={styles.bienvenidaTexto}>
            <Text style={styles.saludo}>¡Bienvenida!</Text>

            <Text style={styles.nombreUsuario}>
              {nombre || 'Usuario'}
            </Text>

            <Text style={styles.rolUsuario}>{rol}</Text>
          </View>

          <View style={styles.avatar}>
            <Text style={styles.inicialesAvatar}>
              {obtenerIniciales(nombre)}
            </Text>
          </View>
        </View>

        <Text style={styles.fecha}>
          {obtenerFechaActual()}
        </Text>

        {/* RF09: contador de atenciones activas. */}
        <TouchableOpacity
          style={styles.tarjetaActivas}
          onPress={abrirAtenciones}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Atenciones activas: ${indicadores.activas}. Abrir listado de atenciones`}
        >
          <View style={styles.textosAtenciones}>
            <Text style={styles.tituloAtenciones}>
              Atenciones activas
            </Text>

            <Text style={styles.descripcionAtenciones}>
              Atenciones que todavía están en curso.
            </Text>

            <Text style={styles.enlaceActivas}>
              Ver atenciones →
            </Text>
          </View>

          {cargandoAtencionesActivas ? (
            <ActivityIndicator size="large" color={C.blanco} />
          ) : (
            <Text style={styles.numeroAtenciones}>
              {indicadores.activas}
            </Text>
          )}
        </TouchableOpacity>

        {errorAtencionesActivas ? (
          <View style={styles.alerta}>
            <Text style={styles.textoAlerta}>
              {errorAtencionesActivas}
            </Text>

            <TouchableOpacity
              style={styles.botonReintentarIndicadores}
              onPress={cargarAtencionesActivas}
              disabled={cargandoAtencionesActivas}
              activeOpacity={0.8}
            >
              <Text style={styles.textoBotonReintentarIndicadores}>
                {cargandoAtencionesActivas
                  ? 'Cargando...'
                  : 'Reintentar'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* RF08: resumen de actividades. */}
        <View style={styles.tituloIndicadores}>
          <Text style={styles.tituloSeccion}>
            Resumen de actividades
          </Text>

          <TouchableOpacity
            style={styles.botonActualizar}
            onPress={actualizarInicio}
            disabled={
              cargandoIndicadores ||
              cargandoActividades ||
              cargandoAtencionesActivas
            }
            activeOpacity={0.8}
          >
            <Text style={styles.textoActualizar}>
              {cargandoIndicadores ||
              cargandoActividades ||
              cargandoAtencionesActivas
                ? 'Actualizando...'
                : '↻ Actualizar'}
            </Text>
          </TouchableOpacity>
        </View>

        {errorIndicadores ? (
          <View style={styles.alerta}>
            <Text style={styles.textoAlerta}>
              {errorIndicadores}
            </Text>

            <TouchableOpacity
              style={styles.botonReintentarIndicadores}
              onPress={actualizarInicio}
              disabled={cargandoIndicadores}
              activeOpacity={0.8}
            >
              <Text style={styles.textoBotonReintentarIndicadores}>
                {cargandoIndicadores ? 'Cargando...' : 'Reintentar'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* RF10: acceso al listado de actividades. */}
        <View style={styles.grilla}>
          <TarjetaIndicador
            icono="◷"
            titulo="Pendientes"
            valor={indicadores.pendientes}
            color={C.amarillo}
            fondo={C.amarilloClaro}
            cargando={cargandoIndicadores}
            onPress={() => abrirActividadesPorEstado('Pendiente')}
          />

          <TarjetaIndicador
            icono="✓"
            titulo="Completadas"
            valor={indicadores.completadas}
            color="#10B981"
            fondo={C.verdeClaro}
            cargando={cargandoIndicadores}
            onPress={() => abrirActividadesPorEstado('Completada')}
          />

          <TarjetaIndicador
            icono="×"
            titulo="No realizadas"
            valor={indicadores.noRealizadas}
            color={C.rojo}
            fondo={C.rojoClaro}
            cargando={cargandoIndicadores}
            onPress={() => abrirActividadesPorEstado('No realizada')}
          />
        </View>

        {/* RF08: próximas actividades, tengan o no una cita. */}
        <View style={styles.tarjetaProximas}>
          <View style={styles.encabezadoProximas}>
            <View style={styles.iconoProximas}>
              <Text style={styles.textoIconoProximas}>◷</Text>
            </View>

            <View style={styles.textosProximas}>
              <Text style={styles.tituloSeccion}>
                Próximas actividades
              </Text>

              <Text style={styles.descripcionProximas}>
                Actividades pendientes de los próximos tres días.
              </Text>
            </View>
          </View>

          <View style={styles.separador} />

          {cargandoActividades ? (
            <View style={styles.estadoCitas}>
              <ActivityIndicator color={C.primario} />
              <Text style={styles.descripcionProximas}>
                Consultando próximas actividades...
              </Text>
            </View>
          ) : errorActividades ? (
            <View>
              <Text style={styles.textoAlerta}>
                {errorActividades}
              </Text>

              <TouchableOpacity
                style={styles.botonReintentarIndicadores}
                onPress={cargarIndicadores}
                disabled={cargandoActividades}
                activeOpacity={0.8}
              >
                <Text style={styles.textoBotonReintentarIndicadores}>
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
          ) : proximasActividades.length === 0 ? (
            <Text style={styles.descripcionProximas}>
              No hay actividades pendientes para los próximos tres días.
            </Text>
          ) : (
            proximasActividades.map((actividad) => {
              const mascota = obtenerMascotaActividad(actividad);

              return (
                <TouchableOpacity
                  key={actividad.actividad_id}
                  style={styles.actividadProxima}
                  onPress={() =>
                    abrirActividadesPorEstado('Pendiente')
                  }
                  activeOpacity={0.75}
                >
                  <View style={styles.actividadProximaIcono}>
                    <Text style={styles.actividadProximaIconoTexto}>
                      ✓
                    </Text>
                  </View>

                  <View style={styles.actividadProximaDatos}>
                    <Text style={styles.nombreActividad}>
                      {obtenerNombreActividad(actividad)}
                    </Text>

                    <Text style={styles.descripcionProximas}>
                      Mascota: {mascota?.nombre || 'No disponible'}
                    </Text>

                    {mascota?.especie ? (
                      <Text style={styles.descripcionProximas}>
                        Especie: {mascota.especie}
                      </Text>
                    ) : null}

                    <Text style={styles.descripcionProximas}>
                      Historia:{' '}
                      {actividad.atencion?.numero_historia ||
                        mascota?.numero_historia ||
                        'No indicada'}
                    </Text>

                    <Text style={styles.descripcionProximas}>
                      Fecha prevista:{' '}
                      {formatearFecha(actividad.fecha_prevista)}
                    </Text>

                    <Text style={styles.descripcionProximas}>
                      Estado: {actividad.estado}
                    </Text>
                  </View>

                  <View style={styles.etiquetaActividad}>
                    <Text style={styles.textoEtiquetaActividad}>
                      Pendiente
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.pie}>
          <Text style={styles.textoPie}>
            PetCare · Sistema de seguimiento de atención veterinaria
          </Text>
        </View>
      </ScrollView>

      <MenuLateralDerecho
        visible={menuAbierto}
        onCerrar={() => setMenuAbierto(false)}
        nombreUsuario={nombre}
        rolUsuario={rol}
        onCerrarSesion={cerrarSesion}
      />
    </View>
  );
}

/*
 * RF08: componente reutilizable para presentar indicadores.
 * RF10: permite navegar según el estado seleccionado.
 */
function TarjetaIndicador({
  icono,
  titulo,
  valor,
  color,
  fondo,
  cargando,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.tarjetaIndicador}
      onPress={onPress}
      activeOpacity={0.75}
      disabled={cargando || !onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}: ${valor}. Abrir actividades`}
      accessibilityState={{ disabled: cargando || !onPress }}
    >
      <View
        style={[
          styles.iconoIndicador,
          { backgroundColor: fondo },
        ]}
      >
        <Text
          style={[
            styles.textoIconoIndicador,
            { color },
          ]}
        >
          {icono}
        </Text>
      </View>

      <View style={styles.contenidoIndicador}>
        {cargando ? (
          <ActivityIndicator color={color} />
        ) : (
          <Text style={[styles.valorIndicador, { color }]}>
            {valor}
          </Text>
        )}

        <Text style={styles.tituloIndicador}>
          {titulo}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.fondo,
  },

  pantallaBloqueo: {
    flex: 1,
    backgroundColor: C.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },

  tarjetaBloqueo: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borde,
    backgroundColor: C.blanco,
    alignItems: 'center',
  },

  tituloBloqueo: {
    fontSize: 21,
    fontWeight: '800',
    color: C.texto,
    textAlign: 'center',
    marginBottom: 12,
  },

  mensajeBloqueo: {
    fontSize: 14,
    lineHeight: 21,
    color: C.secundario,
    textAlign: 'center',
    marginBottom: 20,
  },

  textoCargandoAcceso: {
    color: C.texto,
    fontSize: 14,
    marginTop: 14,
  },

  botonReintentar: {
    width: '100%',
    padding: 13,
    alignItems: 'center',
    backgroundColor: C.primario,
    borderRadius: 10,
  },

  textoBotonReintentar: {
    color: C.blanco,
    fontWeight: '800',
  },

  botonVolver: {
    padding: 13,
    marginTop: 8,
  },

  textoBotonVolver: {
    color: C.primarioOscuro,
    fontWeight: '700',
    textAlign: 'center',
  },

  scroll: {
    flex: 1,
  },

  contenido: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },

  migaActiva: {
    color: C.primario,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 18,
  },

  bienvenida: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.primario,
    padding: 19,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borde,
  },

  bienvenidaTexto: {
    flex: 1,
    paddingRight: 10,
  },

  saludo: {
    fontSize: 14,
    color: '#D1FAF5',
    marginBottom: 5,
  },

  nombreUsuario: {
    fontSize: 21,
    fontWeight: '800',
    color: C.blanco,
    marginBottom: 7,
  },

  rolUsuario: {
    alignSelf: 'flex-start',
    color: C.blanco,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  inicialesAvatar: {
    color: C.blanco,
    fontSize: 19,
    fontWeight: '800',
  },

  fecha: {
    color: C.secundario,
    fontSize: 13,
    textTransform: 'capitalize',
    marginTop: 18,
    marginBottom: 20,
  },

  tarjetaActivas: {
    backgroundColor: C.primario,
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: C.borde,
  },

  textosAtenciones: {
    flex: 1,
    paddingRight: 12,
  },

  tituloAtenciones: {
    color: C.blanco,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 5,
  },

  descripcionAtenciones: {
    color: '#CCFBF1',
    fontSize: 12,
    lineHeight: 18,
  },

  enlaceActivas: {
    color: C.blanco,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 10,
  },

  numeroAtenciones: {
    color: C.blanco,
    fontSize: 30,
    fontWeight: '800',
  },

  tituloIndicadores: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },

  tituloSeccion: {
    flex: 1,
    color: C.texto,
    fontSize: 18,
    fontWeight: '800',
  },

  botonActualizar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.verdeClaro,
  },

  textoActualizar: {
    color: C.primarioOscuro,
    fontSize: 12,
    fontWeight: '700',
  },

  alerta: {
    backgroundColor: C.amarilloClaro,
    borderWidth: 1,
    borderColor: '#F0DDAE',
    padding: 13,
    borderRadius: 13,
    marginBottom: 14,
  },

  textoAlerta: {
    color: '#805C17',
    fontSize: 12,
    lineHeight: 18,
  },

  botonReintentarIndicadores: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 10,
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.primario,
    borderRadius: 9,
  },

  textoBotonReintentarIndicadores: {
    color: C.primarioOscuro,
    fontSize: 12,
    fontWeight: '800',
  },

  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },

  tarjetaIndicador: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 90,
    padding: 12,
    backgroundColor: C.blanco,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borde,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  iconoIndicador: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textoIconoIndicador: {
    fontSize: 19,
    fontWeight: '800',
  },

  contenidoIndicador: {
    flex: 1,
    justifyContent: 'center',
  },

  valorIndicador: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 3,
  },

  tituloIndicador: {
    color: C.secundario,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },

  tarjetaProximas: {
    backgroundColor: C.blanco,
    borderWidth: 1,
    borderColor: C.borde,
    borderRadius: 18,
    padding: 17,
    marginTop: 23,
  },

  encabezadoProximas: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconoProximas: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.azulClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  textoIconoProximas: {
    color: C.azul,
    fontSize: 25,
    fontWeight: '700',
  },

  textosProximas: {
    flex: 1,
  },

  descripcionProximas: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  estadoCitas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },

  actividadProxima: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#F8FFFD',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borde,
    marginBottom: 9,
  },

  actividadProximaIcono: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.verdeClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  actividadProximaIconoTexto: {
    color: C.primarioOscuro,
    fontSize: 16,
    fontWeight: '800',
  },

  actividadProximaDatos: {
    flex: 1,
  },

  etiquetaActividad: {
    backgroundColor: C.amarilloClaro,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 5,
  },

  textoEtiquetaActividad: {
    color: '#805C17',
    fontSize: 10,
    fontWeight: '800',
  },

  nombreActividad: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '800',
  },

  separador: {
    height: 1,
    backgroundColor: C.borde,
    marginVertical: 16,
  },

  pie: {
    alignItems: 'center',
    paddingTop: 25,
    paddingBottom: 10,
  },

  textoPie: {
    color: C.secundario,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
  },
});
