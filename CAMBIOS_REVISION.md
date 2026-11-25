# Revisión de PetCare — cambios realizados

Verificado al final: **0 enlaces rotos** y la app **compila y genera sus 53 pantallas sin errores**
(`npx expo export --platform web`). Antes fallaba en `atenciones/registrarConsulta`.

---

## 1. Enlaces rotos corregidos (10)

| Archivo | Antes (no existía) | Ahora |
|---|---|---|
| `mascotas/fichaMascota.jsx` | `/historiaMascota` | `/mascotas/historiaMascota` ← **por esto no abría el historial de la mascota** |
| `medicamentosAdmin/detalleMedicamento.jsx` | `/administracion` | `/administracion/administracion` |
| `mascotaAdmin/gestionMascotas.jsx` | `/administracion` | `/administracion/administracion` |
| `historialCambios/detalle.jsx` | `/administracion` | `/administracion/administracion` |
| `atenciones/nuevaAtencion.jsx` | `/atenciones` | `/atenciones/atenciones` |
| `atenciones/registrarAtencion.jsx` | `/atenciones` | `/atenciones/atenciones` |
| `actividades/registrarActividad.jsx` | `/login` (al cerrar sesión) | `/` (la pantalla de login es `index.jsx`) |
| `atenciones/nuevaAtencion.jsx` | `/login` | `/` |
| `atenciones/registrarAtencion.jsx` | `/login` | `/` |
| `dieta/registrar.jsx` | `/login` | `/` |

> En Expo Router, `/perfil` solo funciona si existe `perfil/index.jsx`. Como las pantallas se llaman
> `perfil/perfil.jsx`, `atenciones/atenciones.jsx`, etc., la ruta tiene que ir completa.

## 2. Pantallas que hacían caer la app

- **`dieta/registrar.jsx`**: después de guardar la dieta mandaba a `/dieta/detalle`, que estaba **vacía**
  → la app se caía justo al terminar. Ahora va a `/recetas/detalle`, que **ya muestra la dieta registrada (RF54)**.
- Borrados 3 archivos de pantalla **vacíos** (0 líneas), que Expo Router trataba como pantallas y hacían fallar la app:
  `atenciones/registrarConsulta.jsx`, `dieta/index.jsx`, `dieta/detalle.jsx`. Ninguna otra pantalla los abría.

## 3. Exportar historial (Seguimiento)

En el celular ya funcionaba. **En web fallaba sin mostrar nada**: `Print.printToFileAsync` no existe en el navegador
y `Alert.alert` de React Native no muestra mensajes en web.
- Se agregó la misma solución que ya usa Indicadores: en web abre el reporte en una pestaña e imprime
  (el usuario elige **"Guardar como PDF"**).
- Los avisos de exportar ahora se ven también en web.

## 4. Limpieza

- Borrados **59 archivos basura de 0 bytes** en la raíz (`abrirDetalle(item)}`, `cambiarMes(1)}`, `notepad`, `dir`…).
  Se crean al pegar código JSX en la terminal de Windows: el `>` del código se toma como "guardar en archivo".
- **Borrado `cambiarContrasenaAsistente.js`**: tenía el ID de un usuario y **su contraseña en texto plano**.
  ⚠️ Si ese archivo llegó a subirse a GitHub, **cambien la contraseña de ese usuario en Supabase**:
  borrar el archivo no la quita del historial de commits.

---

## Pendientes que NO toqué (para decidir en equipo)

1. **Citas — falta "vincular":**
   - `cancelarCita()` existe y tiene test, pero **ninguna pantalla la llama**: no hay botón para cancelar una cita.
   - `atenciones.cita_id` **nunca se guarda**: cuando se atiende a la mascota, la atención no queda unida a su cita.
   - Las citas se ven en Seguimiento, pero no en el historial de la mascota.
   - En el Project Charter las citas estaban **fuera de alcance**: actualicen el RF51 en el documento.
2. **20 archivos vacíos que no usa nadie** (no rompen nada, pero ensucian el repositorio):
   `components/ui/*` (boton, campoTexto, encabezado, mensajeAlerta), `components/inicio/*`, `components/actividades/*`,
   `components/atenciones/*`, `components/seguimiento/*`, `controllers/recetas/recetasControlador.js`,
   `controllers/dieta/dietaControlador.js`, `services/panelInicioServicio.js`,
   `services/atencion/atencionesServicio.js`, `services/atencion/panelInicioServicio.js`.
   Llénenlos o bórrenlos.
3. **Copias viejas dentro del proyecto:** carpeta `src/atenciones/` (fuera de `src/app`, no se usa y trae un enlace roto),
   `src.zip`, `propietarioDAO_respaldo.txt`, `perfil/perfil.respaldo.txt`. Mejor sacarlas antes de entregar.
4. **`expo-dev-client` instalado:** al hacer `npx expo start`, la app arranca en modo "development build".
   Para abrirla con **Expo Go** presionen la tecla **`s`** en la terminal antes de escanear el QR.

---

## Checklist de build y despliegue (guía de la profesora)

| Pregunta | Respuesta del equipo |
|---|---|
| ¿Cuál es la herramienta de build de su stack? | **EAS Build** (Expo Application Services), para React Native con Expo. |
| ¿Dónde están definidas las dependencias? | En **`package.json`**; la configuración de la app en **`app.json`** y la del build en **`eas.json`**. |
| ¿Qué comando genera el resultado final? | **`eas build -p android --profile preview`** (el perfil `preview` de `eas.json` genera APK). |
| ¿Qué archivo o carpeta se generó? | Un archivo **`.apk`** instalable en Android (se descarga del enlace que da EAS). No genera carpeta `build/` ni `dist/`. |
| ¿En qué servidor lo van a desplegar? | **No aplica: backend gestionado por Supabase** (base de datos, autenticación y API ya están alojados por el proveedor). La app es móvil y se instala directo en el celular. |
| ¿Ya probaron que funciona en su computadora antes de desplegar? | *(Confirmen antes de entregar)* Sí: con **`npx expo start`** y la app abierta en el celular con Expo Go (QR). |
