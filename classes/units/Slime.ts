import { EnemyUnit, Unit } from '../Unit';
import { VisualEffectsSystem, TextType } from '../../modules/VisualEffects';
import { Vector2, Team } from '../../types'; // Importar Team
import { distance } from '../../utils/math';

export class Slime extends EnemyUnit {
  public canSplit: boolean;
  public isBoss: boolean;
  
  // Lógica del Boss (Invocación)
  private lastSummonTime: number = 0;
  private lastHealthThreshold: number;

  // Lógica del Boss (Habilidad Aplastar)
  private smashCooldownTime = 10000; // 10 segundos
  private smashCastDuration = 3000;  // 5 segundos en el aire
  private lastSmashTime = -9999;
  private smashCastStartTime = 0;
  private isSmashing = false;     // ¿Está ejecutando la habilidad?
  private isHidden = false;       // ¿Está en el aire (invisible)?
  private smashTargetPosition: Vector2 | null = null;

  constructor(id: number, x: number, y: number, type: 'NORMAL' | 'MINI' | 'BOSS' = 'NORMAL') {
    // Definición de Stats según tipo
    let stats;
    let name;
    let icon = '💧';

    if (type === 'BOSS') {
        name = "Slime Bastardo";
        icon = '☢️';
        stats = {
            strength: 10,
            constitution: 80,
            willpower: 10,
            agility: 10,
            dexterity: 10,
            intelligence: 10,

            maxHealth: 1000,
            maxEnergy: 0,
            physicalDamage: 0, 
            magicDamage: 0,     
            attackCooldown: 1000, 
            range: 25, 
            armor: 0, 
            magicResist: 0, 
            healthRegen: 0,
            energyRegen: 0, 
            criticalChance: 0,
            criticalMultiplier: 1.5, 
            evasionChance: 0,
            aggroRange: 10000, 
            radius: 60, 
            velocity: 1,
            color: '#84cc16', 
            strokeColor: '#3f6212'
        };
    } else if (type === 'MINI') {
        name = "Mini Slime";
        stats = {
            strength: 2,
            constitution: 4,
            willpower: 2,
            agility: 4,
            dexterity: 4,
            intelligence: 2,

            maxHealth: 0,
            maxEnergy: 0,
            physicalDamage: 0, 
            magicDamage: 0,     
            attackCooldown: 1000, 
            range: 10, 
            armor: 0, 
            magicResist: 0, 
            healthRegen: 0,
            energyRegen: 0, 
            criticalChance: 0,
            criticalMultiplier: 1.5, 
            evasionChance: 0,
            aggroRange: 10000, 
            radius: 13,
            velocity: 1,
            color: '#a3e635',
            strokeColor: '#3f6212'
        };
    } else { // NORMAL
        name = "Slime";
        stats = {
            strength: 4,
            constitution: 8,
            willpower: 5,
            agility: 10,
            dexterity: 10,
            intelligence: 5,

            maxHealth: 0,
            maxEnergy: 0,
            physicalDamage: 0, 
            magicDamage: 0,     
            attackCooldown: 1000, 
            range: 10, 
            armor: 0, 
            magicResist: 0, 
            healthRegen: 0,
            energyRegen: 0, 
            criticalChance: 0,
            criticalMultiplier: 1.5, 
            evasionChance: 0,
            aggroRange: 10000, 
            radius: 26,
            velocity: 1,
            color: '#84cc16',
            strokeColor: '#3f6212'
        };
    }

    super(id, x, y, stats, name, icon);

    this.isBoss = (type === 'BOSS');
    this.canSplit = (type === 'NORMAL');
    this.lastHealthThreshold = this.maxHealth;
  }

  /**
   * Comportamiento específico del Boss (se llama cada frame desde GameCanvas loop)
   */
  public updateBossBehavior(allUnits: Unit[], currentTime: number) {
      if (!this.isBoss || this.health <= 0) return;

      // --- HABILIDAD: APLASTAR (PRIORIDAD ALTA) ---
      
      // 1. Iniciar Salto si cooldown listo y no está haciéndolo ya
      if (!this.isSmashing && currentTime - this.lastSmashTime > this.smashCooldownTime) {
          this.startSmash(allUnits, currentTime);
      }

      // 2. Controlar la fase de vuelo/aterrizaje
      if (this.isSmashing) {
          // Congelar acciones normales
          this.target = null;
          this.targetUnit = null; 
          this.isMoving = false;

          // Verificar si toca aterrizar
          if (currentTime - this.smashCastStartTime >= this.smashCastDuration) {
              this.landSmash(allUnits, currentTime);
          }
          return; // IMPORTANTE: Salir para no ejecutar invocaciones ni movimiento mientras salta
      }


      // --- HABILIDAD: INVOCACIÓN (PRIORIDAD BAJA) ---
      let shouldSummon = false;

      if (this.health <= this.lastHealthThreshold - 50) {
          shouldSummon = true;
          this.lastHealthThreshold = Math.floor(this.health / 50) * 50;
      }

      if (currentTime - this.lastSummonTime > 15000) {
          shouldSummon = true;
      }

      if (shouldSummon) {
          this.summonMinion(allUnits, currentTime);
      }
  }

