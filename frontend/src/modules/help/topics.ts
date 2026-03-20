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
        <li>Defina nome da equipe e use <strong>Drag and Drop</strong> nos cards para ordenar a impressão no PDF.</li>
        <li>Use <strong>Abrir</strong> para acessar importação, membros e foto.</li>
        <li>As ações dependem das permissões do usuário.</li>
      </ul>
    `
  },
  "circle-list": {
    title: "Ajuda - Círculos",
    html: `
      <p>Cadastro manual e importação geral de círculos.</p>
      <p><strong>Campos do cadastro:</strong> Nome, Cor e Nome escolhido do Círculo.</p>
      <p><strong>Ordem de impressão:</strong> definida por <strong>Drag and Drop</strong> nos cards da lista.</p>
      <p><strong>Como o importador geral funciona:</strong> ele cria/atualiza os círculos e cadastra os membros como <strong>Jovens</strong>.</p>
      <ul>
        <li>Colunas obrigatórias: <strong>NOME</strong> e <strong>CIRCULO</strong> (ou <strong>COR</strong>).</li>
        <li>Colunas opcionais: <strong>TELEFONE/CONTATO/CELULAR</strong> e <strong>PAROQUIA</strong>.</li>
        <li>Se o círculo já existir no encontro, o sistema reaproveita e atualiza a cor quando necessário.</li>
      </ul>
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
      <p><strong>Estrutura base reconhecida no arquivo:</strong></p>
      <table>
        <thead><tr><th>NOME</th><th>TELEFONE</th><th>PAROQUIA</th></tr></thead>
        <tbody>
          <tr><td>Jovens Coordenadores</td><td></td><td></td></tr>
          <tr><td>Ana Paula</td><td>(11) 96666-1000</td><td>Santa Ana</td></tr>
          <tr><td>Tios Coordenadores</td><td></td><td></td></tr>
          <tr><td>Tio João</td><td>(11) 95555-2000</td><td>Santa Ana</td></tr>
          <tr><td>Tia Maria</td><td>(11) 94444-3000</td><td>Santa Ana</td></tr>
        </tbody>
      </table>
      <p><strong>Regras por tipo de importação da equipe:</strong></p>
      <ul>
        <li><strong>Geral:</strong> somente cargos com <strong>Tio/Tios</strong> entram em modo casal; demais cargos entram como individual.</li>
        <li><strong>Sala:</strong> mesma regra da Geral, porém rótulos isolados como <strong>EQUIPE DE SALA</strong> e cores isoladas (<strong>AMARELO, AZUL...</strong>) são ignorados automaticamente.</li>
        <li><strong>Tios Carona:</strong> <strong>Jovens Coordenadores</strong> sempre individual; todos os demais cargos entram em modo casal.</li>
      </ul>
      <p><strong>Observações importantes:</strong></p>
      <ul>
        <li>Linha de cargo deve vir sem telefone.</li>
        <li>Pessoas sem cargo definido geram aviso no resultado da importação.</li>
        <li>Se um bloco de casal terminar com quantidade ímpar, a última pessoa é salva como individual.</li>
      </ul>
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
      <p><strong>Importação no círculo segue a mesma base de equipes:</strong> linha de cargo + linhas de pessoas.</p>
      <table>
        <thead><tr><th>NOME</th><th>TELEFONE</th><th>PAROQUIA</th></tr></thead>
        <tbody>
          <tr><td>Tios Circulistas</td><td></td><td></td></tr>
          <tr><td>Tio Carlos</td><td>(11) 93333-4000</td><td>Santa Ana</td></tr>
          <tr><td>Tia Paula</td><td>(11) 92222-5000</td><td>Santa Ana</td></tr>
          <tr><td>Jovem Circulista</td><td></td><td></td></tr>
          <tr><td>Bruno Alves</td><td>(11) 91111-6000</td><td>São José</td></tr>
        </tbody>
      </table>
      <ul>
        <li>Cargos com <strong>Tio/Tios</strong> entram em modo casal.</li>
        <li>Cargos sem <strong>Tio/Tios</strong> entram como individual.</li>
        <li><strong>Jovem Circulista</strong> deve estar em cargo próprio para ir ao quadro de liderança no PDF.</li>
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
