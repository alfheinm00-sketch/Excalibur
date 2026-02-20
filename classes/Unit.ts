import { Vector2, Team } from '../types';
import { MovableEntity, MovementSystem } from '../modules/Movement';
import { UnitStats } from '../data/UnitTypes';
import { Skill, Modifier } from '../data/SkillTypes';
import { Equipment } from '../data/ItemTypes'; 
import { VisualEffectsSystem, TextType } from '../modules/VisualEffects';
import { getIconImage } from '../data/Icons'; // Importar helper de iconos
import { distance } from '../utils/math'; // Importar distance

/**
 * Estados de la Máquina de Estados Finita (FSM)
 */
export enum UnitState {
  IDLE,       // Buscando objetivos o esperando
  MOVING,     // Moviéndose hacia un punto o persiguiendo
  ATTACKING,  // En combate activo
  CASTING     // Canalizando una habilidad (Inmóvil)
}

/**
 * Clase Base UNIT
 */
export class Unit implements MovableEntity {
  public id: number;
  public name: string;
  public icon: string; // NUEVO: Identificador de icono (SVG key o Emoji)
  public position: Vector2;
  public radius: number;
  public isSelected: boolean;
  public ip: string;
  
  // Propiedades de Movimiento
  public target: Vector2 | null;
  public velocity: number;
  public isMoving: boolean;

  // Propiedades de Combate Básicas
  public team: Team;
  public targetUnit: Unit | null;
  public maxHealth: number;
  public health: number;
  public maxEnergy: number;
  public energy: number; 
  
  // Atributos Base (Stats Primarios)
  public strength: number;
  public constitution: number;
  public willpower: number;
  public agility: number;
  public dexterity: number;
  public intelligence: number;

  // Estadísticas Base (Inmutables)
  private baseMaxHealth: number;      // Nuevo
  private baseMaxEnergy: number;      // Nuevo
  private basePhysicalDamage: number; // Renombrado
  private baseMagicDamage: number;    // Nuevo
  private baseArmor: number;
  private baseMagicResist: number;    // Nuevo
  private baseVelocity: number;
  private baseAttackCooldown: number;
  private baseRange: number;
  private baseHealthRegen: number;
  private baseEnergyRegen: number;    // Nuevo
  private baseCriticalChance: number;
  private baseCriticalMultiplier: number; // NUEVO
  private baseEvasionChance: number;

  // Estadísticas Actuales (Calculadas)
  public physicalDamage: number; // Renombrado
  public magicDamage: number;    // Nuevo
  public armor: number;
  public magicResist: number;    // Nuevo
  public healthRegen: number;
  public energyRegen: number;
  public criticalChance: number;
  public criticalMultiplier: number; // NUEVO
  public evasionChance: number;
  
  public attackRange: number;
  public aggroRange: number;
  public attackCooldown: number;
  public lastAttackTime: number;

  // --- NUEVO: SISTEMA DE AMENAZA (AGGRO) ---
  // Mapa de ID de Unidad -> Cantidad de Amenaza
  public threatMap: Map<number, number>;
  // Timestamp hasta el cual la unidad está "ocupada" atacando (Sticky Aggro)
  public busyUntil: number;
  
  // --- NUEVO: ESTADO ACTUAL ---
  public state: UnitState;
  public isAttackMoving: boolean; // NUEVO: Flag para Attack Move
  public isHoldingPosition: boolean; // NUEVO: Flag para Hold Position

  // --- NUEVO: SISTEMA DE CASTEO ---
  public isCasting: boolean;
  public castEndTime: number;
  public castTotalTime: number; // Para dibujar la barra
  public pendingSkill: Skill | null;

  // Sistema de Habilidades
  public skills: Skill[];
  public modifiers: Modifier[];
  
  // Sistema de Equipamiento
  public equipment: Equipment;

  public color: string;
  public strokeColor: string;