  // --- LÓGICA APLASTAR ---

  private startSmash(allUnits: Unit[], currentTime: number) {
      // Buscar objetivo: Un jugador aleatorio vivo
      const players = allUnits.filter(u => u.team === Team.PLAYER && u.health > 0);
      if (players.length === 0) return; // No hay a quien aplastar

      const targetPlayer = players[Math.floor(Math.random() * players.length)];
      
      this.isSmashing = true;
      this.smashCastStartTime = currentTime;
      this.smashTargetPosition = { ...targetPlayer.position };
      this.isHidden = true; // Desaparece

      // Visual: Cruz Roja
      VisualEffectsSystem.spawnText(this.position.x, this.position.y, "¡SALTO!", TextType.CRITICAL);
      VisualEffectsSystem.spawnAreaIndicator(this.smashTargetPosition, this.smashCastDuration, 60, '#ef4444');
  }

  private landSmash(allUnits: Unit[], currentTime: number) {
      if (!this.smashTargetPosition) return;

      // 1. Teletransportar
      this.position = { ...this.smashTargetPosition };
      this.isHidden = false; // Reaparece
      this.isSmashing = false;
      this.lastSmashTime = currentTime;

      // 2. Efecto visual de impacto
      VisualEffectsSystem.spawnText(this.position.x, this.position.y, "¡APLASTAR!", TextType.CRITICAL);
      // Efecto "onda expansiva" visual hackeado como un slash gigante circular
      VisualEffectsSystem.spawnAreaIndicator(this.position, 200, 80, '#ffffff'); 

      // 3. Calcular Daño y Knockback en Área
      const IMPACT_RADIUS = 80;
      const DAMAGE = 40;
      const KNOCKBACK_FORCE = 150;

      allUnits.forEach(unit => {
          if (unit.id === this.id) return;
          if (unit.health <= 0) return;

          const dist = distance(this.position, unit.position);
          
          if (dist <= IMPACT_RADIUS) {
              // APLICAR DAÑO (Afecta a todos, incluso otros enemigos si caen ahí, ¡es caótico!)
              // Para ser justos, solo a jugadores:
              if (unit.team === Team.PLAYER) {
                  unit.health -= DAMAGE;
                  VisualEffectsSystem.spawnText(unit.position.x, unit.position.y, DAMAGE.toString(), TextType.CRITICAL);

                  // APLICAR KNOCKBACK
                  const dx = unit.position.x - this.position.x;
                  const dy = unit.position.y - this.position.y;
                  let angle = Math.atan2(dy, dx);
                  
                  // Si cae justo encima (dist 0), ángulo aleatorio
                  if (dist === 0) angle = Math.random() * Math.PI * 2;

                  unit.position.x += Math.cos(angle) * KNOCKBACK_FORCE;
                  unit.position.y += Math.sin(angle) * KNOCKBACK_FORCE;

                  // Interrumpir casteo o movimiento de la víctima
                  unit.stop();
              }
          }
      });
  }

  // --- LÓGICA INVOCACIÓN ---

  private summonMinion(allUnits: Unit[], currentTime: number) {
      this.lastSummonTime = currentTime;
      VisualEffectsSystem.spawnText(this.position.x, this.position.y - 20, "¡INVOCACIÓN!", TextType.CRITICAL);
      
      const minionId = Math.floor(Math.random() * 100000) + 50000;
      const offsetX = (Math.random() - 0.5) * 60;
      const offsetY = (Math.random() - 0.5) * 60;

      const minion = new Slime(
          minionId, 
          this.position.x + offsetX, 
          this.position.y + offsetY, 
          'NORMAL'
      );

      minion.target = { x: minion.position.x + offsetX, y: minion.position.y + offsetY };
      minion.isMoving = true;

      allUnits.push(minion);
  }

  public override onDeath(allUnits: Unit[]) {
    if (this.canSplit) {
        VisualEffectsSystem.spawnText(this.position.x, this.position.y, "POP!", TextType.NORMAL);
        for (let i = 0; i < 2; i++) {
            const miniId = Math.floor(Math.random() * 100000) + 10000;
            const offsetX = (Math.random() - 0.5) * 20;
            const offsetY = (Math.random() - 0.5) * 20;
            const miniSlime = new Slime(miniId, this.position.x + offsetX, this.position.y + offsetY, 'MINI');
            allUnits.push(miniSlime);
        }
    } else if (this.isBoss) {
        VisualEffectsSystem.spawnText(this.position.x, this.position.y, "¡RAAAAGH!", TextType.CRITICAL);
    }
  }

  /**
   * Sobrescribir draw para soportar invisibilidad durante el salto
   */
  public override draw(ctx: CanvasRenderingContext2D) {
      if (this.isHidden) {
          // Opcional: Dibujar sombra tenue donde estaba o nada
          return;
      }
      super.draw(ctx);
  }
}