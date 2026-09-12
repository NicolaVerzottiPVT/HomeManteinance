import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Check, ChevronRight, CircleAlert, Clock3, Database, Home, Plus, Settings2,
  WashingMachine, Coffee, Snowflake, Flame, Wrench, X
} from 'lucide-react';
import './styles.css';

type Task = {
  id: number;
  name: string;
  interval_days: number;
  warning_days: number;
  last_completed_at: string | null;
  asset_id: number;
  asset_name: string;
  room_name?: string | null;
  next_due: string;
  days_until_due: number;
};

type Asset = {
  id: number;
  room_id: number | null;
  asset_type_id?: number | null;
  name: string;
  category?: string | null;
  brand?: string | null;
  model?: string | null;
  room_name?: string | null;
  maintenance_count: number;
};

type Room = { id: number; name: string };

type AssetType = {
  id: number;
  name: string;
  category?: string | null;
  notes?: string | null;
  maintenance_count: number;
};

type MaintenanceTemplate = {
  id: number;
  asset_type_id: number;
  asset_type_name: string;
  asset_type_category?: string | null;
  name: string;
  interval_days: number;
  warning_days: number;
  notes?: string | null;
};

type View = 'dashboard' | 'assets' | 'master-data';
type ModalName = 'asset' | 'task' | 'asset-type' | 'maintenance-template' | null;

const assetIcons: Record<string, React.ReactNode> = {
  'Condizionatore camera': <Snowflake size={20} />,
  'Macchina del caffè': <Coffee size={20} />,
  'Lavatrice': <WashingMachine size={20} />,
  'Caldaia': <Flame size={20} />,
};

