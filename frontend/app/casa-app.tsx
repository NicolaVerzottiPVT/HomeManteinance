"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  AirVent,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Coffee,
  CookingPot,
  Database,
  Flame,
  History,
  Home,
  LayoutDashboard,
  Plus,
  Pencil,
  Refrigerator,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  WashingMachine,
  Wind,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

type View = "today" | "home" | "plan" | "history" | "catalog";
type Modal = "asset" | "task" | "complete" | "room" | "type" | "template" | null;

type Room = {
  id: number;
  name: string;
  color: string;
  sort_order: number;
};

type AssetType = {
  id: number;
  name: string;
  category: string | null;
  icon: string;
  template_count: number;
};

type MaintenanceTemplate = {
  id: number;
  asset_type_id: number;
  asset_type_name: string;
  name: string;
  interval_days: number;
  warning_days: number;
  notes: string | null;
};

type Asset = {
  id: number;
  room_id: number | null;
  asset_type_id: number | null;
  name: string;
  category: string | null;
  brand: string | null;
  model: string | null;
  installed_at: string | null;
  notes: string | null;
  room_name: string | null;
  room_color: string | null;
  asset_type_name: string | null;
  asset_type_icon: string | null;
  maintenance_count: number;
};

type Task = {
  id: number;
  asset_id: number;
  asset_type_id: number | null;
  name: string;
  interval_days: number;
  warning_days: number;
  last_completed_at: string | null;
  next_due_at: string;
  notes: string | null;
  asset_name: string;
  room_name: string | null;
  asset_type_icon: string | null;
  days_until_due: number;
};

type Log = {
  id: number;
  task_id: number;
  task_name: string;
  asset_name: string;
  completed_at: string;
  notes: string | null;
};

type CasaData = {
  rooms: Room[];
  assetTypes: AssetType[];
  templates: MaintenanceTemplate[];
  assets: Asset[];
  tasks: Task[];
  logs: Log[];
};

const emptyData: CasaData = {
  rooms: [],
  assetTypes: [],
  templates: [],
  assets: [],
  tasks: [],
  logs: [],
};

const iconMap: Record<string, typeof Wrench> = {
  "washing-machine": WashingMachine,
  sparkles: Sparkles,
  coffee: Coffee,
  snowflake: AirVent,
  flame: Flame,
  refrigerator: Refrigerator,
  "cooking-pot": CookingPot,
  wind: Wind,
  wrench: Wrench,
};

const navItems: Array<{ id: View; label: string; icon: typeof Home }> = [
  { id: "today", label: "Oggi", icon: LayoutDashboard },
  { id: "home", label: "La mia casa", icon: Home },
  { id: "plan", label: "Pianificazione", icon: CalendarDays },
  { id: "history", label: "Registro", icon: History },
  { id: "catalog", label: "Catalogo", icon: Database },
];

function formatDate(value: string | null, long = false) {
  if (!value) return "Mai";
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: long ? "long" : "short",
    year: long ? "numeric" : undefined,
  }).format(new Date(`${value}T12:00:00`));
}

function formatInterval(days: number) {
  if (days % 365 === 0) {
    const years = days / 365;
    return years === 1 ? "Ogni anno" : `Ogni ${years} anni`;
  }
  if (days % 30 === 0) {
    const months = days / 30;
    return months === 1 ? "Ogni mese" : `Ogni ${months} mesi`;
  }
  return `Ogni ${days} giorni`;
}

function dueLabel(days: number) {
  if (days < -1) return `Scaduta da ${Math.abs(days)} giorni`;
  if (days === -1) return "Scaduta da ieri";
  if (days === 0) return "Da fare oggi";
  if (days === 1) return "Domani";
  return `Tra ${days} giorni`;
}

function taskTone(task: Task) {
  if (task.days_until_due < 0) return "danger";
  if (task.days_until_due <= task.warning_days) return "warning";
  return "good";
}

function toPayload(form: HTMLFormElement): Record<string, unknown> {
  return Object.fromEntries(new FormData(form).entries());
}