  constructor(
    id: number, 
    x: number, 
    y: number, 
    team: Team, 
    stats: UnitStats,
    name: string = "Unit",
    icon: string = "❓" // Icono por defecto
  ) {
    this.id = id;
    this.name = name;
    this.icon = icon;
    this.position = { x, y };
    this.target = null;
    this.targetUnit = null;
    this.isMoving = false;
    
    // Stats Base
    this.radius = stats.radius;
    this.baseVelocity = stats.velocity;
    this.velocity = stats.velocity;
    this.color = stats.color;
    this.strokeColor = stats.strokeColor;

    // Inicializar Atributos
    this.strength = stats.strength;
    this.constitution = stats.constitution;
    this.willpower = stats.willpower;
    this.agility = stats.agility;
    this.dexterity = stats.dexterity;
    this.intelligence = stats.intelligence;

    this.baseMaxHealth = stats.maxHealth;
    this.maxHealth = stats.maxHealth; // Se recalculará

    this.baseMaxEnergy = stats.maxEnergy;
    this.maxEnergy = stats.maxEnergy; // Se recalculará
    
    this.basePhysicalDamage = stats.physicalDamage;
    this.physicalDamage = stats.physicalDamage;

    this.baseMagicDamage = stats.magicDamage;
    this.magicDamage = stats.magicDamage;
    
    this.baseArmor = stats.armor;
    this.armor = stats.armor;

    this.baseMagicResist = stats.magicResist;
    this.magicResist = stats.magicResist;

    this.baseHealthRegen = stats.healthRegen; // Guardar base
    this.healthRegen = stats.healthRegen;
    
    this.baseEnergyRegen = stats.energyRegen;
    this.energyRegen = stats.energyRegen;
    
    this.baseCriticalChance = stats.criticalChance;
    this.criticalChance = stats.criticalChance;

    this.baseCriticalMultiplier = stats.criticalMultiplier;
    this.criticalMultiplier = stats.criticalMultiplier;
    
    this.baseEvasionChance = stats.evasionChance;
    this.evasionChance = stats.evasionChance;
    
    this.baseAttackCooldown = stats.attackCooldown;
    this.attackCooldown = stats.attackCooldown;
    
    this.baseRange = stats.range; // Rango base (generalmente puños o rango nativo)
    this.attackRange = stats.range;
    this.aggroRange = stats.aggroRange;

    // Inicializar Amenaza y Estado
    this.threatMap = new Map();
    this.busyUntil = 0;
    this.state = UnitState.IDLE;
    this.isAttackMoving = false;
    this.isHoldingPosition = false;

    // Inicializar Casteo
    this.isCasting = false;
    this.castEndTime = 0;
    this.castTotalTime = 0;
    this.pendingSkill = null;

    this.skills = [];
    this.modifiers = [];

    // Inicializar Equipamiento Vacío
    this.equipment = {
        head: null,
        shirt: null,
        pants: null,
        boots: null,
        necklace: null,
        rightHand: null,
        leftHand: null,
        rings: [null, null, null, null, null],
        potions: [null, null, null, null, null]
    };

    // Recalcular stats iniciales basados en atributos (AHORA SÍ, después de inicializar equipment)
    this.recalculateStats();

    // Inicialización
    this.health = this.maxHealth;
    this.energy = this.maxEnergy;
    this.isSelected = false;
    this.ip = this.generateUniqueIP(); 
    this.team = team;
    this.lastAttackTime = 0;
  }

  private generateUniqueIP(): string {
    const octet = () => Math.floor(Math.random() * 256);
    return `${octet()}.${octet()}.${octet()}.${octet()}`;
  }

  /**
   * Hook que se ejecuta cuando la unidad muere (HP <= 0).
   * Puede ser sobrescrito por subclases (ej: Slime).
   */
  public onDeath(allUnits: Unit[]) {
      // Por defecto no hace nada
  }

  public moveTo(x: number, y: number) {
    // INTERRUMPIR CASTEO SI NOS MOVEMOS
    if (this.isCasting) {
        this.interruptCast();
    }

    const randomOffsetX = (Math.random() - 0.5) * 10;
    const randomOffsetY = (Math.random() - 0.5) * 10;
    this.target = { x: x + randomOffsetX, y: y + randomOffsetY };
    
    // PRIORIDAD MANUAL: Limpiamos targetUnit para que la unidad obedezca el movimiento
    // y deje de perseguir/atacar a su objetivo anterior inmediatamente.
    this.targetUnit = null; 
    
    // Reseteamos flags de estado
    this.isHoldingPosition = false;
    this.isAttackMoving = false; // Por defecto false, el controlador lo activará si es una orden de Attack Move

    // Forzamos el estado a MOVING
    this.state = UnitState.MOVING;
  }

