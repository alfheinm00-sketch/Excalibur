import { Vector2, Rect } from '../types';

/**
 * Calcula la distancia entre dos puntos.
 */
export const distance = (p1: Vector2, p2: Vector2): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Verifica si un punto está dentro de un rectángulo.
 * Útil para la selección de caja.
 */
export const isPointInRect = (point: Vector2, rect: Rect): boolean => {
  // Normalizar el rectángulo para manejar anchos/altos negativos si se arrastra hacia atrás
  const rx = rect.width < 0 ? rect.x + rect.width : rect.x;
  const ry = rect.height < 0 ? rect.y + rect.height : rect.y;
  const rw = Math.abs(rect.width);
  const rh = Math.abs(rect.height);

  return (
    point.x >= rx &&
    point.x <= rx + rw &&
    point.y >= ry &&
    point.y <= ry + rh
  );
};

/**
 * Normaliza un vector (lo convierte a longitud 1).
 */
export const normalizeVector = (v: Vector2): Vector2 => {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
};
