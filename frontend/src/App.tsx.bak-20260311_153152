import { ChangeEvent, FormEvent, SyntheticEvent, useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams
} from "react-router-dom";
import ReactCrop, { Crop, PercentCrop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

type TeamType = "TRABALHO" | "CIRCULO";
type ThemeMode = "light" | "dark";

type Encounter = {
  id: number;
  nome: string | null;
  tema: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  data_encontro: string | null;
};

type Team = {
  id: number;
  encontro_id: number;
  nome: string;
  tipo: TeamType;
  cor_hex: string | null;
  slogan: string | null;
  ordem: number;
  foto_url: string | null;
  titulo_arte_url: string | null;
};

type PdfTitleMode = "SYSTEM_FONT" | "CUSTOM_FONT" | "TEAM_ART";

type PdfTitleSettings = {
  mode: PdfTitleMode;
  font_url: string | null;
};

type Member = {
  id: number;
  encontro_id: number;
  equipe_id: number;
  cargo_nome: string | null;
  nome_principal: string;
  nome_secundario: string | null;
  telefone_principal: string | null;
  telefone_secundario: string | null;
  paroquia: string | null;
  foto_url: string | null;
};

type AppUser = {
  id: number;
  nome: string;
  email: string;
  permissao: "ADMIN" | "EDITOR" | "VISUALIZADOR";
  ativo: boolean;
  last_login_at?: string | null;
  permissions: Record<string, boolean>;
  effectivePermissions: Record<string, boolean>;
};

type RoleType = AppUser["permissao"];

type AuthResponse = {
  token: string;
  user: AppUser;
  permissionsCatalog: string[];
};

type MeResponse = {
  user: AppUser;
  permissionsCatalog: string[];
};

type DashboardStats = {
  encontros: number;
  equipes: number;
  circulos: number;
  capasCartazes: number;
  membros: number;
};

type MembersImportStats = {
  total: number;
  individuais: number;
  casais: number;
  erros: string[];
  totalLinhasArquivo: number;
};

type MembersImportResponse = {
  success: boolean;
  message: string;
  estatisticas: MembersImportStats;
};

type CirclesImportStats = {
  circulosCriados: number;
  membrosCriados: number;
  linhasLidas: number;
  erros: string[];
};

type CirclesImportResponse = {
  success: boolean;
  message: string;
  estatisticas: CirclesImportStats;
};

type Asset = {
  id: number;
  encontro_id: number;
  tipo: string;
  titulo: string | null;
  image_url: string;
  ordem: number;
};

type AuditLogEntry = {
  id: number;
  user_id: number | null;
  user_nome: string | null;
  user_email: string | null;
  encontro_id: number | null;
  encontro_nome: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  summary: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type AuditListResponse = {
  items: AuditLogEntry[];
  total: number;
  limit: number;
  offset: number;
};

type AuditFilters = {
  encounterId: number | null;
  userId: number | null;
  action: string;
  resourceType: string;
  limit: number;
};

type CropPreset = {
  aspect: number;
  outputWidth: number;
  outputHeight: number;
  label: string;
  lockAspect: boolean;
  fit: "cover" | "contain" | "stretch";
};

type CropTarget =
  | {
      kind: "TEAM";
      encounterId: number;
      teamId: number;
      teamType: TeamType;
      displayName: string;
    }
  | {
      kind: "MEMBER";
      encounterId: number;
      teamId: number;
      memberId: number;
      displayName: string;
    }
  | {
      kind: "ASSET";
      encounterId: number;
      tipo: string;
      titulo: string;
      ordem: number;
      displayName: string;
    };

type CropState = {
  source: string;
  cropBox: PercentCrop;
  pixelCrop: PixelCrop;
  renderWidth: number;
  renderHeight: number;
  preset: CropPreset;
  target: CropTarget;
};

type TeamFormState = {
  id: number;
  nome: string;
  ordem: number;
  corHex: string;
  slogan: string;
};

type MemberFormState = {
  id: number;
  cargoNome: string;
  nomePrincipal: string;
  nomeSecundario: string;
  telefonePrincipal: string;
  telefoneSecundario: string;
  paroquia: string;
};

type AssetFormState = {
  tipo: string;
  titulo: string;
  ordem: number;
  file: File | null;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const TOKEN_KEY = "ejc_token_v2";

const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  ENCOUNTERS_VIEW: "encounters.view",
  ENCOUNTERS_MANAGE: "encounters.manage",
  TEAMS_VIEW: "teams.view",
  TEAMS_MANAGE: "teams.manage",
  MEMBERS_VIEW: "members.view",
  MEMBERS_MANAGE: "members.manage",
  IMPORTS_RUN: "imports.run",
  CIRCLES_IMPORT: "circles.import",
  PDF_GENERATE: "pdf.generate",
  ASSETS_VIEW: "assets.view",
  ASSETS_MANAGE: "assets.manage",
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage"
} as const;

const ROLE_DEFAULT_PERMISSIONS: Record<RoleType, Record<string, boolean>> = {
  ADMIN: Object.values(PERMISSIONS).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
  EDITOR: {
    [PERMISSIONS.DASHBOARD_VIEW]: true,
    [PERMISSIONS.ENCOUNTERS_VIEW]: true,
    [PERMISSIONS.ENCOUNTERS_MANAGE]: true,
    [PERMISSIONS.TEAMS_VIEW]: true,
    [PERMISSIONS.TEAMS_MANAGE]: true,
    [PERMISSIONS.MEMBERS_VIEW]: true,
    [PERMISSIONS.MEMBERS_MANAGE]: true,
    [PERMISSIONS.IMPORTS_RUN]: true,
    [PERMISSIONS.CIRCLES_IMPORT]: true,
    [PERMISSIONS.PDF_GENERATE]: true,
    [PERMISSIONS.ASSETS_VIEW]: true,
    [PERMISSIONS.ASSETS_MANAGE]: true,
    [PERMISSIONS.USERS_VIEW]: false,
    [PERMISSIONS.USERS_MANAGE]: false
  },
  VISUALIZADOR: {
    [PERMISSIONS.DASHBOARD_VIEW]: true,
    [PERMISSIONS.ENCOUNTERS_VIEW]: true,
    [PERMISSIONS.ENCOUNTERS_MANAGE]: false,
    [PERMISSIONS.TEAMS_VIEW]: true,
    [PERMISSIONS.TEAMS_MANAGE]: false,
    [PERMISSIONS.MEMBERS_VIEW]: true,
    [PERMISSIONS.MEMBERS_MANAGE]: false,
    [PERMISSIONS.IMPORTS_RUN]: false,
    [PERMISSIONS.CIRCLES_IMPORT]: false,
    [PERMISSIONS.PDF_GENERATE]: true,
    [PERMISSIONS.ASSETS_VIEW]: true,
    [PERMISSIONS.ASSETS_MANAGE]: false,
    [PERMISSIONS.USERS_VIEW]: false,
    [PERMISSIONS.USERS_MANAGE]: false
  }
};

const ASSET_TYPES = [
  { value: "CAPA", label: "Capa" },
  { value: "SEPARADOR_CIRCULOS", label: "Separador de Círculos" },
  { value: "CARTAZ_CIRCULO", label: "Cartaz do Círculo" },
  { value: "SEPARADOR_EQUIPES", label: "Separador de Equipes" },
  { value: "MUSICA_TEMA", label: "Letra da Música Tema" },
  { value: "CONVITE_POS_ENCONTRO", label: "Convite Pós Encontro" },
  { value: "CONTRACAPA", label: "Contra Capa" },
  // Compatibilidade com cadastros antigos
  { value: "SEPARADOR_ENCONTREIROS", label: "Separador Encontreiros" },
  { value: "SEPARADOR_ENCONTRISTAS", label: "Separador Encontristas" },
  { value: "CARTAZ", label: "Cartaz" }
];

const CROP_PRESETS = {
  TEAM: {
    aspect: 3 / 2,
    outputWidth: 1500,
    outputHeight: 1000,
    label: "15x10 (equipes e círculos)",
    lockAspect: true,
    fit: "cover"
  },
  MEMBER: {
    aspect: 1,
    outputWidth: 900,
    outputHeight: 900,
    label: "1:1 (pessoas e casais)",
    lockAspect: true,
    fit: "cover"
  },
  A4: {
    aspect: 210 / 297,
    outputWidth: 1240,
    outputHeight: 1754,
    label: "A4 retrato (capas, cartazes e separadores)",
    lockAspect: false,
    fit: "stretch"
  }
} as const;

const EMPTY_TEAM_FORM: TeamFormState = {
  id: 0,
  nome: "",
  ordem: 0,
  corHex: "#8fbc8f",
  slogan: ""
};

const EMPTY_MEMBER_FORM: MemberFormState = {
  id: 0,
  cargoNome: "",
  nomePrincipal: "",
  nomeSecundario: "",
  telefonePrincipal: "",
  telefoneSecundario: "",
  paroquia: ""
};

const EMPTY_ASSET_FORM: AssetFormState = {
  tipo: "CAPA",
  titulo: "",
  ordem: 0,
  file: null
};

const EMPTY_PDF_TITLE_SETTINGS: PdfTitleSettings = {
  mode: "SYSTEM_FONT",
  font_url: null
};

const DEFAULT_AUDIT_FILTERS: AuditFilters = {
  encounterId: null,
  userId: null,
  action: "",
  resourceType: "",
  limit: 50
};

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

function mediaUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init);
  if (!response.ok) {
    let errorMessage = `Erro ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string; message?: string };
      errorMessage = payload.error || payload.message || errorMessage;
    } catch {
      errorMessage = `${errorMessage}.`;
    }
    const error = new Error(errorMessage) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

async function requestBlob(path: string, token: string): Promise<Blob> {
  const response = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    let errorMessage = `Erro ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string; message?: string };
      errorMessage = payload.error || payload.message || errorMessage;
    } catch {
      errorMessage = `${errorMessage}.`;
    }
    const error = new Error(errorMessage) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.blob();
}

