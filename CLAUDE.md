# Contexto del Proyecto para Claude Code

¡Hola, Claude! Vas a continuar trabajando en este proyecto administrativo. Aquí tienes el resumen completo y detallado de lo que hemos construido hasta hoy para que tengas contexto total de la arquitectura, las tecnologías y las últimas modificaciones.

## Descripción del Proyecto
**Sistema Administrativo de Asistencia y Justificativos NFC (C.N.S.I.L.)**
Es una plataforma educativa moderna (versión 2.0) diseñada para registrar la asistencia de los alumnos a sus aulas mediante tarjetas NFC simuladas por un teléfono celular, así como para gestionar la justificación de inasistencias médicas. Todo el sistema funciona en **tiempo real (Real-time)**.


## Arquitectura y Tecnologías
El ecosistema está modularizado en 3 carpetas principales ubicadas en la raíz del proyecto:

1. **`server/` (Backend en Tiempo Real)**
   - **Tecnologías:** Node.js, Express, `socket.io`.
   - **Propósito:** Actúa como el cerebro central. Mantiene conexiones WebSocket con los clientes web y móviles para transmitir eventos (`asistencia:nueva`, `justificativo:nuevo`, `justificativo:estado`) en tiempo real. 
   - **Ejecución:** `node index.js` (puerto por defecto: 3000).

2. **`web/` (Panel de Control de Profesores)**
   - **Tecnologías:** React, Vite, TypeScript, TailwindCSS, `react-router-dom`, `lucide-react`, `socket.io-client`.
   - **Propósito:** Una SPA donde el profesor ("profe@cnsil.edu.py") monitorea en vivo las llegadas de los alumnos al aula y gestiona los justificativos pendientes (aprobando o denegando).
   - **Ejecución:** `npm run dev` (puerto por defecto: 5173).

3. **`mobile/` (App Móvil - Terminal de Entrada y Perfil del Alumno)**
   - **Tecnologías:** React Native (Expo), TypeScript, `lucide-react-native`, `socket.io-client`.
   - **Propósito:** 
     - **Modo Profesor:** Sirve como un "terminal inteligente" en la puerta del aula. Tiene un botón para "Simular Escaneo NFC" que emite eventos de llegada inmediatos hacia el servidor.
     - **Modo Alumno:** Permite enviar justificativos médicos que aparecen instantáneamente en la pantalla de la cátedra del profesor.
   - **Conexión:** La IP local del PC (por ejemplo `http://192.168.100.15:3000`) se configura en `src/services/socket.ts`.
   - **Ejecución:** `npx expo start`.

## Últimos Cambios Realizados (Historial Reciente)
Para que sepas en qué estado quedó el código antes de tu llegada, estos fueron los ajustes recientes:
- **Limpieza profunda:** Se eliminaron archivos de plantilla inútiles (`App.css`, `mock.ts`, imágenes por defecto de Vite) y archivos gigantes de depuración (`expo_time.json`, `rn_time.json`) manteniendo el espacio de trabajo prístino.
- **Identidad Gráfica Institucional:** Se reemplazó el icono de escudo genérico por el ícono de **Colegio (`School` de lucide-react)**, unificando el diseño de la pantalla de Login Web con la app móvil.
- **Mejoras UX/UI y Traducciones:** 
  - Se corrigió el botón "Salir" del `TeacherPanel.tsx` inyectándole navegación funcional hacia la ruta `/dashboard`.
  - Se tradujo toda la app móvil al español ("Control de Asistencia NFC", "Simular Escaneo NFC").
- **Control de Versiones:** El proyecto `mobile` ya fue commiteado en Git dejando el *working tree* limpio. 

## Guía para Continuar Trabajando
- Respeta la arquitectura de WebSockets para cualquier nueva característica que implique comunicación celular <-> PC.
- Para probar el proyecto debes iniciar siempre los tres servicios en 3 terminales separadas (`server`, `web`, `mobile`).
- ¡El proyecto tiene potencial para escalar! Sigue ayudando al usuario (Dylan) manteniendo respuestas amables, claras y concisas en español.