function formatDate(date: string | null | undefined) {
  if (!date) return 'Mai';
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${date}T12:00:00`));
}

function relativeDue(days: number) {
  if (days < 0) return `Scaduta da ${Math.abs(days)} ${Math.abs(days) === 1 ? 'giorno' : 'giorni'}`;
  if (days === 0) return 'Da fare oggi';
  if (days === 1) return 'Domani';
  return `Tra ${days} giorni`;
}

function intervalLabel(days: number) {
  if (days % 365 === 0) return `Ogni ${days / 365} ${days === 365 ? 'anno' : 'anni'}`;
  if (days % 30 === 0) return `Ogni ${days / 30} ${days === 30 ? 'mese' : 'mesi'}`;
  return `Ogni ${days} giorni`;
}

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [templates, setTemplates] = useState<MaintenanceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalName>(null);
  const [catalogTab, setCatalogTab] = useState<'types' | 'maintenance'>('types');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasksRes, assetsRes, roomsRes, typesRes, templatesRes] = await Promise.all([
        fetch('/api/dashboard'), fetch('/api/assets'), fetch('/api/rooms'),
        fetch('/api/asset-types'), fetch('/api/maintenance-templates')
      ]);
      if (![tasksRes, assetsRes, roomsRes, typesRes, templatesRes].every(r => r.ok)) throw new Error('API non disponibile');
      setTasks(await tasksRes.json());
      setAssets(await assetsRes.json());
      setRooms(await roomsRes.json());
      setAssetTypes(await typesRes.json());
      setTemplates(await templatesRes.json());
    } catch {
      setError('Non riesco a raggiungere il backend. Verifica Wrangler e che le migrazioni D1 siano state applicate.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const overdue = useMemo(() => tasks.filter(t => t.days_until_due <= 0), [tasks]);
  const upcoming = useMemo(() => tasks.filter(t => t.days_until_due > 0 && t.days_until_due <= t.warning_days), [tasks]);
  const ok = useMemo(() => tasks.filter(t => t.days_until_due > t.warning_days), [tasks]);

  const completeTask = async (task: Task) => {
    const previous = tasks;
    setTasks(items => items.filter(i => i.id !== task.id));
    try {
      const response = await fetch(`/api/tasks/${task.id}/complete`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error();
      await load();
    } catch {
      setTasks(previous);
      setError('Non sono riuscito a salvare il completamento.');
    }
  };

  const title = view === 'dashboard' ? 'Manutenzioni' : view === 'assets' ? 'Elementi di casa' : 'Anagrafiche';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><Home size={20}/></div><div><strong>Casa</strong><span>Manutenzioni</span></div></div>
        <nav>
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}><Home size={18}/> Oggi</button>
          <button className={view === 'assets' ? 'active' : ''} onClick={() => setView('assets')}><Wrench size={18}/> Elementi</button>
          <button className={view === 'master-data' ? 'active' : ''} onClick={() => setView('master-data')}><Database size={18}/> Anagrafiche</button>
        </nav>
        <div className="sidebar-footer"><Settings2 size={16}/> <span>MVP personale</span></div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">La tua casa, senza promemoria mentali.</p>
            <h1>{title}</h1>
          </div>
          <div className="actions">
            {view === 'master-data' ? (
              <>
                <button className="secondary" onClick={() => setModal('asset-type')}><Plus size={17}/> Tipo</button>
                <button className="primary" onClick={() => setModal('maintenance-template')}><Plus size={17}/> Manutenzione standard</button>
              </>
            ) : (
              <>
                <button className="secondary" onClick={() => setModal('asset')}><Plus size={17}/> Elemento</button>
                <button className="primary" onClick={() => setModal('task')}><Plus size={17}/> Manutenzione</button>
              </>
            )}
          </div>
        </header>

        {error && <div className="error-banner"><CircleAlert size={18}/>{error}</div>}

        {loading ? <div className="loading">Caricamento…</div> : view === 'dashboard' ? (
          <section className="content">
            <div className="stats">
              <Stat label="Scadute" value={overdue.length} tone="danger" />
              <Stat label="Prossimamente" value={upcoming.length} tone="warning" />
              <Stat label="In regola" value={ok.length} tone="success" />
            </div>
            <TaskSection title="Da fare" subtitle="Richiedono attenzione adesso" tasks={overdue} tone="danger" onComplete={completeTask} />
            <TaskSection title="Prossimamente" subtitle="Entro la finestra di preavviso" tasks={upcoming} tone="warning" onComplete={completeTask} />
            <div className="calm-card">
              <div className="calm-icon"><Check size={22}/></div>
              <div><strong>{ok.length} manutenzioni sono in regola</strong><p>Non devi fare altro. Le vedrai qui quando si avvicinerà la scadenza.</p></div>
            </div>
          </section>
        ) : view === 'assets' ? (
          <section className="content asset-grid">
            {assets.map(asset => (
              <article className="asset-card" key={asset.id}>
                <div className="asset-head">
                  <div className="asset-icon">{assetIcons[asset.name] ?? <Wrench size={20}/>}</div>
                  <ChevronRight size={18} className="muted"/>
                </div>
                <div><span className="room">{asset.room_name ?? 'Senza stanza'}</span><h3>{asset.name}</h3><p>{[asset.brand, asset.model].filter(Boolean).join(' · ') || 'Nessun dettaglio'}</p></div>
                <div className="asset-foot"><span>{asset.maintenance_count} manutenzioni</span></div>
              </article>
            ))}
          </section>
        ) : (
          <MasterDataView
            tab={catalogTab}
            setTab={setCatalogTab}
            assetTypes={assetTypes}
            templates={templates}
            onAddType={() => setModal('asset-type')}
            onAddTemplate={() => setModal('maintenance-template')}
          />
        )}
      </main>

      {modal === 'asset' && <AssetModal rooms={rooms} assetTypes={assetTypes} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal === 'task' && <TaskModal assets={assets} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal === 'asset-type' && <AssetTypeModal onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal === 'maintenance-template' && <MaintenanceTemplateModal assetTypes={assetTypes} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}

function MasterDataView({ tab, setTab, assetTypes, templates, onAddType, onAddTemplate }: {
  tab: 'types' | 'maintenance';
  setTab: (tab: 'types' | 'maintenance') => void;
  assetTypes: AssetType[];
  templates: MaintenanceTemplate[];
  onAddType: () => void;
  onAddTemplate: () => void;
}) {
  return <section className="content">
    <div className="catalog-intro">
      <div><strong>Configura una volta, riusa sempre.</strong><p>I tipi definiscono cosa possiedi; le manutenzioni standard vengono riutilizzate quando registri nuovi elementi.</p></div>
    </div>
    <div className="tabs">
      <button className={tab === 'types' ? 'active' : ''} onClick={() => setTab('types')}>Elettrodomestici e impianti <span>{assetTypes.length}</span></button>
      <button className={tab === 'maintenance' ? 'active' : ''} onClick={() => setTab('maintenance')}>Manutenzioni standard <span>{templates.length}</span></button>
    </div>

    {tab === 'types' ? <div className="master-list">
      <div className="master-header"><span>Tipo</span><span>Categoria</span><span>Manutenzioni</span></div>
      {assetTypes.map(type => <div className="master-row" key={type.id}>
        <div><strong>{type.name}</strong>{type.notes && <small>{type.notes}</small>}</div>
        <span>{type.category ?? '—'}</span>
        <span>{type.maintenance_count}</span>
      </div>)}
      {!assetTypes.length && <EmptyState text="Nessun tipo configurato." action="Aggiungi il primo tipo" onClick={onAddType}/>} 
    </div> : <div className="master-list">
      <div className="master-header maintenance"><span>Manutenzione</span><span>Per</span><span>Frequenza</span><span>Preavviso</span></div>
      {templates.map(template => <div className="master-row maintenance" key={template.id}>
        <div><strong>{template.name}</strong>{template.notes && <small>{template.notes}</small>}</div>
        <span>{template.asset_type_name}</span>
        <span>{intervalLabel(template.interval_days)}</span>
        <span>{template.warning_days} gg</span>
      </div>)}
      {!templates.length && <EmptyState text="Nessuna manutenzione standard configurata." action="Aggiungine una" onClick={onAddTemplate}/>} 
    </div>}
  </section>;
}

function EmptyState({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return <div className="empty-state"><span>{text}</span><button className="secondary" onClick={onClick}><Plus size={15}/>{action}</button></div>;
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className={`stat ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function TaskSection({ title, subtitle, tasks, tone, onComplete }: { title: string; subtitle: string; tasks: Task[]; tone: string; onComplete: (task: Task) => void }) {
  if (!tasks.length) return null;
  return <section className="task-section">
    <div className="section-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><span>{tasks.length}</span></div>
    <div className="task-list">
      {tasks.map(task => <article className="task-row" key={task.id}>
        <div className={`status-dot ${tone}`}></div>
        <div className="task-main">
          <div className="task-title"><strong>{task.name}</strong><span>{task.asset_name}</span></div>
          <div className="task-meta"><span><Clock3 size={14}/>{relativeDue(task.days_until_due)}</span><span>{task.room_name ?? 'Casa'}</span><span>Ultima: {formatDate(task.last_completed_at)}</span></div>
        </div>
        <button className="done" onClick={() => onComplete(task)}><Check size={17}/> Fatto</button>
      </article>)}
    </div>
  </section>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><h2>{title}</h2><button onClick={onClose}><X size={19}/></button></div>{children}</div></div>;
}

function AssetModal({ rooms, assetTypes, onClose, onSaved }: { rooms: Room[]; assetTypes: AssetType[]; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch('/api/assets', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    setSaving(false); if (res.ok) onSaved();
  }
  return <Modal title="Nuovo elemento" onClose={onClose}><form onSubmit={submit} className="form">
    <label>Tipo<select name="asset_type_id" value={selectedType} onChange={e => setSelectedType(e.target.value)}><option value="">Nessun tipo</option>{assetTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <label>Nome<input name="name" placeholder="es. Lavatrice del bagno" required/></label>
    <label>Stanza<select name="room_id"><option value="">Nessuna</option>{rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
    <div className="two"><label>Marca<input name="brand"/></label><label>Modello<input name="model"/></label></div>
    {selectedType && <label className="checkbox"><input name="create_default_tasks" type="checkbox" value="1" defaultChecked/><span>Crea automaticamente le manutenzioni standard di questo tipo</span></label>}
    <button className="primary wide" disabled={saving}>{saving ? 'Salvataggio…' : 'Aggiungi elemento'}</button>
  </form></Modal>;
}

function TaskModal({ assets, onClose, onSaved }: { assets: Asset[]; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    setSaving(false); if (res.ok) onSaved();
  }
  return <Modal title="Nuova manutenzione" onClose={onClose}><form onSubmit={submit} className="form"><label>Elemento<select name="asset_id" required><option value="">Seleziona…</option>{assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label><label>Manutenzione<input name="name" placeholder="es. Pulizia filtro" required/></label><div className="two"><label>Ogni quanti giorni<input name="interval_days" type="number" min="1" defaultValue="90" required/></label><label>Avvisami prima<input name="warning_days" type="number" min="0" defaultValue="14"/></label></div><label>Ultima esecuzione<input name="last_completed_at" type="date"/></label><button className="primary wide" disabled={saving}>{saving ? 'Salvataggio…' : 'Aggiungi manutenzione'}</button></form></Modal>;
}

function AssetTypeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch('/api/asset-types', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    setSaving(false); if (res.ok) onSaved();
  }
  return <Modal title="Nuovo tipo" onClose={onClose}><form onSubmit={submit} className="form">
    <label>Nome<input name="name" placeholder="es. Asciugatrice" required/></label>
    <label>Categoria<input name="category" placeholder="es. Elettrodomestici"/></label>
    <label>Note<input name="notes" placeholder="Facoltative"/></label>
    <button className="primary wide" disabled={saving}>{saving ? 'Salvataggio…' : 'Aggiungi tipo'}</button>
  </form></Modal>;
}

function MaintenanceTemplateModal({ assetTypes, onClose, onSaved }: { assetTypes: AssetType[]; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true);
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch('/api/maintenance-templates', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
    setSaving(false); if (res.ok) onSaved();
  }
  return <Modal title="Nuova manutenzione standard" onClose={onClose}><form onSubmit={submit} className="form">
    <label>Tipo di elemento<select name="asset_type_id" required><option value="">Seleziona…</option>{assetTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
    <label>Manutenzione<input name="name" placeholder="es. Pulizia filtro" required/></label>
    <div className="two"><label>Ogni quanti giorni<input name="interval_days" type="number" min="1" defaultValue="90" required/></label><label>Preavviso<input name="warning_days" type="number" min="0" defaultValue="14"/></label></div>
    <label>Note<input name="notes" placeholder="Facoltative"/></label>
    <button className="primary wide" disabled={saving}>{saving ? 'Salvataggio…' : 'Aggiungi manutenzione standard'}</button>
  </form></Modal>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