  public setAttackTarget(unit: Unit) {
    // INTERRUMPIR CASTEO SI CAMBIAMOS ORDEN
    if (this.isCasting) {
        this.interruptCast();
    }

    // Permitir targeting a uno mismo para mecánicas de curación
    // o targeting normal a otros.
    this.targetUnit = unit;
    
    // Reseteamos flags de estado (atacar explícitamente cancela hold y attack move genérico)
    this.isHoldingPosition = false;
    this.isAttackMoving = false;

    // Al asignar objetivo, pasamos a MOVING para perseguirlo (la FSM cambiará a ATTACKING si está cerca)
    this.state = UnitState.MOVING;
  }

  public stop() {
    this.target = null;
    this.isMoving = false;
    this.isAttackMoving = false;
    this.isHoldingPosition = false;
    // No cambiamos state aquí a IDLE porque stop() se usa dentro de ATTACKING para detener el movimiento físico
  }

  public interruptCast() {
      if (this.isCasting) {
          this.isCasting = false;
          this.pendingSkill = null;
          // Devolver energía? Por ahora no, se pierde al cancelar.
          VisualEffectsSystem.spawnText(this.position.x, this.position.y, "¡Interrumpido!", TextType.MISS);
          this.state = UnitState.IDLE;
      }
  }

  /**
   * Intenta lanzar una habilidad.
   */
  public castSkill(skillIndex: number, allUnits: Unit[], currentTime: number): boolean {
    const skill = this.skills[skillIndex];
    if (!skill) return false;

    // Si ya está casteando algo, no puede castear otra
    if (this.isCasting) {
        VisualEffectsSystem.spawnText(this.position.x, this.position.y, "¡Ocupado!", TextType.MISS);
        return false;
    }

    // Chequeos Básicos
    if (this.energy < skill.energyCost) return false;
    if (currentTime - skill.lastUsed < skill.cooldown) return false;

    // --- NUEVO: SISTEMA DE CAST TIME ---
    if (skill.castTime && skill.castTime > 0) {
        // Iniciar Casteo
        this.isCasting = true;
        this.castTotalTime = skill.castTime;
        this.castEndTime = currentTime + skill.castTime;
        this.pendingSkill = skill;
        
        // Consumir recursos al INICIO del casteo (diseño clásico RPG)
        this.energy -= skill.energyCost;
        skill.lastUsed = currentTime; // El CD empieza al castear

        // Detener movimiento
        this.stop();
        this.state = UnitState.CASTING;
        
        VisualEffectsSystem.spawnText(this.position.x, this.position.y, "Casteando...", TextType.NORMAL);
        return true;
    }

    // Ejecución Instantánea
    this.energy -= skill.energyCost;
    skill.lastUsed = currentTime;
    skill.effect(this, allUnits);
    
    this.busyUntil = currentTime + 500; 

    return true;
  }

  /**
   * Verifica y ejecuta habilidades en modo Auto-Cast
   */
  public updateSkills(allUnits: Unit[], currentTime: number) {
      // Si está casteando, no hacer nada más
      if (this.isCasting) return;

      this.skills.forEach((skill, index) => {
          if (!skill.isAutoCast) return;

          // 1. Chequeo Básico
          if (currentTime - skill.lastUsed < skill.cooldown) return;
          if (this.energy < skill.energyCost) return;

          // 2. Chequeo de Contexto
          const isUsefulContext = this.state !== UnitState.IDLE || this.health < this.maxHealth;

          if (isUsefulContext) {
              // 3. Chequeo de Rango para Auto-Cast (NUEVO)
              // Si la habilidad tiene un rango definido, verificar si hay algún objetivo válido cerca
              if (skill.range && skill.range > 0) {
                  // Buscar si hay algún enemigo dentro del rango de la habilidad
                  const hasTargetInRange = allUnits.some(u => 
                      u.team !== this.team && 
                      u.health > 0 && 
                      distance(this.position, u.position) <= skill.range!
                  );
                  
                  if (!hasTargetInRange) return; // No castear si no hay nadie en rango
              }

              // Llamamos a castSkill. Si tiene CastTime, entrará en el estado CASTING automáticamente.
              this.castSkill(index, allUnits, currentTime);
          }
      });
  }

  /**
   * Consume una poción del cinturón.
   */
  public usePotion(slotIndex: number): boolean {
    // Usar poción no interrumpe casteo (generalmente)
    const potion = this.equipment.potions[slotIndex];
    if (!potion || !potion.consumableStats) return false;

    // Aplicar efecto
    this.addModifier({
        id: `potion_${Date.now()}_${Math.random()}`, // ID único para acumular si se desea (o usar potion.id para no acumular)
        stat: potion.consumableStats.stat,
        value: potion.consumableStats.value,
        duration: potion.consumableStats.duration,
        timeRemaining: potion.consumableStats.duration
    });

    VisualEffectsSystem.spawnText(this.position.x, this.position.y, "¡GLU GLU!", TextType.NORMAL);

    // Consumir objeto (eliminar del slot)
    this.equipment.potions[slotIndex] = null;
    return true;
  }

