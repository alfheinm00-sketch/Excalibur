import { PlayerUnit } from '../Unit';
import { getWeapon } from '../../data/Weapons';
import { getSkill } from '../../data/Skills';

export class Priest extends PlayerUnit {
  constructor(id: number, x: number, y: number, name: string) {
    super(id, x, y, {
      strength: 0,
      constitution: 15,
      willpower: 10,
      agility: 5,
      dexterity: 0,
      intelligence: 20,

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
      radius: 28,
      velocity: 1,
      color: '#facc15', 
      strokeColor: '#a16207'
    }, name, 'class_priest');

    // Equipar Arma Inicial desde la BD
    this.equipment.rightHand = getWeapon('copper_staff');

    // Aplicar stats del arma
    this.recalculateStats();

    // HABILIDADES
    const healSkill = getSkill('priest_heal');
    if (healSkill) this.skills.push(healSkill);
  }
}