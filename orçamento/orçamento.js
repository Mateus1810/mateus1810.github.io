// ================== CONFIGURAÇÃO ==================
// (sem taxa/repasse; sem cartão)

let opcoesSelecionadas = [];
let assinaturaCanvas = null;

// Helpers
// Converte string/number para número, aceitando vírgula ou ponto
const nSafe = (v) => {
  const s = (v ?? '').toString().trim().replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
const r2  = (v) => Math.round(nSafe(v) * 100) / 100;
const fmt = (n) => nSafe(n).toFixed(2);

// ============== jsPDF loader (mantido) ==============
function verificarJsPDF() {
  if (typeof jsPDF !== 'undefined') return jsPDF;
  if (typeof window.jsPDF !== 'undefined') return window.jsPDF;
  if (typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF) return window.jspdf.jsPDF;
  if (typeof jspdf !== 'undefined' && jspdf.jsPDF) return jspdf.jsPDF;
  return null;
}
async function carregarJsPDF() {
  if (verificarJsPDF()) return verificarJsPDF();
  try {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    return verificarJsPDF();
  } catch (error) {
    console.error('Erro ao carregar jsPDF:', error);
    throw new Error('Não foi possível carregar a biblioteca jsPDF');
  }
}
async function carregarAutoTable() {
  try {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    console.error('Erro ao carregar autoTable:', error);
  }
}

// =================== CÁLCULO NA TELA ===================
function calcularTotal(opcao) {
  let subtotal = 0;

  document.querySelectorAll(`#itens-orcamento-${opcao} tbody tr`).forEach(row => {
    const qtd = nSafe(row.querySelector(".quantidade")?.value);
    const valor = nSafe(row.querySelector(".valor")?.value);
    const total = r2(qtd * valor);
    const campoTotal = row.querySelector(".total-item");
    if (campoTotal) campoTotal.value = fmt(total);
    subtotal += total;
  });

  const desconto = nSafe(document.getElementById(`desconto-${opcao}`)?.value);
  const totalFinal = r2(Math.max(0, subtotal - desconto));

  const campoSubtotal = document.getElementById(`subtotal-${opcao}`);
  const campoTotal = document.getElementById(`total-${opcao}`);
  if (campoSubtotal) campoSubtotal.value = fmt(subtotal);
  if (campoTotal)    campoTotal.value    = fmt(totalFinal);

  if (opcoesSelecionadas.includes(opcao)) atualizarOpcoesSelecionadas();
}

function adicionarItem(opcao) {
  const tabela = document.querySelector(`#itens-orcamento-${opcao} tbody`);
  if (!tabela) return;

  const novaLinha = tabela.insertRow();
  novaLinha.innerHTML = `
    <td><input type="text" class="item" placeholder="Nome do Item"></td>
    <td><input type="number" class="quantidade" placeholder="Qtd" min="0" step="0.01" oninput="calcularTotal(${opcao})"></td>
    <td><input type="number" class="valor" placeholder="Valor Unitário" min="0" step="0.01" oninput="calcularTotal(${opcao})"></td>
    <td><input type="text" class="total-item" readonly></td>
    <td><button type="button" class="btn btn-remove" onclick="removerItem(this, ${opcao})"><i class="fas fa-trash" aria-hidden="true"></i></button></td>
  `;
  setTimeout(() => novaLinha.querySelector(".item")?.focus(), 50);
}
function removerItem(button, opcao) {
  const linha = button?.closest("tr");
  if (linha) { linha.remove(); calcularTotal(opcao); }
}

function selecionarOpcao(opcao) {
  const checkbox = document.getElementById(`checkbox-${opcao}`);
  if (checkbox.checked) {
    if (!opcoesSelecionadas.includes(opcao)) opcoesSelecionadas.push(opcao);
  } else {
    opcoesSelecionadas = opcoesSelecionadas.filter(op => op !== opcao);
  }
  atualizarOpcoesSelecionadas();
}

function atualizarOpcoesSelecionadas() {
  const headerOpcoes = document.getElementById("header-opcoes-selecionadas");
  const resumoOpcoes = document.getElementById("resumo-opcoes-selecionadas");
  const listaOpcoes  = document.getElementById("lista-opcoes-selecionadas");

  if (opcoesSelecionadas.length > 0) {
    if (headerOpcoes) headerOpcoes.style.display = "table-row";
    if (resumoOpcoes) resumoOpcoes.style.display = "table-row";

    let htmlLista = "";
    opcoesSelecionadas.forEach(opcao => {
      const nomeOpcao = opcao === 1 ? "Básica" : opcao === 2 ? "Intermediária" : opcao === 3 ? "Premium" : "Padrão/Opcionais";
      const totalFinal = document.getElementById(`total-${opcao}`)?.value || "0.00";
      htmlLista += `
        <div class="opcao-individual" style="margin-bottom:10px;padding:8px;border-left:3px solid #666;background-color:#f8f9fa;">
          <strong>Opção ${opcao} - ${nomeOpcao}:</strong><br>
          <span style="margin-left:10px;">Total: R$ ${totalFinal}</span>
        </div>
      `;
    });
    if (listaOpcoes) listaOpcoes.innerHTML = htmlLista;
  } else {
    if (headerOpcoes) headerOpcoes.style.display = "none";
    if (resumoOpcoes) resumoOpcoes.style.display = "none";
  }
}

// =================== CAPTURA DE DADOS ===================
function formatarValor(valor) { return nSafe(valor).toFixed(2); }
function obterDadosCliente() {
  return {
    nome: document.getElementById("nome")?.value || "",
    telefone: document.getElementById("telefone")?.value || "",
    email: document.getElementById("email")?.value || "",
    descricao: document.getElementById("descricao")?.value || "",
    validade: document.getElementById("validade")?.value || "30",
  };
}
function obterTodasOpcoesItens() {
  const todasOpcoes = {};
  opcoesSelecionadas.forEach(opcao => {
    const itens = [];
    document.querySelectorAll(`#itens-orcamento-${opcao} tbody tr`).forEach(row => {
      const item = {
        nome: row.querySelector(".item")?.value || "",
        quantidade: row.querySelector(".quantidade")?.value || "0",
        valor: row.querySelector(".valor")?.value || "0.00",
        total: row.querySelector(".total-item")?.value || "0.00"
      };
      if (item.nome.trim() || nSafe(item.quantidade) > 0) itens.push(item);
    });
    const nomeOpcao = opcao === 1 ? "Básica" : opcao === 2 ? "Intermediária" : opcao === 3 ? "Premium" : "Padrão/Opcionais";
    todasOpcoes[opcao] = { nome: nomeOpcao, itens };
  });
  return todasOpcoes;
}
function obterTodosDadosFinanceiros() {
  const todos = {};
  opcoesSelecionadas.forEach(opcao => {
    const subtotal = nSafe(document.getElementById(`subtotal-${opcao}`)?.value);
    const desconto = nSafe(document.getElementById(`desconto-${opcao}`)?.value);
    const total    = nSafe(document.getElementById(`total-${opcao}`)?.value);
    const nomeOpcao = opcao === 1 ? "Básica" : opcao === 2 ? "Intermediária" : opcao === 3 ? "Premium" : "Padrão/Opcionais";
    todos[opcao] = { nome: nomeOpcao, subtotal: formatarValor(subtotal), desconto: formatarValor(desconto), total: formatarValor(total) };
  });
  return todos;
}

// Placeholder de logo no PDF (mesmo estilo antigo)
function mostrarPlaceholderLogo(doc, pageWidth) {
  doc.setFillColor(200, 200, 200);
  doc.circle(pageWidth - 35, 22, 12, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(70, 70, 70);
  doc.text("LOGO", pageWidth - 35, 25, { align: "center" });
}

// =================== GERAÇÃO DE PDF ===================
async function gerarPDF() {
  if (opcoesSelecionadas.length === 0) {
    alert('Por favor, selecione pelo menos uma das opções antes de gerar o PDF.');
    return;
  }
  const dados = obterDadosCliente();

  const botaoOriginal = document.querySelector('[onclick*="gerarPDF"]');
  const textoOriginal = botaoOriginal ? botaoOriginal.innerText : '';
  if (botaoOriginal) { botaoOriginal.innerText = 'Gerando PDF...'; botaoOriginal.disabled = true; }

  try {
    const jsPDFClass = await carregarJsPDF();
    await carregarAutoTable();
    if (!jsPDFClass) throw new Error('jsPDF não pôde ser carregado');

    const doc = new jsPDFClass();
    const dadosCompletos = {
      cliente: dados,
      opcoes: obterTodasOpcoesItens(),
      financeiro: obterTodosDadosFinanceiros(),
      opcoesEscolhidas: opcoesSelecionadas.map(op => op === 1 ? "Básica" : op === 2 ? "Intermediária" : op === 3 ? "Premium" : "Padrão/Opcionais").join(", "),
      quantidadeOpcoes: opcoesSelecionadas.length
    };

    construirPDFFlexivel(doc, dadosCompletos);

    const nomeCliente = dadosCompletos.cliente.nome.trim() || 'Cliente';
    const nomeArquivo = `Orcamento_${nomeCliente.replace(/\s+/g, '_')}.pdf`;
    doc.save(nomeArquivo);
    alert('PDF gerado com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    if (error.message.includes('jsPDF')) {
      alert('Erro: A biblioteca jsPDF não pôde ser carregada. Verifique sua conexão com a internet e tente novamente.');
    } else {
      alert(`Erro ao gerar o PDF: ${error.message}`);
    }
  } finally {
    if (botaoOriginal) { botaoOriginal.innerText = textoOriginal; botaoOriginal.disabled = false; }
  }
}

// =================== BLOCOS VISUAIS (no estilo antigo) ===================
function construirPDFFlexivel(doc, dados) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margemInferior = 30;
  let y = 15;

  function verificarNovaPagina(alturaConteudo) {
    if (y + alturaConteudo > pageHeight - margemInferior) {
      adicionarRodape(doc, pageWidth, pageHeight);
      doc.addPage(); y = 15; return true;
    }
    return false;
  }

  // ===== CABEÇALHO (cinza antigo) =====
 const logoBase64 = 'data:image/jpeg;base64,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'; // aqui vai o Base64 da sua logo ou o caminho

  doc.setFillColor(90, 90, 90); doc.rect(0, 0, pageWidth, 50, 'F');
  if (logoBase64 && logoBase64.includes('base64,')) {
    try { doc.addImage(logoBase64, 'PNG', pageWidth - 55, 10, 35, 35); }
    catch (e) { console.warn('Erro ao adicionar logo:', e); mostrarPlaceholderLogo(doc, pageWidth); }
  } else { mostrarPlaceholderLogo(doc, pageWidth); }

  doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.setTextColor(255,255,255);
  doc.text("ORÇAMENTO", 15, 28);
  doc.setFontSize(11); doc.setFont("helvetica", "normal");
  doc.text("Digital Drift - Assistência Técnica", 15, 38);

  const numeroOrcamento = `#${Date.now().toString().slice(-6)}`;
  const dataAtual = new Date().toLocaleDateString('pt-BR');

  doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text(`Orçamento: ${numeroOrcamento}`, 15, 45);

  let textoOpcoes = `Opções: ${dados.opcoesEscolhidas}`;
  if (textoOpcoes.length > 40) textoOpcoes = textoOpcoes.substring(0, 37) + '...';
  doc.text(textoOpcoes, pageWidth/2, 45, { align: "center" });
  doc.text(`Data: ${dataAtual}`, pageWidth - 55, 45);

  y = 60;

  // ===== RESUMO EXECUTIVO (TOPO, estilo antigo) =====
  adicionarResumoExecutivoAntigo(doc, pageWidth, pageHeight, dados, y);
  y = doc.lastY || y;

  // ===== DADOS DO CLIENTE (caixa clara, faixa cinza) =====
  verificarNovaPagina(35);
  doc.setFillColor(245,245,245); doc.setDrawColor(120,120,120); doc.setLineWidth(0.5);
  doc.rect(15, y, pageWidth - 30, 30, 'FD');
  doc.setFillColor(120,120,120); doc.rect(15, y, pageWidth - 30, 8, 'F');
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
  doc.text("DADOS DO CLIENTE", 18, y + 5);

  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60,60,60);
  doc.text(`Cliente: ${dados.cliente.nome || 'Não informado'}`, 18, y + 16);
  doc.text(`Telefone: ${dados.cliente.telefone || 'Não informado'}`, 18, y + 24);
  y += 38;

  // ===== DESCRIÇÃO DO SERVIÇO (caixa clara, faixa cinza escuro) =====
  if (dados.cliente.descricao && dados.cliente.descricao.trim()) {
    const linhasDescricao = doc.splitTextToSize(dados.cliente.descricao, pageWidth - 40);
    const alturaDescricao = Math.min(linhasDescricao.length * 5, 30) + 18;
    verificarNovaPagina(alturaDescricao);
    doc.setFillColor(250,250,250); doc.setDrawColor(150,150,150); doc.setLineWidth(0.5);
    doc.rect(15, y, pageWidth - 30, alturaDescricao, 'FD');
    doc.setFillColor(150,150,150); doc.rect(15, y, pageWidth - 30, 8, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
    doc.text("DESCRIÇÃO DO SERVIÇO", 18, y + 5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60,60,60);
    const linhasLimitadas = linhasDescricao.slice(0,5);
    doc.text(linhasLimitadas, 18, y + 15);
    y += alturaDescricao + 10;
  }

  // ===== ITENS POR OPÇÃO (mesmo visual antigo; sem taxas) =====
  const totaisPorOpcao = {}; // { [op]: { subtotal, desconto, totalFinal } }

  Object.entries(dados.opcoes).forEach(([opcao, dadosOpcao]) => {
    const op = Number(opcao);
    if (dadosOpcao.itens.length > 0 || op === 4) {
      verificarNovaPagina(60);

      // cabeçalho de opção (igual ao antigo)
      let corFundo = [245,245,245];
      if (op===2) corFundo=[230,230,230];
      if (op===3) corFundo=[215,215,215];
      if (op===4) corFundo=[200,200,200];

      doc.setFillColor(...corFundo); doc.setDrawColor(100,100,100); doc.setLineWidth(0.5);
      doc.roundedRect(15, y, pageWidth-30, 10, 2,2,'FD');
      doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(80,80,80);
      doc.text(`OPÇÃO ${opcao} - ${dadosOpcao.nome.toUpperCase()}`, 18, y + 7);
      y += 16;

      // observação da opção 4
      if (op===4) {
        const observacao4 = document.getElementById("observacao-4")?.value||"";
        if (observacao4.trim()) {
          const caixaX=15, caixaY=y, caixaL=pageWidth-30, pad=4;
          const linhasTxt = doc.splitTextToSize(observacao4, caixaL - 2*pad);
          const alt = linhasTxt.length*5 + 2*pad;
          doc.setDrawColor(150,150,150); doc.setFillColor(245,245,245);
          doc.rect(caixaX,caixaY,caixaL,alt,'FD');
          doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(50,50,50);
          doc.text(linhasTxt, caixaX + pad, caixaY + 5 + pad);
          y += alt + 8;
        }
      }

      // itens (sem redistribuição, sem taxa)
      const itensBrutos = (dadosOpcao.itens || []).map(it => {
        const qtd  = nSafe(it.quantidade);
        const unit = nSafe(it.valor);
        const totalBase = r2(qtd * unit);
        return { nome: it.nome, qtd, unit, totalBase };
      });

      const descontoOp = nSafe(dados.financeiro?.[opcao]?.desconto);

      const itensTabela = [];
      let soma = 0;
      itensBrutos.forEach(it => {
        soma += it.totalBase;
        itensTabela.push([ it.nome, String(it.qtd), `R$ ${fmt(it.unit)}`, `R$ ${fmt(it.totalBase)}` ]);
      });
      soma = r2(soma);

      if (itensTabela.length > 0) {
        const altEst = (itensTabela.length + 1) * 8 + 10;
        if (y + altEst > pageHeight - margemInferior) {
          adicionarRodape(doc, pageWidth, pageHeight); doc.addPage(); y = 15;
        }
        doc.autoTable({
          startY: y,
          head: [["Item/Serviço","Qtd","Valor Unit.","Total"]],
          body: itensTabela,
          theme: "grid",
          styles: { fontSize:8, cellPadding:3, textColor:[60,60,60], lineColor:[120,120,120], lineWidth:0.3, overflow:'linebreak', minCellHeight:10, valign:'middle' },
          headStyles: { fillColor:[100,100,100], textColor:[255,255,255], fontSize:9, fontStyle:'bold', halign:'center', valign:'middle', minCellHeight:10 },
          columnStyles: { 0:{cellWidth:100, halign:'left'}, 1:{cellWidth:15, halign:'center'}, 2:{cellWidth:30, halign:'right'}, 3:{cellWidth:30, halign:'right', fontStyle:'bold', fillColor:[245,245,245]} },
          alternateRowStyles:{ fillColor:[248,248,248] }, margin:{ left:15, right:15 }, pageBreak:'auto', showHead:'everyPage', rowPageBreak:'avoid', tableWidth:'auto'
        });
        y = doc.autoTable.previous.finalY + 8;
      }

      const totalFinalOpcao = r2(Math.max(0, soma - descontoOp));
      totaisPorOpcao[opcao] = { subtotal: soma, desconto: descontoOp, totalFinal: totalFinalOpcao };
    }
  });

  // ===== RESUMO FINANCEIRO – TOTAIS INDIVIDUAIS (antigo) =====
  const qtdResumo = Object.keys(totaisPorOpcao).length;
  verificarNovaPagina(40 + (qtdResumo * 15));
  doc.setFillColor(245,245,245); doc.setDrawColor(120,120,120); doc.setLineWidth(0.5);
  const alturaResumo = 25 + (qtdResumo * 15);
  doc.rect(15, y, pageWidth - 30, alturaResumo, 'FD');
  doc.setFillColor(120,120,120); doc.rect(15, y, pageWidth - 30, 8, 'F');
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(255,255,255);
  doc.text("RESUMO FINANCEIRO - TOTAIS INDIVIDUAIS", 18, y + 5);
  y += 18;

  Object.entries(totaisPorOpcao).forEach(([opcao, fin]) => {
    const nomeOpcao = (Number(opcao)===1) ? "Básica" : (Number(opcao)===2) ? "Intermediária" : (Number(opcao)===3) ? "Premium" : "Padrão/Opcionais";
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(80,80,80);
    doc.text(`${nomeOpcao}:`, 18, y);

    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(60,60,60);
    doc.text(`Total: R$ ${fmt(fin.totalFinal)}`, 18, y + 6);

    if (fin.desconto > 0) {
      doc.setFontSize(8); doc.setTextColor(100,100,100);
      doc.text(`(Itens: R$ ${fmt(fin.subtotal)} - Desconto: R$ ${fmt(fin.desconto)})`, 30, y + 12);
      y += 18;
    } else {
      y += 12;
    }

    if (qtdResumo > 1) {
      doc.setDrawColor(180,180,180); doc.setLineWidth(0.3);
      doc.line(18, y, pageWidth - 18, y);
      y += 3;
    }
  });

  y += 15;

  // ===== RESUMO FINANCEIRO – TOTAIS GERAIS (antigo) =====
  const totalGeral = Object.values(totaisPorOpcao).reduce((s, f) => s + nSafe(f.totalFinal), 0);
  verificarNovaPagina(40);
  doc.setFillColor(245,245,245); doc.setDrawColor(120,120,120); doc.setLineWidth(0.5);
  doc.rect(15,y,pageWidth-30,35,'FD');
  doc.setFillColor(120,120,120); doc.rect(15,y,pageWidth-30,8,'F');
  doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.setTextColor(255,255,255);
  doc.text("RESUMO FINANCEIRO - TOTAIS GERAIS", 18, y + 5);

  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(80,80,80);
  doc.text(`Total: R$ ${fmt(totalGeral)}`, 18, y + 16);
  y += 40;

  // ===== FAQ (antigo: caixa clara + faixa cinza) =====
  adicionarFAQAntigo(doc, pageWidth, pageHeight, y);
  y = doc.lastY || y;

  // ===== PRÓXIMOS PASSOS (antigo) =====
  adicionarProximosPassosAntigo(doc, pageWidth, pageHeight, y);
  y = doc.lastY || y;

  // ===== CERTIFICADO DE GARANTIA VISUAL (antigo, sóbrio) =====
  adicionarCertificadoGarantiaVisualAntigo(doc, pageWidth, pageHeight, y);
  y = doc.lastY || y;

  // ===== TERMOS E CONDIÇÕES (amarelo antigo) =====
  verificarNovaPagina(40);
  const tituloTermos = "TERMOS E CONDIÇÕES";
  const bullets = [
    "Validade do orçamento: conforme indicado neste documento; após o vencimento, valores e prazos podem mudar.",
    "Aprovação e início: a execução começa após sua aprovação e, quando aplicável, o pagamento de entrada.",
    "Prazos de execução: estimativa de até 15 dias úteis; pode variar conforme disponibilidade de peças e fila de serviço.",
    "Peças: itens sob encomenda podem exigir pagamento antecipado e seguem o prazo e a garantia do fornecedor.",
    "Alterações de escopo: mudanças solicitadas podem gerar novo orçamento, prazos e custos.",
    "Pagamento: para valores acima de R$ 300,00, entrada de 50%; saldo na entrega.",
    "Garantia: 90 dias para mão de obra; não cobre mau uso, líquidos, impactos, oxidação ou intervenção de terceiros. Peças seguem a garantia do fabricante.",
    "Backup de dados: recomendamos fortemente realizar uma cópia de segurança antes do atendimento. Adotamos procedimentos de proteção, mas toda intervenção técnica envolve algum risco. Se necessário, oferecemos orientação para o backup.",
    "Armazenagem/retirada: após aviso de conclusão, o equipamento deve ser retirado em até 30 dias; após esse prazo, pode haver cobrança de armazenagem e/ou descarte.",
    "Cancelamento: desistências após compra de peças ou início do serviço implicam cobrança dos custos já incorridos.",
    "Comunicação: nosso canal preferencial é o telefone/WhatsApp informado neste documento."
  ];

  const larguraTexto = pageWidth - 36;
  let alturaConteudo = 8 + 6 + 6;
  bullets.forEach(linha => { const t = doc.splitTextToSize(`• ${linha}`, larguraTexto); alturaConteudo += t.length * 4.5; });
  alturaConteudo += 12;

  verificarNovaPagina(alturaConteudo + 10);

  doc.setFillColor(255,250,205);
  doc.setDrawColor(180,150,0);
  doc.setLineWidth(0.5);
  doc.rect(15, y, pageWidth - 30, alturaConteudo, 'FD');

  doc.setFillColor(180,150,0);
  doc.rect(15, y, pageWidth - 30, 8, 'F');

  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
  doc.text(tituloTermos, 18, y + 5);

  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(50,50,50);

  let yTexto = y + 14;
  bullets.forEach(linha => {
    const t = doc.splitTextToSize(`• ${linha}`, larguraTexto);
    doc.text(t, 18, yTexto);
    yTexto += t.length * 4.5;
  });

  y = y + alturaConteudo + 10;

  // ===== ASSINATURA DO CLIENTE (antigo) =====
  verificarNovaPagina(40);
  doc.setFillColor(245,245,245); doc.setDrawColor(120,120,120); doc.setLineWidth(0.5);
  doc.rect(15,y,pageWidth-30,35,'FD');

  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(60,60,60);
  doc.text("ASSINATURA DO CLIENTE",18,y+6);

  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(80,80,80);
  doc.text("Confirmo o aceite deste Orçamento de Serviço",18,y+15);

  doc.setDrawColor(0,0,0); doc.setLineWidth(0.5);
  doc.line(18,y+24,pageWidth-18,y+24);
  doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(100,100,100);
  doc.text("Assinatura do Cliente",18,y+28);
  doc.text("Data",pageWidth-35,y+28);
  y += 40;

  // ===== INFORMAÇÕES FINAIS (antigo) =====
  verificarNovaPagina(25);
  doc.setFillColor(250,250,250); doc.setDrawColor(180,180,180); doc.setLineWidth(0.5);
  doc.rect(15, y, pageWidth - 30, 20, 'FD');
  doc.setFillColor(180,180,180); doc.rect(15, y, 5, 20, 'F');
  doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(100,100,100);
  doc.text(`VÁLIDO POR ${dados.cliente.validade || '30'} DIAS`, 22, y + 8);
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(80,80,80);
  doc.text("Preços sujeitos a alteração sem aviso prévio.", 22, y + 14);

  y += 30;

  adicionarRodape(doc, pageWidth, pageHeight);
}

// ====== BLOCO: Resumo Executivo (visual antigo, SOMENTE VALORES — sem descrições de itens) ======
function adicionarResumoExecutivoAntigo(doc, pageWidth, pageHeight, dados, yStart) {
  const margemInferior = 30;
  const bottom = pageHeight - margemInferior;
  const x = 15;
  const largura = pageWidth - 30;
  const pad = 8;
  const colW = largura - pad * 2;
  let y = yStart;

  const nomes = {1:"Básica",2:"Intermediária",3:"Premium",4:"Padrão/Opcionais"};
  const fin = dados.financeiro || {};

  // quais opções considerar
  const opcoes = (Array.isArray(opcoesSelecionadas) && opcoesSelecionadas.length)
    ? opcoesSelecionadas.slice()
    : Object.keys(dados.opcoes || {}).map(n => Number(n)).sort((a,b)=>a-b);

  // calcula total por opção a partir dos ITENS (sem depender do 'financeiro' estar preenchido)
  const porOpcao = opcoes.map(op => {
    const itens = (dados.opcoes?.[String(op)]?.itens) || [];
    let subtotal = 0;
    itens.forEach(it => {
      const tLinha = nSafe(it.total);
      subtotal += tLinha > 0 ? tLinha : r2(nSafe(it.quantidade) * nSafe(it.valor));
    });
    subtotal = r2(subtotal);
    const desconto = nSafe(fin[String(op)]?.desconto);
    const total = r2(Math.max(0, subtotal - desconto));
    return { op, nome: nomes[op] || `Opção ${op}`, subtotal, desconto, total };
  });

  const totalGeral = porOpcao.reduce((s,o)=> s + nSafe(o.total), 0);

  // textos
  const txtOpSel = doc.splitTextToSize(`Opções selecionadas: ${dados.opcoesEscolhidas || "-"}`, colW);
  const notaTxt  = doc.splitTextToSize(
    "Nota: leia este orçamento completo para entender itens, condições e valores. Decida com calma quais opções deseja aprovar.",
    colW
  );

  // alturas (sem tabela de itens aqui!)
  const hHeader=8, hGapAposHdr=6, hHighlight=16, hChips=16;
  const hOpSel = txtOpSel.length * 4.5 + 4;
  const hNota  = notaTxt.length  * 4.5 + 10;
  const hLista = porOpcao.length ? (6 /*titulo*/ + porOpcao.length * 6) : 0;
  const hBottomPad = 8;
  const alturaTotal = hHeader + hGapAposHdr + hHighlight + hChips + hOpSel + hNota + hLista + hBottomPad;

  if (y + alturaTotal > bottom) { adicionarRodape(doc, pageWidth, pageHeight); doc.addPage(); y = 15; }

  // container
  doc.setFillColor(245,245,245); doc.setDrawColor(120,120,120); doc.setLineWidth(0.5);
  doc.rect(x, y, largura, alturaTotal, 'FD');
  doc.setFillColor(120,120,120); doc.rect(x, y, largura, hHeader, 'F');

  // título
  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
  doc.text("RESUMO EXECUTIVO", x + 3, y + 5);

  let yy = y + hHeader + hGapAposHdr;

  // total geral
  doc.setFillColor(235,235,235); doc.setDrawColor(180,180,180);
  doc.rect(x + pad, yy, colW, hHighlight - 4, 'FD');
  doc.setFont("helvetica","bold"); doc.setFontSize(12); doc.setTextColor(60,60,60);
  doc.text(`Total geral: R$ ${fmt(totalGeral)}`, x + pad + 4, yy + (hHighlight - 4)/2 + 3);
  yy += hHighlight;

  // pílulas
  const chipH = 12, gap = 6, chipW = (colW - gap) / 2;
  doc.setFillColor(240,240,240); doc.setDrawColor(190,190,190);
  doc.roundedRect(x + pad, yy, chipW, chipH, 2, 2, 'FD');
  doc.roundedRect(x + pad + chipW + gap, yy, chipW, chipH, 2, 2, 'FD');
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(70,70,70);
  doc.text("Prazo estimado: até 15 dias úteis", x + pad + 3, yy + chipH/2 + 3);
  doc.text(`Validade: ${dados.cliente.validade || '30'} dias`, x + pad + chipW + gap + 3, yy + chipH/2 + 3);
  yy += hChips;

  // opções selecionadas
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(80,80,80);
  doc.text(txtOpSel, x + pad, yy);
  yy += hOpSel;

  // nota
  doc.setFillColor(248,248,248); doc.setDrawColor(200,200,200);
  doc.roundedRect(x + pad, yy, colW, hNota - 6, 2, 2, 'FD');
  doc.setFont("helvetica","italic"); doc.setFontSize(8.5); doc.setTextColor(70,70,70);
  doc.text(notaTxt, x + pad + 4, yy + 7);
  yy += hNota;

  // lista por opção (APENAS VALORES)
  if (porOpcao.length) {
    doc.setDrawColor(200,200,200); doc.setLineWidth(0.3);
    doc.line(x + pad, yy, x + pad + colW, yy);
    yy += 6;

    doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(70,70,70);
    doc.text("Totais por opção:", x + pad, yy);
    yy += 6;

    doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(70,70,70);
    porOpcao.forEach(o => {
      // mostra somente o NOME DA OPÇÃO e o TOTAL (sem descrição de itens)
      doc.text(o.nome, x + pad, yy);
      const valor = `R$ ${fmt(o.total)}`;
      doc.text(valor, x + pad + colW, yy, { align: 'right' });
      yy += 6;
    });
  }

  doc.lastY = y + alturaTotal + 10;
}

// ====== BLOCO: FAQ (visual antigo) ======
function adicionarFAQAntigo(doc, pageWidth, pageHeight, yStart) {
  let y = yStart;
  const titulo = "FAQ - PERGUNTAS FREQUENTES";
  const qa = [
    { q: "Qual o prazo estimado para conclusão?", a: "Até 15 dias úteis após aprovação e entrada (se houver), variando por disponibilidade de peças." },
    { q: "Como funciona a garantia?", a: "90 dias para mão de obra. Peças seguem a garantia do fabricante. Não cobre mau uso, líquidos, impactos, oxidação ou terceiros." },
    { q: "Preciso fazer backup?", a: "Recomendamos que você mantenha uma cópia de segurança dos seus arquivos antes do atendimento. Adotamos todo o cuidado, mas intervenções técnicas podem afetar dados. Se precisar, podemos orientar como realizar o backup." },
    { q: "Peças sob encomenda exigem entrada?", a: "Pode ser necessário pagamento antecipado, conforme fornecedor." },
    { q: "Canais de contato?", a: "Telefone/WhatsApp informados neste documento." }
  ];

  const largura = pageWidth - 30;
  const textoW = largura - 6 - 6;
  let altura = 8 + 8;
  qa.forEach(({q,a}) => {
    const t1 = doc.splitTextToSize(`• ${q}`, textoW);
    const t2 = doc.splitTextToSize(`  ${a}`, textoW);
    altura += t1.length*4.5 + t2.length*4.5 + 4;
  });

  if (y + altura > pageHeight - 30) { adicionarRodape(doc, pageWidth, pageHeight); doc.addPage(); y = 15; }

  doc.setFillColor(245,245,245); doc.setDrawColor(150,150,150); doc.setLineWidth(0.5);
  doc.rect(15, y, largura, altura, 'FD');
  doc.setFillColor(150,150,150); doc.rect(15, y, largura, 8, 'F');

  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
  doc.text(titulo, 18, y + 5);

  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(60,60,60);
  let yy = y + 16;
  qa.forEach(({q,a}) => {
    const t1 = doc.splitTextToSize(`• ${q}`, textoW);
    const t2 = doc.splitTextToSize(`  ${a}`, textoW);
    doc.text(t1, 18, yy); yy += t1.length*4.5 + 1.5;
    doc.text(t2, 18, yy); yy += t2.length*4.5 + 3;
  });

  doc.lastY = yy + 6;
}

// ====== BLOCO: Próximos Passos (visual antigo) ======
function adicionarProximosPassosAntigo(doc, pageWidth, pageHeight, yStart) {
  let y = yStart;
  const titulo = "PRÓXIMOS PASSOS";
  const passos = [
    "1) Aprovação do orçamento por escrito (WhatsApp ou assinatura).",
    "2) Pagamento de entrada (se aplicável) e confirmação de peças.",
    "3) Início do serviço e atualizações de status.",
    "4) Testes finais e agendamento de retirada/entrega.",
    "5) Pagamento do saldo e emissão de garantia/nota."
  ];

  const largura = pageWidth - 30;
  const textoW = largura - 6 - 6;
  let altura = 8 + 8;
  passos.forEach(p => { const t = doc.splitTextToSize(p, textoW); altura += t.length * 4.5 + 2; });

  if (y + altura > pageHeight - 30) { adicionarRodape(doc, pageWidth, pageHeight); doc.addPage(); y = 15; }

  doc.setFillColor(245,245,245); doc.setDrawColor(150,150,150); doc.setLineWidth(0.5);
  doc.rect(15, y, largura, altura, 'FD');
  doc.setFillColor(150,150,150); doc.rect(15, y, largura, 8, 'F');

  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
  doc.text(titulo, 18, y + 5);

  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(60,60,60);
  let yy = y + 16;
  passos.forEach(p => { const t = doc.splitTextToSize(p, textoW); doc.text(t, 18, yy); yy += t.length * 4.5 + 2; });

  doc.lastY = yy + 6;
}

function adicionarCertificadoGarantiaVisualAntigo(doc, pageWidth, pageHeight, yStart) {
    let y = yStart;
    const largura = pageWidth - 30;
    const altura = 36;

    // exemplo de imagem em base64 512x512 (substitua pelo seu base64 real)
    const imagemBase64 = 'data:image/png;base64,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';

    if (y + altura > pageHeight - 30) { 
        adicionarRodape(doc, pageWidth, pageHeight); 
        doc.addPage(); 
        y = 15; 
    }

    // retângulo de fundo do selo
    doc.setFillColor(245,245,245); 
    doc.setDrawColor(150,150,150); 
    doc.setLineWidth(0.5);
    doc.rect(15, y, largura, altura, 'FD');

    // coordenadas do círculo
    const centroX = 30;
    const centroY = y + 18;
    const raio = 12;

    // adiciona a imagem base64 redimensionada pra caber no círculo
    doc.addImage(
        imagemBase64,   // base64 da imagem
        'PNG',          // ou 'JPEG' se a imagem for jpg
        centroX - raio, // posição X (esquerda da imagem)
        centroY - raio, // posição Y (topo da imagem)
        raio * 2,       // largura
        raio * 2        // altura
    );

    // textos da garantia ao lado da imagem
    doc.setTextColor(40,40,40);
    doc.setFont('helvetica','bold'); 
    doc.setFontSize(11);
    doc.text("Garantia Digital Drift", 50, y + 13);

    doc.setFont('helvetica','normal'); 
    doc.setFontSize(9); 
    doc.setTextColor(60,60,60);
    doc.text(
        "Cobertura para mão de obra; peças seguem a garantia do fabricante. Não cobre mau uso, líquidos, impactos, oxidação ou intervenção de terceiros.", 
        50, y + 21, 
        { maxWidth: largura - 55 }
    );

    doc.lastY = y + altura + 10;
}

// ====== RODAPÉ (antigo) ======
function adicionarRodape(doc, pageWidth, pageHeight) {
  const alturaRodape = 25;
  const yRodape = pageHeight - alturaRodape;
  doc.setFillColor(80,80,80); doc.rect(0, yRodape, pageWidth, alturaRodape, 'F');
  doc.setDrawColor(120,120,120); doc.setLineWidth(2); doc.line(0, yRodape, pageWidth, yRodape);
  doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(255,255,255);
  doc.text("Digital Drift - Assistência Técnica", pageWidth/2, yRodape + 8, { align: "center" });
  doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(220,220,220);
  doc.text("(33) 98402-4108  |  Rua Raimundo Martins, 20 - Manhuaçu/MG", pageWidth/2, yRodape + 16, { align: "center" });
  doc.setFontSize(8); doc.setTextColor(180,180,180);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageWidth/2, yRodape + 22, { align: "center" });
}

