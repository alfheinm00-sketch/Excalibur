import { PlayerUnit } from '../Unit';
import { getWeapon } from '../../data/Weapons';
import { getSkill } from '../../data/Skills';

export class Mage extends PlayerUnit {
  constructor(id: number, x: number, y: number, name: string) {
    super(id, x, y, {
      strength: 0,
      constitution: 10,
      willpower: 5,
      agility: 5,
      dexterity: 5,
      intelligence: 25,

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
      color: '#3b82f6', 
      strokeColor: '#1e3a8a'
    }, name, 'class_mage');

    // Equipar Arma Inicial
    this.equipment.rightHand = getWeapon('crystal_staff');

    // Aplicar stats del arma
    this.recalculateStats();

    // HABILIDADES
    const missileSkill = getSkill('mage_magic_missile');
    if (missileSkill) this.skills.push(missileSkill);
  }
}