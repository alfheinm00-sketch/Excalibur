export type LevelState = 'WAITING' | 'FIGHTING' | 'VICTORY';

export enum LevelEvent {
  NONE,
  SPAWN_WAVE,
  VICTORY
}

export interface WaveConfig {
  count: number;
  type: string; // 'NORMAL' | 'MINI' | 'BOSS'
}

// Configuración movida desde GameCanvas
export const WAVE_CONFIG: WaveConfig[] = [
    { count: 4, type: 'NORMAL' },  // Oleada 1
    { count: 8, type: 'NORMAL' },  // Oleada 2
    { count: 12, type: 'NORMAL' }, // Oleada 3
    { count: 16, type: 'NORMAL' }, // Oleada 4
    { count: 1, type: 'BOSS' }     // Oleada 5 (Boss)
];

const WAVE_DELAY = 5000; // 5 segundos entre oleadas
const START_DELAY = 3000; // 3 segundos al iniciar

export class LevelManager {
  public currentWave: number;
  public state: LevelState;
  public timer: number; // Tiempo restante en ms para el siguiente evento

  constructor() {
    this.currentWave = 0;
    this.state = 'WAITING';
    this.timer = START_DELAY;
  }

  /**
   * Resetea el nivel al estado inicial.
   */
  public reset() {
    this.currentWave = 0;
    this.state = 'WAITING';
    this.timer = START_DELAY;
  }

  /**
   * Actualiza la lógica del nivel.
   * @param deltaTime Tiempo transcurrido en ms desde el último frame.
   * @param currentEnemyCount Número de enemigos vivos actualmente.
   */
  public update(deltaTime: number, currentEnemyCount: number): LevelEvent {
    if (this.state === 'VICTORY') return LevelEvent.NONE;

    // Lógica: Esperando siguiente oleada
    if (this.state === 'WAITING') {
      this.timer -= deltaTime;
      
      if (this.timer <= 0) {
        this.currentWave++;

        if (this.currentWave > WAVE_CONFIG.length) {
          this.state = 'VICTORY';
          return LevelEvent.VICTORY;
        }

        this.state = 'FIGHTING';
        return LevelEvent.SPAWN_WAVE;
      }
    } 
    // Lógica: Combatiendo
    else if (this.state === 'FIGHTING') {
      if (currentEnemyCount === 0) {
        // Oleada terminada, iniciar cuenta atrás
        this.state = 'WAITING';
        this.timer = WAVE_DELAY;
      }
    }

    return LevelEvent.NONE;
  }

  // --- GETTERS PARA UI Y SPAWNER ---

  public getWave(): number {
    return this.currentWave;
  }

  public getTotalWaves(): number {
    return WAVE_CONFIG.length;
  }

  public getTimeRemaining(): number {
    return Math.max(0, Math.ceil(this.timer / 1000));
  }

  public getCurrentWaveConfig(): WaveConfig | null {
    return WAVE_CONFIG[this.currentWave - 1] || null;
  }

  public getStatusText(enemyCount: number): string {
    if (this.state === 'WAITING') {
      return `Siguiente oleada en ${this.getTimeRemaining()}s`;
    } else if (this.state === 'FIGHTING') {
      return `¡Enemigos restantes: ${enemyCount}!`;
    } else if (this.state === 'VICTORY') {
      return '¡VICTORIA!';
    }
    return '';
  }

  public isVictory(): boolean {
    return this.state === 'VICTORY';
  }
}