// =================== RESET / INIT ===================
function limparFormulario() {
  const camposBasicos = ["nome", "telefone", "email", "descricao", "validade", "aceitar-termos"];
  camposBasicos.forEach(id => {
    const campo = document.getElementById(id);
    if (campo) { if (campo.type === 'checkbox') campo.checked = false; else campo.value = ""; }
  });

  for (let i = 1; i <= 4; i++) {
    const camposOpcao = [`subtotal-${i}`, `desconto-${i}`, `total-${i}`];
    camposOpcao.forEach(id => { const campo = document.getElementById(id); if (campo) campo.value = ""; });

    const checkbox = document.getElementById(`checkbox-${i}`); if (checkbox) checkbox.checked = false;

    const tbody = document.querySelector(`#itens-orcamento-${i} tbody`);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td><input type="text" class="item" placeholder="Nome do Item"></td>
          <td><input type="number" class="quantidade" placeholder="Qtd" min="0" step="0.01" oninput="calcularTotal(${i})"></td>
          <td><input type="number" class="valor" placeholder="Valor Unitário" min="0" step="0.01" oninput="calcularTotal(${i})"></td>
          <td><input type="text" class="total-item" readonly></td>
        </tr>
      `;
    }
  }

  const headerOpcoes = document.getElementById("header-opcoes-selecionadas");
  const resumoOpcoes = document.getElementById("resumo-opcoes-selecionadas");
  if (headerOpcoes) headerOpcoes.style.display = "none";
  if (resumoOpcoes) resumoOpcoes.style.display = "none";

  opcoesSelecionadas = [];
}

document.addEventListener("DOMContentLoaded", function() {
  for (let i = 1; i <= 4; i++) {
    const campoDesconto = document.getElementById(`desconto-${i}`);
    if (campoDesconto) campoDesconto.addEventListener("input", () => calcularTotal(i));
    calcularTotal(i);
  }
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'p') { e.preventDefault(); gerarPDF(); }
  });
});
