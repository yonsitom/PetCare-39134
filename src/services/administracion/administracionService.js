
import { supabase } from '../supabase';

export async function consultarIndicadoresAdministracion() {
  const [
    usuariosTotal,
    usuariosActivos,
    usuariosInactivos,
    mascotasTotal,
    propietariosTotal,
    atencionesTotal,
    actividadesTotal,
    cambiosTotal,
  ] = await Promise.all([
    supabase.from('perfiles').select('perfil_id', { count: 'exact', head: true }),
    supabase.from('perfiles').select('perfil_id', { count: 'exact', head: true }).eq('estado_cuenta', 'Activo'),
    supabase.from('perfiles').select('perfil_id', { count: 'exact', head: true }).eq('estado_cuenta', 'Inactivo'),
    supabase.from('mascotas').select('numero_historia', { count: 'exact', head: true }),
    supabase.from('propietarios').select('propietario_id', { count: 'exact', head: true }),
    supabase.from('atenciones').select('atencion_id', { count: 'exact', head: true }),
    supabase.from('actividades').select('*', { count: 'exact', head: true }),
    supabase.from('historial_cambios').select('*', { count: 'exact', head: true }),
  ]);

  const resultados = [
    usuariosTotal,
    usuariosActivos,
    usuariosInactivos,
    mascotasTotal,
    propietariosTotal,
    atencionesTotal,
    actividadesTotal,
    cambiosTotal,
  ];

  const error = resultados.find((resultado) => resultado.error);

  if (error) {
    console.error('Error consultando indicadores:', error.error);
    throw error.error;
  }

  return {
    usuarios: {
      total: usuariosTotal.count ?? 0,
      activos: usuariosActivos.count ?? 0,
      inactivos: usuariosInactivos.count ?? 0,
    },
    mascotas: {
      total: mascotasTotal.count ?? 0,
      activos: mascotasTotal.count ?? 0,
      inactivos: 0,
    },
    propietarios: {
      total: propietariosTotal.count ?? 0,
      activos: propietariosTotal.count ?? 0,
      inactivos: 0,
    },
    atenciones: atencionesTotal.count ?? 0,
    actividades: actividadesTotal.count ?? 0,
    cambios: cambiosTotal.count ?? 0,
  };
}
