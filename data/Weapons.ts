import { Item, ItemType } from './ItemTypes';

/**
 * Registro maestro de todas las armas del juego.
 */
export const WEAPON_DB: Record<string, Item> = {
  'rusty_sword': {
    id: 'rusty_sword',
    name: 'Espada Oxidada',
    description: 'Una vieja espada. Pesada pero afilada.',
    icon: '🗡️',
    type: ItemType.WEAPON,
    validSlots: ['hand'],
    weaponStats: {
      physicalDamage: 15,
      magicDamage: 0,
      range: 20, // Rango corto melee
      cooldownModifier: 400 // Lenta (+0.4s)
    }
  },
  'rusty_dagger': {
    id: 'rusty_dagger',
    name: 'Daga Oxidada',
    description: 'Pequeña y oxidada. Ligera pero letal en las manos correctas.',
    icon: '🔪',
    type: ItemType.WEAPON,
    validSlots: ['hand'],
    weaponStats: {
      physicalDamage: 10,
      magicDamage: 0,
      range: 20, 
      cooldownModifier: 100, // +0.1s
      isSubtle: true // NUEVO: Rasgo Sutil
    }
  },
  'copper_staff': {
    id: 'copper_staff',
    name: 'Báculo de Cobre',
    description: 'Canaliza energía mágica. Su daño es puramente mágico.',
    icon: '🥢',
    type: ItemType.WEAPON,
    validSlots: ['hand'],
    weaponStats: {
      physicalDamage: 0,
      magicDamage: 12, // Ahora es daño mágico
      range: 150, // Rango largo
      cooldownModifier: 500, // Lenta (+0.5s)
      isHealer: true
    }
  },
  'crystal_staff': {
    id: 'crystal_staff',
    name: 'Báculo de Cristal',
    description: 'Báculo pesado que concentra gran poder arcano.',
    icon: '🔮',
    type: ItemType.WEAPON,
    validSlots: ['hand'],
    weaponStats: {
      physicalDamage: 2,
      magicDamage: 25, // Alto daño mágico
      range: 200, // Muy largo alcance
      cooldownModifier: 800, // Ataques lentos (+0.8s)
      isHealer: false
    }
  },
  // Ejemplo de un arma futura para pruebas
  'iron_axe': {
    id: 'iron_axe',
    name: 'Hacha de Hierro',
    description: 'Brutal pero lenta. Ignora un poco de armadura (no implementado aún).',
    icon: '🪓',
    type: ItemType.WEAPON,
    validSlots: ['hand'],
    weaponStats: {
      physicalDamage: 25,
      magicDamage: 0,
      range: 20,
      cooldownModifier: 800 // Muy lenta (+0.8s)
    }
  },
  'great_axe': {
    id: 'great_axe',
    name: 'Gran Hacha',
    description: 'Arma pesada para bárbaros. Gran daño pero lenta.',
    icon: '🪓',
    type: ItemType.WEAPON,
    validSlots: ['hand'],
    weaponStats: {
      physicalDamage: 20,
      magicDamage: 0,
      range: 20,
      cooldownModifier: 1000, // +1s
      hasSplash: true // NUEVO: Rasgo Splash
    }
  },
  'swift_dagger': {
    id: 'swift_dagger',
    name: 'Daga Veloz',
    description: 'Ligera y rápida, ideal para críticos.',
    icon: '🗡',
    type: ItemType.WEAPON,
    validSlots: ['hand'],
    weaponStats: {
      physicalDamage: 8,
      magicDamage: 0,
      range: 20,
      cooldownModifier: -200 // Rápida (-0.2s)
    }
  }
};

/**
 * Obtiene una COPIA de un arma por su ID.
 * Usamos una copia para evitar mutar la definición base si modificamos el objeto en el juego.
 */
export const getWeapon = (id: string): Item | null => {
  const weapon = WEAPON_DB[id];
  if (!weapon) {
    console.warn(`Weapon ID not found: ${id}`);
    return null;
  }
  // Deep copy simple para asegurar que no hay referencias compartidas
  return JSON.parse(JSON.stringify(weapon));
};