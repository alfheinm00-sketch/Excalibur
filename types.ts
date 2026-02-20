export interface Vector2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameState {
  fps: number;
  unitCount: number;
  selectedCount: number;
}

export enum Team {
  PLAYER,
  ENEMY
}

/**
 * Zonas de efecto en el suelo (Ej: Baba, Fuego, Áreas de curación, Esencia)
 */
export type GroundZoneType = 'SLIME_GOO' | 'ESSENCE_DROP';

export interface GroundZone {
  id: number;
  position: Vector2;
  radius: number;
  timeLeft: number; // Duración en ms
  type: GroundZoneType;
  value?: number; // Cantidad de esencia, daño, etc.
}