  public addModifier(modifier: Modifier) {
    // Si ya existe un modificador con ese ID, refrescamos duración
    // EXCEPCIÓN: Si el ID es aleatorio (pociones), se acumulan
    const existing = this.modifiers.find(m => m.id === modifier.id);
    if (existing) {
        existing.timeRemaining = modifier.duration;
    } else {
        this.modifiers.push(modifier);
    }
    this.recalculateStats();
  }

  // --- MÉTODOS DE AMENAZA ---
  
  /**
   * Añade amenaza a un objetivo específico.
   */
  public addThreat(targetId: number, amount: number) {
      const current = this.threatMap.get(targetId) || 0;
      // La amenaza no puede bajar de 0
      this.threatMap.set(targetId, Math.max(0, current + amount));
  }

  /**
   * Obtiene la amenaza de un objetivo.
   */
  public getThreat(targetId: number): number {
      return this.threatMap.get(targetId) || 0;
  }

  /**
   * Reduce la amenaza de todos los objetivos (Decay).
   */
  public decayThreat(amount: number) {
      for (const [id, threat] of this.threatMap.entries()) {
          if (threat > 0) {
              this.threatMap.set(id, Math.max(0, threat - amount));
          } else {
              this.threatMap.delete(id); // Limpieza
          }
      }
  }

  public update(units: Unit[], deltaTime: number) {
    // 0. LÓGICA DE CASTEO
    if (this.isCasting) {
        // Forzar detención (por si acaso algo le dio velocidad)
        this.isMoving = false;
        
        // Verificar finalización
        if (performance.now() >= this.castEndTime) {
            // EJECUTAR HABILIDAD DIFERIDA
            if (this.pendingSkill) {
                this.pendingSkill.effect(this, units);
            }
            // Resetear estado
            this.isCasting = false;
            this.pendingSkill = null;
            this.state = UnitState.IDLE;
            this.busyUntil = performance.now() + 500; // Pequeño delay post-cast
        }
        
        // IMPORTANTE: Si está casteando, NO se mueve ni regenera (opcional, aquí permitimos regen)
        // Pero no ejecutamos MovementSystem para no desplazarlo.
        this.updateModifiers(deltaTime);
        this.regenerate(deltaTime); 
        return; 
    }

    // 1. Movimiento
    MovementSystem.updatePosition(this);
    MovementSystem.resolveCollisions(this, units);

    // 2. Regeneración
    if (this.health > 0) {
        this.regenerate(deltaTime);
    }

    // 3. Modificadores
    this.updateModifiers(deltaTime);
  }

  private updateModifiers(deltaTime: number) {
    if (this.modifiers.length === 0) return;

    let changed = false;
    this.modifiers = this.modifiers.filter(mod => {
        mod.timeRemaining -= deltaTime;
        if (mod.timeRemaining <= 0) {
            changed = true;
            return false;
        }
        return true;
    });

    if (changed) this.recalculateStats();
  }

