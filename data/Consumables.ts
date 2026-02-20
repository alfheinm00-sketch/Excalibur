import { Item, ItemType } from './ItemTypes';

export const CONSUMABLE_DB: Record<string, Item> = {
  'health_potion': {
    id: 'health_potion',
    name: 'Poción de Vida',
    description: 'Aumenta la regeneración de vida en +10 durante 5 segundos.',
    icon: '🧪',
    type: ItemType.CONSUMABLE,
    validSlots: ['potion'],
    consumableStats: {
        stat: 'healthRegen',
        value: 10,
        duration: 5000 // 5 segundos
    }
  }
};

export const getConsumable = (id: string): Item | null => {
  const item = CONSUMABLE_DB[id];
  if (!item) {
    console.warn(`Consumable ID not found: ${id}`);
    return null;
  }
  return JSON.parse(JSON.stringify(item));
};