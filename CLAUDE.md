# Contexto del Proyecto para Claude Code

¡Hola, Claude! Vas a continuar trabajando en este proyecto administrativo. Aquí tienes el resumen completo y detallado de lo que hemos construido hasta hoy para que tengas contexto total de la arquitectura, las tecnologías y las últimas modificaciones.

## Descripción del Proyecto
**Sistema Administrativo de Asistencia y Justificativos NFC (C.N.S.I.L.)**
Es una plataforma educativa moderna (versión 2.0) diseñada para registrar la asistencia de los alumnos a sus aulas mediante tarjetas NFC simuladas por un teléfono celular, así como para gestionar la justificación de inasistencias médicas. Todo el sistema funciona en **tiempo real (Real-time)**.


## Arquitectura y Tecnologías (actualizado agosto 2026)
El ecosistema está modularizado en 3 carpetas principales ubicadas en la raíz del proyecto. **Desde agosto 2026 el tiempo real ya NO pasa por un servidor propio**: se reemplazó Socket.io por **Supabase Realtime** (canal `attendance`, eventos `asistencia:nueva` / `justificativo:nuevo` / `justificativo:estado`), así que no hace falta levantar nada para que web y mobile se hablen — solo necesitan internet.

1. **`server/` (Backend legado, ya NO se usa en producción)**
   - **Tecnologías:** Node.js, Express, `socket.io`.
   - **Estado:** Se mantiene en el repo como referencia histórica, pero el panel web y la app móvil ya no se conectan a él. Si algún día se necesita volver a un servidor propio, está la lógica de referencia acá.

2. **`web/` (Panel de Control de Profesores) — publicado en Vercel**
   - **Tecnologías:** React, Vite, TypeScript, TailwindCSS, `react-router-dom`, `lucide-react`, `@supabase/supabase-js`.
   - **Propósito:** Una SPA donde el profesor ("profe@cnsil.edu.py") monitorea en vivo las llegadas de los alumnos al aula y gestiona los justificativos pendientes (aprobando o denegando).
   - **Tiempo real:** `src/services/realtime.ts` + `src/hooks/useAttendanceSync.ts`.
   - **Producción:** https://web-psi-green-v54f2g8w11.vercel.app (auto-deploy en cada push a `master` vía GitHub → Vercel).
   - **Desarrollo local:** `npm run dev` (puerto por defecto: 5173) — no necesita `server/` corriendo.

3. **`mobile/` (App Móvil - Terminal de Entrada y Perfil del Alumno)**
   - **Tecnologías:** React Native (Expo), TypeScript, `lucide-react-native`, `@supabase/supabase-js`.
   - **Propósito:**
     - **Modo Profesor:** "terminal inteligente" en la puerta del aula (botón "Simular Escaneo NFC"), además de **Mis Clases** (lista de cursos → roster de alumnos con estado presente/ausente).
     - **Modo Alumno:** enviar justificativos médicos, ver **Historial** de llegadas y **Ajustes** (perfil + preferencias).
   - **Conexión:** ya NO depende de la IP local de ninguna PC — habla directo con Supabase desde cualquier red. Configuración en `src/services/realtime.ts`.
   - **Ejecución:** `npx expo start` (no requiere levantar `server/` ni `web/`).
   - Repo git propio (nested), separado del repo principal — no tocar con `git add -A` en la raíz sin revisar antes.

## Cuentas / infraestructura usadas
- **GitHub:** `godoytech1/nfc-antigravity` (público, sin secretos — la Supabase anon key es pública por diseño).
- **Vercel:** proyecto `web`, team `godoytech1s-projects`, deploy automático desde GitHub.
- **Supabase:** proyecto `nfc-antigravity` (plan Free, sin tarjeta) — solo se usa Realtime (Broadcast), no hay tablas ni Auth configurados. Se pausa solo tras 1 semana sin uso (se reactiva con un clic desde el dashboard).

## Últimos Cambios Realizados (Historial Reciente)
- **Migración de arquitectura:** Socket.io (servidor propio) → Supabase Realtime, para poder publicar todo gratis y 24/7 sin depender de ninguna computadora encendida.
- **Nuevas pantallas mobile:** Historial y Ajustes (Alumno), Mis Clases + roster por curso (Profesor) — implementadas a partir de bocetos a mano que mandó Araceli por WhatsApp.
- **Identidad Gráfica Institucional:** ícono de Colegio (`School` de lucide-react) unificado entre Login Web y app móvil.
- **Despliegue:** `web/` publicado en Vercel; `mobile/` sigue usándose vía Expo Go pero ya sin restricción de red local.

## Guía para Continuar Trabajando
- El tiempo real vive en `web/src/services/realtime.ts` y `mobile/src/services/realtime.ts` (Supabase Broadcast) — cualquier evento nuevo debe registrarse en la constante `EVENTS`/`EVENT_TO_MESSAGE_TYPE` de ambos lados.
- No revivir `server/` salvo que se decida explícitamente volver a un servidor propio.
- Sigue ayudando al usuario (Dylan) manteniendo respuestas amables, claras y concisas en español.
