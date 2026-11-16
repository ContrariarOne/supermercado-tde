let produtos = [];

const formulario = document.getElementById("formulario");
const campoId = document.getElementById("campo-id");
const campoNome = document.getElementById("campo-nome");
const campoCategoria = document.getElementById("campo-categoria");
const campoPreco = document.getElementById("campo-preco");
const campoEstoque = document.getElementById("campo-estoque");

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

  const tabela = document.getElementById("tabela-produtos");
  tabela.innerHTML = "";

  for (const produto of produtos) {
    tabela.innerHTML += `
      <tr>
        <td>${produto.nome}</td>
        <td>${produto.categoria}</td>
        <td>${dinheiro(produto.preco)}</td>
        <td>${produto.estoque}</td>
        <td>
          <button onclick="editar(${produto.id})">Editar</button>
          <button class="vermelho" onclick="deletar(${produto.id})">Excluir</button>
        </td>
      </tr>`;
  }
}

async function carregarVendas() {
  const resposta = await fetch("/api/vendas");
  const vendas = await resposta.json();

  const tabela = document.getElementById("tabela-vendas");
  tabela.innerHTML = "";

  for (const venda of vendas) {
    tabela.innerHTML += `
      <tr>
        <td>${venda.data}</td>
        <td>${dinheiro(venda.subtotal)}</td>
        <td>${dinheiro(venda.desconto)}</td>
        <td>${dinheiro(venda.total)}</td>
      </tr>`;
  }
}

function editar(id) {
  const produto = produtos.find((p) => p.id === id);

  campoId.value = produto.id;
  campoNome.value = produto.nome;
  campoCategoria.value = produto.categoria;
  campoPreco.value = produto.preco;
  campoEstoque.value = produto.estoque;

  document.getElementById("titulo-formulario").textContent = "Editar produto";
  window.scrollTo(0, 0);
}

async function salvar(evento) {
  evento.preventDefault();

  const dados = {
    nome: campoNome.value.trim(),
    categoria: campoCategoria.value.trim(),
    preco: Number(campoPreco.value),
    estoque: Number(campoEstoque.value),
  };

  let url = "/api/produtos";
  let metodo = "POST";
  if (campoId.value !== "") {
    url = "/api/produtos/" + campoId.value;
    metodo = "PUT";
  }

  const resposta = await fetch(url, {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  const resultado = await resposta.json();

  if (!resposta.ok) {
    mostrarMensagem(resultado.erro, "erro");
    return;
  }

  mostrarMensagem(resultado.mensagem, "ok");
  formulario.reset();
  campoId.value = "";
  document.getElementById("titulo-formulario").textContent = "Novo produto";
  carregarProdutos();
}

async function deletar(id) {
  if (!confirm("Deseja excluir este produto?")) {
    return;
  }

  const resposta = await fetch("/api/produtos/" + id, { method: "DELETE" });
  const resultado = await resposta.json();

  if (!resposta.ok) {
    mostrarMensagem(resultado.erro, "erro");
    return;
  }

  mostrarMensagem(resultado.mensagem, "ok");
  carregarProdutos();
}

async function apagarVendas() {
  if (!confirm("Deseja apagar todo o histórico de vendas?")) {
    return;
  }

  const resposta = await fetch("/api/vendas", { method: "DELETE" });
  const resultado = await resposta.json();

  mostrarMensagem(resultado.mensagem, "ok");
  carregarVendas();
}

formulario.onsubmit = salvar;

document.getElementById("botao-apagar-vendas").onclick = apagarVendas;

carregarProdutos();
carregarVendas();
