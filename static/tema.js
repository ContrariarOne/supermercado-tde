const botaoTema = document.getElementById("botao-tema");
const botoesCores = document.querySelectorAll(".cor");

function aplicarTema() {
  if (localStorage.getItem("tema") === "escuro") {
    document.body.classList.add("escuro");
    botaoTema.textContent = "Modo claro";
  } else {
    document.body.classList.remove("escuro");
    botaoTema.textContent = "Modo escuro";
  }
}

function aplicarCor() {
  const cor = localStorage.getItem("cor");
  if (cor) {
    document.documentElement.style.setProperty("--cor", cor);
  }
}

botaoTema.onclick = function () {
  if (localStorage.getItem("tema") === "escuro") {
    localStorage.setItem("tema", "claro");
  } else {
    localStorage.setItem("tema", "escuro");
  }
  aplicarTema();
};

for (const botao of botoesCores) {
  botao.onclick = function () {
    localStorage.setItem("cor", botao.dataset.cor);
    aplicarCor();
  };
}

aplicarTema();
aplicarCor();
