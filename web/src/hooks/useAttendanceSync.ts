import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { BroadcastMessage } from '../types';

// En producción, seteá VITE_SERVER_URL en Vercel con la URL pública del backend (Render).
// En desarrollo local, si no está seteada, cae en localhost:3000.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export function useAttendanceSync(onMessageReceived?: (msg: BroadcastMessage) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(SERVER_URL, { transports: ['websocket'] });

    socketRef.current.on('connect', () => {
      console.log('Web Dashboard conectado a Socket.io:', socketRef.current?.id);
    });

    if (onMessageReceived) {
      socketRef.current.on('asistencia:nueva', (data) => {
        onMessageReceived({ type: 'NFC_SCAN', payload: data });
      });

      socketRef.current.on('justificativo:nuevo', (data) => {
        onMessageReceived({ type: 'JUSTIFICATION_SUBMIT', payload: data });
      });

      socketRef.current.on('justificativo:estado', (data) => {
        onMessageReceived({ type: 'JUSTIFICATION_UPDATE', payload: data });
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onMessageReceived]);

  const broadcast = useCallback((message: BroadcastMessage) => {
    if (!socketRef.current) return;
    
    if (message.type === 'NFC_SCAN') {
      socketRef.current.emit('asistencia:nueva', message.payload);
    } else if (message.type === 'JUSTIFICATION_SUBMIT') {
      socketRef.current.emit('justificativo:nuevo', message.payload);
    } else if (message.type === 'JUSTIFICATION_UPDATE') {
      socketRef.current.emit('justificativo:estado', message.payload);
    }
  }, []);

  return { broadcast };
}
