import { useEffect, useState } from 'react';
import { ExternalLink, FileText } from 'lucide-react';
import { supabase } from '../services/realtime';
import type { Attachment } from '../types';

function tamano(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Adjuntos de un justificativo (fotos y archivos que subió el alumno desde la app).
// El bucket "justificativos" es privado: se piden enlaces temporales (1 hora) al abrir.
export default function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  const [urls, setUrls] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let vivo = true;
    setUrls(null);
    supabase.storage
      .from('justificativos')
      .createSignedUrls(
        attachments.map((a) => a.path),
        3600,
      )
      .then(({ data }) => {
        if (!vivo) return;
        const mapa: Record<string, string> = {};
        for (const fila of data ?? []) if (fila.path && fila.signedUrl) mapa[fila.path] = fila.signedUrl;
        setUrls(mapa);
      });
    return () => {
      vivo = false;
    };
  }, [attachments]);

  if (attachments.length === 0) return null;

  return (
    <div>
      <label className="text-xs font-bold text-label uppercase tracking-wide">
        Adjuntos ({attachments.length})
      </label>
      <div className="mt-1.5 flex flex-col gap-2">
        {urls === null ? <p className="text-sm text-muted">Cargando adjuntos...</p> : null}
        {urls !== null
          ? attachments.map((a) => {
              const url = urls[a.path];
              const esImagen = a.type.startsWith('image/');
              const contenido = (
                <>
                  {url && esImagen ? (
                    <img src={url} alt={a.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
                      <FileText size={20} className="text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-title truncate">{a.name}</p>
                    <p className="text-xs text-muted">{url ? tamano(a.size) : 'No se pudo cargar'}</p>
                  </div>
                  {url ? <ExternalLink size={16} className="text-muted shrink-0" /> : null}
                </>
              );
              return url ? (
                <a
                  key={a.path}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 p-2 rounded-xl bg-bg hover:bg-border transition-colors"
                >
                  {contenido}
                </a>
              ) : (
                <div key={a.path} className="flex items-center gap-3 p-2 rounded-xl bg-bg">
                  {contenido}
                </div>
              );
            })
          : null}
      </div>
    </div>
  );
}
