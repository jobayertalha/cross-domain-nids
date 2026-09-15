import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";

import {
  Shield,
  LayoutDashboard,
  FileSearch,
  Bell,
  BarChart3,
  Database,
  Info,
  Mail,
  LogOut,
  Activity,
  Network,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Upload,
  Zap,
  Sun,
  Moon,
  Cpu,
  ChevronRight,
  Trash2,
} from "lucide-react";

import "./index.css";


// ============================================================
// TYPES
// ============================================================

type Page =
  | "dashboard"
  | "analyze"
  | "alerts"
  | "statistics"
  | "models"
  | "about"
  | "contact";

type Theme = "dark" | "light";

type DatasetId =
  | "ton_iot"
  | "edge_iiot";


// ============================================================
// API TYPES
// ============================================================

interface DetectionResult {
  flow: {
    src_ip: string;
    flow_key: string;
    packet_count: number;
  };

  base_prediction: number;
  final_prediction: number;
  confidence: number;
  local_prediction: number;
  local_agreement: number;
  refinement_applied: boolean;
}

interface AnalysisResult {
  status: string;
  filename: string;
  dataset: DatasetId;
  dataset_name: string;
  architecture: string;
  base_model: string;
  refinement: string;
  flows: number;

  summary: {
    threats: number;
    normal: number;
    refinements: number;
  };

  detections: DetectionResult[];
}


// ============================================================
// SHARED ANALYSIS STATE
// ============================================================

const ANALYSIS_STORAGE_KEY = "cross-domain-nids-analysis-history-v1";

