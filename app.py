import sqlite3
from datetime import datetime

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

BANCO = "supermercado.db"

PRODUTOS_INICIAIS = [
    ("Arroz Branco 5kg", "Mercearia", 27.90, 40),
    ("Feijão Carioca 1kg", "Mercearia", 8.19, 60),
    ("Açúcar Refinado 1kg", "Mercearia", 4.59, 50),
    ("Café Torrado 500g", "Mercearia", 22.49, 30),
    ("Óleo de Soja 900ml", "Mercearia", 7.49, 60),
    ("Macarrão Espaguete 500g", "Mercearia", 4.79, 80),
    ("Ovos Dúzia", "Mercearia", 12.90, 50),
    ("Leite Integral 1L", "Laticínios", 5.49, 120),
    ("Queijo Mussarela 500g", "Laticínios", 28.90, 25),
    ("Pão de Forma 500g", "Padaria", 8.49, 40),
    ("Peito de Frango 1kg", "Açougue", 17.90, 35),
    ("Refrigerante Cola 2L", "Bebidas", 9.49, 70),
    ("Papel Higiênico 12 rolos", "Higiene", 19.90, 40),
    ("Detergente Líquido 500ml", "Limpeza", 2.99, 80),
    ("Sabão em Pó 1,6kg", "Limpeza", 21.90, 20),
]


def conectar():
    conexao = sqlite3.connect(BANCO)
    conexao.row_factory = sqlite3.Row
    return conexao


def criar_banco():
    conexao = conectar()

    conexao.execute(
        """CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            categoria TEXT NOT NULL,
            preco REAL NOT NULL,
            estoque INTEGER NOT NULL
        )"""
    )

    conexao.execute(
        """CREATE TABLE IF NOT EXISTS vendas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            data TEXT NOT NULL,
            subtotal REAL NOT NULL,
            desconto REAL NOT NULL,
            total REAL NOT NULL
        )"""
    )

    quantidade = conexao.execute("SELECT COUNT(*) FROM produtos").fetchone()[0]
    if quantidade == 0:
        conexao.executemany(
            "INSERT INTO produtos (nome, categoria, preco, estoque) VALUES (?, ?, ?, ?)",
            PRODUTOS_INICIAIS,
        )

    conexao.commit()
    conexao.close()


def erro(mensagem, status=400):
    return jsonify({"erro": mensagem}), status


def validar_produto(dados):
    if not dados["nome"]:
        return "O nome é obrigatório."
    if dados["preco"] <= 0:
        return "O preço deve ser maior que zero."
    if dados["estoque"] < 0:
        return "O estoque não pode ser negativo."
    return None


def calcular_desconto(subtotal):
    if subtotal > 200:
        return int(subtotal * 5 + 0.5) / 100
    return 0


@app.route("/")
def loja():
    return render_template("loja.html")


@app.route("/admin")
def admin():
    return render_template("admin.html")


@app.route("/api/produtos", methods=["GET"])
def listar_produtos():
    conexao = conectar()
    linhas = conexao.execute("SELECT * FROM produtos ORDER BY nome").fetchall()
    return jsonify([dict(linha) for linha in linhas])


@app.route("/api/produtos", methods=["POST"])
def criar_produto():
    dados = request.get_json()

    mensagem = validar_produto(dados)
    if mensagem:
        return erro(mensagem)

    conexao = conectar()
    conexao.execute(
        "INSERT INTO produtos (nome, categoria, preco, estoque) VALUES (?, ?, ?, ?)",
        (dados["nome"], dados["categoria"] or "Geral", dados["preco"], dados["estoque"]),
    )
    conexao.commit()
    return jsonify({"mensagem": "Produto cadastrado!"}), 201


@app.route("/api/produtos/<int:produto_id>", methods=["PUT"])
def editar_produto(produto_id):
    dados = request.get_json()

    mensagem = validar_produto(dados)
    if mensagem:
        return erro(mensagem)

    conexao = conectar()
    resultado = conexao.execute(
        "UPDATE produtos SET nome = ?, categoria = ?, preco = ?, estoque = ? WHERE id = ?",
        (dados["nome"], dados["categoria"] or "Geral", dados["preco"], dados["estoque"], produto_id),
    )
    conexao.commit()

    if resultado.rowcount == 0:
        return erro("Produto não encontrado.", 404)
    return jsonify({"mensagem": "Produto atualizado!"})


@app.route("/api/produtos/<int:produto_id>", methods=["DELETE"])
def deletar_produto(produto_id):
    conexao = conectar()
    resultado = conexao.execute("DELETE FROM produtos WHERE id = ?", (produto_id,))
    conexao.commit()

    if resultado.rowcount == 0:
        return erro("Produto não encontrado.", 404)
    return jsonify({"mensagem": "Produto excluído!"})


@app.route("/api/compras", methods=["POST"])
def realizar_compra():
    itens = request.get_json()["itens"]
    if not itens:
        return erro("Escolha pelo menos um produto.")

    conexao = conectar()
    subtotal = 0

    for item in itens:
        produto = conexao.execute(
            "SELECT * FROM produtos WHERE id = ?", (item["id"],)
        ).fetchone()

        if produto is None:
            return erro("Produto não encontrado.", 404)
        if item["quantidade"] <= 0:
            return erro("A quantidade deve ser maior que zero.")
        if item["quantidade"] > produto["estoque"]:
            return erro(
                f"Estoque insuficiente de {produto['nome']}. Disponível: {produto['estoque']}.",
                409,
            )

        subtotal += produto["preco"] * item["quantidade"]

    subtotal = round(subtotal, 2)
    desconto = calcular_desconto(subtotal)
    total = round(subtotal - desconto, 2)

    for item in itens:
        conexao.execute(
            "UPDATE produtos SET estoque = estoque - ? WHERE id = ?",
            (item["quantidade"], item["id"]),
        )

    conexao.execute(
        "INSERT INTO vendas (data, subtotal, desconto, total) VALUES (?, ?, ?, ?)",
        (datetime.now().strftime("%d/%m/%Y %H:%M"), subtotal, desconto, total),
    )
    conexao.commit()

    return jsonify({"subtotal": subtotal, "desconto": desconto, "total": total}), 201


@app.route("/api/vendas", methods=["GET"])
def listar_vendas():
    conexao = conectar()
    linhas = conexao.execute("SELECT * FROM vendas ORDER BY id DESC").fetchall()
    return jsonify([dict(linha) for linha in linhas])


@app.route("/api/vendas", methods=["DELETE"])
def apagar_vendas():
    conexao = conectar()
    conexao.execute("DELETE FROM vendas")
    conexao.commit()
    return jsonify({"mensagem": "Histórico de vendas apagado!"})


criar_banco()

if __name__ == "__main__":
    app.run(debug=True)
