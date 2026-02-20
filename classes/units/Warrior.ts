import { PlayerUnit } from '../Unit';
import { getWeapon } from '../../data/Weapons';
import { getSkill } from '../../data/Skills';

export class Warrior extends PlayerUnit {
  constructor(id: number, x: number, y: number, name: string) {
    super(id, x, y, {
      strength: 15,
      constitution: 20,
      willpower: 5,
      agility: 0,
      dexterity: 4,
      intelligence: 6,

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
      radius: 30,
      velocity: 1,
      color: '#f97316', 
      strokeColor: '#c2410c'
    }, name, 'class_warrior'); // <--- USAR EL SVG AQUÍ

    // Equipar Arma Inicial desde la BD
    this.equipment.rightHand = getWeapon('rusty_sword');

    // Aplicar stats del arma
    this.recalculateStats();

    // HABILIDADES
    const shieldSkill = getSkill('warrior_shield');
    if (shieldSkill) this.skills.push(shieldSkill);
  }
}