  public recalculateStats() {
    // 1. Calcular Atributos Efectivos (Base + Modificadores)
    let effStrength = this.strength;
    let effConstitution = this.constitution;
    let effWillpower = this.willpower;
    let effAgility = this.agility;
    let effDexterity = this.dexterity;
    let effIntelligence = this.intelligence;

    this.modifiers.forEach(mod => {
        if (mod.stat === 'strength') effStrength += mod.value;
        if (mod.stat === 'constitution') effConstitution += mod.value;
        if (mod.stat === 'willpower') effWillpower += mod.value;
        if (mod.stat === 'agility') effAgility += mod.value;
        if (mod.stat === 'dexterity') effDexterity += mod.value;
        if (mod.stat === 'intelligence') effIntelligence += mod.value;
    });

    // 2. Calcular Estadísticas Derivadas Base (Sin equipo)
    // Fórmulas:
    // STR: +1 Dmg, +0.1 Armor
    // CON: +10 HP, +0.1 HP Regen
    // WIL: +0.2 MP Regen, +0.5 M.Res
    // AGI: +0.05 Spd, +0.25% Eva
    // DEX: +2% AtkSpd (Divisor), +0.5% Crit
    // INT: +1 M.Dmg, +5 MaxMP

    this.physicalDamage = this.basePhysicalDamage + (effStrength * 1.0);
    this.armor = this.baseArmor + (effStrength * 0.1);

    this.maxHealth = this.baseMaxHealth + (effConstitution * 10);
    this.healthRegen = this.baseHealthRegen + (effConstitution * 0.1);

    this.energyRegen = this.baseEnergyRegen + (effWillpower * 0.2);
    this.magicResist = this.baseMagicResist + (effWillpower * 0.5);

    this.velocity = this.baseVelocity + (effAgility * 0.05);
    this.evasionChance = this.baseEvasionChance + (effAgility * 0.0025); // 0.25% es 0.0025

    // Velocidad de Ataque: Intervalo = Base / (1 + (Destreza * 0.02))
    this.attackCooldown = this.baseAttackCooldown / (1 + (effDexterity * 0.02));
    
    this.criticalChance = this.baseCriticalChance + (effDexterity * 0.005); // 0.5% es 0.005

    this.magicDamage = this.baseMagicDamage + (effIntelligence * 1.0);
    this.maxEnergy = this.baseMaxEnergy + (effIntelligence * 5);

    this.attackRange = this.baseRange; 
    this.criticalMultiplier = this.baseCriticalMultiplier; 

    // 3. Aplicar Equipamiento (Dual Wield Support)
    const hands = [this.equipment.rightHand, this.equipment.leftHand];
    let mainHandRange = 0;

    hands.forEach((weapon, index) => {
        if (weapon && weapon.weaponStats) {
            let bonusDmg = 0;
            // Lógica Rasgo Sutil: +50% Destreza como daño físico extra
            if (weapon.weaponStats.isSubtle) {
                bonusDmg = effDexterity * 0.5;
            }

            this.physicalDamage += weapon.weaponStats.physicalDamage + bonusDmg;
            this.magicDamage += weapon.weaponStats.magicDamage;
            this.attackCooldown += weapon.weaponStats.cooldownModifier;
            
            // Usamos el rango del arma de la mano derecha como principal, o el de la izquierda si no hay derecha
            if (index === 0) mainHandRange = weapon.weaponStats.range;
            if (index === 1 && mainHandRange === 0) mainHandRange = weapon.weaponStats.range;
        }
    });

    if (mainHandRange > 0) {
        this.attackRange = mainHandRange;
    }

    // 4. Modificadores directos a stats (ej: +10 Daño, no +10 Fuerza)
    this.modifiers.forEach(mod => {
        if (mod.stat === 'armor') this.armor += mod.value;
        if (mod.stat === 'magicResist') this.magicResist += mod.value;
        if (mod.stat === 'physicalDamage') this.physicalDamage += mod.value;
        if (mod.stat === 'magicDamage') this.magicDamage += mod.value;
        if (mod.stat === 'speed') this.velocity += mod.value;
        if (mod.stat === 'healthRegen') this.healthRegen += mod.value;
        if (mod.stat === 'criticalChance') this.criticalChance += mod.value;
        if (mod.stat === 'criticalMultiplier') this.criticalMultiplier += mod.value;
        if (mod.stat === 'evasionChance') this.evasionChance += mod.value;
        if (mod.stat === 'range') this.attackRange += mod.value; // NUEVO
    });
  }

  public removeModifier(id: string) {
      const initialLength = this.modifiers.length;
      this.modifiers = this.modifiers.filter(m => m.id !== id);
      if (this.modifiers.length !== initialLength) {
          this.recalculateStats();
      }
  }

  private regenerate(deltaTime: number) {
    const deltaSeconds = deltaTime / 1000;
    if (this.health < this.maxHealth) {
        this.health = Math.min(this.maxHealth, this.health + (this.healthRegen * deltaSeconds));
    }
    if (this.energy < this.maxEnergy) {
        this.energy = Math.min(this.maxEnergy, this.energy + (this.energyRegen * deltaSeconds));
    }
  }

  public draw(ctx: CanvasRenderingContext2D) {
    // 1. Indicador de Selección
    if (this.isSelected) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.position.x, this.position.y, this.radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#4ade80'; 
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    // Indicador visual de buff (Ej: Escudo)
    if (this.armor > this.baseArmor) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#60a5fa'; // Azul escudo
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.stroke();
        ctx.restore();
    }

