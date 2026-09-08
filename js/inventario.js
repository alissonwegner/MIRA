/* MIRA — tela de inventário.
   Cada categoria (firewall, switch, etc.) tem um JSON próprio em data/*.json
   com os fabricantes disponíveis. Um fabricante pode ter "versoes" direto
   (ex.: firewall) ou uma lista de "modelos", cada um com suas "versoes"
   (ex.: switch) — o select de modelo só existe no HTML das categorias que
   precisam dele. */

(function () {
  'use strict';

  var STORAGE_KEY = 'mira-inventario';

  /* Ordem das camadas do desenho, de cima para baixo. Categorias que ainda
     não estão aqui (novas categorias futuras) entram numa camada extra ao final. */
  var ORDEM_CAMADAS = ['firewall', 'switch', 'maquina'];
  var NOMES_CATEGORIA = { firewall: 'Firewall', switch: 'Switch', maquina: 'Máquina' };

  var categorias = document.querySelectorAll('.categoria');
  var listaAdicionados = document.querySelector('.itens-adicionados');
  var vazioAviso = document.querySelector('.vazio-aviso');

  var painelDesenho = document.querySelector('.painel-desenho');
  var desenhoVazio = document.querySelector('.desenho-vazio');
  var svgLinhas = document.querySelector('.linhas-desenho');
  var containerNos = document.querySelector('.linhas-container');

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
  renderizaDesenho();

  var redimensionaTimeout;
  window.addEventListener('resize', function () {
    clearTimeout(redimensionaTimeout);
    redimensionaTimeout = setTimeout(renderizaDesenho, 150);
  });

  function iniciaCategoria(nome, corpo) {
    var campoFabricante = corpo.querySelector('.campo-fabricante');
    var campoModelo = corpo.querySelector('.campo-modelo');
    var campoVersao = corpo.querySelector('.campo-versao');
    var previa = corpo.querySelector('.previa-fabricante');
    var icone = corpo.querySelector('.icone-fabricante');
    var iconeGenerico = corpo.querySelector('.icone-generica');
    var nomeFabricante = corpo.querySelector('.nome-fabricante');
    var botaoAdicionar = corpo.querySelector('.botao-adicionar');
    var avisoCarregamento = corpo.querySelector('.aviso-carregamento');

    var fabricantes = [];
    var fabricanteAtual = null;

    fetch('data/' + nome + '.json')
      .then(function (resposta) {
        if (!resposta.ok) throw new Error('resposta ' + resposta.status);
        return resposta.json();
      })
      .then(function (dados) {
        fabricantes = dados.fabricantes || [];
        preencheIndexado(campoFabricante, fabricantes, 'Nenhum fabricante cadastrado');
      })
      .catch(function () {
        resetaSelect(campoFabricante, 'Não foi possível carregar');
        avisoCarregamento.textContent = 'Não foi possível carregar os dados de ' + nome +
          '. Isso é esperado se a página estiver sendo aberta direto do arquivo, em vez de por um servidor.';
        avisoCarregamento.hidden = false;
      });

    campoFabricante.addEventListener('change', function () {
      fabricanteAtual = fabricantes[Number(campoFabricante.value)] || null;

      if (!fabricanteAtual) {
        previa.hidden = true;
        if (campoModelo) resetaSelect(campoModelo, 'Selecione o fabricante');
        resetaSelect(campoVersao, campoModelo ? 'Selecione o modelo' : 'Selecione o fabricante');
        botaoAdicionar.disabled = true;
        return;
      }

      mostraPrevia(fabricanteAtual);

      if (campoModelo) {
        preencheIndexado(campoModelo, fabricanteAtual.modelos, 'Nenhum modelo cadastrado');
        resetaSelect(campoVersao, 'Selecione o modelo');
      } else {
        preencheValores(campoVersao, fabricanteAtual.versoes, 'Nenhuma versão cadastrada');
      }

      botaoAdicionar.disabled = false;
    });

    if (campoModelo) {
      campoModelo.addEventListener('change', function () {
        var modelo = (fabricanteAtual && fabricanteAtual.modelos) ?
          fabricanteAtual.modelos[Number(campoModelo.value)] : null;

        if (modelo) {
          preencheValores(campoVersao, modelo.versoes, 'Nenhuma versão cadastrada');
        } else {
          resetaSelect(campoVersao, 'Selecione o modelo');
        }
      });
    }

    botaoAdicionar.addEventListener('click', function () {
      if (!fabricanteAtual) return;

      var modeloSelecionado = null;
      if (campoModelo && fabricanteAtual.modelos) {
        modeloSelecionado = fabricanteAtual.modelos[Number(campoModelo.value)] || null;
      }

      inventario.push({
        categoria: nome,
        fabricante: fabricanteAtual.nome,
        icone: fabricanteAtual.icone || null,
        modelo: modeloSelecionado ? modeloSelecionado.nome : null,
        versao: campoVersao.value || null
      });
      salvaInventario();
      renderizaLista();
      renderizaDesenho();
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
      iconeGenerico.textContent = iniciais(nomeFab);
      iconeGenerico.hidden = false;
    }
  }

  /* Select indexado: cada opção vale o índice do item na lista (fabricantes ou modelos),
     já que dois itens podem ter nomes parecidos e precisamos achar o objeto de volta. */
  function preencheIndexado(select, itens, vazioTexto) {
    select.innerHTML = '';
    if (itens && itens.length) {
      select.appendChild(novaOpcao('', 'Selecione…'));
      itens.forEach(function (item, i) {
        select.appendChild(novaOpcao(String(i), item.nome));
      });
      select.disabled = false;
    } else {
      select.appendChild(novaOpcao('', vazioTexto));
      select.disabled = true;
    }
  }

  /* Select de valores simples (versões): o próprio texto já é o valor. */
  function preencheValores(select, valores, vazioTexto) {
    select.innerHTML = '';
    if (valores && valores.length) {
      select.appendChild(novaOpcao('', 'Selecione…'));
      valores.forEach(function (v) {
        select.appendChild(novaOpcao(v, v));
      });
      select.disabled = false;
    } else {
      select.appendChild(novaOpcao('', vazioTexto));
      select.disabled = true;
    }
  }

  function resetaSelect(select, texto) {
    select.innerHTML = '';
    select.appendChild(novaOpcao('', texto));
    select.disabled = true;
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
      texto.textContent = item.fabricante +
        (item.modelo ? ' ' + item.modelo : '') +
        (item.versao ? ' — ' + item.versao : '');
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
        renderizaDesenho();
      });
      li.appendChild(remover);

      listaAdicionados.appendChild(li);
    });
  }

  /* Desenho da infraestrutura: agrupa os equipamentos por categoria e desenha
     uma camada (linha horizontal) por categoria, na ordem de ORDEM_CAMADAS.
     Cada nó de uma camada é ligado por uma linha a todos os nós da camada
     imediatamente acima. */
  function renderizaDesenho() {
    if (!painelDesenho) return;

    desenhoVazio.hidden = inventario.length > 0;
    svgLinhas.innerHTML = '';
    containerNos.innerHTML = '';

    if (!inventario.length) return;

    var grupos = {};
    var ordemDescoberta = [];
    inventario.forEach(function (item) {
      if (!grupos[item.categoria]) {
        grupos[item.categoria] = [];
        ordemDescoberta.push(item.categoria);
      }
      grupos[item.categoria].push(item);
    });

    var categoriasPresentes = Object.keys(grupos).sort(function (a, b) {
      var pa = ORDEM_CAMADAS.indexOf(a);
      var pb = ORDEM_CAMADAS.indexOf(b);
      if (pa === -1) pa = ORDEM_CAMADAS.length + ordemDescoberta.indexOf(a);
      if (pb === -1) pb = ORDEM_CAMADAS.length + ordemDescoberta.indexOf(b);
      return pa - pb;
    });

    var largura = painelDesenho.clientWidth;
    var altura = painelDesenho.clientHeight;
    var numCamadas = categoriasPresentes.length;
    var margemV = 55;
    var passoV = numCamadas > 1 ? (altura - margemV * 2) / (numCamadas - 1) : 0;

    var posicoesPorCamada = [];

    categoriasPresentes.forEach(function (categoria, camadaIdx) {
      var itens = grupos[categoria];
      var y = numCamadas > 1 ? margemV + passoV * camadaIdx : altura / 2;
      var passoH = largura / (itens.length + 1);

      var posicoes = itens.map(function (item, i) {
        return { x: passoH * (i + 1), y: y, item: item, categoria: categoria };
      });

      posicoes.forEach(function (pos) {
        containerNos.appendChild(criaNo(pos));
      });

      posicoesPorCamada.push(posicoes);
    });

    svgLinhas.setAttribute('viewBox', '0 0 ' + largura + ' ' + altura);

    for (var c = 1; c < posicoesPorCamada.length; c++) {
      posicoesPorCamada[c].forEach(function (pos) {
        posicoesPorCamada[c - 1].forEach(function (posAcima) {
          svgLinhas.appendChild(criaLinha(posAcima, pos));
        });
      });
    }
  }

  function criaNo(pos) {
    var no = document.createElement('div');
    no.className = 'no-desenho';
    no.style.left = pos.x + 'px';
    no.style.top = pos.y + 'px';

    var caixa = document.createElement('div');
    caixa.className = 'no-caixa';

    var rotulo = document.createElement('span');
    rotulo.className = 'no-categoria';
    rotulo.textContent = NOMES_CATEGORIA[pos.categoria] || pos.categoria;
    caixa.appendChild(rotulo);

    if (pos.item.icone) {
      var img = document.createElement('img');
      img.className = 'icone-item';
      img.alt = '';
      img.src = 'https://cdn.simpleicons.org/' + pos.item.icone;
      img.onerror = function () { img.replaceWith(iconeGenericoItem(pos.item.fabricante)); };
      caixa.appendChild(img);
    } else {
      caixa.appendChild(iconeGenericoItem(pos.item.fabricante));
    }

    var texto = document.createElement('span');
    texto.className = 'no-texto';
    texto.textContent = pos.item.fabricante + (pos.item.modelo ? ' ' + pos.item.modelo : '');
    caixa.appendChild(texto);

    no.appendChild(caixa);
    return no;
  }

  function criaLinha(a, b) {
    var linha = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    linha.setAttribute('x1', a.x);
    linha.setAttribute('y1', a.y);
    linha.setAttribute('x2', b.x);
    linha.setAttribute('y2', b.y);
    linha.setAttribute('class', 'linha-conexao');
    return linha;
  }

  function iconeGenericoItem(nomeFab) {
    var span = document.createElement('span');
    span.className = 'icone-generica icone-item';
    span.textContent = iniciais(nomeFab);
    return span;
  }

  function iniciais(nomeFab) {
    return (nomeFab.replace(/[^A-Za-zÀ-ÿ0-9]/g, '').charAt(0) || '?').toUpperCase();
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
