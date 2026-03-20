import { env } from "../config/env.js";

let cachedManualPdf = null;

function buildManualHtml() {
  const today = new Date().toLocaleDateString("pt-BR");
  return `
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Manual do Sistema - EJC Connect</title>
    <style>
      @page { size: A4; margin: 16mm 14mm 16mm 14mm; }
      body {
        font-family: "Montserrat", Arial, sans-serif;
        color: #1f2937;
        font-size: 11pt;
        line-height: 1.55;
      }
      h1, h2, h3 { margin: 0 0 8px; color: #8a1538; }
      h1 { font-size: 20pt; margin-bottom: 4px; }
      h2 { font-size: 14pt; margin-top: 16px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
      h3 { font-size: 12pt; margin-top: 12px; }
      p { margin: 0 0 8px; }
      ul, ol { margin: 0 0 10px 20px; }
      li { margin: 0 0 4px; }
      .cover {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 14px;
        background: #fcfcfd;
      }
      .meta { color: #4b5563; font-size: 10pt; margin-top: 6px; }
      .block {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 10px;
        margin: 10px 0;
        background: #ffffff;
      }
      .tip {
        border-left: 4px solid #8a1538;
        padding: 8px 10px;
        background: #fdf4f7;
        margin: 10px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 8px 0 12px;
        font-size: 10pt;
      }
      th, td {
        border: 1px solid #d1d5db;
        padding: 6px;
        text-align: left;
        vertical-align: top;
      }
      th { background: #f3f4f6; }
      .small { font-size: 9pt; color: #6b7280; }
    </style>
  </head>
  <body>
    <section class="cover">
      <h1>Manual do Sistema</h1>
      <h2 style="border: 0; margin: 0 0 8px; padding: 0;">EJC Connect (Quadrante)</h2>
      <p>Este manual foi escrito em linguagem simples, direta e com padrão corporativo.</p>
      <p>Objetivo: qualquer usuário, mesmo sem experiência técnica, conseguir operar o sistema com segurança.</p>
      <p class="meta">Versão do manual: 1.0 | Data de geração: ${today}</p>
    </section>

    <h2>1. O que é o sistema</h2>
    <p>O EJC Connect organiza dados do encontro e gera o PDF do Quadrante.</p>
    <div class="block">
      <p><strong>Resumo em 1 frase:</strong> você cadastra encontro, equipes/círculos, pessoas e artes; depois gera o PDF.</p>
    </div>

    <h2>2. Fluxo obrigatório (ordem certa)</h2>
    <ol>
      <li>Entrar no sistema com usuário e senha.</li>
      <li>Cadastrar o encontro.</li>
      <li>Cadastrar equipes e círculos (definir ordem).</li>
      <li>Adicionar pessoas manualmente ou importar planilha.</li>
      <li>Enviar capas, separadores, cartazes e demais artes A4.</li>
      <li>Conferir prévias (quando necessário).</li>
      <li>Gerar o PDF final do Quadrante.</li>
    </ol>

    <h2>3. Como usar cada tela</h2>
    <h3>3.1 Dashboard</h3>
    <ul>
      <li>Mostra quantidades cadastradas.</li>
      <li>Use filtro de encontro para ver números específicos.</li>
    </ul>

    <h3>3.2 Encontros</h3>
    <ul>
      <li>Preencher: Nome do encontro, Data de início e Data de fim.</li>
      <li>No card do encontro, clicar em <strong>Abrir gestão</strong>.</li>
    </ul>

    <h3>3.3 Equipes e Círculos</h3>
    <ul>
      <li>Definir nome e ordem de impressão.</li>
      <li>Entrar no detalhe para importar membros, editar membros e enviar foto/cartaz.</li>
    </ul>

    <h3>3.4 Capas e Artes</h3>
    <ul>
      <li>Enviar imagens em padrão A4 (crop já integrado no sistema).</li>
      <li>Usar campo <strong>Ordem</strong> para controlar sequência no PDF.</li>
    </ul>

    <h2>4. Importações (ponto mais importante)</h2>
    <p>Na importação de membros por equipe/círculo, a lógica é por <strong>cargo</strong>:</p>
    <ol>
      <li>Linha de cargo (ex.: <strong>Tios Coordenadores</strong>)</li>
      <li>Linhas seguintes com pessoas daquele cargo</li>
      <li>Quando aparece novo cargo, começa novo bloco</li>
    </ol>

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

    <h3>4.1 Regra de casal por tipo de equipe</h3>
    <ul>
      <li><strong>Geral:</strong> casal apenas em cargos com <strong>Tio/Tios</strong>.</li>
      <li><strong>Sala:</strong> mesma regra da Geral. Linhas isoladas como <strong>EQUIPE DE SALA</strong> e cores isoladas (<strong>AMARELO, AZUL...</strong>) são ignoradas automaticamente.</li>
      <li><strong>Tios Carona:</strong> <strong>Jovens Coordenadores</strong> é individual; todos os demais cargos entram em casal.</li>
    </ul>

    <div class="tip">
      <strong>Regra fixa:</strong> cargos sem a palavra "Tio" ou "Tios" são individuais (exceto a regra especial da equipe Tios Carona).
    </div>

    <h3>4.2 Importação geral de círculos</h3>
    <p>Usar na tela principal de círculos para importar tudo de uma vez.</p>
    <table>
      <thead>
        <tr><th>NOME</th><th>CIRCULO/COR</th><th>TELEFONE</th><th>PAROQUIA</th></tr>
      </thead>
      <tbody>
        <tr><td>Maria Santos</td><td>AMARELO</td><td>(11) 98888-1111</td><td>Santa Ana</td></tr>
        <tr><td>João Lima</td><td>AZUL</td><td>(11) 97777-2222</td><td>São José</td></tr>
      </tbody>
    </table>
    <p class="small">Obrigatório: colunas NOME e CIRCULO/COR. Demais colunas são opcionais.</p>

    <h2>5. Erros comuns e correção rápida</h2>
    <ul>
      <li><strong>“Membro sem cargo definido”:</strong> faltou a linha de título do cargo antes dos nomes.</li>
      <li><strong>Nenhum membro importado:</strong> confira cabeçalho da planilha e estrutura por blocos de cargo.</li>
      <li><strong>PDF com visual quebrado:</strong> revisar ordem dos assets e se imagens estão no recorte correto.</li>
      <li><strong>Sem acesso a botão/tela:</strong> usuário sem permissão. Ajustar em Configurações > Usuários.</li>
    </ul>

    <h2>6. Segurança e operação diária</h2>
    <ul>
      <li>Cada pessoa deve usar usuário próprio.</li>
      <li>Não compartilhar senha de administrador.</li>
      <li>Usar logoff ao encerrar.</li>
      <li>Revisar auditoria para rastrear alterações.</li>
    </ul>

    <h2>7. Checklist antes de gerar o Quadrante final</h2>
    <ol>
      <li>Encontro correto selecionado.</li>
      <li>Ordem de equipes e círculos conferida.</li>
      <li>Importações concluídas sem pendências.</li>
      <li>Capas, separadores e cartazes enviados.</li>
      <li>Prévia parcial validada (equipes/círculos críticos).</li>
      <li>Gerar PDF final.</li>
    </ol>

    <div class="block">
      <p><strong>Fim do manual.</strong></p>
      <p class="small">Documento oficial de operação do EJC Connect.</p>
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
