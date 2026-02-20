import { Skill } from './SkillTypes';
import { Unit } from '../classes/Unit';
import { Team } from '../types';
import { VisualEffectsSystem, TextType } from '../modules/VisualEffects';
import { distance } from '../utils/math';

/**
 * Registro maestro de todas las habilidades del juego.
 */
export const SKILL_DB: Record<string, Skill> = {
  'warrior_shield': {
    id: 'warrior_shield',
    name: 'Escudarse',
    description: 'Duplica la armadura durante 10 segundos.',
    icon: '🛡️',
    level: 1,
    energyCost: 30,
    cooldown: 20000, // 20s
    lastUsed: -99999, // Disponible al inicio
    isAutoCast: false,
    effect: (user: Unit, _allUnits: Unit[]) => {
        user.addModifier({
            id: 'buff_shield_up',
            stat: 'armor',
            value: 5, 
            duration: 10000,
            timeRemaining: 10000
        });

        VisualEffectsSystem.spawnText(user.position.x, user.position.y, "¡ESCUDO!", TextType.NORMAL);
    }
  },
  'priest_heal': {
    id: 'priest_heal',
    name: 'Plegaria',
    description: 'Sana 20 HP al aliado con menos salud.',
    icon: '✨',
    level: 1,
    energyCost: 100,
    cooldown: 20000,
    lastUsed: -99999,
    isAutoCast: false,
    effect: (user: Unit, allUnits: Unit[]) => {
        // Buscar aliado con menos % de vida
        let target: Unit | null = null;
        let minPercent = 1.0;

        allUnits.forEach(u => {
            // Filtramos por equipo del lanzador para que sea genérico (aliados del caster)
            if (u.team === user.team && u.health > 0) {
                const pct = u.health / u.maxHealth;
                if (pct < minPercent) {
                    minPercent = pct;
                    target = u;
                }
            }
        });

        // Si todos están al 100%, curarse a sí mismo o al más cercano
        if (!target) target = user;

        // Aplicar cura
        const healAmount = 20;
        target.health = Math.min(target.maxHealth, target.health + healAmount);
        
        VisualEffectsSystem.spawnText(target.position.x, target.position.y, healAmount.toString(), TextType.HEAL);
        // Efecto visual en el lanzador también
        VisualEffectsSystem.spawnText(user.position.x, user.position.y, "¡SANACIÓN!", TextType.NORMAL);
    }
  },
  'mage_magic_missile': {
    id: 'mage_magic_missile',
    name: 'Misil Arcano',
    description: 'Canaliza durante 3s para lanzar 3 proyectiles devastadores (Rango 300).',
    icon: '🎆',
    level: 1,
    energyCost: 40,
    cooldown: 5000, // 5s
    lastUsed: -99999,
    castTime: 3000, // 3 segundos de canalización estática
    range: 300,     // Rango máximo restringido
    isAutoCast: false,
    effect: (user: Unit, allUnits: Unit[]) => {
        // 1. Filtrar Enemigos Vivos dentro del RANGO
        const enemies = allUnits.filter(u => {
            if (u.team === user.team || u.health <= 0) return false;
            return distance(user.position, u.position) <= 300; // Respetar rango estricto
        });

        // 2. Si no hay enemigos cerca tras el casteo
        if (enemies.length === 0) {
             VisualEffectsSystem.spawnText(user.position.x, user.position.y, "Sin Objetivos", TextType.MISS);
             return;
        }

        // 3. Ordenar por distancia (Los más cercanos primero)
        enemies.sort((a, b) => distance(user.position, a.position) - distance(user.position, b.position));

        // 4. Seleccionar hasta 3 objetivos DIFERENTES
        const targets = enemies.slice(0, 3);

        VisualEffectsSystem.spawnText(user.position.x, user.position.y, "¡RÁFAGA!", TextType.NORMAL);
        const projectileColor = '#00f3ff'; // Azul Neón

        // 5. Disparar con ligero retraso entre cada uno (efecto ráfaga)
        targets.forEach((target, index) => {
            setTimeout(() => {
                // Verificar si el objetivo sigue vivo antes de disparar
                if (target.health > 0) {
                    VisualEffectsSystem.spawnProjectile(user.position, target, projectileColor, () => {
                         if (target.health > 0) {
                             const dmg = Math.floor(user.magicDamage * 1.5); // Daño aumentado por el casteo
                             target.health -= dmg;
                             target.addThreat(user.id, dmg);
                             VisualEffectsSystem.spawnText(target.position.x, target.position.y, dmg.toString(), TextType.CRITICAL);
                             if (target.health <= 0) target.onDeath(allUnits);
                         }
                    });
                }
            }, index * 150); // 150ms de separación entre disparos
        });
    }
  },
  'rogue_deception': {
    id: 'rogue_deception',
    name: 'Engaño',
    description: '+30% Evasión y +20% Crítico durante 10s.',
    icon: '🎭',
    level: 1,
    energyCost: 35,
    cooldown: 15000, // 15s
    lastUsed: -99999,
    isAutoCast: false,
    effect: (user: Unit) => {
        // Evasión
        user.addModifier({
            id: 'buff_deception_evasion',
            stat: 'evasionChance',
            value: 0.30, 
            duration: 10000,
            timeRemaining: 10000
        });
        
        // Crítico
        user.addModifier({
            id: 'buff_deception_crit',
            stat: 'criticalChance',
            value: 0.20, 
            duration: 10000,
            timeRemaining: 10000
        });

        VisualEffectsSystem.spawnText(user.position.x, user.position.y, "¡HUMO!", TextType.NORMAL);
    }
  },
  'barbarian_rage': {
    id: 'barbarian_rage',
    name: 'Ira',
    description: 'x1.5 Daño Físico, +5 Regen Vida, +5 Res. Mágica por 15s.',
    icon: '😡',
    level: 1,
    energyCost: 5,
    cooldown: 40000, // 40s
    lastUsed: -99999,
    isAutoCast: false,
    effect: (user: Unit) => {
        // Daño Físico x1.5 (Aproximación: +50% del daño actual como bono plano)
        // Nota: Como los modificadores se suman, esto es un buff plano.
        // Para hacerlo multiplicativo real, necesitaríamos un sistema de stats más complejo.
        // Por ahora, sumaremos el 50% del daño físico BASE actual como bono.
        const damageBonus = user.physicalDamage * 0.5;

        user.addModifier({
            id: 'buff_rage_dmg',
            stat: 'physicalDamage',
            value: damageBonus,
            duration: 15000,
            timeRemaining: 15000
        });

        // Regen Vida +5
        user.addModifier({
            id: 'buff_rage_regen',
            stat: 'healthRegen',
            value: 5,
            duration: 15000,
            timeRemaining: 15000
        });

        // Resistencia Mágica +5
        user.addModifier({
            id: 'buff_rage_mres',
            stat: 'magicResist',
            value: 5,
            duration: 15000,
            timeRemaining: 15000
        });

        VisualEffectsSystem.spawnText(user.position.x, user.position.y, "¡IRA!", TextType.CRITICAL);
    }
  },
  // Habilidad genérica de ejemplo
  'dash': {
    id: 'dash',
    name: 'Impulso',
    description: 'Aumenta la velocidad drásticamente por 3 segundos.',
    icon: '👟',
    level: 1,
    energyCost: 15,
    cooldown: 8000,
    lastUsed: -99999,
    isAutoCast: false,
    effect: (user: Unit) => {
        user.addModifier({
            id: 'buff_speed',
            stat: 'speed',
            value: 2, // +2 velocidad
            duration: 3000,
            timeRemaining: 3000
        });
        VisualEffectsSystem.spawnText(user.position.x, user.position.y, "¡VELOCIDAD!", TextType.NORMAL);
    }
  }
};

/**
 * Obtiene una instancia de habilidad lista para usarse.
 * IMPORTANTE: Usamos spread operator {...} para crear una copia superficial.
 * Esto mantiene la referencia a la función 'effect' (que no se puede clonar con JSON)
 * pero crea un nuevo objeto para que 'lastUsed' sea independiente por unidad.
 */
export const getSkill = (id: string): Skill | null => {
  const skill = SKILL_DB[id];
  if (!skill) {
    console.warn(`Skill ID not found: ${id}`);
    return null;
  }
  
  // Retornamos una copia nueva para que el estado (lastUsed) sea independiente
  return { ...skill, isAutoCast: false };
};