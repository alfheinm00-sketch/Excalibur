import { PlayerUnit } from '../Unit';
import { getWeapon } from '../../data/Weapons';
import { getSkill } from '../../data/Skills';

export class Rogue extends PlayerUnit {
  constructor(id: number, x: number, y: number, name: string) {
    super(id, x, y, {
      strength: 5,
      constitution: 10,
      willpower: 2,
      agility: 10,
      dexterity: 15,
      intelligence: 8,

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
      color: '#2dd4bf', 
      strokeColor: '#0f766e'
    }, name, 'class_rogue');

    // Equipar DOBLE DAGA
    this.equipment.rightHand = getWeapon('rusty_dagger');
    this.equipment.leftHand = getWeapon('rusty_dagger');

    // Aplicar stats (esto sumará daño y cooldown de ambas dagas)
    this.recalculateStats();

    // HABILIDADES
    const deceptionSkill = getSkill('rogue_deception');
    if (deceptionSkill) this.skills.push(deceptionSkill);
  }
}