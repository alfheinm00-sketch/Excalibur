/**
 * Definición de las estadísticas base de una unidad.
 */
export interface UnitStats {
  // Atributos Base (Stats Primarios)
  strength: number;      // Fuerza
  constitution: number;  // Constitución
  willpower: number;     // Voluntad
  agility: number;       // Agilidad
  dexterity: number;     // Destreza
  intelligence: number;  // Inteligencia

  maxHealth: number;
  maxEnergy: number; // Recurso para habilidades futuras
  
  physicalDamage: number; // Antes 'damage'
  magicDamage: number;    // NUEVO: Daño mágico
  
  attackCooldown: number; // ms
  range: number;
  
  armor: number; // Reducción de daño plano (Solo físico)
  magicResist: number; // NUEVO: Reducción de daño plano (Solo mágico)
  
  healthRegen: number; // Vida por segundo
  energyRegen: number; // Energía por segundo
  
  criticalChance: number; // 0.0 a 1.0 (0% a 100%)
  criticalMultiplier: number; // NUEVO: Multiplicador de daño crítico (ej: 1.5 para 150%)
  evasionChance: number; // 0.0 a 1.0 (0% a 100%)

  aggroRange: number;
  radius: number;
  velocity: number;
  color: string;
  strokeColor: string;
}

/**
 * Identificadores únicos para los tipos de unidades
 */
export enum UnitId {
  WARRIOR = 'WARRIOR',
  SLIME = 'SLIME',
  PRIEST = 'PRIEST',
  MAGE = 'MAGE',
  ROGUE = 'ROGUE',
  BARBARIAN = 'BARBARIAN'
}