function withAuth(init: RequestInit = {}, token?: string): RequestInit {
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return { ...init, headers };
}

function defaultPermissionsForRole(role: RoleType) {
  return { ...ROLE_DEFAULT_PERMISSIONS[role] };
}

function formatDate(dateRaw?: string | null) {
  if (!dateRaw) return "-";
  const raw = String(dateRaw).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);

  if (match) {
    const onlyDate = new Date(`${match[1]}T00:00:00`);
    if (!Number.isNaN(onlyDate.getTime())) {
      return onlyDate.toLocaleDateString("pt-BR");
    }
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("pt-BR");
}

function formatDateTime(dateRaw?: string | null) {
  if (!dateRaw) return "-";
  const parsed = new Date(String(dateRaw));
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("pt-BR");
}

function displayEncounterName(encounter: Encounter) {
  return encounter.nome || encounter.tema || `Encontro #${encounter.id}`;
}

function parseError(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem para crop."));
    img.src = source;
  });
}

function centeredAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number): PercentCrop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 100
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  ) as PercentCrop;
}

function normalizePixelCrop(pixelCrop: PixelCrop, image: HTMLImageElement): PixelCrop {
  const x = Math.max(0, Math.min(pixelCrop.x, image.naturalWidth - 1));
  const y = Math.max(0, Math.min(pixelCrop.y, image.naturalHeight - 1));
  const maxWidth = Math.max(1, image.naturalWidth - x);
  const maxHeight = Math.max(1, image.naturalHeight - y);
  const width = Math.max(1, Math.min(pixelCrop.width, maxWidth));
  const height = Math.max(1, Math.min(pixelCrop.height, maxHeight));
  return { x, y, width, height, unit: "px" };
}

function cropToPixel(crop: Crop, mediaWidth: number, mediaHeight: number): PixelCrop {
  const x = crop.x || 0;
  const y = crop.y || 0;
  const width = crop.width || 0;
  const height = crop.height || 0;

  if (crop.unit === "%") {
    return {
      unit: "px",
      x: Math.round((x / 100) * mediaWidth),
      y: Math.round((y / 100) * mediaHeight),
      width: Math.round((width / 100) * mediaWidth),
      height: Math.round((height / 100) * mediaHeight)
    };
  }

  return {
    unit: "px",
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  };
}

async function renderCropBlob(source: string, pixelCrop: PixelCrop, preset: CropPreset) {
  const image = await loadImage(source);
  const safeCrop = normalizePixelCrop(pixelCrop, image);
  const outputWidth = preset.outputWidth;
  const outputHeight = preset.outputHeight;
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas indisponível no navegador.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputWidth, outputHeight);
  const sourceWidth = safeCrop.width;
  const sourceHeight = safeCrop.height;
  let drawX = 0;
  let drawY = 0;
  let drawWidth = outputWidth;
  let drawHeight = outputHeight;

  if (preset.fit !== "stretch") {
    const fitScale =
      preset.fit === "contain"
        ? Math.min(outputWidth / sourceWidth, outputHeight / sourceHeight)
        : Math.max(outputWidth / sourceWidth, outputHeight / sourceHeight);
    drawWidth = Math.max(1, Math.round(sourceWidth * fitScale));
    drawHeight = Math.max(1, Math.round(sourceHeight * fitScale));
    drawX = Math.round((outputWidth - drawWidth) / 2);
    drawY = Math.round((outputHeight - drawHeight) / 2);
  }

  ctx.drawImage(image, safeCrop.x, safeCrop.y, sourceWidth, sourceHeight, drawX, drawY, drawWidth, drawHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92);
  });
  if (!blob) {
    throw new Error("Falha ao gerar imagem recortada.");
  }
  return blob;
}