    // Indicador visual de Resistencia Mágica Alta
    if (this.magicResist > this.baseMagicResist) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#c084fc'; // Púrpura escudo mágico
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 4]);
        ctx.stroke();
        ctx.restore();
    }

    // Indicador visual de Evasión Alta
    if (this.evasionChance > this.baseEvasionChance + 0.1) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = '#a8a29e'; // Gris humo
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.stroke();
        ctx.restore();
    }
    
    // Indicador visual de Regeneración Alta
    if (this.healthRegen > this.baseHealthRegen + 5) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(74, 222, 128, 0.2)'; // Verde suave relleno
        ctx.fill();
        ctx.restore();
    }

    // 3. Línea de objetivo
    if (this.targetUnit && this.health > 0) {
        ctx.beginPath();
        ctx.moveTo(this.position.x, this.position.y);
        ctx.lineTo(this.targetUnit.position.x, this.targetUnit.position.y);
        // Color de línea diferente si es curación (aliado)
        const isHealTarget = this.team === this.targetUnit.team;
        ctx.strokeStyle = isHealTarget ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255, 255, 255, 0.1)'; 
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }

    // 4. CUERPO E ICONO (Refactorizado)
    const iconImage = getIconImage(this.icon);

    ctx.save();
    
    // Dibujar Círculo de Fondo (Color de Clase/Equipo)
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color; 
    ctx.fill();
    
    // Si tenemos imagen SVG, la dibujamos con clip
    if (iconImage && iconImage.complete && iconImage.naturalWidth > 0) {
        ctx.clip(); // Recortar todo lo que sigue al círculo definido arriba
        
        // Dibujamos la imagen centrada
        ctx.drawImage(
            iconImage, 
            this.position.x - this.radius, 
            this.position.y - this.radius, 
            this.radius * 2, 
            this.radius * 2
        );
    } else {
        // Fallback: Dibujar Emoji centrado (Para Magos, Pícaros, etc si no tienen SVG)
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; // Sombra suave para el texto
        ctx.font = `${this.radius * 1.2}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.icon, this.position.x, this.position.y + 1); // +1 offset visual
    }

    ctx.restore(); // Restaurar contexto (quitar clip)

    // 5. Borde (Dibujado después para que quede encima de la imagen recortada)
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.isSelected ? '#ffffff' : this.strokeColor; 
    ctx.stroke();

    // 6. Barras
    this.drawStatusBars(ctx);
  }

  private drawStatusBars(ctx: CanvasRenderingContext2D) {
    const barWidth = this.radius * 2;
    const barHeight = 4;
    const x = this.position.x - barWidth / 2;
    const yHealth = this.position.y - this.radius - 10;
    const yEnergy = yHealth + barHeight + 1;

    // BARRA DE CASTEO (NUEVO)
    if (this.isCasting) {
        const remaining = Math.max(0, this.castEndTime - performance.now());
        const progress = 1 - (remaining / this.castTotalTime);
        const yCast = yHealth - 6;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, yCast, barWidth, 4);
        
        ctx.fillStyle = '#22d3ee'; // Cyan para casteo
        ctx.fillRect(x, yCast, barWidth * progress, 4);
    }

    // BARRA DE SALUD
    ctx.fillStyle = '#374151';
    ctx.fillRect(x, yHealth, barWidth, barHeight);

    const healthPercent = Math.max(0, this.health / this.maxHealth);
    const healthWidth = barWidth * healthPercent;
    
    if (healthPercent > 0.5) ctx.fillStyle = '#22c55e';
    else if (healthPercent > 0.25) ctx.fillStyle = '#eab308';
    else ctx.fillStyle = '#ef4444';
    ctx.fillRect(x, yHealth, healthWidth, barHeight);

    // BARRA DE ENERGÍA
    ctx.fillStyle = '#374151';
    ctx.fillRect(x, yEnergy, barWidth, 2);

    const energyPercent = Math.max(0, this.energy / this.maxEnergy);
    const energyWidth = barWidth * energyPercent;
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x, yEnergy, energyWidth, 2);
  }
}

export class PlayerUnit extends Unit {
    constructor(id: number, x: number, y: number, stats: UnitStats, name: string, icon: string = "❓") {
        super(id, x, y, Team.PLAYER, stats, name, icon);
    }
}

export class EnemyUnit extends Unit {
    constructor(id: number, x: number, y: number, stats: UnitStats, name: string, icon: string = "💀") {
        super(id, x, y, Team.ENEMY, stats, name, icon);
    }
}