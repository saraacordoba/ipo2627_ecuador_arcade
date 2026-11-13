/**
 * MODELO
 * Contiene el estado del juego y sus reglas (física, disparos, aparición de
 * enemigos y colisiones). No conoce el DOM ni el Canvas: solo datos y lógica.
 */

/** Estados posibles de la partida (evita "strings mágicos" repartidos por el código). */
export const GameState = Object.freeze({
  STOPPED: 'STOPPED',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER',
});

/** Parámetros ajustables por el usuario antes de comenzar la partida. */
export const DIFFICULTIES = Object.freeze({
  facil: { lives: 5, spawnInterval: 1800, minSpawnInterval: 700, enemySpeed: [70, 140] },
  normal: { lives: 3, spawnInterval: 1500, minSpawnInterval: 500, enemySpeed: [100, 200] },
  dificil: { lives: 2, spawnInterval: 1100, minSpawnInterval: 350, enemySpeed: [140, 260] },
});

export const DEFAULT_DIFFICULTY = 'normal';

// Constantes físicas (px, px/s, px/s², ms)
const PLAYER = { width: 50, height: 24, bottomMargin: 60, maxSpeed: 420, acceleration: 2400, friction: 1800 };
const BULLET = { width: 4, height: 15, speed: 600, cooldown: 250 };
const ENEMY = { size: 40, points: 10, spawnAcceleration: 20 };
const DAMAGE_FLASH_MS = 300;
const MAX_DELTA_MS = 50; // Evita "saltos" si el navegador congela fotogramas

