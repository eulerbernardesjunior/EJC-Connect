import { ChangeEvent, FormEvent, SyntheticEvent, useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom";
import ReactCrop, { Crop, PercentCrop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { HELP_TOPICS, HelpTopicKey, resolveHelpTopic } from "./modules/help/topics";
import { OnboardingGuide } from "./modules/onboarding/OnboardingGuide";
import { DidacticNotice } from "./modules/ui/DidacticNotice";
import { InteractiveCard } from "./modules/ui/InteractiveCard";

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

type PdfPhotoShape = "SQUARE" | "ROUNDED" | "CIRCLE" | "PASSPORT_3X4";
type PdfTableModel = "COMPACT" | "STANDARD" | "COMFORTABLE";
type PdfLeadershipStyle = "SOFT" | "BORDERED" | "MINIMAL";

type PdfVisualConfig = {
  foto_equipe_largura_mm: number;
  foto_equipe_altura_mm: number;
  foto_lider_largura_mm: number;
  foto_lider_altura_mm: number;
  foto_participante_largura_px: number;
  foto_participante_altura_px: number;
  // Compatibilidade com versões antigas do backend/template.
  formato_foto_circulo: PdfPhotoShape;
  formato_foto_lideranca_circulo: PdfPhotoShape;
  formato_foto_participante_circulo: PdfPhotoShape;
  modelo_tabela_equipe: PdfTableModel;
  fonte_base: string;
  fonte_slogan: string;
  margem_topo_mm: number;
  margem_direita_mm: number;
  margem_inferior_mm: number;
  margem_esquerda_mm: number;
  rodape_ativo: boolean;
  rodape_altura_mm: number;
  rodape_cor_fundo: string;
  rodape_cor_texto: string;
  rodape_maiusculo: boolean;
  marca_dagua_ativa: boolean;
  marca_dagua_texto: string;
  marca_dagua_opacidade: number;
  marca_dagua_tamanho_pt: number;
  marca_dagua_cor: string;
  caixa_lideranca_estilo: PdfLeadershipStyle;
  caixa_lideranca_cor_fundo: string;
  caixa_lideranca_cor_borda: string;
  caixa_lideranca_raio_px: number;
};

type PdfVisualTemplate = {
  id: string;
  nome: string;
  config: PdfVisualConfig;
};

type PdfTemplateHistoryAction = "SAVE" | "PUBLISH" | "ROLLBACK" | "CLONE";

type PdfTemplateHistoryEntry = {
  id: string;
  template_id: string;
  template_nome: string;
  action: PdfTemplateHistoryAction;
  created_at: string;
  snapshot: PdfVisualConfig;
};

type PdfVisualTemplatesSettings = {
  active_template_id: string;
  published_template_id: string;
  templates: PdfVisualTemplate[];
  history: PdfTemplateHistoryEntry[];
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

type TeamScope = {
  team_id: number;
  encounter_id: number;
  team_nome: string;
  team_tipo: TeamType;
  encounter_nome: string;
  can_view: boolean;
  can_manage: boolean;
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
  teamScopes: TeamScope[];
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

type UserMetaResponse = {
  roles: RoleType[];
  permissionsCatalog: string[];
  teamScopeCatalog: TeamScope[];
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

const PERMISSION_UI_TEXT: Record<string, { label: string; description: string }> = {
  [PERMISSIONS.DASHBOARD_VIEW]: {
    label: "Dashboard",
    description: "Visualizar indicadores gerais do encontro."
  },
  [PERMISSIONS.ENCOUNTERS_VIEW]: {
    label: "Ver encontros",
    description: "Acessar a lista e a visão geral de encontros."
  },
  [PERMISSIONS.ENCOUNTERS_MANAGE]: {
    label: "Gerenciar encontros",
    description: "Criar, editar e excluir encontros."
  },
  [PERMISSIONS.TEAMS_VIEW]: {
    label: "Ver equipes e círculos",
    description: "Acessar listagens e detalhes de equipes/círculos."
  },
  [PERMISSIONS.TEAMS_MANAGE]: {
    label: "Gerenciar equipes e círculos",
    description: "Criar, editar, ordenar e excluir equipes/círculos."
  },
  [PERMISSIONS.MEMBERS_VIEW]: {
    label: "Ver membros",
    description: "Visualizar membros agrupados por cargo."
  },
  [PERMISSIONS.MEMBERS_MANAGE]: {
    label: "Gerenciar membros",
    description: "Criar, editar, excluir e enviar fotos de membros."
  },
  [PERMISSIONS.IMPORTS_RUN]: {
    label: "Importar membros (arquivo)",
    description: "Executar importação XLSX/CSV para equipes e círculos."
  },
  [PERMISSIONS.CIRCLES_IMPORT]: {
    label: "Importação geral de círculos",
    description: "Importar todos os círculos de um encontro em lote."
  },
  [PERMISSIONS.PDF_GENERATE]: {
    label: "Gerar PDF (Quadrante)",
    description: "Gerar prévia e quadrante completo em PDF."
  },
  [PERMISSIONS.ASSETS_VIEW]: {
    label: "Ver capas e artes",
    description: "Visualizar capas, separadores e cartazes."
  },
  [PERMISSIONS.ASSETS_MANAGE]: {
    label: "Gerenciar capas e artes",
    description: "Enviar, ordenar e excluir artes A4."
  },
  [PERMISSIONS.USERS_VIEW]: {
    label: "Ver usuários",
    description: "Visualizar usuários e permissões."
  },
  [PERMISSIONS.USERS_MANAGE]: {
    label: "Gerenciar usuários",
    description: "Criar, editar, excluir usuários e permissões."
  }
};

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

const DEFAULT_PDF_VISUAL_CONFIG: PdfVisualConfig = {
  foto_equipe_largura_mm: 150,
  foto_equipe_altura_mm: 100,
  foto_lider_largura_mm: 18,
  foto_lider_altura_mm: 18,
  foto_participante_largura_px: 30,
  foto_participante_altura_px: 30,
  formato_foto_circulo: "ROUNDED",
  formato_foto_lideranca_circulo: "ROUNDED",
  formato_foto_participante_circulo: "ROUNDED",
  modelo_tabela_equipe: "STANDARD",
  fonte_base: "Montserrat, Arial, sans-serif",
  fonte_slogan: "Caveat, cursive",
  margem_topo_mm: 8,
  margem_direita_mm: 8,
  margem_inferior_mm: 35,
  margem_esquerda_mm: 8,
  rodape_ativo: true,
  rodape_altura_mm: 12,
  rodape_cor_fundo: "#333333",
  rodape_cor_texto: "#FFFFFF",
  rodape_maiusculo: true,
  marca_dagua_ativa: false,
  marca_dagua_texto: "",
  marca_dagua_opacidade: 0.08,
  marca_dagua_tamanho_pt: 44,
  marca_dagua_cor: "#7A1F3D",
  caixa_lideranca_estilo: "SOFT",
  caixa_lideranca_cor_fundo: "#F9F9F9",
  caixa_lideranca_cor_borda: "#DDDDDD",
  caixa_lideranca_raio_px: 8
};

const EMPTY_PDF_VISUAL_TEMPLATES_SETTINGS: PdfVisualTemplatesSettings = {
  active_template_id: "default",
  published_template_id: "default",
  templates: [
    {
      id: "default",
      nome: "Padrão do sistema",
      config: { ...DEFAULT_PDF_VISUAL_CONFIG }
    }
  ],
  history: []
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

function toInputDateString(dateRaw?: string | null) {
  if (!dateRaw) return "";
  const raw = String(dateRaw).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function displayEncounterName(encounter: Encounter) {
  return encounter.nome || encounter.tema || `Encontro #${encounter.id}`;
}

function parseError(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeHexColor(value: unknown, fallback: string) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return /^#[0-9A-F]{6}$/.test(normalized) ? normalized : fallback;
}

function normalizeTemplateId(value: unknown, fallback: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function normalizePdfVisualConfigClient(raw?: Partial<PdfVisualConfig> | null): PdfVisualConfig {
  const input = raw || {};
  const photoShapeCandidates: PdfPhotoShape[] = ["SQUARE", "ROUNDED", "CIRCLE", "PASSPORT_3X4"];
  const tableModelCandidates: PdfTableModel[] = ["COMPACT", "STANDARD", "COMFORTABLE"];
  const leadershipCandidates: PdfLeadershipStyle[] = ["SOFT", "BORDERED", "MINIMAL"];
  const legacyCircleShape = photoShapeCandidates.includes(input.formato_foto_circulo as PdfPhotoShape)
    ? (input.formato_foto_circulo as PdfPhotoShape)
    : DEFAULT_PDF_VISUAL_CONFIG.formato_foto_circulo;
  const leadershipCircleShape = photoShapeCandidates.includes(input.formato_foto_lideranca_circulo as PdfPhotoShape)
    ? (input.formato_foto_lideranca_circulo as PdfPhotoShape)
    : legacyCircleShape;
  const participantCircleShape = photoShapeCandidates.includes(input.formato_foto_participante_circulo as PdfPhotoShape)
    ? (input.formato_foto_participante_circulo as PdfPhotoShape)
    : legacyCircleShape;
  const tableModel = tableModelCandidates.includes(input.modelo_tabela_equipe as PdfTableModel)
    ? (input.modelo_tabela_equipe as PdfTableModel)
    : DEFAULT_PDF_VISUAL_CONFIG.modelo_tabela_equipe;
  const leadershipStyle = leadershipCandidates.includes(input.caixa_lideranca_estilo as PdfLeadershipStyle)
    ? (input.caixa_lideranca_estilo as PdfLeadershipStyle)
    : DEFAULT_PDF_VISUAL_CONFIG.caixa_lideranca_estilo;

  return {
    foto_equipe_largura_mm: clampNumber(
      input.foto_equipe_largura_mm,
      80,
      190,
      DEFAULT_PDF_VISUAL_CONFIG.foto_equipe_largura_mm
    ),
    foto_equipe_altura_mm: clampNumber(
      input.foto_equipe_altura_mm,
      50,
      250,
      DEFAULT_PDF_VISUAL_CONFIG.foto_equipe_altura_mm
    ),
    foto_lider_largura_mm: clampNumber(
      input.foto_lider_largura_mm,
      10,
      40,
      DEFAULT_PDF_VISUAL_CONFIG.foto_lider_largura_mm
    ),
    foto_lider_altura_mm: clampNumber(
      input.foto_lider_altura_mm,
      10,
      50,
      DEFAULT_PDF_VISUAL_CONFIG.foto_lider_altura_mm
    ),
    foto_participante_largura_px: clampNumber(
      input.foto_participante_largura_px,
      18,
      80,
      DEFAULT_PDF_VISUAL_CONFIG.foto_participante_largura_px
    ),
    foto_participante_altura_px: clampNumber(
      input.foto_participante_altura_px,
      18,
      100,
      DEFAULT_PDF_VISUAL_CONFIG.foto_participante_altura_px
    ),
    formato_foto_circulo: participantCircleShape,
    formato_foto_lideranca_circulo: leadershipCircleShape,
    formato_foto_participante_circulo: participantCircleShape,
    modelo_tabela_equipe: tableModel,
    fonte_base: String(input.fonte_base || DEFAULT_PDF_VISUAL_CONFIG.fonte_base).slice(0, 120),
    fonte_slogan: String(input.fonte_slogan || DEFAULT_PDF_VISUAL_CONFIG.fonte_slogan).slice(0, 120),
    margem_topo_mm: clampNumber(input.margem_topo_mm, 0, 25, DEFAULT_PDF_VISUAL_CONFIG.margem_topo_mm),
    margem_direita_mm: clampNumber(input.margem_direita_mm, 0, 25, DEFAULT_PDF_VISUAL_CONFIG.margem_direita_mm),
    margem_inferior_mm: clampNumber(input.margem_inferior_mm, 8, 45, DEFAULT_PDF_VISUAL_CONFIG.margem_inferior_mm),
    margem_esquerda_mm: clampNumber(input.margem_esquerda_mm, 0, 25, DEFAULT_PDF_VISUAL_CONFIG.margem_esquerda_mm),
    rodape_ativo: Boolean(input.rodape_ativo),
    rodape_altura_mm: clampNumber(input.rodape_altura_mm, 8, 22, DEFAULT_PDF_VISUAL_CONFIG.rodape_altura_mm),
    rodape_cor_fundo: normalizeHexColor(input.rodape_cor_fundo, DEFAULT_PDF_VISUAL_CONFIG.rodape_cor_fundo),
    rodape_cor_texto: normalizeHexColor(input.rodape_cor_texto, DEFAULT_PDF_VISUAL_CONFIG.rodape_cor_texto),
    rodape_maiusculo: input.rodape_maiusculo !== false,
    marca_dagua_ativa: Boolean(input.marca_dagua_ativa),
    marca_dagua_texto: String(input.marca_dagua_texto || "").slice(0, 80),
    marca_dagua_opacidade: clampNumber(
      input.marca_dagua_opacidade,
      0.02,
      0.35,
      DEFAULT_PDF_VISUAL_CONFIG.marca_dagua_opacidade
    ),
    marca_dagua_tamanho_pt: clampNumber(
      input.marca_dagua_tamanho_pt,
      18,
      120,
      DEFAULT_PDF_VISUAL_CONFIG.marca_dagua_tamanho_pt
    ),
    marca_dagua_cor: normalizeHexColor(input.marca_dagua_cor, DEFAULT_PDF_VISUAL_CONFIG.marca_dagua_cor),
    caixa_lideranca_estilo: leadershipStyle,
    caixa_lideranca_cor_fundo: normalizeHexColor(
      input.caixa_lideranca_cor_fundo,
      DEFAULT_PDF_VISUAL_CONFIG.caixa_lideranca_cor_fundo
    ),
    caixa_lideranca_cor_borda: normalizeHexColor(
      input.caixa_lideranca_cor_borda,
      DEFAULT_PDF_VISUAL_CONFIG.caixa_lideranca_cor_borda
    ),
    caixa_lideranca_raio_px: clampNumber(
      input.caixa_lideranca_raio_px,
      0,
      40,
      DEFAULT_PDF_VISUAL_CONFIG.caixa_lideranca_raio_px
    )
  };
}

function normalizePdfVisualTemplatesSettingsClient(raw?: Partial<PdfVisualTemplatesSettings> | null): PdfVisualTemplatesSettings {
  const source = raw || {};
  const templatesRaw = Array.isArray(source.templates) ? source.templates : [];
  const templates =
    templatesRaw.length > 0
      ? templatesRaw.map((template, index) => ({
          id: normalizeTemplateId(template.id, index === 0 ? "default" : `template-${index + 1}`),
          nome: String(template.nome || "").trim() || `Template ${index + 1}`,
          config: normalizePdfVisualConfigClient(template.config)
        }))
      : [...EMPTY_PDF_VISUAL_TEMPLATES_SETTINGS.templates];

  const active = templates.find((template) => template.id === source.active_template_id) || templates[0];
  const published = templates.find((template) => template.id === source.published_template_id) || active;
  const historyRaw = Array.isArray(source.history) ? source.history : [];
  const history = historyRaw
    .slice(0, 50)
    .map((entry, index) => {
      const template = templates.find((item) => item.id === entry.template_id) || active;
      const actionRaw = String(entry.action || "").toUpperCase();
      const action: PdfTemplateHistoryAction =
        actionRaw === "PUBLISH" || actionRaw === "ROLLBACK" || actionRaw === "CLONE" ? actionRaw : "SAVE";
      const createdAtRaw = String(entry.created_at || "").trim();
      const created_at = createdAtRaw || new Date().toISOString();
      return {
        id: String(entry.id || `history-${index + 1}`),
        template_id: template.id,
        template_nome: String(entry.template_nome || template.nome || "Template").trim() || "Template",
        action,
        created_at,
        snapshot: normalizePdfVisualConfigClient(entry.snapshot || template.config)
      };
    })
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return {
    active_template_id: active.id,
    published_template_id: published.id,
    templates,
    history
  };
}

function normalizeUser(user: AppUser): AppUser {
  return {
    ...user,
    teamScopes: Array.isArray(user?.teamScopes) ? user.teamScopes : []
  };
}

function permissionUiText(permissionKey: string) {
  if (PERMISSION_UI_TEXT[permissionKey]) {
    return PERMISSION_UI_TEXT[permissionKey];
  }

  const [scopeRaw, actionRaw] = permissionKey.split(".");
  const scope = String(scopeRaw || "").toLowerCase();
  const action = String(actionRaw || "").toLowerCase();

  const scopeLabelMap: Record<string, string> = {
    dashboard: "Dashboard",
    encounters: "Encontros",
    teams: "Equipes e círculos",
    members: "Membros",
    imports: "Importação",
    circles: "Círculos",
    pdf: "PDF",
    assets: "Capas e artes",
    users: "Usuários",
    settings: "Configurações"
  };

  const actionLabelMap: Record<string, string> = {
    view: "visualizar",
    manage: "gerenciar",
    run: "executar",
    generate: "gerar",
    import: "importar"
  };

  const scopeLabel = scopeLabelMap[scope] || scope || "Módulo";
  const actionLabel = actionLabelMap[action] || action || "acessar";

  return {
    label: `${scopeLabel} - ${actionLabel}`,
    description: "Permissão personalizada."
  };
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
  const location = useLocation();
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("ejc_theme");
    return saved === "dark" ? "dark" : "light";
  });
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [permissionsCatalog, setPermissionsCatalog] = useState<string[]>(Object.values(PERMISSIONS));
  const [roleCatalog, setRoleCatalog] = useState<RoleType[]>(["ADMIN", "EDITOR", "VISUALIZADOR"]);
  const [teamScopeCatalog, setTeamScopeCatalog] = useState<TeamScope[]>([]);
  const [userScopeEncounterFilter, setUserScopeEncounterFilter] = useState<number | "ALL">("ALL");
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
  const [encounterEditingId, setEncounterEditingId] = useState<number | null>(null);

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
    permissions: defaultPermissionsForRole("EDITOR"),
    teamScopes: [] as TeamScope[]
  });
  const [teamForm, setTeamForm] = useState<TeamFormState>(EMPTY_TEAM_FORM);
  const [memberForm, setMemberForm] = useState<MemberFormState>(EMPTY_MEMBER_FORM);
  const [assetForm, setAssetForm] = useState<AssetFormState>({ ...EMPTY_ASSET_FORM });
  const [pdfTitleSettings, setPdfTitleSettings] = useState<PdfTitleSettings>({ ...EMPTY_PDF_TITLE_SETTINGS });
  const [pdfVisualTemplatesSettings, setPdfVisualTemplatesSettings] = useState<PdfVisualTemplatesSettings>({
    ...EMPTY_PDF_VISUAL_TEMPLATES_SETTINGS,
    templates: EMPTY_PDF_VISUAL_TEMPLATES_SETTINGS.templates.map((template) => ({
      ...template,
      config: { ...template.config }
    }))
  });
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
        setCurrentUser(normalizeUser(response.user));
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
    refreshPdfVisualTemplatesSettings();
    if (can(PERMISSIONS.USERS_VIEW)) {
      refreshAuditLogs({ ...DEFAULT_AUDIT_FILTERS }, 0);
    }
  }, [currentUser]);



  function success(msg: string) {
    setMessage(msg);
    setError("");
  }

  function resetUserForm(role: RoleType = "EDITOR") {
    setUserScopeEncounterFilter("ALL");
    setUserForm({
      id: 0,
      nome: "",
      email: "",
      senha: "",
      permissao: role,
      ativo: true,
      permissions: defaultPermissionsForRole(role),
      teamScopes: []
    });
  }

  function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("ejc_token");
    setToken("");
    setCurrentUser(null);
    setPdfTitleSettings({ ...EMPTY_PDF_TITLE_SETTINGS });
    setPdfVisualTemplatesSettings({
      ...EMPTY_PDF_VISUAL_TEMPLATES_SETTINGS,
      templates: EMPTY_PDF_VISUAL_TEMPLATES_SETTINGS.templates.map((template) => ({
        ...template,
        config: { ...template.config }
      }))
    });
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
      setCurrentUser(normalizeUser(response.user));
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
      setUsers(data.map((user) => normalizeUser(user)));
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function refreshUsersMeta() {
    try {
      const data = await authRequest<UserMetaResponse>("/api/users/meta");
      const allowedRoles: RoleType[] = ["ADMIN", "EDITOR", "VISUALIZADOR"];
      const sanitizedRoles = (Array.isArray(data.roles) ? data.roles : []).filter((role): role is RoleType =>
        allowedRoles.includes(role as RoleType)
      );
      setRoleCatalog(sanitizedRoles.length > 0 ? sanitizedRoles : allowedRoles);
      if (Array.isArray(data.permissionsCatalog) && data.permissionsCatalog.length > 0) {
        setPermissionsCatalog(data.permissionsCatalog);
      }
      setTeamScopeCatalog(Array.isArray(data.teamScopeCatalog) ? data.teamScopeCatalog : []);
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

  async function refreshPdfVisualTemplatesSettings() {
    try {
      const data = await authRequest<PdfVisualTemplatesSettings>("/api/settings/pdf-templates");
      setPdfVisualTemplatesSettings(normalizePdfVisualTemplatesSettingsClient(data));
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
      const editing = encounterEditingId && encounterEditingId > 0;
      await authRequest(editing ? `/api/encounters/${encounterEditingId}` : "/api/encounters", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(encounterForm)
      });
      setEncounterEditingId(null);
      setEncounterForm({ nome: "", dataInicio: "", dataFim: "" });
      await refreshEncounters();
      await refreshDashboard();
      success(editing ? "Encontro atualizado." : "Encontro cadastrado.");
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function handleDeleteEncounter(id: number) {
    if (!window.confirm("Excluir este encontro?")) return;
    try {
      await authRequest(`/api/encounters/${id}`, { method: "DELETE" });
      if (encounterEditingId === id) {
        setEncounterEditingId(null);
        setEncounterForm({ nome: "", dataInicio: "", dataFim: "" });
      }
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
      permissions: userForm.permissions,
      teamScopes: (userForm.teamScopes || []).map((scope) => ({
        teamId: scope.team_id,
        canView: scope.can_view,
        canManage: scope.can_manage
      }))
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
      setCurrentUser(normalizeUser(me.user));
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
          : defaultPermissionsForRole(user.permissao),
      teamScopes: (user.teamScopes || []).map((scope) => ({
        ...scope,
        can_view: Boolean(scope.can_view || scope.can_manage),
        can_manage: Boolean(scope.can_manage)
      }))
    });
    setUserScopeEncounterFilter("ALL");
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
      setCurrentUser(normalizeUser(me.user));
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

  function getActivePdfTemplate(settings = pdfVisualTemplatesSettings) {
    return (
      settings.templates.find((template) => template.id === settings.active_template_id) || settings.templates[0]
    );
  }

  function createTemplateHistoryEntry(
    action: PdfTemplateHistoryAction,
    template: PdfVisualTemplate,
    snapshot?: PdfVisualConfig
  ): PdfTemplateHistoryEntry {
    return {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      template_id: template.id,
      template_nome: template.nome,
      action,
      created_at: new Date().toISOString(),
      snapshot: normalizePdfVisualConfigClient(snapshot || template.config)
    };
  }

  function pushTemplateHistory(
    settings: PdfVisualTemplatesSettings,
    entry: PdfTemplateHistoryEntry
  ): PdfVisualTemplatesSettings {
    return {
      ...settings,
      history: [entry, ...(settings.history || [])].slice(0, 50)
    };
  }

  function setActivePdfVisualTemplate(templateId: string) {
    setPdfVisualTemplatesSettings((prev) => {
      const next = normalizePdfVisualTemplatesSettingsClient(prev);
      if (!next.templates.some((template) => template.id === templateId)) {
        return next;
      }
      return {
        ...next,
        active_template_id: templateId
      };
    });
  }

  function updateActivePdfVisualConfig(patch: Partial<PdfVisualConfig>) {
    setPdfVisualTemplatesSettings((prev) => {
      const next = normalizePdfVisualTemplatesSettingsClient(prev);
      const index = next.templates.findIndex((template) => template.id === next.active_template_id);
      if (index < 0) return next;
      const updatedTemplate: PdfVisualTemplate = {
        ...next.templates[index],
        config: normalizePdfVisualConfigClient({
          ...next.templates[index].config,
          ...patch
        })
      };
      const templates = [...next.templates];
      templates[index] = updatedTemplate;
      return {
        ...next,
        templates
      };
    });
  }

  function renameActivePdfTemplate(name: string) {
    setPdfVisualTemplatesSettings((prev) => {
      const next = normalizePdfVisualTemplatesSettingsClient(prev);
      const index = next.templates.findIndex((template) => template.id === next.active_template_id);
      if (index < 0) return next;
      const templates = [...next.templates];
      templates[index] = {
        ...templates[index],
        nome: name.slice(0, 60)
      };
      return { ...next, templates };
    });
  }

  function createPdfVisualTemplate() {
    setPdfVisualTemplatesSettings((prev) => {
      const next = normalizePdfVisualTemplatesSettingsClient(prev);
      const activeTemplate = getActivePdfTemplate(next);
      const baseId = normalizeTemplateId(
        `${activeTemplate?.id || "template"}-${next.templates.length + 1}`,
        `template-${next.templates.length + 1}`
      );
      let id = baseId;
      let suffix = 2;
      while (next.templates.some((template) => template.id === id)) {
        id = `${baseId}-${suffix}`;
        suffix += 1;
      }
      const templateName = `Template ${next.templates.length + 1}`;
      const createdTemplate: PdfVisualTemplate = {
        id,
        nome: templateName,
        config: normalizePdfVisualConfigClient(activeTemplate?.config || DEFAULT_PDF_VISUAL_CONFIG)
      };
      return pushTemplateHistory(
        {
          ...next,
          active_template_id: id,
          templates: [...next.templates, createdTemplate]
        },
        createTemplateHistoryEntry("CLONE", createdTemplate)
      );
    });
  }

  function cloneActivePdfTemplate() {
    createPdfVisualTemplate();
  }

  function publishActivePdfTemplate() {
    setPdfVisualTemplatesSettings((prev) => {
      const next = normalizePdfVisualTemplatesSettingsClient(prev);
      const activeTemplate = getActivePdfTemplate(next);
      if (!activeTemplate) return next;
      return pushTemplateHistory(
        {
          ...next,
          published_template_id: activeTemplate.id
        },
        createTemplateHistoryEntry("PUBLISH", activeTemplate)
      );
    });
  }

  function rollbackTemplateByHistory(historyId: string) {
    setPdfVisualTemplatesSettings((prev) => {
      const next = normalizePdfVisualTemplatesSettingsClient(prev);
      const targetHistory = (next.history || []).find((entry) => entry.id === historyId);
      if (!targetHistory) return next;

      const templateIndex = next.templates.findIndex((template) => template.id === targetHistory.template_id);
      if (templateIndex < 0) return next;

      const templates = [...next.templates];
      const template = templates[templateIndex];
      const restoredTemplate: PdfVisualTemplate = {
        ...template,
        config: normalizePdfVisualConfigClient(targetHistory.snapshot)
      };
      templates[templateIndex] = restoredTemplate;

      return pushTemplateHistory(
        {
          ...next,
          active_template_id: restoredTemplate.id,
          templates
        },
        createTemplateHistoryEntry("ROLLBACK", restoredTemplate, targetHistory.snapshot)
      );
    });
  }

  function deleteActivePdfVisualTemplate() {
    setPdfVisualTemplatesSettings((prev) => {
      const next = normalizePdfVisualTemplatesSettingsClient(prev);
      if (next.templates.length <= 1) return next;
      const filtered = next.templates.filter((template) => template.id !== next.active_template_id);
      const nextActive = filtered[0].id;
      const nextPublished =
        filtered.find((template) => template.id === next.published_template_id)?.id || nextActive;
      return {
        ...next,
        active_template_id: nextActive,
        published_template_id: nextPublished,
        templates: filtered
      };
    });
  }

  async function handleSavePdfVisualTemplates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const payload = normalizePdfVisualTemplatesSettingsClient(
        pushTemplateHistory(
          normalizePdfVisualTemplatesSettingsClient(pdfVisualTemplatesSettings),
          createTemplateHistoryEntry("SAVE", getActivePdfTemplate(pdfVisualTemplatesSettings))
        )
      );
      const data = await authRequest<PdfVisualTemplatesSettings>("/api/settings/pdf-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setPdfVisualTemplatesSettings(normalizePdfVisualTemplatesSettingsClient(data));
      success("Template visual do PDF salvo.");
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
    encounterEditingId,
    encounterForm,
    userForm,
    teamForm,
    memberForm,
    assetForm,
    pdfTitleSettings,
    pdfVisualTemplatesSettings,
    activePdfVisualTemplate: getActivePdfTemplate(),
    importFile,
    circleImportFile,
    crop,
    cropUploading,
    currentUser,
    permissionsCatalog,
    roleCatalog,
    teamScopeCatalog,
    userScopeEncounterFilter,
    can
  };

  const actions = {
    setEncounterForm,
    setEncounterEditingId,
    setUserForm,
    setTeamForm,
    setMemberForm,
    setAssetForm,
    setPdfTitleSettings,
    setPdfVisualTemplatesSettings,
    setAuditFilters,
    setUserScopeEncounterFilter,
    setImportFile,
    setCircleImportFile,
    setCrop,
    refreshEncounters,
    refreshDashboard,
    refreshUsers,
    refreshUsersMeta,
    refreshPdfTitleSettings,
    refreshPdfVisualTemplatesSettings,
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
    handleSavePdfVisualTemplates,
    setActivePdfVisualTemplate,
    updateActivePdfVisualConfig,
    renameActivePdfTemplate,
    createPdfVisualTemplate,
    cloneActivePdfTemplate,
    deleteActivePdfVisualTemplate,
    publishActivePdfTemplate,
    rollbackTemplateByHistory,
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
    setUserTeamScope: (scopeTeam: TeamScope, patch: { can_view?: boolean; can_manage?: boolean }) =>
      setUserForm((prev) => {
        const existing = (prev.teamScopes || []).find((scope) => scope.team_id === scopeTeam.team_id);
        const canManage = patch.can_manage ?? existing?.can_manage ?? false;
        const canViewBase = patch.can_view ?? existing?.can_view ?? false;
        const canView = canViewBase || canManage;

        const withoutCurrent = (prev.teamScopes || []).filter((scope) => scope.team_id !== scopeTeam.team_id);
        if (!canView && !canManage) {
          return {
            ...prev,
            teamScopes: withoutCurrent
          };
        }

        const nextScopes = [
          ...withoutCurrent,
          {
            team_id: scopeTeam.team_id,
            encounter_id: scopeTeam.encounter_id,
            team_nome: scopeTeam.team_nome,
            team_tipo: scopeTeam.team_tipo,
            encounter_nome: scopeTeam.encounter_nome,
            can_view: canView,
            can_manage: canManage
          }
        ].sort((a, b) => {
          const encounterCmp = a.encounter_nome.localeCompare(b.encounter_nome, "pt-BR");
          if (encounterCmp !== 0) return encounterCmp;
          return a.team_nome.localeCompare(b.team_nome, "pt-BR");
        });

        return {
          ...prev,
          teamScopes: nextScopes
        };
      }),
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
  const helpTopic = useMemo(() => resolveHelpTopic(location.pathname), [location.pathname]);

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
        <div className="help-anchor">
          <ContextHelpButton topicKey={helpTopic} />
        </div>
        {(message || error) && <div className={`notice ${error ? "error" : "ok"}`}>{error || message}</div>}
        <DidacticNotice message={message} error={error} />

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

function ContextHelpButton({ topicKey }: { topicKey: HelpTopicKey }) {
  const [open, setOpen] = useState(false);
  const topic = HELP_TOPICS[topicKey] || HELP_TOPICS.default;

  useEffect(() => {
    setOpen(false);
  }, [topicKey]);

  return (
    <>
      <button
        type="button"
        className="help-trigger"
        aria-label="Ajuda desta tela"
        title="Ajuda desta tela"
        onClick={() => setOpen(true)}
      >
        ?
      </button>
      {open && (
        <div className="help-backdrop" onClick={() => setOpen(false)}>
          <div className="help-modal" onClick={(event) => event.stopPropagation()}>
            <div className="help-head">
              <h3>{topic.title}</h3>
              <button type="button" className="ghost" onClick={() => setOpen(false)}>
                Fechar
              </button>
            </div>
            <div className="help-body" dangerouslySetInnerHTML={{ __html: topic.html }} />
          </div>
        </div>
      )}
    </>
  );
}

function DashboardScreen({ shell, actions }: { shell: any; actions: any }) {
  const [filterEncounterId, setFilterEncounterId] = useState<number | null>(null);

  useEffect(() => {
    actions.refreshDashboard(filterEncounterId || undefined);
  }, [filterEncounterId]);

  return (
    <section className="page-stack">
      <OnboardingGuide />
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
  type SettingsTab = "USERS" | "PDF_TITLE" | "PDF_TEMPLATE" | "AUDIT";
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
    "SETTINGS_PDF_TEMPLATE",
    "EQUIPE_TITULO_ARTE",
    "MEMBRO_FOTO"
  ];

  const auditPageSize = Number(shell.auditFilters?.limit || 50);
  const auditCurrentPage = Math.floor(Number(shell.auditOffset || 0) / auditPageSize) + 1;
  const auditTotalPages = Math.max(1, Math.ceil(Number(shell.auditTotal || 0) / auditPageSize));
  const scopeEncounterOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const scope of shell.teamScopeCatalog as TeamScope[]) {
      if (!map.has(scope.encounter_id)) {
        map.set(scope.encounter_id, scope.encounter_nome);
      }
    }
    return [...map.entries()]
      .map(([encounter_id, encounter_nome]) => ({ encounter_id, encounter_nome }))
      .sort((a, b) => a.encounter_nome.localeCompare(b.encounter_nome, "pt-BR"));
  }, [shell.teamScopeCatalog]);

  const visibleScopeTeams = useMemo(() => {
    if (shell.userScopeEncounterFilter === "ALL") return shell.teamScopeCatalog as TeamScope[];
    return (shell.teamScopeCatalog as TeamScope[]).filter(
      (scope) => scope.encounter_id === shell.userScopeEncounterFilter
    );
  }, [shell.teamScopeCatalog, shell.userScopeEncounterFilter]);
  const activePdfTemplate = shell.activePdfVisualTemplate as PdfVisualTemplate | undefined;
  const activePdfConfig = activePdfTemplate?.config || DEFAULT_PDF_VISUAL_CONFIG;

  useEffect(() => {
    actions.refreshUsersMeta();
    actions.refreshUsers();
    actions.refreshPdfTitleSettings();
    actions.refreshPdfVisualTemplatesSettings();
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
            className={`settings-tab ${tab === "PDF_TEMPLATE" ? "active" : ""}`.trim()}
            onClick={() => setTab("PDF_TEMPLATE")}
            type="button"
          >
            Templates PDF
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
                  {shell.roleCatalog.map((role: RoleType) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
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
                    <label key={key} className="toggle permission-toggle permission-item">
                      <input
                        type="checkbox"
                        disabled={!canManageUsers}
                        checked={Boolean(shell.userForm.permissions?.[key])}
                        onChange={(event) => actions.toggleUserPermission(key, event.target.checked)}
                      />
                      <span className="permission-meta">
                        <strong>{permissionUiText(key).label}</strong>
                        <small>{permissionUiText(key).description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="permissions-box">
                <h3>Escopo por equipe (opcional)</h3>
                <p className="muted">
                  Se você marcar equipes abaixo, o usuário ficará restrito a essas equipes para visualizar/editar.
                  Sem marcações, o acesso continua global conforme as permissões de funcionalidade.
                </p>
                <label>
                  Filtrar equipes por encontro
                  <select
                    disabled={!canManageUsers}
                    value={shell.userScopeEncounterFilter === "ALL" ? "" : String(shell.userScopeEncounterFilter)}
                    onChange={(event) =>
                      actions.setUserScopeEncounterFilter(
                        event.target.value ? Number(event.target.value) : "ALL"
                      )
                    }
                  >
                    <option value="">Todos os encontros</option>
                    {scopeEncounterOptions.map((item) => (
                      <option key={item.encounter_id} value={item.encounter_id}>
                        {item.encounter_nome}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="team-scope-grid">
                  {visibleScopeTeams.map((scopeTeam: TeamScope) => {
                    const selected = (shell.userForm.teamScopes as TeamScope[]).find(
                      (scope) => scope.team_id === scopeTeam.team_id
                    );
                    const canView = Boolean(selected?.can_view || selected?.can_manage);
                    const canManage = Boolean(selected?.can_manage);
                    return (
                      <article key={scopeTeam.team_id} className="team-scope-card">
                        <div className="team-scope-head">
                          <strong>{scopeTeam.team_nome}</strong>
                          <small>
                            {scopeTeam.encounter_nome} | {scopeTeam.team_tipo === "CIRCULO" ? "Círculo" : "Equipe"}
                          </small>
                        </div>
                        <label className="toggle permission-toggle">
                          <input
                            type="checkbox"
                            disabled={!canManageUsers}
                            checked={canView}
                            onChange={(event) =>
                              actions.setUserTeamScope(scopeTeam, { can_view: event.target.checked })
                            }
                          />
                          Visualizar esta equipe
                        </label>
                        <label className="toggle permission-toggle">
                          <input
                            type="checkbox"
                            disabled={!canManageUsers}
                            checked={canManage}
                            onChange={(event) =>
                              actions.setUserTeamScope(scopeTeam, { can_manage: event.target.checked })
                            }
                          />
                          Gerenciar esta equipe
                        </label>
                      </article>
                    );
                  })}
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
                    <p className="muted">
                      Escopo por equipe: {Array.isArray(user.teamScopes) ? user.teamScopes.length : 0}
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

      {tab === "PDF_TEMPLATE" && (
        <div className="panel">
          <h2>Templates visuais do PDF</h2>
          <form className="grid-form" onSubmit={actions.handleSavePdfVisualTemplates}>
            <div className="pdf-template-head">
              <label>
                Template ativo
                <select
                  value={shell.pdfVisualTemplatesSettings.active_template_id}
                  disabled={!canManageUsers}
                  onChange={(event) => actions.setActivePdfVisualTemplate(event.target.value)}
                >
                  {shell.pdfVisualTemplatesSettings.templates.map((template: PdfVisualTemplate) => (
                    <option key={template.id} value={template.id}>
                      {template.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Nome do template
                <input
                  value={activePdfTemplate?.nome || ""}
                  disabled={!canManageUsers || !activePdfTemplate}
                  onChange={(event) => actions.renameActivePdfTemplate(event.target.value)}
                />
              </label>
              <div className="actions-row">
                <button type="button" className="ghost" disabled={!canManageUsers} onClick={() => actions.cloneActivePdfTemplate()}>
                  Clonar template ativo
                </button>
                <button type="button" disabled={!canManageUsers} onClick={() => actions.publishActivePdfTemplate()}>
                  Publicar template ativo
                </button>
                <button
                  type="button"
                  className="ghost"
                  disabled={!canManageUsers || shell.pdfVisualTemplatesSettings.templates.length <= 1}
                  onClick={() => actions.deleteActivePdfVisualTemplate()}
                >
                  Excluir template
                </button>
              </div>
              <div className="status-inline">
                <span className="chip">Rascunho ativo: {activePdfTemplate?.nome || "-"}</span>
                <span className="chip ok">
                  Publicado:{" "}
                  {shell.pdfVisualTemplatesSettings.templates.find(
                    (item: PdfVisualTemplate) => item.id === shell.pdfVisualTemplatesSettings.published_template_id
                  )?.nome || "-"}
                </span>
              </div>
            </div>

            <div className="pdf-template-grid">
              <fieldset className="pdf-template-group">
                <legend>Fotos</legend>
                <div className="grid-form three">
                  <label>
                    Foto equipe largura (mm)
                    <input
                      type="number"
                      min={80}
                      max={190}
                      value={activePdfConfig.foto_equipe_largura_mm}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({
                          foto_equipe_largura_mm: Number(event.target.value || 0)
                        })
                      }
                    />
                  </label>
                  <label>
                    Foto equipe altura (mm)
                    <input
                      type="number"
                      min={50}
                      max={250}
                      value={activePdfConfig.foto_equipe_altura_mm}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({
                          foto_equipe_altura_mm: Number(event.target.value || 0)
                        })
                      }
                    />
                  </label>
                  <label>
                    Formato da foto da liderança no círculo
                    <select
                      value={activePdfConfig.formato_foto_lideranca_circulo}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({
                          formato_foto_lideranca_circulo: event.target.value as PdfPhotoShape
                        })
                      }
                    >
                      <option value="SQUARE">Quadrado</option>
                      <option value="ROUNDED">Bordas arredondadas</option>
                      <option value="CIRCLE">Círculo</option>
                      <option value="PASSPORT_3X4">3x4</option>
                    </select>
                  </label>
                </div>
                <div className="grid-form three">
                  <label>
                    Formato da foto dos participantes no círculo
                    <select
                      value={activePdfConfig.formato_foto_participante_circulo}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({
                          formato_foto_circulo: event.target.value as PdfPhotoShape,
                          formato_foto_participante_circulo: event.target.value as PdfPhotoShape
                        })
                      }
                    >
                      <option value="SQUARE">Quadrado</option>
                      <option value="ROUNDED">Bordas arredondadas</option>
                      <option value="CIRCLE">Círculo</option>
                      <option value="PASSPORT_3X4">3x4</option>
                    </select>
                  </label>
                  <label>
                    Foto liderança largura (mm)
                    <input
                      type="number"
                      min={10}
                      max={40}
                      value={activePdfConfig.foto_lider_largura_mm}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({
                          foto_lider_largura_mm: Number(event.target.value || 0)
                        })
                      }
                    />
                  </label>
                  <label>
                    Foto liderança altura (mm)
                    <input
                      type="number"
                      min={10}
                      max={50}
                      value={activePdfConfig.foto_lider_altura_mm}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({
                          foto_lider_altura_mm: Number(event.target.value || 0)
                        })
                      }
                    />
                  </label>
                  <label>
                    Largura foto participante (px)
                    <input
                      type="number"
                      min={18}
                      max={80}
                      value={activePdfConfig.foto_participante_largura_px}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({
                          foto_participante_largura_px: Number(event.target.value || 0)
                        })
                      }
                    />
                  </label>
                </div>
                <div className="grid-form three">
                  <label>
                    Altura foto participante (px)
                    <input
                      type="number"
                      min={18}
                      max={100}
                      value={activePdfConfig.foto_participante_altura_px}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({
                          foto_participante_altura_px: Number(event.target.value || 0)
                        })
                      }
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="pdf-template-group">
                <legend>Tabela e fontes</legend>
                <div className="grid-form two">
                  <label>
                    Modelo de tabela das equipes
                    <select
                      value={activePdfConfig.modelo_tabela_equipe}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({
                          modelo_tabela_equipe: event.target.value as PdfTableModel
                        })
                      }
                    >
                      <option value="COMPACT">Compacta</option>
                      <option value="STANDARD">Padrão</option>
                      <option value="COMFORTABLE">Confortável</option>
                    </select>
                  </label>
                  <label>
                    Fonte base
                    <input
                      value={activePdfConfig.fonte_base}
                      disabled={!canManageUsers}
                      onChange={(event) => actions.updateActivePdfVisualConfig({ fonte_base: event.target.value })}
                    />
                  </label>
                  <label>
                    Fonte slogan
                    <input
                      value={activePdfConfig.fonte_slogan}
                      disabled={!canManageUsers}
                      onChange={(event) => actions.updateActivePdfVisualConfig({ fonte_slogan: event.target.value })}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="pdf-template-group">
                <legend>Margens e rodapé</legend>
                <div className="grid-form three">
                  <label>
                    Margem topo (mm)
                    <input
                      type="number"
                      min={0}
                      max={25}
                      value={activePdfConfig.margem_topo_mm}
                      disabled={!canManageUsers}
                      onChange={(event) => actions.updateActivePdfVisualConfig({ margem_topo_mm: Number(event.target.value || 0) })}
                    />
                  </label>
                  <label>
                    Margem direita (mm)
                    <input
                      type="number"
                      min={0}
                      max={25}
                      value={activePdfConfig.margem_direita_mm}
                      disabled={!canManageUsers}
                      onChange={(event) => actions.updateActivePdfVisualConfig({ margem_direita_mm: Number(event.target.value || 0) })}
                    />
                  </label>
                  <label>
                    Margem inferior (mm)
                    <input
                      type="number"
                      min={8}
                      max={45}
                      value={activePdfConfig.margem_inferior_mm}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({ margem_inferior_mm: Number(event.target.value || 0) })
                      }
                    />
                  </label>
                </div>
                <div className="grid-form three">
                  <label>
                    Margem esquerda (mm)
                    <input
                      type="number"
                      min={0}
                      max={25}
                      value={activePdfConfig.margem_esquerda_mm}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({ margem_esquerda_mm: Number(event.target.value || 0) })
                      }
                    />
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(activePdfConfig.rodape_ativo)}
                      disabled={!canManageUsers}
                      onChange={(event) => actions.updateActivePdfVisualConfig({ rodape_ativo: event.target.checked })}
                    />
                    Rodapé ativo
                  </label>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(activePdfConfig.rodape_maiusculo)}
                      disabled={!canManageUsers}
                      onChange={(event) => actions.updateActivePdfVisualConfig({ rodape_maiusculo: event.target.checked })}
                    />
                    Rodapé em maiúsculo
                  </label>
                </div>
                <div className="grid-form three">
                  <label>
                    Altura rodapé (mm)
                    <input
                      type="number"
                      min={8}
                      max={22}
                      value={activePdfConfig.rodape_altura_mm}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({ rodape_altura_mm: Number(event.target.value || 0) })
                      }
                    />
                  </label>
                  <label>
                    Cor fundo rodapé
                    <input
                      value={activePdfConfig.rodape_cor_fundo}
                      disabled={!canManageUsers}
                      onChange={(event) => actions.updateActivePdfVisualConfig({ rodape_cor_fundo: event.target.value })}
                    />
                  </label>
                  <label>
                    Cor texto rodapé
                    <input
                      value={activePdfConfig.rodape_cor_texto}
                      disabled={!canManageUsers}
                      onChange={(event) => actions.updateActivePdfVisualConfig({ rodape_cor_texto: event.target.value })}
                    />
                  </label>
                </div>
              </fieldset>

              <fieldset className="pdf-template-group">
                <legend>Marca d'água e liderança</legend>
                <div className="grid-form three">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(activePdfConfig.marca_dagua_ativa)}
                      disabled={!canManageUsers}
                      onChange={(event) => actions.updateActivePdfVisualConfig({ marca_dagua_ativa: event.target.checked })}
                    />
                    Marca d'água ativa
                  </label>
                  <label>
                    Texto da marca d'água
                    <input
                      value={activePdfConfig.marca_dagua_texto}
                      disabled={!canManageUsers}
                      onChange={(event) => actions.updateActivePdfVisualConfig({ marca_dagua_texto: event.target.value })}
                    />
                  </label>
                  <label>
                    Opacidade
                    <input
                      type="number"
                      min={0.02}
                      max={0.35}
                      step={0.01}
                      value={activePdfConfig.marca_dagua_opacidade}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({ marca_dagua_opacidade: Number(event.target.value || 0) })
                      }
                    />
                  </label>
                </div>
                <div className="grid-form three">
                  <label>
                    Tamanho marca d'água (pt)
                    <input
                      type="number"
                      min={18}
                      max={120}
                      value={activePdfConfig.marca_dagua_tamanho_pt}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({ marca_dagua_tamanho_pt: Number(event.target.value || 0) })
                      }
                    />
                  </label>
                  <label>
                    Cor marca d'água
                    <input
                      value={activePdfConfig.marca_dagua_cor}
                      disabled={!canManageUsers}
                      onChange={(event) => actions.updateActivePdfVisualConfig({ marca_dagua_cor: event.target.value })}
                    />
                  </label>
                  <label>
                    Estilo caixa de liderança
                    <select
                      value={activePdfConfig.caixa_lideranca_estilo}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({
                          caixa_lideranca_estilo: event.target.value as PdfLeadershipStyle
                        })
                      }
                    >
                      <option value="SOFT">Suave</option>
                      <option value="BORDERED">Bordada</option>
                      <option value="MINIMAL">Minimalista</option>
                    </select>
                  </label>
                </div>
                <div className="grid-form three">
                  <label>
                    Cor de fundo liderança
                    <input
                      value={activePdfConfig.caixa_lideranca_cor_fundo}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({ caixa_lideranca_cor_fundo: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Cor de borda liderança
                    <input
                      value={activePdfConfig.caixa_lideranca_cor_borda}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({ caixa_lideranca_cor_borda: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Raio da caixa (px)
                    <input
                      type="number"
                      min={0}
                      max={40}
                      value={activePdfConfig.caixa_lideranca_raio_px}
                      disabled={!canManageUsers}
                      onChange={(event) =>
                        actions.updateActivePdfVisualConfig({ caixa_lideranca_raio_px: Number(event.target.value || 0) })
                      }
                    />
                  </label>
                </div>
              </fieldset>
            </div>

            <div className="pdf-history-box">
              <h3>Histórico de versões</h3>
              {shell.pdfVisualTemplatesSettings.history.length === 0 ? (
                <p className="muted">Nenhuma versão registrada ainda.</p>
              ) : (
                <div className="entity-list">
                  {shell.pdfVisualTemplatesSettings.history.slice(0, 12).map((entry: PdfTemplateHistoryEntry) => (
                    <article key={entry.id} className="entity-card">
                      <div>
                        <h3>{entry.template_nome}</h3>
                        <p>
                          Ação: <strong>{entry.action}</strong> | {formatDateTime(entry.created_at)}
                        </p>
                      </div>
                      <div className="actions-row">
                        <button
                          type="button"
                          className="ghost"
                          disabled={!canManageUsers}
                          onClick={() => actions.rollbackTemplateByHistory(entry.id)}
                        >
                          Restaurar esta versão
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <p className="muted">
              Ajuste os campos e clique em <strong>Salvar rascunho</strong>. Para uso em produção, clique em
              <strong> Publicar template ativo</strong>.
            </p>

            <div className="actions-row">
              <button type="submit" disabled={!canManageUsers}>
                Salvar rascunho
              </button>
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
        <h2>{shell.encounterEditingId ? "Editar encontro" : "Novo encontro"}</h2>
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
          <div className="actions-row">
            <button type="submit" disabled={!canManage}>
              {shell.encounterEditingId ? "Salvar edição" : "Cadastrar encontro"}
            </button>
            {shell.encounterEditingId && (
              <button
                type="button"
                className="ghost"
                disabled={!canManage}
                onClick={() => {
                  actions.setEncounterEditingId(null);
                  actions.setEncounterForm({ nome: "", dataInicio: "", dataFim: "" });
                }}
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="panel">
        <h2>Encontros</h2>
        <div className="cards-grid">
          {shell.encounters.map((encounter: Encounter) => (
            <InteractiveCard
              key={encounter.id}
              className="main-card clickable"
              ariaLabel={`Abrir encontro ${displayEncounterName(encounter)}`}
              onActivate={() => navigate(`/encounters/${encounter.id}`)}
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
                  className="ghost"
                  disabled={!canManage}
                  onClick={(event) => {
                    event.stopPropagation();
                    actions.setEncounterForm({
                      nome: displayEncounterName(encounter),
                      dataInicio: toInputDateString(encounter.data_inicio || encounter.data_encontro || ""),
                      dataFim: toInputDateString(encounter.data_fim || encounter.data_encontro || "")
                    });
                    actions.setEncounterEditingId(encounter.id);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Editar
                </button>
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
            </InteractiveCard>
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
            <InteractiveCard
              className="main-card clickable"
              ariaLabel="Abrir gestão de equipes"
              onActivate={() => navigate(`/encounters/${encounterId}/teams`)}
            >
              <h3>Equipes</h3>
              <p>Gerencie equipes de trabalho em telas dedicadas.</p>
            </InteractiveCard>
          )}
          {canTeams && (
            <InteractiveCard
              className="main-card clickable"
              ariaLabel="Abrir gestão de círculos"
              onActivate={() => navigate(`/encounters/${encounterId}/circles`)}
            >
              <h3>Círculos</h3>
              <p>Gerencie círculos e seus dados de liderança.</p>
            </InteractiveCard>
          )}
          {canAssets && (
            <InteractiveCard
              className="main-card clickable"
              ariaLabel="Abrir gestão de capas e separadores"
              onActivate={() => navigate(`/encounters/${encounterId}/assets`)}
            >
              <h3>Capas e separadores</h3>
              <p>Envie artes A4 para capa, contra capa e separadores.</p>
            </InteractiveCard>
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
                  Nome escolhido do Círculo
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


























































