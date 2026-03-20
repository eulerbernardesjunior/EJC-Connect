import { env } from "../config/env.js";

let cachedManualPdf = null;

function buildManualHtml() {
  const today = new Date().toLocaleDateString("pt-BR");
  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Manual Operacional - EJC Connect</title>
    <style>
      @page { size: A4; margin: 15mm 14mm 16mm 14mm; }
      body {
        font-family: "Montserrat", Arial, sans-serif;
        color: #1f2937;
        font-size: 10.8pt;
        line-height: 1.55;
      }
      h1, h2, h3 { margin: 0 0 8px; color: #7a1332; }
      h1 { font-size: 20pt; margin-bottom: 4px; }
      h2 {
        font-size: 13.8pt;
        margin-top: 16px;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 4px;
      }
      h3 { font-size: 11.8pt; margin-top: 12px; }
      p { margin: 0 0 8px; }
      ol, ul { margin: 0 0 10px 20px; }
      li { margin: 0 0 4px; }
      .cover {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 14px;
        background: #fcfcfd;
      }
      .meta { color: #4b5563; font-size: 9.2pt; margin-top: 4px; }
      .block {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 10px;
        margin: 10px 0;
      }
      .tip {
        border-left: 4px solid #7a1332;
        padding: 8px 10px;
        margin: 10px 0;
        background: #fdf4f7;
      }
      .warn {
        border-left: 4px solid #ad3b00;
        padding: 8px 10px;
        margin: 10px 0;
        background: #fff6f1;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 8px 0 12px;
        font-size: 9.6pt;
      }
      th, td {
        border: 1px solid #d1d5db;
        padding: 6px;
        text-align: left;
        vertical-align: top;
      }
      th { background: #f3f4f6; }
      .small { font-size: 8.8pt; color: #6b7280; }
      .kbd {
        display: inline-block;
        border: 1px solid #cfd4dc;
        border-bottom-width: 2px;
        border-radius: 4px;
        padding: 1px 4px;
        font-size: 8.8pt;
        background: #f8fafc;
      }
    </style>
  </head>
  <body>
    <section class="cover">
      <h1>Manual Operacional Completo</h1>
      <h2 style="border:0; margin:0 0 8px; padding:0;">EJC Connect (Quadrante)</h2>
      <p>Este documento foi escrito em linguagem extremamente didática e com padrão corporativo.</p>
      <p>Objetivo: permitir que qualquer usuário execute o sistema sem dúvida, passo a passo, com segurança.</p>
      <p class="meta">Versão do manual: 2.0 | Data de geração: ${today}</p>
    </section>

    <h2>1. Antes de começar</h2>
    <div class="block">
      <p><strong>O que você precisa ter:</strong></p>
      <ul>
        <li>Usuário e senha válidos no sistema.</li>
        <li>Arquivos de planilha (quando for importar): <strong>.xlsx, .xls, .csv</strong>.</li>
        <li>Imagens das capas/cartazes/fotos para upload.</li>
      </ul>
    </div>
    <div class="tip">
      <strong>Regra principal de operação:</strong> siga a ordem da configuração do encontro. Isso evita retrabalho e erros no PDF final.
    </div>

    <h2>2. Estrutura da interface (o que cada botão faz)</h2>
    <p>Na barra lateral esquerda, você verá os itens abaixo.</p>
    <table>
      <thead>
        <tr><th>Item</th><th>Função</th></tr>
      </thead>
      <tbody>
        <tr><td>Dashboard</td><td>Mostra números gerais do sistema ou do encontro filtrado.</td></tr>
        <tr><td>Encontros</td><td>Cadastro de encontros e acesso à gestão completa de cada encontro.</td></tr>
        <tr><td>Configuração</td><td>Usuários, permissões, templates e auditoria.</td></tr>
        <tr><td>Sair</td><td>Encerra a sessão com segurança.</td></tr>
        <tr><td>Baixar manual</td><td>Faz download deste documento em PDF.</td></tr>
        <tr><td>Tema claro/escuro</td><td>Altera apenas aparência da tela.</td></tr>
      </tbody>
    </table>

    <h2>3. Login (passo a passo por clique)</h2>
    <ol>
      <li>Acesse o endereço do sistema no navegador.</li>
      <li>Na tela de login, clique no campo <strong>E-mail</strong> e digite seu e-mail.</li>
      <li>Clique no campo <strong>Senha</strong> e digite sua senha.</li>
      <li>Clique no botão <strong>Entrar</strong>.</li>
      <li>Se estiver correto, você entra no sistema.</li>
      <li>Se der erro 401/credencial inválida, confirme e-mail/senha e tente novamente.</li>
    </ol>

    <h2>4. Criar encontro (passo a passo completo)</h2>
    <ol>
      <li>Clique em <strong>Encontros</strong> no menu lateral.</li>
      <li>No card <strong>Novo encontro</strong>, clique em <strong>Nome do encontro</strong> e preencha.</li>
      <li>Clique em <strong>Data de início</strong> e selecione a data correta.</li>
      <li>Clique em <strong>Data de fim</strong> e selecione a data correta.</li>
      <li>Clique no botão <strong>Cadastrar encontro</strong>.</li>
      <li>Confirme se o encontro apareceu na lista de cards abaixo.</li>
    </ol>

    <h3>4.1 Editar encontro existente</h3>
    <ol>
      <li>No card do encontro, clique em <strong>Editar</strong>.</li>
      <li>Os dados sobem para o formulário do encontro.</li>
      <li>Atualize nome ou datas.</li>
      <li>Clique em <strong>Salvar edição</strong>.</li>
    </ol>

    <h3>4.2 Excluir encontro</h3>
    <ol>
      <li>No card do encontro, clique em <strong>Excluir</strong>.</li>
      <li>Confirme a exclusão no alerta.</li>
      <li>Atenção: esta ação remove dados relacionados ao encontro.</li>
    </ol>

    <h2>5. Abrir gestão do encontro</h2>
    <ol>
      <li>No card do encontro desejado, clique em <strong>Abrir gestão</strong>.</li>
      <li>Você verá os cards de módulos: <strong>Equipes</strong>, <strong>Círculos</strong> e <strong>Capas</strong>.</li>
      <li>Entre em cada módulo para preencher os dados.</li>
    </ol>

    <h2>6. Módulo Equipes (lista)</h2>
    <h3>6.1 Criar equipe</h3>
    <ol>
      <li>Clique no card <strong>Equipes</strong>.</li>
      <li>No formulário de equipe, digite o <strong>Nome</strong>.</li>
      <li>Preencha a <strong>Ordem</strong> (número inteiro).</li>
      <li>Clique em <strong>Criar</strong>.</li>
    </ol>

    <h3>6.2 Editar equipe</h3>
    <ol>
      <li>No card da equipe, clique em <strong>Editar</strong>.</li>
      <li>Altere nome e/ou ordem.</li>
      <li>Clique em <strong>Salvar edição</strong>.</li>
    </ol>

    <h3>6.3 Excluir equipe</h3>
    <ol>
      <li>No card da equipe, clique em <strong>Excluir</strong>.</li>
      <li>Confirme no alerta.</li>
    </ol>

    <h3>6.4 Abrir detalhe da equipe</h3>
    <ol>
      <li>No card da equipe, clique em <strong>Abrir</strong>.</li>
      <li>Você entrará na tela de detalhe para fotos, importação e membros.</li>
    </ol>

    <h2>7. Tela Detalhe da Equipe (tutorial por área)</h2>
    <h3>7.1 Enviar foto da equipe</h3>
    <ol>
      <li>Na área de foto, clique em <strong>Enviar foto (crop 15x10)</strong>.</li>
      <li>Selecione a imagem no seu computador.</li>
      <li>No modal de recorte, ajuste a área desejada.</li>
      <li>Clique em <strong>Aplicar crop e enviar</strong>.</li>
      <li>Aguarde o aviso de sucesso.</li>
    </ol>

    <h3>7.2 Importar membros por planilha</h3>
    <ol>
      <li>Na área <strong>Importação de Excel/CSV</strong>, clique em <strong>Arquivo</strong>.</li>
      <li>Selecione o arquivo.</li>
      <li>Clique em <strong>Importar dados</strong>.</li>
      <li>Leia o retorno: total importado, casais, individuais e erros.</li>
    </ol>

    <h3>7.3 Cadastrar membro manualmente</h3>
    <ol>
      <li>No bloco <strong>Adicionar membro</strong>, preencha:
        <ul>
          <li>Cargo</li>
          <li>Nome principal</li>
          <li>Nome secundário (somente se casal)</li>
          <li>Telefone principal</li>
          <li>Telefone secundário (se casal)</li>
          <li>Paróquia</li>
        </ul>
      </li>
      <li>Clique em <strong>Adicionar membro</strong>.</li>
    </ol>

    <h3>7.4 Editar membro (modal)</h3>
    <ol>
      <li>No card do membro, clique em <strong>Editar</strong>.</li>
      <li>Abre modal com dados atuais.</li>
      <li>Altere os campos necessários.</li>
      <li>Clique em <strong>Salvar edição</strong>.</li>
      <li>Para cancelar, clique em <strong>Cancelar</strong> ou fora do modal.</li>
    </ol>

    <h3>7.5 Excluir membro</h3>
    <ol>
      <li>No card do membro, clique em <strong>Excluir</strong>.</li>
      <li>Confirme no alerta.</li>
    </ol>

    <h3>7.6 Enviar foto do membro</h3>
    <ol>
      <li>No card do membro, clique em <strong>Enviar foto</strong> ou <strong>Trocar foto</strong>.</li>
      <li>Selecione imagem.</li>
      <li>No modal de crop, ajuste e clique em <strong>Aplicar crop e enviar</strong>.</li>
    </ol>

    <h3>7.7 Prévia PDF da equipe</h3>
    <ol>
      <li>No topo da tela da equipe, clique em <strong>Visualizar quadrante da equipe</strong>.</li>
      <li>Uma nova aba abrirá com o PDF parcial dessa equipe.</li>
    </ol>

    <h2>8. Importações de equipes (regras oficiais)</h2>
    <p>Estrutura base da planilha de equipe:</p>
    <table>
      <thead>
        <tr><th>NOME</th><th>TELEFONE</th><th>PAROQUIA</th></tr>
      </thead>
      <tbody>
        <tr><td>Jovens Coordenadores</td><td></td><td></td></tr>
        <tr><td>Ana Paula</td><td>(11) 96666-1000</td><td>Santa Ana</td></tr>
        <tr><td>Tios Coordenadores</td><td></td><td></td></tr>
        <tr><td>Tio João</td><td>(11) 95555-2000</td><td>Santa Ana</td></tr>
        <tr><td>Tia Maria</td><td>(11) 94444-3000</td><td>Santa Ana</td></tr>
      </tbody>
    </table>

    <h3>8.1 Perfil Geral</h3>
    <ul>
      <li>Cargos com <strong>Tio/Tios</strong>: sistema ativa modo casal.</li>
      <li>Cargos sem <strong>Tio/Tios</strong>: sistema salva individual.</li>
    </ul>

    <h3>8.2 Perfil Sala</h3>
    <ul>
      <li>Mesma regra de casal da equipe Geral.</li>
      <li>Linhas isoladas de rótulo (ex.: <strong>EQUIPE DE SALA</strong>) são ignoradas.</li>
      <li>Linhas isoladas de cores (ex.: <strong>AMARELO</strong>, <strong>AZUL</strong>) são ignoradas.</li>
    </ul>

    <h3>8.3 Perfil Tios Carona</h3>
    <ul>
      <li><strong>Jovens Coordenadores</strong> é sempre individual.</li>
      <li>Todos os demais cargos entram em modo casal.</li>
    </ul>

    <div class="warn">
      <strong>Importante:</strong> se aparecer aviso “Membro X sem cargo definido”, significa que a linha de pessoa veio antes da linha de cargo.
    </div>

    <h2>9. Módulo Círculos (lista)</h2>
    <h3>9.1 Criar círculo</h3>
    <ol>
      <li>Clique no card <strong>Círculos</strong>.</li>
      <li>Preencha:
        <ul>
          <li>Nome</li>
          <li>Ordem</li>
          <li>Cor (hex)</li>
          <li>Nome escolhido do Círculo</li>
        </ul>
      </li>
      <li>Clique em <strong>Criar</strong>.</li>
    </ol>

    <h3>9.2 Importação geral de círculos (lote)</h3>
    <ol>
      <li>Na tela principal de círculos, na área de importação geral, selecione o arquivo.</li>
      <li>Clique em <strong>Importar todos os círculos</strong>.</li>
      <li>Leia o resumo: círculos criados, membros criados e eventuais erros.</li>
    </ol>

    <table>
      <thead>
        <tr><th>NOME</th><th>CIRCULO/COR</th><th>TELEFONE</th><th>PAROQUIA</th></tr>
      </thead>
      <tbody>
        <tr><td>Maria Santos</td><td>AMARELO</td><td>(11) 98888-1111</td><td>Santa Ana</td></tr>
        <tr><td>João Lima</td><td>AZUL</td><td>(11) 97777-2222</td><td>São José</td></tr>
      </tbody>
    </table>

    <h3>9.3 Abrir detalhe do círculo</h3>
    <ol>
      <li>No card do círculo, clique em <strong>Abrir</strong>.</li>
      <li>Você entra na tela de cartaz, membros e fotos.</li>
    </ol>

    <h2>10. Tela Detalhe do Círculo</h2>
    <h3>10.1 Cartaz do círculo</h3>
    <ol>
      <li>Clique em <strong>Enviar cartaz (crop A4)</strong>.</li>
      <li>Selecione imagem.</li>
      <li>Faça recorte e clique em <strong>Aplicar crop e enviar</strong>.</li>
    </ol>

    <h3>10.2 Membros e liderança</h3>
    <ol>
      <li>Cadastre manualmente ou importe planilha no mesmo padrão por cargo.</li>
      <li>Envie foto individual quando necessário.</li>
      <li>Para liderança no PDF, use cargos corretos:
        <ul>
          <li><strong>Tios Circulistas</strong></li>
          <li><strong>Jovem Circulista</strong></li>
        </ul>
      </li>
    </ol>

    <h2>11. Módulo Capas e Artes</h2>
    <ol>
      <li>Acesse o card <strong>Capas</strong> dentro da gestão do encontro.</li>
      <li>Preencha tipo, ordem, título (opcional).</li>
      <li>Selecione arquivo e faça crop A4 quando solicitado.</li>
      <li>Salve o asset.</li>
      <li>Repita para todos os itens necessários.</li>
    </ol>
    <p>Ordem recomendada de peças no PDF:</p>
    <ol>
      <li>Capa</li>
      <li>Separador de Círculos</li>
      <li>Cartaz do Círculo</li>
      <li>Dados do Círculo</li>
      <li>Separador de Equipes</li>
      <li>Dados da Equipe</li>
      <li>Letra da música tema</li>
      <li>Convite pós-encontro</li>
      <li>Contra capa</li>
    </ol>

    <h2>12. Configuração (administração)</h2>
    <h3>12.1 Usuários e permissões</h3>
    <ol>
      <li>Acesse <strong>Configuração</strong> > aba <strong>Usuários</strong>.</li>
      <li>Clique em <strong>Criar usuário</strong>.</li>
      <li>Preencha nome, e-mail, senha, tipo de perfil e permissões.</li>
      <li>Se necessário, defina escopo por equipe.</li>
      <li>Salve.</li>
    </ol>

    <h3>12.2 Título PDF</h3>
    <ol>
      <li>Na aba de título PDF, escolha:
        <ul>
          <li>Fonte padrão</li>
          <li>Fonte personalizada</li>
          <li>Arte por equipe</li>
        </ul>
      </li>
      <li>Salve as configurações.</li>
    </ol>

    <h3>12.3 Templates visuais do PDF</h3>
    <ol>
      <li>Acesse aba de templates.</li>
      <li>Selecione template padrão ou crie novo.</li>
      <li>Edite parâmetros visuais.</li>
      <li>Salve e publique template.</li>
    </ol>

    <h3>12.4 Auditoria</h3>
    <ol>
      <li>Acesse aba <strong>Auditoria</strong>.</li>
      <li>Use filtros por encontro, usuário, ação e recurso.</li>
      <li>Abra detalhes técnicos para análise.</li>
    </ol>

    <h2>13. Geração de PDF (final)</h2>
    <h3>13.1 PDF parcial</h3>
    <p>Na tela de detalhe da equipe/círculo, clique em <strong>Visualizar quadrante da equipe</strong>.</p>

    <h3>13.2 PDF completo do encontro</h3>
    <ol>
      <li>Volte para a lista de encontros.</li>
      <li>No card do encontro, clique em <strong>Quadrante</strong>.</li>
      <li>O sistema gera e abre/baixa o PDF completo.</li>
    </ol>

    <h2>14. Diagnóstico rápido de erros (checklist)</h2>
    <table>
      <thead>
        <tr><th>Sintoma</th><th>Causa provável</th><th>Ação correta</th></tr>
      </thead>
      <tbody>
        <tr><td>Importação não trouxe membros</td><td>Cargo ausente na planilha</td><td>Adicionar linha de cargo antes dos nomes</td></tr>
        <tr><td>401 no login</td><td>Credencial inválida</td><td>Revisar e-mail/senha ou resetar usuário</td></tr>
        <tr><td>Sem botão de edição/importação</td><td>Permissão insuficiente</td><td>Ajustar perfil do usuário em Configuração</td></tr>
        <tr><td>PDF com arte fora do padrão</td><td>Imagem sem crop correto</td><td>Reenviar imagem e aplicar recorte adequado</td></tr>
        <tr><td>Pessoa no quadro errado do círculo</td><td>Cargo incorreto</td><td>Editar cargo para padrão esperado (ex.: Jovem Circulista)</td></tr>
      </tbody>
    </table>

    <h2>15. Rotina operacional recomendada</h2>
    <ol>
      <li>Início do dia: revisar dashboard e pendências de importação.</li>
      <li>Durante o dia: cadastrar/editar dados e validar prévias parciais.</li>
      <li>Antes de fechar: validar assets e ordem de impressão.</li>
      <li>Fechamento: gerar PDF final, revisar e registrar ajustes necessários.</li>
      <li>Encerrar sessão com <strong>Sair</strong>.</li>
    </ol>

    <h2>16. Encerramento</h2>
    <div class="block">
      <p><strong>Você concluiu o manual completo do EJC Connect.</strong></p>
      <p>Este documento deve ser usado como referência oficial de operação do sistema.</p>
      <p class="small">Dica prática: mantenha este PDF salvo localmente e sempre use a versão mais recente pelo botão "Baixar manual".</p>
    </div>
  </body>
</html>
  `;
}

async function renderPdfFromHtml(html) {
  const puppeteer = await import("puppeteer-core");
  const browser = await puppeteer.launch({
    executablePath: env.chromeBin,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" }
    });
    return Buffer.isBuffer(pdf) ? pdf : Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function generateSystemManualPdf() {
  if (!cachedManualPdf) {
    cachedManualPdf = await renderPdfFromHtml(buildManualHtml());
  }

  return {
    pdf: cachedManualPdf,
    fileName: "manual_ejc_connect.pdf"
  };
}
