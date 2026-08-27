# C.N.S.I.L. NFC Attendance System (Rediseño Arquitectónico)

Este repositorio contiene el sistema de asistencia dividido en tres módulos principales para permitir la conexión en tiempo real a través de una red local, permitiendo utilizar un dispositivo móvil físico con Expo Go.

## Requisitos Previos
- Node.js instalado.
- La aplicación **Expo Go** instalada en tu teléfono móvil (iOS o Android).
- Tu computadora y tu teléfono deben estar conectados a la **misma red Wi-Fi**.

---

## 1. Configuración de Red (IP Local)

Para que el celular físico pueda enviar los eventos NFC al Dashboard Web, necesita saber la dirección IP de tu computadora.

1. Abre tu terminal y descubre tu IP local (en Windows ejecuta `ipconfig` y busca la "Dirección IPv4" de tu adaptador Wi-Fi, por ejemplo: `192.168.1.52`).
2. Ve al archivo `mobile/src/services/socket.ts`.
3. Reemplaza el valor de `SERVER_URL` con tu IP local:
   ```typescript
   export const SERVER_URL = 'http://192.168.1.52:3000'; // Usa tu IP real
   ```

---

## 2. Cómo ejecutar el proyecto completo

Necesitarás abrir **3 terminales** distintas en la carpeta raíz del proyecto (`NFC Antigravity`).

### Terminal 1: Servidor Backend (Socket.io)
Este servidor triangula los mensajes entre el celular y la web.
```bash
cd server
npm start # O simplemente: node index.js
```
*Deberías ver: "Servidor de Socket.io ejecutándose en http://0.0.0.0:3000"*

### Terminal 2: Dashboard Web (React + Vite)
El panel administrativo del profesor.
```bash
cd web
npm run dev
```
*Abre http://localhost:5173 en tu navegador.*

### Terminal 3: Aplicación Móvil (Expo React Native)
```bash
cd mobile
npx expo start
```
1. Aparecerá un código QR grande en la terminal.
2. Abre la app **Expo Go** en tu celular y escanea el QR.
3. La aplicación móvil se abrirá en tu teléfono físico.

---

## 3. Flujo de Prueba Real
- En tu PC: Observa el Dashboard Web (`localhost:5173`) esperando llegadas.
- En tu Celular: Inicia sesión como `profe` y toca el botón "Simular Lector (Tocar)".
- **¡Magia!** La llegada registrada en tu teléfono aparecerá instantáneamente en la pantalla de tu computadora a través de la red local.
