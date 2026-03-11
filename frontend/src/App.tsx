import { FormEvent, useEffect, useMemo, useState } from "react";

type RoleType = "ADMIN" | "EDITOR" | "VISUALIZADOR" | "OP_CAIXA";
type PaymentMethod = "DINHEIRO" | "PIX" | "CARTAO_DEBITO" | "CARTAO_CREDITO" | "FIADO" | "OUTRO";
type SectionKey = "dashboard" | "cash" | "sales" | "stock" | "reports" | "users" | "settings" | "audit";

type User = {
  id: number;
  nome: string;
  email: string;
  permissao: RoleType;
  ativo: boolean;
  last_login_at?: string | null;
  permissions: Record<string, boolean>;
  effectivePermissions: Record<string, boolean>;
};

type PixPublicConfig = {
  enabled: boolean;
  has_key: boolean;
  key_masked: string | null;
  merchant_name: string;
  merchant_city: string;
  description: string;
};

type PixSettings = {
  enabled: boolean;
  pix_key: string;
  merchant_name: string;
  merchant_city: string;
  description: string;
  txid_prefix: string;
};

type PixPreview = {
  amount: number;
  txid: string;
  brcode: string;
  qr_code_data_url: string;
  merchant_name: string;
  merchant_city: string;
  description: string | null;
  key_masked: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const TOKEN_KEY = "caixa_token_v1";

const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  CASH_OPEN: "cash.open",
  CASH_CLOSE: "cash.close",
  CASH_MOVEMENT: "cash.movement",
  SALES_REGISTER: "sales.register",
  SALES_VIEW: "sales.view",
  STOCK_VIEW: "stock.view",
  STOCK_MANAGE: "stock.manage",
  REPORTS_VIEW: "reports.view",
  USERS_VIEW: "users.view",
  USERS_MANAGE: "users.manage"
} as const;

const PAYMENT_METHODS: PaymentMethod[] = [
  "DINHEIRO",
  "PIX",
  "CARTAO_DEBITO",
  "CARTAO_CREDITO",
  "FIADO",
  "OUTRO"
];

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  CARTAO_DEBITO: "Cartao Debito",
  CARTAO_CREDITO: "Cartao Credito",
  FIADO: "Fiado",
  OUTRO: "Outro"
};

const ROLE_LABELS: Record<RoleType, string> = {
  ADMIN: "Administrador",
  EDITOR: "Editor",
  VISUALIZADOR: "Visualizador",
  OP_CAIXA: "Op. de Caixa"
};

const PERMISSION_UI_LABELS: Record<string, { label: string; description: string }> = {
  [PERMISSIONS.DASHBOARD_VIEW]: {
    label: "Dashboard",
    description: "Permite ver indicadores e resumos gerais."
  },
  [PERMISSIONS.CASH_OPEN]: {
    label: "Abrir caixa",
    description: "Permite iniciar um novo caixa."
  },
  [PERMISSIONS.CASH_CLOSE]: {
    label: "Fechar caixa",
    description: "Permite encerrar o caixa e gerar reducao Z."
  },
  [PERMISSIONS.CASH_MOVEMENT]: {
    label: "Movimentar caixa",
    description: "Permite registrar sangria e suprimento."
  },
  [PERMISSIONS.SALES_REGISTER]: {
    label: "Registrar vendas",
    description: "Permite criar vendas, gerar PIX e cancelar vendas."
  },
  [PERMISSIONS.SALES_VIEW]: {
    label: "Ver vendas",
    description: "Permite consultar lista e detalhes de vendas."
  },
  [PERMISSIONS.STOCK_VIEW]: {
    label: "Ver estoque",
    description: "Permite consultar produtos e saldos."
  },
  [PERMISSIONS.STOCK_MANAGE]: {
    label: "Gerenciar estoque",
    description: "Permite cadastrar produto e ajustar reposicoes/saldos."
  },
  [PERMISSIONS.REPORTS_VIEW]: {
    label: "Ver relatorios",
    description: "Permite acessar relatorios por periodo, usuario e item."
  },
  [PERMISSIONS.USERS_VIEW]: {
    label: "Ver usuarios",
    description: "Permite visualizar cadastros de usuarios."
  },
  [PERMISSIONS.USERS_MANAGE]: {
    label: "Gerenciar usuarios",
    description: "Permite criar, editar e excluir usuarios."
  }
};

const DEFAULT_PIX_SETTINGS: PixSettings = {
  enabled: false,
  pix_key: "",
  merchant_name: "CAIXA EJC",
  merchant_city: "SAO PAULO",
  description: "Pagamento Caixa EJC",
  txid_prefix: "EJC"
};

const EMPTY_PIX_CONFIG: PixPublicConfig = {
  enabled: false,
  has_key: false,
  key_masked: null,
  merchant_name: "CAIXA EJC",
  merchant_city: "SAO PAULO",
  description: "Pagamento Caixa EJC"
};

