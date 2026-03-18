import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const ONBOARDING_STATE_KEY = "ejc_onboarding_state_v1";
const ONBOARDING_HIDDEN_KEY = "ejc_onboarding_hidden_v1";

type Step = {
  id: string;
  title: string;
  hint: string;
  to: string;
};

const STEPS: Step[] = [
  {
    id: "encounter",
    title: "1) Criar encontro",
    hint: "Cadastre nome e período do encontro.",
    to: "/encounters"
  },
  {
    id: "teams",
    title: "2) Montar equipes e círculos",
    hint: "Defina ordem de impressão e dados básicos.",
    to: "/encounters"
  },
  {
    id: "import",
    title: "3) Importar ou cadastrar membros",
    hint: "Revise cargos e casais após a importação.",
    to: "/encounters"
  },
  {
    id: "assets",
    title: "4) Enviar capas e cartazes",
    hint: "Use crop A4 e confirme as miniaturas.",
    to: "/encounters"
  },
  {
    id: "pdf",
    title: "5) Gerar prévia e quadrante final",
    hint: "Valide conteúdo e visual antes da impressão.",
    to: "/encounters"
  },
  {
    id: "templates",
    title: "6) Publicar template visual",
    hint: "No Centro de Templates, publique quando aprovado.",
    to: "/settings"
  }
];

function readState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(ONBOARDING_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeState(state: Record<string, boolean>) {
  localStorage.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state));
}

export function OnboardingGuide() {
  const [hidden, setHidden] = useState(() => localStorage.getItem(ONBOARDING_HIDDEN_KEY) === "1");
  const [checks, setChecks] = useState<Record<string, boolean>>(() => readState());

  const progress = useMemo(() => {
    const done = STEPS.filter((step) => Boolean(checks[step.id])).length;
    return { done, total: STEPS.length };
  }, [checks]);

  if (hidden) {
    return (
      <div className="panel onboarding-mini">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            localStorage.setItem(ONBOARDING_HIDDEN_KEY, "0");
            setHidden(false);
          }}
        >
          Mostrar guia rápido de onboarding
        </button>
      </div>
    );
  }

  return (
    <div className="panel onboarding-panel">
      <div className="panel-head">
        <h2>Guia rápido de uso</h2>
        <button
          type="button"
          className="ghost"
          onClick={() => {
            localStorage.setItem(ONBOARDING_HIDDEN_KEY, "1");
            setHidden(true);
          }}
        >
          Ocultar
        </button>
      </div>
      <p className="muted">
        Trilha recomendada para usuários leigos e avançados. Progresso: {progress.done}/{progress.total}.
      </p>
      <div className="onboarding-list">
        {STEPS.map((step) => (
          <article key={step.id} className="onboarding-item">
            <label className="toggle permission-toggle">
              <input
                type="checkbox"
                checked={Boolean(checks[step.id])}
                onChange={(event) => {
                  const next = { ...checks, [step.id]: event.target.checked };
                  setChecks(next);
                  writeState(next);
                }}
              />
              <span className="permission-meta">
                <strong>{step.title}</strong>
                <small>{step.hint}</small>
              </span>
            </label>
            <Link className="as-btn" to={step.to}>
              Abrir
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

