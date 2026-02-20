import { PlayerUnit } from '../Unit';
import { getWeapon } from '../../data/Weapons';
import { getSkill } from '../../data/Skills';

export class Barbarian extends PlayerUnit {
  constructor(id: number, x: number, y: number, name: string) {
    super(id, x, y, {
      strength: 20,
      constitution: 19,
      willpower: 5,
      agility: 0,
      dexterity: 5,
      intelligence: 1,

      maxHealth: 0,
      maxEnergy: 0,
      physicalDamage: 0, 
      magicDamage: 0,     
      attackCooldown: 1000, 
      range: 20, 
      armor: 0, 
      magicResist: 0, 
      healthRegen: 0,
      energyRegen: 0, 
      criticalChance: 0,
      criticalMultiplier: 1.5, 
      evasionChance: 0,
      aggroRange: 10000, 
      radius: 30, // Un poco más grande
      velocity: 1,
      color: '#b91c1c', // Rojo oscuro
      strokeColor: '#7f1d1d'
    }, name, 'class_barbarian'); // Asumimos que existe o usará fallback

    // Equipar Arma Inicial
    this.equipment.rightHand = getWeapon('great_axe');

    // Aplicar stats del arma
    this.recalculateStats();

    // HABILIDADES
    const rageSkill = getSkill('barbarian_rage');
    if (rageSkill) this.skills.push(rageSkill);
  }
}
