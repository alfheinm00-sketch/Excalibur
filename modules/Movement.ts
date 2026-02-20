import { Vector2 } from '../types';
import { distance, normalizeVector } from '../utils/math';

export interface MovableEntity {
  id: number;
  position: Vector2;
  radius: number;
  velocity: number;
  target: Vector2 | null;
  isMoving: boolean;
}

/**
 * Módulo de Movimiento
 */
export const MovementSystem = {
  updatePosition: (entity: MovableEntity) => {
    if (entity.target) {
        const dist = distance(entity.position, entity.target);

        // Snap al destino si está cerca
        if (dist < entity.velocity) {
            entity.position = { ...entity.target };
            entity.target = null;
            entity.isMoving = false;
        } else {
            entity.isMoving = true;
            const dir = {
                x: entity.target.x - entity.position.x,
                y: entity.target.y - entity.position.y
            };
            
            const normalizedDir = normalizeVector(dir);
            
            entity.position.x += normalizedDir.x * entity.velocity;
            entity.position.y += normalizedDir.y * entity.velocity;
        }
    } else {
        entity.isMoving = false;
    }

    // Limitar a los bordes de la pantalla
    MovementSystem.constrainToBounds(entity);
  },

  resolveCollisions: (entity: MovableEntity, others: MovableEntity[]) => {
    for (const other of others) {
      if (other.id === entity.id) continue;

      const dist = distance(entity.position, other.position);
      const combinedRadius = entity.radius + other.radius;

      if (dist < combinedRadius) {
        let dx = entity.position.x - other.position.x;
        let dy = entity.position.y - other.position.y;

        if (dist === 0) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
        }

        const length = Math.sqrt(dx * dx + dy * dy);
        const nx = dx / length;
        const ny = dy / length;

        const overlap = combinedRadius - dist;
        const separationStrength = 0.5; 

        // Empujar suavemente
        entity.position.x += nx * overlap * separationStrength;
        entity.position.y += ny * overlap * separationStrength;
      }
    }
    // Limitar también después de colisiones
    MovementSystem.constrainToBounds(entity);
  },

  constrainToBounds: (entity: MovableEntity) => {
      const margin = entity.radius; // Usar el radio como margen para que no se salga ni medio cuerpo
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (entity.position.x < margin) entity.position.x = margin;
      if (entity.position.x > width - margin) entity.position.x = width - margin;
      if (entity.position.y < margin) entity.position.y = margin;
      if (entity.position.y > height - margin) entity.position.y = height - margin;
  }
};