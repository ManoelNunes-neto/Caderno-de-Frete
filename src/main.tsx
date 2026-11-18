import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Plus,
  Minus,
  X,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  Calculator,
  Wrench,
  Check,
  Trash2,
  Copy,
  Truck,
  RotateCcw,
  Search,
  Archive,
  ArrowLeft,
  Save,
  FilePlus2,
  PenLine,
} from 'lucide-react';
import './style.css';
type Expense = { id: string; name: string; value: string; sign?: 'negative' | 'positive' };
type Trip = {
  id: string;
  cargo: string;
  mode: 'unit' | 'fixed';
  qty: string;
  rate: string;
  costs: Expense[];
  extras: Expense[];
  notes: string;
  status?: 'draft' | 'done';
  updatedAt?: number;
};
const fresh = (): Trip => ({
  id: crypto.randomUUID(),
  cargo: '',
  mode: 'unit',
  qty: '0',
  rate: '0',
  costs: [],
  extras: [],
  notes: '',
  status: 'draft',
  updatedAt: Date.now(),
});
const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const val = (v: string) => Number(v.replace(',', '.')) || 0;
const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c,
  );
// Calculadora segura: sem eval. O operador % significa "porcentagem do valor à esquerda".
function calculateExpression(raw: string): number | null {
  const clean = raw
    .trim()
    .replace(/R\$/gi, '')
    .replace(/\s/g, '')
    .replace(/[×x]/g, '*')
    .replace(/÷/g, '/');
  if (!clean || !/[0-9]/.test(clean)) return null;
  const normalized = clean.replace(
    /(\d{1,3}(?:\.\d{3})+)(,\d+)?/g,
    (_, a, b) => a.replace(/\./g, '') + (b || ''),
  );
  const tokens = normalized.match(/\d+(?:[.,]\d+)?|[()+\-*/%]/g);
  if (!tokens || tokens.join('') !== normalized) return null;
  let at = 0;
  const atom = (): number => {
    const t = tokens[at++];
    if (t === '+' || t === '-') return (t === '-' ? -1 : 1) * atom();
    if (t === '(') {
      const x = sum();
      if (tokens[at++] !== ')') throw Error('Parênteses');
      return x;
    }
    if (!t || !/^\d/.test(t)) throw Error('Número');
    return Number(t.replace(',', '.'));
  };
  const product = (): number => {
    let x = atom();
    while (['*', '/', '%'].includes(tokens[at])) {
      const op = tokens[at++],
        y = atom();
      x = op === '*' ? x * y : op === '/' ? x / y : (x * y) / 100;
    }
    return x;
  };
  const sum = (): number => {
    let x = product();
    while (['+', '-'].includes(tokens[at])) {
      const op = tokens[at++],
        y = product();
      x = op === '+' ? x + y : x - y;
    }
    return x;
  };
  try {
    const result = sum();
    return at === tokens.length && Number.isFinite(result)
      ? Math.round((result + Number.EPSILON) * 1e8) / 1e8
      : null;
  } catch {
    return null;
  }
}
const formatUnit = (value: number, unit: 'money' | 'km') =>
  unit === 'km'
    ? `${value.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} km`
    : money(value);
