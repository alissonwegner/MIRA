/* MIRA — matriz do hero.
   Monta a grade, resolve cada célula do estado neutro para o resultado
   e conta o placar. Sem dependências. */

(function () {
  'use strict';

  var COLUNAS = 12;
  var LINHAS = 8;

  /* Técnicas reais, para o tooltip fazer sentido. A ordem alimenta as
     primeiras células; o restante da grade é preenchido com estados
     plausíveis para dar volume visual. */
  var DESTAQUES = [
    { id: 'T1219',     nome: 'Ferramentas de acesso remoto',    estado: 'exp' },
    { id: 'T1021.001', nome: 'Protocolo de área de trabalho',   estado: 'exp' },
    { id: 'T1059.001', nome: 'PowerShell',                      estado: 'cob' },
    { id: 'T1569.002', nome: 'Execução de serviço',             estado: 'exp' },
    { id: 'T1071.001', nome: 'Protocolo web',                   estado: 'cob' },
    { id: 'T1105',     nome: 'Transferência de ferramenta',     estado: 'exp' },
    { id: 'T1078',     nome: 'Contas válidas',                  estado: 'cob' },
    { id: 'T1190',     nome: 'Exploração de aplicação exposta', estado: 'exp' },
    { id: 'T1572',     nome: 'Tunelamento de protocolo',        estado: 'exp' },
    { id: 'T1567',     nome: 'Exfiltração por serviço web',     estado: 'exp' }
  ];

  /* Distribuição do restante: majoritariamente exposto, que é o achado
     típico de uma primeira medição de cobertura. */
  var MISTURA = ['exp', 'exp', 'exp', 'cob', 'exp', 'neu', 'exp', 'cob',
                 'exp', 'exp', 'neu', 'exp', 'cob', 'exp', 'exp', 'neu'];

  var ROTULO = { exp: 'exposta', cob: 'coberta por detecção', neu: 'fora do escopo' };

  var grade = document.getElementById('matriz');
  var placar = document.getElementById('contagem');
  if (!grade) return;

  var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var celulas = [];
  var total = COLUNAS * LINHAS;
  var contas = { exp: 0, cob: 0, neu: 0 };

  for (var i = 0; i < total; i++) {
    var destaque = DESTAQUES[i];
    var estado = destaque ? destaque.estado : MISTURA[i % MISTURA.length];

    var cel = document.createElement('div');
    cel.className = 'cel';
    cel.title = destaque
      ? destaque.id + ' — ' + destaque.nome + ': ' + ROTULO[estado]
      : ROTULO[estado];

    grade.appendChild(cel);
    celulas.push({ no: cel, estado: estado });
    contas[estado]++;
  }

  function escrevePlacar() {
    placar.textContent = contas.cob + ' cobertas, ' + contas.exp + ' expostas';
  }

  function resolve(indice) {
    var item = celulas[indice];
    item.no.classList.add(item.estado, 'resolvida');
  }

  if (semMovimento) {
    for (var j = 0; j < celulas.length; j++) resolve(j);
    escrevePlacar();
  } else {
    /* Onda diagonal: uma única sequência de carregamento, não efeito por seção. */
    celulas.forEach(function (item, indice) {
      var coluna = indice % COLUNAS;
      var linha = Math.floor(indice / COLUNAS);
      var atraso = 260 + (coluna + linha) * 42 + Math.random() * 60;

      item.no.classList.add('ativa');
      window.setTimeout(function () { resolve(indice); }, atraso);
    });
    window.setTimeout(escrevePlacar, 260 + (COLUNAS + LINHAS) * 42 + 120);
  }

  /* Data do instantâneo. Depois isso vem do manifest.json gerado no build. */
  var campoData = document.getElementById('v-data');
  if (campoData) {
    campoData.textContent = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  }

  /* Placeholder até a tela de análise existir. */
  var botao = document.getElementById('abrir-analise');
  if (botao) {
    botao.addEventListener('click', function () {
      window.location.hash = 'como';
    });
  }
})();