async function apiAction(action: string, payload: Record<string, unknown> = {}) {
  const response = await fetch("/api/casa", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  if (response.status === 401) { window.location.assign("/login"); throw new Error("Accedi di nuovo."); }
  const result = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(result.error || "Operazione non riuscita.");
  return result;
}

export function CasaApp() {
  const [view, setView] = useState<View>("today");
  const [data, setData] = useState<CasaData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/casa", { cache: "no-store" });
      if (response.status === 401) { window.location.assign("/login"); return; }
      const result = (await response.json()) as CasaData & { error?: string };
      if (!response.ok) throw new Error(result.error);
      setData(result);
      setError(null);
    } catch {
      setError("Non riesco a caricare i dati. Riprova tra poco.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const refresh = () => void load();
    window.addEventListener("casa-refresh", refresh);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener("casa-refresh", refresh);
    };
  }, [load]);

  const perform = useCallback(
    async (
      action: string,
      payload: Record<string, unknown>,
      successMessage: string,
    ) => {
      try {
        await apiAction(action, payload);
        await load();
        toast.success(successMessage);
        setModal(null);
        return true;
      } catch (actionError) {
        toast.error(
          actionError instanceof Error
            ? actionError.message
            : "Operazione non riuscita.",
        );
        return false;
      }
    },
    [load],
  );

  const overdue = useMemo(
    () => data.tasks.filter((task) => task.days_until_due < 0),
    [data.tasks],
  );
  const dueNow = useMemo(
    () =>
      data.tasks.filter(
        (task) =>
          task.days_until_due >= 0 &&
          task.days_until_due <= task.warning_days,
      ),
    [data.tasks],
  );
  const healthy = data.tasks.length - overdue.length - dueNow.length;
  const healthScore = data.tasks.length
    ? Math.round(((data.tasks.length - overdue.length) / data.tasks.length) * 100)
    : 100;

  const openComplete = (task: Task) => {
    setSelectedTask(task);
    setModal("complete");
  };

  const currentTitle =
    navItems.find((item) => item.id === view)?.label ?? "Domio";

  return (
    <SidebarProvider>
      <Sidebar className="border-r-0" collapsible="icon">
        <SidebarHeader className="px-3 pb-4 pt-5">
          <div className="flex items-center gap-3 px-2">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#37d6c0] text-[#082b31] shadow-[0_7px_20px_rgba(55,214,192,.25)]">
              <Home className="size-5" strokeWidth={2.3} />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <strong className="block text-base tracking-[-0.02em] text-white">
                Domio
              </strong>
              <span className="text-xs text-white/50">Registro domestico</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={view === item.id}
                        tooltip={item.label}
                        onClick={() => setView(item.id)}
                        className="h-11 rounded-xl px-3 text-white/65 hover:bg-white/8 hover:text-white data-[active=true]:bg-white data-[active=true]:text-[#10333a]"
                      >
                        <Icon className="size-[18px]" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-3">
          <form method="post" action="/auth/logout"><Button type="submit" variant="ghost" className="w-full text-white hover:bg-white/10 hover:text-white">Esci</Button></form>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 group-data-[collapsible=icon]:p-2">
            <div className="flex items-center gap-2 text-white/75">
              <Settings2 className="size-4 shrink-0" />
              <span className="text-xs font-medium group-data-[collapsible=icon]:hidden">
                Dati protetti
              </span>
            </div>
            <p className="mt-1.5 text-[11px] leading-4 text-white/40 group-data-[collapsible=icon]:hidden">
              Il tuo registro resta privato.
            </p>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="min-w-0 bg-[#f4f7f9]">
        <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-[#dfe8eb] bg-[#f4f7f9]/92 px-4 backdrop-blur-xl md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="rounded-xl border border-[#dce6e9] bg-white text-[#25454b] shadow-sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-[#668087]">
                {new Intl.DateTimeFormat("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }).format(new Date())}
              </p>
              <h1 className="truncate text-xl font-bold tracking-[-0.03em] text-[#102f36]">
                {currentTitle}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setModal("asset")}
              className="hidden rounded-xl border-[#d7e3e6] bg-white sm:inline-flex"
            >
              <Plus className="size-4" /> Elemento
            </Button>
            <Button
              onClick={() => setModal("task")}
              className="rounded-xl bg-[#103c44] text-white shadow-[0_8px_20px_rgba(16,60,68,.16)] hover:bg-[#0d3238]"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Manutenzione</span>
              <span className="sm:hidden">Aggiungi</span>
            </Button>
          </div>
        </header>

        {error && (
          <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 md:mx-8">
            <CircleAlert className="size-5 shrink-0" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void load()}
              className="ml-auto"
            >
              Riprova
            </Button>
          </div>
        )}

        {loading ? (
          <LoadingView />
        ) : (
          <main className="mx-auto w-full max-w-[1440px] p-4 md:p-8">
            {view === "today" && (
              <TodayView
                data={data}
                overdue={overdue}
                dueNow={dueNow}
                healthy={healthy}
                score={healthScore}
                onComplete={openComplete}
                onAddAsset={() => setModal("asset")}
                onAddTask={() => setModal("task")}
              />
            )}
            {view === "home" && (
              <HomeView
                data={data}
                search={search}
                onSearch={setSearch}
                onAsset={setSelectedAsset}
                onAddAsset={() => setModal("asset")}
                onAddRoom={() => setModal("room")}
              />
            )}
            {view === "plan" && (
              <PlanView tasks={data.tasks} onComplete={openComplete} perform={perform} />
            )}
            {view === "history" && <HistoryView logs={data.logs} perform={perform} />}
            {view === "catalog" && (
              <CatalogView
                data={data}
                onAddType={() => setModal("type")}
                onAddTemplate={() => setModal("template")}
                onAddRoom={() => setModal("room")}
                perform={perform}
              />
            )}
          </main>
        )}
      </SidebarInset>

      <AssetDialog
        open={modal === "asset"}
        data={data}
        onClose={() => setModal(null)}
        perform={perform}
      />
      <TaskDialog
        open={modal === "task"}
        assets={data.assets}
        onClose={() => setModal(null)}
        perform={perform}
      />
      <CompleteDialog
        open={modal === "complete"}
        task={selectedTask}
        onClose={() => {
          setModal(null);
          setSelectedTask(null);
        }}
        perform={perform}
      />
      <RoomDialog
        open={modal === "room"}
        onClose={() => setModal(null)}
        perform={perform}
      />
      <TypeDialog
        open={modal === "type"}
        onClose={() => setModal(null)}
        perform={perform}
      />
      <TemplateDialog
        open={modal === "template"}
        types={data.assetTypes}
        onClose={() => setModal(null)}
        perform={perform}
      />
      <AssetSheet
        asset={data.assets.find(asset => asset.id === selectedAsset?.id) ?? null}
        data={data}
        perform={perform}
        tasks={data.tasks}
        logs={data.logs}
        onClose={() => setSelectedAsset(null)}
        onComplete={openComplete}
        onDelete={async (asset) => {
          const ok = await perform(
            "delete_asset",
            { id: asset.id },
            "Elemento eliminato",
          );
          if (ok) setSelectedAsset(null);
        }}
      />
      <Toaster position="bottom-right" richColors />
    </SidebarProvider>
  );
}

function LoadingView() {
  return (
    <main className="mx-auto grid w-full max-w-[1440px] gap-5 p-4 md:grid-cols-3 md:p-8">
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <Skeleton key={item} className="h-40 rounded-3xl bg-[#e4ecee]" />
      ))}
    </main>
  );
}

