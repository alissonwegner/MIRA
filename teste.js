/* teste.js — tela de teste: consulta o data/mitre.json e mostra na página.
   Abra teste.html pelo Live Server. */

var campoBusca = document.getElementById('busca');
var resumo = document.getElementById('resumo');
var saida = document.getElementById('saida');

var tecnicas = [];

/* Carrega o arquivo uma vez, quando a página abre. */
async function carrega() {
  var resposta = await fetch('data/mitre.json');
  var dados = await resposta.json();

  tecnicas = dados.tecnicas;

  resumo.textContent = dados.taticas.length + ' táticas · ' +
    tecnicas.length + ' técnicas · ATT&CK v' + dados.versao;

  mostra(tecnicas);
}

/* Desenha uma lista de técnicas na tela. */
function mostra(lista) {
  saida.textContent = '';

  lista.forEach(function (tecnica) {
    var item = document.createElement('div');
    item.className = 'linha';

    var codigo = document.createElement('span');
    codigo.className = 'codigo';
    codigo.textContent = tecnica.id;

    var nome = document.createElement('span');
    nome.textContent = tecnica.nome;

    var taticas = document.createElement('span');
    taticas.className = 'taticas';
    taticas.textContent = tecnica.taticas.join(', ');

    item.append(codigo, nome, taticas);
    saida.appendChild(item);
  });
}

/* A cada tecla digitada, filtra pelo nome, pelo código ou pela tática. */
campoBusca.addEventListener('input', function () {
  var termo = campoBusca.value.toLowerCase();

  var filtradas = tecnicas.filter(function (tecnica) {
    return tecnica.nome.toLowerCase().includes(termo) ||
      tecnica.id.toLowerCase().includes(termo) ||
      tecnica.taticas.join(' ').toLowerCase().includes(termo);
  });

  mostra(filtradas);
});

carrega();
