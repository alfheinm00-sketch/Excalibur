import { Vector2 } from '../types';
import { distance } from '../utils/math';

export enum TextType {
  NORMAL,
  CRITICAL,
  MISS,
  HEAL
}

interface FloatingText {
  id: number;
  position: Vector2;
  text: string;
  color: string;
  life: number;      
  velocity: number;  
  scale: number;
  type: TextType;
}

// Interfaz local para romper dependencia circular con Unit
interface VisualEffectTarget {
    position: Vector2;
    radius: number;
    health: number;
}

// Nueva interfaz para proyectiles
interface Projectile {
  id: number;
  position: Vector2;
  target: VisualEffectTarget; // Persigue a la unidad (o cualquier cosa con posición/vida)
  speed: number;
  color: string;
  radius: number;
  hasBlur: boolean;
  onHit: () => void; // Callback para aplicar daño al impactar
}

// Nueva interfaz para efectos visuales (Cortes, explosiones)
interface VisualEffect {
  id: number;
  position: Vector2;
  rotation: number; // Ángulo para el corte
  life: number; // 0 a 1
  maxLife?: number; // Para calcular progreso
  radius?: number; // Para marcadores de área
  type: 'SLASH' | 'AREA_MARKER' | 'CLEAVE'; // NUEVO: CLEAVE
  color?: string;
}