function loadAnalysisHistory(): AnalysisResult[] {
  try {
    const raw = localStorage.getItem(ANALYSIS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? (parsed as AnalysisResult[])
      : [];
  } catch {
    return [];
  }
}

function getAnalysisTotals(analyses: AnalysisResult[]) {
  return analyses.reduce(
    (totals, analysis) => {
      totals.flows += Number(analysis.flows || 0);
      totals.threats += Number(
        analysis.summary?.threats || 0
      );
      totals.normal += Number(
        analysis.summary?.normal || 0
      );
      totals.refinements += Number(
        analysis.summary?.refinements || 0
      );

      return totals;
    },
    {
      flows: 0,
      threats: 0,
      normal: 0,
      refinements: 0,
    }
  );
}


// ============================================================
// TDNR IMPACT HELPERS
// ============================================================

function getAnalysisImpact(analysis: AnalysisResult) {
  const detections = analysis.detections || [];
  const total = detections.length;

  const baseThreats = detections.filter(
    (detection) => detection.base_prediction !== 0
  ).length;

  const finalThreats = detections.filter(
    (detection) => detection.final_prediction !== 0
  ).length;

  const baseThreatRate =
    total > 0 ? (baseThreats / total) * 100 : 0;

  const finalThreatRate =
    total > 0 ? (finalThreats / total) * 100 : 0;

  const refined = detections.filter(
    (detection) => detection.refinement_applied
  ).length;

  const predictionChanges = detections.filter(
    (detection) =>
      detection.base_prediction !==
      detection.final_prediction
  ).length;

  return {
    baseThreats,
    finalThreats,
    baseThreatRate,
    finalThreatRate,
    refined,
    predictionChanges,
    rateChange: finalThreatRate - baseThreatRate,
  };
}


// ============================================================
// APP
// ============================================================

function App() {
  const [loggedIn, setLoggedIn] =
    useState(false);

  const [name, setName] =
    useState("");

  const [page, setPage] =
    useState<Page>("dashboard");

  const [theme, setTheme] =
    useState<Theme>("dark");

  // Shared analysis history for Dashboard, Alerts, and Statistics.
  // It is persisted in the browser so results survive page navigation
  // and a normal browser refresh.
  const [analyses, setAnalyses] =
    useState<AnalysisResult[]>(loadAnalysisHistory);

  useEffect(() => {
    try {
      localStorage.setItem(
        ANALYSIS_STORAGE_KEY,
        JSON.stringify(analyses)
      );
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }
  }, [analyses]);

  const handleAnalysisComplete = (
    analysis: AnalysisResult
  ) => {
    setAnalyses((previous) => [
      ...previous,
      analysis,
    ]);
  };

  const handleDeleteAnalysis = (index: number) => {
    setAnalyses((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const handleClearHistory = () => {
    setAnalyses([]);
  };

  const totals = getAnalysisTotals(analyses);

  if (!loggedIn) {
    return (
      <LoginPage
        name={name}
        setName={setName}
        onLogin={() => {
          if (name.trim()) {
            setLoggedIn(true);
            setPage("dashboard");
          }
        }}
      />
    );
  }

  const firstName =
    name.trim().split(" ")[0];

  return (
    <div
      className={`app-shell ${theme}-theme`}
    >
      <Sidebar
        page={page}
        setPage={setPage}
        name={firstName}
        theme={theme}
        setTheme={setTheme}
        alertCount={totals.threats}
        onLogout={() => {
          setLoggedIn(false);
          setName("");
          setPage("dashboard");
        }}
      />

      <main className="main-area">

        {page === "dashboard" && (
          <Dashboard
            name={firstName}
            setPage={setPage}
            analyses={analyses}
          />
        )}

        {page === "analyze" && (
          <AnalyzePage
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}

        {page === "alerts" && (
          <AlertsPage
            analyses={analyses}
            onClearHistory={handleClearHistory}
          />
        )}

        {page === "statistics" && (
          <StatisticsPage
            analyses={analyses}
            onDeleteAnalysis={handleDeleteAnalysis}
            onClearHistory={handleClearHistory}
          />
        )}

        {page === "models" && (
          <DatasetsPage />
        )}

        {page === "about" && (
          <AboutPage />
        )}

        {page === "contact" && (
          <ContactPage />
        )}

      </main>
    </div>
  );
}


// ============================================================
// LOGIN
// ============================================================

function LoginPage({
  name,
  setName,
  onLogin,
}: {
  name: string;
  setName: (value: string) => void;
  onLogin: () => void;
}) {
  return (
    <div className="login-page">

      <div className="login-glow glow-one" />
      <div className="login-glow glow-two" />

      <div className="login-container">

        <div className="login-logo">
          <Shield size={31} />
        </div>

        <div className="login-brand">
          Cross-Domain <span>NIDS</span>
        </div>

        <div className="login-subtitle">
          Network Intrusion Detection &amp; Response Platform
        </div>

        <div className="login-status">
          <span className="online-dot" />
          SECURE NETWORK MONITORING
        </div>

        <div className="login-card">

          <div className="login-card-title">
            Welcome
          </div>

          <p className="login-card-description">
            Enter your name to access the network security dashboard.
          </p>

          <label className="input-label">
            YOUR NAME
          </label>

          <input
            className="name-input"
            type="text"
            placeholder="e.g. Talha"
            value={name}
            onChange={(e) =>
              setName(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onLogin();
              }
            }}
          />

          <button
            type="button"
            className="primary-button login-button"
            onClick={onLogin}
            disabled={!name.trim()}
          >
            Enter Dashboard
            <ArrowRight size={16} />
          </button>

          <div className="login-note">
            <ShieldCheck size={14} />
            Research-grade cross-domain intrusion detection
          </div>

        </div>

        <div className="login-footer">
          <span>Lopez17CNN</span>
          <span>•</span>
          <span>BiC</span>
          <span>•</span>
          <span>TDNR</span>
        </div>

      </div>
    </div>
  );
}


// ============================================================
// SIDEBAR
// ============================================================

function Sidebar({
  page,
  setPage,
  name,
  theme,
  setTheme,
  alertCount,
  onLogout,
}: {
  page: Page;
  setPage: (page: Page) => void;
  name: string;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  alertCount: number;
  onLogout: () => void;
}) {
  const mainItems = [
    {
      id: "dashboard" as Page,
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "analyze" as Page,
      label: "Analyze PCAP",
      icon: FileSearch,
    },
    {
      id: "alerts" as Page,
      label: "Alerts",
      icon: Bell,
    },
    {
      id: "statistics" as Page,
      label: "Statistics",
      icon: BarChart3,
    },
    {
      id: "models" as Page,
      label: "Datasets",
      icon: Database,
    },
  ];

  const infoItems = [
    {
      id: "about" as Page,
      label: "About",
      icon: Info,
    },
    {
      id: "contact" as Page,
      label: "Contact",
      icon: Mail,
    },
  ];

  return (
    <aside className="sidebar">

      {/* BRAND */}

      <div className="sidebar-brand">

        <div className="sidebar-logo">
          <Shield size={23} />
        </div>

        <div>

          <div className="sidebar-title">
            Cross-Domain <span>NIDS</span>
          </div>

          <div className="sidebar-subtitle">
            Security Platform
          </div>

        </div>

      </div>


      {/* USER */}

      <div className="user-chip">

        <div className="user-avatar">
          {name.charAt(0).toUpperCase()}
        </div>

        <div className="user-info">
          <span>Analyst</span>
          <strong>{name}</strong>
        </div>

        <span className="online-dot" />

      </div>


      {/* MONITORING */}

      <div className="nav-section-label">
        MONITORING
      </div>

      <nav className="main-navigation">

        {mainItems.map((item) => {

          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.id}
              className={`nav-item ${
                page === item.id
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setPage(item.id)
              }
            >
              <Icon size={17} />

              <span>
                {item.label}
              </span>

              {item.id === "alerts" && (
                <span className="nav-count">
                  {alertCount}
                </span>
              )}

            </button>
          );
        })}

      </nav>


      {/* INFORMATION */}

      <div className="nav-section-label info-label">
        INFORMATION
      </div>

      <nav className="main-navigation">

        {infoItems.map((item) => {

          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.id}
              className={`nav-item ${
                page === item.id
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setPage(item.id)
              }
            >
              <Icon size={17} />

              <span>
                {item.label}
              </span>

            </button>
          );
        })}

      </nav>


      <div className="sidebar-spacer" />


      {/* SYSTEM */}

      <div className="system-status">

        <div className="system-status-top">
          <span className="online-dot" />

          <strong>
            System Online
          </strong>
        </div>

        <span>
          Inference engine ready
        </span>

      </div>


      {/* THEME */}

      <div className="theme-switch">

        <button
          type="button"
          className={
            theme === "dark"
              ? "theme-option active"
              : "theme-option"
          }
          onClick={() =>
            setTheme("dark")
          }
        >
          <Moon size={13} />
          <span>Dark</span>
        </button>

        <button
          type="button"
          className={
            theme === "light"
              ? "theme-option active"
              : "theme-option"
          }
          onClick={() =>
            setTheme("light")
          }
        >
          <Sun size={13} />
          <span>Light</span>
        </button>

      </div>


      {/* LOGOUT */}

      <button
        type="button"
        className="logout-button"
        onClick={onLogout}
      >
        <LogOut size={15} />
        Sign Out
      </button>


      <div className="sidebar-version">
        Cross-Domain NIDS v1.0
      </div>

    </aside>
  );
}


// ============================================================
// DASHBOARD
// ============================================================

function Dashboard({
  name,
  setPage,
  analyses,
}: {
  name: string;
  setPage: (page: Page) => void;
  analyses: AnalysisResult[];
}) {
  const totals = getAnalysisTotals(analyses);

  return (
    <>
      <Header
        title={
          <>
            Network Security{" "}
            <span>Overview</span>
          </>
        }
        subtitle={`Welcome back, ${name}. Monitor and analyze network traffic.`}
      />


      {/* STATS */}

      <section className="stats-grid">

        <StatCard
          icon={<Network size={19} />}
          label="Analyzed Flows"
          value={String(totals.flows)}
          detail={
            analyses.length
              ? `${analyses.length} PCAP ${
                  analyses.length === 1
                    ? "analysis"
                    : "analyses"
                }`
              : "Awaiting PCAP analysis"
          }
          type="teal"
        />

        <StatCard
          icon={<ShieldAlert size={19} />}
          label="Threats Detected"
          value={String(totals.threats)}
          detail={
            totals.threats
              ? "Detected threats"
              : "No active detections"
          }
          type="red"
        />

        <StatCard
          icon={<ShieldCheck size={19} />}
          label="Normal Traffic"
          value={String(totals.normal)}
          detail={
            totals.normal
              ? "Normal flows"
              : "No normal flows"
          }
          type="green"
        />

        <StatCard
          icon={<Zap size={19} />}
          label="TDNR Refinements"
          value={String(totals.refinements)}
          detail="Adaptive decisions"
          type="purple"
        />

      </section>


      {/* ANALYZE + DATASETS */}

      <section className="dashboard-grid">

        <div className="panel upload-panel">

          <div className="panel-header">

            <div>

              <div className="panel-title">
                Analyze Network Traffic
              </div>

              <div className="panel-description">
                Upload a PCAP or PCAPNG file for cross-domain
                intrusion detection.
              </div>

            </div>

            <div className="panel-icon">
              <FileSearch size={19} />
            </div>

          </div>


          <div className="upload-zone">

            <div className="upload-icon">
              <Upload size={25} />
            </div>

            <div className="upload-title">
              Drop your PCAP file here
            </div>

            <div className="upload-description">
              Supported formats: .pcap, .pcapng
            </div>

            <div className="dataset-support-line">
              <span>TON-IoT</span>
              <span>•</span>
              <span>Edge-IIoTset</span>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() =>
                setPage("analyze")
              }
            >
              Start Analysis
              <ArrowRight size={16} />
            </button>

          </div>

        </div>


        {/* DATASETS */}

        <div className="panel dataset-panel">

          <div className="panel-header">

            <div>

              <div className="panel-title">
                Supported Datasets
              </div>

              <div className="panel-description">
                Cross-domain datasets available in the platform.
              </div>

            </div>

            <div className="panel-icon">
              <Database size={19} />
            </div>

          </div>

          <MiniDataset
            name="TON-IoT"
            classes="12 Classes"
            description="Network intrusion detection"
          />

          <MiniDataset
            name="Edge-IIoTset"
            classes="14 Classes"
            description="Industrial IoT intrusion detection"
          />

          <div className="dataset-pipeline-mini">

            <Cpu size={14} />

            <span>
              Lopez17CNN → BiC → TDNR
            </span>

          </div>

        </div>

      </section>


      {/* PIPELINE */}

      <section className="panel pipeline-panel">

        <div className="panel-header">

          <div>

            <div className="panel-title">
              Detection Pipeline
            </div>

            <div className="panel-description">
              Cross-domain intrusion detection workflow
            </div>

          </div>

        </div>

        <div className="pipeline">

          <PipelineStep
            number="01"
            title="PCAP"
            text="Network traffic"
          />

          <PipelineLine />

          <PipelineStep
            number="02"
            title="Features"
            text="10 × 4 representation"
          />

          <PipelineLine />

          <PipelineStep
            number="03"
            title="Lopez17CNN"
            text="200-D latent features"
          />

          <PipelineLine />

          <PipelineStep
            number="04"
            title="BiC"
            text="Base prediction"
          />

          <PipelineLine />

          <PipelineStep
            number="05"
            title="TDNR"
            text="Local refinement"
          />

          <PipelineLine />

          <PipelineStep
            number="06"
            title="Detection"
            text="Final prediction"
          />

        </div>

      </section>


      {/* BOTTOM */}

      <section className="bottom-grid">

        <div className="panel">

          <div className="panel-title">
            Threat Monitoring
          </div>

          {totals.threats === 0 ? (
            <div className="empty-state">

              <ShieldCheck size={28} />

              <strong>
                No detections yet
              </strong>

              <span>
                Upload network traffic to begin security analysis.
              </span>

            </div>
          ) : (
            <div className="dashboard-threat-summary">

              <ShieldAlert size={28} />

              <strong>
                {totals.threats} threat{" "}
                {totals.threats === 1 ? "detected" : "detections"}
              </strong>

              <span>
                Open Security Alerts to review detected flows.
              </span>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setPage("alerts")}
              >
                View Alerts
                <ArrowRight size={15} />
              </button>

            </div>
          )}

        </div>


        <div className="panel">

          <div className="panel-title">
            System Status
          </div>

          <StatusRow
            label="API Server"
            value="Online"
          />

          <StatusRow
            label="Inference Engine"
            value="Ready"
          />

          <StatusRow
            label="TDNR Reference Bank"
            value="Loaded"
          />

        </div>

      </section>
    </>
  );
}


// ============================================================
// MINI DATASET
// ============================================================

function MiniDataset({
  name,
  classes,
  description,
}: {
  name: string;
  classes: string;
  description: string;
}) {
  return (
    <div className="mini-dataset">

      <div className="mini-dataset-icon">
        <Database size={16} />
      </div>

      <div className="mini-dataset-content">

        <div className="mini-dataset-name">
          {name}
        </div>

        <div className="mini-dataset-description">
          {description}
        </div>

      </div>

      <div className="mini-dataset-meta">
        {classes}
      </div>

    </div>
  );
}


// ============================================================
// ANALYZE PCAP
// ============================================================

function AnalyzePage({
  onAnalysisComplete,
}: {
  onAnalysisComplete: (
    analysis: AnalysisResult
  ) => void;
}) {

  const [selectedDataset, setSelectedDataset] =
    useState<DatasetId>("ton_iot");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const [result, setResult] =
    useState<AnalysisResult | null>(null);

  const [error, setError] =
    useState("");

  const [isDragging, setIsDragging] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement>(null);


  // ----------------------------------------------------------
  // FILE VALIDATION
  // ----------------------------------------------------------

  const isValidPCAP = (
    file: File
  ) => {

    const filename =
      file.name.toLowerCase();

    return (
      filename.endsWith(".pcap") ||
      filename.endsWith(".pcapng")
    );
  };


  // ----------------------------------------------------------
  // PROCESS FILE
  // ----------------------------------------------------------

  const processFile = (
    file: File
  ) => {

    if (!isValidPCAP(file)) {

      setSelectedFile(null);
      setResult(null);

      setError(
        "Invalid file. Please select a .pcap or .pcapng file."
      );

      return;
    }

    setSelectedFile(file);
    setResult(null);
    setError("");
  };


  // ----------------------------------------------------------
  // FILE INPUT
  // ----------------------------------------------------------

  const handleFileSelect = (
    event: ChangeEvent<HTMLInputElement>
  ) => {

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    processFile(file);

    // Allow the same file to be selected again
    event.target.value = "";
  };


  // ----------------------------------------------------------
  // DRAG ENTER
  // ----------------------------------------------------------

  const handleDragEnter = (
    event: DragEvent<HTMLDivElement>
  ) => {

    event.preventDefault();
    event.stopPropagation();

    setIsDragging(true);
  };


  // ----------------------------------------------------------
  // DRAG OVER
  // ----------------------------------------------------------

  const handleDragOver = (
    event: DragEvent<HTMLDivElement>
  ) => {

    event.preventDefault();
    event.stopPropagation();

    setIsDragging(true);
  };


  // ----------------------------------------------------------
  // DRAG LEAVE
  // ----------------------------------------------------------

  const handleDragLeave = (
    event: DragEvent<HTMLDivElement>
  ) => {

    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);
  };


  // ----------------------------------------------------------
  // DROP
  // ----------------------------------------------------------

  const handleDrop = (
    event: DragEvent<HTMLDivElement>
  ) => {

    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    const file =
      event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    processFile(file);
  };


  // ----------------------------------------------------------
  // ANALYZE
  // ----------------------------------------------------------

  const handleAnalyze = async () => {

    if (!selectedFile) {

      setError(
        "Please select a PCAP file first."
      );

      return;
    }

    setIsAnalyzing(true);
    setError("");
    setResult(null);

    try {

      const formData =
        new FormData();

      formData.append(
        "dataset",
        selectedDataset
      );

      formData.append(
        "file",
        selectedFile
      );


      // Production-safe API configuration.
      // If VITE_API_BASE_URL is not set, use the current origin
      // so Vite/reverse-proxy can route /api to FastAPI.
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "";

      const response =
        await fetch(
          `${API_BASE_URL}/api/analyze-pcap`,
          {
            method: "POST",
            body: formData,
          }
        );


      const contentType =
        response.headers.get("content-type") || "";

      let data: any = null;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();

        if (!response.ok) {
          throw new Error(
            text ||
            `Backend request failed (${response.status}).`
          );
        }

        throw new Error(
          "Backend returned an unexpected response."
        );
      }


      if (!response.ok) {

        throw new Error(
          data?.detail?.message ||
          data?.detail ||
          "PCAP analysis failed."
        );
      }


      const analysis =
        data as AnalysisResult;

      setResult(analysis);

      // Publish the completed analysis to the App-level store.
      // Dashboard, Alerts, and Statistics update immediately.
      onAnalysisComplete(analysis);

    } catch (err) {

      console.error(
        "PCAP analysis error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the NIDS backend."
      );

    } finally {

      setIsAnalyzing(false);

    }
  };


  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <>

      <Header
        title={
          <>
            Analyze <span>PCAP</span>
          </>
        }
        subtitle="Upload network traffic and run cross-domain intrusion detection."
      />


      {/* ====================================================
          UPLOAD
      ==================================================== */}

      <div className="panel large-panel">

        <div
          className={`upload-zone large-upload ${
            isDragging
              ? "dragging"
              : ""
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >

          <div className="upload-icon large">
            <Upload size={30} />
          </div>


          <div className="upload-title">

            {isDragging
              ? "Drop Network Capture"
              : "Upload Network Capture"}

          </div>


          <div className="upload-description">
            Drag and drop a .pcap or .pcapng file here
          </div>


          {/* REAL FILE INPUT */}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pcap,.pcapng"
            onChange={handleFileSelect}
            style={{
              display: "none",
            }}
          />


          {/* BROWSE */}

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            <Upload size={16} />
            Browse PCAP Files
          </button>


          {/* SELECTED FILE */}

          {selectedFile && (

            <div className="selected-file">

              <FileSearch size={16} />

              <span>
                {selectedFile.name}
              </span>

            </div>

          )}


          <div className="file-hint">
            Supported formats: .pcap, .pcapng
          </div>


          {/* ERROR */}

          {error && (

            <div className="upload-error">
              {error}
            </div>

          )}


          {/* ANALYZE */}

          <button
            type="button"
            className="primary-button"
            onClick={handleAnalyze}
            disabled={
              !selectedFile ||
              isAnalyzing
            }
          >

            {isAnalyzing
              ? "Analyzing Network Traffic..."
              : "Analyze Network Traffic"}

            {!isAnalyzing && (
              <ArrowRight size={16} />
            )}

          </button>

        </div>

      </div>


      {/* ====================================================
          DATASET + CONFIGURATION
      ==================================================== */}

      <div className="two-column">


        {/* DATASET */}

        <div className="panel">

          <div className="panel-title">
            Detection Dataset
          </div>

          <div className="panel-description">
            Select the target dataset configuration for analysis.
          </div>


          <div className="dataset-select-list">

            <button
              type="button"
              className={`dataset-select ${
                selectedDataset === "ton_iot"
                  ? "selected"
                  : ""
              }`}
              onClick={() => {

                setSelectedDataset(
                  "ton_iot"
                );

                setResult(null);
                setError("");

              }}
            >

              <Database size={17} />

              <div>

                <strong>
                  TON-IoT
                </strong>

                <span>
                  12 classes
                </span>

              </div>

              <ChevronRight size={15} />

            </button>


            <button
              type="button"
              className={`dataset-select ${
                selectedDataset === "edge_iiot"
                  ? "selected"
                  : ""
              }`}
              onClick={() => {

                setSelectedDataset(
                  "edge_iiot"
                );

                setResult(null);
                setError("");

              }}
            >

              <Database size={17} />

              <div>

                <strong>
                  Edge-IIoTset
                </strong>

                <span>
                  14 classes
                </span>

              </div>

              <ChevronRight size={15} />

            </button>

          </div>

        </div>


        {/* CONFIGURATION */}

        <div className="panel">

          <div className="panel-title">
            Detection Configuration
          </div>

          <div className="config-row">

            <span>
              Dataset
            </span>

            <strong>
              {selectedDataset === "ton_iot"
                ? "TON-IoT"
                : "Edge-IIoTset"}
            </strong>

          </div>

          <div className="config-row">

            <span>
              Architecture
            </span>

            <strong>
              Lopez17CNN
            </strong>

          </div>

          <div className="config-row">

            <span>
              Base Method
            </span>

            <strong>
              BiC
            </strong>

          </div>

          <div className="config-row">

            <span>
              Refinement
            </span>

            <strong className="teal-text">
              TDNR
            </strong>

          </div>

        </div>

      </div>


      {/* ====================================================
          RESULTS
      ==================================================== */}

      {result && (

        <div className="panel output-panel">

          <div className="panel-title">
            Analysis Results
          </div>

          <div className="panel-description">

            {result.filename}
            {" — "}
            {result.dataset_name}

          </div>


          {/* SUMMARY */}

          <div className="stats-grid">

            <StatCard
              icon={<Network size={19} />}
              label="Analyzed Flows"
              value={String(
                result.flows
              )}
              detail="Network flows"
              type="teal"
            />

            <StatCard
              icon={<ShieldAlert size={19} />}
              label="Threats Detected"
              value={String(
                result.summary?.threats ?? 0
              )}
              detail="Detected threats"
              type="red"
            />

            <StatCard
              icon={<ShieldCheck size={19} />}
              label="Normal Traffic"
              value={String(
                result.summary?.normal ?? 0
              )}
              detail="Normal flows"
              type="green"
            />

            <StatCard
              icon={<Zap size={19} />}
              label="TDNR Refinements"
              value={String(
                result.summary?.refinements ?? 0
              )}
              detail="Adaptive decisions"
              type="purple"
            />

          </div>


          {/* TDNR IMPACT */}

          {(() => {
            const impact = getAnalysisImpact(result);

            return (
              <div className="tdnr-impact-panel">

                <div className="panel-title">
                  BiC vs TDNR Impact
                </div>

                <div className="panel-description">
                  Output-level comparison for this PCAP. This is not an accuracy
                  comparison because an uploaded PCAP has no ground-truth labels.
                </div>

                <div className="tdnr-impact-grid">

                  <div className="impact-card">
                    <span>BiC Threat Rate</span>
                    <strong>{impact.baseThreatRate.toFixed(1)}%</strong>
                    <small>{impact.baseThreats} threat flows</small>
                  </div>

                  <div className="impact-arrow">→</div>

                  <div className="impact-card tdnr">
                    <span>TDNR Final Threat Rate</span>
                    <strong>{impact.finalThreatRate.toFixed(1)}%</strong>
                    <small>{impact.finalThreats} threat flows</small>
                  </div>

                  <div className="impact-card">
                    <span>Threat-Rate Difference</span>
                    <strong className={impact.rateChange === 0 ? "" : "teal-text"}>
                      {impact.rateChange > 0 ? "+" : ""}
                      {impact.rateChange.toFixed(1)} pp
                    </strong>
                    <small>
                      {impact.predictionChanges} prediction change(s)
                    </small>
                  </div>

                  <div className="impact-card">
                    <span>TDNR Refinements</span>
                    <strong className={impact.refined > 0 ? "teal-text" : ""}>
                      {impact.refined}
                    </strong>
                    <small>
                      {impact.refined > 0
                        ? "local refinement applied"
                        : "no flow met the refinement gate"}
                    </small>
                  </div>

                </div>
              </div>
            );
          })()}


          {/* DETECTIONS */}

          <div className="detection-results">

            <div className="panel-title">
              Flow Detections
            </div>


            {result.detections?.map(
              (
                detection,
                index
              ) => (

                <div
                  className="detection-row"
                  key={index}
                >

                  <div>

                    <span>
                      Flow
                    </span>

                    <strong>
                      #{index + 1}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Source
                    </span>

                    <strong>
                      {detection.flow.src_ip}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Packets
                    </span>

                    <strong>
                      {detection.flow.packet_count}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Base Prediction
                    </span>

                    <strong>
                      Class{" "}
                      {detection.base_prediction}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Final Prediction
                    </span>

                    <strong>
                      Class{" "}
                      {detection.final_prediction}
                    </strong>

                  </div>


                  <div>

                    <span>
                      Confidence
                    </span>

                    <strong>
                      {(
                        detection.confidence * 100
                      ).toFixed(2)}
                      %
                    </strong>

                  </div>


                  <div>

                    <span>
                      Local Agreement
                    </span>

                    <strong>
                      {(
                        detection.local_agreement * 100
                      ).toFixed(0)}
                      %
                    </strong>

                  </div>


                  <div>

                    <span>
                      TDNR
                    </span>

                    <strong
                      className={
                        detection.refinement_applied
                          ? "teal-text"
                          : ""
                      }
                    >
                      {detection.refinement_applied
                        ? "Applied"
                        : "Not Applied"}
                    </strong>

                    {!detection.refinement_applied &&
                      detection.base_prediction === detection.local_prediction && (
                        <small className="tdnr-reason">
                          Local prediction agrees with BiC
                        </small>
                      )}

                  </div>

                </div>

              )
            )}

          </div>

        </div>

      )}

    </>
  );
}


// ============================================================
// ALERTS
// ============================================================

function AlertsPage({
  analyses,
  onClearHistory,
}: {
  analyses: AnalysisResult[];
  onClearHistory: () => void;
}) {
  const alerts = analyses.flatMap((analysis) =>
    (analysis.detections || [])
      .filter(
        (detection) =>
          detection.final_prediction !== 0
      )
      .map((detection, index) => ({
        analysis,
        detection,
        index,
      }))
  );

  return (
    <>
      <Header
        title={
          <>
            Security <span>Alerts</span>
          </>
        }
        subtitle="Review detected network threats and adaptive refinement decisions."
      />

      {alerts.length > 0 && (
        <div className="page-action-row">
          <button
            type="button"
            className="danger-outline-button"
            onClick={onClearHistory}
          >
            <Trash2 size={14} />
            Clear Alert History
          </button>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="panel">

          <div className="empty-state large-empty">

            <ShieldCheck size={35} />

            <strong>
              No security alerts
            </strong>

            <span>
              Alerts generated from analyzed PCAP traffic will appear here.
            </span>

          </div>

        </div>
      ) : (
        <div className="alerts-list">

          {alerts.map(
            ({
              analysis,
              detection,
              index,
            }) => (
              <div
                className="alert-card"
                key={`${analysis.filename}-${index}-${detection.flow.flow_key}`}
              >

                <div className="alert-card-icon">
                  <ShieldAlert size={22} />
                </div>

                <div className="alert-card-main">

                  <div className="alert-card-title">
                    Threat detected
                    <span className="alert-badge">
                      CLASS {detection.final_prediction}
                    </span>
                  </div>

                  <div className="alert-card-meta">
                    {analysis.filename}
                    {" • "}
                    {analysis.dataset_name}
                    {" • "}
                    {detection.flow.src_ip}
                  </div>

                  <div className="alert-card-details">

                    <div>
                      <span>Packets</span>
                      <strong>
                        {detection.flow.packet_count}
                      </strong>
                    </div>

                    <div>
                      <span>Confidence</span>
                      <strong>
                        {(detection.confidence * 100).toFixed(2)}%
                      </strong>
                    </div>

                    <div>
                      <span>Base Prediction</span>
                      <strong>
                        Class {detection.base_prediction}
                      </strong>
                    </div>

                    <div>
                      <span>TDNR</span>
                      <strong
                        className={
                          detection.refinement_applied
                            ? "teal-text"
                            : ""
                        }
                      >
                        {detection.refinement_applied
                          ? "Applied"
                          : "Not Applied"}
                      </strong>
                    </div>

                  </div>

                </div>

                <div className="alert-severity">
                  <span className="alert-severity-dot" />
                  Threat
                </div>

              </div>
            )
          )}

        </div>
      )}
    </>
  );
}


// ============================================================
// STATISTICS
// ============================================================

function StatisticsPage({
  analyses,
  onDeleteAnalysis,
  onClearHistory,
}: {
  analyses: AnalysisResult[];
  onDeleteAnalysis: (index: number) => void;
  onClearHistory: () => void;
}) {
  const totals = getAnalysisTotals(analyses);

  const threatRate =
    totals.flows > 0
      ? (totals.threats / totals.flows) * 100
      : 0;

  const normalRate =
    totals.flows > 0
      ? (totals.normal / totals.flows) * 100
      : 0;

  const latest =
    analyses.length > 0
      ? analyses[analyses.length - 1]
      : null;

  return (
    <>
      <Header
        title={
          <>
            Network <span>Statistics</span>
          </>
        }
        subtitle="Traffic and detection statistics from analyzed network captures."
      />

      {analyses.length > 0 && (
        <div className="page-action-row">
          <button
            type="button"
            className="danger-outline-button"
            onClick={onClearHistory}
          >
            <Trash2 size={14} />
            Clear Analysis History
          </button>
        </div>
      )}

      <section className="stats-grid">

        <StatCard
          icon={<Network size={19} />}
          label="Total Flows"
          value={String(totals.flows)}
          detail={
            analyses.length
              ? `${analyses.length} capture ${
                  analyses.length === 1
                    ? "analyzed"
                    : "analyses recorded"
                }`
              : "Analyzed traffic"
          }
          type="teal"
        />

        <StatCard
          icon={<ShieldAlert size={19} />}
          label="Threat Rate"
          value={`${threatRate.toFixed(1)}%`}
          detail={`${totals.threats} detected threats`}
          type="red"
        />

        <StatCard
          icon={<Activity size={19} />}
          label="Normal Rate"
          value={`${normalRate.toFixed(1)}%`}
          detail={`${totals.normal} normal flows`}
          type="green"
        />

        <StatCard
          icon={<Zap size={19} />}
          label="TDNR Applied"
          value={String(totals.refinements)}
          detail="Refined samples"
          type="purple"
        />

      </section>


      {latest ? (
        <div className="panel statistics-latest">

          <div className="panel-title">
            Latest Analysis
          </div>

          <div className="panel-description">
            Most recently completed PCAP analysis.
          </div>

          <div className="statistics-details">

            <div>
              <span>Capture</span>
              <strong>{latest.filename}</strong>
            </div>

            <div>
              <span>Dataset</span>
              <strong>{latest.dataset_name}</strong>
            </div>

            <div>
              <span>Architecture</span>
              <strong>{latest.architecture}</strong>
            </div>

            <div>
              <span>Base Method</span>
              <strong>{latest.base_model}</strong>
            </div>

            <div>
              <span>Refinement</span>
              <strong className="teal-text">
                {latest.refinement}
              </strong>
            </div>

            <div>
              <span>Flows</span>
              <strong>{latest.flows}</strong>
            </div>

          </div>

        </div>
      ) : (
        <div className="panel chart-placeholder">

          <BarChart3 size={28} />

          <strong>
            Detection statistics will appear here
          </strong>

          <span>
            Analyze a PCAP file to populate live traffic statistics.
          </span>

        </div>
      )}

      {analyses.length > 0 && (
        <div className="panel analysis-history">

          <div className="panel-title">
            Analysis History
          </div>

          <div className="panel-description">
            Completed captures recorded in this browser session.
          </div>

          <div className="history-list">

            {[...analyses]
              .map((analysis, originalIndex) => ({
                analysis,
                originalIndex,
              }))
              .reverse()
              .map(({ analysis, originalIndex }) => (
                <div
                  className="history-row"
                  key={`${analysis.filename}-${originalIndex}`}
                >
                  <div>
                    <strong>
                      {analysis.filename}
                    </strong>
                    <span>
                      {analysis.dataset_name}
                    </span>
                  </div>

                  <div>
                    <span>Flows</span>
                    <strong>{analysis.flows}</strong>
                  </div>

                  <div>
                    <span>Threats</span>
                    <strong className="red-text">
                      {analysis.summary.threats}
                    </strong>
                  </div>

                  <div>
                    <span>TDNR</span>
                    <strong className="teal-text">
                      {analysis.summary.refinements}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="history-delete-button"
                    title="Delete this analysis"
                    aria-label={`Delete ${analysis.filename}`}
                    onClick={() => onDeleteAnalysis(originalIndex)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

          </div>

        </div>
      )}
    </>
  );
}


// ============================================================
// DATASETS
// ============================================================

function DatasetsPage() {
  return (
    <>
      <Header
        title={
          <>
            Detection <span>Datasets</span>
          </>
        }
        subtitle="Supported datasets used in the cross-domain intrusion detection pipeline."
      />


      <div className="dataset-page-list">

        <DatasetCard
          name="TON-IoT"
          description="Network intrusion detection dataset"
          classes="12"
        />

        <DatasetCard
          name="Edge-IIoTset"
          description="Industrial IoT intrusion detection dataset"
          classes="14"
        />

      </div>


      <div className="panel dataset-method-panel">

        <div className="panel-title">
          Detection Model Pipeline
        </div>

        <div className="panel-description">
          Both supported datasets are processed through the same
          research-oriented detection architecture.
        </div>


        <div className="method-flow">

          <MethodBox
            title="Dataset"
            text="TON-IoT / Edge-IIoTset"
          />

          <ChevronRight />

          <MethodBox
            title="Architecture"
            text="Lopez17CNN"
          />

          <ChevronRight />

          <MethodBox
            title="Base Method"
            text="BiC"
          />

          <ChevronRight />

          <MethodBox
            title="Refinement"
            text="TDNR"
          />

        </div>

      </div>
    </>
  );
}


function DatasetCard({
  name,
  description,
  classes,
}: {
  name: string;
  description: string;
  classes: string;
}) {
  return (
    <div className="dataset-card">

      <div className="dataset-card-icon">
        <Database size={23} />
      </div>


      <div className="dataset-card-content">

        <div className="dataset-card-title">

          {name}

          <span className="dataset-badge">
            SUPPORTED DATASET
          </span>

        </div>


        <div className="dataset-card-subtitle">
          {description}
        </div>


        <div className="dataset-info-grid">

          <div>
            <span>
              Architecture
            </span>

            <strong>
              Lopez17CNN
            </strong>
          </div>


          <div>
            <span>
              Base Method
            </span>

            <strong>
              BiC
            </strong>
          </div>


          <div>
            <span>
              Refinement
            </span>

            <strong className="teal-text">
              TDNR
            </strong>
          </div>


          <div>
            <span>
              Classes
            </span>

            <strong>
              {classes}
            </strong>
          </div>

        </div>

      </div>


      <div className="dataset-status">

        <span className="online-dot" />

        Ready

      </div>

    </div>
  );
}


// ============================================================
// ABOUT
// ============================================================

function AboutPage() {
  return (
    <>
      <Header
        title={
          <>
            About{" "}
            <span>Cross-Domain NIDS</span>
          </>
        }
        subtitle="Research-driven network intrusion detection platform."
      />


      <div className="about-grid">

        <div className="panel">

          <div className="about-icon">
            <Shield size={25} />
          </div>

          <div className="panel-title">
            About the Platform
          </div>

          <p className="about-text">
            Cross-Domain NIDS is a network intrusion detection
            platform designed around a lightweight cross-domain
            transfer-learning pipeline with adaptive
            target-domain refinement.
          </p>

          <p className="about-text">
            The system processes network traffic from PCAP
            files, transforms traffic into the required feature
            representation, performs base classification, and
            applies Target-Domain Neighborhood Refinement when
            appropriate.
          </p>

        </div>


        <div className="panel">

          <div className="panel-title">
            Detection Architecture
          </div>


          <div className="architecture-list">

            <div>
              01
              <strong>
                Source-domain foundation model
              </strong>
            </div>

            <div>
              02
              <strong>
                Lightweight domain adaptation
              </strong>
            </div>

            <div>
              03
              <strong>
                Target-domain representation
              </strong>
            </div>

            <div>
              04
              <strong>
                Uncertainty estimation
              </strong>
            </div>

            <div>
              05
              <strong>
                TDNR adaptive refinement
              </strong>
            </div>

            <div>
              06
              <strong>
                Final cross-domain detection
              </strong>
            </div>

          </div>

        </div>

      </div>
    </>
  );
}


// ============================================================
// CONTACT
// ============================================================

function ContactPage() {
  return (
    <>
      <Header
        title={
          <>
            📞 <span>Contact</span>
          </>
        }
        subtitle="Get in touch with the developer."
      />


      <div className="contact-grid">

        <ContactItem
          icon="👨‍💻"
          label="Developer"
          value="Talha Jobayer Zihan"
        />

        <ContactItem
          icon="📱"
          label="Phone"
          value="+880 1721 577792"
          href="tel:01721577792"
        />

        <ContactItem
          icon="✉️"
          label="Email"
          value="jobayertalha2020@gmail.com"
          href="mailto:jobayertalha2020@gmail.com"
        />

        <ContactItem
          icon="💻"
          label="GitHub"
          value="github.com/jobayertalha"
          href="https://github.com/jobayertalha"
        />

        <ContactItem
          icon="🔗"
          label="LinkedIn"
          value="linkedin.com/in/talha-jobayer"
          href="https://www.linkedin.com/in/talha-jobayer-696a74237/"
        />

        <ContactItem
          icon="🌐"
          label="Portfolio"
          value="Personal Portfolio"
          href="https://v0-personal-portfolio-site-tau.vercel.app/"
        />

      </div>


      <div className="section-heading">
        Connect With Me
      </div>


      <div className="social-grid">

        <SocialCard
          icon="💻"
          name="GitHub"
          href="https://github.com/jobayertalha"
        />

        <SocialCard
          icon="🔗"
          name="LinkedIn"
          href="https://www.linkedin.com/in/talha-jobayer-696a74237/"
        />

        <SocialCard
          icon="🌐"
          name="Portfolio"
          href="https://v0-personal-portfolio-site-tau.vercel.app/"
        />

      </div>
    </>
  );
}


// ============================================================
// CONTACT ITEM
// ============================================================

function ContactItem({
  icon,
  label,
  value,
  href,
}: {
  icon: string;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="contact-item">

      <div className="contact-icon">
        {icon}
      </div>

      <div className="contact-label">
        {label}
      </div>


      {href ? (

        <a
          className="contact-link"
          href={href}
          target="_blank"
          rel="noreferrer"
        >
          {value}
        </a>

      ) : (

        <div className="contact-value">
          {value}
        </div>

      )}

    </div>
  );
}


// ============================================================
// SOCIAL CARD
// ============================================================

function SocialCard({
  icon,
  name,
  href,
}: {
  icon: string;
  name: string;
  href: string;
}) {
  return (
    <a
      className="social-card"
      href={href}
      target="_blank"
      rel="noreferrer"
    >

      <div className="social-icon">
        {icon}
      </div>

      <div className="social-name">
        {name}
      </div>

    </a>
  );
}


// ============================================================
// HEADER
// ============================================================

function Header({
  title,
  subtitle,
}: {
  title: ReactNode;
  subtitle: string;
}) {
  return (
    <header className="main-header">

      <div>

        <h1>
          {title}
        </h1>

        <p>
          {subtitle}
        </p>

      </div>


      <div className="header-right">

        <div className="header-status">

          <span className="status-dot" />

          SYSTEM ONLINE

        </div>

      </div>

    </header>
  );
}


// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  icon,
  label,
  value,
  detail,
  type,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  type:
    | "teal"
    | "red"
    | "green"
    | "purple";
}) {
  return (
    <div
      className={`stat-card ${type}`}
    >

      <div className="stat-top">

        <div className="stat-icon">
          {icon}
        </div>

        <Activity
          size={14}
          className="stat-background-icon"
        />

      </div>


      <div className="stat-label">
        {label}
      </div>

      <div className="stat-value">
        {value}
      </div>

      <div className="stat-detail">
        {detail}
      </div>

    </div>
  );
}


// ============================================================
// PIPELINE STEP
// ============================================================

function PipelineStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="pipeline-step">

      <div className="pipeline-number">
        {number}
      </div>

      <div className="pipeline-title">
        {title}
      </div>

      <div className="pipeline-text">
        {text}
      </div>

    </div>
  );
}


// ============================================================
// PIPELINE LINE
// ============================================================

function PipelineLine() {
  return (
    <div className="pipeline-line" />
  );
}


// ============================================================
// STATUS ROW
// ============================================================

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="status-row">

      <span>

        <span className="status-dot" />

        {label}

      </span>

      <strong className="green-text">
        {value}
      </strong>

    </div>
  );
}


// ============================================================
// METHOD BOX
// ============================================================

function MethodBox({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="method-box">

      <span>
        {title}
      </span>

      <strong>
        {text}
      </strong>

    </div>
  );
}


// ============================================================
// EXPORT
// ============================================================

export default App;