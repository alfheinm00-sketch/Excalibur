import { Unit } from '../classes/Unit';

export interface Modifier {
  id: string;
  stat: 'armor' | 'magicResist' | 'physicalDamage' | 'magicDamage' | 'speed' | 'healthRegen' | 'criticalChance' | 'criticalMultiplier' | 'evasionChance' | 'range'; // Actualizado con range
  value: number; // Valor a sumar
  duration: number; // Duración total en ms
  timeRemaining: number; // Tiempo restante en ms
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
  
  energyCost: number;
  cooldown: number; // ms
  lastUsed: number; // timestamp
  
  // Nuevas propiedades para canalización y rango
  castTime?: number; // Tiempo de lanzamiento en ms (si es 0 o undefined, es instantáneo)
  range?: number;    // Rango máximo de lanzamiento (opcional)

  isAutoCast: boolean; // NUEVO: Estado de lanzamiento automático
  
  // Función que ejecuta la lógica de la habilidad
  effect: (user: Unit, allUnits: Unit[]) => void;
}