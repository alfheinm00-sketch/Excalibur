import { Unit } from '../classes/Unit';
import { GroundZone, Rect } from '../types';
import { VisualEffectsSystem } from './VisualEffects';

/**
 * Sistema encargado de dibujar todos los elementos del juego en el Canvas.
 */
export const RenderSystem = {
  
  /**
   * Método principal de renderizado. Llama a los sub-métodos en el orden correcto (Capas).
   */
  renderGame: (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number, 
    units: Unit[], 
    groundZones: GroundZone[], 
    selectionRect?: Rect
  ) => {
    // 1. Capa Fondo
    RenderSystem.drawBackground(ctx, width, height);

    // 2. Capa Suelo (Efectos persistentes como baba)
    RenderSystem.drawGroundZones(ctx, groundZones);

    // 3. Capa Entidades (Unidades ordenadas por Y)
    RenderSystem.drawUnits(ctx, units);

    // 4. Capa VFX (Partículas, textos flotantes, proyectiles)
    // Nota: VisualEffectsSystem.draw ya maneja sus propios saves/restores
    VisualEffectsSystem.draw(ctx);

    // 5. Capa UI (Caja de selección)
    if (selectionRect) {
      RenderSystem.drawSelectionBox(ctx, selectionRect);
    }
  },

  /**
   * Dibuja el color base y la cuadrícula.
   */
  drawBackground: (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = '#064e3b'; 
    ctx.fillRect(0, 0, width, height);
    
    // Dibujar Grid
    ctx.strokeStyle = '#065f46';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 100) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += 100) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  },

  /**
   * Dibuja zonas de efecto en el suelo.
   */
  drawGroundZones: (ctx: CanvasRenderingContext2D, zones: GroundZone[]) => {
    zones.forEach(zone => {
        if (zone.type === 'SLIME_GOO') {
            ctx.save();
            ctx.translate(zone.position.x, zone.position.y);
            const opacity = Math.min(0.6, zone.timeLeft / 2000); 
            ctx.globalAlpha = opacity;
            ctx.fillStyle = '#84cc16';
            ctx.beginPath();
            ctx.arc(0, 0, zone.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#4d7c0f';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Animación de burbujas
            const time = performance.now();
            ctx.fillStyle = '#ecfccb';
            for(let i=0; i<3; i++) {
                const bubbleX = Math.sin(time / 500 + i * 2) * (zone.radius * 0.5);
                const bubbleY = Math.cos(time / 600 + i * 3) * (zone.radius * 0.5);
                const bubbleSize = 3 + Math.sin(time/300 + i) * 2;
                ctx.beginPath();
                ctx.arc(bubbleX, bubbleY, Math.abs(bubbleSize), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        } else if (zone.type === 'ESSENCE_DROP') {
            // Renderizado de Esencia (Punto blanco brillante)
            ctx.save();
            ctx.translate(zone.position.x, zone.position.y);
            
            // Efecto de flotación suave
            const time = performance.now();
            const floatY = Math.sin(time / 300) * 3;
            
            // Brillo exterior
            const glowSize = 4 + Math.sin(time / 200) * 2;
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'white';
            
            // Núcleo
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, floatY, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Halo tenue
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.beginPath();
            ctx.arc(0, floatY, glowSize, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }
    });
  },

  /**
   * Dibuja todas las unidades ordenadas por su posición Y para simular profundidad.
   */
  drawUnits: (ctx: CanvasRenderingContext2D, units: Unit[]) => {
    // Creamos una copia superficial para no mutar el array original durante el sort
    const sortedUnits = [...units].sort((a, b) => a.position.y - b.position.y);
    
    sortedUnits.forEach(unit => unit.draw(ctx));
  },

  /**
   * Dibuja el rectángulo de selección del jugador.
   */
  drawSelectionBox: (ctx: CanvasRenderingContext2D, rect: Rect) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
  }
};