function SmartAmount({
  value,
  onCommit,
  placeholder = 'R$ 0,00',
  unit = 'money',
  commitOnChange = false,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  unit?: 'money' | 'km';
  commitOnChange?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setDraft(value);
  }, [value, focused]);
  const result = calculateExpression(draft);
  const commit = () => {
    if (draft.trim() === '') {
      onCommit('');
      setDraft('');
      return;
    }
    if (result !== null) {
      onCommit(String(result));
      setDraft(String(result));
    }
  };
  return (
    <div className="smart-amount">
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        aria-label="Valor ou cálculo"
        placeholder={placeholder}
        value={focused ? draft : value === '' ? '' : formatUnit(val(value), unit)}
        onFocus={(e) => {
          setFocused(true);
          setDraft(value === '0' ? '' : value);
          requestAnimationFrame(() => e.currentTarget.select());
        }}
        onChange={(e) => {
          const next = e.target.value;
          setDraft(next);
          if (commitOnChange || next.trim() === '') onCommit(next);
        }}
        onBlur={() => {
          commit();
          setFocused(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit();
            e.currentTarget.blur();
          }
        }}
      />
      {focused && draft.trim() !== '' && (
        <small className={result === null ? 'invalid-result' : ''}>
          {result === null ? 'Expressão incompleta' : `= ${formatUnit(result, unit)}`}
        </small>
      )}
    </div>
  );
}
function App() {
  const [trip, setTrip] = useState<Trip>(() => {
    try {
      return JSON.parse(localStorage.getItem('cf-current') || 'null') || fresh();
    } catch {
      return fresh();
    }
  });
  const [records, setRecords] = useState<Trip[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cf-records-v2') || 'null');
      if (Array.isArray(saved)) return saved;
      const old = JSON.parse(localStorage.getItem('cf-history') || '[]');
      return old
        .map((x: Trip) => ({ ...x, status: 'done' }))
        .concat(
          (() => {
            const current = JSON.parse(localStorage.getItem('cf-current') || 'null');
            return current &&
              (current.cargo ||
                current.extras?.length ||
                current.notes?.replace(/<[^>]+>/g, '').trim() !== 'Viagem:')
              ? [{ ...current, status: 'draft', updatedAt: Date.now() }]
              : [];
          })(),
        );
    } catch {
      return [];
    }
  });
  const [newSign, setNewSign] = useState<'negative' | 'positive'>('negative');
  const [screen, setScreen] = useState<'home' | 'editor'>('home');
  const [listTab, setListTab] = useState<'draft' | 'done'>('draft');
  const [query, setQuery] = useState('');
  const [nameDialog, setNameDialog] = useState<{
    id: string;
    value: string;
    creating: boolean;
  } | null>(null);
  const renameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipOpen = useRef(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete' | 'restore' | 'save';
    id?: string;
  } | null>(null);
  const [saveDone, setSaveDone] = useState(false);
  const [showData, setShowData] = useState(false);
  const PAPER_ZOOM_MIN = 0.75;
  const PAPER_ZOOM_MAX = 1.2;
  const [paperZoom, setPaperZoom] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width:1199px)').matches ? 0.84 : 1,
  );
  const chipTone = (id: string) => {
    const extra = trip.extras.find((x) => x.id === id);
    return extra?.sign === 'positive' ? 'green' : extra ? 'red' : 'blue';
  };
  const changePaperZoom = (delta: number) =>
    setPaperZoom((z) =>
      Math.min(PAPER_ZOOM_MAX, Math.max(PAPER_ZOOM_MIN, Math.round((z + delta) * 100) / 100)),
    );
  const syncExtraChipTones = () => {
    editor.current?.querySelectorAll<HTMLElement>('[data-var]').forEach((el) => {
      const extra = trip.extras.find((x) => x.id === el.dataset.var);
      if (extra) el.dataset.sign = extra.sign;
      else delete el.dataset.sign;
    });
    document.querySelectorAll<HTMLElement>('.variable-list b').forEach((el) => {
      if (!el.classList.contains('red-text') && !el.classList.contains('green-text')) return;
      const positive = el.textContent?.trim().startsWith('+') === true;
      el.classList.toggle('green-text', positive);
      el.classList.toggle('red-text', !positive);
    });
  };
  const listTouch = useRef<{ x: number; y: number } | null>(null);
  const [tab, setTab] = useState(0);
  const [popup, setPopup] = useState<
    'closed' | 'choose' | 'variables' | 'new' | 'edit' | 'actions' | 'replace'
  >('closed');
  const [editing, setEditing] = useState('');
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');
  const [editDraft, setEditDraft] = useState('');
  const [menuId, setMenuId] = useState('');
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const [showPaper, setShowPaper] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  const selection = useRef<Range | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const update = (patch: Partial<Trip>) =>
    setTrip((t) => ({ ...t, ...patch, updatedAt: Date.now() }));
  useEffect(() => localStorage.setItem('cf-current', JSON.stringify(trip)), [trip]);
  useEffect(() => localStorage.setItem('cf-records-v2', JSON.stringify(records)), [records]);
  const gross = trip.mode === 'fixed' ? val(trip.rate) : val(trip.qty) * val(trip.rate);
  const costs = trip.costs.reduce((s, x) => s + val(x.value), 0),
    extras = trip.extras.reduce(
      (s, x) => s + (x.sign === 'positive' ? 1 : -1) * Math.abs(val(x.value)),
      0,
    ),
    net = gross - costs + extras;
  const variables = [
    { id: 'qty', name: 'Quantidade / km', display: `${trip.qty || 0} km`, editable: true },
    {
      id: 'rate',
      name: trip.mode === 'fixed' ? 'Valor fechado' : 'Preço por unidade',
      display: money(val(trip.rate)),
      editable: true,
    },
    { id: 'gross', name: 'Frete bruto', display: money(gross), editable: true },
    ...trip.costs.map((x) => ({
      id: x.id,
      name: x.name || 'Despesa',
      display: money(val(x.value)),
      editable: true,
    })),
    { id: 'net', name: 'Sobra da viagem', display: money(net), editable: false },
    ...trip.extras.map((x) => ({
      id: x.id,
      name: x.name || 'Imprevisto',
      display: `${x.sign === 'positive' ? '+' : '−'} ${money(Math.abs(val(x.value)))}`,
      editable: true,
    })),
  ];
  const getVariable = (id: string) => variables.find((v) => v.id === id);
  const isExtra = (id: string) => trip.extras.some((x) => x.id === id);
  const changeExpense = (kind: 'costs' | 'extras', id: string, patch: Partial<Expense>) =>
    update({ [kind]: trip[kind].map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const addExpense = (kind: 'costs' | 'extras') =>
    update({
      [kind]: [
        ...trip[kind],
        {
          id: crypto.randomUUID(),
          name: '',
          value: '',
          ...(kind === 'extras' ? { sign: 'negative' as const } : {}),
        },
      ],
    });
  const removeExpense = (kind: 'costs' | 'extras', id: string) =>
    update({ [kind]: trip[kind].filter((x) => x.id !== id) });
  useEffect(() => {
    const bottom = document.querySelector<HTMLElement>('.summary-bottom');
    if (!bottom) return;
    let dataButton = bottom.querySelector<HTMLButtonElement>('.data-button');
    if (!dataButton) {
      dataButton = document.createElement('button');
      dataButton.className = 'outline data-button';
      dataButton.type = 'button';
      const accountButton = bottom.querySelector('button');
      accountButton?.before(dataButton);
    }
    dataButton.textContent = 'Dados';
    dataButton.setAttribute('aria-expanded', String(showData));
    dataButton.onclick = () => setShowData((value) => !value);
    const footer = bottom.closest('footer');
    let panel = footer?.querySelector<HTMLElement>('.calculation-data');
    if (showData) {
      if (!panel) {
        panel = document.createElement('div');
        panel.className = 'calculation calculation-data';
        const anchor = footer?.querySelector('.calculation');
        footer?.insertBefore(panel, anchor || footer?.querySelector('.footer-actions') || null);
      }
      const row = (label: string, value: string) =>
        `<div class="data-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
      const section = (title: string, rows: string[]) =>
        `<div class="data-section"><small>${escapeHtml(title)}</small>${rows.length ? rows.join('') : `<span class="data-empty">Nenhum</span>`}</div>`;
      const costRows = trip.costs.map((x) =>
        row(x.name || 'Despesa', `− ${money(Math.abs(val(x.value)))}`),
      );
      const extraRows = trip.extras.map((x) =>
        row(
          x.name || 'Imprevisto',
          `${x.sign === 'positive' ? '+' : '−'} ${money(Math.abs(val(x.value)))}`,
        ),
      );
      panel.innerHTML = `<strong>Dados do cálculo</strong>${section('Viagem', [row('Carga', trip.cargo || 'Sem nome'), row('Tipo', trip.mode === 'fixed' ? 'Valor fechado' : 'Por quantidade'), ...(trip.mode === 'unit' ? [row('Quantidade / km', `${trip.qty || 0} km`)] : []), row(trip.mode === 'fixed' ? 'Valor fechado' : 'Preço por unidade', money(val(trip.rate))), row('Frete bruto', money(gross))])}${section('Gastos previstos', costRows)}${section('Imprevistos', extraRows.concat([row('Saldo dos imprevistos', `${extras >= 0 ? '+' : '−'} ${money(Math.abs(extras))}`)]))}<div class="data-total"><span>Sobra da viagem</span><strong>${escapeHtml(money(net))}</strong></div>`;
    } else panel?.remove();
    return () => {
      if (dataButton) dataButton.onclick = null;
    };
  }, [showData, trip, tab, showPaper]);
  useEffect(() => {
    if (tab === 2) requestAnimationFrame(syncExtraChipTones);
  }, [tab, trip.id, trip.extras, trip.notes, popup]);
  useEffect(() => {
    if (tab !== 2) return;
    const frame = requestAnimationFrame(() => {
      const wrap = document.querySelector<HTMLElement>('.paper-wrap');
      const paper = wrap?.querySelector<HTMLElement>('.paper');
      if (!wrap || !paper) return;
      paper.style.setProperty('--paper-zoom', String(paperZoom));
      let toolbar = wrap.querySelector<HTMLElement>('.paper-toolbar');
      if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.className = 'paper-toolbar';
        wrap.prepend(toolbar);
      }
      toolbar.innerHTML = `<span>Zoom ${Math.round(paperZoom * 100)}%</span><div class="zoom-controls"><button type="button" aria-label="Aumentar zoom" title="Aumentar zoom">+</button><button type="button" aria-label="Diminuir zoom" title="Diminuir zoom">-</button></div>`;
      const buttons = toolbar.querySelectorAll<HTMLButtonElement>('button');
      buttons[0].disabled = paperZoom >= PAPER_ZOOM_MAX;
      buttons[1].disabled = paperZoom <= PAPER_ZOOM_MIN;
      buttons[0].onclick = () => changePaperZoom(0.05);
      buttons[1].onclick = () => changePaperZoom(-0.05);
    });
    return () => cancelAnimationFrame(frame);
  }, [tab, paperZoom]);
  const saveSelection = () => {
    const s = window.getSelection();
    if (s?.rangeCount && editor.current?.contains(s.anchorNode))
      selection.current = s.getRangeAt(0).cloneRange();
  };
  const persistNotes = () => {
    if (editor.current) update({ notes: editor.current.innerHTML });
  };
  const insertVariable = (id: string, created?: Expense) => {
    setPopup('closed');
    setTab(2);
    requestAnimationFrame(() => {
      const el = editor.current;
      if (!el) return;
      el.focus();
      const range =
        selection.current && el.contains(selection.current.commonAncestorContainer)
          ? selection.current
          : document.createRange();
      if (!selection.current || !el.contains(selection.current.commonAncestorContainer)) {
        range.selectNodeContents(el);
        range.collapse(false);
      }
      const chip = document.createElement('span');
      chip.className = `note-variable ${created || isExtra(id) ? 'red' : 'blue'}`;
      chip.dataset.var = id;
      chip.contentEditable = 'false';
      chip.textContent = created
        ? `${created.sign === 'positive' ? '+' : '−'} ${money(Math.abs(val(created.value)))}`
        : getVariable(id)?.display || '—';
      range.deleteContents();
      range.insertNode(chip);
      const space = document.createTextNode('\u00a0');
      chip.after(space);
      range.setStartAfter(space);
      range.collapse(true);
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(range);
      selection.current = range.cloneRange();
      persistNotes();
    });
  };
  const syncChips = () => {
    editor.current?.querySelectorAll<HTMLElement>('[data-var]').forEach((el) => {
      const id = el.dataset.var || '';
      el.textContent = getVariable(id)?.display || '—';
      el.className = `note-variable ${isExtra(id) ? 'red' : 'blue'}`;
    });
    if (editor.current) {
      const html = editor.current.innerHTML;
      setTrip((t) => (t.notes === html ? t : { ...t, notes: html }));
    }
  };
  useEffect(() => {
    syncChips();
  }, [trip.qty, trip.rate, trip.mode, trip.costs, trip.extras]);
  useEffect(() => {
    if (tab === 2 && editor.current && editor.current.innerHTML !== trip.notes)
      editor.current.innerHTML = trip.notes;
  }, [tab, trip.id]);
  const startEdit = (id: string) => {
    setEditing(id);
    setEditDraft(currentValue(id));
    setPopup('edit');
  };
  const openActions = (id: string) => {
    setMenuId(id);
    setPopup('actions');
  };
  const removeChip = () => {
    if (!editor.current) return;
    editor.current.querySelectorAll<HTMLElement>('[data-var]').forEach((chip) => {
      if (chip.dataset.var === menuId) chip.replaceWith(document.createTextNode(''));
    });
    persistNotes();
    closePopup();
  };
  const removeEverywhere = () => {
    if (!isExtra(menuId)) return;
    removeChip();
    setTrip((t) => ({ ...t, extras: t.extras.filter((x) => x.id !== menuId) }));
  };
  const replaceChip = (id: string) => {
    if (!editor.current) return;
    const chips = Array.from(editor.current.querySelectorAll<HTMLElement>('[data-var]')).filter(
      (x) => x.dataset.var === menuId,
    );
    if (chips.length) {
      chips[0].dataset.var = id;
      chips[0].textContent = getVariable(id)?.display || '—';
      chips[0].className = `note-variable ${isExtra(id) ? 'red' : 'blue'}`;
      persistNotes();
    }
    closePopup();
  };
  const editValue = (id: string, value: string) => {
    if (id === 'net') return;
    if (id === 'gross') {
      const desired = val(value);
      update({
        rate: String(
          trip.mode === 'fixed' ? desired : val(trip.qty) ? desired / val(trip.qty) : desired,
        ),
        ...(trip.mode === 'unit' && !val(trip.qty) ? { qty: '1' } : {}),
      });
    } else if (id === 'qty') update({ qty: value });
    else if (id === 'rate') update({ rate: value });
    else if (trip.costs.some((x) => x.id === id)) changeExpense('costs', id, { value });
    else if (isExtra(id)) changeExpense('extras', id, { value: String(Math.abs(val(value))) });
  };
  const currentValue = (id: string) =>
    id === 'gross'
      ? String(gross)
      : id === 'net'
        ? String(net)
        : id === 'qty'
          ? trip.qty
          : id === 'rate'
            ? trip.rate
            : (trip.costs.find((x) => x.id === id)?.value ??
              trip.extras.find((x) => x.id === id)?.value ??
              '');
  const closePopup = () => setPopup('closed');
  const saveTrip = (done: boolean) => {
    const saved = {
      ...trip,
      notes: editor.current?.innerHTML || trip.notes,
      status: done ? ('done' as const) : ('draft' as const),
      updatedAt: Date.now(),
    };
    setTrip(saved);
    setRecords((a) => [saved, ...a.filter((x) => x.id !== saved.id)]);
    setConfirmAction(null);
    setScreen('home');
    setListTab(done ? 'done' : 'draft');
    closePopup();
  };
  const openTrip = (item: Trip) => {
    setTrip(item);
    setTab(0);
    setScreen('editor');
    setShowPaper(false);
    closePopup();
  };
  const createTrip = () => {
    const next = fresh();
    setTrip(next);
    setTab(0);
    setScreen('editor');
    setNameDialog({ id: next.id, value: '', creating: true });
    closePopup();
  };
  const askSave = () => {
    persistNotes();
    setConfirmAction({ type: 'save' });
  };
  const applyName = () => {
    if (!nameDialog) return;
    const name = nameDialog.value.trim() || 'Frete sem nome';
    if (nameDialog.creating) {
      setTrip((t) => ({ ...t, cargo: name }));
      setScreen('editor');
    } else {
      setRecords((a) => a.map((r) => (r.id === nameDialog.id ? { ...r, cargo: name } : r)));
      if (trip.id === nameDialog.id) setTrip((t) => ({ ...t, cargo: name }));
    }
    setNameDialog(null);
  };
  const discardTrip = () => {
    const saved = {
      ...trip,
      notes: editor.current?.innerHTML || trip.notes,
      status: trip.status || 'draft',
      updatedAt: Date.now(),
    };
    setRecords((a) => [saved, ...a.filter((x) => x.id !== saved.id)]);
    setScreen('home');
    closePopup();
  };
  const calculation = [
    trip.mode === 'fixed'
      ? `Frete = ${money(gross)}`
      : `${trip.qty || 0} × ${trip.rate || 0} = ${money(gross)}`,
  ];
  let running = gross;
  for (const x of [...trip.costs, ...trip.extras]) {
    const adjustment =
      trip.extras.some((e) => e.id === x.id) && x.sign === 'positive'
        ? Math.abs(val(x.value))
        : -Math.abs(val(x.value));
    const next = running + adjustment;
    calculation.push(
      `${x.name || 'Gasto'}: ${money(running)} ${adjustment >= 0 ? '+' : '−'} ${money(Math.abs(adjustment))} = ${money(next)}`,
    );
    running = next;
  }
  calculation.push(`Sobra: ${money(net)}`);
  if (screen === 'home')
    return (
      <div className="shell">
        <div className="app home-app">
          <header>
            <div className="brand">
              <span className="brand-icon">
                <Truck size={21} />
              </span>
              <div>
                <strong>CadernoFrete</strong>
                <small>Seus fretes e anotações</small>
              </div>
            </div>
          </header>
          <div className="home-content">
            <div className="home-top">
              <h1>Meu caderno</h1>
              <button className="primary create-btn" onClick={createTrip}>
                <Plus size={18} /> Novo frete
              </button>
            </div>
            <div className="search-box">
              <Search size={19} />
              <input
                aria-label="Pesquisar fretes"
                placeholder="Pesquisar carga ou destino..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div
              className="list-tabs"
              onTouchStart={(e) =>
                (listTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })
              }
              onTouchEnd={(e) => {
                if (!listTouch.current) return;
                const dx = e.changedTouches[0].clientX - listTouch.current.x;
                const dy = e.changedTouches[0].clientY - listTouch.current.y;
                if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.3)
                  setListTab(dx < 0 ? 'done' : 'draft');
                listTouch.current = null;
              }}
            >
              <div className="list-tab-buttons">
                <button
                  className={listTab === 'draft' ? 'selected' : ''}
                  onClick={() => setListTab('draft')}
                >
                  <PenLine size={17} /> Em andamento
                </button>
                <button
                  className={listTab === 'done' ? 'selected' : ''}
                  onClick={() => setListTab('done')}
                >
                  <Archive size={17} /> Concluídas
                </button>
              </div>
              <div className="record-list">
                {records
                  .filter(
                    (r) =>
                      (r.status === 'done' ? 'done' : 'draft') === listTab &&
                      (r.cargo || 'Frete sem nome').toLowerCase().includes(query.toLowerCase()),
                  )
                  .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                  .map((r) => (
                    <div
                      className="record"
                      key={r.id}
                      onTouchStart={() => {
                        skipOpen.current = false;
                        renameTimer.current = setTimeout(() => {
                          skipOpen.current = true;
                          setNameDialog({ id: r.id, value: r.cargo, creating: false });
                        }, 550);
                      }}
                      onTouchMove={() => {
                        if (renameTimer.current) clearTimeout(renameTimer.current);
                      }}
                      onTouchEnd={() => {
                        if (renameTimer.current) clearTimeout(renameTimer.current);
                      }}
                      onDoubleClick={() =>
                        setNameDialog({ id: r.id, value: r.cargo, creating: false })
                      }
                    >
                      <button
                        className="record-main"
                        onClick={() => {
                          if (skipOpen.current) {
                            skipOpen.current = false;
                            return;
                          }
                          listTab === 'done'
                            ? setConfirmAction({ type: 'restore', id: r.id })
                            : openTrip(r);
                        }}
                      >
                        <strong>{r.cargo || 'Frete sem nome'}</strong>
                        <small>
                          {r.updatedAt
                            ? new Date(r.updatedAt).toLocaleDateString('pt-BR')
                            : 'Sem data'}{' '}
                          · {listTab === 'done' ? 'Finalizado' : 'Rascunho'}
                        </small>
                      </button>
                      <button
                        className="record-icon"
                        aria-label={listTab === 'done' ? 'Recuperar anotação' : 'Editar anotação'}
                        onClick={() =>
                          listTab === 'done'
                            ? setConfirmAction({ type: 'restore', id: r.id })
                            : openTrip(r)
                        }
                      >
                        {listTab === 'done' ? <RotateCcw size={19} /> : <PenLine size={19} />}
                      </button>
                      <button
                        className="record-icon danger-icon"
                        aria-label="Excluir anotação"
                        onClick={() => setConfirmAction({ type: 'delete', id: r.id })}
                      >
                        <Trash2 size={19} />
                      </button>
                    </div>
                  ))}
                {records.filter(
                  (r) =>
                    (r.status === 'done' ? 'done' : 'draft') === listTab &&
                    (r.cargo || 'Frete sem nome').toLowerCase().includes(query.toLowerCase()),
                ).length === 0 && (
                  <div className="empty-records">
                    <NotebookPen size={30} />
                    <p>
                      {query
                        ? 'Nenhuma anotação encontrada.'
                        : listTab === 'done'
                          ? 'Nenhum frete concluído.'
                          : 'Nenhuma anotação em andamento.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          {nameDialog && (
            <div className="overlay confirm-overlay" onClick={() => setNameDialog(null)}>
              <form
                className="confirm-box"
                onClick={(e) => e.stopPropagation()}
                onSubmit={(e) => {
                  e.preventDefault();
                  applyName();
                }}
              >
                <h2>{nameDialog.creating ? 'Nomear novo frete' : 'Renomear anotação'}</h2>
                <p>Escolha um nome fácil de encontrar na lista.</p>
                <input
                  autoFocus
                  maxLength={90}
                  placeholder="Ex.: Milho — Santos"
                  value={nameDialog.value}
                  onChange={(e) => setNameDialog({ ...nameDialog, value: e.target.value })}
                />
                <div className="confirm-buttons name-buttons">
                  <button
                    type="button"
                    className="outline"
                    onClick={() => {
                      if (nameDialog.creating) setScreen('home');
                      setNameDialog(null);
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="primary">
                    Confirmar
                  </button>
                </div>
              </form>
            </div>
          )}
          {confirmAction && (
            <div className="overlay confirm-overlay" onClick={() => setConfirmAction(null)}>
              <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
                <h2>
                  {confirmAction.type === 'delete' ? 'Apagar anotação?' : 'Recuperar anotação?'}
                </h2>
                <p>
                  {confirmAction.type === 'delete'
                    ? 'Esta anotação será excluída deste aparelho. Essa ação não pode ser desfeita.'
                    : 'A anotação voltará para a lista Em andamento, para você continuar editando.'}
                </p>
                <div className="confirm-buttons">
                  <button className="outline" onClick={() => setConfirmAction(null)}>
                    Cancelar
                  </button>
                  <button
                    className="primary"
                    onClick={() => {
                      if (confirmAction.type === 'delete')
                        setRecords((a) => a.filter((x) => x.id !== confirmAction.id));
                      else
                        setRecords((a) =>
                          a.map((x) =>
                            x.id === confirmAction.id
                              ? { ...x, status: 'draft', updatedAt: Date.now() }
                              : x,
                          ),
                        );
                      setConfirmAction(null);
                      if (confirmAction.type === 'restore') setListTab('draft');
                    }}
                  >
                    {confirmAction.type === 'delete' ? 'Apagar' : 'Recuperar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  return (
    <div className="shell">
      <div className="app">
        <header>
          <button
            className="brand brand-rename"
            onClick={() => setNameDialog({ id: trip.id, value: trip.cargo, creating: false })}
          >
            <span className="brand-icon">
              <Truck size={21} />
            </span>
            <span>
              <strong>{trip.cargo || 'Frete sem nome'}</strong>
              <small>Toque para renomear</small>
            </span>
          </button>
        </header>
        <nav className="tabs" aria-label="Páginas">
          {[
            { label: 'Cálculo', Icon: Calculator },
            { label: 'Imprevistos', Icon: Wrench },
            { label: 'Anotações', Icon: NotebookPen },
          ].map(({ label, Icon }, i) => (
            <button
              key={label}
              className={tab === i ? 'active' : ''}
              onClick={() => {
                closePopup();
                setTab(i);
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <main
          onTouchStart={(e) => {
            const point = e.touches[0];
            touch.current = { x: point.clientX, y: point.clientY };
          }}
          onTouchEnd={(e) => {
            if (touch.current === null) return;
            const dx = e.changedTouches[0].clientX - touch.current.x;
            const dy = e.changedTouches[0].clientY - touch.current.y;
            if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.15) {
              e.preventDefault();
              closePopup();
              setTab((t) => Math.max(0, Math.min(2, t + (dx < 0 ? 1 : -1))));
            }
            touch.current = null;
          }}
        >
          {tab === 0 && (
            <section className="page">
              <h1>Calcular frete</h1>
              <p className="hint">Preencha os dados da viagem.</p>
              <label>
                Descrição da carga
                <input
                  placeholder="Ex.: Milho"
                  value={trip.cargo}
                  onChange={(e) => update({ cargo: e.target.value })}
                />
              </label>
              <div className="switch">
                <button
                  className={trip.mode === 'unit' ? 'selected' : ''}
                  onClick={() => update({ mode: 'unit', rate: '0' })}
                >
                  Por quantidade
                </button>
                <button
                  className={trip.mode === 'fixed' ? 'selected' : ''}
                  onClick={() => update({ mode: 'fixed', rate: '0' })}
                >
                  Valor fechado
                </button>
              </div>
              <div className="fields">
                {trip.mode === 'unit' && (
                  <label>
                    Quantidade / km
                    <input
                      type="number"
                      inputMode="decimal"
                      value={trip.qty}
                      onChange={(e) => update({ qty: e.target.value })}
                    />
                  </label>
                )}
                <label>
                  {trip.mode === 'fixed' ? 'Valor total (R$)' : 'Preço por unidade (R$)'}
                  <input
                    type="number"
                    inputMode="decimal"
                    value={trip.rate}
                    onChange={(e) => update({ rate: e.target.value })}
                  />
                </label>
              </div>
              <div className="section-heading">
                <strong>Gastos previstos</strong>
                <span>{money(costs)}</span>
              </div>
              {trip.costs.map((x) => (
                <div className="expense" key={x.id}>
                  <input
                    aria-label="Descrição do gasto"
                    placeholder="Ex.: Diesel"
                    value={x.name}
                    onChange={(e) => changeExpense('costs', x.id, { name: e.target.value })}
                  />
                  <SmartAmount
                    value={x.value}
                    onCommit={(value) => changeExpense('costs', x.id, { value })}
                  />
                  <button
                    className="remove"
                    aria-label="Remover gasto"
                    onClick={() => removeExpense('costs', x.id)}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
              <button className="outline wide" onClick={() => addExpense('costs')}>
                <Plus size={18} /> Adicionar despesa
              </button>
            </section>
          )}
          {tab === 1 && (
            <section className="page">
              <h1>Imprevistos</h1>
              <p className="hint">Registre despesas ou recebimentos extras da viagem.</p>
              <div className="sub-total">
                <small>Saldo dos imprevistos (+ recebimentos − despesas)</small>
                <strong>{money(extras)}</strong>
              </div>
              {trip.extras.map((x) => (
                <div className="expense extra-expense" key={x.id}>
                  <button
                    className={`sign-compact ${x.sign === 'positive' ? 'is-positive' : 'is-negative'}`}
                    title="Alternar entre despesa e recebimento"
                    aria-label={
                      x.sign === 'positive'
                        ? 'Recebimento extra, trocar para despesa'
                        : 'Despesa, trocar para recebimento'
                    }
                    onClick={() =>
                      changeExpense('extras', x.id, {
                        sign: x.sign === 'positive' ? 'negative' : 'positive',
                      })
                    }
                  >
                    {x.sign === 'positive' ? '+' : '−'}
                  </button>
                  <input
                    className="extra-name"
                    placeholder="Ex.: Pneu furado"
                    value={x.name}
                    onChange={(e) => changeExpense('extras', x.id, { name: e.target.value })}
                  />
                  <div className="extra-value">
                    <SmartAmount
                      value={x.value}
                      onCommit={(value) =>
                        changeExpense('extras', x.id, { value: String(Math.abs(val(value))) })
                      }
                    />
                  </div>
                  <button
                    className="remove"
                    aria-label="Remover imprevisto"
                    onClick={() => removeExpense('extras', x.id)}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
              <button className="outline wide" onClick={() => addExpense('extras')}>
                <Plus size={18} /> Novo imprevisto
              </button>
              {trip.extras.length === 0 && <p className="empty">Nenhum imprevisto registrado.</p>}
            </section>
          )}
          {tab === 2 && (
            <section className="page notes-page">
              <h1>Meu caderno</h1>
              <p className="hint">Escreva livremente. Insira valores no cursor.</p>
              <div className="paper-wrap">
                <div
                  className="paper"
                  onClick={(e) => {
                    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-var]');
                    if (el?.dataset.var) {
                      if (suppressClick.current) {
                        suppressClick.current = false;
                        return;
                      }
                      saveSelection();
                      startEdit(el.dataset.var);
                    }
                  }}
                  onDoubleClick={(e) => {
                    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-var]');
                    if (el?.dataset.var) {
                      e.preventDefault();
                      openActions(el.dataset.var);
                    }
                  }}
                  onContextMenu={(e) => {
                    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-var]');
                    if (el?.dataset.var) {
                      e.preventDefault();
                      openActions(el.dataset.var);
                    }
                  }}
                  onTouchStart={(e) => {
                    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-var]');
                    if (el?.dataset.var) {
                      longPress.current = setTimeout(() => {
                        suppressClick.current = true;
                        openActions(el.dataset.var!);
                      }, 550);
                    }
                  }}
                  onTouchMove={() => {
                    if (longPress.current) clearTimeout(longPress.current);
                  }}
                  onTouchEnd={() => {
                    if (longPress.current) clearTimeout(longPress.current);
                  }}
                >
                  <div
                    className="paper-editor"
                    ref={editor}
                    key={trip.id}
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-label="Anotações do frete"
                    data-placeholder="Escreva suas anotações..."
                    onInput={persistNotes}
                    onKeyUp={saveSelection}
                    onMouseUp={saveSelection}
                    onTouchEnd={saveSelection}
                    onBlur={saveSelection}
                  />
                </div>
                <div className="fab-area">
                  {popup !== 'closed' && (
                    <div className="popover">
                      <div className="popover-title">
                        <strong>
                          {popup === 'choose'
                            ? 'Inserir no cursor'
                            : popup === 'variables'
                              ? 'Escolher variável'
                              : popup === 'new'
                                ? 'Novo imprevisto'
                                : popup === 'actions'
                                  ? 'Opções da variável'
                                  : popup === 'replace'
                                    ? 'Trocar variável'
                                    : 'Editar valor'}
                        </strong>
                        <button className="plain" onClick={closePopup}>
                          <X size={18} />
                        </button>
                      </div>
                      {popup === 'choose' && (
                        <>
                          <button className="choice" onClick={() => setPopup('variables')}>
                            <span className="dot blue-dot" /> Usar variável existente{' '}
                            <ChevronRight size={16} />
                          </button>
                          <button
                            className="choice"
                            onClick={() => {
                              setNewName('');
                              setNewValue('');
                              setNewSign('negative');
                              setPopup('new');
                            }}
                          >
                            <span className="dot red-dot" /> Criar imprevisto{' '}
                            <ChevronRight size={16} />
                          </button>
                        </>
                      )}
                      {popup === 'variables' && (
                        <div className="variable-list">
                          {variables.map((v) => (
                            <button key={v.id} onClick={() => insertVariable(v.id)}>
                              <span>{v.name}</span>
                              <b className={isExtra(v.id) ? 'red-text' : 'blue-text'}>
                                {v.display}
                              </b>
                            </button>
                          ))}
                        </div>
                      )}
                      {popup === 'new' && (
                        <div className="popup-form">
                          <input
                            placeholder="Ex.: Pneu furado"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                          />
                          <button
                            className={`popup-sign ${newSign === 'positive' ? 'is-positive' : 'is-negative'}`}
                            onClick={() =>
                              setNewSign((v) => (v === 'positive' ? 'negative' : 'positive'))
                            }
                          >
                            {newSign === 'positive' ? '+ Recebimento extra' : '− Despesa'}{' '}
                            <span>Toque para alterar</span>
                          </button>
                          <SmartAmount value={newValue} onCommit={setNewValue} commitOnChange />
                          <button
                            className="primary"
                            disabled={!newName.trim() || calculateExpression(newValue) === null}
                            onClick={() => {
                              const id = crypto.randomUUID();
                              update({
                                extras: [
                                  ...trip.extras,
                                  {
                                    id,
                                    name: newName,
                                    value: String(Math.abs(calculateExpression(newValue) ?? 0)),
                                    sign: newSign,
                                  },
                                ],
                              });
                              insertVariable(id, {
                                id,
                                name: newName,
                                value: String(Math.abs(calculateExpression(newValue) ?? 0)),
                                sign: newSign,
                              });
                            }}
                          >
                            Inserir no papel
                          </button>
                        </div>
                      )}
                      {popup === 'actions' && (
                        <div className="popup-form">
                          <small>{getVariable(menuId)?.name || 'Variável'}</small>
                          <button className="choice" onClick={() => startEdit(menuId)}>
                            Editar valor
                          </button>
                          <button className="choice" onClick={() => setPopup('replace')}>
                            Trocar por outra variável
                          </button>
                          <button className="choice" onClick={removeChip}>
                            Apagar somente do papel
                          </button>
                          {isExtra(menuId) && (
                            <button className="choice danger" onClick={removeEverywhere}>
                              Apagar do papel e dos imprevistos
                            </button>
                          )}
                        </div>
                      )}
                      {popup === 'replace' && (
                        <div className="variable-list">
                          {variables
                            .filter((v) => v.id !== menuId)
                            .map((v) => (
                              <button key={v.id} onClick={() => replaceChip(v.id)}>
                                <span>{v.name}</span>
                                <b className={isExtra(v.id) ? 'red-text' : 'blue-text'}>
                                  {v.display}
                                </b>
                              </button>
                            ))}
                        </div>
                      )}
                      {popup === 'edit' && (
                        <div className="popup-form">
                          <small>{getVariable(editing)?.name}</small>
                          {getVariable(editing)?.editable ? (
                            <>
                              <div className="smart-input">
                                <span className="smart-prefix">
                                  {editing === 'qty' ? 'km' : 'R$'}
                                </span>
                                <input
                                  type="text"
                                  inputMode="text"
                                  autoComplete="off"
                                  spellCheck={false}
                                  aria-label="Valor ou expressão matemática"
                                  placeholder={editing === 'qty' ? '0 km' : 'R$ 0,00'}
                                  value={editDraft}
                                  onFocus={(e) => e.currentTarget.select()}
                                  onChange={(e) => setEditDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (
                                      e.key === 'Enter' &&
                                      calculateExpression(editDraft) !== null
                                    ) {
                                      editValue(editing, String(calculateExpression(editDraft)));
                                      closePopup();
                                    }
                                  }}
                                />
                              </div>
                              <div className="smart-result">
                                {calculateExpression(editDraft) === null ? (
                                  <span>Digite um valor ou uma conta</span>
                                ) : (
                                  <>
                                    <span>Resultado</span>
                                    <strong>
                                      {formatUnit(
                                        calculateExpression(editDraft)!,
                                        editing === 'qty' ? 'km' : 'money',
                                      )}
                                    </strong>
                                  </>
                                )}
                              </div>
                              <small className="smart-help">
                                Ex.: 500 + 600 = 1.100 · 500 % 10 = 50
                              </small>
                            </>
                          ) : (
                            <>
                              <strong>{getVariable(editing)?.display}</strong>
                              <small>
                                Resultado automático: altere as variáveis que compõem esta conta.
                              </small>
                            </>
                          )}
                          <button
                            className="primary"
                            disabled={
                              !getVariable(editing)?.editable ||
                              calculateExpression(editDraft) === null
                            }
                            onClick={() => {
                              const result = calculateExpression(editDraft);
                              if (result !== null && getVariable(editing)?.editable)
                                editValue(editing, String(result));
                              closePopup();
                            }}
                          >
                            Aplicar resultado
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    className="fab"
                    aria-label="Inserir variável"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      saveSelection();
                    }}
                    onClick={() => {
                      saveSelection();
                      setPopup((p) => (p === 'closed' ? 'choose' : 'closed'));
                    }}
                  >
                    {popup === 'closed' ? <Plus size={25} /> : <X size={24} />}
                  </button>
                </div>
              </div>
              <div className="legend">
                <span>
                  <i className="blue-swatch" /> Variável do cálculo
                </span>
                <span>
                  <i className="red-swatch" /> Imprevisto
                </span>
              </div>
            </section>
          )}
        </main>
        <footer>
          <div className="summary">
            <div className="summary-line">
              <span>Frete bruto</span>
              <b>{money(gross)}</b>
            </div>
            <div className="summary-line">
              <span>Gastos previstos</span>
              <b>− {money(costs)}</b>
            </div>
            <div className="summary-line">
              <span>Imprevistos (saldo)</span>
              <b>
                {extras >= 0 ? '+' : '−'} {money(Math.abs(extras))}
              </b>
            </div>
            <div className="summary-bottom">
              <div>
                <small>Sobra da viagem</small>
                <strong className={net < 0 ? 'negative' : ''}>{money(net)}</strong>
              </div>
              <button className="outline" onClick={() => setShowPaper((v) => !v)}>
                Conta <Calculator size={16} />
              </button>
            </div>
          </div>
          {showPaper && (
            <div className="calculation">
              <strong>Conta no papel</strong>
              {calculation.map((x, i) => (
                <p key={i}>{x}</p>
              ))}
              <button
                className="outline wide"
                onClick={() => navigator.clipboard.writeText(calculation.join('\n'))}
              >
                <Copy size={16} /> Copiar conta
              </button>
            </div>
          )}
          <div className="footer-actions">
            {
              <button className="primary wide" onClick={askSave}>
                <Check size={18} /> Salvar anotação
              </button>
            }
          </div>
          <div className="dots">
            {[0, 1, 2].map((i) => (
              <button
                aria-label={`Ir para aba ${i + 1}`}
                key={i}
                className={tab === i ? 'on' : ''}
                onClick={() => setTab(i)}
              />
            ))}
          </div>
        </footer>
      </div>
      {nameDialog && (
        <div className="overlay confirm-overlay" onClick={() => setNameDialog(null)}>
          <form
            className="confirm-box"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              applyName();
            }}
          >
            <h2>{nameDialog.creating ? 'Nomear novo frete' : 'Renomear anotação'}</h2>
            <p>Escolha um nome fácil de encontrar na lista.</p>
            <input
              autoFocus
              maxLength={90}
              placeholder="Ex.: Milho — Santos"
              value={nameDialog.value}
              onChange={(e) => setNameDialog({ ...nameDialog, value: e.target.value })}
            />
            <div className="confirm-buttons name-buttons">
              <button
                type="button"
                className="outline"
                onClick={() => {
                  if (nameDialog.creating) setScreen('home');
                  setNameDialog(null);
                }}
              >
                Cancelar
              </button>
              <button type="submit" className="primary">
                Confirmar
              </button>
            </div>
          </form>
        </div>
      )}
      {confirmAction?.type === 'save' && (
        <div className="overlay confirm-overlay" onClick={() => setConfirmAction(null)}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <h2>Salvar anotação</h2>
            <p>Este frete já foi finalizado?</p>
            <div className="save-options">
              <button className="outline" onClick={() => saveTrip(false)}>
                Não, continuar depois
              </button>
              <button className="primary" onClick={() => saveTrip(true)}>
                <Check size={17} /> Sim, finalizar
              </button>
            </div>
            <button className="plain cancel-save" onClick={() => setConfirmAction(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