function groupMembersByCargo(members: Member[]) {
  const map = new Map<string, Member[]>();
  for (const member of members) {
    const key = (member.cargo_nome || "Sem Cargo").trim() || "Sem Cargo";
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(member);
  }

  const cargoRank = (cargoNome: string) => {
    const cargo = String(cargoNome || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (!cargo) return 9;
    if (cargo.includes("DIRETOR ESPIRITUAL")) return 0;
    if (/\bJOVENS?\b/.test(cargo) && cargo.includes("COORD")) return 1;
    if (/\bTIOS?\b/.test(cargo) && cargo.includes("COORD")) return 2;
    if (/\bTIOS?\b/.test(cargo) && cargo.includes("APOIO")) return 3;
    return 9;
  };

  return [...map.entries()]
    .sort((a, b) => {
      const rankDiff = cargoRank(a[0]) - cargoRank(b[0]);
      if (rankDiff !== 0) return rankDiff;
      return a[0].localeCompare(b[0], "pt-BR");
    })
    .map(([cargo, list]) => ({
      cargo,
      membros: list.sort((a, b) => a.nome_principal.localeCompare(b.nome_principal, "pt-BR"))
    }));
}

function parseNumericParam(raw?: string) {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isNaN(value) ? null : value;
}

function sameId(value: unknown, id: number | null) {
  if (id === null || value === null || value === undefined) return false;
  const parsed = Number(value);
  return !Number.isNaN(parsed) && parsed === id;
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function AppShell() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("ejc_theme");
    return saved === "dark" ? "dark" : "light";
  });
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [permissionsCatalog, setPermissionsCatalog] = useState<string[]>(Object.values(PERMISSIONS));
  const [authLoading, setAuthLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ email: "", senha: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({ ...DEFAULT_AUDIT_FILTERS });
  const [dashboard, setDashboard] = useState<DashboardStats>({
    encontros: 0,
    equipes: 0,
    circulos: 0,
    capasCartazes: 0,
    membros: 0
  });

  const [encounterForm, setEncounterForm] = useState({
    nome: "",
    dataInicio: "",
    dataFim: ""
  });
  const [userForm, setUserForm] = useState({
    id: 0,
    nome: "",
    email: "",
    senha: "",
    permissao: "EDITOR" as RoleType,
    ativo: true,
    permissions: defaultPermissionsForRole("EDITOR")
  });
  const [teamForm, setTeamForm] = useState<TeamFormState>(EMPTY_TEAM_FORM);
  const [memberForm, setMemberForm] = useState<MemberFormState>(EMPTY_MEMBER_FORM);
  const [assetForm, setAssetForm] = useState<AssetFormState>({ ...EMPTY_ASSET_FORM });
  const [pdfTitleSettings, setPdfTitleSettings] = useState<PdfTitleSettings>({ ...EMPTY_PDF_TITLE_SETTINGS });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [circleImportFile, setCircleImportFile] = useState<File | null>(null);

  const [crop, setCrop] = useState<CropState | null>(null);
  const [cropUploading, setCropUploading] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ejc_theme", theme);
  }, [theme]);

  useEffect(() => {
    let ignore = false;

    async function bootstrapAuth() {
      if (!token) {
        if (!ignore) {
          setCurrentUser(null);
          setAuthLoading(false);
        }
        return;
      }

      try {
        const response = await requestJson<MeResponse>("/api/auth/me", withAuth({}, token));
        if (ignore) return;
        setCurrentUser(response.user);
        setPermissionsCatalog(response.permissionsCatalog || Object.values(PERMISSIONS));
      } catch {
        if (!ignore) {
          sessionStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem("ejc_token");
          setToken("");
          setCurrentUser(null);
        }
      } finally {
        if (!ignore) setAuthLoading(false);
      }
    }

    bootstrapAuth();
    return () => {
      ignore = true;
    };
  }, [token]);

  useEffect(() => {
    if (!currentUser) return;
    refreshEncounters();
    refreshDashboard();
    refreshPdfTitleSettings();
    if (can(PERMISSIONS.USERS_VIEW)) {
      refreshAuditLogs({ ...DEFAULT_AUDIT_FILTERS }, 0);
    }
  }, [currentUser]);



  function success(msg: string) {
    setMessage(msg);
    setError("");
  }

  function resetUserForm(role: RoleType = "EDITOR") {
    setUserForm({
      id: 0,
      nome: "",
      email: "",
      senha: "",
      permissao: role,
      ativo: true,
      permissions: defaultPermissionsForRole(role)
    });
  }

  function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("ejc_token");
    setToken("");
    setCurrentUser(null);
    setPdfTitleSettings({ ...EMPTY_PDF_TITLE_SETTINGS });
    setAuditLogs([]);
    setAuditTotal(0);
    setAuditOffset(0);
    setAuditFilters({ ...DEFAULT_AUDIT_FILTERS });
    setMessage("");
    setError("");
  }

  function can(permission: string) {
    if (!currentUser) return false;
    return Boolean(currentUser.effectivePermissions?.[permission]);
  }

  async function authRequest<T>(path: string, init?: RequestInit) {
    try {
      return await requestJson<T>(path, withAuth(init, token));
    } catch (err) {
      const status = (err as Error & { status?: number }).status;
      if (status === 401) {
        clearSession();
      }
      throw err;
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await requestJson<AuthResponse>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });
      sessionStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      setCurrentUser(response.user);
      setPermissionsCatalog(response.permissionsCatalog || Object.values(PERMISSIONS));
      setLoginForm({ email: "", senha: "" });
      setMessage("");
      setError("");
    } catch (err) {
      setError(parseError(err));
    }
  }

  function handleLogout() {
    clearSession();
  }

  async function refreshEncounters() {
    try {
      const data = await authRequest<Encounter[]>("/api/encounters");
      setEncounters(data);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function refreshDashboard(encounterId?: number) {
    try {
      const query = encounterId ? `?encounterId=${encounterId}` : "";
      const data = await authRequest<DashboardStats>(`/api/dashboard${query}`);
      setDashboard(data);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function refreshUsers() {
    try {
      const data = await authRequest<AppUser[]>("/api/users");
      setUsers(data);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function refreshPdfTitleSettings() {
    try {
      const data = await authRequest<PdfTitleSettings>("/api/settings/pdf-title");
      setPdfTitleSettings({
        mode: data.mode || "SYSTEM_FONT",
        font_url: data.font_url || null
      });
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function refreshAuditLogs(nextFilters?: Partial<AuditFilters>, nextOffset?: number) {
    const mergedFilters: AuditFilters = {
      ...auditFilters,
      ...(nextFilters || {})
    };
    const normalizedOffset = Math.max(0, Number(nextOffset ?? auditOffset) || 0);

    try {
      setAuditLoading(true);
      const params = new URLSearchParams();
      if (mergedFilters.encounterId) params.set("encounterId", String(mergedFilters.encounterId));
      if (mergedFilters.userId) params.set("userId", String(mergedFilters.userId));
      if (mergedFilters.action.trim()) params.set("action", mergedFilters.action.trim().toUpperCase());
      if (mergedFilters.resourceType.trim()) params.set("resourceType", mergedFilters.resourceType.trim().toUpperCase());
      params.set("limit", String(mergedFilters.limit || 50));
      params.set("offset", String(normalizedOffset));

      const data = await authRequest<AuditListResponse>(`/api/audit?${params.toString()}`);
      setAuditFilters(mergedFilters);
      setAuditLogs(data.items || []);
      setAuditTotal(Number(data.total || 0));
      setAuditOffset(Number(data.offset || 0));
    } catch (err) {
      setError(parseError(err));
    } finally {
      setAuditLoading(false);
    }
  }

  async function refreshTeamList(encounterId: number, type: TeamType) {
    try {
      const data = await authRequest<Team[]>(`/api/teams?encounterId=${encounterId}&tipo=${type}`);
      setTeams(data);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function refreshMembers(encounterId: number, teamId: number) {
    try {
      const data = await authRequest<Member[]>(
        `/api/members?encounterId=${encounterId}&teamId=${teamId}`
      );
      setMembers(data);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function refreshAssets(encounterId: number) {
    try {
      const data = await authRequest<Asset[]>(`/api/assets?encounterId=${encounterId}`);
      setAssets(data);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function handleCreateEncounter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await authRequest("/api/encounters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(encounterForm)
      });
      setEncounterForm({ nome: "", dataInicio: "", dataFim: "" });
      await refreshEncounters();
      await refreshDashboard();
      success("Encontro cadastrado.");
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function handleDeleteEncounter(id: number) {
    if (!window.confirm("Excluir este encontro?")) return;
    try {
      await authRequest(`/api/encounters/${id}`, { method: "DELETE" });
      await refreshEncounters();
      await refreshDashboard();
      success("Encontro removido.");
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function handleSaveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userForm.nome.trim() || !userForm.email.trim()) {
      setError("Nome e e-mail são obrigatórios.");
      return;
    }
    if (!userForm.id && userForm.senha.trim().length < 8) {
      setError("Informe uma senha com no mínimo 8 caracteres.");
      return;
    }
    if (userForm.senha && userForm.senha.trim().length > 0 && userForm.senha.trim().length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }

    const payload = {
      nome: userForm.nome.trim(),
      email: userForm.email.trim(),
      senha: userForm.senha.trim(),
      permissao: userForm.permissao,
      ativo: userForm.ativo,
      permissions: userForm.permissions
    };

    try {
      if (userForm.id > 0) {
        await authRequest(`/api/users/${userForm.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        success("Usuário atualizado.");
      } else {
        await authRequest("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        success("Usuário criado.");
      }
      resetUserForm();
      await refreshUsers();

      const me = await authRequest<MeResponse>("/api/auth/me");
      setCurrentUser(me.user);
    } catch (err) {
      setError(parseError(err));
    }
  }

  function handleEditUser(user: AppUser) {
    setUserForm({
      id: user.id,
      nome: user.nome,
      email: user.email,
      senha: "",
      permissao: user.permissao,
      ativo: user.ativo,
      permissions:
        Object.keys(user.effectivePermissions || {}).length > 0
          ? { ...user.effectivePermissions }
          : defaultPermissionsForRole(user.permissao)
    });
  }

  async function handleDeleteUser(id: number) {
    if (!window.confirm("Excluir usuário?")) return;
    try {
      await authRequest(`/api/users/${id}`, { method: "DELETE" });
      if (userForm.id === id) {
        resetUserForm();
      }
      await refreshUsers();
      success("Usuário removido.");

      const me = await authRequest<MeResponse>("/api/auth/me");
      setCurrentUser(me.user);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function handleSaveTeam(encounterId: number, type: TeamType, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      encontroId: encounterId,
      nome: teamForm.nome,
      tipo: type,
      ordem: Number(teamForm.ordem || 0),
      corHex: type === "CIRCULO" ? teamForm.corHex : null,
      slogan: type === "CIRCULO" ? teamForm.slogan : null
    };

    try {
      if (teamForm.id > 0) {
        await authRequest(`/api/teams/${teamForm.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        success("Registro atualizado.");
      } else {
        await authRequest("/api/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        success("Registro criado.");
      }
      setTeamForm(EMPTY_TEAM_FORM);
      await refreshTeamList(encounterId, type);
      await refreshDashboard(encounterId);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function handleDeleteTeam(encounterId: number, teamId: number, type: TeamType) {
    if (!window.confirm("Excluir este registro?")) return;
    try {
      await authRequest(`/api/teams/${teamId}`, { method: "DELETE" });
      await refreshTeamList(encounterId, type);
      await refreshDashboard(encounterId);
      success("Registro removido.");
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function handleSaveMember(encounterId: number, teamId: number, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (memberForm.id > 0) {
        await authRequest(`/api/members/${memberForm.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cargoNome: memberForm.cargoNome,
            nomePrincipal: memberForm.nomePrincipal,
            nomeSecundario: memberForm.nomeSecundario,
            telefonePrincipal: memberForm.telefonePrincipal,
            telefoneSecundario: memberForm.telefoneSecundario,
            paroquia: memberForm.paroquia
          })
        });
        success("Membro atualizado.");
      } else {
        await authRequest("/api/members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            encontroId: encounterId,
            equipeId: teamId,
            cargoNome: memberForm.cargoNome,
            nomePrincipal: memberForm.nomePrincipal,
            nomeSecundario: memberForm.nomeSecundario,
            telefonePrincipal: memberForm.telefonePrincipal,
            telefoneSecundario: memberForm.telefoneSecundario,
            paroquia: memberForm.paroquia
          })
        });
        success("Membro salvo.");
      }
      setMemberForm(EMPTY_MEMBER_FORM);
      await refreshMembers(encounterId, teamId);
      await refreshDashboard(encounterId);
    } catch (err) {
      setError(parseError(err));
    }
  }

  function handleEditMember(member: Member) {
    setMemberForm({
      id: member.id,
      cargoNome: member.cargo_nome || "",
      nomePrincipal: member.nome_principal,
      nomeSecundario: member.nome_secundario || "",
      telefonePrincipal: member.telefone_principal || "",
      telefoneSecundario: member.telefone_secundario || "",
      paroquia: member.paroquia || ""
    });
  }

  function onMemberPhotoFileChange(encounterId: number, teamId: number, member: Member, file: File) {
    openCrop(
      {
        kind: "MEMBER",
        encounterId,
        teamId,
        memberId: member.id,
        displayName: member.nome_principal
      },
      file,
      CROP_PRESETS.MEMBER
    );
  }

  async function handleDeleteMember(encounterId: number, teamId: number, memberId: number) {
    try {
      await authRequest(`/api/members/${memberId}`, { method: "DELETE" });
      await refreshMembers(encounterId, teamId);
      await refreshDashboard(encounterId);
      success("Membro removido.");
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function handleImportMembers(encounterId: number, teamId: number) {
    if (!importFile) return;
    const formData = new FormData();
    formData.append("encounterId", String(encounterId));
    formData.append("teamId", String(teamId));
    formData.append("file", importFile);

    try {
      const response = await authRequest<MembersImportResponse>("/api/imports", { method: "POST", body: formData });
      const stats = response.estatisticas;
      await refreshMembers(encounterId, teamId);
      await refreshDashboard(encounterId);

      if ((stats.total || 0) <= 0) {
        const erroHint = (stats.erros || []).slice(0, 3).join(" | ");
        setError(
          `Importação concluída sem novos membros. Linhas lidas: ${stats.totalLinhasArquivo}. ` +
            (erroHint ? `Detalhes: ${erroHint}` : "Verifique os títulos de cargo e colunas do arquivo.")
        );
        return;
      }

      setImportFile(null);
      success(
        `Importação concluída: ${stats.total} membro(s), ${stats.casais} casal(is), ${stats.individuais} individual(is).`
      );
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function handleSavePdfTitleMode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const data = await authRequest<PdfTitleSettings>("/api/settings/pdf-title", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: pdfTitleSettings.mode })
      });
      setPdfTitleSettings({
        mode: data.mode || "SYSTEM_FONT",
        font_url: data.font_url || null
      });
      success("Configuração de título do PDF atualizada.");
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function handleUploadPdfTitleFont(file: File | null) {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const data = await authRequest<PdfTitleSettings>("/api/settings/pdf-title/font", {
        method: "POST",
        body: formData
      });
      setPdfTitleSettings({
        mode: data.mode || "CUSTOM_FONT",
        font_url: data.font_url || null
      });
      success("Fonte personalizada enviada para o PDF.");
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function handleImportCircles(encounterId: number) {
    if (!circleImportFile) return;
    const formData = new FormData();
    formData.append("encounterId", String(encounterId));
    formData.append("file", circleImportFile);

    try {
      const response = await authRequest<CirclesImportResponse>("/api/imports/circles", { method: "POST", body: formData });
      const stats = response.estatisticas;
      setCircleImportFile(null);
      await refreshTeamList(encounterId, "CIRCULO");
      await refreshDashboard(encounterId);
      success(
        `Importação geral concluída: ${stats.circulosCriados} círculo(s) criado(s), ${stats.membrosCriados} membro(s) novo(s).`
      );
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function openCrop(target: CropTarget, file: File, preset: CropPreset) {
    try {
      const source = await readFileAsDataUrl(file);
      setCrop({
        source,
        cropBox: { unit: "%", x: 0, y: 0, width: 100, height: 100 },
        pixelCrop: { unit: "px", x: 0, y: 0, width: 0, height: 0 },
        renderWidth: 0,
        renderHeight: 0,
        preset,
        target
      });
    } catch (err) {
      setError(parseError(err));
    }
  }

  function handleCropImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    const renderWidth = image.width || image.clientWidth || image.naturalWidth;
    const renderHeight = image.height || image.clientHeight || image.naturalHeight;
    if (!renderWidth || !renderHeight) return;

    setCrop((prev) => {
      if (!prev) return prev;
      const cropBox = prev.preset.lockAspect
        ? centeredAspectCrop(renderWidth, renderHeight, prev.preset.aspect)
        : ({ unit: "%", x: 0, y: 0, width: 100, height: 100 } as PercentCrop);
      return {
        ...prev,
        cropBox,
        pixelCrop: cropToPixel(cropBox, renderWidth, renderHeight),
        renderWidth,
        renderHeight
      };
    });
  }

  async function handleApplyCrop() {
    if (!crop) return;
    setCropUploading(true);
    try {
      const image = await loadImage(crop.source);
      const renderWidth = crop.renderWidth || image.width || image.naturalWidth;
      const renderHeight = crop.renderHeight || image.height || image.naturalHeight;
      if (!renderWidth || !renderHeight) {
        throw new Error("Nao foi possivel calcular o tamanho da area de recorte.");
      }

      const currentPixelCrop =
        crop.pixelCrop.width > 0 && crop.pixelCrop.height > 0
          ? crop.pixelCrop
          : cropToPixel(crop.cropBox, renderWidth, renderHeight);
      const scaleX = image.naturalWidth / renderWidth;
      const scaleY = image.naturalHeight / renderHeight;
      const pixelCrop: PixelCrop = {
        unit: "px",
        x: Math.round(currentPixelCrop.x * scaleX),
        y: Math.round(currentPixelCrop.y * scaleY),
        width: Math.round(currentPixelCrop.width * scaleX),
        height: Math.round(currentPixelCrop.height * scaleY)
      };
      if (pixelCrop.width < 1 || pixelCrop.height < 1) {
        throw new Error("Defina a área de corte antes de enviar.");
      }

      const blob = await renderCropBlob(crop.source, pixelCrop, crop.preset);
      const file = new File([blob], `crop_${Date.now()}.jpg`, { type: "image/jpeg" });

      if (crop.target.kind === "TEAM") {
        const formData = new FormData();
        formData.append("file", file);
        await authRequest(`/api/teams/${crop.target.teamId}/photo`, { method: "POST", body: formData });
        await refreshTeamList(crop.target.encounterId, crop.target.teamType);
        success(`Imagem de ${crop.target.displayName} enviada.`);
      }

      if (crop.target.kind === "MEMBER") {
        const formData = new FormData();
        formData.append("file", file);
        await authRequest(`/api/members/${crop.target.memberId}/photo`, { method: "POST", body: formData });
        await refreshMembers(crop.target.encounterId, crop.target.teamId);
        success(`Imagem de ${crop.target.displayName} enviada.`);
      }

      if (crop.target.kind === "ASSET") {
        const formData = new FormData();
        formData.append("encounterId", String(crop.target.encounterId));
        formData.append("tipo", crop.target.tipo);
        formData.append("titulo", crop.target.titulo);
        formData.append("ordem", String(crop.target.ordem || 0));
        formData.append("file", file);
        await authRequest("/api/assets", { method: "POST", body: formData });
        setAssetForm({ ...EMPTY_ASSET_FORM });
        await refreshAssets(crop.target.encounterId);
        await refreshDashboard(crop.target.encounterId);
        success("Arte enviada.");
      }

      setCrop(null);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setCropUploading(false);
    }
  }

  async function handleSaveAsset(encounterId: number, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assetForm.file) {
      setError("Selecione um arquivo para envio.");
      return;
    }

    openCrop(
      {
        kind: "ASSET",
        encounterId,
        tipo: assetForm.tipo,
        titulo: assetForm.titulo,
        ordem: Number(assetForm.ordem || 0),
        displayName: assetForm.titulo || assetForm.tipo
      },
      assetForm.file,
      CROP_PRESETS.A4
    );
  }

  async function handleDeleteAsset(encounterId: number, assetId: number) {
    if (!window.confirm("Excluir asset?")) return;
    try {
      await authRequest(`/api/assets/${assetId}`, { method: "DELETE" });
      await refreshAssets(encounterId);
      await refreshDashboard(encounterId);
      success("Asset removido.");
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function handlePreviewTeamPdf(teamId: number) {
    try {
      const blob = await requestBlob(`/api/quadrante/team/${teamId}`, token);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function handlePreviewEncounterPdf(encounterId: number) {
    try {
      const blob = await requestBlob(`/api/quadrante/encounter/${encounterId}`, token);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function handleUploadTeamTitleArt(encounterId: number, type: TeamType, teamId: number, file: File | null) {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await authRequest(`/api/teams/${teamId}/title-art`, {
        method: "POST",
        body: formData
      });
      await refreshTeamList(encounterId, type);
      success("Arte do título enviada.");
    } catch (err) {
      setError(parseError(err));
    }
  }

  function onTeamPhotoFileChange(
    event: ChangeEvent<HTMLInputElement>,
    encounterId: number,
    type: TeamType,
    team: Team
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const preset = type === "CIRCULO" ? CROP_PRESETS.A4 : CROP_PRESETS.TEAM;

    openCrop(
      {
        kind: "TEAM",
        encounterId,
        teamId: team.id,
        teamType: type,
        displayName: type === "CIRCULO" ? `Cartaz de ${team.nome}` : team.nome
      },
      file,
      preset
    );
  }

  const shell = {
    encounters,
    users,
    teams,
    members,
    assets,
    auditLogs,
    auditTotal,
    auditOffset,
    auditLoading,
    auditFilters,
    dashboard,
    encounterForm,
    userForm,
    teamForm,
    memberForm,
    assetForm,
    pdfTitleSettings,
    importFile,
    circleImportFile,
    crop,
    cropUploading,
    currentUser,
    permissionsCatalog,
    can
  };

  const actions = {
    setEncounterForm,
    setUserForm,
    setTeamForm,
    setMemberForm,
    setAssetForm,
    setPdfTitleSettings,
    setAuditFilters,
    setImportFile,
    setCircleImportFile,
    setCrop,
    refreshEncounters,
    refreshDashboard,
    refreshUsers,
    refreshPdfTitleSettings,
    refreshAuditLogs,
    refreshTeamList,
    refreshMembers,
    refreshAssets,
    handleCreateEncounter,
    handleDeleteEncounter,
    handleSaveUser,
    handleEditUser,
    resetUserForm,
    handleDeleteUser,
    handleSavePdfTitleMode,
    handleUploadPdfTitleFont,
    handleSaveTeam,
    handleDeleteTeam,
    handleSaveMember,
    handleEditMember,
    cancelMemberEdit: () => setMemberForm(EMPTY_MEMBER_FORM),
    onMemberPhotoFileChange,
    handleDeleteMember,
    handleImportMembers,
    handleImportCircles,
    handleApplyCrop,
    onTeamPhotoFileChange,
    handleUploadTeamTitleArt,
    handleSaveAsset,
    handleDeleteAsset,
    handlePreviewTeamPdf,
    handlePreviewEncounterPdf,
    updateUserRole: (role: RoleType) =>
      setUserForm((prev) => ({ ...prev, permissao: role, permissions: defaultPermissionsForRole(role) })),
    toggleUserPermission: (permissionKey: string, value: boolean) =>
      setUserForm((prev) => ({
        ...prev,
        permissions: { ...prev.permissions, [permissionKey]: value }
      })),
    setLoginForm,
    handleLogin,
    handleLogout
  };

  const canViewDashboard = can(PERMISSIONS.DASHBOARD_VIEW);
  const canViewEncounters = can(PERMISSIONS.ENCOUNTERS_VIEW);
  const canViewUsers = can(PERMISSIONS.USERS_VIEW);
  const canViewTeams = can(PERMISSIONS.TEAMS_VIEW);
  const canViewMembers = can(PERMISSIONS.MEMBERS_VIEW);
  const canViewAssets = can(PERMISSIONS.ASSETS_VIEW);

  const defaultPath = canViewDashboard
    ? "/dashboard"
    : canViewEncounters
      ? "/encounters"
      : canViewUsers
        ? "/settings"
        : "/dashboard";

  if (authLoading) {
    return (
      <div className="auth-layout">
        <div className="auth-card">
          <h2>Carregando</h2>
          <p className="muted">Validando sessão.</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen loginForm={loginForm} onChange={setLoginForm} onSubmit={handleLogin} error={error} />;
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <h1>EJC Connect</h1>
          <p>Painel administrativo</p>
        </div>
        <nav className="nav-list">
          {canViewDashboard && (
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              Dashboard
            </NavLink>
          )}
          {canViewEncounters && (
            <NavLink to="/encounters" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              Encontros
            </NavLink>
          )}
          {canViewUsers && (
            <NavLink to="/settings" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              Configuração
            </NavLink>
          )}
        </nav>
        <div className="sidebar-user">
          <strong>{currentUser.nome}</strong>
          <span>{currentUser.permissao}</span>
        </div>
        <button className="theme-toggle" onClick={handleLogout}>
          Sair
        </button>
        <button
          className="theme-toggle"
          onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        >
          {theme === "light" ? "Tema escuro" : "Tema claro"}
        </button>
      </aside>

      <main className="content">
        {(message || error) && <div className={`notice ${error ? "error" : "ok"}`}>{error || message}</div>}

        <Routes>
          <Route path="/" element={<Navigate to={defaultPath} replace />} />
          <Route
            path="/dashboard"
            element={canViewDashboard ? <DashboardScreen shell={shell} actions={actions} /> : <AccessDeniedScreen />}
          />
          <Route
            path="/settings"
            element={canViewUsers ? <SettingsScreen shell={shell} actions={actions} /> : <AccessDeniedScreen />}
          />
          <Route
            path="/encounters"
            element={canViewEncounters ? <EncountersScreen shell={shell} actions={actions} /> : <AccessDeniedScreen />}
          />
          <Route
            path="/encounters/:encounterId"
            element={canViewEncounters ? <EncounterHubScreen shell={shell} actions={actions} /> : <AccessDeniedScreen />}
          />
          <Route
            path="/encounters/:encounterId/teams"
            element={canViewTeams ? <TeamListScreen type="TRABALHO" title="Equipe" shell={shell} actions={actions} /> : <AccessDeniedScreen />}
          />
          <Route
            path="/encounters/:encounterId/circles"
            element={canViewTeams ? <TeamListScreen type="CIRCULO" title="Círculo" shell={shell} actions={actions} /> : <AccessDeniedScreen />}
          />
          <Route
            path="/encounters/:encounterId/teams/:teamId"
            element={canViewTeams && canViewMembers ? <TeamDetailScreen type="TRABALHO" title="Equipe" shell={shell} actions={actions} /> : <AccessDeniedScreen />}
          />
          <Route
            path="/encounters/:encounterId/circles/:teamId"
            element={canViewTeams && canViewMembers ? <TeamDetailScreen type="CIRCULO" title="Círculo" shell={shell} actions={actions} /> : <AccessDeniedScreen />}
          />
          <Route
            path="/encounters/:encounterId/assets"
            element={canViewAssets ? <AssetsScreen shell={shell} actions={actions} /> : <AccessDeniedScreen />}
          />
          <Route path="*" element={<Navigate to={defaultPath} replace />} />
        </Routes>
      </main>

      {crop && (
        <div className="crop-backdrop">
          <div className="crop-modal">
            <h2>Recortar imagem: {crop.target.displayName}</h2>
            <p className="crop-hint">Proporção: {crop.preset.label}</p>
            <div className="crop-body">
              <div className="crop-preview">
                <ReactCrop
                  crop={crop.cropBox}
                  onChange={(pixelCrop, percentCrop) =>
                    setCrop((prev) => (prev ? { ...prev, cropBox: percentCrop, pixelCrop } : prev))
                  }
                  aspect={crop.preset.lockAspect ? crop.preset.aspect : undefined}
                  minWidth={40}
                  minHeight={40}
                  ruleOfThirds
                  className="cropper-frame"
                >
                  <img src={crop.source} alt="Imagem para recorte" onLoad={handleCropImageLoad} />
                </ReactCrop>
              </div>
              <p className="muted crop-helper">Arraste e redimensione a área usando as alças do recorte.</p>
            </div>
            <div className="actions-row crop-footer">
              <button className="ghost" onClick={() => setCrop(null)}>
                Cancelar
              </button>
              <button disabled={cropUploading} onClick={() => handleApplyCrop()}>
                {cropUploading ? "Enviando..." : "Aplicar crop e enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginScreen({
  loginForm,
  onChange,
  onSubmit,
  error
}: {
  loginForm: { email: string; senha: string };
  onChange: (value: { email: string; senha: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  error: string;
}) {
  return (
    <div className="auth-layout">
      <div className="auth-card">
        <h2>Acesso ao EJC Connect</h2>
        <p className="muted">Entre com seu usuário para acessar o painel administrativo.</p>
        <form className="grid-form" onSubmit={onSubmit}>
          <label>
            E-mail
            <input
              required
              type="email"
              autoComplete="username"
              value={loginForm.email}
              onChange={(event) => onChange({ ...loginForm, email: event.target.value })}
            />
          </label>
          <label>
            Senha
            <input
              required
              type="password"
              autoComplete="current-password"
              value={loginForm.senha}
              onChange={(event) => onChange({ ...loginForm, senha: event.target.value })}
            />
          </label>
          <button type="submit">Entrar</button>
        </form>
        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  );
}

function AccessDeniedScreen() {
  return (
    <div className="panel">
      <h2>Acesso negado</h2>
      <p className="muted">Você não possui permissão para visualizar esta funcionalidade.</p>
    </div>
  );
}

function DashboardScreen({ shell, actions }: { shell: any; actions: any }) {
  const [filterEncounterId, setFilterEncounterId] = useState<number | null>(null);

  useEffect(() => {
    actions.refreshDashboard(filterEncounterId || undefined);
  }, [filterEncounterId]);

  return (
    <section className="page-stack">
      <div className="panel">
        <div className="panel-head">
          <h2>Dashboard</h2>
          <select
            value={filterEncounterId || ""}
            onChange={(event) => setFilterEncounterId(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">Todos os encontros</option>
            {shell.encounters.map((encounter: Encounter) => (
              <option key={encounter.id} value={encounter.id}>
                {displayEncounterName(encounter)}
              </option>
            ))}
          </select>
        </div>
        <div className="stats-grid">
          <article className="stat-card"><span>Encontros</span><strong>{shell.dashboard.encontros}</strong></article>
          <article className="stat-card"><span>Equipes</span><strong>{shell.dashboard.equipes}</strong></article>
          <article className="stat-card"><span>Círculos</span><strong>{shell.dashboard.circulos}</strong></article>
          <article className="stat-card"><span>Capas/Cartazes</span><strong>{shell.dashboard.capasCartazes}</strong></article>
          <article className="stat-card"><span>Membros</span><strong>{shell.dashboard.membros}</strong></article>
        </div>
      </div>
    </section>
  );
}

function SettingsScreen({ shell, actions }: { shell: any; actions: any }) {
  type SettingsTab = "USERS" | "PDF_TITLE" | "AUDIT";
  const canManageUsers = shell.can(PERMISSIONS.USERS_MANAGE);
  const [tab, setTab] = useState<SettingsTab>("USERS");
  const auditActions = ["CREATE", "UPDATE", "DELETE", "UPLOAD", "IMPORT"];
  const resourceTypes = [
    "ENCONTRO",
    "EQUIPE",
    "CIRCULO",
    "MEMBRO",
    "ASSET",
    "USUARIO",
    "MEMBROS",
    "CIRCULOS",
    "SETTINGS_PDF_TITLE",
    "SETTINGS_PDF_TITLE_FONT",
    "EQUIPE_TITULO_ARTE",
    "MEMBRO_FOTO"
  ];

  const auditPageSize = Number(shell.auditFilters?.limit || 50);
  const auditCurrentPage = Math.floor(Number(shell.auditOffset || 0) / auditPageSize) + 1;
  const auditTotalPages = Math.max(1, Math.ceil(Number(shell.auditTotal || 0) / auditPageSize));

  useEffect(() => {
    actions.refreshUsers();
    actions.refreshPdfTitleSettings();
    actions.refreshAuditLogs({ ...DEFAULT_AUDIT_FILTERS }, 0);
  }, []);

  return (
    <section className="page-stack">
      <div className="panel">
        <div className="settings-tabs">
          <button
            className={`settings-tab ${tab === "USERS" ? "active" : ""}`.trim()}
            onClick={() => setTab("USERS")}
            type="button"
          >
            Usuários
          </button>
          <button
            className={`settings-tab ${tab === "PDF_TITLE" ? "active" : ""}`.trim()}
            onClick={() => setTab("PDF_TITLE")}
            type="button"
          >
            Título PDF
          </button>
          <button
            className={`settings-tab ${tab === "AUDIT" ? "active" : ""}`.trim()}
            onClick={() => setTab("AUDIT")}
            type="button"
          >
            Auditoria
          </button>
        </div>
      </div>

      {tab === "USERS" && (
        <>
          <div className="panel">
            <h2>Configuração de usuários</h2>
            <form className="grid-form two" onSubmit={actions.handleSaveUser}>
              <label>
                Nome
                <input
                  required
                  disabled={!canManageUsers}
                  value={shell.userForm.nome}
                  onChange={(event) => actions.setUserForm((prev: any) => ({ ...prev, nome: event.target.value }))}
                />
              </label>
              <label>
                E-mail
                <input
                  required
                  type="email"
                  disabled={!canManageUsers}
                  value={shell.userForm.email}
                  onChange={(event) => actions.setUserForm((prev: any) => ({ ...prev, email: event.target.value }))}
                />
              </label>
              <label>
                Senha
                <input
                  type="password"
                  disabled={!canManageUsers}
                  placeholder={shell.userForm.id > 0 ? "Opcional para alterar" : "Mínimo 8 caracteres"}
                  value={shell.userForm.senha}
                  onChange={(event) => actions.setUserForm((prev: any) => ({ ...prev, senha: event.target.value }))}
                />
              </label>
              <label>
                Permissão
                <select
                  disabled={!canManageUsers}
                  value={shell.userForm.permissao}
                  onChange={(event) => actions.updateUserRole(event.target.value as RoleType)}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="EDITOR">EDITOR</option>
                  <option value="VISUALIZADOR">VISUALIZADOR</option>
                </select>
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  disabled={!canManageUsers}
                  checked={shell.userForm.ativo}
                  onChange={(event) => actions.setUserForm((prev: any) => ({ ...prev, ativo: event.target.checked }))}
                />
                Usuário ativo
              </label>
              <div className="actions-row">
                <button type="submit" disabled={!canManageUsers}>
                  {shell.userForm.id > 0 ? "Salvar edição" : "Criar usuário"}
                </button>
                <button className="ghost" type="button" onClick={() => actions.resetUserForm()} disabled={!canManageUsers}>
                  Limpar
                </button>
              </div>
              <div className="permissions-box">
                <h3>Permissões por funcionalidade</h3>
                <div className="permissions-grid">
                  {shell.permissionsCatalog.map((key: string) => (
                    <label key={key} className="toggle permission-toggle">
                      <input
                        type="checkbox"
                        disabled={!canManageUsers}
                        checked={Boolean(shell.userForm.permissions?.[key])}
                        onChange={(event) => actions.toggleUserPermission(key, event.target.checked)}
                      />
                      {key}
                    </label>
                  ))}
                </div>
              </div>
            </form>
          </div>

          <div className="panel">
            <h2>Usuários cadastrados</h2>
            <div className="entity-list">
              {shell.users.map((user: AppUser) => (
                <article key={user.id} className="entity-card">
                  <div>
                    <h3>{user.nome}</h3>
                    <p>{user.email}</p>
                    <span className="chip">{user.permissao}</span>
                    {!user.ativo && <span className="chip danger">Inativo</span>}
                    <p className="muted">
                      Último login: {user.last_login_at ? formatDate(user.last_login_at) : "nunca"}
                    </p>
                  </div>
                  <div className="actions-row">
                    <button className="ghost" onClick={() => actions.handleEditUser(user)} disabled={!canManageUsers}>
                      Editar
                    </button>
                    <button className="danger-btn" onClick={() => actions.handleDeleteUser(user.id)} disabled={!canManageUsers}>
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "PDF_TITLE" && (
        <div className="panel">
          <h2>Título das equipes no PDF</h2>
          <form className="grid-form" onSubmit={actions.handleSavePdfTitleMode}>
            <label className="toggle">
              <input
                type="radio"
                name="pdf-title-mode"
                disabled={!canManageUsers}
                checked={shell.pdfTitleSettings.mode === "SYSTEM_FONT"}
                onChange={() =>
                  actions.setPdfTitleSettings((prev: PdfTitleSettings) => ({ ...prev, mode: "SYSTEM_FONT" }))
                }
              />
              Fonte padrão do sistema
            </label>
            <label className="toggle">
              <input
                type="radio"
                name="pdf-title-mode"
                disabled={!canManageUsers}
                checked={shell.pdfTitleSettings.mode === "CUSTOM_FONT"}
                onChange={() =>
                  actions.setPdfTitleSettings((prev: PdfTitleSettings) => ({ ...prev, mode: "CUSTOM_FONT" }))
                }
              />
              Enviar fonte personalizada
            </label>
            <label className="toggle">
              <input
                type="radio"
                name="pdf-title-mode"
                disabled={!canManageUsers}
                checked={shell.pdfTitleSettings.mode === "TEAM_ART"}
                onChange={() =>
                  actions.setPdfTitleSettings((prev: PdfTitleSettings) => ({ ...prev, mode: "TEAM_ART" }))
                }
              />
              Usar arte por equipe
            </label>

            {shell.pdfTitleSettings.mode === "CUSTOM_FONT" && (
              <label className="file-field">
                Arquivo de fonte (.ttf, .otf, .woff, .woff2)
                <input
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2"
                  disabled={!canManageUsers}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    event.target.value = "";
                    actions.handleUploadPdfTitleFont(file);
                  }}
                />
              </label>
            )}

            <p className="muted">
              {shell.pdfTitleSettings.mode === "TEAM_ART"
                ? "Modo ativo: cada equipe pode receber uma arte para o título na tela da equipe."
                : shell.pdfTitleSettings.font_url
                  ? `Fonte atual: ${shell.pdfTitleSettings.font_url}`
                  : "Nenhuma fonte personalizada cadastrada."}
            </p>

            <div className="actions-row">
              <button type="submit" disabled={!canManageUsers}>Salvar modo</button>
            </div>
          </form>
        </div>
      )}

      {tab === "AUDIT" && (
        <>
          <div className="panel">
            <h2>Log de auditoria</h2>
            <form
              className="grid-form two"
              onSubmit={(event) => {
                event.preventDefault();
                actions.refreshAuditLogs(shell.auditFilters, 0);
              }}
            >
              <label>
                Encontro
                <select
                  value={shell.auditFilters.encounterId || ""}
                  onChange={(event) =>
                    actions.setAuditFilters((prev: AuditFilters) => ({
                      ...prev,
                      encounterId: event.target.value ? Number(event.target.value) : null
                    }))
                  }
                >
                  <option value="">Todos</option>
                  {shell.encounters.map((encounter: Encounter) => (
                    <option key={encounter.id} value={encounter.id}>
                      {displayEncounterName(encounter)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Usuário
                <select
                  value={shell.auditFilters.userId || ""}
                  onChange={(event) =>
                    actions.setAuditFilters((prev: AuditFilters) => ({
                      ...prev,
                      userId: event.target.value ? Number(event.target.value) : null
                    }))
                  }
                >
                  <option value="">Todos</option>
                  {shell.users.map((user: AppUser) => (
                    <option key={user.id} value={user.id}>
                      {user.nome} ({user.email})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ação
                <select
                  value={shell.auditFilters.action}
                  onChange={(event) =>
                    actions.setAuditFilters((prev: AuditFilters) => ({
                      ...prev,
                      action: event.target.value
                    }))
                  }
                >
                  <option value="">Todas</option>
                  {auditActions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Recurso
                <select
                  value={shell.auditFilters.resourceType}
                  onChange={(event) =>
                    actions.setAuditFilters((prev: AuditFilters) => ({
                      ...prev,
                      resourceType: event.target.value
                    }))
                  }
                >
                  <option value="">Todos</option>
                  {resourceTypes.map((resourceType) => (
                    <option key={resourceType} value={resourceType}>
                      {resourceType}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Itens por página
                <select
                  value={shell.auditFilters.limit}
                  onChange={(event) =>
                    actions.setAuditFilters((prev: AuditFilters) => ({
                      ...prev,
                      limit: Number(event.target.value || "50")
                    }))
                  }
                >
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                </select>
              </label>
              <div className="actions-row">
                <button type="submit">Aplicar filtros</button>
                <button
                  className="ghost"
                  type="button"
                  onClick={() => {
                    actions.setAuditFilters({ ...DEFAULT_AUDIT_FILTERS });
                    actions.refreshAuditLogs({ ...DEFAULT_AUDIT_FILTERS }, 0);
                  }}
                >
                  Limpar
                </button>
              </div>
            </form>
          </div>

          <div className="panel">
            <div className="audit-pagination">
              <p className="muted">
                Total: {shell.auditTotal} registro(s) | Página {auditCurrentPage} de {auditTotalPages}
              </p>
              <div className="actions-row">
                <button
                  className="ghost"
                  disabled={shell.auditOffset <= 0 || shell.auditLoading}
                  onClick={() => actions.refreshAuditLogs(shell.auditFilters, Math.max(0, shell.auditOffset - auditPageSize))}
                >
                  Anterior
                </button>
                <button
                  className="ghost"
                  disabled={shell.auditOffset + auditPageSize >= shell.auditTotal || shell.auditLoading}
                  onClick={() => actions.refreshAuditLogs(shell.auditFilters, shell.auditOffset + auditPageSize)}
                >
                  Próxima
                </button>
              </div>
            </div>

            {shell.auditLoading && <p className="muted">Carregando auditoria...</p>}

            <div className="entity-list">
              {shell.auditLogs.map((log: AuditLogEntry) => (
                <article key={log.id} className="entity-card audit-card">
                  <div className="audit-head">
                    <div>
                      <h3>{log.summary || `${log.action} ${log.resource_type}`}</h3>
                      <p className="muted">{formatDateTime(log.created_at)}</p>
                    </div>
                    <div className="audit-meta">
                      <span className="chip">{log.action}</span>
                      <span className="chip">{log.resource_type}</span>
                      {log.resource_id && <span className="chip">ID {log.resource_id}</span>}
                    </div>
                  </div>
                  <p className="muted">
                    Usuário: {log.user_nome || log.user_email || "Sistema"} | Encontro: {log.encontro_nome || "N/A"}
                  </p>
                  <details className="audit-details">
                    <summary>Detalhes técnicos</summary>
                    <pre>{JSON.stringify(log.details || {}, null, 2)}</pre>
                  </details>
                </article>
              ))}
            </div>

            {!shell.auditLoading && shell.auditLogs.length === 0 && (
              <p className="muted">Nenhum registro de auditoria para os filtros atuais.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function EncountersScreen({ shell, actions }: { shell: any; actions: any }) {
  const navigate = useNavigate();
  const canManage = shell.can(PERMISSIONS.ENCOUNTERS_MANAGE);
  const canGeneratePdf = shell.can(PERMISSIONS.PDF_GENERATE);

  return (
    <section className="page-stack">
      <div className="panel">
        <h2>Novo encontro</h2>
        <form className="grid-form three" onSubmit={actions.handleCreateEncounter}>
          <label>
            Nome do encontro
            <input
              required
              disabled={!canManage}
              value={shell.encounterForm.nome}
              onChange={(event) => actions.setEncounterForm((prev: any) => ({ ...prev, nome: event.target.value }))}
            />
          </label>
          <label>
            Data de início
            <input
              required
              type="date"
              disabled={!canManage}
              value={shell.encounterForm.dataInicio}
              onChange={(event) => actions.setEncounterForm((prev: any) => ({ ...prev, dataInicio: event.target.value }))}
            />
          </label>
          <label>
            Data de fim
            <input
              required
              type="date"
              disabled={!canManage}
              value={shell.encounterForm.dataFim}
              onChange={(event) => actions.setEncounterForm((prev: any) => ({ ...prev, dataFim: event.target.value }))}
            />
          </label>
          <button type="submit" disabled={!canManage}>Cadastrar encontro</button>
        </form>
      </div>

      <div className="panel">
        <h2>Encontros</h2>
        <div className="cards-grid">
          {shell.encounters.map((encounter: Encounter) => (
            <article
              key={encounter.id}
              className="main-card clickable"
              onClick={() => navigate(`/encounters/${encounter.id}`)}
            >
              <h3>{displayEncounterName(encounter)}</h3>
              <p>
                {formatDate(encounter.data_inicio || encounter.data_encontro)} até{" "}
                {formatDate(encounter.data_fim || encounter.data_encontro)}
              </p>
              <div className="actions-row">
                <Link
                  className="as-btn"
                  to={`/encounters/${encounter.id}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  Abrir gestão
                </Link>
                <button
                  disabled={!canGeneratePdf}
                  onClick={(event) => {
                    event.stopPropagation();
                    actions.handlePreviewEncounterPdf(encounter.id);
                  }}
                >
                  Quadrante
                </button>
                <button
                  className="danger-btn"
                  disabled={!canManage}
                  onClick={(event) => {
                    event.stopPropagation();
                    actions.handleDeleteEncounter(encounter.id);
                  }}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function EncounterHubScreen({ shell, actions }: { shell: any; actions: any }) {
  const params = useParams();
  const encounterId = parseNumericParam(params.encounterId);
  const navigate = useNavigate();
  const encounter = shell.encounters.find((item: Encounter) => sameId(item.id, encounterId));
  const canTeams = shell.can(PERMISSIONS.TEAMS_VIEW);
  const canAssets = shell.can(PERMISSIONS.ASSETS_VIEW);

  useEffect(() => {
    if (encounterId) actions.refreshDashboard(encounterId);
  }, [encounterId]);

  if (!encounterId) return <Navigate to="/encounters" replace />;
  if (!encounter) return <div className="panel"><p>Encontro não encontrado.</p></div>;

  return (
    <section className="page-stack">
      <div className="panel">
        <div className="panel-head">
          <h2>{displayEncounterName(encounter)}</h2>
          <Link className="as-btn" to="/encounters">Voltar</Link>
        </div>
        <div className="cards-grid">
          {canTeams && (
            <article className="main-card clickable" onClick={() => navigate(`/encounters/${encounterId}/teams`)}>
              <h3>Equipes</h3>
              <p>Gerencie equipes de trabalho em telas dedicadas.</p>
            </article>
          )}
          {canTeams && (
            <article className="main-card clickable" onClick={() => navigate(`/encounters/${encounterId}/circles`)}>
              <h3>Círculos</h3>
              <p>Gerencie círculos e seus dados de liderança.</p>
            </article>
          )}
          {canAssets && (
            <article className="main-card clickable" onClick={() => navigate(`/encounters/${encounterId}/assets`)}>
              <h3>Capas e separadores</h3>
              <p>Envie artes A4 para capa, contra capa e separadores.</p>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}

function TeamListScreen({
  type,
  title,
  shell,
  actions
}: {
  type: TeamType;
  title: string;
  shell: any;
  actions: any;
}) {
  const params = useParams();
  const encounterId = parseNumericParam(params.encounterId);
  const navigate = useNavigate();
  const isCircle = type === "CIRCULO";
  const canManageTeams = shell.can(PERMISSIONS.TEAMS_MANAGE);
  const canImportCircles = shell.can(PERMISSIONS.CIRCLES_IMPORT);

  useEffect(() => {
    if (encounterId) {
      actions.refreshTeamList(encounterId, type);
      actions.setTeamForm(EMPTY_TEAM_FORM);
    }
  }, [encounterId, type]);

  if (!encounterId) return <Navigate to="/encounters" replace />;
  const encounter = shell.encounters.find((item: Encounter) => sameId(item.id, encounterId));
  if (!encounter) return <div className="panel"><p>Encontro não encontrado.</p></div>;

  return (
    <section className="page-stack">
      {isCircle && (
        <div className="panel">
          <h2>Importação geral de círculos</h2>
          <p className="muted">Importe um único arquivo para criar/atualizar todos os círculos deste encontro.</p>
          <div className="actions-row">
            <label className="file-field">
              Arquivo
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                disabled={!canImportCircles}
                onChange={(event) => actions.setCircleImportFile(event.target.files?.[0] || null)}
              />
            </label>
            <button
              disabled={!shell.circleImportFile || !canImportCircles}
              onClick={() => actions.handleImportCircles(encounterId)}
            >
              Importar todos os círculos
            </button>
          </div>
        </div>
      )}

      <div className="panel two-col">
        <div>
          <h2>{shell.teamForm.id > 0 ? `Editar ${title}` : `Novo ${title}`}</h2>
          <form className="grid-form" onSubmit={(event) => actions.handleSaveTeam(encounterId, type, event)}>
            <label>
              Nome
              <input
                required
                disabled={!canManageTeams}
                value={shell.teamForm.nome}
                onChange={(event) => actions.setTeamForm((prev: TeamFormState) => ({ ...prev, nome: event.target.value }))}
              />
            </label>
            <label>
              Ordem de impressão
              <input
                type="number"
                disabled={!canManageTeams}
                value={shell.teamForm.ordem}
                onChange={(event) =>
                  actions.setTeamForm((prev: TeamFormState) => ({ ...prev, ordem: Number(event.target.value || "0") }))
                }
              />
            </label>
            {isCircle && (
              <>
                <label>
                  Cor
                  <input
                    type="color"
                    disabled={!canManageTeams}
                    value={shell.teamForm.corHex}
                    onChange={(event) => actions.setTeamForm((prev: TeamFormState) => ({ ...prev, corHex: event.target.value }))}
                  />
                </label>
                <label>
                  Slogan
                  <input
                    disabled={!canManageTeams}
                    value={shell.teamForm.slogan}
                    onChange={(event) => actions.setTeamForm((prev: TeamFormState) => ({ ...prev, slogan: event.target.value }))}
                  />
                </label>
              </>
            )}
            <div className="actions-row">
              <button type="submit" disabled={!canManageTeams}>{shell.teamForm.id > 0 ? "Salvar edição" : "Criar"}</button>
              <button className="ghost" type="button" disabled={!canManageTeams} onClick={() => actions.setTeamForm(EMPTY_TEAM_FORM)}>
                Limpar
              </button>
            </div>
          </form>
        </div>

        <div>
          <h2>{title}s cadastrados</h2>
          <div className="entity-list">
            {shell.teams.map((team: Team) => (
              <article key={team.id} className="entity-card">
                <div>
                  <h3>{team.nome}</h3>
                  <p>Ordem {team.ordem}</p>
                  {team.cor_hex && <span className="chip">{team.cor_hex}</span>}
                  {team.slogan && <p className="muted">{team.slogan}</p>}
                </div>
                <div className="actions-row">
                  <button
                    className="ghost"
                    disabled={!canManageTeams}
                    onClick={() =>
                      actions.setTeamForm({
                        id: team.id,
                        nome: team.nome,
                        ordem: team.ordem,
                        corHex: team.cor_hex || "#8fbc8f",
                        slogan: team.slogan || ""
                      })
                    }
                  >
                    Editar
                  </button>
                  <button
                    className="ghost"
                    onClick={() =>
                      navigate(
                        type === "CIRCULO"
                          ? `/encounters/${encounterId}/circles/${team.id}`
                          : `/encounters/${encounterId}/teams/${team.id}`
                      )
                    }
                  >
                    Abrir
                  </button>
                  <button
                    className="danger-btn"
                    disabled={!canManageTeams}
                    onClick={() => actions.handleDeleteTeam(encounterId, team.id, type)}
                  >
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>{displayEncounterName(encounter)}</h2>
          <Link className="as-btn" to={`/encounters/${encounterId}`}>Voltar ao encontro</Link>
        </div>
      </div>
    </section>
  );
}

function TeamDetailScreen({
  type,
  title,
  shell,
  actions
}: {
  type: TeamType;
  title: string;
  shell: any;
  actions: any;
}) {
  const params = useParams();
  const encounterId = parseNumericParam(params.encounterId);
  const teamId = parseNumericParam(params.teamId);
  const isCircle = type === "CIRCULO";
  const parentPath = isCircle ? "circles" : "teams";
  const canManageTeams = shell.can(PERMISSIONS.TEAMS_MANAGE);
  const canImportMembers = shell.can(PERMISSIONS.IMPORTS_RUN);
  const canManageMembers = shell.can(PERMISSIONS.MEMBERS_MANAGE);
  const canGeneratePdf = shell.can(PERMISSIONS.PDF_GENERATE);
  const showCircleMemberPhotos = isCircle;

  useEffect(() => {
    if (encounterId) actions.refreshTeamList(encounterId, type);
  }, [encounterId, type]);

  useEffect(() => {
    if (encounterId && teamId) actions.refreshMembers(encounterId, teamId);
  }, [encounterId, teamId]);

  const team = shell.teams.find((item: Team) => sameId(item.id, teamId)) || null;
  const groupedMembers = useMemo(() => groupMembersByCargo(shell.members), [shell.members]);

  if (!encounterId || !teamId) return <Navigate to="/encounters" replace />;
  if (!team) return <div className="panel"><p>Carregando {title.toLowerCase()}...</p></div>;

  return (
    <section className="page-stack">
      <div className="panel">
        <div className="panel-head">
          <h2>{title}: {team.nome}</h2>
          <div className="actions-row">
            <Link className="as-btn" to={`/encounters/${encounterId}/${parentPath}`}>Voltar</Link>
            <button disabled={!canGeneratePdf} onClick={() => actions.handlePreviewTeamPdf(team.id)}>
              Visualizar quadrante da equipe
            </button>
          </div>
        </div>
      </div>

      <div className="panel two-col">
        <div>
          <h3>{isCircle ? "Cartaz do círculo" : `Foto da ${title.toLowerCase()}`}</h3>
          {team.foto_url ? (
            <img className={isCircle ? "poster-thumb" : "thumb"} src={mediaUrl(team.foto_url)} alt={team.nome} />
          ) : (
            <p className="muted">{isCircle ? "Nenhum cartaz enviado." : "Nenhuma foto enviada."}</p>
          )}
          <label className="file-field">
            {isCircle ? "Enviar cartaz (crop A4)" : "Enviar foto (crop 15x10)"}
            <input
              type="file"
              accept="image/*"
              disabled={!canManageTeams}
              onChange={(event) => actions.onTeamPhotoFileChange(event, encounterId, type, team)}
            />
          </label>
          {!isCircle && shell.pdfTitleSettings.mode === "TEAM_ART" && (
            <>
              <h3 className="team-title-art-title">Arte do título da equipe</h3>
              {team.titulo_arte_url ? (
                <img className="title-art-thumb" src={mediaUrl(team.titulo_arte_url)} alt={`Título ${team.nome}`} />
              ) : (
                <p className="muted">Nenhuma arte de título enviada.</p>
              )}
              <label className="file-field">
                Enviar arte do título
                <input
                  type="file"
                  accept="image/*"
                  disabled={!canManageTeams}
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    event.target.value = "";
                    actions.handleUploadTeamTitleArt(encounterId, type, team.id, file);
                  }}
                />
              </label>
            </>
          )}
        </div>
        <div>
          <h3>Importação de Excel/CSV</h3>
          <p className="muted">Dados manuais/importados serão agrupados por cargos nesta tela e no PDF.</p>
          <label className="file-field">
            Arquivo
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={!canImportMembers}
              onChange={(event) => actions.setImportFile(event.target.files?.[0] || null)}
            />
          </label>
          <button disabled={!shell.importFile || !canImportMembers} onClick={() => actions.handleImportMembers(encounterId, teamId)}>
            Importar dados
          </button>
        </div>
      </div>

      <div id="member-form-panel" className="panel">
        {shell.memberForm.id > 0 ? (
          <>
            <h3>Adicionar membro</h3>
            <p className="muted">Existe uma edição aberta no modal. Conclua ou cancele a edição para adicionar novo membro.</p>
          </>
        ) : (
          <>
            <h3>Adicionar membro</h3>
            <form className="grid-form three" onSubmit={(event) => actions.handleSaveMember(encounterId, teamId, event)}>
              <label>
                Cargo
                <input
                  required
                  disabled={!canManageMembers}
                  value={shell.memberForm.cargoNome}
                  onChange={(event) => actions.setMemberForm((prev: MemberFormState) => ({ ...prev, cargoNome: event.target.value }))}
                />
              </label>
              <label>
                Nome principal
                <input
                  required
                  disabled={!canManageMembers}
                  value={shell.memberForm.nomePrincipal}
                  onChange={(event) => actions.setMemberForm((prev: MemberFormState) => ({ ...prev, nomePrincipal: event.target.value }))}
                />
              </label>
              <label>
                Nome secundário (casal)
                <input
                  disabled={!canManageMembers}
                  value={shell.memberForm.nomeSecundario}
                  onChange={(event) => actions.setMemberForm((prev: MemberFormState) => ({ ...prev, nomeSecundario: event.target.value }))}
                />
              </label>
              <label>
                Telefone principal
                <input
                  disabled={!canManageMembers}
                  value={shell.memberForm.telefonePrincipal}
                  onChange={(event) => actions.setMemberForm((prev: MemberFormState) => ({ ...prev, telefonePrincipal: event.target.value }))}
                />
              </label>
              <label>
                Telefone secundário
                <input
                  disabled={!canManageMembers}
                  value={shell.memberForm.telefoneSecundario}
                  onChange={(event) => actions.setMemberForm((prev: MemberFormState) => ({ ...prev, telefoneSecundario: event.target.value }))}
                />
              </label>
              <label>
                Paróquia
                <input
                  disabled={!canManageMembers}
                  value={shell.memberForm.paroquia}
                  onChange={(event) => actions.setMemberForm((prev: MemberFormState) => ({ ...prev, paroquia: event.target.value }))}
                />
              </label>
              <div className="actions-row">
                <button type="submit" disabled={!canManageMembers}>
                  Adicionar membro
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {shell.memberForm.id > 0 && (
        <div className="crop-backdrop" onClick={() => actions.cancelMemberEdit()}>
          <div className="form-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Editar membro</h3>
            <form className="grid-form three" onSubmit={(event) => actions.handleSaveMember(encounterId, teamId, event)}>
              <label>
                Cargo
                <input
                  required
                  disabled={!canManageMembers}
                  value={shell.memberForm.cargoNome}
                  onChange={(event) => actions.setMemberForm((prev: MemberFormState) => ({ ...prev, cargoNome: event.target.value }))}
                />
              </label>
              <label>
                Nome principal
                <input
                  required
                  disabled={!canManageMembers}
                  value={shell.memberForm.nomePrincipal}
                  onChange={(event) => actions.setMemberForm((prev: MemberFormState) => ({ ...prev, nomePrincipal: event.target.value }))}
                />
              </label>
              <label>
                Nome secundário (casal)
                <input
                  disabled={!canManageMembers}
                  value={shell.memberForm.nomeSecundario}
                  onChange={(event) => actions.setMemberForm((prev: MemberFormState) => ({ ...prev, nomeSecundario: event.target.value }))}
                />
              </label>
              <label>
                Telefone principal
                <input
                  disabled={!canManageMembers}
                  value={shell.memberForm.telefonePrincipal}
                  onChange={(event) => actions.setMemberForm((prev: MemberFormState) => ({ ...prev, telefonePrincipal: event.target.value }))}
                />
              </label>
              <label>
                Telefone secundário
                <input
                  disabled={!canManageMembers}
                  value={shell.memberForm.telefoneSecundario}
                  onChange={(event) => actions.setMemberForm((prev: MemberFormState) => ({ ...prev, telefoneSecundario: event.target.value }))}
                />
              </label>
              <label>
                Paróquia
                <input
                  disabled={!canManageMembers}
                  value={shell.memberForm.paroquia}
                  onChange={(event) => actions.setMemberForm((prev: MemberFormState) => ({ ...prev, paroquia: event.target.value }))}
                />
              </label>
              <div className="actions-row">
                <button className="ghost" type="button" disabled={!canManageMembers} onClick={() => actions.cancelMemberEdit()}>
                  Cancelar
                </button>
                <button type="submit" disabled={!canManageMembers}>Salvar edição</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="panel">
        <h3>Membros agrupados por cargo</h3>
        {groupedMembers.map((group) => (
          <section className="cargo-section" key={group.cargo}>
            <h4>{group.cargo}</h4>
            <div className="members-grid">
              {group.membros.map((member) => (
                <article key={member.id} className={`member-card ${showCircleMemberPhotos ? "" : "compact"}`.trim()}>
                  {showCircleMemberPhotos && (
                    <div className="member-media">
                      {member.foto_url ? (
                        <img className="member-photo" src={mediaUrl(member.foto_url)} alt={member.nome_principal} />
                      ) : (
                        <div className="member-photo member-photo-empty">Sem foto</div>
                      )}
                      <label className="file-field member-file-field">
                        Foto
                        <input
                          type="file"
                          accept="image/*"
                          disabled={!canManageMembers}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (!file) return;
                            actions.onMemberPhotoFileChange(encounterId, teamId, member, file);
                          }}
                        />
                      </label>
                    </div>
                  )}

                  <div className="member-main">
                    <strong>
                      {member.nome_principal}
                      {member.nome_secundario ? ` & ${member.nome_secundario}` : ""}
                    </strong>
                    <span>Contato 1: {member.telefone_principal || "-"}</span>
                    <span>Contato 2: {member.telefone_secundario || "-"}</span>
                    <span>Paróquia: {member.paroquia || "-"}</span>
                  </div>

                  <div className="actions-row member-actions">
                    <button
                      type="button"
                      className="ghost"
                      disabled={!canManageMembers}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        actions.handleEditMember(member);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="danger-btn"
                      disabled={!canManageMembers}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        actions.handleDeleteMember(encounterId, teamId, member.id);
                      }}
                    >
                      Excluir
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
        {groupedMembers.length === 0 && <p className="muted">Sem membros cadastrados nesta equipe.</p>}
      </div>
    </section>
  );
}

function AssetsScreen({ shell, actions }: { shell: any; actions: any }) {
  const params = useParams();
  const encounterId = parseNumericParam(params.encounterId);
  const canManageAssets = shell.can(PERMISSIONS.ASSETS_MANAGE);

  useEffect(() => {
    if (encounterId) actions.refreshAssets(encounterId);
  }, [encounterId]);

  if (!encounterId) return <Navigate to="/encounters" replace />;

  return (
    <section className="page-stack">
      <div className="panel">
        <div className="panel-head">
          <h2>Capas e Artes A4</h2>
          <Link className="as-btn" to={`/encounters/${encounterId}`}>Voltar</Link>
        </div>
        <form className="grid-form two" onSubmit={(event) => actions.handleSaveAsset(encounterId, event)}>
          <label>
            Tipo
            <select
              disabled={!canManageAssets}
              value={shell.assetForm.tipo}
              onChange={(event) => actions.setAssetForm((prev: any) => ({ ...prev, tipo: event.target.value }))}
            >
              {ASSET_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ordem
            <input
              type="number"
              disabled={!canManageAssets}
              value={shell.assetForm.ordem}
              onChange={(event) =>
                actions.setAssetForm((prev: any) => ({ ...prev, ordem: Number(event.target.value || "0") }))
              }
            />
          </label>
          <label>
            Título
            <input
              disabled={!canManageAssets}
              value={shell.assetForm.titulo}
              onChange={(event) => actions.setAssetForm((prev: any) => ({ ...prev, titulo: event.target.value }))}
            />
          </label>
          <label className="file-field">
            Arquivo (A4 com crop)
            <input
              required
              type="file"
              accept="image/*"
              disabled={!canManageAssets}
              onChange={(event) =>
                actions.setAssetForm((prev: any) => ({ ...prev, file: event.target.files?.[0] || null }))
              }
            />
          </label>
          <button type="submit" disabled={!canManageAssets}>Recortar e enviar arte</button>
        </form>
      </div>

      <div className="panel">
        <h2>Artes cadastradas</h2>
        <div className="assets-grid">
          {shell.assets.map((asset: Asset) => (
            <article key={asset.id} className="asset-card">
              <img src={mediaUrl(asset.image_url)} alt={asset.titulo || asset.tipo} />
              <div>
                <strong>{asset.titulo || asset.tipo}</strong>
                <p>{asset.tipo} | ordem {asset.ordem}</p>
              </div>
              <button className="danger-btn" disabled={!canManageAssets} onClick={() => actions.handleDeleteAsset(encounterId, asset.id)}>
                Excluir
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default App;


























































