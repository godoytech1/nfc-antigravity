import { useEffect, useCallback, useRef } from 'react';
import { supabase, CHANNEL_NAME } from '../services/realtime';
import type { BroadcastMessage } from '../types';

type SocketEvent = 'asistencia:nueva' | 'justificativo:nuevo' | 'justificativo:estado';

const EVENT_TO_MESSAGE_TYPE: Record<SocketEvent, BroadcastMessage['type']> = {
  'asistencia:nueva': 'NFC_SCAN',
  'justificativo:nuevo': 'JUSTIFICATION_SUBMIT',
  'justificativo:estado': 'JUSTIFICATION_UPDATE',
};

const MESSAGE_TYPE_TO_EVENT: Record<BroadcastMessage['type'], SocketEvent> = {
  NFC_SCAN: 'asistencia:nueva',
  JUSTIFICATION_SUBMIT: 'justificativo:nuevo',
  JUSTIFICATION_UPDATE: 'justificativo:estado',
};

export function useAttendanceSync(onMessageReceived?: (msg: BroadcastMessage) => void) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME);
    channelRef.current = channel;

    if (onMessageReceived) {
      (Object.keys(EVENT_TO_MESSAGE_TYPE) as SocketEvent[]).forEach((event) => {
        channel.on('broadcast', { event }, ({ payload }) => {
          onMessageReceived({ type: EVENT_TO_MESSAGE_TYPE[event], payload } as BroadcastMessage);
        });
      });
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Web Dashboard conectado a Supabase Realtime');
      }
    });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [onMessageReceived]);

  const broadcast = useCallback((message: BroadcastMessage) => {
    const channel = channelRef.current;
    if (!channel) return;
    channel.send({ type: 'broadcast', event: MESSAGE_TYPE_TO_EVENT[message.type], payload: message.payload });
  }, []);

  return { broadcast };
}
