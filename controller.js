import { GameModel } from './model.js';
import { GameView } from './view.js';

class GameController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    
    // Estado de controles
    this.inputs = { left: false, right: false, shoot: false };
    this.lastTime = 0;
    this.animationId = null;

    // Enlazamos eventos de la Vista hacia nuestros métodos del Controlador
    this.view.bindControls(
      () => this.startGame(),
      () => this.togglePause(),
      () => this.restartGame()
    );
    
    this.view.bindInputs((code, isPressed) => this.handleInput(code, isPressed));
    this.view.bindPopoverEvents(() => this.pauseGameByPopover());

    // Render inicial
    this.view.render(this.model);
  }

  handleInput(code, isPressed) {
    if (code === 'ArrowLeft') this.inputs.left = isPressed;
    if (code === 'ArrowRight') this.inputs.right = isPressed;
    if (code === 'Space' && isPressed) this.inputs.shoot = true; 
  }

  startGame() {
    this.model.start();
    this.view.updateHUD(this.model.score, this.model.lives, this.model.state);
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  restartGame() {
    this.view.hideGameOver();
    this.startGame();
  }

  togglePause() {
    if (this.model.state === 'PLAYING') {
      this.model.state = 'PAUSED';
      cancelAnimationFrame(this.animationId);
    } else if (this.model.state === 'PAUSED') {
      this.model.state = 'PLAYING';
      this.lastTime = performance.now();
      this.gameLoop(this.lastTime);
    }
    this.view.updateHUD(this.model.score, this.model.lives, this.model.state);
  }

  // Forzado por la apertura del popover de ayuda
  pauseGameByPopover() {
    if (this.model.state === 'PLAYING') {
      this.togglePause();
    }
  }

  gameLoop(currentTime) {
    if (this.model.state !== 'PLAYING') return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Actualiza datos lógicos
    this.model.update(deltaTime, this.inputs);

    // Actualiza interfaz si es necesario
    if (this.model.state === 'GAMEOVER') {
      this.view.showGameOver(this.model.score);
      this.view.updateHUD(this.model.score, this.model.lives, this.model.state);
      return; // Rompe el bucle
    }

    this.view.updateHUD(this.model.score, this.model.lives, this.model.state);
    
    // Dibuja fotograma
    this.view.render(this.model);

    // Solicita siguiente fotograma
    this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
  }
}

// Inicialización de la aplicación
const canvasWidth = 800;
const canvasHeight = 600;
const app = new GameController(new GameModel(canvasWidth, canvasHeight), new GameView());