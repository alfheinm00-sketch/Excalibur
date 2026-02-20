import { Unit, UnitState } from '../classes/Unit';
import { CombatSystem } from './Combat';
import { distance } from '../utils/math';
import { Team } from '../types';

/**
 * Controlador de la Máquina de Estados Finita (FSM) para las unidades.
 * Maneja el comportamiento autónomo de Héroes y Enemigos.
 */
export const UnitStateController = {
  
  /**
   * Actualiza el estado de una unidad en el frame actual.
   */
  update: (unit: Unit, allUnits: Unit[], currentTime: number) => {
    // Si la unidad está muerta, no procesamos estados
    if (unit.health <= 0) return;

    // OVERRIDE: Si el jugador ordenó moverse manualmente a un punto (click suelo),
    // y la unidad no tiene targetUnit, forzamos estado MOVING hacia ese punto.
    if (unit.target && !unit.targetUnit && unit.state !== UnitState.MOVING) {
        unit.state = UnitState.MOVING;
    }

    switch (unit.state) {
        case UnitState.IDLE:
            UnitStateController.handleIdle(unit, allUnits, currentTime);
            break;
        case UnitState.MOVING:
            UnitStateController.handleMoving(unit, allUnits);
            break;
        case UnitState.ATTACKING:
            UnitStateController.handleAttacking(unit, allUnits, currentTime);
            break;
    }
  },

  /**
   * Lógica del Estado IDLE (Buscando)
   */
  handleIdle: (unit: Unit, allUnits: Unit[], currentTime: number) => {
      // 1. Limpieza preventiva
      if (unit.targetUnit && unit.targetUnit.health <= 0) {
          unit.targetUnit = null;
      }

      // 2. Si ya tiene un objetivo válido asignado (ej: click derecho o aggro previo), cambiar a MOVING
      if (unit.targetUnit) {
          unit.state = UnitState.MOVING;
          return;
      }

      // 3. BÚSQUEDA DE OBJETIVO
      
      // HÉROES: IA diferenciada (Sanador vs DPS/Tanque)
      if (unit.team === Team.PLAYER) {
          // Si tiene una orden de movimiento manual (target vector), ignoramos búsqueda automática hasta llegar
          // EXCEPCIÓN: Si es Attack Move, permitimos buscar aunque tenga target
          if (unit.target && !unit.isAttackMoving) return; 

          // Si está en Hold Position, NO busca proactivamente para perseguir
          if (unit.isHoldingPosition) {
              // Verificar si hay alguien en RANGO DE ATAQUE (no aggro range) para disparar sin moverse
              const enemyInRange = allUnits.find(u => 
                  u.team !== unit.team && 
                  u.health > 0 && 
                  distance(unit.position, u.position) <= unit.attackRange
              );
              
              if (enemyInRange) {
                  unit.setAttackTarget(enemyInRange);
                  // IMPORTANTE: Al atacar, perdemos el Hold Position estricto en este sistema simple.
                  // Pero es aceptable: "Hold until enemy in range".
                  return;
              }
              return;
          }

          // Detectar Rol de Sanador
          const weapon = unit.equipment.rightHand;
          const isHealer = weapon?.weaponStats?.isHealer;

          if (isHealer) {
              // --- IA SANADOR: Buscar aliados heridos ---
              const lowestHealthAlly = CombatSystem.findLowestHealthAlly(unit, allUnits, unit.aggroRange);
              if (lowestHealthAlly) {
                  unit.setAttackTarget(lowestHealthAlly);
              }
          } else {
              // --- IA COMBATIENTE: Buscar enemigos ---
              const nearestEnemy = CombatSystem.findNearestEnemy(unit, allUnits, unit.aggroRange);
              if (nearestEnemy) {
                  unit.setAttackTarget(nearestEnemy); 
              }
          }
      } 
      
      // ENEMIGOS: Usan ThreatMap
      else if (unit.team === Team.ENEMY) {
          if (unit.targetUnit) {
              unit.state = UnitState.MOVING;
          }
      }
  },

  /**
   * Lógica del Estado MOVING (Persiguiendo)
   */
  handleMoving: (unit: Unit, allUnits: Unit[]) => {
      // Caso A: Movimiento a punto (Click suelo)
      if (unit.target && !unit.targetUnit) {
          // LÓGICA ATTACK MOVE: Buscar enemigos mientras se mueve
          if (unit.isAttackMoving && unit.team === Team.PLAYER) {
              const nearestEnemy = CombatSystem.findNearestEnemy(unit, allUnits, unit.aggroRange);
              if (nearestEnemy) {
                  unit.setAttackTarget(nearestEnemy);
                  // Esto cambia targetUnit y mantiene state MOVING, pero ahora perseguirá al enemigo
                  return;
              }
          }

          // La lógica física ya está en MovementSystem.
          // Solo verificamos si llegó para volver a IDLE.
          const dist = distance(unit.position, unit.target);
          if (dist < unit.velocity) {
              unit.stop(); // Esto resetea isAttackMoving también
              unit.state = UnitState.IDLE;
          }
          return;
      }

      // Caso B: Persecución de Unidad
      if (unit.targetUnit) {
          // 1. Verificar validez del objetivo
          if (unit.targetUnit.health <= 0) {
              unit.targetUnit = null;
              unit.stop();
              unit.state = UnitState.IDLE;
              return;
          }

          // 2. Calcular distancias
          const dist = distance(unit.position, unit.targetUnit.position);
          const effectiveRange = unit.attackRange + unit.targetUnit.radius + unit.radius;

          // 3. Verificar si estamos en rango de ataque/curación
          if (dist <= effectiveRange) {
              unit.stop(); // Detener movimiento físico
              unit.state = UnitState.ATTACKING;
          } else {
              // Seguir moviéndose hacia la posición actual del objetivo
              unit.target = { 
                  x: unit.targetUnit.position.x, 
                  y: unit.targetUnit.position.y 
              };
          }
      } else {
          // Estado inconsistente (MOVING sin destino), volver a IDLE
          unit.state = UnitState.IDLE;
      }
  },

  /**
   * Lógica del Estado ATTACKING (Combate)
   */
  handleAttacking: (unit: Unit, allUnits: Unit[], currentTime: number) => {
      // 1. Verificar validez del objetivo
      if (!unit.targetUnit || unit.targetUnit.health <= 0) {
          unit.targetUnit = null;
          unit.state = UnitState.IDLE;
          return;
      }

      // 1.b. Verificar si es Sanador y el objetivo ya está lleno de vida
      const weapon = unit.equipment.rightHand;
      const isHealer = weapon?.weaponStats?.isHealer;
      if (isHealer && unit.targetUnit.health >= unit.targetUnit.maxHealth) {
          // Objetivo sano, dejar de curar y volver a IDLE para buscar otro
          unit.targetUnit = null;
          unit.state = UnitState.IDLE;
          return;
      }

      // 2. Verificar si el objetivo se salió de rango
      const dist = distance(unit.position, unit.targetUnit.position);
      const effectiveRange = unit.attackRange + unit.targetUnit.radius + unit.radius;
      // Añadimos un pequeño margen (buffer) para evitar oscilación (jitter) justo en el borde del rango
      const rangeBuffer = 5; 

      if (dist > effectiveRange + rangeBuffer) {
          unit.state = UnitState.MOVING;
          return;
      }

      // 3. Ejecutar Ataque (si el cooldown lo permite)
      if (currentTime - unit.lastAttackTime >= unit.attackCooldown) {
          // Lógica especial para Sanadores (verificar si es aliado o enemigo para atacar/curar)
          const isAlly = unit.team === unit.targetUnit.team;
          const canHeal = weapon?.weaponStats?.isHealer;

          if (!isAlly || (isAlly && canHeal)) {
             // Mirar hacia el objetivo (opcional si tuviéramos rotación)
             CombatSystem.attack(unit, unit.targetUnit, allUnits, currentTime);
          } else {
             // Si es aliado y no puedo curar, es un error de estado -> IDLE
             unit.targetUnit = null;
             unit.state = UnitState.IDLE;
          }
      }
  }
};