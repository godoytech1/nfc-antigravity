# C.N.S.I.L. NFC Attendance System

Sistema de asistencia con tecnología NFC, en tiempo real y publicado 24/7 — sin depender de que ninguna computadora esté prendida.

## Arquitectura (desde agosto 2026)

| Parte | Dónde vive | Tecnología |
|---|---|---|
| Panel del profesor | **Vercel** (público, 24/7) | React + Vite |
| Tiempo real (asistencias, justificativos) | **Supabase Realtime** (gratis, sin tarjeta) | `@supabase/supabase-js` |
| App del celular | Expo Go (tu teléfono) | React Native |
| `server/` | Ya no se usa en producción — queda como referencia histórica | Node + Socket.io |

Ya **no hace falta** levantar ningún servidor propio, ni que el celular esté en la misma red Wi-Fi que una PC: todo pasa por Supabase, así que funciona desde cualquier lugar con internet.

## Panel del profesor (ya publicado)

👉 **https://web-psi-green-v54f2g8w11.vercel.app**

Cada vez que se sube un cambio a la rama `master` en GitHub, Vercel lo vuelve a publicar solo.

## Cómo correr la app del celular

Solo necesitás **una terminal**:

```bash
cd mobile
npx expo start
```

1. Aparece un código QR.
2. Abrí **Expo Go** en tu celular y escaneá el QR (¡ya no hace falta estar en la misma red que ninguna PC!).
3. Iniciá sesión escribiendo `profe` (modo profesor) o `alumno` (modo alumno) en el correo.

## Flujo de prueba

- Abrí el panel del profesor (el link de arriba) en una compu o en el celular.
- En la app del celular, entrá como `profe` y tocá **"Simular Escaneo NFC"**.
- La llegada aparece al instante en el panel — sin importar en qué red esté cada uno.

## Desarrollo local (opcional)

Si querés tocar el código del panel web y verlo antes de publicar:

```bash
cd web
npm run dev
```

Abre `http://localhost:5173`. No hace falta levantar `server/` — el hook `useAttendanceSync` ya habla directo con Supabase.
