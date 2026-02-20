import { Unit } from '../classes/Unit';
import { Team } from '../types';
import { distance } from '../utils/math';
import { VisualEffectsSystem, TextType } from './VisualEffects';
import { UnitStateController } from './UnitStateController';

// --- CONFIGURACIÓN DE AMENAZA ---
const THREAT_DECAY_RATE = 5; // Amenaza perdida por segundo sin acción
const PROXIMITY_THREAT_FACTOR = 1000; // Factor de peso para la distancia
const THREAT_SWITCH_THRESHOLD = 1.2; // El nuevo objetivo debe tener un 20% más de amenaza para cambiar
const HEAL_THREAT_MULTIPLIER = 1.5; // Multiplicador de amenaza por curación

export const CombatSystem = {
  /**
   * Ciclo principal de actualización del juego.
   * Ahora DELEGA la lógica de comportamiento al UnitStateController.
   */
  update: (units: Unit[], currentTime: number) => {
    units.forEach(unit => {
        // 1. CRÍTICO: Actualizar Lógica de Amenaza CONSTANTE para enemigos
        if (unit.team === Team.ENEMY && unit.health > 0) {
            CombatSystem.updateTargetLogic(unit, units, currentTime);
        }

        // 2. Ejecutar la Máquina de Estados para cada unidad viva
        UnitStateController.update(unit, units, currentTime);

        // Limpieza de amenaza de objetivos muertos (Mantenimiento Global)
        if (unit.targetUnit && unit.targetUnit.health <= 0) {
            unit.threatMap.delete(unit.targetUnit.id);
        }
    });
  },

  /**
   * Encuentra el enemigo más cercano dentro de un rango.
   * Útil para la IA de los Héroes en estado IDLE.
   */
  findNearestEnemy: (me: Unit, allUnits: Unit[], rangeLimit: number): Unit | null => {
    let nearest: Unit | null = null;
    let minDist = rangeLimit;

    for (const other of allUnits) {
      if (other.id === me.id) continue;
      if (other.team === me.team) continue; // Solo enemigos
      if (other.health <= 0) continue; 

      const dist = distance(me.position, other.position);
      
      if (dist <= minDist) {
        minDist = dist;
        nearest = other;
      }
    }

    return nearest;
  },

  /**
   * Encuentra al aliado con menor porcentaje de vida dentro del rango.
   * Útil para la IA de Sanadores.
   */
  findLowestHealthAlly: (me: Unit, allUnits: Unit[], rangeLimit: number): Unit | null => {
    let target: Unit | null = null;
    let minPercent = 1.0; // 100%

    for (const other of allUnits) {
        if (other.team !== me.team) continue; // Solo Aliados
        if (other.health <= 0) continue;
        if (other.health >= other.maxHealth) continue; // Ignorar si está lleno de vida

        const dist = distance(me.position, other.position);
        if (dist > rangeLimit) continue;

        const pct = other.health / other.maxHealth;
        
        // Priorizar al que tenga menos porcentaje de vida
        if (pct < minPercent) {
            minPercent = pct;
            target = other;
        }
    }
    return target;
  },

  /**
   * Lógica avanzada de selección de objetivo.
   * Maneja tanto ThreatMap (Standard) como Proximidad Simple (Slimes).
   */
  updateTargetLogic: (me: Unit, allUnits: Unit[], currentTime: number) => {
      // 0. Aggro Pegajoso (Sticky Aggro)
      if (currentTime < me.busyUntil) return;

      // --- LÓGICA ESPECÍFICA PARA SLIMES (Proximidad Pura) ---
      // Usamos constructor.name para evitar imports circulares o instanceof fallando por versiones
      if (me.constructor.name === 'Slime') {
          const nearestHero = CombatSystem.findNearestEnemy(me, allUnits, me.aggroRange);
          
          // Si encontramos a alguien más cerca, cambiamos INMEDIATAMENTE
          if (nearestHero) {
              if (me.targetUnit?.id !== nearestHero.id) {
                  me.setAttackTarget(nearestHero);
              }
          }
          return; // Salimos, los Slimes no usan ThreatMap
      }

      // --- LÓGICA ESTÁNDAR (Threat Map) ---
      
      // 1. Decaimiento de Amenaza (Decay)
      if (Math.random() < 0.05) { 
          me.decayThreat(THREAT_DECAY_RATE);
      }

      // 2. Detectar nuevos objetivos potenciales
      allUnits.forEach(other => {
          if (other.team !== me.team && other.health > 0) {
              const dist = distance(me.position, other.position);
              if (dist <= me.aggroRange) {
                  // Si entra en rango y tiene 0 amenaza, le damos un mínimo
                  if (me.getThreat(other.id) === 0) {
                      me.addThreat(other.id, 1);
                  }
              }
          }
      });

      // 3. Evaluar el mapa de amenaza
      let bestTarget: Unit | null = null;
      let maxScore = -1;

      let currentTargetScore = -1;
      if (me.targetUnit) {
          currentTargetScore = CombatSystem.calculateThreatScore(me, me.targetUnit);
      }

      me.threatMap.forEach((storedThreat, unitId) => {
          const candidate = allUnits.find(u => u.id === unitId);
          // Limpieza de objetivos inválidos
          if (!candidate || candidate.health <= 0 || candidate.team === me.team) {
              me.threatMap.delete(unitId);
              return;
          }

          const dist = distance(me.position, candidate.position);
          if (dist > me.aggroRange * 1.5) return; // Ignorar si se alejó mucho

          const score = CombatSystem.calculateThreatScore(me, candidate);

          if (score > maxScore) {
              maxScore = score;
              bestTarget = candidate;
          }
      });

      // 4. Aplicar Cambio con Histéresis
      if (bestTarget) {
          if (!me.targetUnit) {
              me.setAttackTarget(bestTarget);
          } 
          else if (bestTarget.id !== me.targetUnit.id) {
              // Solo cambiar si el nuevo score supera el umbral (ej: 20% más)
              if (maxScore > currentTargetScore * THREAT_SWITCH_THRESHOLD) {
                  me.setAttackTarget(bestTarget);
              }
          }
      }
  },

  calculateThreatScore: (me: Unit, candidate: Unit): number => {
      const storedThreat = me.getThreat(candidate.id);
      const dist = distance(me.position, candidate.position);
      const proximityBonus = PROXIMITY_THREAT_FACTOR / Math.max(10, dist);
      return storedThreat + proximityBonus;
  },

  /**
   * Ejecuta la acción de ataque (Daño o Curación).
   * Llamada por UnitStateController en estado ATTACKING.
   */
  attack: (attacker: Unit, defender: Unit, allUnits: Unit[], time: number) => {
    attacker.lastAttackTime = time;
    
    // SIMULACIÓN DE ANIMACIÓN (Sticky Aggro)
    attacker.busyUntil = time + 500; 

    // Detectar si es curación
    const isAlly = attacker.team === defender.team;
    const weaponR = attacker.equipment.rightHand;
    const weaponL = attacker.equipment.leftHand;
    const isHealerWeapon = weaponR?.weaponStats?.isHealer || weaponL?.weaponStats?.isHealer;
    const isHealingShot = isAlly && isHealerWeapon;

    const resolveHit = () => {
        if (defender.health <= 0) return;

        if (isHealingShot) {
            // CURACIÓN
            const healAmount = attacker.physicalDamage + attacker.magicDamage; 
            defender.health = Math.min(defender.maxHealth, defender.health + healAmount);
            
            VisualEffectsSystem.spawnText(defender.position.x, defender.position.y, healAmount.toString(), TextType.HEAL);

            // Generar Amenaza de Curación
            allUnits.forEach(enemy => {
                if (enemy.team !== attacker.team && enemy.health > 0) {
                    const distToHealer = distance(enemy.position, attacker.position);
                    if (distToHealer <= enemy.aggroRange) {
                        const threatGen = healAmount * HEAL_THREAT_MULTIPLIER;
                        enemy.addThreat(attacker.id, threatGen);
                    }
                }
            });
            return;
        }

        // DAÑO
        if (Math.random() < defender.evasionChance) {
            VisualEffectsSystem.spawnText(defender.position.x, defender.position.y, "MISS", TextType.MISS);
            return;
        }

        let isCritical = false;
        // USAR EL MULTIPLICADOR DE LA UNIDAD
        const critMult = attacker.criticalMultiplier; 
        
        let pDmg = attacker.physicalDamage;
        let mDmg = attacker.magicDamage;

        if (Math.random() < attacker.criticalChance) {
            isCritical = true;
            pDmg *= critMult;
            mDmg *= critMult;
        }

        // --- CÁLCULO DE DAÑO CON ARMADURA Y RESISTENCIA MÁGICA ---
        const damageReductionPhysical = defender.armor;
        const damageReductionMagic = defender.magicResist; // NUEVO

        const finalPhysical = Math.max(0, pDmg - damageReductionPhysical);
        const finalMagic = Math.max(0, mDmg - damageReductionMagic); // NUEVO
        const totalDamage = Math.max(1, finalPhysical + finalMagic);

        defender.health -= totalDamage;
        
        // --- DETECCIÓN DE MUERTE (NUEVO) ---
        if (defender.health <= 0) {
            defender.onDeath(allUnits);
            // La eliminación real del array ocurre en GameCanvas loop
        } else {
            // Generar Amenaza de Daño (Solo si sigue vivo)
            if (defender.team === Team.ENEMY) {
                defender.addThreat(attacker.id, totalDamage);
                if (!defender.targetUnit) {
                    defender.setAttackTarget(attacker);
                }
            }
        }
        
        VisualEffectsSystem.spawnText(
            defender.position.x, 
            defender.position.y, 
            Math.round(totalDamage).toString(), 
            isCritical ? TextType.CRITICAL : TextType.NORMAL
        );
    };

    const isRanged = attacker.attackRange > 50;

    if (isRanged) {
        // Usar color de la unidad para ataques básicos
        VisualEffectsSystem.spawnProjectile(attacker.position, defender, attacker.color, resolveHit);
    } else {
        VisualEffectsSystem.spawnSlash(defender.position);
        resolveHit();

        // LÓGICA DE SPLASH (BÁRBARO)
        // Cada 5 ataques (usando un contador simple basado en el tiempo o un contador en la unidad si existiera)
        // Como no tenemos contador de ataques persistente, usaremos una probabilidad del 20% para simular "cada 5 ataques"
        // O mejor, añadimos una propiedad temporal a la unidad si queremos precisión, pero por ahora probabilidad.
        // REVISIÓN: El usuario pidió "cada 5 ataques". Vamos a añadir un contador a la unidad en tiempo de ejecución.
        // Como Unit.ts no tiene 'attackCount', lo inyectamos dinámicamente o usamos probabilidad alta.
        // Para cumplir estrictamente, deberíamos modificar Unit.ts, pero para ser menos invasivos, usaremos una probabilidad del 20%
        // que estadísticamente es 1 de cada 5.
        // CORRECCIÓN: El usuario fue específico. Vamos a añadir la propiedad a Unit.ts en el siguiente paso si es necesario,
        // pero por ahora usaremos (attacker as any).attackCount para no romper tipos sin editar Unit.ts masivamente.
        
        const hasSplash = weaponR?.weaponStats?.hasSplash || weaponL?.weaponStats?.hasSplash;

        if (hasSplash) {
            const unitAny = attacker as any;
            unitAny.attackCount = (unitAny.attackCount || 0) + 1;
            
            // Si acabamos de atacar y el contador es 4, el SIGUIENTE es el 5to (Splash)
            // Así que aplicamos el buff de rango AHORA para que el movimiento lo detecte
            if (unitAny.attackCount === 4) {
                attacker.addModifier({
                    id: 'buff_splash_range',
                    stat: 'range',
                    value: 20,
                    duration: 99999, // Indefinido hasta que ataque
                    timeRemaining: 99999
                });
                VisualEffectsSystem.spawnText(attacker.position.x, attacker.position.y, "¡Rango Up!", TextType.NORMAL);
            }

            if (unitAny.attackCount >= 5) {
                unitAny.attackCount = 0;
                
                // Consumir Buff de Rango
                attacker.removeModifier('buff_splash_range');

                // Ejecutar Splash
                VisualEffectsSystem.spawnText(attacker.position.x, attacker.position.y, "¡SPLASH!", TextType.CRITICAL);
                
                // Encontrar enemigos en cono/semicírculo hacia el objetivo
                // Vector dirección
                const dx = defender.position.x - attacker.position.x;
                const dy = defender.position.y - attacker.position.y;
                const angleToTarget = Math.atan2(dy, dx);
                
                // Calcular radio efectivo del splash (Rango + Radio Atacante + Margen)
                const splashRadius = attacker.attackRange + attacker.radius + 40;

                // EFECTO VISUAL DE CLEAVE
                VisualEffectsSystem.spawnCleave(attacker.position, angleToTarget, splashRadius, '#ef4444');

                allUnits.forEach(u => {
                    if (u.id === attacker.id || u.id === defender.id) return; // No al atacante ni al objetivo principal (ya golpeado)
                    if (u.team === attacker.team) return; // No fuego amigo
                    if (u.health <= 0) return;

                    const dist = distance(attacker.position, u.position);
                    
                    // Usar el nuevo radio calculado
                    if (dist <= splashRadius) { 
                        const uDx = u.position.x - attacker.position.x;
                        const uDy = u.position.y - attacker.position.y;
                        const angleToU = Math.atan2(uDy, uDx);
                        
                        // Diferencia angular
                        let angleDiff = angleToU - angleToTarget;
                        // Normalizar a -PI a PI
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                        
                        // Semicírculo (90 grados a cada lado = PI/2)
                        if (Math.abs(angleDiff) <= Math.PI / 2) {
                            // Aplicar daño de área (50% del daño normal)
                            const splashDmg = Math.max(1, (attacker.physicalDamage * 0.5) - u.armor);
                            u.health -= splashDmg;
                            VisualEffectsSystem.spawnText(u.position.x, u.position.y, Math.round(splashDmg).toString(), TextType.NORMAL);
                            if (u.health <= 0) u.onDeath(allUnits);
                        }
                    }
                });
            }
        }
    }
  }
};