/**
 * @file PrivacyNote.tsx
 * @description Aviso breve de privacidad para la empresa (conservación y retirada del interés).
 */

import { ShieldCheck } from 'lucide-react';

export default function PrivacyNote({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-start gap-2 text-meta text-fg-3 ${className}`}>
      <ShieldCheck className="w-4 h-4 shrink-0 text-fg-2" aria-hidden="true" />
      <span>
        Privacidad: los perfiles son anónimos hasta que abres el contacto. Usa estos datos solo para este proceso de selección.
        Las candidaturas se conservan 12 meses y la persona puede retirar su interés en cualquier momento.
      </span>
    </p>
  );
}
