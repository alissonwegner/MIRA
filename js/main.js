/* MIRA — navegação entre telas pelo menu.
   Uma página só; o hash da URL decide qual seção fica visível. */

(function () {
  'use strict';

  var TELAS = ['inicio', 'como', 'privacidade'];
  var PADRAO = 'inicio';

  var links = document.querySelectorAll('.nav a[data-tela]');
  var conteudo = document.getElementById('conteudo');

  function mostra(nome, moverFoco) {
    if (TELAS.indexOf(nome) === -1) nome = PADRAO;

    TELAS.forEach(function (t) {
      var secao = document.getElementById('tela-' + t);
      if (secao) secao.hidden = (t !== nome);
    });

    for (var i = 0; i < links.length; i++) {
      if (links[i].dataset.tela === nome) {
        links[i].setAttribute('aria-current', 'page');
      } else {
        links[i].removeAttribute('aria-current');
      }
    }

    /* Sem isso o leitor de tela e o teclado continuam onde estavam
       e a troca de tela passa despercebida. */
    if (moverFoco && conteudo) {
      conteudo.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }
  }

  function daUrl() {
    return window.location.hash.replace('#', '') || PADRAO;
  }

  window.addEventListener('hashchange', function () {
    mostra(daUrl(), true);
  });

  mostra(daUrl(), false);
})();