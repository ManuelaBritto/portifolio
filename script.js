/* =========================================================
   M.Britto — interações
   1. Pinturas geradas em canvas (hero, obras, pinceladas)
   2. Nome do hero letra por letra (hover)
   3. Navbar: menu mobile, link ativo, sombra ao rolar
   4. Filtro das obras
   5. Copiar e-mail
   6. Cursor gráfico
   ========================================================= */
(function () {
  "use strict";

  const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. PINTURA EM CANVAS ---------- */

  // gerador aleatório com semente: a mesma obra sempre sai igual
  function aleatorio(semente) {
    let a = semente >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // paletas: [fundo, cores das pinceladas...]
  const PALETAS = [
    ["#0b0a08", "#f2c230", "#c98a1b", "#efe7d3", "#2e2a20", "#f7d75e"],
    ["#efe7d3", "#0b0a08", "#f2c230", "#c98a1b", "#8a5a12"],
    ["#f4ecd6", "#f2c230", "#e8a93a", "#c98a1b", "#3a3324"],
    ["#2a1d0c", "#c98a1b", "#f2c230", "#e0b866", "#0b0a08", "#efe7d3"],
    ["#f2c230", "#0b0a08", "#c98a1b", "#fff3c4", "#2e2a20"],
  ];

  function prepararCanvas(canvas) {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  // uma pincelada com textura de cerdas
  function pincel(ctx, rnd, p) {
    const { x, y, comp, larg, ang, cor, alfa = 0.9 } = p;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);

    // corpo da tinta
    ctx.globalAlpha = alfa * 0.85;
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(rnd() * comp * 0.05, -larg / 2);
    ctx.lineTo(comp * (0.88 + rnd() * 0.12), -larg / 2 + (rnd() - 0.5) * larg * 0.25);
    ctx.lineTo(comp * (0.78 + rnd() * 0.2), larg / 2 + (rnd() - 0.5) * larg * 0.25);
    ctx.lineTo(rnd() * comp * 0.06, larg / 2);
    ctx.closePath();
    ctx.fill();

    // cerdas
    const n = Math.max(8, Math.round(larg / 2.2));
    ctx.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const off = (i / (n - 1) - 0.5) * larg * 1.05;
      const ini = -rnd() * comp * 0.04;
      const fim = comp * (0.8 + rnd() * 0.3);
      ctx.globalAlpha = alfa * (0.25 + rnd() * 0.6);
      ctx.lineWidth = 0.6 + rnd() * 2.4;
      // algumas cerdas mais claras ou mais escuras dão relevo de impasto
      const sorteio = rnd();
      ctx.strokeStyle = sorteio < 0.12 ? "rgba(255,248,226,.55)" : sorteio < 0.24 ? "rgba(0,0,0,.35)" : cor;
      ctx.beginPath();
      ctx.moveTo(ini, off);
      ctx.bezierCurveTo(
        fim * 0.33, off + (rnd() - 0.5) * 5,
        fim * 0.66, off + (rnd() - 0.5) * 5,
        fim, off + (rnd() - 0.5) * 3
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  // respingos e escorridos
  function respingos(ctx, rnd, w, h, cores, qtd) {
    for (let i = 0; i < qtd; i++) {
      ctx.globalAlpha = 0.5 + rnd() * 0.5;
      ctx.fillStyle = cores[Math.floor(rnd() * cores.length)];
      ctx.beginPath();
      ctx.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  function escorridos(ctx, rnd, w, h, cor, qtd) {
    ctx.strokeStyle = cor;
    ctx.lineCap = "round";
    for (let i = 0; i < qtd; i++) {
      const x = rnd() * w;
      const y = rnd() * h * 0.6;
      ctx.globalAlpha = 0.5 + rnd() * 0.4;
      ctx.lineWidth = 1 + rnd() * 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd() - 0.5) * 4, y + h * (0.1 + rnd() * 0.35));
      ctx.stroke();
    }
  }

  // gera a lista de pinceladas de uma tela (blocos verticais e horizontais, como espátula)
  function planejarPinceladas(rnd, w, h, cores, densidade) {
    const lista = [];
    const total = Math.round(densidade * (w * h) / 9000) + 12;
    for (let i = 0; i < total; i++) {
      const vertical = rnd() < 0.42;
      const base = Math.min(w, h);
      const comp = (vertical ? h : w) * (0.18 + rnd() * 0.5);
      const larg = base * (0.04 + rnd() * 0.14);
      const ang = (vertical ? Math.PI / 2 : 0) + (rnd() - 0.5) * 0.35 + (rnd() < 0.5 ? Math.PI : 0);
      lista.push({
        x: rnd() * w,
        y: rnd() * h,
        comp, larg, ang,
        cor: cores[Math.floor(rnd() * cores.length)],
        alfa: 0.75 + rnd() * 0.25,
      });
    }
    return lista;
  }

  function pintarObra(canvas) {
    const { ctx, w, h } = prepararCanvas(canvas);
    const semente = Number(canvas.dataset.seed) || 1;
    const paleta = PALETAS[Number(canvas.dataset.paleta) % PALETAS.length] || PALETAS[0];
    const rnd = aleatorio(semente);
    const [fundo, ...cores] = paleta;

    ctx.globalAlpha = 1;
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 0, w, h);

    planejarPinceladas(rnd, w, h, cores, 1.1).forEach((p) => pincel(ctx, rnd, p));
    escorridos(ctx, rnd, w, h, cores[0], 3 + Math.floor(rnd() * 4));
    respingos(ctx, rnd, w, h, cores, 40);
    ctx.globalAlpha = 1;
  }

  // pincelada amarela atrás dos títulos das seções
  function pintarPincelada(canvas) {
    const { ctx, w, h } = prepararCanvas(canvas);
    const rnd = aleatorio(Number(canvas.dataset.seed) || 3);
    ctx.clearRect(0, 0, w, h);
    pincel(ctx, rnd, { x: 6, y: h * 0.55, comp: w * 0.92, larg: h * 0.42, ang: -0.04, cor: "#f2c230", alfa: 0.22 });
    pincel(ctx, rnd, { x: w * 0.12, y: h * 0.72, comp: w * 0.55, larg: h * 0.16, ang: 0.02, cor: "#c98a1b", alfa: 0.25 });
    ctx.globalAlpha = 1;
  }

  // hero: a tela vai sendo pintada aos poucos
  let animacaoHero = 0;
  function pintarHero(canvas, animar) {
    cancelAnimationFrame(animacaoHero);
    const { ctx, w, h } = prepararCanvas(canvas);
    const rnd = aleatorio(2026);
    const cores = ["#f2c230", "#c98a1b", "#efe7d3", "#2e2a20", "#e8a93a", "#0b0a08", "#f7d75e", "#8a5a12"];

    ctx.fillStyle = "#14110b";
    ctx.fillRect(0, 0, w, h);

    const lista = planejarPinceladas(rnd, w, h, cores, 1.6);
    const fim = () => {
      escorridos(ctx, rnd, w, h, "#0b0a08", 14);
      escorridos(ctx, rnd, w, h, "#c4421a", 4);
      respingos(ctx, rnd, w, h, cores, 160);
      ctx.globalAlpha = 1;
    };

    if (!animar) {
      lista.forEach((p) => pincel(ctx, rnd, p));
      fim();
      return;
    }
    let i = 0;
    const porQuadro = Math.max(2, Math.ceil(lista.length / 90));
    (function quadro() {
      for (let k = 0; k < porQuadro && i < lista.length; k++, i++) pincel(ctx, rnd, lista[i]);
      if (i < lista.length) animacaoHero = requestAnimationFrame(quadro);
      else fim();
    })();
  }

  function pintarTudo(animarHero) {
    document.querySelectorAll('canvas[data-paint="obra"]').forEach(pintarObra);
    document.querySelectorAll('canvas[data-paint="pincelada"]').forEach(pintarPincelada);
    document.querySelectorAll('canvas[data-paint="hero"]').forEach((c) => pintarHero(c, animarHero));
  }

  // repinta quando a largura muda (não a cada pixel de rolagem no celular)
  let larguraAnterior = window.innerWidth;
  let espera;
  window.addEventListener("resize", () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      if (window.innerWidth === larguraAnterior) return;
      larguraAnterior = window.innerWidth;
      pintarTudo(false);
    }, 180);
  });

  /* ---------- 2. NOME LETRA POR LETRA ---------- */
  document.querySelectorAll(".split").forEach((el) => {
    const texto = el.textContent.trim();
    el.setAttribute("aria-label", texto);
    el.textContent = "";
    texto.split(" ").forEach((palavra, idx, arr) => {
      const p = document.createElement("span");
      p.className = "palavra";
      p.setAttribute("aria-hidden", "true");
      [...palavra].forEach((ch) => {
        const s = document.createElement("span");
        s.className = "letra";
        s.textContent = ch;
        p.appendChild(s);
      });
      el.appendChild(p);
      if (idx < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });

    // letras vizinhas acompanham o hover, como uma onda
    const letras = [...el.querySelectorAll(".letra")];
    letras.forEach((l, i) => {
      l.addEventListener("mouseenter", () => {
        [letras[i - 1], letras[i + 1]].forEach((v) => v && v.classList.add("vizinha"));
      });
      l.addEventListener("mouseleave", () => {
        [letras[i - 1], letras[i + 1]].forEach((v) => v && v.classList.remove("vizinha"));
      });
    });
  });

  /* ---------- 3. NAVBAR ---------- */
  const topo = document.getElementById("topo");
  const menu = document.getElementById("menu");
  const menuBtn = document.getElementById("menuBtn");

  function fecharMenu() {
    menu.classList.remove("aberto");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("aria-label", "Abrir menu");
  }
  menuBtn.addEventListener("click", () => {
    const abrir = !menu.classList.contains("aberto");
    menu.classList.toggle("aberto", abrir);
    menuBtn.setAttribute("aria-expanded", String(abrir));
    menuBtn.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
  });
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", fecharMenu));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") fecharMenu(); });

  window.addEventListener("scroll", () => {
    topo.classList.toggle("rolou", window.scrollY > 10);
  }, { passive: true });

  const links = [...document.querySelectorAll(".menu__link")];
  if ("IntersectionObserver" in window) {
    const observador = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.classList.toggle("ativo", l.getAttribute("href") === "#" + en.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    document.querySelectorAll("main section[id]").forEach((s) => observador.observe(s));
  }

  /* ---------- 4. FILTRO DAS OBRAS ---------- */
  const chips = document.querySelectorAll(".chip");
  const obras = document.querySelectorAll(".obra");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.toggle("ativo", c === chip));
      const filtro = chip.dataset.filtro;
      obras.forEach((o) => { o.hidden = filtro !== "todas" && o.dataset.cat !== filtro; });
      // obras que estavam escondidas precisam ser pintadas no tamanho certo
      document.querySelectorAll('.obra:not([hidden]) canvas[data-paint="obra"]').forEach(pintarObra);
    });
  });

  /* ---------- 5. COPIAR E-MAIL ---------- */
  const botaoCopiar = document.getElementById("copiarEmail");
  const email = document.getElementById("email");
  if (botaoCopiar && email) {
    botaoCopiar.addEventListener("click", () => {
      const texto = email.textContent.trim();
      const confirmar = () => {
        botaoCopiar.textContent = "Copiado!";
        botaoCopiar.classList.add("ok");
        setTimeout(() => { botaoCopiar.textContent = "Copiar"; botaoCopiar.classList.remove("ok"); }, 1800);
      };
      const selecionar = () => {
        const r = document.createRange();
        r.selectNodeContents(email);
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
        botaoCopiar.textContent = "Selecionado";
      };
      try {
        navigator.clipboard.writeText(texto).then(confirmar, selecionar);
      } catch (e) {
        selecionar();
      }
    });
  }

  /* ---------- 6. CURSOR GRÁFICO ---------- */
  const cursor = document.querySelector(".cursor");
  if (cursor && window.matchMedia("(pointer: fine)").matches && !reduzMovimento) {
    let x = 0, y = 0, cx = 0, cy = 0;
    window.addEventListener("pointermove", (e) => {
      x = e.clientX; y = e.clientY;
      cursor.classList.add("visivel");
      const alvo = e.target.closest("a, button, .letra, .obra, .titulo");
      cursor.classList.toggle("grande", !!alvo);
    });
    document.addEventListener("pointerleave", () => cursor.classList.remove("visivel"));
    (function seguir() {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      cursor.style.transform = `translate(${cx}px, ${cy}px)`;
      requestAnimationFrame(seguir);
    })();
  }

  /* ---------- início ---------- */
  const ano = document.getElementById("ano");
  if (ano) ano.textContent = new Date().getFullYear();

  const comecar = () => pintarTudo(!reduzMovimento);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(comecar);
  else window.addEventListener("load", comecar);
})();