export class GameModel {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.difficultyKey = DEFAULT_DIFFICULTY;
    this.state = GameState.STOPPED;
    this.reset();
  }

  // ==== CONSULTAS ====
  get difficulty() {
    return DIFFICULTIES[this.difficultyKey];
  }

  get isRunning() {
    return this.state === GameState.PLAYING || this.state === GameState.PAUSED;
  }

  /** Intensidad (0..1) del destello rojo que se muestra al perder una vida. */
  get damageIntensity() {
    return this.damageTimer / DAMAGE_FLASH_MS;
  }

  // ==== CICLO DE VIDA DE LA PARTIDA ====
  setDifficulty(key) {
    // Prevención de errores: no se puede cambiar la dificultad a mitad de partida
    if (!(key in DIFFICULTIES) || this.isRunning) return false;
    this.difficultyKey = key;
    this.stop(); // Prepara una partida nueva con los parámetros elegidos
    return true;
  }

  stop() {
    this.reset();
    this.state = GameState.STOPPED;
  }

  reset() {
    const { lives, spawnInterval } = this.difficulty;
    this.score = 0;
    this.lives = lives;
    this.player = {
      x: (this.width - PLAYER.width) / 2,
      y: this.height - PLAYER.bottomMargin,
      width: PLAYER.width,
      height: PLAYER.height,
      vx: 0,
    };
    this.bullets = [];
    this.enemies = [];
    this.spawnTimer = 0;
    this.spawnInterval = spawnInterval;
    this.shootTimer = 0;
    this.damageTimer = 0;
  }

  start() {
    this.reset();
    this.state = GameState.PLAYING;
  }

  pause() {
    if (this.state !== GameState.PLAYING) return false;
    this.state = GameState.PAUSED;
    return true;
  }

  resume() {
    if (this.state !== GameState.PAUSED) return false;
    this.state = GameState.PLAYING;
    return true;
  }

  /** Finalización voluntaria de la partida por parte del usuario. */
  end() {
    if (!this.isRunning) return false;
    this.state = GameState.GAMEOVER;
    return true;
  }

  // ==== ACTUALIZACIÓN (un paso del bucle principal) ====
  update(deltaMs, inputs) {
    if (this.state !== GameState.PLAYING) return;

    const dt = Math.min(Math.max(deltaMs, 0), MAX_DELTA_MS) / 1000; // segundos
    this.#updatePlayer(dt, inputs);
    this.#updateShooting(dt, inputs);
    this.#updateBullets(dt);
    this.#spawnEnemies(dt);
    this.#updateEnemies(dt);
    this.damageTimer = Math.max(0, this.damageTimer - dt * 1000);
  }

  /** Física del jugador: aceleración, rozamiento y velocidad máxima. */
  #updatePlayer(dt, inputs) {
    const p = this.player;
    const direction = (inputs.right ? 1 : 0) - (inputs.left ? 1 : 0);

    if (direction !== 0) {
      // Si cambia de sentido, además de acelerar frena (giro más ágil)
      const braking = Math.sign(p.vx) === -direction ? PLAYER.friction : 0;
      p.vx += direction * (PLAYER.acceleration + braking) * dt;
    } else {
      const deceleration = PLAYER.friction * dt;
      p.vx = Math.abs(p.vx) <= deceleration ? 0 : p.vx - Math.sign(p.vx) * deceleration;
    }

    p.vx = Math.max(-PLAYER.maxSpeed, Math.min(p.vx, PLAYER.maxSpeed));
    p.x += p.vx * dt;

    // Límites de pantalla: la nave se detiene al chocar con el borde
    const maxX = this.width - p.width;
    if (p.x < 0 || p.x > maxX) {
      p.x = Math.max(0, Math.min(p.x, maxX));
      p.vx = 0;
    }
  }

  /** Disparo con enfriamiento: mantener pulsado = ráfaga a ritmo constante. */
  #updateShooting(dt, inputs) {
    this.shootTimer = Math.max(0, this.shootTimer - dt * 1000);
    if (!inputs.shoot || this.shootTimer > 0) return;

    this.bullets.push({
      x: this.player.x + this.player.width / 2 - BULLET.width / 2,
      y: this.player.y - BULLET.height,
      width: BULLET.width,
      height: BULLET.height,
      speed: BULLET.speed,
    });
    this.shootTimer = BULLET.cooldown;
  }

  #updateBullets(dt) {
    this.bullets.forEach((b) => { b.y -= b.speed * dt; });
    this.bullets = this.bullets.filter((b) => b.y + b.height > 0);
  }

  /** Aparición de enemigos con dificultad incremental. */
  #spawnEnemies(dt) {
    this.spawnTimer += dt * 1000;
    if (this.spawnTimer < this.spawnInterval) return;

    const [minSpeed, maxSpeed] = this.difficulty.enemySpeed;
    this.enemies.push({
      x: Math.random() * (this.width - ENEMY.size),
      y: -ENEMY.size,
      width: ENEMY.size,
      height: ENEMY.size,
      speed: minSpeed + Math.random() * (maxSpeed - minSpeed),
    });
    this.spawnTimer = 0;
    this.spawnInterval = Math.max(this.difficulty.minSpawnInterval, this.spawnInterval - ENEMY.spawnAcceleration);
  }

  /** Movimiento de enemigos y detección de colisiones. */
  #updateEnemies(dt) {
    const survivors = [];

    for (const enemy of this.enemies) {
      enemy.y += enemy.speed * dt;

      // 1. Choque con el jugador
      if (GameModel.checkCollision(enemy, this.player)) {
        this.#loseLife();
        continue;
      }

      // 2. Impacto de un proyectil
      const hitIndex = this.bullets.findIndex((b) => GameModel.checkCollision(enemy, b));
      if (hitIndex !== -1) {
        this.bullets.splice(hitIndex, 1);
        this.score += ENEMY.points;
        continue;
      }

      // 3. El enemigo escapa por la parte inferior
      if (enemy.y > this.height) {
        this.#loseLife();
        continue;
      }

      survivors.push(enemy);
    }

    this.enemies = survivors;
  }

  #loseLife() {
    this.lives = Math.max(0, this.lives - 1);
    this.damageTimer = DAMAGE_FLASH_MS;
    if (this.lives === 0) this.state = GameState.GAMEOVER;
  }

  /** Intersección de rectángulos alineados con los ejes (AABB). */
  static checkCollision(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }
}
