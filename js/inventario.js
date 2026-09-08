/* MIRA — tela de inventário.
   Cada categoria (firewall, etc.) tem um JSON próprio em data/*.json
   com os fabricantes e versões disponíveis. */

(function () {
  'use strict';

  var STORAGE_KEY = 'mira-inventario';

  var categorias = document.querySelectorAll('.categoria');
  var listaAdicionados = document.querySelector('.itens-adicionados');
  var vazioAviso = document.querySelector('.vazio-aviso');

  var inventario = carregaInventario();

  categorias.forEach(function (botao) {
    var nome = botao.dataset.categoria;
    var corpo = document.querySelector('.categoria-corpo[data-corpo="' + nome + '"]');
    if (!corpo) return;

    botao.addEventListener('click', function () {
      var aberto = botao.getAttribute('aria-expanded') === 'true';
      botao.setAttribute('aria-expanded', String(!aberto));
      corpo.hidden = aberto;
    });

    iniciaCategoria(nome, corpo);
  });

  renderizaLista();

  function iniciaCategoria(nome, corpo) {
    var campoFabricante = corpo.querySelector('.campo-fabricante');
    var campoVersao = corpo.querySelector('.campo-versao');
    var previa = corpo.querySelector('.previa-fabricante');
    var icone = corpo.querySelector('.icone-fabricante');
    var iconeGenerico = corpo.querySelector('.icone-generica');
    var nomeFabricante = corpo.querySelector('.nome-fabricante');
    var botaoAdicionar = corpo.querySelector('.botao-adicionar');
    var avisoCarregamento = corpo.querySelector('.aviso-carregamento');

    var fabricantes = [];

    fetch('data/' + nome + '.json')
      .then(function (resposta) {
        if (!resposta.ok) throw new Error('resposta ' + resposta.status);
        return resposta.json();
      })
      .then(function (dados) {
        fabricantes = dados.fabricantes || [];
        campoFabricante.innerHTML = '';
        campoFabricante.appendChild(novaOpcao('', 'Selecione…'));
        fabricantes.forEach(function (f, i) {
          campoFabricante.appendChild(novaOpcao(String(i), f.nome));
        });
      })
      .catch(function () {
        campoFabricante.innerHTML = '';
        campoFabricante.appendChild(novaOpcao('', 'Não foi possível carregar'));
        avisoCarregamento.textContent = 'Não foi possível carregar os dados de ' + nome +
          '. Isso é esperado se a página estiver sendo aberta direto do arquivo, em vez de por um servidor.';
        avisoCarregamento.hidden = false;
      });

    campoFabricante.addEventListener('change', function () {
      var fabricante = fabricantes[Number(campoFabricante.value)];

      if (!fabricante) {
        previa.hidden = true;
        campoVersao.innerHTML = '';
        campoVersao.appendChild(novaOpcao('', 'Selecione o fabricante'));
        campoVersao.disabled = true;
        botaoAdicionar.disabled = true;
        return;
      }

      mostraPrevia(fabricante);

      campoVersao.innerHTML = '';
      if (fabricante.versoes && fabricante.versoes.length) {
        campoVersao.appendChild(novaOpcao('', 'Selecione…'));
        fabricante.versoes.forEach(function (v) {
          campoVersao.appendChild(novaOpcao(v, v));
        });
        campoVersao.disabled = false;
      } else {
        campoVersao.appendChild(novaOpcao('', 'Nenhuma versão cadastrada'));
        campoVersao.disabled = true;
      }

      botaoAdicionar.disabled = false;
    });

    botaoAdicionar.addEventListener('click', function () {
      var fabricante = fabricantes[Number(campoFabricante.value)];
      if (!fabricante) return;

      inventario.push({
        categoria: nome,
        fabricante: fabricante.nome,
        icone: fabricante.icone || null,
        versao: campoVersao.value || null
      });
      salvaInventario();
      renderizaLista();
    });

    function mostraPrevia(fabricante) {
      nomeFabricante.textContent = fabricante.nome;
      previa.hidden = false;

      icone.hidden = true;
      iconeGenerico.hidden = true;

      if (fabricante.icone) {
        icone.src = 'https://cdn.simpleicons.org/' + fabricante.icone;
        icone.alt = fabricante.nome;
        icone.hidden = false;
        icone.onerror = function () {
          icone.hidden = true;
          mostraIconeGenerico(fabricante.nome);
        };
      } else {
        mostraIconeGenerico(fabricante.nome);
      }
    }

    function mostraIconeGenerico(nomeFab) {
      iconeGenerico.textContent = (nomeFab.replace(/[^A-Za-zÀ-ÿ0-9]/g, '').charAt(0) || '?').toUpperCase();
      iconeGenerico.hidden = false;
    }
  }

  function renderizaLista() {
    listaAdicionados.innerHTML = '';
    vazioAviso.hidden = inventario.length > 0;

    inventario.forEach(function (item, i) {
      var li = document.createElement('li');
      li.className = 'item-adicionado';

      if (item.icone) {
        var img = document.createElement('img');
        img.className = 'icone-item';
        img.alt = '';
        img.src = 'https://cdn.simpleicons.org/' + item.icone;
        img.onerror = function () { img.replaceWith(iconeGenericoItem(item.fabricante)); };
        li.appendChild(img);
      } else {
        li.appendChild(iconeGenericoItem(item.fabricante));
      }

      var texto = document.createElement('span');
      texto.className = 'texto-item';
      texto.textContent = item.fabricante + (item.versao ? ' — ' + item.versao : '');
      li.appendChild(texto);

      var remover = document.createElement('button');
      remover.type = 'button';
      remover.className = 'remover-item';
      remover.setAttribute('aria-label', 'Remover ' + item.fabricante);
      remover.textContent = '×';
      remover.addEventListener('click', function () {
        inventario.splice(i, 1);
        salvaInventario();
        renderizaLista();
      });
      li.appendChild(remover);

      listaAdicionados.appendChild(li);
    });
  }

  function iconeGenericoItem(nomeFab) {
    var span = document.createElement('span');
    span.className = 'icone-generica icone-item';
    span.textContent = (nomeFab.replace(/[^A-Za-zÀ-ÿ0-9]/g, '').charAt(0) || '?').toUpperCase();
    return span;
  }

  function novaOpcao(valor, texto) {
    var opcao = document.createElement('option');
    opcao.value = valor;
    opcao.textContent = texto;
    return opcao;
  }

  function carregaInventario() {
    try {
      var salvo = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
      return Array.isArray(salvo) ? salvo : [];
    } catch (erro) {
      return [];
    }
  }

  function salvaInventario() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inventario));
    } catch (erro) {
      /* localStorage indisponível (modo privado, cota cheia etc.); segue sem persistir */
    }
  }
})();
