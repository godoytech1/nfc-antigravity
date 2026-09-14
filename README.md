# Sistema de Asistencia NFC — C.N.S.I.L.

Registro de asistencia escolar con tarjetas NFC y gestión de justificativos,
en tiempo real, publicado 24/7 y sin depender de que ninguna computadora esté
prendida.

**Panel de profesores:** https://web-psi-green-v54f2g8w11.vercel.app

## Qué hace

**Profesor (app + panel web)**
- Registra la llegada de cada alumno acercando su tarjeta NFC.
- Ve en vivo quién llegó, quién llegó tarde y quién faltó, por curso y por día.
- Aprueba o rechaza justificativos, viendo el motivo y la fecha que justifican.
- Consulta el historial de asistencia de cualquier alumno.
- Define el horario de entrada y la tolerancia del colegio.

**Alumno (app)**
- Ve su propio historial: asistencias puntuales, tardanzas y faltas.
- Envía justificativos para una falta concreta y sigue su estado.

## Arquitectura

| Parte | Dónde vive | Tecnología |
|---|---|---|
| Panel de profesores | Vercel (público, 24/7) | React + Vite + Tailwind |
| App del celular | APK propio / Expo | React Native (Expo) |
| Cuentas, datos y tiempo real | Supabase (plan gratuito) | Postgres + Auth + Realtime |

No hace falta levantar ningún servidor propio ni estar en la misma red Wi‑Fi:
todo pasa por Supabase, así que funciona desde cualquier lugar con internet.

## Cómo está armada la lógica

- **Una llegada por alumno por día**, garantizada por un índice único en la
  base — no por una validación del celular, que se podría saltear.
- **Puntual o tarde lo decide el servidor** con la hora de entrada y la
  tolerancia configuradas. La app no puede mentir sobre el horario.
- **Las faltas se deducen** de los días en que hubo clase en ese curso: no hay
  datos inventados ni un calendario escolar harcodeado.
- **Cada justificativo justifica una fecha concreta**, así se puede cruzar con
  la falta que corresponde.

## Cuentas

El registro desde la app **siempre crea una cuenta de alumno**. Las cuentas de
profesor las habilita el administrador con una consulta SQL — así nadie puede
autoasignarse permisos de profesor desde la app.

## Desarrollo local

```bash
cd web && npm run dev      # panel web en http://localhost:5173
cd mobile && npx expo start  # app del celular
```

Las migraciones SQL están en `supabase/` y se corren en orden desde el SQL
Editor del dashboard de Supabase.
