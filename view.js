export class GameView {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Elementos DOM
    this.scoreEl = document.querySelector('[data-score]');
    this.livesEl = document.querySelector('[data-lives]');
    this.btnStart = document.getElementById('btn-start');
    this.btnPause = document.getElementById('btn-pause');
    this.btnRestart = document.getElementById('btn-restart');
    
    // Popovers
    this.helpMenu = document.getElementById('helpMenu');
    this.gameOverMenu = document.getElementById('gameOverMenu');
    this.finalScoreEl = document.querySelector('[data-final-score]');
  }

  // ==== EVENTOS ==== (Cumpliendo la regla: Los eventos deben estar en la vista)
  bindControls(handlerStart, handlerPause, handlerRestart) {
    this.btnStart.addEventListener('click', handlerStart);
    this.btnPause.addEventListener('click', handlerPause);
    this.btnRestart.addEventListener('click', handlerRestart);
  }

  bindInputs(handlerInput) {
  window.addEventListener('keydown', (e) => {
    // Evita que el espacio haga clic en botones o que las flechas muevan la pantalla
    if (['Space', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    handlerInput(e.code, true);
  });
  window.addEventListener('keyup', (e) => handlerInput(e.code, false));
}

  bindPopoverEvents(handlerPause) {
    // Escuchar el evento nativo del Popover API
    this.helpMenu.addEventListener('toggle', (e) => {
      if (e.newState === 'open') handlerPause();
    });
  }

  // ==== ACTUALIZACIÓN DOM ====
  updateHUD(score, lives, state) {
    this.scoreEl.textContent = score;
    this.livesEl.textContent = lives;
    
    this.btnStart.disabled = (state === 'PLAYING' || state === 'PAUSED');
    this.btnPause.disabled = (state === 'STOPPED' || state === 'GAMEOVER');
    this.btnPause.textContent = state === 'PAUSED' ? 'Reanudar' : 'Pausar';
  }

  showGameOver(score) {
    this.finalScoreEl.textContent = score;
    this.gameOverMenu.showPopover(); // API Nativa
  }

  hideGameOver() {
    this.gameOverMenu.hidePopover();
  }

  // ==== RENDERIZADO CANVAS ====
  render(model) {
    // 1. Limpiar pantalla
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Dibujar Jugador (Cyan en HSL)
    this.ctx.fillStyle = 'hsl(200, 100%, 50%)';
    this.ctx.fillRect(model.player.x, model.player.y, model.player.width, model.player.height);

    // 3. Dibujar Balas (Amarillo en HSL)
    this.ctx.fillStyle = 'hsl(50, 100%, 50%)';
    model.bullets.forEach(b => {
      this.ctx.fillRect(b.x, b.y, b.width, b.height);
    });

    // 4. Dibujar Enemigos (Rojo en HSL)
    this.ctx.fillStyle = 'hsl(350, 80%, 55%)';
    model.enemies.forEach(e => {
      this.ctx.fillRect(e.x, e.y, e.width, e.height);
    });
  }
}