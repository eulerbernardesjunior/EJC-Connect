export type HelpTopicKey =
  | "dashboard"
  | "encounters"
  | "encounter-hub"
  | "team-list"
  | "circle-list"
  | "team-detail"
  | "circle-detail"
  | "assets"
  | "settings"
  | "default";

export type HelpTopic = {
  title: string;
  html: string;
};

export const HELP_TOPICS: Record<HelpTopicKey, HelpTopic> = {
  dashboard: {
    title: "Ajuda - Dashboard",
    html: `
      <p>Resumo operacional do sistema e da etapa atual do encontro.</p>
      <ul>
        <li>Use o filtro para ver números por encontro.</li>
        <li>Acompanhe totais de equipes, círculos, artes e membros.</li>
        <li>Siga o Guia rápido para completar o fluxo sem pular etapas.</li>
      </ul>
    `
  },
  encounters: {
    title: "Ajuda - Encontros",
    html: `
      <p>Cadastro e gestão inicial de encontros.</p>
      <ul>
        <li><strong>Cadastrar encontro:</strong> Nome, Data de início e Data de fim.</li>
        <li><strong>Editar:</strong> ajuste nome e datas no próprio card.</li>
        <li><strong>Abrir gestão:</strong> navega para Equipes, Círculos e Capas.</li>
      </ul>
    `
  },
  "encounter-hub": {
    title: "Ajuda - Gestão do Encontro",
    html: `
      <p>Painel central para o encontro selecionado.</p>
      <ul>
        <li><strong>Equipes:</strong> ordem de impressão, foto da equipe e integrantes.</li>
        <li><strong>Círculos:</strong> cor, nome escolhido do Círculo, cartaz e integrantes.</li>
        <li><strong>Capas e separadores:</strong> artes A4 usadas no PDF.</li>
      </ul>
    `
  },
  "team-list": {
    title: "Ajuda - Equipes",
    html: `
      <p>Gestão das equipes de trabalho.</p>
      <ul>
        <li>Defina nome e ordem de impressão no PDF.</li>
        <li>Use <strong>Abrir</strong> para acessar importação, membros e foto.</li>
        <li>As ações dependem das permissões do usuário.</li>
      </ul>
    `
  },
  "circle-list": {
    title: "Ajuda - Círculos",
    html: `
      <p>Cadastro manual e importação geral de círculos.</p>
      <p><strong>Campos do cadastro:</strong> Nome, Ordem, Cor e Nome escolhido do Círculo.</p>
      <p><strong>Exemplo de planilha (importação geral):</strong></p>
      <table>
        <thead><tr><th>NOME</th><th>CIRCULO/COR</th><th>TELEFONE</th><th>PAROQUIA</th></tr></thead>
        <tbody>
          <tr><td>Maria Santos</td><td>AZUL</td><td>(11) 98888-1111</td><td>Santa Ana</td></tr>
          <tr><td>João Lima</td><td>AMARELO</td><td>(11) 97777-2222</td><td>São José</td></tr>
        </tbody>
      </table>
    `
  },
  "team-detail": {
    title: "Ajuda - Detalhe da Equipe",
    html: `
      <p>Gestão completa da equipe.</p>
      <ul>
        <li>Foto da equipe com crop 15x10.</li>
        <li>Cadastro manual de membros por cargo.</li>
        <li>Importação XLSX/CSV com agrupamento por cargo.</li>
        <li>Prévia de PDF parcial da equipe.</li>
      </ul>
      <p><strong>Regra de casais:</strong> cargos com "Tio/Tios" podem ser pareados automaticamente.</p>
    `
  },
  "circle-detail": {
    title: "Ajuda - Detalhe do Círculo",
    html: `
      <p>Gestão completa do círculo.</p>
      <ul>
        <li>Cartaz do círculo com crop A4.</li>
        <li>Fotos individuais (lideranças e participantes).</li>
        <li>Importação e cadastro manual agrupados por cargo.</li>
      </ul>
      <p>Use o campo <strong>Nome escolhido do Círculo</strong> para personalizar a identidade no PDF.</p>
    `
  },
  assets: {
    title: "Ajuda - Capas e Artes A4",
    html: `
      <p>Cadastro de artes de página inteira do quadrante.</p>
      <ul>
        <li>Tipos: capa, separadores, cartazes, música tema, convite e contra capa.</li>
        <li>A ordem define a sequência no PDF.</li>
        <li>Uploads passam por crop A4 para padronização visual.</li>
      </ul>
    `
  },
  settings: {
    title: "Ajuda - Configurações",
    html: `
      <p>Central de administração do sistema.</p>
      <ul>
        <li><strong>Usuários:</strong> permissões por funcionalidade e escopo por equipe.</li>
        <li><strong>Título PDF:</strong> fonte padrão, fonte customizada ou arte por equipe.</li>
        <li><strong>Templates PDF:</strong> selecione um template, edite os campos e salve para aplicar no PDF.</li>
        <li><strong>Auditoria:</strong> registro de ações por usuário e encontro.</li>
      </ul>
    `
  },
  default: {
    title: "Ajuda do Sistema",
    html: `
      <p>Fluxo recomendado: Encontros -> Equipes/Círculos -> Capas/Artes -> PDF.</p>
      <p>Use o botão <strong>?</strong> em cada tela para orientação contextual.</p>
    `
  }
};

export function resolveHelpTopic(pathname: string): HelpTopicKey {
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.match(/^\/encounters\/\d+\/teams\/\d+/)) return "team-detail";
  if (pathname.match(/^\/encounters\/\d+\/circles\/\d+/)) return "circle-detail";
  if (pathname.match(/^\/encounters\/\d+\/teams$/)) return "team-list";
  if (pathname.match(/^\/encounters\/\d+\/circles$/)) return "circle-list";
  if (pathname.match(/^\/encounters\/\d+\/assets$/)) return "assets";
  if (pathname.match(/^\/encounters\/\d+$/)) return "encounter-hub";
  if (pathname.startsWith("/encounters")) return "encounters";
  return "default";
}