export const VisualEffectsSystem = {
  texts: [] as FloatingText[],
  projectiles: [] as Projectile[],
  effects: [] as VisualEffect[],
  nextId: 0,

  /**
   * Crea un nuevo texto flotante.
   */
  spawnText: (x: number, y: number, text: string, type: TextType) => {
    let color = '#ffffff';
    let scale = 1.0;
    let velocity = 0.5;

    switch (type) {
        case TextType.CRITICAL:
            color = '#facc15'; 
            scale = 1.5;
            velocity = 0.8;
            text = `¡${text}!`;
            break;
        case TextType.MISS:
            color = '#9ca3af'; 
            scale = 0.8;
            text = 'MISS';
            break;
        case TextType.HEAL:
            color = '#4ade80'; 
            velocity = 0.3;
            text = `+${text}`;
            break;
        case TextType.NORMAL:
        default:
            color = '#ffffff';
            break;
    }

    VisualEffectsSystem.texts.push({
      id: VisualEffectsSystem.nextId++,
      position: { x, y: y - 20 },
      text: text,
      color: color,
      life: 1.0, 
      velocity: velocity + Math.random() * 0.3,
      scale: scale,
      type: type
    });
  },

  /**
   * Dispara un proyectil hacia una unidad.
   */
  spawnProjectile: (start: Vector2, target: VisualEffectTarget, color: string, onHit: () => void) => {
    VisualEffectsSystem.projectiles.push({
        id: VisualEffectsSystem.nextId++,
        position: { ...start },
        target: target,
        speed: 6, // Velocidad del proyectil
        color: color,
        radius: 4,
        hasBlur: true,
        onHit: onHit
    });
  },

  /**
   * Crea un efecto de corte en una posición.
   */
  spawnSlash: (targetPos: Vector2) => {
    VisualEffectsSystem.effects.push({
        id: VisualEffectsSystem.nextId++,
        position: { ...targetPos },
        rotation: Math.random() * Math.PI * 2, // Rotación aleatoria
        life: 1.0,
        type: 'SLASH'
    });
  },

  /**
   * Crea un efecto de corte semicircular (Cleave) en una dirección.
   */
  spawnCleave: (origin: Vector2, angle: number, radius: number, color: string = '#ef4444') => {
      VisualEffectsSystem.effects.push({
          id: VisualEffectsSystem.nextId++,
          position: { ...origin },
          rotation: angle,
          life: 1.0,
          radius: radius,
          type: 'CLEAVE',
          color: color
      });
  },

  /**
   * Dispara un proyectil hacia una unidad.
   */
  spawnProjectile: (start: Vector2, target: VisualEffectTarget, color: string, onHit: () => void) => {
    VisualEffectsSystem.projectiles.push({
        id: VisualEffectsSystem.nextId++,
        position: { ...start },
        target: target,
        speed: 6, // Velocidad del proyectil
        color: color,
        radius: 4,
        hasBlur: true,
        onHit: onHit
    });
  },

  /**
   * Crea un efecto de corte en una posición.
   */
  spawnSlash: (targetPos: Vector2) => {
    VisualEffectsSystem.effects.push({
        id: VisualEffectsSystem.nextId++,
        position: { ...targetPos },
        rotation: Math.random() * Math.PI * 2, // Rotación aleatoria
        life: 1.0,
        type: 'SLASH'
    });
  },

  /**
   * Crea un indicador de área en el suelo (Ej: Cruz roja).
   */
  spawnAreaIndicator: (pos: Vector2, durationMs: number, radius: number, color: string = '#ef4444') => {
      // Convertimos duración a "vida" (asumiendo 60fps aprox, o usando deltaTime en update si fuera preciso)
      // Aquí usaremos un sistema basado en tiempo real en update si fuera posible, 
      // pero por simplicidad usaremos un decay lento ajustado.
      // Si el update resta 0.016 por frame (60fps), life = 1 dura 1 seg.
      // Queremos que dure durationMs.
      
      const lifeAmount = durationMs / 1000; 

      VisualEffectsSystem.effects.push({
          id: VisualEffectsSystem.nextId++,
          position: { ...pos },
          rotation: 0,
          life: lifeAmount,
          maxLife: lifeAmount,
          radius: radius,
          type: 'AREA_MARKER',
          color: color
      });
  },

  update: () => {
    // 1. Actualizar Textos
    VisualEffectsSystem.texts = VisualEffectsSystem.texts.filter(t => t.life > 0);
    VisualEffectsSystem.texts.forEach(t => {
      t.position.y -= t.velocity; 
      t.life -= 0.02; 
    });

    // 2. Actualizar Proyectiles
    const survivingProjectiles: Projectile[] = [];
    VisualEffectsSystem.projectiles.forEach(p => {
        if (p.target.health <= 0) return; // Si el objetivo muere, el proyectil desaparece (o podría seguir)

        const dist = distance(p.position, p.target.position);
        
        // Si impacta (distancia menor al radio del objetivo)
        if (dist < p.target.radius) {
            p.onHit(); // Aplicar daño
        } else {
            // Mover hacia el objetivo
            const dx = p.target.position.x - p.position.x;
            const dy = p.target.position.y - p.position.y;
            const angle = Math.atan2(dy, dx);
            
            p.position.x += Math.cos(angle) * p.speed;
            p.position.y += Math.sin(angle) * p.speed;
            
            survivingProjectiles.push(p);
        }
    });
    VisualEffectsSystem.projectiles = survivingProjectiles;

    // 3. Actualizar Efectos
    VisualEffectsSystem.effects = VisualEffectsSystem.effects.filter(e => e.life > 0);
    VisualEffectsSystem.effects.forEach(e => {
        if (e.type === 'AREA_MARKER') {
             // Decremento basado en tiempo real aproximado (asumiendo delta ~16ms)
             e.life -= 0.016; 
        } else {
             e.life -= 0.1; // Slash desaparece rápido
        }
    });
  },

  draw: (ctx: CanvasRenderingContext2D) => {
    // Dibujar Efectos de Suelo (AREA_MARKER primero para que queden abajo)
    VisualEffectsSystem.effects.forEach(e => {
        if (e.type === 'AREA_MARKER') {
            ctx.save();
            ctx.translate(e.position.x, e.position.y);
            
            const opacity = Math.min(1, e.life * 2); // Fade out al final
            ctx.globalAlpha = opacity;
            ctx.strokeStyle = e.color || 'red';
            ctx.lineWidth = 3;

            // Dibujar Cruz
            const r = e.radius || 20;
            ctx.beginPath();
            ctx.moveTo(-r, -r);
            ctx.lineTo(r, r);
            ctx.moveTo(r, -r);
            ctx.lineTo(-r, r);
            ctx.stroke();

            // Círculo exterior pulsante
            const pulse = 1 + Math.sin(Date.now() / 100) * 0.1;
            ctx.beginPath();
            ctx.arc(0, 0, r * pulse, 0, Math.PI * 2);
            ctx.setLineDash([5, 5]);
            ctx.stroke();

            // Relleno progresivo (timer visual)
            if (e.maxLife) {
                const progress = 1 - (e.life / e.maxLife);
                ctx.globalAlpha = 0.2;
                ctx.fillStyle = e.color || 'red';
                ctx.beginPath();
                ctx.moveTo(0,0);
                ctx.arc(0, 0, r, -Math.PI/2, (-Math.PI/2) + (Math.PI * 2 * progress));
                ctx.lineTo(0,0);
                ctx.fill();
            }

            ctx.restore();
        }
    });

    // Dibujar Textos
    ctx.save();
    ctx.textAlign = 'center';
    VisualEffectsSystem.texts.forEach(t => {
      ctx.globalAlpha = Math.max(0, t.life); 
      const fontSize = Math.round(14 * t.scale);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillText(t.text, t.position.x + 2, t.position.y + 2);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.position.x, t.position.y);
    });
    ctx.restore();

    // Dibujar Proyectiles (Bolitas de luz)
    VisualEffectsSystem.projectiles.forEach(p => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        
        if (p.hasBlur) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
        }
        
        ctx.fill();
        ctx.restore();
    });

    // Dibujar Efectos (Cortes y Cleaves)
    VisualEffectsSystem.effects.forEach(e => {
        if (e.type === 'SLASH') {
            ctx.save();
            ctx.translate(e.position.x, e.position.y);
            ctx.rotate(e.rotation);
            ctx.globalAlpha = Math.max(0, e.life);
            
            ctx.beginPath();
            // Dibujar una curva de corte
            ctx.moveTo(-15, -15);
            ctx.quadraticCurveTo(0, 0, 15, 15);
            
            ctx.lineWidth = 4 * e.life; // Se hace más fino al desaparecer
            ctx.strokeStyle = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ffffff';
            ctx.stroke();
            
            ctx.restore();
        } else if (e.type === 'CLEAVE') {
            // EFECTO DE CORTE SEMICIRCULAR (SPLASH)
            ctx.save();
            ctx.translate(e.position.x, e.position.y);
            ctx.rotate(e.rotation); // Rotar hacia el objetivo
            
            const alpha = Math.max(0, e.life);
            ctx.globalAlpha = alpha;
            
            const radius = e.radius || 40;
            const arcStart = -Math.PI / 2;
            const arcEnd = Math.PI / 2;
            
            // 1. Relleno de barrido
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, arcStart, arcEnd);
            ctx.closePath();
            ctx.fillStyle = e.color || '#ef4444'; // Rojo por defecto
            ctx.globalAlpha = alpha * 0.3; // Semitransparente
            ctx.fill();

            // 2. Borde de corte (La "hoja")
            ctx.beginPath();
            ctx.arc(0, 0, radius, arcStart, arcEnd);
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#ffffff'; // Filo blanco
            ctx.globalAlpha = alpha;
            ctx.stroke();

            // 3. Estela de movimiento (opcional, líneas internas)
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.7, arcStart + 0.2, arcEnd - 0.2);
            ctx.lineWidth = 1;
            ctx.strokeStyle = e.color || '#ef4444';
            ctx.stroke();

            ctx.restore();
        }
    });
  }
};