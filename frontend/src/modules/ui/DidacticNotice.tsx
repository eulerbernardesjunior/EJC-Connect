type DidacticNoticeProps = {
  message: string;
  error: string;
};

type NoticeTips = {
  title: string;
  tips: string[];
};

function normalizeText(value: string) {
  return String(value || "").toLowerCase().trim();
}

function buildErrorTips(error: string): NoticeTips {
  const text = normalizeText(error);

  if (text.includes("credenciais invalidas") || text.includes("token")) {
    return {
      title: "Não foi possível autenticar",
      tips: [
        "Confira e-mail e senha do usuário.",
        "Se necessário, redefina a senha em Configuração > Usuários.",
        "Após corrigir, tente entrar novamente."
      ]
    };
  }

  if (text.includes("sem cargo definido")) {
    return {
      title: "Importação com linhas sem cargo",
      tips: [
        "Na planilha, coloque uma linha de título de cargo antes dos nomes.",
        "Exemplo: 'Jovens Coordenadores' e abaixo os integrantes.",
        "Evite células mescladas e linhas com apenas nome de equipe/cor."
      ]
    };
  }

  if (text.includes("encounterid") || text.includes("teamid")) {
    return {
      title: "Dados de contexto incompletos",
      tips: [
        "Abra a equipe/círculo a partir do card do encontro.",
        "Refaça a ação na tela correta.",
        "Se o erro persistir, atualize a página e tente novamente."
      ]
    };
  }

  if (text.includes("arquivo") || text.includes("upload")) {
    return {
      title: "Falha no envio do arquivo",
      tips: [
        "Verifique se o arquivo está no formato esperado (imagem ou planilha).",
        "Tente um arquivo menor e sem caracteres especiais no nome.",
        "Após o envio, confirme se a miniatura foi exibida."
      ]
    };
  }

  if (text.includes("sem permissao") || text.includes("acesso negado")) {
    return {
      title: "Permissão insuficiente para esta ação",
      tips: [
        "Solicite ao administrador a permissão necessária.",
        "Para equipe específica, revise o escopo do usuário.",
        "Depois da alteração de permissão, saia e entre novamente."
      ]
    };
  }

  return {
    title: "Ocorreu um erro",
    tips: [
      "Revise os dados preenchidos nesta tela.",
      "Tente novamente a ação.",
      "Se persistir, copie a mensagem e registre para suporte."
    ]
  };
}

function buildSuccessTips(message: string): NoticeTips | null {
  const text = normalizeText(message);

  if (text.includes("importa")) {
    return {
      title: "Importação concluída",
      tips: [
        "Revise os membros agrupados por cargo nesta tela.",
        "Abra a prévia do PDF parcial para validar layout e hierarquia.",
        "Se necessário, use editar em cada membro para ajustes finos."
      ]
    };
  }

  if (text.includes("template") || text.includes("pdf")) {
    return {
      title: "Configuração do PDF salva",
      tips: [
        "Gere um PDF parcial para validar o resultado visual.",
        "Se estiver correto, publique o template no Centro de Templates.",
        "Mantenha um histórico para rollback rápido."
      ]
    };
  }

  if (text.includes("encontro")) {
    return {
      title: "Encontro atualizado",
      tips: [
        "Abra a gestão do encontro para continuar o fluxo.",
        "Confira Equipes, Círculos e Capas antes de gerar o quadrante.",
        "Use o guia de onboarding para seguir a sequência recomendada."
      ]
    };
  }

  return null;
}

export function DidacticNotice({ message, error }: DidacticNoticeProps) {
  if (!message && !error) return null;

  const isError = Boolean(error);
  const content = isError ? buildErrorTips(error) : buildSuccessTips(message);
  if (!content) return null;

  return (
    <div className={`notice-guide ${isError ? "error" : "ok"}`.trim()}>
      <strong>{content.title}</strong>
      <ul>
        {content.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  );
}

