# PetCare · Sistema de seguimiento de actividades de atención veterinaria

Aplicación móvil para el **Centro Veterinario del Sur** que centraliza el registro de propietarios y mascotas, y da seguimiento en tiempo real a las atenciones veterinarias y sus actividades (pendiente, completada o no realizada), con avance porcentual, línea de tiempo e historial de cambios.

**Curso:** Curso Integrador I: Sistemas – Software · UTP · Sección 39134 · Equipo 3 · 2026-II

## Tecnologías

| Capa | Tecnología |
|---|---|
| App móvil | React Native 0.86 + Expo 57 (JavaScript), Expo Router |
| Base de datos y autenticación | Supabase (PostgreSQL, Auth, Row Level Security) |
| Pruebas | Jest + jest-expo + @testing-library/react-native |
| Librerías de apoyo | @supabase/supabase-js (datos), expo-print + expo-sharing (archivos PDF), react-native-logs (logging), expo-secure-store (sesión cifrada) |

## Arquitectura

MVC + DAO: **Vista** (`src/app`, `src/components`) → **Controlador** (`src/controllers`, `src/services`) → **Modelo/DAO** (`src/dao`) → Supabase. Diagrama: [`docs/diagramas/arquitectura.png`](docs/diagramas/arquitectura.png).

## Perfiles de usuario

- **Administrador:** gestiona cuentas de usuario, estado de propietarios y mascotas, indicadores e historial de cambios.
- **Asistente:** registra propietarios, mascotas, atenciones y actividades, y actualiza su estado.

## Cómo ejecutar

```bash
npm install        # instala las dependencias
npx expo start     # inicia la app (presiona "a" para abrirla en Android)
npm test           # ejecuta las pruebas automatizadas (Jest)
```

Generar la APK: `npx eas build -p android --profile preview`

## Estructura del repositorio

```
src/
  app/          Pantallas (Vista) – rutas de Expo Router
  components/   Componentes reutilizables de interfaz
  controllers/  Controladores por módulo
  services/     Lógica de requerimientos y servicios de apoyo
  dao/          Acceso a datos (único punto que consulta Supabase)
  utils/        Logger y validaciones
  tests/        Pruebas unitarias (TDD)
docs/
  entregables/    APF1, APF2 y APF3 en PDF
  base_de_datos/  Script SQL y modelo lógico
  diagramas/      Diagramas fuente (arquitectura, secuencia)
```

## Ramas

| Rama | Uso |
|---|---|
| `main` | Versión estable: lo que se entrega y se compila como APK. Solo recibe cambios mediante Pull Request. |
| `feature/<funcionalidad>` | Desarrollo de una funcionalidad nueva (ej. `feature/librerias`). Se une a `main` con un Pull Request. |
| `docs/<tema>` | Documentación del proyecto (ej. `docs/documentacion`). |

## Convención de mensajes de commit

Verbo en presente (3.ª persona) + qué se hizo + módulo, en español. Ejemplos:

- `Implementa registro y consulta de propietarios y mascotas`
- `Corrige validación del DNI en el registro de propietarios`
- `Agrega exportación del detalle de atención a PDF`
- `Documenta la estructura del proyecto en el README`

Verbos: **Implementa** (función nueva), **Agrega** (archivo o librería), **Corrige** (error), **Refactoriza** (mejora sin cambiar el comportamiento), **Documenta** (documentación), **Prueba** (pruebas).

## Equipo

| Integrante | Usuario GitHub |
|---|---|
| Narvaez Francia, Camila Noemi | NarvaezCamila |
| Noriega Pardo, Jhon Kevin | yonsitom |
| [Completar] | soph-iaa |
| [Completar] | [usuario] |
