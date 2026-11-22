import { CodeSpec } from '../core/code-spec';

/** Text printed under a code: its name, or the QR content when it has no name. */
export function printLabel(spec: CodeSpec): string {
  const label = spec.label.trim();
  if (label) return label;
  if (spec.type === 'qr')
    return spec.content.length > 60 ? `${spec.content.slice(0, 57)}…` : spec.content;
  return '';
}
