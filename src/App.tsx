import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Beaker,
  Box,
  Braces,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  FlaskConical,
  FolderOpen,
  Globe2,
  HelpCircle,
  LayoutGrid,
  LoaderCircle,
  Maximize2,
  Menu,
  Monitor,
  Moon,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  Table2,
  Tablet,
  Trash2,
  TriangleAlert,
  Upload,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  configSchema,
  dataSchema,
  type Config,
  type FrameReport,
  type Scenario,
  uid,
} from "./lib/model";
import {
  baseline,
  components,
  defaultConfig,
  fixture,
  presets,
} from "./lib/fixtures";
import {
  downloadJSON,
  loadScenarios,
  parseImport,
  saveScenarios,
} from "./lib/storage";
import { observations } from "./lib/diagnostics";
import { fetchProducts, generateCase } from "./lib/api";
import PreviewFrame from "./components/PreviewFrame";
import Dialog from "./components/Dialog";

export default function App() {
  const [initial] = useState(loadScenarios);
  const [savedCases, setSavedCases] = useState(initial.scenarios);
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [view, setView] = useState<"playground" | "scenarios">("playground");
  const [panel, setPanel] = useState<"preview" | "json">("preview");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return localStorage.getItem("statelab:theme") === "dark"
        ? "dark"
        : "light";
    } catch {
      return "light";
    }
  });
  const [runtime, setRuntime] = useState<Config["state"] | null>(null);
  const [busy, setBusy] = useState<"api" | "generate" | null>(null);
  const [fit, setFit] = useState(true);
  const [report, setReport] = useState<FrameReport | null>(null);
  const [log, setLog] = useState("Workspace ready. Make a little trouble.");
  const [modal, setModal] = useState<
    "save" | "help" | "generate" | "delete" | "privacy" | null
  >(null);
  const [scenarioName, setScenarioName] = useState("");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [nav, setNav] = useState(false);
  const [stored, setStored] = useState(true);
  const [jsonDraft, setJsonDraft] = useState(() =>
    JSON.stringify(defaultConfig().data, null, 2),
  );
  const [jsonError, setJsonError] = useState("");
  const [challenge, setChallenge] = useState<Config["preset"]>("long");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const activeConfig = useMemo(
    () => (runtime ? { ...config, state: runtime } : config),
    [config, runtime],
  );
  const component = components.find((c) => c.id === config.component)!;
  const checks = observations(activeConfig, report);
  const visibleCases = savedCases.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("statelab:theme", theme);
    } catch {
      /* usable without persistence */
    }
  }, [theme]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      request.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(id);
  }, [toast]);
  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    request.current?.abort();
    setBusy(null);
    setRuntime(null);
  }
  function apply(next: Config, description?: string) {
    cancel();
    setConfig(next);
    setJsonDraft(JSON.stringify(next.data, null, 2));
    setJsonError("");
    if (description) setLog(description);
  }
  function patch(p: Partial<Config>, description?: string) {
    apply({ ...config, ...p }, description);
  }
  function preset(id: Config["preset"]) {
    patch(
      {
        preset: id,
        data: fixture(id),
        state: "ready",
        errorSource: "simulation",
      },
      `${presets.find((p) => p.id === id)?.name || "Custom"} dataset applied locally.`,
    );
  }
  function simulate(recover = false) {
    cancel();
    setConfig((c) => ({ ...c, errorSource: "simulation" }));
    setRuntime("loading");
    const started = performance.now();
    const outcome = recover ? "success" : config.outcome;
    setLog(
      `SIMULATION · waiting ${config.delay.toLocaleString()} ms → ${outcome}`,
    );
    timer.current = setTimeout(() => {
      setRuntime(outcome === "success" ? "ready" : "error");
      setLog(
        `SIMULATION · ${recover ? "recovery retry" : outcome} completed in ${Math.round(performance.now() - started).toLocaleString()} ms. No network request was made.`,
      );
    }, config.delay);
  }
  async function liveData() {
    cancel();
    setBusy("api");
    setRuntime("loading");
    const controller = new AbortController();
    request.current = controller;
    const started = performance.now();
    setLog("LIVE API · requesting 8 products from DummyJSON…");
    try {
      const products = await fetchProducts(config.delay, controller.signal);
      if (controller.signal.aborted) return;
      const next = {
        ...config,
        preset: "custom" as const,
        data: { ...config.data, products },
        state: "ready" as const,
      };
      setConfig(next);
      setJsonDraft(JSON.stringify(next.data, null, 2));
      setRuntime(null);
      setLog(
        `LIVE API · 8 products loaded in ${Math.round(performance.now() - started).toLocaleString()} ms. Prices supplied in USD.`,
      );
      setToast("Live product data loaded. Your people dataset was kept.");
    } catch (e) {
      if (controller.signal.aborted) return;
      setConfig((c) => ({ ...c, errorSource: "live" }));
      setRuntime("error");
      setLog(
        `LIVE API · ${e instanceof Error ? e.message : "The request failed."} Existing data preserved.`,
      );
      setToast("The API was unavailable. Use local presets or retry.");
    } finally {
      if (!controller.signal.aborted) setBusy(null);
    }
  }
  async function generate() {
    cancel();
    setModal(null);
    setBusy("generate");
    const controller = new AbortController();
    request.current = controller;
    try {
      const result = await generateCase(
        config.component,
        challenge,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const next = {
        ...config,
        preset: "custom" as const,
        data: result.data,
        state: "ready" as const,
      };
      setConfig(next);
      setJsonDraft(JSON.stringify(next.data, null, 2));
      setRuntime(null);
      setLog(
        `${result.mode === "ai" ? "AI" : "LOCAL"} GENERATOR · ${challenge} dataset applied. ${result.mode === "ai" ? "Review generated values." : "No active AI provider; original fixture used."}`,
      );
      setToast(
        result.mode === "ai"
          ? "AI-generated dataset ready."
          : "Generated locally. No AI key is configured or the provider is unavailable.",
      );
    } catch {
      if (!controller.signal.aborted)
        setToast("Generation interrupted. Your data was kept.");
    } finally {
      if (!controller.signal.aborted) setBusy(null);
    }
  }
  function persist(next: Scenario[]) {
    setSavedCases(next);
    const ok = saveScenarios(next);
    setStored(ok);
    return ok;
  }
  function save() {
    if (!scenarioName.trim()) return;
    if (savedCases.length >= 50) {
      setToast(
        "You can save up to 50 scenarios. Export and remove an older one first.",
      );
      return;
    }
    const item: Scenario = {
      version: 1,
      id: uid(),
      name: scenarioName.trim(),
      updatedAt: Date.now(),
      config: structuredClone(activeConfig),
    };
    const ok = persist([item, ...savedCases]);
    setActiveId(item.id);
    setModal(null);
    setToast(
      ok
        ? "Scenario saved on this device."
        : "Scenario kept in this session only. Export it before leaving.",
    );
  }
  function open(s: Scenario) {
    apply(structuredClone(s.config), `Saved scenario loaded: ${s.name}`);
    setActiveId(s.id);
    setView("playground");
    setPanel("preview");
    setNav(false);
  }
  function exportScenario() {
    downloadJSON(
      {
        version: 1,
        id: uid(),
        name: scenarioName.trim() || `${component.name} · ${config.preset}`,
        updatedAt: Date.now(),
        config: activeConfig,
      },
      "statelab-scenario.json",
    );
    setToast("Portable scenario exported.");
  }
  async function importFile(f: File | undefined) {
    if (!f) return;
    try {
      if (f.size > 500000) throw Error("Use a scenario smaller than 500 KB.");
      const s = parseImport(await f.text());
      open(s);
      setToast(
        "Scenario imported into the playground. Save it to keep a browser copy.",
      );
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not import this file.");
    }
  }
  function applyJson() {
    try {
      if (jsonDraft.length > 400000)
        throw Error("Dataset must be smaller than 400 KB.");
      const result = dataSchema.safeParse(JSON.parse(jsonDraft));
      if (!result.success)
        throw Error(result.error.issues[0]?.message || "Invalid dataset");
      patch(
        { data: result.data, preset: "custom", state: "ready" },
        "Custom JSON applied.",
      );
      setToast("Custom dataset applied.");
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }
  async function copyJSON() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(config.data, null, 2));
      setToast("Dataset copied.");
    } catch {
      setToast("Clipboard unavailable. Download the JSON instead.");
    }
  }
  const frameAction = (a: "retry" | "restore") =>
    a === "restore"
      ? preset("baseline")
      : config.errorSource === "live"
        ? void liveData()
        : simulate(true);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to playground
      </a>
      {nav && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setNav(false)}
        />
      )}
      <aside className={`sidebar ${nav ? "open" : ""}`}>
        <button
          className="brand"
          onClick={() => {
            setView("playground");
            setNav(false);
          }}
        >
          <span className="brand-icon">
            <Code2 size={22} />
          </span>
          <span>
            state<span className="brand-lab">lab</span>
            <i>v1</i>
          </span>
        </button>
        <div className="workspace-id">
          <span>R</span>
          <div>
            <strong>Raeesa’s workspace</strong>
            <small>PERSONAL LAB</small>
          </div>
          <ChevronDown size={13} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          <button
            className={`nav-item ${view === "playground" ? "selected" : ""}`}
            onClick={() => {
              setView("playground");
              setNav(false);
            }}
          >
            <FlaskConical size={17} /> Playground{" "}
            <span className="active-dot" />
          </button>
          <button
            className={`nav-item ${view === "scenarios" ? "selected" : ""}`}
            onClick={() => {
              cancel();
              setView("scenarios");
              setNav(false);
            }}
          >
            <FolderOpen size={17} /> Saved scenarios{" "}
            <span className="count-pill">{savedCases.length}</span>
          </button>
        </nav>
        <span className="nav-label">
          COMPONENT LIBRARY <span>03</span>
        </span>
        <div className="component-nav">
          {components.map((c, i) => (
            <button
              className={
                view === "playground" && config.component === c.id
                  ? "active"
                  : ""
              }
              onClick={() => {
                patch({ component: c.id }, `${c.name} selected.`);
                setView("playground");
                setNav(false);
              }}
              key={c.id}
            >
              {i === 0 ? (
                <Box size={15} />
              ) : i === 1 ? (
                <Table2 size={15} />
              ) : (
                <Users size={15} />
              )}
              <span>{c.name}</span>
              <ChevronRight size={12} />
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="lab-note">
            <span className="lab-note-icon">
              <Beaker size={19} />
            </span>
            <strong>Happy paths are easy.</strong>
            <p>
              Let’s see what happens
              <br />
              when real life shows up.
            </p>
            <button onClick={() => setModal("help")}>
              Take a quick tour <ArrowUpRight size={12} />
            </button>
          </div>
          <div
            className="theme-switch"
            role="group"
            aria-label="Workspace theme"
          >
            <button
              aria-pressed={theme === "light"}
              onClick={() => setTheme("light")}
            >
              <Sun size={13} /> Light
            </button>
            <button
              aria-pressed={theme === "dark"}
              onClick={() => setTheme("dark")}
            >
              <Moon size={13} /> Dark
            </button>
          </div>
          <button className="sidebar-guide" onClick={() => setModal("privacy")}>
            <ShieldCheck size={13} /> Local-first by design{" "}
            <ArrowUpRight size={11} />
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setNav(true)}
          >
            <Menu size={19} />
          </button>
          <div className="breadcrumb">
            Workspace <ChevronRight size={12} />
            <strong>
              {view === "playground" ? "Playground" : "Saved scenarios"}
            </strong>
          </div>
          <div className="top-actions">
            <span className="local-badge">
              <i />
              {stored ? "All systems local" : "Storage unavailable"}
            </span>
            <button
              className="icon-button"
              aria-label="Open guide"
              onClick={() => setModal("help")}
            >
              <HelpCircle size={17} />
            </button>
            <a
              className="github-link"
              href="https://github.com/raeesasamaai/StateLab"
              target="_blank"
              rel="noreferrer"
            >
              View source <ArrowUpRight size={12} />
            </a>
            <span className="user-avatar">RS</span>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                A LITTLE CHAOS. A BETTER INTERFACE.
              </span>
              <h1>
                {view === "playground"
                  ? "Build for the unexpected."
                  : "Your next test starts here."}
              </h1>
              <p>
                {view === "playground"
                  ? "Real components. Uncomfortable data. Confident handoffs."
                  : "Keep the edge cases worth coming back to."}
              </p>
            </div>
            <div className="page-actions">
              <button
                className="button secondary"
                onClick={() => file.current?.click()}
              >
                <Upload size={14} /> Import
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setScenarioName(`${component.name} · ${config.preset}`);
                  setModal("save");
                }}
              >
                <Plus size={15} /> Save scenario
              </button>
            </div>
          </div>
          {!stored && (
            <div className="notice warning">
              Browser storage is unavailable. Export your scenario before
              leaving this page.
            </div>
          )}
          {initial.warning && (
            <div className="notice warning">{initial.warning}</div>
          )}
          {view === "scenarios" ? (
            <section className="scenario-library">
              <div className="library-header">
                <h2>
                  Saved on this device <span>{savedCases.length}</span>
                </h2>
                <label className="search-field">
                  <Search size={14} />
                  <span className="sr-only">Search saved scenarios</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    maxLength={80}
                    placeholder="Find a scenario…"
                  />
                </label>
              </div>
              {visibleCases.length ? (
                <div className="scenario-grid">
                  {visibleCases.map((s) => (
                    <article className="scenario-card" key={s.id}>
                      <div>
                        <span className="scenario-icon">
                          {s.config.component === "product" ? (
                            <Box size={20} />
                          ) : s.config.component === "table" ? (
                            <Table2 size={20} />
                          ) : (
                            <Users size={20} />
                          )}
                        </span>
                        <button
                          className="icon-button"
                          aria-label={`Delete ${s.name}`}
                          onClick={() => {
                            setDeleteId(s.id);
                            setModal("delete");
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <h3>{s.name}</h3>
                      <p>
                        {s.config.component} · {s.config.state} ·{" "}
                        {s.config.width}px
                      </p>
                      <div className="scenario-card-footer">
                        <span>
                          {new Date(s.updatedAt).toLocaleDateString("en-ZA", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <button onClick={() => open(s)}>
                          Open scenario <ArrowRight size={13} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-library">
                  <FolderOpen size={35} />
                  <h2>
                    {search
                      ? "No matching scenarios."
                      : "A clean slate. A good place to start."}
                  </h2>
                  <p>
                    {search
                      ? "Try a different name."
                      : "Set up an interesting case in the playground, then save it here."}
                  </p>
                  <button
                    className="button primary"
                    onClick={() =>
                      search ? setSearch("") : setView("playground")
                    }
                  >
                    {search ? "Clear search" : "Open the playground"}
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </section>
          ) : (
            <div className="lab-layout">
              <section className="lab-main">
                <div className="lab-tabs">
                  <div role="tablist" aria-label="Playground panel">
                    <button
                      role="tab"
                      aria-selected={panel === "preview"}
                      className={panel === "preview" ? "active" : ""}
                      onClick={() => setPanel("preview")}
                    >
                      <LayoutGrid size={14} /> Component preview
                    </button>
                    <button
                      role="tab"
                      aria-selected={panel === "json"}
                      className={panel === "json" ? "active" : ""}
                      onClick={() => setPanel("json")}
                    >
                      <Braces size={14} /> Data editor <span>JSON</span>
                    </button>
                  </div>
                  <button
                    className="icon-button reset-button"
                    aria-label="Reset playground"
                    onClick={() =>
                      apply(defaultConfig(), "Playground reset to defaults.")
                    }
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div className="component-toolbar">
                  <div className="component-title">
                    <span>
                      <Box size={16} />
                    </span>
                    <div>
                      <strong>{component.name}</strong>
                      <small>
                        {config.preset === "custom"
                          ? "CUSTOM DATASET"
                          : presets
                              .find((p) => p.id === config.preset)
                              ?.name.toUpperCase()}{" "}
                        <i /> {runtime || config.state}
                      </small>
                    </div>
                  </div>
                  <div
                    className="device-controls"
                    role="group"
                    aria-label="Preview width"
                  >
                    <button
                      aria-label="Mobile viewport 390 pixels"
                      aria-pressed={config.width === 390}
                      onClick={() => patch({ width: 390 })}
                    >
                      <Smartphone size={15} />
                    </button>
                    <button
                      aria-label="Tablet viewport 768 pixels"
                      aria-pressed={config.width === 768}
                      onClick={() => patch({ width: 768 })}
                    >
                      <Tablet size={15} />
                    </button>
                    <button
                      aria-label="Desktop viewport 1280 pixels"
                      aria-pressed={config.width === 1280}
                      onClick={() => patch({ width: 1280 })}
                    >
                      <Monitor size={15} />
                    </button>
                    <span />
                    <label>
                      <input
                        aria-label="Custom viewport width"
                        type="number"
                        min={280}
                        max={1440}
                        key={config.width}
                        defaultValue={config.width}
                        title="Apply with Enter or leave this field"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        onBlur={(e) => {
                          const n = Number(e.target.value);
                          if (Number.isFinite(n))
                            patch({
                              width: Math.max(
                                280,
                                Math.min(1440, Math.round(n)),
                              ),
                            });
                        }}
                      />
                      px
                    </label>
                    <button
                      aria-label="Scale preview to fit canvas"
                      aria-pressed={fit}
                      className={fit ? "fit-active" : ""}
                      onClick={() => setFit((s) => !s)}
                    >
                      <Maximize2 size={14} />
                    </button>
                  </div>
                </div>
                {panel === "preview" ? (
                  <PreviewFrame
                    config={activeConfig}
                    fit={fit}
                    onReport={setReport}
                    onAction={frameAction}
                  />
                ) : (
                  <div className="json-panel">
                    <div className="json-toolbar">
                      <span>
                        <span className="file-dot" /> dataset.json
                      </span>
                      <div>
                        <button className="text-button" onClick={copyJSON}>
                          <Copy size={12} /> Copy
                        </button>
                        <button
                          className="text-button"
                          onClick={() =>
                            downloadJSON(config.data, "statelab-dataset.json")
                          }
                        >
                          <Download size={12} /> Download
                        </button>
                      </div>
                    </div>
                    <label className="sr-only" htmlFor="json-editor">
                      Dataset JSON
                    </label>
                    <textarea
                      id="json-editor"
                      value={jsonDraft}
                      onChange={(e) => {
                        setJsonDraft(e.target.value);
                        setJsonError("");
                      }}
                      spellCheck={false}
                      maxLength={400000}
                    />
                    <div className="json-footer">
                      <span
                        className={jsonError ? "json-error" : ""}
                        role="status"
                      >
                        {jsonError ||
                          "Changes stay in the editor until you apply them."}
                      </span>
                      <button className="button primary" onClick={applyJson}>
                        Apply JSON <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                )}
                <div className="event-console">
                  <span className="console-mark">›_</span>
                  <p role="status">{log}</p>
                  <span>SESSION LOG</span>
                </div>
                <section className="observation-panel">
                  <div className="observation-heading">
                    <span>
                      <span className="pulse-dot" /> Under the microscope
                    </span>
                    <button
                      className="text-button"
                      onClick={() => setModal("help")}
                    >
                      What we check <ArrowUpRight size={11} />
                    </button>
                  </div>
                  <div className="observation-grid">
                    {checks.map((c) => (
                      <div key={c.name} className={`observation ${c.level}`}>
                        <span>
                          {c.level === "warning" ? (
                            <TriangleAlert size={13} />
                          ) : c.level === "pass" ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <Search size={13} />
                          )}
                        </span>
                        <div>
                          <strong>{c.name}</strong>
                          <p>{c.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="observation-disclaimer">
                    Observations, not an accessibility certification. Review the
                    component with your own eyes and keyboard.
                  </p>
                </section>
              </section>
              <aside className="controls">
                <div className="controls-title">
                  <span>
                    <Settings2 size={16} /> Test controls
                  </span>
                  <span className="tiny-pill">LIVE</span>
                </div>
                <section className="control-section">
                  <div className="control-label">
                    <span>CONTENT SCENARIOS</span>
                    <span>01</span>
                  </div>
                  <p>Happy paths are only the beginning.</p>
                  <div className="preset-grid">
                    {presets.map((p, i) => (
                      <button
                        className={config.preset === p.id ? "active" : ""}
                        aria-pressed={config.preset === p.id}
                        key={p.id}
                        title={p.description}
                        onClick={() => preset(p.id)}
                      >
                        <span>
                          {i === 0
                            ? "☀"
                            : i === 1
                              ? "Aa"
                              : i === 2
                                ? "—"
                                : i === 3
                                  ? "∅"
                                  : i === 4
                                    ? "文"
                                    : i === 5
                                      ? "#"
                                      : "↗"}
                        </span>
                        {p.name}
                        {config.preset === p.id && <Check size={11} />}
                      </button>
                    ))}
                  </div>
                  <button
                    className="generate-button"
                    disabled={busy !== null}
                    onClick={() => setModal("generate")}
                  >
                    <Sparkles size={13} /> Generate an edge case{" "}
                    <ArrowUpRight size={12} />
                  </button>
                </section>
                <section className="control-section">
                  <div className="control-label">
                    <span>COMPONENT STATE</span>
                    <span>02</span>
                  </div>
                  <div
                    className="state-buttons"
                    role="group"
                    aria-label="Component state"
                  >
                    {(["ready", "loading", "empty", "error"] as const).map(
                      (s) => (
                        <button
                          aria-pressed={(runtime || config.state) === s}
                          className={
                            (runtime || config.state) === s ? "active" : ""
                          }
                          key={s}
                          onClick={() =>
                            patch(
                              { state: s, errorSource: "simulation" },
                              `${s.toUpperCase()} state selected manually.`,
                            )
                          }
                        >
                          <span className={`state-dot dot-${s}`} />
                          {s === "ready"
                            ? "Success"
                            : s[0].toUpperCase() + s.slice(1)}
                        </button>
                      ),
                    )}
                  </div>
                </section>
                <section className="control-section">
                  <div className="control-label">
                    <span>NETWORK SIMULATOR</span>
                    <span>03</span>
                  </div>
                  <label className="range-label" htmlFor="latency">
                    Response delay{" "}
                    <strong>{config.delay.toLocaleString()} ms</strong>
                  </label>
                  <input
                    id="latency"
                    type="range"
                    min={0}
                    max={5000}
                    step={100}
                    value={config.delay}
                    onChange={(e) => patch({ delay: Number(e.target.value) })}
                  />
                  <div className="range-ends">
                    <span>Instant</span>
                    <span>5 seconds</span>
                  </div>
                  <label className="select-field">
                    Outcome
                    <select
                      value={config.outcome}
                      onChange={(e) =>
                        patch({ outcome: e.target.value as Config["outcome"] })
                      }
                    >
                      <option value="success">Successful response</option>
                      <option value="error">Failed response</option>
                    </select>
                  </label>
                  <button
                    className="button simulate-button"
                    disabled={busy !== null}
                    onClick={() => simulate()}
                  >
                    {runtime === "loading" && !busy ? (
                      <LoaderCircle size={13} className="spin" />
                    ) : (
                      <Play size={13} />
                    )}{" "}
                    Run simulation
                  </button>
                  <button
                    className="live-api-button"
                    disabled={busy !== null || config.component === "people"}
                    onClick={liveData}
                  >
                    {busy === "api" ? (
                      <LoaderCircle size={13} className="spin" />
                    ) : (
                      <Globe2 size={13} />
                    )}{" "}
                    Load live API data <ArrowUpRight size={11} />
                  </button>
                  <p className="control-note">
                    Simulation is local. Live mode fetches 8 products from
                    DummyJSON with this delay.
                  </p>
                </section>
                <section className="control-section appearance">
                  <div className="control-label">
                    <span>PREVIEW APPEARANCE</span>
                    <span>04</span>
                  </div>
                  <div className="appearance-row">
                    <span>Theme</span>
                    <div role="group" aria-label="Component preview theme">
                      <button
                        aria-label="Light preview"
                        aria-pressed={config.theme === "light"}
                        onClick={() => patch({ theme: "light" })}
                      >
                        <Sun size={13} />
                      </button>
                      <button
                        aria-label="Dark preview"
                        aria-pressed={config.theme === "dark"}
                        onClick={() => patch({ theme: "dark" })}
                      >
                        <Moon size={13} />
                      </button>
                    </div>
                  </div>
                  <label className="range-label" htmlFor="text-scale">
                    Text size <strong>{config.textScale}%</strong>
                  </label>
                  <input
                    id="text-scale"
                    type="range"
                    min={100}
                    max={200}
                    step={10}
                    value={config.textScale}
                    onChange={(e) =>
                      patch({ textScale: Number(e.target.value) })
                    }
                  />
                  <div className="appearance-row">
                    <span>Direction</span>
                    <div role="group" aria-label="Text direction">
                      <button
                        aria-pressed={config.direction === "ltr"}
                        onClick={() => patch({ direction: "ltr" })}
                      >
                        LTR
                      </button>
                      <button
                        aria-pressed={config.direction === "rtl"}
                        onClick={() => patch({ direction: "rtl" })}
                      >
                        RTL
                      </button>
                    </div>
                  </div>
                  <label className="select-field">
                    Currency
                    <select
                      value={config.currency}
                      onChange={(e) =>
                        patch({
                          currency: e.target.value as Config["currency"],
                        })
                      }
                    >
                      <option value="USD">USD · US dollar</option>
                      <option value="ZAR">ZAR · South African rand</option>
                      <option value="EUR">EUR · Euro</option>
                    </select>
                  </label>
                  <p className="control-note">
                    Formatting only. Values aren’t converted.
                  </p>
                </section>
                <div className="export-controls">
                  <button className="button secondary" onClick={exportScenario}>
                    <ArrowDownToLine size={14} /> Export scenario
                  </button>
                  <span>
                    <ShieldCheck size={11} /> No account. No test data leaves by
                    default.
                  </span>
                </div>
              </aside>
            </div>
          )}
          <footer className="workspace-footer">
            <span>
              DESIGNED & BUILT FOR{" "}
              <a
                href="https://github.com/raeesasamaai"
                target="_blank"
                rel="noreferrer"
              >
                RAEESA SAMAAI <ArrowUpRight size={9} />
              </a>
            </span>
            <button onClick={() => setModal("privacy")}>
              Privacy & credits
            </button>
            <span>GOOD UI EXPECTS THE UNEXPECTED.</span>
          </footer>
        </main>
      </div>
      <input
        className="sr-only"
        type="file"
        tabIndex={-1}
        ref={file}
        accept=".json,application/json"
        onChange={(e) => {
          void importFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="toast" role="status" aria-live="polite">
        {toast && (
          <span>
            <CheckCircle2 size={16} />
            {toast}
            <button
              aria-label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <X size={13} />
            </button>
          </span>
        )}
      </div>
      <Dialog
        open={modal !== null}
        title={
          modal === "save"
            ? "Keep this one in your toolkit."
            : modal === "generate"
              ? "A little more unpredictability."
              : modal === "delete"
                ? "Remove this scenario?"
                : modal === "privacy"
                  ? "Your data. Your experiments."
                  : "Make a little trouble."
        }
        close={() => setModal(null)}
      >
        {modal === "save" ? (
          <>
            <p>
              Save the current component, data, viewport, appearance and visible
              state. A saved loading state stays loading until you change it.
            </p>
            <label className="field-label" htmlFor="scenario-name">
              SCENARIO NAME
            </label>
            <input
              className="text-input"
              id="scenario-name"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              maxLength={80}
              placeholder="A memorable edge case"
            />
            <div className="dialog-actions">
              <button
                className="button secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={!scenarioName.trim()}
                onClick={save}
              >
                <Save size={14} /> Save locally
              </button>
            </div>
          </>
        ) : modal === "generate" ? (
          <>
            <p>
              Choose a challenge. With a free AI provider configured, StateLab
              can suggest synthetic test content. Otherwise it uses its original
              local fixtures. Your current dataset is not sent to the model.
            </p>
            <label className="field-label" htmlFor="challenge">
              WHAT SHOULD WE PUSH?
            </label>
            <select
              className="text-input"
              id="challenge"
              value={challenge}
              onChange={(e) => setChallenge(e.target.value as Config["preset"])}
            >
              {presets
                .filter((p) => !["baseline", "empty"].includes(p.id))
                .map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <p className="dialog-note">
              This replaces the current dataset. Save a scenario first if you
              want to keep it.
            </p>
            <button className="button primary" onClick={generate}>
              <Sparkles size={14} /> Generate dataset <ArrowRight size={14} />
            </button>
          </>
        ) : modal === "delete" ? (
          <>
            <p>
              This removes the scenario from this browser. Export it first if
              you want a portable backup.
            </p>
            <div className="dialog-actions">
              <button
                className="button secondary"
                onClick={() => setModal(null)}
              >
                Keep scenario
              </button>
              <button
                className="button danger"
                onClick={() => {
                  const ok = persist(
                    savedCases.filter((s) => s.id !== deleteId),
                  );
                  if (activeId === deleteId) setActiveId(null);
                  setModal(null);
                  setToast(
                    ok
                      ? "Saved scenario removed."
                      : "Removed from this session. Browser storage could not be updated.",
                  );
                }}
              >
                <Trash2 size={14} /> Remove scenario
              </button>
            </div>
          </>
        ) : modal === "privacy" ? (
          <>
            <p>
              Saved scenarios and your workspace theme live in this browser’s
              local storage. There is no account system, analytics or cloud
              sync. Export backups before clearing site data.
            </p>
            <p>
              Live API mode sends requests to DummyJSON. Imported image URLs are
              loaded by the preview browser. Optional AI generation sends only
              the component type and challenge name to the configured APInex
              endpoint; it never sends your current dataset.
            </p>
            <p>
              The preview runs our three built-in React components in their own
              viewport. It does not execute user-submitted code. Data checks and
              geometry observations are limited tools, not a complete
              accessibility or performance audit.
            </p>
            <p>
              Original interface and chair illustration created for Raeesa
              Samaai. Fonts: Manrope and Outfit (SIL OFL). Icons: Lucide (ISC).
              Live demo data: DummyJSON. Third-party licences ship in /licenses.
            </p>
            <a
              className="button secondary"
              href="https://github.com/raeesasamaai/StateLab"
              target="_blank"
              rel="noreferrer"
            >
              Explore the source <ArrowUpRight size={14} />
            </a>
          </>
        ) : (
          <>
            <ol className="guide-list">
              <li>
                <strong>Pick a component.</strong> Product card, inventory
                table, or people list. Their buttons, sorting and selection
                really work.
              </li>
              <li>
                <strong>Change the conditions.</strong> Try missing fields,
                unbroken strings, 200% text or a narrow viewport. The iframe
                uses the selected CSS width; fit mode only scales its display.
              </li>
              <li>
                <strong>Exercise recovery.</strong> Simulate loading and
                failure. The preview’s retry action performs a successful
                recovery after your chosen delay. Restore sample data from an
                empty state.
              </li>
              <li>
                <strong>Make it repeatable.</strong> Edit the JSON, save a
                scenario, or export a portable snapshot. Import scenarios with
                the toolbar; dataset-only exports are applied through the JSON
                editor.
              </li>
            </ol>
            <p>
              Viewport overflow, scrollable regions and control dimensions come
              from the rendered frame. Content warnings come from the selected
              data. They do not establish accessibility conformance.
            </p>
            <button className="button primary" onClick={() => setModal(null)}>
              Let’s break the happy path <ArrowRight size={14} />
            </button>
          </>
        )}
      </Dialog>
    </div>
  );
}
