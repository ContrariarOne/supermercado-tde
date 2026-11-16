let produtos = [];

function dinheiro(valor) {
  return "R$ " + valor.toFixed(2).replace(".", ",");
}

function mostrarMensagem(texto, tipo) {
  const caixa = document.getElementById("mensagem");
  caixa.textContent = texto;
  caixa.className = "mensagem " + tipo;
}

async function carregarProdutos() {
  const resposta = await fetch("/api/produtos");
  produtos = await resposta.json();

  const tabela = document.getElementById("lista-produtos");
  tabela.innerHTML = "";

  for (const produto of produtos) {
    tabela.innerHTML += `
      <tr>
        <td>${produto.nome}</td>
        <td>${produto.categoria}</td>
        <td>${dinheiro(produto.preco)}</td>
        <td>${produto.estoque}</td>
        <td>
          <input type="number" id="qtd-${produto.id}" value="0" min="0" max="${produto.estoque}"
            oninput="atualizarTotais()" ${produto.estoque === 0 ? "disabled" : ""}>
        </td>
      </tr>`;
  }

  atualizarTotais();
}

function lerQuantidade(produto) {
  const valor = Number(document.getElementById("qtd-" + produto.id).value);
  if (valor < 0 || !Number.isInteger(valor)) {
    return 0;
  }
  return valor;
}

function atualizarTotais() {
  let subtotal = 0;
  for (const produto of produtos) {
    subtotal += produto.preco * lerQuantidade(produto);
  }

  subtotal = Math.round(subtotal * 100) / 100;

  let desconto = 0;
  if (subtotal > 200) {
    desconto = Math.round(subtotal * 5) / 100;
  }
  const total = Math.round((subtotal - desconto) * 100) / 100;

  document.getElementById("subtotal").textContent = dinheiro(subtotal);
  document.getElementById("desconto").textContent = dinheiro(desconto);
  document.getElementById("total").textContent = dinheiro(total);
}

async function finalizarCompra() {
  const itens = [];
  for (const produto of produtos) {
    const quantidade = lerQuantidade(produto);
    if (quantidade > 0) {
      itens.push({ id: produto.id, quantidade: quantidade });
    }
  }

  if (itens.length === 0) {
    mostrarMensagem("Digite a quantidade de pelo menos um produto.", "erro");
    return;
  }

  const resposta = await fetch("/api/compras", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itens: itens }),
  });
  const dados = await resposta.json();

  if (!resposta.ok) {
    mostrarMensagem(dados.erro, "erro");
    carregarProdutos();
    return;
  }

  let texto = "Compra realizada! Subtotal: " + dinheiro(dados.subtotal);
  if (dados.desconto > 0) {
    texto += " | Desconto de 5%: " + dinheiro(dados.desconto);
  }
  texto += " | Total: " + dinheiro(dados.total);

  await carregarProdutos();
  mostrarMensagem(texto, "ok");
}

document.getElementById("botao-finalizar").onclick = finalizarCompra;

carregarProdutos();
