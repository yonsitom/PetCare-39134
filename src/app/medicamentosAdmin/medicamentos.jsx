
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { supabase } from '../../services/supabase';
import EncabezadoPetCare from '../../components/layout/EncabezadoPetCare';
import MenuLateralDerecho from '../../components/layout/MenuLateralDerecho';
import { consultarMedicamentos } from '../../services/administracion/medicamentosService';

// RF52 — Catálogo de medicamentos.
// MVC: esta pantalla gestiona la interfaz y las acciones del usuario.
// Servicio: consulta los medicamentos mediante la capa de servicios.
// DAO: el acceso a la tabla medicamentos permanece en el DAO.
// Seguridad: solo usuarios activos con rol autorizado pueden consultar;
// únicamente el Administrador activo puede registrar nuevos medicamentos.

const FILTROS = ['Todos', 'Activos', 'Desactivados'];

export default function MedicamentosAdmin() {
  const [medicamentos, setMedicamentos] = useState([]);
  const [filtro, setFiltro] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [esAdministrador, setEsAdministrador] = useState(false);

  // RF52 — Verificar sesión, rol y estado de la cuenta.
  const cargarMedicamentos = useCallback(async () => {
    setCargando(true);
    setError('');
    setEsAdministrador(false);

    try {
      const { data: sesionData, error: sesionError } =
        await supabase.auth.getSession();

      if (sesionError) throw sesionError;

      const usuario = sesionData?.session?.user;

      if (!usuario) {
        router.replace('/');
        return;
      }

      const { data: perfil, error: perfilError } = await supabase
        .from('perfiles')
        .select('rol, estado_cuenta')
        .eq('perfil_id', usuario.id)
        .maybeSingle();

      if (perfilError) throw perfilError;

      if (
        !perfil ||
        perfil.estado_cuenta !== 'Activo' ||
        !['Administrador', 'Asistente'].includes(perfil.rol)
      ) {
        router.replace('/');
        return;
      }

      setEsAdministrador(perfil.rol === 'Administrador');

      const datos = await consultarMedicamentos({
        incluirInactivos: true,
      });

      setMedicamentos(Array.isArray(datos) ? datos : []);
    } catch (e) {
      setError(
        e?.message || 'No se pudo cargar el catálogo de medicamentos.'
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarMedicamentos();
    }, [cargarMedicamentos])
  );

  // RF52 — Filtrar por estado y por nombre, concentración o categoría.
  const medicamentosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase();

    return medicamentos.filter((medicamento) => {
      const activo = medicamento.activo === true;

      const coincideFiltro =
        filtro === 'Todos' ||
        (filtro === 'Activos' && activo) ||
        (filtro === 'Desactivados' && !activo);

      const coincideBusqueda =
        !texto ||
        [
          medicamento.nombre_medicamento,
          medicamento.concentracion,
          medicamento.categoria,
        ].some((valor) =>
          String(valor ?? '').toLocaleLowerCase().includes(texto)
        );

      return coincideFiltro && coincideBusqueda;
    });
  }, [medicamentos, filtro, busqueda]);

  // RF52 — Abrir el detalle del medicamento seleccionado.
  const abrirDetalle = (medicamento) => {
    router.push({
      pathname: '/medicamentosAdmin/detalleMedicamento',
      params: {
        id: String(medicamento.medicamento_id),
      },
    });
  };

  // RF de administración de medicamentos — Abrir el formulario de registro.
  const abrirRegistro = () => {
    if (!esAdministrador) {
      Alert.alert(
        'Acceso restringido',
        'Solo un administrador activo puede registrar medicamentos.'
      );
      return;
    }

    router.push('/medicamentosAdmin/registrarMedicamento');
  };

  return (
    <SafeAreaView style={estilos.contenedor}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <EncabezadoPetCare />

      <View style={estilos.contenidoPrincipal}>
        <ScrollView
          style={estilos.areaContenido}
          contentContainerStyle={estilos.contenidoScroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Navegación de regreso a Administración */}
          <View style={estilos.migas}>
            <TouchableOpacity
              onPress={() =>
                router.replace('/administracion/administracion')
              }
              accessibilityRole="button"
              accessibilityLabel="Volver a Administración"
            >
              <Text style={estilos.enlaceMigas}>Administración</Text>
            </TouchableOpacity>

            <Text style={estilos.separadorMigas}> / </Text>
            <Text style={estilos.textoMigas}>Medicamentos</Text>
          </View>

          {/* Encabezado y botón Nuevo */}
          <View style={estilos.encabezadoPagina}>
            <TouchableOpacity
              style={estilos.botonVolver}
              onPress={() =>
                router.replace('/administracion/administracion')
              }
              accessibilityRole="button"
              accessibilityLabel="Volver a Administración"
            >
              <Text style={estilos.flechaVolver}>‹</Text>
            </TouchableOpacity>

            <View style={estilos.titulos}>
              <Text style={estilos.titulo}>Medicamentos</Text>
              <Text style={estilos.subtitulo}>
                Consulta el catálogo de medicamentos y vacunas.
              </Text>
            </View>

            {esAdministrador && (
              <TouchableOpacity
                style={estilos.botonNuevo}
                onPress={abrirRegistro}
                accessibilityRole="button"
                accessibilityLabel="Registrar nuevo medicamento"
                activeOpacity={0.8}
              >
                <Text style={estilos.textoBotonNuevo}>+ Nuevo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Búsqueda y filtros */}
          <View style={estilos.seccionFiltros}>
            <Text style={estilos.tituloFiltros}>Filtros</Text>

            <TextInput
              style={estilos.busqueda}
              placeholder="Buscar por nombre, concentración o categoría"
              placeholderTextColor="#89938F"
              value={busqueda}
              onChangeText={setBusqueda}
              accessibilityLabel="Buscar medicamentos"
              returnKeyType="search"
            />

            <View style={estilos.filaFiltros}>
              {FILTROS.map((opcion) => {
                const seleccionado = filtro === opcion;

                return (
                  <TouchableOpacity
                    key={opcion}
                    style={[
                      estilos.botonFiltro,
                      seleccionado && estilos.botonFiltroSeleccionado,
                    ]}
                    onPress={() => setFiltro(opcion)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: seleccionado }}
                  >
                    <Text
                      style={[
                        estilos.textoFiltro,
                        seleccionado && estilos.textoFiltroSeleccionado,
                      ]}
                    >
                      {opcion}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Estados de carga, error y resultados */}
          {cargando ? (
            <View style={estilos.estadoCarga}>
              <ActivityIndicator size="large" color="#12665E" />
              <Text style={estilos.textoEstado}>
                Cargando medicamentos...
              </Text>
            </View>
          ) : error ? (
            <View style={estilos.tarjetaEstado}>
              <Text style={estilos.tituloEstado}>
                No se pudo cargar el catálogo
              </Text>

              <Text style={estilos.mensajeEstado}>{error}</Text>

              <TouchableOpacity
                style={estilos.botonReintentar}
                onPress={cargarMedicamentos}
                accessibilityRole="button"
              >
                <Text style={estilos.textoReintentar}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : medicamentosFiltrados.length === 0 ? (
            <View style={estilos.tarjetaEstado}>
              <Text style={estilos.tituloEstado}>
                No se encontraron medicamentos
              </Text>

              <Text style={estilos.mensajeEstado}>
                {medicamentos.length === 0
                  ? 'Todavía no hay medicamentos registrados.'
                  : 'Prueba con otro término de búsqueda o cambia los filtros.'}
              </Text>

              {esAdministrador && (
                <TouchableOpacity
                  style={estilos.botonReintentar}
                  onPress={abrirRegistro}
                  accessibilityRole="button"
                >
                  <Text style={estilos.textoReintentar}>
                    + Registrar medicamento
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={estilos.lista}>
              {medicamentosFiltrados.map((item) => {
                const activo = item.activo === true;

                return (
                  <TouchableOpacity
                    key={String(item.medicamento_id)}
                    style={estilos.tarjetaMedicamento}
                    onPress={() => abrirDetalle(item)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver detalle de ${item.nombre_medicamento}`}
                  >
                    <View style={estilos.iconoMedicamento}>
                      <Text style={estilos.iconoTexto}>💊</Text>
                    </View>

                    <View style={estilos.informacionMedicamento}>
                      <Text style={estilos.nombreMedicamento}>
                        {item.nombre_medicamento}
                      </Text>

                      <Text style={estilos.detalleMedicamento}>
                        {item.concentracion ||
                          'Concentración no especificada'}
                      </Text>

                      <Text style={estilos.categoriaMedicamento}>
                        {item.categoria || 'Medicamento'}
                      </Text>
                    </View>

                    <View style={estilos.columnaDerecha}>
                      <View
                        style={[
                          estilos.etiquetaEstado,
                          activo
                            ? estilos.estadoActivo
                            : estilos.estadoInactivo,
                        ]}
                      >
                        <Text
                          style={[
                            estilos.textoEstadoEtiqueta,
                            activo
                              ? estilos.textoActivo
                              : estilos.textoInactivo,
                          ]}
                        >
                          {activo ? 'Activo' : 'Desactivado'}
                        </Text>
                      </View>

                      <Text style={estilos.chevron}>›</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        <MenuLateralDerecho />
      </View>
    </SafeAreaView>
  );
}

const estilos = {
  contenedor: {
    flex: 1,
    backgroundColor: '#F4F7F6',
  },
  contenidoPrincipal: {
    flex: 1,
    flexDirection: 'row',
  },
  areaContenido: {
    flex: 1,
  },
  contenidoScroll: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 36,
  },
  migas: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  enlaceMigas: {
    color: '#12665E',
    fontSize: 13,
    fontWeight: '600',
  },
  separadorMigas: {
    color: '#8A9693',
    fontSize: 13,
  },
  textoMigas: {
    color: '#65716E',
    fontSize: 13,
  },
  encabezadoPagina: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 26,
  },
  botonVolver: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#E3EFEC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  flechaVolver: {
    color: '#12665E',
    fontSize: 31,
    lineHeight: 34,
    marginTop: -3,
  },
  titulos: {
    flex: 1,
  },
  titulo: {
    color: '#173B36',
    fontSize: 25,
    fontWeight: '700',
  },
  subtitulo: {
    color: '#6B7774',
    fontSize: 13,
    marginTop: 5,
  },
  botonNuevo: {
    backgroundColor: '#12665E',
    borderRadius: 10,
    paddingHorizontal: 17,
    paddingVertical: 12,
    marginLeft: 10,
  },
  textoBotonNuevo: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  seccionFiltros: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EBE8',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
  },
  tituloFiltros: {
    color: '#173B36',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  busqueda: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#DDE5E2',
    borderRadius: 9,
    paddingHorizontal: 13,
    color: '#263D38',
    fontSize: 14,
    marginBottom: 13,
  },
  filaFiltros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  botonFiltro: {
    borderWidth: 1,
    borderColor: '#DDE5E2',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  botonFiltroSeleccionado: {
    backgroundColor: '#E3F1EE',
    borderColor: '#12665E',
  },
  textoFiltro: {
    color: '#5E6D68',
    fontSize: 13,
    fontWeight: '600',
  },
  textoFiltroSeleccionado: {
    color: '#12665E',
  },
  estadoCarga: {
    alignItems: 'center',
    paddingVertical: 55,
  },
  textoEstado: {
    color: '#65716E',
    marginTop: 12,
    fontSize: 14,
  },
  tarjetaEstado: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'flex-start',
  },
  tituloEstado: {
    color: '#173B36',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
  },
  mensajeEstado: {
    color: '#65716E',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  botonReintentar: {
    backgroundColor: '#12665E',
    borderRadius: 9,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  textoReintentar: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  lista: {
    gap: 12,
  },
  tarjetaMedicamento: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EBE8',
    borderRadius: 14,
    padding: 16,
  },
  iconoMedicamento: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: '#EAF4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconoTexto: {
    fontSize: 24,
  },
  informacionMedicamento: {
    flex: 1,
  },
  nombreMedicamento: {
    color: '#173B36',
    fontSize: 15,
    fontWeight: '700',
  },
  detalleMedicamento: {
    color: '#65716E',
    fontSize: 13,
    marginTop: 5,
  },
  categoriaMedicamento: {
    color: '#89938F',
    fontSize: 12,
    marginTop: 4,
  },
  columnaDerecha: {
    alignItems: 'center',
    marginLeft: 10,
  },
  etiquetaEstado: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 18,
  },
  estadoActivo: {
    backgroundColor: '#E2F5E9',
  },
  estadoInactivo: {
    backgroundColor: '#FDE9E7',
  },
  textoEstadoEtiqueta: {
    fontSize: 11,
    fontWeight: '700',
  },
  textoActivo: {
    color: '#187443',
  },
  textoInactivo: {
    color: '#B42318',
  },
  chevron: {
    color: '#12665E',
    fontSize: 30,
    lineHeight: 33,
    marginTop: 5,
  },
};
