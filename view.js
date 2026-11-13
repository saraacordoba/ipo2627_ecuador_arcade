import { GameState } from './model.js';

const STATE_LABELS = {
  [GameState.STOPPED]: 'Detenida',
  [GameState.PLAYING]: 'En juego',
  [GameState.PAUSED]: 'En pausa',
  [GameState.GAMEOVER]: 'Finalizada',
};

const OVERLAY_MESSAGES = {
  [GameState.STOPPED]: 'Elige la dificultad y pulsa «Iniciar partida»',
  [GameState.PLAYING]: '',
  [GameState.PAUSED]: 'Partida en pausa · pulsa P o «Reanudar» para continuar',
  [GameState.GAMEOVER]: 'Partida finalizada · pulsa «Iniciar partida» para jugar de nuevo',
};

export class GameView {
  constructor() {
    this.canvas = document.querySelector('[data-canvas]');
    this.ctx = this.canvas.getContext('2d');

    // Los colores del canvas se leen de las variables CSS (una sola fuente cromática)
    const css = getComputedStyle(document.documentElement);
    const color = (name) => css.getPropertyValue(name).trim();
    this.colors = {
      player: color('--color-primary'),
      enemy: color('--color-danger'),
      bullet: color('--color-accent'),
      background: color('--color-canvas'),
    };

    // Elementos DOM
    this.scoreEl = document.querySelector('[data-score]');
    this.livesEl = document.querySelector('[data-lives]');
    this.stateEl = document.querySelector('[data-state]');
    this.overlayEl = document.querySelector('[data-overlay]');
    this.finalScoreEl = document.querySelector('[data-final-score]');
    this.settings = document.querySelector('[data-settings]');
    this.btnStart = document.querySelector('[data-action="start"]');
    this.btnPause = document.querySelector('[data-action="pause"]');
    this.btnEnd = document.querySelector('[data-action="end"]');
    this.btnConfirmEnd = document.querySelector('[data-action="confirm-end"]');
    this.btnRestart = document.querySelector('[data-action="restart"]');

    // Popovers
    this.helpMenu = document.getElementById('helpMenu');
    this.confirmEndMenu = document.getElementById('confirmEndMenu');
    this.gameOverMenu = document.getElementById('gameOverMenu');
  }

  // ==== EVENTOS ==== (los eventos se registran en la vista)
  bindControls({ onStart, onPause, onConfirmEnd, onRestart }) {
    this.btnStart.addEventListener('click', onStart);
    this.btnPause.addEventListener('click', onPause);
    this.btnConfirmEnd.addEventListener('click', onConfirmEnd);
    this.btnRestart.addEventListener('click', onRestart);
  }

  // Solo se anula la acción por defecto si el juego usa la tecla:
  // así Espacio sigue pulsando botones cuando no se está jugando
  bindInputs(handler) {
    window.addEventListener('keydown', (e) => {
      if (document.querySelector(':popover-open')) return; // con un panel abierto, el teclado es del panel
      if (handler(e.code, true, e.repeat)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => handler(e.code, false, false));
  }

  bindSettings(handler) {
    this.settings.addEventListener('change', (e) => handler(e.target.value));
  }

  // Abrir la ayuda o la confirmación de terminar pausa la partida
  bindPopoverEvents(handlerPause) {
    [this.helpMenu, this.confirmEndMenu].forEach((popover) => {
      popover.addEventListener('toggle', (e) => {
        if (e.newState === 'open') handlerPause();
      });
    });
  }

  // Cambiar de pestaña pausa la partida
  bindVisibility(handlerPause) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) handlerPause();
    });
  }

  getDifficulty() {
    return this.settings.querySelector('input:checked').value;
  }

  // ==== ACTUALIZACIÓN DOM ====
  updateHUD({ score, lives, state }) {
    const running = state === GameState.PLAYING || state === GameState.PAUSED;

    this.scoreEl.textContent = score;
    this.livesEl.textContent = lives;
    this.stateEl.textContent = STATE_LABELS[state];

    this.btnStart.disabled = running;
    this.btnPause.disabled = !running;
    this.btnEnd.disabled = !running;
    this.btnPause.textContent = state === GameState.PAUSED ? 'Reanudar' : 'Pausar';
    this.settings.disabled = running;

    this.overlayEl.textContent = OVERLAY_MESSAGES[state];
    this.overlayEl.hidden = state === GameState.PLAYING;
  }

  showGameOver(score) {
    this.finalScoreEl.textContent = score;
    this.gameOverMenu.showPopover();
  }

  hideGameOver() {
    if (this.gameOverMenu.matches(':popover-open')) this.gameOverMenu.hidePopover();
  }

  // ==== RENDERIZADO CANVAS ====
  render(model) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawPlayer(model.player);

    ctx.fillStyle = this.colors.bullet;
    model.bullets.forEach((b) => ctx.fillRect(b.x, b.y, b.width, b.height));

    model.enemies.forEach((e) => this.drawEnemy(e));

    // Destello rojo al perder una vida (realimentación inmediata)
    if (model.damageIntensity > 0) {
      ctx.globalAlpha = model.damageIntensity * 0.35;
      ctx.fillStyle = this.colors.enemy;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.globalAlpha = 1;
    }
  }

  // Jugador y enemigos tienen formas distintas: no se distinguen solo por el color
  drawPlayer({ x, y, width: w, height: h }) {
    const { ctx } = this;
    ctx.fillStyle = this.colors.player;
    ctx.fillRect(x, y + h * 0.55, w, h * 0.45);              // base
    ctx.beginPath();                                          // cañón
    ctx.moveTo(x + w * 0.4, y + h * 0.55);
    ctx.lineTo(x + w * 0.5, y);
    ctx.lineTo(x + w * 0.6, y + h * 0.55);
    ctx.fill();
  }

  drawEnemy({ x, y, width: w, height: h }) {
    const { ctx } = this;
    ctx.fillStyle = this.colors.enemy;
    ctx.fillRect(x + w * 0.2, y, w * 0.15, h * 0.2);            // antenas
    ctx.fillRect(x + w * 0.65, y, w * 0.15, h * 0.2);
    ctx.fillRect(x, y + h * 0.2, w, h * 0.6);                   // cuerpo
    ctx.fillRect(x, y + h * 0.8, w * 0.25, h * 0.2);            // patas
    ctx.fillRect(x + w * 0.75, y + h * 0.8, w * 0.25, h * 0.2);
    ctx.fillStyle = this.colors.background;                     // ojos
    ctx.fillRect(x + w * 0.22, y + h * 0.35, w * 0.16, h * 0.16);
    ctx.fillRect(x + w * 0.62, y + h * 0.35, w * 0.16, h * 0.16);
  }
}
