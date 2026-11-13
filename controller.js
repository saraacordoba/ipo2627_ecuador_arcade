import { GameModel, GameState } from './model.js';
import { GameView } from './view.js';

const KEYS = { ArrowLeft: 'left', ArrowRight: 'right', Space: 'shoot', KeyP: 'pause' };

class GameController {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    // Estado de controles
    this.inputs = { left: false, right: false, shoot: false };
    this.lastTime = 0;
    this.animationId = null;

    // Enlazamos eventos de la Vista hacia los métodos del Controlador
    this.view.bindControls({
      onStart: () => this.startGame(),
      onPause: () => this.togglePause(),
      onConfirmEnd: () => this.endGame(),
      onRestart: () => this.startGame(),
    });
    this.view.bindInputs((code, isPressed, isRepeat) => this.handleInput(code, isPressed, isRepeat));
    this.view.bindSettings((difficulty) => this.changeDifficulty(difficulty));
    this.view.bindPopoverEvents(() => this.pause());
    this.view.bindVisibility(() => this.pause());

    // Render inicial
    this.model.setDifficulty(this.view.getDifficulty());
    this.refresh();
  }

  // Devuelve true si la tecla la usa el juego
  handleInput(code, isPressed, isRepeat) {
    const action = KEYS[code];
    if (!action) return false;

    if (action === 'pause') {
      if (!isPressed || isRepeat || !this.model.isRunning) return false;
      this.togglePause();
      return true;
    }

    if (!isPressed) {
      this.inputs[action] = false;
      return false;
    }
    if (this.model.state !== GameState.PLAYING) return false;
    this.inputs[action] = true;
    return true;
  }

  changeDifficulty(difficulty) {
    if (!this.model.setDifficulty(difficulty)) return;
    this.view.hideGameOver();
    this.refresh();
  }

  startGame() {
    this.view.hideGameOver();
    this.resetInputs();
    this.model.start();
    this.refresh();
    this.startLoop();
  }

  togglePause() {
    if (this.model.state === GameState.PLAYING) this.pause();
    else if (this.model.state === GameState.PAUSED) this.resume();
  }

  pause() {
    if (!this.model.pause()) return;
    cancelAnimationFrame(this.animationId);
    this.resetInputs();
    this.refresh();
  }

  resume() {
    if (!this.model.resume()) return;
    this.refresh();
    this.startLoop();
  }

  endGame() {
    if (!this.model.end()) return;
    cancelAnimationFrame(this.animationId);
    this.finishGame();
  }

  // ==== BUCLE PRINCIPAL ====
  startLoop() {
    cancelAnimationFrame(this.animationId);
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  gameLoop(currentTime) {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.model.update(deltaTime, this.inputs); // 1. Actualiza datos lógicos
    this.refresh();                            // 2. Dibuja fotograma e interfaz

    if (this.model.state === GameState.GAMEOVER) {
      this.finishGame();
      return; // Rompe el bucle
    }
    this.animationId = requestAnimationFrame((time) => this.gameLoop(time)); // 3. Siguiente fotograma
  }

  finishGame() {
    this.resetInputs();
    this.refresh();
    this.view.showGameOver(this.model.score);
  }

  refresh() {
    this.view.render(this.model);
    this.view.updateHUD(this.model);
  }

  resetInputs() {
    this.inputs.left = this.inputs.right = this.inputs.shoot = false;
  }
}

// Inicialización de la aplicación (las dimensiones se toman del canvas)
const view = new GameView();
const app = new GameController(new GameModel(view.canvas.width, view.canvas.height), view);