function TodayView({
  data,
  overdue,
  dueNow,
  healthy,
  score,
  onComplete,
  onAddAsset,
  onAddTask,
}: {
  data: CasaData;
  overdue: Task[];
  dueNow: Task[];
  healthy: number;
  score: number;
  onComplete: (task: Task) => void;
  onAddAsset: () => void;
  onAddTask: () => void;
}) {
  const attention = [...overdue, ...dueNow].slice(0, 6);
  const next = data.tasks
    .filter((task) => task.days_until_due > task.warning_days)
    .slice(0, 4);

  if (!data.assets.length) {
    return (
      <section className="grid min-h-[calc(100vh-140px)] place-items-center">
        <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-[#dbe7e9] bg-white shadow-[0_24px_80px_rgba(21,56,64,.08)]">
          <div className="grid gap-8 p-7 md:grid-cols-[1.15fr_.85fr] md:p-11">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#dff8f3] px-3 py-1.5 text-xs font-bold text-[#11675f]">
                <Sparkles className="size-3.5" /> La casa, sotto controllo
              </span>
              <h2 className="mt-5 text-3xl font-bold leading-tight tracking-[-0.045em] text-[#102f36] md:text-4xl">
                Inizia dal primo elemento che vuoi curare.
              </h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-[#60777d]">
                Aggiungi un impianto o un elettrodomestico: Domio preparerà
                le attività periodiche e terrà aggiornate le scadenze.
              </p>
              <Button
                onClick={onAddAsset}
                className="mt-7 h-11 rounded-xl bg-[#103c44] px-5 text-white"
              >
                <Plus className="size-4" /> Aggiungi il primo elemento
              </Button>
            </div>
            <div className="rounded-[26px] bg-[#102f36] p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#79dccc]">
                Tre passi
              </p>
              <ol className="mt-5 space-y-5">
                {[
                  "Scegli stanza e tipologia",
                  "Conferma le attività suggerite",
                  "Segna Fatto quando intervieni",
                ].map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold text-[#79dccc]">
                      {index + 1}
                    </span>
                    <span className="pt-1 text-sm text-white/80">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-[28px] bg-[#10333a] p-6 text-white shadow-[0_20px_55px_rgba(16,51,58,.14)] md:p-8">
          <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-[#87ded1]">
                Stato generale della casa
              </p>
              <h2 className="mt-2 max-w-xl text-3xl font-bold leading-tight tracking-[-0.04em]">
                {overdue.length
                  ? `${overdue.length} ${overdue.length === 1 ? "attività richiede" : "attività richiedono"} attenzione.`
                  : "Tutto procede secondo il piano."}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/55">
                {data.assets.length} elementi monitorati in {data.rooms.length}{" "}
                stanze
              </p>
            </div>
            <div
              className="relative grid size-32 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(#42dbc3 ${score}%, rgba(255,255,255,.12) 0)`,
              }}
            >
              <div className="grid size-[106px] place-items-center rounded-full bg-[#10333a] text-center">
                <div>
                  <strong className="block text-3xl tracking-[-0.05em]">
                    {score}%
                  </strong>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-white/45">
                    indice cura
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <Metric label="Scadute" value={overdue.length} tone="danger" />
          <Metric label="In arrivo" value={dueNow.length} tone="warning" />
          <Metric label="In ordine" value={healthy} tone="good" />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-[26px] border border-[#dbe6e8] bg-white p-5 md:p-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#71878c]">
                Priorità
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-[-0.035em] text-[#12343b]">
                Da fare
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onAddTask}
              className="rounded-xl"
            >
              <Plus className="size-4" /> Nuova
            </Button>
          </div>
          {attention.length ? (
            <div className="divide-y divide-[#e6edef]">
              {attention.map((task) => (
                <TaskRow key={task.id} task={task} onComplete={onComplete} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#e8f8f4] p-6 text-center">
              <div className="mx-auto grid size-11 place-items-center rounded-full bg-white text-[#11806f]">
                <Check className="size-5" />
              </div>
              <strong className="mt-3 block text-[#164c47]">
                Nessuna urgenza
              </strong>
              <p className="mt-1 text-sm text-[#5f7e79]">
                Le prossime attività compariranno qui al momento giusto.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-[26px] border border-[#dbe6e8] bg-white p-5 md:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#71878c]">
            Più avanti
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-[-0.035em] text-[#12343b]">
            Prossime scadenze
          </h2>
          <div className="mt-5 space-y-3">
            {next.length ? (
              next.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-2xl bg-[#f4f7f8] p-3.5"
                >
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#287c78]">
                    <AssetIcon name={task.asset_type_icon} />
                  </div>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-[#183b42]">
                      {task.name}
                    </strong>
                    <span className="text-xs text-[#71868b]">
                      {task.asset_name}
                    </span>
                  </div>
                  <span className="ml-auto whitespace-nowrap text-xs font-semibold text-[#42656b]">
                    {formatDate(task.next_due_at)}
                  </span>
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-[#f4f7f8] p-5 text-sm text-[#71868b]">
                Nessun’altra scadenza programmata.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "danger" | "warning" | "good";
}) {
  const styles = {
    danger: "bg-[#fff0ed] text-[#a53d2e] border-[#f1d7d1]",
    warning: "bg-[#fff7df] text-[#94640a] border-[#eee0b8]",
    good: "bg-[#e8f8f4] text-[#147365] border-[#cae9e1]",
  };
  return (
    <div
      className={`flex min-h-24 flex-col justify-between rounded-[22px] border p-4 ${styles[tone]}`}
    >
      <span className="text-xs font-bold uppercase tracking-[0.1em]">
        {label}
      </span>
      <strong className="text-3xl tracking-[-0.05em]">{value}</strong>
    </div>
  );
}

function TaskRow({
  task,
  onComplete,
}: {
  task: Task;
  onComplete: (task: Task) => void;
}) {
  const tone = taskTone(task);
  const toneClass = {
    danger: "bg-[#fff0ed] text-[#a53d2e]",
    warning: "bg-[#fff7df] text-[#94640a]",
    good: "bg-[#e8f8f4] text-[#147365]",
  }[tone];
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`grid size-11 shrink-0 place-items-center rounded-2xl ${toneClass}`}
        >
          <AssetIcon name={task.asset_type_icon} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="truncate text-sm text-[#183a41]">
              {task.name}
            </strong>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${toneClass}`}
            >
              {dueLabel(task.days_until_due)}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-[#74888d]">
            {task.asset_name}
            {task.room_name ? ` · ${task.room_name}` : ""}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => onComplete(task)}
        className="ml-14 rounded-xl border-[#cfe4df] text-[#176a60] sm:ml-auto"
      >
        <Check className="size-4" /> Fatto
      </Button>
    </div>
  );
}

function HomeView({
  data,
  search,
  onSearch,
  onAsset,
  onAddAsset,
  onAddRoom,
}: {
  data: CasaData;
  search: string;
  onSearch: (value: string) => void;
  onAsset: (asset: Asset) => void;
  onAddAsset: () => void;
  onAddRoom: () => void;
}) {
  const normalized = search.toLocaleLowerCase("it");
  const filtered = data.assets.filter((asset) =>
    [asset.name, asset.room_name, asset.brand, asset.asset_type_name]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase("it").includes(normalized)),
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-[#688087]">Inventario domestico</p>
          <h2 className="mt-1 text-3xl font-bold tracking-[-0.045em] text-[#12343b]">
            {data.assets.length} elementi di casa
          </h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#789097]" />
            <Input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Cerca elemento o stanza"
              className="h-10 w-full rounded-xl border-[#d6e2e5] bg-white pl-9 sm:w-64"
            />
          </div>
          <Button variant="outline" onClick={onAddRoom} className="rounded-xl">
            <Plus className="size-4" /> Stanza
          </Button>
          <Button onClick={onAddAsset} className="rounded-xl bg-[#103c44]">
            <Plus className="size-4" /> Elemento
          </Button>
        </div>
      </section>

      <section className="flex gap-3 overflow-x-auto pb-1">
        {data.rooms.map((room) => {
          const count = data.assets.filter(
            (asset) => asset.room_id === room.id,
          ).length;
          return (
            <div
              key={room.id}
              className="min-w-36 rounded-2xl border border-[#dce6e9] bg-white p-4"
            >
              <span
                className="mb-3 block h-1.5 w-9 rounded-full"
                style={{ backgroundColor: room.color }}
              />
              <strong className="block text-sm text-[#173940]">
                {room.name}
              </strong>
              <span className="mt-1 block text-xs text-[#788c91]">
                {count} {count === 1 ? "elemento" : "elementi"}
              </span>
            </div>
          );
        })}
      </section>

      {filtered.length ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((asset) => (
            <button
              key={asset.id}
              onClick={() => onAsset(asset)}
              className="group rounded-[24px] border border-[#dbe6e8] bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-[#bed4d7] hover:shadow-[0_16px_40px_rgba(21,56,64,.08)]"
            >
              <div className="flex items-start justify-between">
                <div className="grid size-12 place-items-center rounded-2xl bg-[#e7f7f4] text-[#13776d]">
                  <AssetIcon name={asset.asset_type_icon} size="lg" />
                </div>
                <ChevronRight className="size-5 text-[#a0afb2] transition group-hover:translate-x-0.5 group-hover:text-[#315e64]" />
              </div>
              <p className="mt-7 text-xs font-bold uppercase tracking-[0.1em] text-[#71878c]">
                {asset.room_name ?? "Senza stanza"}
              </p>
              <h3 className="mt-1 text-lg font-bold tracking-[-0.025em] text-[#17383f]">
                {asset.name}
              </h3>
              <p className="mt-1 min-h-5 text-sm text-[#74888d]">
                {[asset.brand, asset.model].filter(Boolean).join(" · ") ||
                  asset.asset_type_name ||
                  "Nessun dettaglio"}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-[#e9eff0] pt-4 text-xs">
                <span className="text-[#6d8388]">
                  {asset.maintenance_count} attività
                </span>
                <span className="font-semibold text-[#265f63]">
                  Apri scheda
                </span>
              </div>
            </button>
          ))}
        </section>
      ) : (
        <EmptyBlock
          title="Nessun elemento trovato"
          text={
            search
              ? "Prova con un nome, una marca o una stanza diversa."
              : "Aggiungi il primo elemento della casa."
          }
          action={search ? undefined : onAddAsset}
          actionLabel="Aggiungi elemento"
        />
      )}
    </div>
  );
}

function PlanView({
  tasks,
  onComplete,
  perform,
}: {
  tasks: Task[];
  onComplete: (task: Task) => void;
  perform: Perform;
}) {
  const groups = [
    {
      label: "Scadute",
      tone: "danger",
      tasks: tasks.filter((task) => task.days_until_due < 0),
    },
    {
      label: "Entro 30 giorni",
      tone: "warning",
      tasks: tasks.filter(
        (task) => task.days_until_due >= 0 && task.days_until_due <= 30,
      ),
    },
    {
      label: "Più avanti",
      tone: "good",
      tasks: tasks.filter((task) => task.days_until_due > 30),
    },
  ];
  return (
    <div>
      <div className="max-w-2xl">
        <p className="text-sm text-[#688087]">Calendario operativo</p>
        <h2 className="mt-1 text-3xl font-bold tracking-[-0.045em] text-[#12343b]">
          Tutte le scadenze, in ordine.
        </h2>
      </div>
      <div className="mt-7 grid gap-5 xl:grid-cols-3">
        {groups.map((group) => (
          <section
            key={group.label}
            className="rounded-[24px] border border-[#dbe6e8] bg-white p-4"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="font-bold text-[#173940]">{group.label}</h3>
              <span className="grid min-w-7 place-items-center rounded-full bg-[#edf2f3] px-2 py-1 text-xs font-bold text-[#60777d]">
                {group.tasks.length}
              </span>
            </div>
            <div className="space-y-2">
              {group.tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-2xl border border-[#e3eaec] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#edf7f5] text-[#1a756d]">
                      <AssetIcon name={task.asset_type_icon} />
                    </div>
                    <div className="min-w-0">
                      <strong className="block text-sm text-[#173940]">
                        {task.name}
                      </strong>
                      <span className="text-xs text-[#75898e]">
                        {task.asset_name}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#557178]">
                      {dueLabel(task.days_until_due)}
                    </span>
                    <EditRecord kind="task" record={task} perform={perform} />
                    <DeleteButton name={task.name} description="La manutenzione e il suo storico verranno eliminati." onDelete={() => perform("delete_task", { id: task.id }, "Manutenzione eliminata")} />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onComplete(task)}
                      className="h-8 rounded-lg text-[#176a60]"
                    >
                      <Check className="size-4" /> Fatto
                    </Button>
                  </div>
                </div>
              ))}
              {!group.tasks.length && (
                <p className="rounded-2xl bg-[#f4f7f8] p-4 text-sm text-[#7a8c91]">
                  Nessuna attività.
                </p>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function HistoryView({ logs, perform }: { logs: Log[]; perform: Perform }) {
  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm text-[#688087]">Interventi completati</p>
      <h2 className="mt-1 text-3xl font-bold tracking-[-0.045em] text-[#12343b]">
        Il registro della casa
      </h2>
      <div className="mt-7 overflow-hidden rounded-[26px] border border-[#dbe6e8] bg-white">
        {logs.length ? (
          <div className="divide-y divide-[#e7edef]">
            {logs.map((log) => (
              <article
                key={log.id}
                className="grid gap-3 p-5 sm:grid-cols-[120px_1fr] sm:p-6"
              >
                <time className="text-sm font-bold text-[#187268]">
                  {formatDate(log.completed_at, true)}
                </time>
                <div>
                  <div className="flex items-center justify-between gap-3"><strong className="text-[#173940]">{log.task_name}</strong>
                    <EditRecord kind="log" record={log} perform={perform} />
                    <DeleteButton name={log.task_name} description="Verrà eliminata solo questa registrazione. Le date della manutenzione non cambieranno." onDelete={() => perform("delete_log", { id: log.id }, "Registrazione eliminata")} />
                  </div>
                  <p className="mt-1 text-sm text-[#6f858a]">{log.asset_name}</p>
                  {log.notes && (
                    <p className="mt-3 rounded-xl bg-[#f4f7f8] p-3 text-sm text-[#536d73]">
                      {log.notes}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyBlock
            title="Il registro è ancora vuoto"
            text="Quando completi una manutenzione, la sua scheda comparirà qui."
          />
        )}
      </div>
    </div>
  );
}



type EditKind = "asset" | "room" | "asset_type" | "template" | "task" | "log";
type EditField = { name: string; label: string; type?: string; required?: boolean; min?: number; max?: number; maxLength?: number; options?: { id: string | number; name: string }[] };

function EditRecord({ kind, record, data, perform }: {
  kind: EditKind;
  record: Asset | Room | AssetType | MaintenanceTemplate | Task | Log;
  data?: CasaData;
  perform: Perform;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const values = record as unknown as Record<string, string | number | null>;
  const title = { asset: "elemento", room: "stanza", asset_type: "tipo", template: "attività standard", task: "manutenzione", log: "registrazione" }[kind];
  const fields: EditField[] = [];
  if (kind !== "log") fields.push({ name: "name", label: "Nome", required: true, maxLength: kind === "room" ? 80 : kind === "asset_type" ? 100 : 120 });
  if (kind === "asset") fields.push(
    { name: "room_id", label: "Stanza", options: [{ id: "", name: "Senza stanza" }, ...(data?.rooms ?? [])] },
    { name: "asset_type_id", label: "Tipo", options: [{ id: "", name: "Nessun tipo" }, ...(data?.assetTypes ?? [])] },
    { name: "category", label: "Categoria", maxLength: 80 },
    { name: "brand", label: "Marca", maxLength: 80 },
    { name: "model", label: "Modello", maxLength: 80 },
    { name: "installed_at", label: "Data installazione", type: "date" },
  );
  if (kind === "room") fields.push(
    { name: "color", label: "Colore", type: "color", required: true },
    { name: "sort_order", label: "Ordine", type: "number", min: 0, required: true },
  );
  if (kind === "asset_type") fields.push(
    { name: "category", label: "Categoria", maxLength: 80 },
    { name: "icon", label: "Icona", options: Object.keys(iconMap).map(id => ({ id, name: ({ "washing-machine": "Lavatrice", sparkles: "Pulizia", coffee: "Caffè", snowflake: "Climatizzazione", flame: "Riscaldamento", refrigerator: "Frigorifero", "cooking-pot": "Cucina", wind: "Ventilazione", wrench: "Generica" } as Record<string, string>)[id] })) },
  );
  if (kind === "template") fields.push({ name: "asset_type_id", label: "Tipo di elemento", required: true, options: data?.assetTypes ?? [] });
  if (kind === "template" || kind === "task") fields.push(
    { name: "interval_days", label: "Frequenza (giorni)", type: "number", min: 1, max: 36500, required: true },
    { name: "warning_days", label: "Preavviso (giorni)", type: "number", min: 0, required: true },
  );
  if (kind === "task") fields.push({ name: "next_due_at", label: "Prossima scadenza", type: "date", required: true });
  if (kind === "log") fields.push({ name: "completed_at", label: "Data intervento", type: "date", required: true });
  if (["asset", "template", "task", "log"].includes(kind)) fields.push({ name: "notes", label: "Note", type: "textarea", maxLength: 1000 });
  const description = kind === "log"
    ? "Se la data dell'ultimo intervento cambia, ultima esecuzione e prossima scadenza vengono ricalcolate. Le sole note non cambiano le scadenze."
    : kind === "template" || kind === "asset_type"
      ? "Le manutenzioni già create non vengono modificate."
      : kind === "task"
        ? "La prossima scadenza è quella che scegli qui. Lo storico degli interventi resta invariato."
        : "Aggiorna i dettagli e salva le modifiche.";
  return <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
    <Button type="button" variant="ghost" size="sm" title={`Modifica ${values.name ?? values.task_name}`} onClick={() => setOpen(true)} className="shrink-0 text-[#176a60]">
      <Pencil className="size-4" /><span>Modifica</span>
    </Button>
    <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl sm:max-w-lg">
      <DialogHeader><DialogTitle>Modifica {title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      <form onSubmit={async event => {
        event.preventDefault();
        const payload = { ...toPayload(event.currentTarget), id: record.id };
        setSaving(true);
        try { if (await perform("update_" + kind, payload, "Modifiche salvate")) setOpen(false); }
        finally { setSaving(false); }
      }}>
        <fieldset disabled={saving} className="space-y-4">
          {fields.map(field => <label key={field.name} className="block space-y-2 text-sm text-[#35565d]">
            <span className="font-medium">{field.label}</span>
            {field.options ? <select name={field.name} defaultValue={String(values[field.name] ?? "")} required={field.required} className="h-10 w-full rounded-lg border bg-white px-3">
              {field.options.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select> : field.type === "textarea"
              ? <Textarea name={field.name} defaultValue={String(values[field.name] ?? "")} maxLength={field.maxLength} />
              : <Input name={field.name} type={field.type ?? "text"} defaultValue={String(values[field.name] ?? "")} required={field.required} min={field.min} max={field.max} step={field.type === "number" ? 1 : undefined} maxLength={field.maxLength} />}
          </label>)}
          <DialogFooter className="mt-5">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
            <Button type="submit" className="bg-[#103c44]">{saving ? "Salvataggio…" : "Salva"}</Button>
          </DialogFooter>
        </fieldset>
      </form>
    </DialogContent>
  </Dialog>;
}

function DeleteButton({ name, description, onDelete }: { name: string; description: string; onDelete: () => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return <AlertDialog open={open} onOpenChange={value => { if (!pending) setOpen(value); }}>
    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Elimina ${name}`} title={`Elimina ${name}`} className="shrink-0 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></Button></AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Eliminare {name}?</AlertDialogTitle><AlertDialogDescription>{description} Questa operazione non può essere annullata.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel disabled={pending}>Annulla</AlertDialogCancel>
        <AlertDialogAction disabled={pending} className="bg-red-600 hover:bg-red-700" onClick={async event => {
          event.preventDefault(); setPending(true);
          try { if (await onDelete()) setOpen(false); } finally { setPending(false); }
        }}>{pending ? "Eliminazione…" : "Elimina"}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

function CatalogView({
  data,
  onAddType,
  onAddTemplate,
  onAddRoom,
  perform,
}: {
  data: CasaData;
  onAddType: () => void;
  onAddTemplate: () => void;
  onAddRoom: () => void;
  perform: Perform;
}) {
  return (
    <div>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm text-[#688087]">Regole riutilizzabili</p>
          <h2 className="mt-1 text-3xl font-bold tracking-[-0.045em] text-[#12343b]">
            Configura una volta, riusa sempre.
          </h2>
        </div>
      </div>
      <Tabs defaultValue="types" className="mt-7">
        <TabsList variant="line" className="w-full justify-start border-b">
          <TabsTrigger value="types" className="flex-none px-3 pb-3">
            Tipi di elemento · {data.assetTypes.length}
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-none px-3 pb-3">
            Attività standard · {data.templates.length}
          </TabsTrigger>
          <TabsTrigger value="rooms" className="flex-none px-3 pb-3">Stanze · {data.rooms.length}</TabsTrigger>
        </TabsList>
        <TabsContent value="types" className="mt-5">
          <div className="mb-4 flex justify-end">
            <Button onClick={onAddType} className="rounded-xl bg-[#103c44]">
              <Plus className="size-4" /> Nuovo tipo
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.assetTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-center gap-4 rounded-2xl border border-[#dbe6e8] bg-white p-4"
              >
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e7f7f4] text-[#13776d]">
                  <AssetIcon name={type.icon} />
                </div>
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-[#173940]">
                    {type.name}
                  </strong>
                  <span className="text-xs text-[#75898e]">
                    {type.category ?? "Altro"} · {type.template_count} attività
                  </span>
                </div>
                <div className="ml-auto flex"><EditRecord kind="asset_type" record={type} perform={perform} /><DeleteButton name={type.name} description="Il tipo e i suoi modelli standard verranno eliminati. Gli elementi e le manutenzioni già create resteranno disponibili, senza questo tipo." onDelete={() => perform("delete_asset_type", { id: type.id }, "Tipo eliminato")} /></div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="templates" className="mt-5">
          <div className="mb-4 flex justify-end">
            <Button
              onClick={onAddTemplate}
              className="rounded-xl bg-[#103c44]"
            >
              <Plus className="size-4" /> Nuova attività standard
            </Button>
          </div>
          <div className="overflow-hidden rounded-[24px] border border-[#dbe6e8] bg-white">
            <div className="hidden grid-cols-[1.3fr_1fr_.7fr_.5fr] gap-4 bg-[#eef3f4] px-5 py-3 text-xs font-bold uppercase tracking-[0.08em] text-[#6f8489] md:grid">
              <span>Attività</span>
              <span>Per</span>
              <span>Frequenza</span>
              <span>Preavviso</span>
            </div>
            <div className="divide-y divide-[#e7edef]">
              {data.templates.map((template) => (
                <div
                  key={template.id}
                  className="grid gap-2 px-5 py-4 text-sm md:grid-cols-[1.3fr_1fr_.7fr_.5fr] md:gap-4"
                >
                  <strong className="text-[#173940]">{template.name}</strong>
                  <span className="text-[#61797f]">
                    {template.asset_type_name}
                  </span>
                  <span className="text-[#61797f]">
                    {formatInterval(template.interval_days)}
                  </span>
                  <span className="text-[#61797f]">
                    {template.warning_days} gg
                    <EditRecord kind="template" record={template} data={data} perform={perform} />
                    <DeleteButton name={template.name} description="Il modello standard verrà eliminato. Le manutenzioni già create non cambieranno." onDelete={() => perform("delete_template", { id: template.id }, "Attività standard eliminata")} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="rooms" className="mt-5">
          <div className="mb-4 flex justify-end"><Button onClick={onAddRoom}><Plus className="size-4" /> Nuova stanza</Button></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.rooms.map(room => <div key={room.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-4">
              <strong>{room.name}</strong>
              <div className="flex"><EditRecord kind="room" record={room} perform={perform} />
              <DeleteButton name={room.name} description="La stanza verrà eliminata. Gli elementi resteranno disponibili come «Senza stanza»." onDelete={() => perform("delete_room", { id: room.id }, "Stanza eliminata")} /></div>
            </div>)}
          </div>
          {!data.rooms.length && <p className="mt-4 text-sm text-[#61797f]">Nessuna stanza. Aggiungi solo quelle che ti servono.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssetDialog({
  open,
  data,
  onClose,
  perform,
}: {
  open: boolean;
  data: CasaData;
  onClose: () => void;
  perform: Perform;
}) {
  const [typeId, setTypeId] = useState("none");
  const [withTasks, setWithTasks] = useState(true);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = toPayload(event.currentTarget);
    payload.asset_type_id = typeId;
    payload.create_default_tasks = withTasks;
    await perform("create_asset", payload, "Elemento aggiunto");
  };
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Nuovo elemento"
      description="Registra ciò che vuoi mantenere in ordine."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome">
          <Input name="name" placeholder="Es. Lavatrice principale" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo">
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun tipo</SelectItem>
                {data.assetTypes.map((type) => (
                  <SelectItem key={type.id} value={String(type.id)}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Stanza">
            <Select name="room_id" defaultValue="none">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Senza stanza</SelectItem>
                {data.rooms.map((room) => (
                  <SelectItem key={room.id} value={String(room.id)}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Marca">
            <Input name="brand" placeholder="Facoltativa" />
          </Field>
          <Field label="Modello">
            <Input name="model" placeholder="Facoltativo" />
          </Field>
        </div>
        <Field label="Data installazione">
          <Input name="installed_at" type="date" />
        </Field>
        {typeId !== "none" && (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-[#edf8f6] p-4">
            <Checkbox
              checked={withTasks}
              onCheckedChange={(value) => setWithTasks(value === true)}
              className="mt-0.5"
            />
            <span>
              <strong className="block text-sm text-[#174a46]">
                Prepara le attività suggerite
              </strong>
              <span className="mt-1 block text-xs leading-5 text-[#66817d]">
                Potrai modificarle o aggiungerne altre in seguito.
              </span>
            </span>
          </label>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" className="bg-[#103c44]">
            Aggiungi elemento
          </Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );
}

function TaskDialog({
  open,
  assets,
  onClose,
  perform,
}: {
  open: boolean;
  assets: Asset[];
  onClose: () => void;
  perform: Perform;
}) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await perform(
      "create_task",
      toPayload(event.currentTarget),
      "Manutenzione programmata",
    );
  };
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Nuova manutenzione"
      description="Definisci frequenza, preavviso e prima scadenza."
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Elemento">
          <Select name="asset_id" required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleziona un elemento" />
            </SelectTrigger>
            <SelectContent>
              {assets.map((asset) => (
                <SelectItem key={asset.id} value={String(asset.id)}>
                  {asset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Attività">
          <Input name="name" placeholder="Es. Pulizia filtro" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Frequenza (giorni)">
            <Input
              name="interval_days"
              type="number"
              min="1"
              defaultValue="90"
              required
            />
          </Field>
          <Field label="Preavviso (giorni)">
            <Input
              name="warning_days"
              type="number"
              min="0"
              defaultValue="14"
            />
          </Field>
        </div>
        <Field label="Prima scadenza">
          <Input name="next_due_at" type="date" />
        </Field>
        <Field label="Note">
          <Textarea name="notes" placeholder="Indicazioni o materiali utili" />
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" className="bg-[#103c44]">
            Programma
          </Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );
}

function CompleteDialog({
  open,
  task,
  onClose,
  perform,
}: {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  perform: Perform;
}) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!task) return;
    await perform(
      "complete_task",
      { ...toPayload(event.currentTarget), id: task.id },
      "Intervento registrato",
    );
  };
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Segna come completata"
      description={
        task
          ? `${task.name} · ${task.asset_name}`
          : "Registra l'intervento."
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Data completamento">
          <Input
            name="completed_at"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </Field>
        <Field label="Note dell'intervento">
          <Textarea
            name="notes"
            placeholder="Es. sostituito filtro, nessuna anomalia"
          />
        </Field>
        {task && (
          <div className="rounded-2xl bg-[#edf8f6] p-4 text-sm text-[#456d68]">
            La prossima scadenza sarà calcolata automaticamente{" "}
            {formatInterval(task.interval_days).toLocaleLowerCase("it")}.
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" className="bg-[#13766c]">
            <Check className="size-4" /> Conferma
          </Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );
}

function RoomDialog({
  open,
  onClose,
  perform,
}: {
  open: boolean;
  onClose: () => void;
  perform: Perform;
}) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Nuova stanza"
      description="Aggiungi un ambiente alla tua casa."
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await perform(
            "create_room",
            toPayload(event.currentTarget),
            "Stanza aggiunta",
          );
        }}
      >
        <Field label="Nome">
          <Input name="name" placeholder="Es. Garage" required />
        </Field>
        <Field label="Colore">
          <Input
            name="color"
            type="color"
            defaultValue="#147d72"
            className="h-11 p-1"
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" className="bg-[#103c44]">
            Aggiungi
          </Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );
}

function TypeDialog({
  open,
  onClose,
  perform,
}: {
  open: boolean;
  onClose: () => void;
  perform: Perform;
}) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Nuovo tipo di elemento"
      description="Crea una tipologia riutilizzabile."
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await perform(
            "create_asset_type",
            toPayload(event.currentTarget),
            "Tipo aggiunto",
          );
        }}
      >
        <Field label="Nome">
          <Input name="name" placeholder="Es. Addolcitore" required />
        </Field>
        <Field label="Categoria">
          <Input name="category" placeholder="Es. Impianti" />
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" className="bg-[#103c44]">
            Aggiungi
          </Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );
}

function TemplateDialog({
  open,
  types,
  onClose,
  perform,
}: {
  open: boolean;
  types: AssetType[];
  onClose: () => void;
  perform: Perform;
}) {
  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Nuova attività standard"
      description="Definisci una regola da riutilizzare sui nuovi elementi."
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await perform(
            "create_template",
            toPayload(event.currentTarget),
            "Attività standard aggiunta",
          );
        }}
      >
        <Field label="Tipo di elemento">
          <Select name="asset_type_id" required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleziona" />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type.id} value={String(type.id)}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Attività">
          <Input name="name" placeholder="Es. Controllo guarnizioni" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Frequenza (giorni)">
            <Input
              name="interval_days"
              type="number"
              min="1"
              defaultValue="90"
              required
            />
          </Field>
          <Field label="Preavviso (giorni)">
            <Input
              name="warning_days"
              type="number"
              min="0"
              defaultValue="14"
            />
          </Field>
        </div>
        <Field label="Note">
          <Textarea name="notes" placeholder="Facoltative" />
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annulla
          </Button>
          <Button type="submit" className="bg-[#103c44]">
            Aggiungi
          </Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );
}

function AssetSheet({
  asset,
  tasks,
  logs,
  onClose,
  onComplete,
  onDelete,
  data,
  perform,
}: {
  data: CasaData;
  perform: Perform;
  asset: Asset | null;
  tasks: Task[];
  logs: Log[];
  onClose: () => void;
  onComplete: (task: Task) => void;
  onDelete: (asset: Asset) => void;
}) {
  const assetTasks = asset
    ? tasks.filter((task) => task.asset_id === asset.id)
    : [];
  const taskIds = new Set(assetTasks.map((task) => task.id));
  const assetLogs = logs.filter((log) => taskIds.has(log.task_id)).slice(0, 5);
  return (
    <Sheet open={Boolean(asset)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto border-[#dce6e9] p-0 sm:max-w-xl">
        {asset && (
          <>
            <SheetHeader className="border-b border-[#e1e9eb] p-6">
              <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-[#e7f7f4] text-[#13776d]">
                <AssetIcon name={asset.asset_type_icon} size="lg" />
              </div>
              <SheetTitle className="text-2xl tracking-[-0.04em] text-[#15363d]">
                {asset.name}
              </SheetTitle>
              <SheetDescription>
                {asset.room_name ?? "Senza stanza"}
                {asset.asset_type_name ? ` · ${asset.asset_type_name}` : ""}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-7 p-6">
              <EditRecord kind="asset" record={asset} data={data} perform={perform} />
              <section>
                <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#71878c]">
                  Dettagli
                </h3>
                <dl className="mt-3 grid grid-cols-2 gap-3">
                  <Detail label="Marca" value={asset.brand ?? "—"} />
                  <Detail label="Modello" value={asset.model ?? "—"} />
                  <Detail
                    label="Installazione"
                    value={
                      asset.installed_at
                        ? formatDate(asset.installed_at, true)
                        : "—"
                    }
                  />
                  <Detail
                    label="Attività"
                    value={String(asset.maintenance_count)}
                  />
                </dl>
              </section>
              <section>
                <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#71878c]">
                  Manutenzioni
                </h3>
                <div className="mt-3 space-y-2">
                  {assetTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-2xl border border-[#e0e9eb] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <strong className="text-sm text-[#173940]">
                            {task.name}
                          </strong>
                          <p className="mt-1 text-xs text-[#75898e]">
                            {formatInterval(task.interval_days)} ·{" "}
                            {dueLabel(task.days_until_due)}
                          </p>
                        </div>
                        <EditRecord kind="task" record={task} perform={perform} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onComplete(task)}
                          className="rounded-xl text-[#176a60]"
                        >
                          <Check className="size-4" /> Fatto
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!assetTasks.length && (
                    <p className="rounded-2xl bg-[#f4f7f8] p-4 text-sm text-[#73878c]">
                      Nessuna manutenzione programmata.
                    </p>
                  )}
                </div>
              </section>
              {assetLogs.length > 0 && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#71878c]">
                    Ultimi interventi
                  </h3>
                  <div className="mt-3 space-y-3">
                    {assetLogs.map((log) => (
                      <div key={log.id} className="flex gap-3">
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#2ac0aa]" />
                        <div>
                          <strong className="block text-sm text-[#294950]">
                            {log.task_name}
                          </strong>
                          <span className="text-xs text-[#778b90]">
                            {formatDate(log.completed_at, true)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full rounded-xl text-red-700 hover:bg-red-50 hover:text-red-800"
                  >
                    <Trash2 className="size-4" /> Elimina elemento
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminare {asset.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Verranno eliminate anche le manutenzioni e lo storico
                      collegati. Questa azione non può essere annullata.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => onDelete(asset)}
                    >
                      Elimina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

type Perform = (
  action: string,
  payload: Record<string, unknown>,
  successMessage: string,
) => Promise<boolean>;

function FormDialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[24px] border-[#dce6e9] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-[-0.035em] text-[#15363d]">
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm text-[#35565d]">{label}</Label>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f3f7f8] p-3">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#7a8e93]">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-[#315158]">{value}</dd>
    </div>
  );
}

function EmptyBlock({
  title,
  text,
  action,
  actionLabel,
}: {
  title: string;
  text: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <div className="grid min-h-64 place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e8f7f4] text-[#16756b]">
          <ClipboardCheck className="size-5" />
        </div>
        <strong className="mt-4 block text-[#173940]">{title}</strong>
        <p className="mt-1 max-w-sm text-sm leading-6 text-[#72878c]">{text}</p>
        {action && actionLabel && (
          <Button
            onClick={action}
            variant="outline"
            className="mt-4 rounded-xl"
          >
            <Plus className="size-4" /> {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function AssetIcon({
  name,
  size,
}: {
  name: string | null;
  size?: "lg";
}) {
  const Icon = iconMap[name ?? "wrench"] ?? Wrench;
  return <Icon className={size === "lg" ? "size-6" : "size-[18px]"} />;
}
