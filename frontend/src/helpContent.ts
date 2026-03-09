export type HelpTopic =
  | "LOGIN"
  | "DASHBOARD"
  | "ENCOUNTERS"
  | "ENCOUNTER_HUB"
  | "TEAM_LIST"
  | "CIRCLE_LIST"
  | "TEAM_DETAIL"
  | "CIRCLE_DETAIL"
  | "ASSETS"
  | "SETTINGS_USERS"
  | "SETTINGS_PDF"
  | "SETTINGS_AUDIT";

export type HelpSection = {
  title: string;
  html: string;
};

export type HelpContent = {
  title: string;
  subtitle: string;
  sections: HelpSection[];
};

const HELP_CONTENT: Record<HelpTopic, HelpContent> = {
  LOGIN: {
    title: "Ajuda: Login",
    subtitle: "Acesso seguro ao painel administrativo.",
    sections: [
      {
        title: "Como entrar",
        html: `
          <p>Informe <strong>e-mail</strong> e <strong>senha</strong> cadastrados em Configurações &gt; Usuários.</p>
          <p>Se a senha falhar, peça ao administrador para redefinir as credenciais.</p>
        `
      },
      {
        title: "Boas práticas",
        html: `
          <ul>
            <li>Use usuários individuais por pessoa (evite conta compartilhada).</li>
            <li>Finalize a sessão com o botão <strong>Sair</strong> na barra lateral.</li>
            <li>Permissões são aplicadas automaticamente conforme o perfil do usuário.</li>
          </ul>
        `
      }
    ]
  },
  DASHBOARD: {
    title: "Ajuda: Dashboard",
    subtitle: "Visão rápida de volume cadastrado por encontro.",
    sections: [
      {
        title: "O que aparece",
        html: `
          <ul>
            <li>Total de encontros.</li>
            <li>Total de equipes e círculos.</li>
            <li>Total de capas/cartazes enviados.</li>
            <li>Total de membros cadastrados/importados.</li>
          </ul>
        `
      },
      {
        title: "Filtro por encontro",
        html: `
          <p>Use o seletor de encontro no topo para ver os números de um encontro específico.</p>
          <p>Selecione <strong>Todos os encontros</strong> para voltar ao consolidado geral.</p>
        `
      }
    ]
  },
  ENCOUNTERS: {
    title: "Ajuda: Encontros",
    subtitle: "Cadastro e abertura da gestão completa de cada encontro.",
    sections: [
      {
        title: "Novo encontro",
        html: `
          <p>Preencha <strong>Nome</strong>, <strong>Data de início</strong> e <strong>Data de fim</strong>.</p>
          <p>Após cadastrar, use o card do encontro para abrir a gestão em telas separadas.</p>
        `
      },
      {
        title: "Ações no card",
        html: `
          <ul>
            <li><strong>Abrir gestão</strong>: acessa Equipes, Círculos e Capas.</li>
            <li><strong>Quadrante</strong>: gera PDF completo do encontro.</li>
            <li><strong>Excluir</strong>: remove o encontro e seus dados vinculados.</li>
          </ul>
        `
      }
    ]
  },
  ENCOUNTER_HUB: {
    title: "Ajuda: Gestão do Encontro",
    subtitle: "Ponto central para navegar por módulos do encontro selecionado.",
    sections: [
      {
        title: "Cards disponíveis",
        html: `
          <ul>
            <li><strong>Equipes</strong>: cadastro, ordem e integrantes por equipe.</li>
            <li><strong>Círculos</strong>: cadastro com cor/slogan e liderança.</li>
            <li><strong>Capas e separadores</strong>: artes A4 para o PDF.</li>
          </ul>
        `
      },
      {
        title: "Fluxo recomendado",
        html: `
          <p>1) Cadastre as equipes/círculos e ordem de impressão.</p>
          <p>2) Importe ou digite os membros.</p>
          <p>3) Envie artes A4.</p>
          <p>4) Gere o quadrante final.</p>
        `
      }
    ]
  },
  TEAM_LIST: {
    title: "Ajuda: Equipes",
    subtitle: "Criação e ordenação das equipes de trabalho.",
    sections: [
      {
        title: "Cadastro e ordem",
        html: `
          <p>Defina o nome da equipe e a <strong>ordem de impressão</strong> no PDF.</p>
          <p>Use <strong>Abrir</strong> para entrar na tela detalhada e gerenciar membros/fotos/importação.</p>
        `
      },
      {
        title: "Edição",
        html: `
          <ul>
            <li><strong>Editar</strong>: carrega os dados da equipe no formulário.</li>
            <li><strong>Excluir</strong>: remove equipe e dados associados.</li>
            <li><strong>Ordem menor</strong>: imprime antes no quadrante.</li>
          </ul>
        `
      }
    ]
  },
  CIRCLE_LIST: {
    title: "Ajuda: Círculos",
    subtitle: "Cadastro de círculos e importação geral por planilha.",
    sections: [
      {
        title: "Cadastro manual",
        html: `
          <p>Preencha <strong>Nome</strong>, <strong>Ordem</strong>, <strong>Cor</strong> e <strong>Slogan</strong>.</p>
          <p>Use <strong>Abrir</strong> para cadastrar liderança, jovens e cartaz do círculo.</p>
        `
      },
      {
        title: "Importação geral de círculos",
        html: `
          <p>O importador geral reconhece as colunas <strong>NOME</strong> e <strong>CIRCULO</strong> (ou <strong>COR</strong>).</p>
          <p>Colunas <strong>TELEFONE</strong> e <strong>PAROQUIA</strong> são opcionais.</p>
          <table class="help-table">
            <thead>
              <tr>
                <th>NOME</th>
                <th>CIRCULO/COR</th>
                <th>TELEFONE</th>
                <th>PAROQUIA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Maria Santos</td>
                <td>AMARELO</td>
                <td>(11) 98888-1111</td>
                <td>Santa Ana</td>
              </tr>
              <tr>
                <td>João Lima</td>
                <td>Círculo Azul</td>
                <td>(11) 97777-2222</td>
                <td>São José</td>
              </tr>
            </tbody>
          </table>
          <p>Nesse modo, os membros entram com cargo <strong>Jovens</strong> automaticamente.</p>
        `
      }
    ]
  },
  TEAM_DETAIL: {
    title: "Ajuda: Detalhe da Equipe",
    subtitle: "Gestão completa de membros, importação e foto da equipe.",
    sections: [
      {
        title: "Operação da tela",
        html: `
          <ul>
            <li>Envie foto da equipe (crop 15x10).</li>
            <li>Cadastre membros manualmente ou por planilha.</li>
            <li>Edite/exclua membros por cargo.</li>
            <li>Use <strong>Visualizar quadrante da equipe</strong> para PDF parcial.</li>
          </ul>
        `
      },
      {
        title: "Formato de importação reconhecido",
        html: `
          <p>Estrutura recomendada: bloco por cargo e linhas de pessoas.</p>
          <table class="help-table">
            <thead>
              <tr>
                <th>NOME</th>
                <th>TELEFONE</th>
                <th>PAROQUIA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Jovens Coordenadores</td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>Ana Paula</td>
                <td>(11) 96666-1000</td>
                <td>Santa Ana</td>
              </tr>
              <tr>
                <td>Tios Coordenadores</td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>Tio João</td>
                <td>(11) 95555-2000</td>
                <td>Santa Ana</td>
              </tr>
              <tr>
                <td>Tia Maria</td>
                <td>(11) 94444-3000</td>
                <td>Santa Ana</td>
              </tr>
            </tbody>
          </table>
          <p><strong>Regra de casal:</strong> somente cargos contendo <strong>Tio/Tios</strong> entram em pareamento automático (duas linhas consecutivas formam um casal).</p>
          <p><strong>Exceção Tios Carona:</strong> nessa equipe, apenas <strong>Jovens Coordenadores</strong> ficam individuais; demais cargos entram como casal.</p>
        `
      }
    ]
  },
  CIRCLE_DETAIL: {
    title: "Ajuda: Detalhe do Círculo",
    subtitle: "Gestão de liderança, jovens, cartaz A4 e fotos individuais.",
    sections: [
      {
        title: "Operação da tela",
        html: `
          <ul>
            <li>Envie o cartaz do círculo (crop A4).</li>
            <li>Cadastre/importe membros e mantenha agrupamento por cargo.</li>
            <li>Envie foto dos membros para uso no PDF.</li>
            <li>Use o botão de quadrante para gerar PDF parcial do círculo.</li>
          </ul>
        `
      },
      {
        title: "Importação de membros do círculo",
        html: `
          <p>O importador segue o mesmo padrão de equipes: título de cargo + linhas de pessoas.</p>
          <table class="help-table">
            <thead>
              <tr>
                <th>NOME</th>
                <th>TELEFONE</th>
                <th>PAROQUIA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Tios Circulistas</td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>Tio Carlos</td>
                <td>(11) 93333-4000</td>
                <td>Santa Ana</td>
              </tr>
              <tr>
                <td>Tia Paula</td>
                <td>(11) 92222-5000</td>
                <td>Santa Ana</td>
              </tr>
              <tr>
                <td>Jovem Circulista</td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>Bruno Alves</td>
                <td>(11) 91111-6000</td>
                <td>São José</td>
              </tr>
            </tbody>
          </table>
          <p><strong>Atenção:</strong> cargos sem "Tio/Tios" são tratados como individuais.</p>
        `
      }
    ]
  },
  ASSETS: {
    title: "Ajuda: Capas e Artes A4",
    subtitle: "Upload de capa, separadores, cartazes e contracapa.",
    sections: [
      {
        title: "Como enviar",
        html: `
          <p>Selecione <strong>Tipo</strong>, <strong>Ordem</strong>, <strong>Título</strong> (opcional) e o arquivo.</p>
          <p>Ao enviar, o sistema abre o crop em proporção A4 para padronizar o PDF.</p>
        `
      },
      {
        title: "Sequência recomendada no PDF",
        html: `
          <ol>
            <li>Capa</li>
            <li>Separador de Círculos</li>
            <li>Cartazes de Círculo</li>
            <li>Separador de Equipes</li>
            <li>Letra da música tema</li>
            <li>Convite pós-encontro</li>
            <li>Contra capa</li>
          </ol>
          <p>Use o campo <strong>Ordem</strong> para controlar a sequência entre itens do mesmo tipo.</p>
        `
      }
    ]
  },
  SETTINGS_USERS: {
    title: "Ajuda: Configuração de Usuários",
    subtitle: "Cadastro simples com controle robusto de permissões.",
    sections: [
      {
        title: "Cadastro",
        html: `
          <ul>
            <li>Defina nome, e-mail, senha e papel (ADMIN, EDITOR, VISUALIZADOR).</li>
            <li>Marque/desmarque permissões específicas por funcionalidade.</li>
            <li>Use <strong>Usuário ativo</strong> para bloquear acesso sem excluir.</li>
          </ul>
        `
      },
      {
        title: "Segurança e operação",
        html: `
          <p>Prefira perfis mínimos por usuário. Dê acesso de escrita apenas para quem precisa alterar dados.</p>
          <p>Em edição, a senha é opcional e só deve ser preenchida quando houver troca de credencial.</p>
        `
      }
    ]
  },
  SETTINGS_PDF: {
    title: "Ajuda: Título PDF",
    subtitle: "Personalização do estilo do nome da equipe no quadrante.",
    sections: [
      {
        title: "Modos disponíveis",
        html: `
          <ul>
            <li><strong>Fonte padrão</strong>: usa o estilo nativo do sistema.</li>
            <li><strong>Fonte personalizada</strong>: upload de .ttf/.otf/.woff/.woff2.</li>
            <li><strong>Arte por equipe</strong>: habilita upload de arte na tela da equipe.</li>
          </ul>
        `
      },
      {
        title: "Quando usar cada modo",
        html: `
          <p>Use fonte personalizada quando quiser padronização tipográfica global.</p>
          <p>Use arte por equipe quando cada equipe terá identidade visual própria no título.</p>
        `
      }
    ]
  },
  SETTINGS_AUDIT: {
    title: "Ajuda: Auditoria",
    subtitle: "Rastreamento das ações por usuário sem exclusão manual.",
    sections: [
      {
        title: "O que é registrado",
        html: `
          <p>Ações de criação, atualização, exclusão, upload e importação, com usuário, horário e resumo técnico.</p>
          <p>Use filtros por encontro, usuário, ação e recurso para investigação rápida.</p>
        `
      },
      {
        title: "Leitura dos detalhes",
        html: `
          <p>Abra <strong>Detalhes técnicos</strong> para ver payloads e metadados úteis para suporte e validação.</p>
          <p>Use paginação para navegar em períodos longos.</p>
        `
      }
    ]
  }
};

export function getHelpContent(topic: HelpTopic): HelpContent {
  return HELP_CONTENT[topic];
}
