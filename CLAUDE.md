# Contexto del Proyecto para Claude Code

## Descripción
**Sistema Administrativo de Asistencia y Justificativos NFC (C.N.S.I.L.)**

Plataforma educativa para registrar la asistencia de alumnos mediante tarjetas
NFC (hoy simuladas desde el celular del profesor) y gestionar la justificación
de inasistencias. Todo sincronizado en tiempo real entre la app móvil y el
panel web.

## Arquitectura

Tres piezas, una sola base de datos (Supabase):

| Carpeta | Qué es | Stack |
|---|---|---|
| `mobile/` | App del celular (Profesor y Alumno) | Expo / React Native, repo git **propio** |
| `mobile-apk/` | Copia de `mobile/` para compilar el APK con EAS | ídem, repo git **propio** |
| `web/` | Panel de profesores, publicado en Vercel | React + Vite + Tailwind |
| `supabase/` | Migraciones SQL (se corren a mano en el dashboard) | SQL |

`mobile/` y `mobile-apk/` **no** se trackean desde el repo raíz (están en el
`.gitignore`): cada una tiene su propio historial. Todo cambio en `mobile/`
hay que espejarlo a mano en `mobile-apk/` antes de compilar un APK.

### Base de datos (Supabase, plan Free)

Proyecto `nfc-antigravity` (ref `scejwfjmbeerwymwufwe`). Se usa **Auth**,
**tablas con RLS** y **Realtime (postgres_changes)**. Ya **no** se usa
broadcast efímero: todo se persiste.

| Tabla | Para qué |
|---|---|
| `profiles` | Nombre, rol (`alumno`/`profesor`) y curso de cada cuenta. Se llena sola con un trigger al registrarse. |
| `asistencias` | Una llegada por alumno por día (índice único). El estado `ontime`/`late` lo calcula un **trigger**, no el cliente. |
| `justificativos` | Justificativos, cada uno atado a una **fecha** concreta. |
| `configuracion` | Fila única: hora de entrada y tolerancia del colegio. |

Las migraciones están en `supabase/*.sql` y se corren **en orden** desde el SQL
Editor del dashboard:
`justificativos.sql` → `profiles.sql` → `asistencias.sql` → `logica-asistencia.sql`.

### Decisiones de seguridad (no romper)

- **El rol nunca viene del cliente.** El trigger `handle_new_user` fuerza
  `alumno` en todo registro, ignorando lo que mande la app. Para crear un
  profesor hay que promoverlo a mano por SQL (ver el final de `profiles.sql`).
- **Nadie se puede cambiar el rol a sí mismo:** el trigger
  `prevent_role_self_change` revierte el intento aunque la API devuelva 200.
- **La puntualidad no se puede falsear:** el trigger `set_asistencia_fields`
  pisa `status` y `fecha` con la hora real del servidor.
- **RLS acotado:** el alumno ve solo lo suyo; el profesor ve todo y es el
  único que puede registrar asistencias, aprobar/rechazar y borrar.
- El panel web **rechaza cuentas que no sean de profesor**.

La anon key de Supabase es pública por diseño (protegida por RLS) — por eso
está en el código y no en un `.env` secreto.

## Producción

- **Panel web:** https://web-psi-green-v54f2g8w11.vercel.app
  (deploy automático en cada push a `master` del repo raíz).
- **App:** APK por EAS Build, canal `preview`. Los cambios que son solo JS se
  publican con `eas update`; si se agrega una librería **nativa** hay que
  compilar un APK nuevo y subir `versionCode` en `mobile-apk/app.json`.

## Lógica de asistencia

- Hay **un registro por alumno por día**. Un segundo escaneo del mismo día no
  es un error: se informa "ya estaba registrado".
- **Puntual vs tarde** sale de `configuracion` (hora de entrada + tolerancia),
  editable por el profesor desde Ajustes.
- **Las faltas se derivan, no se inventan:** un día cuenta como día de clase
  si hubo al menos una llegada de ese curso. Los alumnos del curso sin
  registro ese día figuran como ausentes. No hay calendario escolar ni
  feriados harcodeados.

## Cómo trabajar acá

- Cambios en `mobile/` → espejar a `mobile-apk/` antes de compilar.
- Verificar con `npx tsc --noEmit` en `mobile/` y `npm run build` en `web/`.
- En `mobile-apk/` el `tsc` de esa copia se queda sin stack; usar
  `node --stack-size=8000 node_modules/typescript/lib/tsc.js --noEmit`.
- Responder siempre en español.
