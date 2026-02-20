
export interface WeaponStats {
  physicalDamage: number; // Antes damage
  magicDamage: number;    // Nuevo
  range: number;
  cooldownModifier: number; // Penalización o bonificación en ms (ej: +400)
  isHealer?: boolean; // Si true, puede atacar aliados para curar
  isSubtle?: boolean; // NUEVO: Rasgo "Sutil" (escala con Destreza)
  hasSplash?: boolean; // NUEVO: Rasgo "Splash" (daño en área cada 5 ataques)
}

export interface ConsumableStats {
  stat: 'healthRegen' | 'armor' | 'magicResist' | 'physicalDamage' | 'magicDamage' | 'speed';
  value: number;
  duration: number; // ms
}

export type EquipmentSlotType = 'head' | 'shirt' | 'pants' | 'boots' | 'necklace' | 'hand' | 'ring' | 'potion';

export interface Item {
  id: string;
  name: string;
  icon: string;
  type: ItemType;
  description: string;
  validSlots: EquipmentSlotType[]; // Array de ranuras donde este item encaja
  weaponStats?: WeaponStats; // Propiedad opcional para armas
  consumableStats?: ConsumableStats; // Propiedad opcional para pociones
}

export enum ItemType {
  WEAPON,
  ARMOR,
  ACCESSORY,
  CONSUMABLE,
  MATERIAL
}

export interface Equipment {
  head: Item | null;
  shirt: Item | null;
  pants: Item | null;
  boots: Item | null;
  necklace: Item | null;
  
  rightHand: Item | null;
  leftHand: Item | null;
  
  rings: (Item | null)[]; // Array de 5
  potions: (Item | null)[]; // Array de 5
}