function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init);
  if (!response.ok) {
    let message = `Erro ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string; message?: string };
      message = payload.error || payload.message || message;
    } catch {
      message = `${message}.`;
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function withAuth(token: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return { ...init, headers } as RequestInit;
}

function parseError(error: unknown) {
  return error instanceof Error ? error.message : "Erro inesperado.";
}

function permissionUiLabel(permissionKey: string) {
  if (PERMISSION_UI_LABELS[permissionKey]) {
    return PERMISSION_UI_LABELS[permissionKey];
  }

  const [scopeRaw, actionRaw] = permissionKey.split(".");
  const scope = String(scopeRaw || "").toLowerCase();
  const action = String(actionRaw || "").toLowerCase();

  const scopeLabels: Record<string, string> = {
    dashboard: "Dashboard",
    cash: "Caixa",
    sales: "Vendas",
    stock: "Estoque",
    reports: "Relatorios",
    users: "Usuarios",
    settings: "Configuracoes",
    audit: "Auditoria"
  };

  const actionLabels: Record<string, string> = {
    view: "visualizar",
    manage: "gerenciar",
    open: "abrir",
    close: "fechar",
    movement: "movimentar",
    register: "registrar"
  };

  const scopeLabel = scopeLabels[scope] || scope || "Modulo";
  const actionLabel = actionLabels[action] || action || "acessar";

  return {
    label: `${scopeLabel} - ${actionLabel}`,
    description: "Permissao personalizada de acesso."
  };
}

function formatMoney(value?: number | null) {
  const amount = Number(value || 0);
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

function formatDateInput(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [permissionsCatalog, setPermissionsCatalog] = useState<string[]>(Object.values(PERMISSIONS));
  const [activeSection, setActiveSection] = useState<SectionKey>("sales");

  const [loginForm, setLoginForm] = useState({ email: "", senha: "" });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [products, setProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [cashCurrent, setCashCurrent] = useState<any>({ session: null });
  const [cashSessions, setCashSessions] = useState<any[]>([]);
  const [cashReport, setCashReport] = useState<any | null>(null);
  const [overview, setOverview] = useState<any | null>(null);
  const [reportGeneral, setReportGeneral] = useState<any | null>(null);
  const [reportPeriod, setReportPeriod] = useState<any | null>(null);
  const [reportByUser, setReportByUser] = useState<any[]>([]);
  const [reportByItem, setReportByItem] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [dashboardRange, setDashboardRange] = useState(() => {
    const today = formatDateInput();
    return { startDate: today, endDate: today };
  });
  const [reportRange, setReportRange] = useState(() => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: formatDateInput(monthStart), endDate: formatDateInput(today) };
  });

  const [openForm, setOpenForm] = useState({ openingAmount: "0", observations: "" });
  const [movementForm, setMovementForm] = useState({ type: "SUPRIMENTO", amount: "", note: "" });
  const [closeForm, setCloseForm] = useState({ closingAmount: "", observations: "" });

  const [saleForm, setSaleForm] = useState({
    payment_method: "DINHEIRO",
    discount_amount: "0",
    received_amount: ""
  });
  const [saleItems, setSaleItems] = useState<Array<{ product_id: number; quantity: string }>>([]);
  const [salesStatusFilter, setSalesStatusFilter] = useState("ALL");
  const [cancelReason, setCancelReason] = useState("");
  const [saleSearch, setSaleSearch] = useState("");
  const [pixConfig, setPixConfig] = useState<PixPublicConfig>(EMPTY_PIX_CONFIG);
  const [pixSettings, setPixSettings] = useState<PixSettings>(DEFAULT_PIX_SETTINGS);
  const [pixPreview, setPixPreview] = useState<PixPreview | null>(null);
  const [pixLoading, setPixLoading] = useState(false);

  const [productForm, setProductForm] = useState({
    id: 0,
    nome: "",
    sku: "",
    categoria: "",
    preco_venda: "0",
    custo_unitario: "0",
    estoque_inicial: "0",
    ativo: true
  });
  const [stockAdjust, setStockAdjust] = useState({ productId: 0, quantity_delta: "", note: "" });
  const [stockRestock, setStockRestock] = useState({ productId: 0, quantity: "", note: "" });
  const [productMovements, setProductMovements] = useState<any[]>([]);

  const [userForm, setUserForm] = useState({
    id: 0,
    nome: "",
    email: "",
    senha: "",
    permissao: "EDITOR",
    ativo: true,
    permissions: {} as Record<string, boolean>
  });
  const [availableRoles, setAvailableRoles] = useState<RoleType[]>([
    "ADMIN",
    "EDITOR",
    "VISUALIZADOR",
    "OP_CAIXA"
  ]);

  function can(permission: string) {
    return Boolean(currentUser?.effectivePermissions?.[permission]);
  }

  function canAny(permissions: string[]) {
    return permissions.some((item) => can(item));
  }

  function setUserPermission(permissionKey: string, enabled: boolean) {
    setUserForm((prev) => {
      const nextPermissions = { ...(prev.permissions || {}) };
      if (enabled) {
        nextPermissions[permissionKey] = true;
      } else {
        delete nextPermissions[permissionKey];
      }
      return { ...prev, permissions: nextPermissions };
    });
  }

  const visibleSections = useMemo(() => {
    const all = [
      { key: "sales", label: "PDV", visible: canAny([PERMISSIONS.SALES_REGISTER, PERMISSIONS.SALES_VIEW]) },
      { key: "dashboard", label: "Dashboard", visible: can(PERMISSIONS.DASHBOARD_VIEW) },
      {
        key: "cash",
        label: "Caixa",
        visible: canAny([PERMISSIONS.CASH_OPEN, PERMISSIONS.CASH_CLOSE, PERMISSIONS.CASH_MOVEMENT, PERMISSIONS.REPORTS_VIEW])
      },
      { key: "stock", label: "Estoque", visible: can(PERMISSIONS.STOCK_VIEW) },
      { key: "reports", label: "Relatorios", visible: can(PERMISSIONS.REPORTS_VIEW) },
      { key: "users", label: "Usuarios", visible: can(PERMISSIONS.USERS_VIEW) },
      { key: "settings", label: "Configuracoes", visible: can(PERMISSIONS.USERS_VIEW) },
      { key: "audit", label: "Auditoria", visible: can(PERMISSIONS.USERS_VIEW) }
    ] as Array<{ key: SectionKey; label: string; visible: boolean }>;

    return all.filter((item) => item.visible);
  }, [currentUser]);

  const saleSummary = useMemo(() => {
    const lines = saleItems
      .map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        const qty = Number(item.quantity || 0);
        if (!product || qty <= 0) return null;
        const lineTotal = Number((qty * Number(product.preco_venda || 0)).toFixed(2));
        return { product, qty, lineTotal };
      })
      .filter(Boolean) as Array<{ product: any; qty: number; lineTotal: number }>;

    const subtotal = Number(lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2));
    const discount = Number(saleForm.discount_amount || 0);
    const total = Number(Math.max(0, subtotal - discount).toFixed(2));
    return { lines, subtotal, discount, total };
  }, [saleItems, products, saleForm.discount_amount]);

  const filteredSaleProducts = useMemo(() => {
    const term = saleSearch.trim().toLowerCase();
    const actives = products.filter((item) => item.ativo);
    if (!term) return actives;
    return actives.filter((item) => {
      const nome = String(item.nome || "").toLowerCase();
      const sku = String(item.sku || "").toLowerCase();
      const categoria = String(item.categoria || "").toLowerCase();
      return nome.includes(term) || sku.includes(term) || categoria.includes(term);
    });
  }, [products, saleSearch]);

  const receivedAmount = Number(saleForm.received_amount || 0);
  const changeAmount =
    saleForm.payment_method === "DINHEIRO"
      ? Number(Math.max(0, receivedAmount - saleSummary.total).toFixed(2))
      : 0;
  const missingAmount =
    saleForm.payment_method === "DINHEIRO"
      ? Number(Math.max(0, saleSummary.total - receivedAmount).toFixed(2))
      : 0;

  async function authRequest<T>(path: string, init?: RequestInit) {
    return requestJson<T>(path, withAuth(token, init));
  }
  useEffect(() => {
    if (!token) {
      setAuthLoading(false);
      setCurrentUser(null);
      return;
    }

    requestJson<{ user: User; permissionsCatalog: string[] }>("/api/auth/me", withAuth(token))
      .then((response) => {
        setCurrentUser(response.user);
        setPermissionsCatalog(response.permissionsCatalog || Object.values(PERMISSIONS));
      })
      .catch((err) => {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken("");
        setCurrentUser(null);
        setError(parseError(err));
      })
      .finally(() => setAuthLoading(false));
  }, [token]);

  useEffect(() => {
    if (!visibleSections.some((item) => item.key === activeSection) && visibleSections.length > 0) {
      setActiveSection(visibleSections[0].key);
    }
  }, [visibleSections, activeSection]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");

    try {
      const response = await requestJson<{ token: string; user: User; permissionsCatalog: string[] }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm)
      });

      sessionStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      setCurrentUser(response.user);
      setPermissionsCatalog(response.permissionsCatalog || Object.values(PERMISSIONS));
      setLoginForm({ email: "", senha: "" });
      setNotice("Login realizado com sucesso.");
    } catch (err) {
      setError(parseError(err));
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setCurrentUser(null);
    setNotice("Sessao encerrada.");
    setError("");
  }

  async function loadProducts(activeOnly = false) {
    const query = activeOnly ? "?active=true" : "";
    const data = await authRequest<any[]>(`/api/products${query}`);
    setProducts(data);
  }

  async function loadSales() {
    const params = new URLSearchParams();
    params.set("limit", "120");
    if (salesStatusFilter !== "ALL") params.set("status", salesStatusFilter);
    const data = await authRequest<any[]>(`/api/sales?${params.toString()}`);
    setSales(data);
  }

  async function loadCurrentCash() {
    const data = await authRequest<any>("/api/cash/sessions/current");
    setCashCurrent(data);
  }

  async function loadCashSessions() {
    const data = await authRequest<any[]>("/api/cash/sessions?limit=30");
    setCashSessions(data);
  }

  async function loadOverview() {
    const params = new URLSearchParams();
    if (dashboardRange.startDate) params.set("startDate", dashboardRange.startDate);
    if (dashboardRange.endDate) params.set("endDate", dashboardRange.endDate);
    const data = await authRequest<any>(`/api/reports/overview?${params.toString()}`);
    setOverview(data);
  }

  async function loadReports() {
    const params = new URLSearchParams();
    if (reportRange.startDate) params.set("startDate", reportRange.startDate);
    if (reportRange.endDate) params.set("endDate", reportRange.endDate);
    const qs = params.toString();

    const [general, byUser, byItem] = await Promise.all([
      authRequest<any>(`/api/reports/totals/general?${qs}`),
      authRequest<any[]>(`/api/reports/totals/by-user?${qs}`),
      authRequest<any[]>(`/api/reports/totals/by-item?${qs}`)
    ]);

    setReportGeneral(general);
    setReportPeriod({
      startDate: reportRange.startDate,
      endDate: reportRange.endDate,
      sales_count: Number(general?.sales_count || 0),
      subtotal: Number(general?.subtotal || 0),
      discount: Number(general?.discount || 0),
      total: Number(general?.total || 0)
    });
    setReportByUser(byUser);
    setReportByItem(byItem);
  }

  async function loadUsers() {
    const [meta, list] = await Promise.all([
      authRequest<{ roles: RoleType[]; permissionsCatalog: string[] }>("/api/users/meta"),
      authRequest<any[]>("/api/users")
    ]);

    setUsers(list);
    setAvailableRoles(meta.roles || ["ADMIN", "EDITOR", "VISUALIZADOR", "OP_CAIXA"]);
    if (meta.permissionsCatalog && meta.permissionsCatalog.length > 0) {
      setPermissionsCatalog(meta.permissionsCatalog);
    }
  }

  async function loadPixConfig() {
    const data = await authRequest<PixPublicConfig>("/api/pix/config");
    setPixConfig(data);
  }

  async function loadPixSettings() {
    const data = await authRequest<PixSettings>("/api/pix/settings");
    setPixSettings({
      enabled: Boolean(data.enabled),
      pix_key: data.pix_key || "",
      merchant_name: data.merchant_name || DEFAULT_PIX_SETTINGS.merchant_name,
      merchant_city: data.merchant_city || DEFAULT_PIX_SETTINGS.merchant_city,
      description: data.description || DEFAULT_PIX_SETTINGS.description,
      txid_prefix: data.txid_prefix || DEFAULT_PIX_SETTINGS.txid_prefix
    });
  }

  async function loadAudit() {
    const data = await authRequest<{ items: any[] }>("/api/audit?limit=100");
    setAuditLogs(data.items || []);
  }

  useEffect(() => {
    if (!token || !currentUser) return;

    const run = async () => {
      try {
        if (activeSection === "dashboard") {
          await loadOverview();
          return;
        }
        if (activeSection === "cash") {
          await Promise.all([
            loadCurrentCash(),
            can(PERMISSIONS.REPORTS_VIEW) ? loadCashSessions() : Promise.resolve()
          ]);
          return;
        }
        if (activeSection === "sales") {
          await Promise.all([
            loadProducts(true),
            can(PERMISSIONS.SALES_VIEW) ? loadSales() : Promise.resolve(),
            can(PERMISSIONS.SALES_REGISTER) ? loadPixConfig() : Promise.resolve()
          ]);
          return;
        }
        if (activeSection === "stock") {
          await loadProducts(false);
          return;
        }
        if (activeSection === "reports") {
          await loadReports();
          return;
        }
        if (activeSection === "users") {
          await loadUsers();
          return;
        }
        if (activeSection === "settings") {
          await loadPixSettings();
          return;
        }
        if (activeSection === "audit") {
          await loadAudit();
        }
      } catch (err) {
        setError(parseError(err));
      }
    };

    void run();
  }, [activeSection, token, currentUser?.id]);

  useEffect(() => {
    if (!token || !currentUser || activeSection !== "sales" || !can(PERMISSIONS.SALES_VIEW)) return;
    void loadSales().catch((err) => setError(parseError(err)));
  }, [salesStatusFilter]);

  useEffect(() => {
    if (saleForm.payment_method !== "PIX") {
      setPixPreview(null);
      return;
    }
    setPixPreview((prev) => {
      if (!prev) return prev;
      if (Math.abs(prev.amount - saleSummary.total) < 0.001) return prev;
      return null;
    });
  }, [saleForm.payment_method, saleSummary.total]);

  async function openCash(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await authRequest("/api/cash/sessions/open", {
        method: "POST",
        body: JSON.stringify({
          opening_amount: Number(openForm.openingAmount || 0),
          observations: openForm.observations
        })
      });
      setOpenForm({ openingAmount: "0", observations: "" });
      setNotice("Caixa aberto com sucesso.");
      await Promise.all([
        loadCurrentCash(),
        can(PERMISSIONS.REPORTS_VIEW) ? loadCashSessions() : Promise.resolve(),
        can(PERMISSIONS.REPORTS_VIEW) ? loadOverview() : Promise.resolve()
      ]);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function registerCashMovement(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await authRequest("/api/cash/sessions/current/movements", {
        method: "POST",
        body: JSON.stringify({
          type: movementForm.type,
          amount: Number(movementForm.amount || 0),
          note: movementForm.note
        })
      });
      setMovementForm({ type: "SUPRIMENTO", amount: "", note: "" });
      setNotice("Movimento de caixa registrado.");
      await Promise.all([
        loadCurrentCash(),
        can(PERMISSIONS.REPORTS_VIEW) ? loadOverview() : Promise.resolve()
      ]);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function generateReportX() {
    setError("");
    try {
      const response = await authRequest<any>("/api/cash/sessions/current/report-x");
      setCashReport(response);
      setNotice("Relatorio X gerado.");
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function closeCash(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await authRequest<any>("/api/cash/sessions/current/close", {
        method: "POST",
        body: JSON.stringify({
          closing_amount: Number(closeForm.closingAmount || 0),
          observations: closeForm.observations
        })
      });
      setCashReport(response);
      setCloseForm({ closingAmount: "", observations: "" });
      setNotice("Caixa fechado com sucesso. Reducao Z gerada.");
      await Promise.all([
        loadCurrentCash(),
        can(PERMISSIONS.REPORTS_VIEW) ? loadCashSessions() : Promise.resolve(),
        can(PERMISSIONS.REPORTS_VIEW) ? loadOverview() : Promise.resolve()
      ]);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function loadReductionZ(sessionId: number) {
    setError("");
    try {
      const response = await authRequest<any>(`/api/cash/sessions/${sessionId}/reducao-z`);
      setCashReport(response);
      setNotice(`Reducao Z da sessao #${sessionId} carregada.`);
    } catch (err) {
      setError(parseError(err));
    }
  }

  function getSaleItemQuantity(productId: number) {
    const found = saleItems.find((item) => item.product_id === productId);
    return Number(found?.quantity || 0);
  }

  function setSaleItemQuantity(productId: number, nextQuantity: number) {
    if (nextQuantity <= 0) {
      setSaleItems((prev) => prev.filter((item) => item.product_id !== productId));
      return;
    }

    const normalized = String(Number(nextQuantity.toFixed(3)));
    setSaleItems((prev) => {
      const idx = prev.findIndex((item) => item.product_id === productId);
      if (idx < 0) {
        return [...prev, { product_id: productId, quantity: normalized }];
      }
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantity: normalized };
      return updated;
    });
  }

  function quickAddSaleItem(productId: number) {
    setSaleItemQuantity(productId, getSaleItemQuantity(productId) + 1);
    setError("");
  }

  function updateSaleItem(productId: number, quantity: string) {
    const next = Number(quantity || 0);
    if (!Number.isFinite(next)) return;
    setSaleItemQuantity(productId, next);
  }

  function increaseSaleItem(productId: number) {
    setSaleItemQuantity(productId, getSaleItemQuantity(productId) + 1);
  }

  function decreaseSaleItem(productId: number) {
    setSaleItemQuantity(productId, getSaleItemQuantity(productId) - 1);
  }

  function removeSaleItem(productId: number) {
    setSaleItems((prev) => prev.filter((item) => item.product_id !== productId));
  }

  async function saveSale(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (saleForm.payment_method === "DINHEIRO" && Number(saleForm.received_amount || 0) < saleSummary.total) {
        setError("Valor recebido menor que o total da venda.");
        return;
      }

      const created = await authRequest<any>("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          payment_method: saleForm.payment_method,
          discount_amount: Number(saleForm.discount_amount || 0),
          received_amount:
            saleForm.payment_method === "DINHEIRO"
              ? Number(saleForm.received_amount || saleSummary.total || 0)
              : undefined,
          items: saleItems.map((item) => ({ product_id: item.product_id, quantity: Number(item.quantity || 0) }))
        })
      });

      setSelectedSale(created);
      setSaleItems([]);
      setSaleForm((prev) => ({ ...prev, payment_method: "DINHEIRO", discount_amount: "0", received_amount: "" }));
      setPixPreview(null);
      setNotice(`Venda ${created.sale_code} registrada com sucesso.`);
      await Promise.all([
        can(PERMISSIONS.SALES_VIEW) ? loadSales() : Promise.resolve(),
        loadProducts(true),
        loadCurrentCash(),
        can(PERMISSIONS.REPORTS_VIEW) ? loadOverview() : Promise.resolve(),
        can(PERMISSIONS.SALES_REGISTER) ? loadPixConfig() : Promise.resolve()
      ]);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function loadSaleDetails(saleId: number) {
    try {
      const sale = await authRequest<any>(`/api/sales/${saleId}`);
      setSelectedSale(sale);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function cancelSale() {
    if (!selectedSale) return;
    setError("");
    try {
      const updated = await authRequest<any>(`/api/sales/${selectedSale.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: cancelReason })
      });
      setSelectedSale(updated);
      setCancelReason("");
      setNotice(`Venda ${updated.sale_code} cancelada com sucesso.`);
      await Promise.all([
        can(PERMISSIONS.SALES_VIEW) ? loadSales() : Promise.resolve(),
        loadProducts(true),
        loadCurrentCash(),
        can(PERMISSIONS.REPORTS_VIEW) ? loadOverview() : Promise.resolve()
      ]);
    } catch (err) {
      setError(parseError(err));
    }
  }
  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    setError("");

    const payload = {
      nome: productForm.nome,
      sku: productForm.sku,
      categoria: productForm.categoria,
      preco_venda: Number(productForm.preco_venda || 0),
      custo_unitario: Number(productForm.custo_unitario || 0),
      estoque_inicial: Number(productForm.estoque_inicial || 0),
      ativo: productForm.ativo
    };

    try {
      if (productForm.id > 0) {
        await authRequest(`/api/products/${productForm.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("Produto atualizado.");
      } else {
        await authRequest("/api/products", { method: "POST", body: JSON.stringify(payload) });
        setNotice("Produto criado.");
      }

      setProductForm({
        id: 0,
        nome: "",
        sku: "",
        categoria: "",
        preco_venda: "0",
        custo_unitario: "0",
        estoque_inicial: "0",
        ativo: true
      });
      await loadProducts(false);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function refreshProductAndMovements(productId: number) {
    await loadProducts(false);
    if (productId > 0) {
      const movements = await authRequest<any[]>(`/api/products/${productId}/movements`);
      setProductMovements(movements);
    }
  }

  async function adjustStock(event: FormEvent) {
    event.preventDefault();
    if (!stockAdjust.productId) {
      setError("Selecione um produto para ajuste.");
      return;
    }

    const selectedProductId = stockAdjust.productId;

    try {
      await authRequest(`/api/products/${selectedProductId}/adjust-stock`, {
        method: "POST",
        body: JSON.stringify({
          quantity_delta: Number(stockAdjust.quantity_delta || 0),
          note: stockAdjust.note
        })
      });

      setNotice("Ajuste de estoque aplicado.");
      setStockAdjust((prev) => ({ ...prev, quantity_delta: "", note: "" }));
      await refreshProductAndMovements(selectedProductId);
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function restockProduct(event: FormEvent) {
    event.preventDefault();
    if (!stockRestock.productId) {
      setError("Selecione um produto para reposicao.");
      return;
    }

    const quantity = Number(stockRestock.quantity || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Informe uma quantidade positiva para reposicao.");
      return;
    }

    const selectedProductId = stockRestock.productId;

    try {
      await authRequest(`/api/products/${selectedProductId}/restock`, {
        method: "POST",
        body: JSON.stringify({
          quantity,
          note: stockRestock.note
        })
      });

      setNotice("Reposicao de estoque aplicada.");
      setStockRestock((prev) => ({ ...prev, quantity: "", note: "" }));
      await refreshProductAndMovements(selectedProductId);
    } catch (err) {
      setError(parseError(err));
    }
  }

  function editProduct(product: any) {
    setProductForm({
      id: product.id,
      nome: product.nome || "",
      sku: product.sku || "",
      categoria: product.categoria || "",
      preco_venda: String(product.preco_venda || 0),
      custo_unitario: String(product.custo_unitario || 0),
      estoque_inicial: "0",
      ativo: Boolean(product.ativo)
    });
  }

  async function showProductMovements(productId: number) {
    try {
      const movements = await authRequest<any[]>(`/api/products/${productId}/movements`);
      setProductMovements(movements);
      setStockAdjust((prev) => ({ ...prev, productId }));
      setStockRestock((prev) => ({ ...prev, productId }));
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    setError("");

    const payload = {
      nome: userForm.nome,
      email: userForm.email,
      senha: userForm.senha,
      permissao: userForm.permissao,
      ativo: userForm.ativo,
      permissions: userForm.permissions || {}
    };

    try {
      if (userForm.id > 0) {
        await authRequest(`/api/users/${userForm.id}`, { method: "PUT", body: JSON.stringify(payload) });
        setNotice("Usuario atualizado.");
      } else {
        await authRequest("/api/users", { method: "POST", body: JSON.stringify(payload) });
        setNotice("Usuario criado.");
      }

      setUserForm({ id: 0, nome: "", email: "", senha: "", permissao: "EDITOR", ativo: true, permissions: {} });
      await loadUsers();
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function deleteUser(userId: number) {
    try {
      await authRequest(`/api/users/${userId}`, { method: "DELETE" });
      setNotice("Usuario removido.");
      await loadUsers();
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function savePixSettingsForm(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const payload = {
        enabled: pixSettings.enabled,
        pix_key: pixSettings.pix_key,
        merchant_name: pixSettings.merchant_name,
        merchant_city: pixSettings.merchant_city,
        description: pixSettings.description,
        txid_prefix: pixSettings.txid_prefix
      };
      const saved = await authRequest<PixSettings>("/api/pix/settings", {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      setPixSettings(saved);
      setNotice("Configuracoes PIX salvas.");
      await loadPixConfig();
    } catch (err) {
      setError(parseError(err));
    }
  }

  async function generatePixQrPreview() {
    if (!can(PERMISSIONS.SALES_REGISTER)) {
      setError("Sem permissao para gerar cobranca PIX.");
      return;
    }

    if (saleSummary.total <= 0) {
      setError("Adicione itens antes de gerar o QR PIX.");
      return;
    }

    setError("");
    setPixLoading(true);
    try {
      const preview = await authRequest<PixPreview>("/api/pix/qr", {
        method: "POST",
        body: JSON.stringify({
          amount: saleSummary.total,
          description: pixConfig.description
        })
      });
      setPixPreview(preview);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setPixLoading(false);
    }
  }

  async function copyPixCode() {
    if (!pixPreview?.brcode) return;
    try {
      await navigator.clipboard.writeText(pixPreview.brcode);
      setNotice("Codigo PIX copiado.");
    } catch (_err) {
      setError("Nao foi possivel copiar o codigo PIX neste dispositivo.");
    }
  }

  if (authLoading) {
    return (
      <main className="auth-layout">
        <section className="panel auth-panel">
          <h1>Carregando Caixa EJC...</h1>
        </section>
      </main>
    );
  }

  if (!token || !currentUser) {
    return (
      <main className="auth-layout">
        <form className="panel auth-panel" onSubmit={handleLogin}>
          <h1>Caixa EJC</h1>
          <p>Sistema de frente de caixa para vendinha.</p>

          {error && <div className="notice error">{error}</div>}

          <label>
            E-mail
            <input
              type="email"
              required
              value={loginForm.email}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              required
              value={loginForm.senha}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, senha: event.target.value }))}
            />
          </label>

          <button type="submit">Entrar</button>
        </form>
      </main>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>Caixa EJC</h2>
        <p className="muted">PDV web em Docker</p>

        <nav className="nav-list">
          {visibleSections.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activeSection === item.key ? "active" : ""}`}
              onClick={() => setActiveSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <strong>{currentUser.nome}</strong>
          <span>{currentUser.email}</span>
          <span>Perfil: {ROLE_LABELS[currentUser.permissao] || currentUser.permissao}</span>
          <span>Permissoes: {permissionsCatalog.length}</span>
        </div>

        <button className="ghost" onClick={handleLogout}>Sair</button>
      </aside>

      <main className="content">
        {notice && <div className="notice ok">{notice}</div>}
        {error && <div className="notice error">{error}</div>}

        {activeSection === "dashboard" && (
          <section className="stack">
            <div className="panel">
              <div className="panel-head">
                <h1>Dashboard de vendas</h1>
                <div className="actions-row">
                  <input type="date" value={dashboardRange.startDate} onChange={(event) => setDashboardRange((prev) => ({ ...prev, startDate: event.target.value }))} />
                  <input type="date" value={dashboardRange.endDate} onChange={(event) => setDashboardRange((prev) => ({ ...prev, endDate: event.target.value }))} />
                  <button className="ghost" onClick={() => void loadOverview().catch((err) => setError(parseError(err)))}>Atualizar</button>
                </div>
              </div>

              {overview ? (
                <div className="stats-grid">
                  <article className="stat-card"><span>Vendas</span><strong>{overview.totals?.sales_count || 0}</strong></article>
                  <article className="stat-card"><span>Subtotal</span><strong>{formatMoney(overview.totals?.subtotal)}</strong></article>
                  <article className="stat-card"><span>Descontos</span><strong>{formatMoney(overview.totals?.discount)}</strong></article>
                  <article className="stat-card"><span>Total Liquido</span><strong>{formatMoney(overview.totals?.total)}</strong></article>
                </div>
              ) : <p className="muted">Sem dados no periodo.</p>}
            </div>

            <div className="panel two-col">
              <div>
                <h3>Caixa atual</h3>
                {overview?.open_session ? (
                  <p>Caixa #{overview.open_session.id} aberto por {overview.open_session.opened_by_name} em {formatDateTime(overview.open_session.opened_at)} com abertura de {formatMoney(overview.open_session.opening_amount)}.</p>
                ) : <p className="muted">Nao ha caixa aberto no momento.</p>}

                <h3 style={{ marginTop: 16 }}>Vendas por pagamento</h3>
                <table>
                  <thead><tr><th>Forma</th><th>Qtd.</th><th>Total</th></tr></thead>
                  <tbody>
                    {(overview?.by_payment || []).map((item: any) => (
                      <tr key={item.payment_method}><td>{PAYMENT_LABELS[item.payment_method as PaymentMethod]}</td><td>{item.count}</td><td>{formatMoney(item.total)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3>Top itens vendidos</h3>
                <table>
                  <thead><tr><th>Item</th><th>Qtd.</th><th>Total</th></tr></thead>
                  <tbody>
                    {(overview?.top_products || []).map((item: any) => (
                      <tr key={item.product_id}><td>{item.product_name}</td><td>{item.quantity}</td><td>{formatMoney(item.total)}</td></tr>
                    ))}
                  </tbody>
                </table>

                <h3 style={{ marginTop: 16 }}>Estoque baixo</h3>
                <table>
                  <thead><tr><th>Item</th><th>Estoque</th></tr></thead>
                  <tbody>
                    {(overview?.low_stock || []).map((item: any) => (
                      <tr key={item.id}><td>{item.nome}</td><td>{item.estoque_atual}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeSection === "cash" && (
          <section className="stack">
            <div className="panel">
              <div className="panel-head">
                <h1>Abertura e fechamento de caixa</h1>
                <div className="actions-row">
                  <button className="ghost" onClick={() => void loadCurrentCash().catch((err) => setError(parseError(err)))}>Atualizar caixa</button>
                  {can(PERMISSIONS.REPORTS_VIEW) && (
                    <button className="ghost" onClick={() => void loadCashSessions().catch((err) => setError(parseError(err)))}>
                      Atualizar sessoes
                    </button>
                  )}
                </div>
              </div>

              {!cashCurrent.session ? (
                <form className="grid-form two" onSubmit={openCash}>
                  <label>Valor de abertura<input type="number" min="0" step="0.01" required value={openForm.openingAmount} onChange={(event) => setOpenForm((prev) => ({ ...prev, openingAmount: event.target.value }))} /></label>
                  <label>Observacoes<input value={openForm.observations} onChange={(event) => setOpenForm((prev) => ({ ...prev, observations: event.target.value }))} /></label>
                  <button type="submit" disabled={!can(PERMISSIONS.CASH_OPEN)}>Abrir caixa</button>
                </form>
              ) : (
                <div className="stack-inner">
                  <div className="summary-card">
                    <p>Caixa #{cashCurrent.session.id} aberto por {cashCurrent.session.opened_by_name} em {formatDateTime(cashCurrent.session.opened_at)}.</p>
                    <p>Abertura: <strong>{formatMoney(cashCurrent.session.opening_amount)}</strong></p>
                    <p>Esperado em dinheiro: <strong>{formatMoney(cashCurrent.report?.totals?.cash_expected || 0)}</strong></p>
                  </div>

                  {can(PERMISSIONS.CASH_MOVEMENT) ? (
                    <form className="grid-form three" onSubmit={registerCashMovement}>
                      <label>Tipo<select value={movementForm.type} onChange={(event) => setMovementForm((prev) => ({ ...prev, type: event.target.value }))}><option value="SUPRIMENTO">Suprimento</option><option value="SANGRIA">Sangria</option></select></label>
                      <label>Valor<input type="number" min="0" step="0.01" required value={movementForm.amount} onChange={(event) => setMovementForm((prev) => ({ ...prev, amount: event.target.value }))} /></label>
                      <label>Observacao<input value={movementForm.note} onChange={(event) => setMovementForm((prev) => ({ ...prev, note: event.target.value }))} /></label>
                      <button type="submit">Registrar movimento</button>
                    </form>
                  ) : (
                    <p className="muted">Sem permissao para suprimento/sangria.</p>
                  )}

                  {can(PERMISSIONS.REPORTS_VIEW) && (
                    <div className="actions-row">
                      <button onClick={() => void generateReportX()}>Gerar Relatorio X</button>
                    </div>
                  )}

                  <form className="grid-form two" onSubmit={closeCash}>
                    <label>Valor apurado no fechamento<input type="number" min="0" step="0.01" required value={closeForm.closingAmount} onChange={(event) => setCloseForm((prev) => ({ ...prev, closingAmount: event.target.value }))} /></label>
                    <label>Observacoes de fechamento<input value={closeForm.observations} onChange={(event) => setCloseForm((prev) => ({ ...prev, observations: event.target.value }))} /></label>
                    <button type="submit" className="danger" disabled={!can(PERMISSIONS.CASH_CLOSE)}>Fechar caixa (Reducao Z)</button>
                  </form>
                </div>
              )}
            </div>

            {can(PERMISSIONS.REPORTS_VIEW) && cashReport && (
              <div className="panel">
                <h3>{cashReport.report_type === "X" ? "Relatorio X" : "Reducao Z"} | Caixa #{cashReport.session.id}</h3>
                <p className="muted">Gerado em {formatDateTime(cashReport.generated_at)}</p>
                <div className="stats-grid">
                  <article className="stat-card"><span>Total de vendas</span><strong>{cashReport.report?.totals?.sales_count || 0}</strong></article>
                  <article className="stat-card"><span>Total liquido</span><strong>{formatMoney(cashReport.report?.totals?.total)}</strong></article>
                  <article className="stat-card"><span>Esperado em dinheiro</span><strong>{formatMoney(cashReport.report?.totals?.cash_expected)}</strong></article>
                  {cashReport.session?.status === "CLOSED" && <article className="stat-card"><span>Diferenca fechamento</span><strong>{formatMoney(cashReport.session?.difference_amount)}</strong></article>}
                </div>
                <table>
                  <thead><tr><th>Pagamento</th><th>Qtd.</th><th>Total</th></tr></thead>
                  <tbody>
                    {PAYMENT_METHODS.map((method) => (
                      <tr key={method}><td>{PAYMENT_LABELS[method]}</td><td>{cashReport.report?.totals?.count_by_payment?.[method] || 0}</td><td>{formatMoney(cashReport.report?.totals?.by_payment?.[method] || 0)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {can(PERMISSIONS.REPORTS_VIEW) && (
              <div className="panel">
                <h3>Historico de caixas</h3>
                <table>
                  <thead><tr><th>ID</th><th>Abertura</th><th>Fechamento</th><th>Status</th><th>Diferenca</th><th>Acoes</th></tr></thead>
                  <tbody>
                    {cashSessions.map((session) => (
                      <tr key={session.id}>
                        <td>#{session.id}</td><td>{formatDateTime(session.opened_at)}</td><td>{formatDateTime(session.closed_at)}</td><td>{session.status}</td><td>{formatMoney(session.difference_amount)}</td>
                        <td>{session.status === "CLOSED" ? <button className="ghost" onClick={() => void loadReductionZ(session.id)}>Ver Z</button> : <span className="muted">Em aberto</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {activeSection === "sales" && (
          <section className="stack">
            <div className="panel">
              <div className="panel-head">
                <h1>PDV Caixa EJC</h1>
                <div className="actions-row">
                  <button className="ghost" onClick={() => void loadProducts(true).catch((err) => setError(parseError(err)))}>
                    Atualizar itens
                  </button>
                </div>
              </div>

              <div className="pdv-layout">
                <div className="pdv-products">
                  <label>
                    Buscar item
                    <input
                      placeholder="Nome, SKU ou categoria"
                      value={saleSearch}
                      onChange={(event) => setSaleSearch(event.target.value)}
                    />
                  </label>

                  <div className="pdv-product-grid">
                    {filteredSaleProducts.map((product) => (
                      <article key={product.id} className="pdv-product-card">
                        <div>
                          <strong>{product.nome}</strong>
                          <span>Estoque: {product.estoque_atual}</span>
                          <span>{formatMoney(product.preco_venda)}</span>
                        </div>
                        <div className="actions-row">
                          <button type="button" className="ghost" onClick={() => decreaseSaleItem(product.id)}>
                            -
                          </button>
                          <span className="pdv-qty-chip">{getSaleItemQuantity(product.id)}</span>
                          <button type="button" onClick={() => quickAddSaleItem(product.id)}>
                            +
                          </button>
                        </div>
                      </article>
                    ))}
                    {filteredSaleProducts.length === 0 && <p className="muted">Nenhum item encontrado.</p>}
                  </div>
                </div>

                <form className="pdv-checkout" onSubmit={saveSale}>
                  <h3>Venda atual</h3>

                  <div className="pdv-cart-list">
                    {saleSummary.lines.length === 0 && <p className="muted">Toque em um item para adicionar na venda.</p>}
                    {saleSummary.lines.map((line) => (
                      <article key={line.product.id} className="pdv-cart-item">
                        <div className="pdv-cart-main">
                          <strong>{line.product.nome}</strong>
                          <span>{formatMoney(line.product.preco_venda)} cada</span>
                        </div>
                        <div className="actions-row">
                          <button type="button" className="ghost" onClick={() => decreaseSaleItem(line.product.id)}>
                            -
                          </button>
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={saleItems.find((item) => item.product_id === line.product.id)?.quantity || ""}
                            onChange={(event) => updateSaleItem(line.product.id, event.target.value)}
                          />
                          <button type="button" onClick={() => increaseSaleItem(line.product.id)}>
                            +
                          </button>
                          <button type="button" className="ghost" onClick={() => removeSaleItem(line.product.id)}>
                            Remover
                          </button>
                        </div>
                        <strong className="pdv-line-total">{formatMoney(line.lineTotal)}</strong>
                      </article>
                    ))}
                  </div>

                  <label>
                    Forma de pagamento
                    <div className="pdv-payments">
                      {PAYMENT_METHODS.map((method) => (
                        <button
                          key={method}
                          type="button"
                          className={saleForm.payment_method === method ? "pay-chip active" : "pay-chip"}
                          onClick={() => {
                            setPixPreview(null);
                            setSaleForm((prev) => ({
                              ...prev,
                              payment_method: method,
                              received_amount: method === "DINHEIRO" ? prev.received_amount : ""
                            }));
                          }}
                        >
                          {PAYMENT_LABELS[method]}
                        </button>
                      ))}
                    </div>
                  </label>

                  {saleForm.payment_method === "PIX" && can(PERMISSIONS.SALES_REGISTER) && (
                    <div className="pix-box">
                      {!pixConfig.enabled && (
                        <p className="muted">PIX desativado. Habilite em Configuracoes para gerar QR Code.</p>
                      )}
                      {pixConfig.enabled && !pixConfig.has_key && (
                        <p className="muted">Configure a chave PIX em Configuracoes para liberar o QR Code.</p>
                      )}
                      {pixConfig.enabled && pixConfig.has_key && (
                        <div className="stack-inner">
                          <button type="button" className="ghost" onClick={() => void generatePixQrPreview()} disabled={pixLoading || saleSummary.total <= 0}>
                            {pixLoading ? "Gerando QR PIX..." : "Gerar QR Code PIX"}
                          </button>
                          {pixPreview && (
                            <div className="pix-preview">
                              <img src={pixPreview.qr_code_data_url} alt="QR Code PIX" />
                              <p>
                                Recebedor: <strong>{pixPreview.merchant_name}</strong>
                                {pixPreview.key_masked ? ` | Chave: ${pixPreview.key_masked}` : ""}
                              </p>
                              <label>
                                Codigo PIX copia e cola
                                <textarea readOnly rows={4} value={pixPreview.brcode} />
                              </label>
                              <button type="button" className="ghost" onClick={() => void copyPixCode()}>
                                Copiar codigo PIX
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <label>
                    Desconto (opcional)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={saleForm.discount_amount}
                      onChange={(event) => setSaleForm((prev) => ({ ...prev, discount_amount: event.target.value }))}
                    />
                  </label>

                  {saleForm.payment_method === "DINHEIRO" && (
                    <label>
                      Valor recebido do cliente
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={saleForm.received_amount}
                        onChange={(event) => setSaleForm((prev) => ({ ...prev, received_amount: event.target.value }))}
                      />
                    </label>
                  )}

                  <div className="pdv-totals">
                    <p>
                      <span>Subtotal</span>
                      <strong>{formatMoney(saleSummary.subtotal)}</strong>
                    </p>
                    <p>
                      <span>Desconto</span>
                      <strong>{formatMoney(saleSummary.discount)}</strong>
                    </p>
                    <p className="pdv-grand-total">
                      <span>Total</span>
                      <strong>{formatMoney(saleSummary.total)}</strong>
                    </p>
                    {saleForm.payment_method === "DINHEIRO" && (
                      <>
                        <p>
                          <span>Troco</span>
                          <strong>{formatMoney(changeAmount)}</strong>
                        </p>
                        {missingAmount > 0 && (
                          <p className="pdv-missing">
                            <span>Falta receber</span>
                            <strong>{formatMoney(missingAmount)}</strong>
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="pdv-finish-btn"
                    disabled={!can(PERMISSIONS.SALES_REGISTER) || saleSummary.lines.length === 0}
                  >
                    Finalizar venda
                  </button>
                </form>
              </div>
            </div>

            <div className="panel two-col">
              <div>
                <div className="panel-head">
                  <h3>Log de vendas</h3>
                  <select value={salesStatusFilter} onChange={(event) => setSalesStatusFilter(event.target.value)}>
                    <option value="ALL">Todos</option><option value="COMPLETED">Concluidas</option><option value="CANCELED">Canceladas</option>
                  </select>
                </div>
                <table><thead><tr><th>Codigo</th><th>Usuario</th><th>Valor</th><th>Status</th><th></th></tr></thead><tbody>{sales.map((sale) => <tr key={sale.id}><td>{sale.sale_code}</td><td>{sale.sold_by_name || "-"}</td><td>{formatMoney(sale.total_amount)}</td><td>{sale.status}</td><td><button className="ghost" onClick={() => void loadSaleDetails(sale.id)}>Detalhar</button></td></tr>)}</tbody></table>
              </div>
              <div>
                <h3>Detalhes da venda</h3>
                {selectedSale ? (
                  <div className="stack-inner">
                    <p><strong>{selectedSale.sale_code}</strong> | {formatDateTime(selectedSale.created_at)}</p>
                    <p>Forma: {PAYMENT_LABELS[selectedSale.payment_method as PaymentMethod]} | Total: {formatMoney(selectedSale.total_amount)}</p>
                    <table><thead><tr><th>Item</th><th>Qtd.</th><th>Unit.</th><th>Total</th></tr></thead><tbody>{(selectedSale.items || []).map((item: any) => <tr key={item.id}><td>{item.product_name}</td><td>{item.quantity}</td><td>{formatMoney(item.unit_price)}</td><td>{formatMoney(item.line_total)}</td></tr>)}</tbody></table>
                    {selectedSale.status === "COMPLETED" && can(PERMISSIONS.SALES_REGISTER) && <><label>Motivo do cancelamento<input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} /></label><button className="danger" onClick={() => void cancelSale()}>Cancelar venda</button></>}
                    {selectedSale.status === "CANCELED" && <p className="muted">Cancelada em {formatDateTime(selectedSale.canceled_at)} | Motivo: {selectedSale.cancel_reason || "-"}</p>}
                  </div>
                ) : <p className="muted">Selecione uma venda no log para ver detalhes.</p>}
              </div>
            </div>
          </section>
        )}

        {activeSection === "stock" && (
          <section className="stack">
            <div className="panel">
              <h1>Cadastro e estoque de itens</h1>
              <form className="grid-form three" onSubmit={saveProduct}>
                <label>
                  Nome
                  <input required value={productForm.nome} onChange={(event) => setProductForm((prev) => ({ ...prev, nome: event.target.value }))} />
                </label>
                <label>
                  SKU
                  <input value={productForm.sku} onChange={(event) => setProductForm((prev) => ({ ...prev, sku: event.target.value }))} />
                </label>
                <label>
                  Categoria
                  <input value={productForm.categoria} onChange={(event) => setProductForm((prev) => ({ ...prev, categoria: event.target.value }))} />
                </label>
                <label>
                  Preco de venda
                  <input type="number" min="0" step="0.01" required value={productForm.preco_venda} onChange={(event) => setProductForm((prev) => ({ ...prev, preco_venda: event.target.value }))} />
                </label>
                <label>
                  Custo unitario
                  <input type="number" min="0" step="0.01" value={productForm.custo_unitario} onChange={(event) => setProductForm((prev) => ({ ...prev, custo_unitario: event.target.value }))} />
                </label>
                <label>
                  Estoque inicial
                  <input type="number" min="0" step="0.001" disabled={productForm.id > 0} value={productForm.estoque_inicial} onChange={(event) => setProductForm((prev) => ({ ...prev, estoque_inicial: event.target.value }))} />
                </label>
                <label className="toggle">
                  <input type="checkbox" checked={productForm.ativo} onChange={(event) => setProductForm((prev) => ({ ...prev, ativo: event.target.checked }))} />
                  Produto ativo
                </label>
                <div className="actions-row">
                  <button type="submit" disabled={!can(PERMISSIONS.STOCK_MANAGE)}>{productForm.id > 0 ? "Salvar produto" : "Cadastrar produto"}</button>
                  <button type="button" className="ghost" onClick={() => setProductForm({ id: 0, nome: "", sku: "", categoria: "", preco_venda: "0", custo_unitario: "0", estoque_inicial: "0", ativo: true })}>Limpar</button>
                </div>
              </form>
            </div>
            <div className="panel two-col">
              <div className="stack-inner">
                <div className="summary-card">
                  <h3>Ajuste manual de estoque</h3>
                  <form className="grid-form" onSubmit={adjustStock}>
                    <label>
                      Produto
                      <select value={stockAdjust.productId} onChange={(event) => setStockAdjust((prev) => ({ ...prev, productId: Number(event.target.value || 0) }))}>
                        <option value={0}>Selecione...</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.nome} | estoque {product.estoque_atual}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Quantidade (use negativo para saida)
                      <input type="number" step="0.001" required value={stockAdjust.quantity_delta} onChange={(event) => setStockAdjust((prev) => ({ ...prev, quantity_delta: event.target.value }))} />
                    </label>
                    <label>
                      Motivo
                      <input value={stockAdjust.note} onChange={(event) => setStockAdjust((prev) => ({ ...prev, note: event.target.value }))} />
                    </label>
                    <button type="submit" disabled={!can(PERMISSIONS.STOCK_MANAGE)}>Aplicar ajuste</button>
                  </form>
                </div>

                <div className="summary-card">
                  <h3>Reposicao de estoque</h3>
                  <form className="grid-form" onSubmit={restockProduct}>
                    <label>
                      Produto
                      <select value={stockRestock.productId} onChange={(event) => setStockRestock((prev) => ({ ...prev, productId: Number(event.target.value || 0) }))}>
                        <option value={0}>Selecione...</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.nome} | estoque {product.estoque_atual}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Quantidade de reposicao
                      <input type="number" min="0.001" step="0.001" required value={stockRestock.quantity} onChange={(event) => setStockRestock((prev) => ({ ...prev, quantity: event.target.value }))} />
                    </label>
                    <label>
                      Observacao
                      <input value={stockRestock.note} onChange={(event) => setStockRestock((prev) => ({ ...prev, note: event.target.value }))} />
                    </label>
                    <button type="submit" disabled={!can(PERMISSIONS.STOCK_MANAGE)}>Aplicar reposicao</button>
                  </form>
                </div>

                <h3 style={{ marginTop: 16 }}>Movimentacao selecionada</h3>
                {productMovements.length > 0 ? (
                  <table>
                    <thead>
                      <tr><th>Data</th><th>Tipo</th><th>Qtd.</th><th>Usuario</th></tr>
                    </thead>
                    <tbody>
                      {productMovements.map((movement) => (
                        <tr key={movement.id}>
                          <td>{formatDateTime(movement.created_at)}</td>
                          <td>{movement.type}</td>
                          <td>{movement.quantity_delta}</td>
                          <td>{movement.user?.nome || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="muted">Clique em “Movimentos” na tabela de produtos.</p>
                )}
              </div>
              <div>
                <h3>Produtos cadastrados</h3>
                <table>
                  <thead><tr><th>Nome</th><th>Preco</th><th>Estoque</th><th>Acoes</th></tr></thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td>{product.nome}{!product.ativo && <span className="chip">Inativo</span>}</td>
                        <td>{formatMoney(product.preco_venda)}</td>
                        <td>{product.estoque_atual}</td>
                        <td>
                          <div className="actions-row">
                            <button className="ghost" onClick={() => editProduct(product)}>Editar</button>
                            <button className="ghost" onClick={() => void showProductMovements(product.id)}>Movimentos</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {activeSection === "reports" && (
          <section className="stack">
            <div className="panel">
              <div className="panel-head">
                <h1>Relatorios totalizadores</h1>
                <div className="actions-row">
                  <input type="date" value={reportRange.startDate} onChange={(event) => setReportRange((prev) => ({ ...prev, startDate: event.target.value }))} />
                  <input type="date" value={reportRange.endDate} onChange={(event) => setReportRange((prev) => ({ ...prev, endDate: event.target.value }))} />
                  <button className="ghost" onClick={() => void loadReports().catch((err) => setError(parseError(err)))}>Gerar</button>
                </div>
              </div>

              {reportGeneral && (
                <div className="stats-grid">
                  <article className="stat-card"><span>Vendas</span><strong>{reportGeneral.sales_count}</strong></article>
                  <article className="stat-card"><span>Subtotal</span><strong>{formatMoney(reportGeneral.subtotal)}</strong></article>
                  <article className="stat-card"><span>Desconto</span><strong>{formatMoney(reportGeneral.discount)}</strong></article>
                  <article className="stat-card"><span>Total geral</span><strong>{formatMoney(reportGeneral.total)}</strong></article>
                </div>
              )}
            </div>

            <div className="panel two-col">
              <div>
                <h3>Por periodo selecionado</h3>
                {reportPeriod ? (
                  <table>
                    <thead><tr><th>Periodo</th><th>Vendas</th><th>Entrada bruta</th><th>Descontos</th><th>Entrada liquida</th></tr></thead>
                    <tbody>
                      <tr>
                        <td>{reportPeriod.startDate} ate {reportPeriod.endDate}</td>
                        <td>{reportPeriod.sales_count}</td>
                        <td>{formatMoney(reportPeriod.subtotal)}</td>
                        <td>{formatMoney(reportPeriod.discount)}</td>
                        <td>{formatMoney(reportPeriod.total)}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <p className="muted">Selecione um periodo e clique em Gerar.</p>
                )}
                <p className="muted">Este total considera apenas entradas de vendas concluidas, sem valor de abertura do caixa.</p>
              </div>
              <div>
                <h3>Por usuario</h3>
                <table><thead><tr><th>Usuario</th><th>Vendas</th><th>Total</th></tr></thead><tbody>{reportByUser.map((item) => <tr key={`${item.user_id || "none"}-${item.user_name}`}><td>{item.user_name}</td><td>{item.sales_count}</td><td>{formatMoney(item.total)}</td></tr>)}</tbody></table>
                <h3 style={{ marginTop: 16 }}>Por item</h3>
                <table><thead><tr><th>Item</th><th>Qtd.</th><th>Total</th></tr></thead><tbody>{reportByItem.map((item) => <tr key={`${item.product_id}-${item.product_name}`}><td>{item.product_name}</td><td>{item.quantity}</td><td>{formatMoney(item.total)}</td></tr>)}</tbody></table>
              </div>
            </div>
          </section>
        )}

        {activeSection === "users" && (
          <section className="stack">
            <div className="panel">
              <h1>Multiplus usuarios</h1>
              <form className="grid-form three" onSubmit={saveUser}>
                <label>Nome<input required value={userForm.nome} onChange={(event) => setUserForm((prev) => ({ ...prev, nome: event.target.value }))} /></label>
                <label>E-mail<input type="email" required value={userForm.email} onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))} /></label>
                <label>
                  Perfil
                  <select value={userForm.permissao} onChange={(event) => setUserForm((prev) => ({ ...prev, permissao: event.target.value as RoleType }))}>
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
                    ))}
                  </select>
                </label>
                <label>Senha {userForm.id > 0 ? "(opcional)" : ""}<input type="password" value={userForm.senha} onChange={(event) => setUserForm((prev) => ({ ...prev, senha: event.target.value }))} /></label>
                <label className="toggle"><input type="checkbox" checked={userForm.ativo} onChange={(event) => setUserForm((prev) => ({ ...prev, ativo: event.target.checked }))} />Usuario ativo</label>
                <div className="full permission-editor">
                  <h3>Permissoes por funcionalidade</h3>
                  <p className="muted">Marque apenas o necessario para este usuario.</p>
                  <div className="permission-grid">
                    {permissionsCatalog.map((permissionKey) => {
                      const meta = permissionUiLabel(permissionKey);
                      const checked = Boolean(userForm.permissions?.[permissionKey]);
                      return (
                        <label key={permissionKey} className="permission-card">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={!can(PERMISSIONS.USERS_MANAGE)}
                            onChange={(event) => setUserPermission(permissionKey, event.target.checked)}
                          />
                          <div className="permission-card-content">
                            <strong>{meta.label}</strong>
                            <span>{meta.description}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="actions-row"><button type="submit" disabled={!can(PERMISSIONS.USERS_MANAGE)}>{userForm.id > 0 ? "Salvar" : "Criar"}</button><button type="button" className="ghost" onClick={() => setUserForm({ id: 0, nome: "", email: "", senha: "", permissao: "EDITOR", ativo: true, permissions: {} })}>Limpar</button></div>
              </form>
            </div>
            <div className="panel">
              <table>
                <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Ultimo login</th><th>Acoes</th></tr></thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.nome}{!user.ativo && <span className="chip">Inativo</span>}</td>
                      <td>{user.email}</td>
                      <td>{ROLE_LABELS[user.permissao as RoleType] || user.permissao}</td>
                      <td>{formatDateTime(user.last_login_at)}</td>
                      <td>
                        <div className="actions-row">
                          <button className="ghost" onClick={() => setUserForm({ id: user.id, nome: user.nome, email: user.email, senha: "", permissao: user.permissao, ativo: user.ativo, permissions: user.permissions || {} })}>Editar</button>
                          <button className="danger" disabled={!can(PERMISSIONS.USERS_MANAGE) || user.id === currentUser.id} onClick={() => void deleteUser(user.id)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeSection === "settings" && (
          <section className="stack">
            <div className="panel">
              <h1>Configuracoes do Caixa EJC</h1>
              <p className="muted">Configure a chave PIX e os dados que aparecem no QR Code.</p>
              <form className="grid-form two" onSubmit={savePixSettingsForm}>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={pixSettings.enabled}
                    disabled={!can(PERMISSIONS.USERS_MANAGE)}
                    onChange={(event) => setPixSettings((prev) => ({ ...prev, enabled: event.target.checked }))}
                  />
                  PIX habilitado
                </label>
                <label>
                  Chave PIX
                  <input
                    placeholder="CPF, e-mail, telefone ou chave aleatoria"
                    value={pixSettings.pix_key}
                    disabled={!can(PERMISSIONS.USERS_MANAGE)}
                    onChange={(event) => setPixSettings((prev) => ({ ...prev, pix_key: event.target.value }))}
                  />
                </label>
                <label>
                  Nome do recebedor
                  <input
                    value={pixSettings.merchant_name}
                    disabled={!can(PERMISSIONS.USERS_MANAGE)}
                    onChange={(event) => setPixSettings((prev) => ({ ...prev, merchant_name: event.target.value }))}
                  />
                </label>
                <label>
                  Cidade
                  <input
                    value={pixSettings.merchant_city}
                    disabled={!can(PERMISSIONS.USERS_MANAGE)}
                    onChange={(event) => setPixSettings((prev) => ({ ...prev, merchant_city: event.target.value }))}
                  />
                </label>
                <label>
                  Descricao padrao do PIX
                  <input
                    value={pixSettings.description}
                    disabled={!can(PERMISSIONS.USERS_MANAGE)}
                    onChange={(event) => setPixSettings((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </label>
                <label>
                  Prefixo do TXID
                  <input
                    value={pixSettings.txid_prefix}
                    disabled={!can(PERMISSIONS.USERS_MANAGE)}
                    onChange={(event) => setPixSettings((prev) => ({ ...prev, txid_prefix: event.target.value }))}
                  />
                </label>
                <div className="actions-row">
                  <button type="submit" disabled={!can(PERMISSIONS.USERS_MANAGE)}>Salvar configuracoes PIX</button>
                  <button type="button" className="ghost" onClick={() => void loadPixSettings().catch((err) => setError(parseError(err)))}>Recarregar</button>
                </div>
              </form>
            </div>
          </section>
        )}

        {activeSection === "audit" && (
          <section className="stack">
            <div className="panel">
              <div className="panel-head">
                <h1>Auditoria</h1>
                <button className="ghost" onClick={() => void loadAudit().catch((err) => setError(parseError(err)))}>Atualizar</button>
              </div>
              <table><thead><tr><th>Data</th><th>Usuario</th><th>Acao</th><th>Recurso</th><th>Resumo</th></tr></thead><tbody>{auditLogs.map((log) => <tr key={log.id}><td>{formatDateTime(log.created_at)}</td><td>{log.user_nome || "-"}</td><td>{log.action}</td><td>{log.resource_type}</td><td>{log.summary}</td></tr>)}</tbody></table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
