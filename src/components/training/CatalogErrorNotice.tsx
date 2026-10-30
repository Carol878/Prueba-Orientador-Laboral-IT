/**
 * @file CatalogErrorNotice.tsx
 * @description Aviso visible cuando no se pueden cargar los cursos desde Supabase.
 * Muestra el motivo y, plegado, el detalle técnico para localizar el fallo.
 */

import { AlertTriangle, RotateCw } from 'lucide-react';

import type { CatalogError } from '../../data/trainingRepository';

interface CatalogErrorNoticeProps {
  error: CatalogError;
  onRetry: () => void;
}

export default function CatalogErrorNotice({ error, onRetry }: CatalogErrorNoticeProps) {
  return (
    <div role="alert" className="p-4 border border-danger border-l-2 rounded bg-danger-soft">
      <p className="flex items-start gap-2 text-sm font-semibold text-fg mb-1">
        <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" aria-hidden="true" />
        No se han podido cargar los cursos
      </p>
      <p className="text-sm text-fg-2 mb-3">{error.message}</p>
      <details className="mb-3">
        <summary className="text-xs text-fg-3 cursor-pointer">Detalle técnico</summary>
        <p className="mt-2 text-xs text-fg-2 font-mono break-words">
          [{error.kind}] {error.detail}
        </p>
      </details>
      <button type="button" onClick={onRetry} className="btn btn-secondary">
        <RotateCw className="w-4 h-4" aria-hidden="true" />
        Reintentar
      </button>
    </div>
  );
}
