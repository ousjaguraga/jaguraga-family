import { useMemo, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { fullName } from '../utils/helpers';
import {
  buildTreeSvg,
  computeScope,
  DEFAULT_SCOPE,
  downloadPng,
  downloadSvg,
  type ExportScope,
} from '../utils/exportTree';
import type { Person } from '../types';

const SCOPE_LABELS: Array<{ key: keyof ExportScope; label: string; desc: string }> = [
  { key: 'roots',       label: 'My roots',            desc: 'Parents, grandparents and beyond — your lineage' },
  { key: 'siblings',    label: 'My siblings',          desc: 'Brothers and sisters, with their partners' },
  { key: 'descendants', label: 'My spouse & children', desc: 'Your own family and everyone after you' },
  { key: 'everyone',    label: 'The whole clan',       desc: 'Every connected relative (overrides the above)' },
];

export default function ExportTreeDialog({ persons, defaultPersonId, onClose }: {
  persons: Person[];
  defaultPersonId?: string | null;
  onClose: () => void;
}) {
  const sorted = useMemo(
    () => [...persons].sort((a, b) => fullName(a).localeCompare(fullName(b))),
    [persons],
  );
  const [focusId, setFocusId] = useState(defaultPersonId ?? sorted[0]?.id ?? '');
  const [scope, setScope] = useState<ExportScope>(DEFAULT_SCOPE);
  const [format, setFormat] = useState<'png' | 'svg'>('png');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const focus = persons.find(p => p.id === focusId) ?? null;
  const included = useMemo(
    () => (focus ? computeScope(persons, focus.id, scope) : []),
    [persons, focus, scope],
  );

  async function handleExport() {
    if (!focus) return;
    setError(null);
    setBusy(true);
    try {
      const svg = buildTreeSvg(included, `Roots & family of ${fullName(focus)}`);
      const base = `${fullName(focus).replace(/\s+/g, '-').toLowerCase()}-family-tree`;
      if (format === 'svg') downloadSvg(svg, `${base}.svg`);
      else await downloadPng(svg, `${base}.png`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-gray-900">Export family tree</h2>
            <p className="mt-0.5 text-sm text-gray-500">Download a picture of your roots and relatives.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="label">Whose tree?</label>
        <select className="input mb-4" value={focusId} onChange={e => setFocusId(e.target.value)}>
          {sorted.map(p => (
            <option key={p.id} value={p.id}>{fullName(p)}</option>
          ))}
        </select>

        <p className="label">Include</p>
        <div className="mb-4 space-y-2">
          {SCOPE_LABELS.map(({ key, label, desc }) => (
            <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
              scope[key] ? 'border-gold-400 bg-gold-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="checkbox"
                checked={scope[key]}
                onChange={e => setScope(s => ({ ...s, [key]: e.target.checked }))}
                className="mt-0.5 h-4 w-4 accent-[#b08a1f]"
              />
              <span>
                <span className="block text-sm font-semibold text-gray-800">{label}</span>
                <span className="block text-xs text-gray-400">{desc}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="text-sm text-gray-600">
            <span className="font-bold text-gray-900">{included.length}</span> people will appear
          </p>
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-0.5">
            {(['png', 'svg'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`rounded-md px-3 py-1 text-xs font-bold uppercase transition ${
                  format === f ? 'bg-burgundy-800 text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleExport}
          disabled={busy || !focus || included.length === 0}
          className="btn-primary flex w-full items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download {format.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
