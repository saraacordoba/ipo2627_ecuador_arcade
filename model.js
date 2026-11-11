export class GameModel {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.state = 'STOPPED'; // STOPPED, PLAYING, PAUSED, GAMEOVER
    this.score = 0;
    this.lives = 3;
    
    // Entidades
    this.player = { x: width / 2 - 25, y: height - 60, width: 50, height: 20, speed: 400 };
    this.bullets = [];
    this.enemies = [];
    
    // Tiempos
    this.lastEnemySpawn = 0;
    this.enemySpawnRate = 1500;
  }

  start() {
    this.state = 'PLAYING';
    this.score = 0;
    this.lives = 3;
    this.bullets = [];
    this.enemies = [];
    this.player.x = this.width / 2 - this.player.width / 2;
  }

  update(deltaTime, inputs) {
    if (this.state !== 'PLAYING') return;

    // Movimiento jugador (física basada en tiempo para fluidez en cualquier monitor)
    if (inputs.left) this.player.x -= this.player.speed * (deltaTime / 1000);
    if (inputs.right) this.player.x += this.player.speed * (deltaTime / 1000);

    // Límites de pantalla
    this.player.x = Math.max(0, Math.min(this.player.x, this.width - this.player.width));

    // Disparos (Cooldown controlado en el input o controlador)
    if (inputs.shoot) {
      this.bullets.push({
        x: this.player.x + this.player.width / 2 - 2,
        y: this.player.y,
        width: 4, height: 15, speed: 600
      });
      inputs.shoot = false; // Reset instantáneo
    }

    // Mover Balas
    this.bullets.forEach(b => b.y -= b.speed * (deltaTime / 1000));
    this.bullets = this.bullets.filter(b => b.y > 0); // Limpiar fuera de pantalla

    // Spawn Enemigos
    this.lastEnemySpawn += deltaTime;
    if (this.lastEnemySpawn > this.enemySpawnRate) {
      this.enemies.push({
        x: Math.random() * (this.width - 40),
        y: -40, width: 40, height: 40, speed: 100 + Math.random() * 100
      });
      this.lastEnemySpawn = 0;
      this.enemySpawnRate = Math.max(500, this.enemySpawnRate - 20); // Dificultad incremental
    }

    // Mover Enemigos y Detección de Colisiones
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      let e = this.enemies[i];
      e.y += e.speed * (deltaTime / 1000);

      // Colisión con jugador
      if (this.checkCollision(e, this.player)) {
        this.enemies.splice(i, 1);
        this.lives--;
        if (this.lives <= 0) this.state = 'GAMEOVER';
        continue;
      }

      // Colisión con balas
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        let b = this.bullets[j];
        if (this.checkCollision(e, b)) {
          this.enemies.splice(i, 1);
          this.bullets.splice(j, 1);
          this.score += 10;
          break;
        }
      }

      // Sale de pantalla
      if (e.y > this.height) {
  this.enemies.splice(i, 1);
  this.lives--; // Nueva penalización por dejar escapar al enemigo
  if (this.lives <= 0) this.state = 'GAMEOVER';
}
    }
  }

  // Rect intersection AABB (Axis-Aligned Bounding Box)
  checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }
}