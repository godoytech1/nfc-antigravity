const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // Permitir peticiones desde Expo (celular) y web (localhost)
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  // Escucha evento de asistencia nueva desde la App Móvil y la retransmite
  socket.on('asistencia:nueva', (data) => {
    console.log('Asistencia registrada:', data);
    // Transmitir a todos los clientes (incluyendo el Dashboard Web)
    io.emit('asistencia:nueva', data);
  });

  // Escucha evento de nuevo justificativo
  socket.on('justificativo:nuevo', (data) => {
    console.log('Nuevo justificativo:', data);
    io.emit('justificativo:nuevo', data);
  });

  // Escucha la respuesta del profesor (aprobado/denegado)
  socket.on('justificativo:estado', (data) => {
    console.log('Estado de justificativo actualizado:', data);
    io.emit('justificativo:estado', data);
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de Socket.io ejecutándose en http://0.0.0.0:${PORT}`);
});
