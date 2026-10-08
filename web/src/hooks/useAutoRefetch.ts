import { useEffect, useRef } from 'react';

// El tiempo real (Realtime) no repite lo que pasó mientras la pestaña estaba dormida o sin
// conexión: un justificativo enviado en ese rato nunca aparecía hasta recargar a mano.
// Por eso, además del tiempo real, se vuelve a leer al volver a la pestaña y cada minuto.
export function useAutoRefetch(cargar: () => void) {
  const ultima = useRef(cargar);
  ultima.current = cargar;

  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') ultima.current();
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    window.addEventListener('online', alVolver);
    const timer = setInterval(alVolver, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
      window.removeEventListener('online', alVolver);
      clearInterval(timer);
    };
  }, []);
}
