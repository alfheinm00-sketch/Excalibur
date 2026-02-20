import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { CharacterSelection } from './components/CharacterSelection';
import { Unit } from './classes/Unit';
import { Warrior } from './classes/units/Warrior';
import { Priest } from './classes/units/Priest';
import { Mage } from './classes/units/Mage'; 
import { Rogue } from './classes/units/Rogue'; // Importar Pícaro
import { Barbarian } from './classes/units/Barbarian'; // Importar Bárbaro
import { UnitId } from './data/UnitTypes';
import { Item } from './data/ItemTypes';
import { getConsumable } from './data/Consumables';

type GameState = 'MENU' | 'CHARACTER_SELECT' | 'PLAYING';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('MENU');
  
  // Estado elevado: Las unidades persisten entre el menú de selección y el juego
  const [playerUnits, setPlayerUnits] = useState<Unit[]>([]);
  const [nextId, setNextId] = useState(1);

  // Estado del Inventario Global (30 huecos)
  const [globalInventory, setGlobalInventory] = useState<(Item | null)[]>(new Array(30).fill(null));

  // Inicializar inventario de prueba (Solo una vez)
  useEffect(() => {
    const startInv = new Array(30).fill(null);
    startInv[0] = getConsumable('health_potion');
    startInv[1] = getConsumable('health_potion');
    startInv[2] = getConsumable('health_potion');
    setGlobalInventory(startInv);
  }, []);

  // ECONOMÍA
  const [gold, setGold] = useState(500); 
  const [essence, setEssence] = useState(500); // NUEVO: Fragmentos de Esencia

  const handleAddUnit = (type: UnitId, name: string) => {
    const COST = 100;
    if (gold < COST) return;

    setGold(prev => prev - COST);

    const x = 200;
    const y = 300;
    
    let newUnit: Unit;

    if (type === UnitId.PRIEST) {
        newUnit = new Priest(nextId, x, y, name);
    } else if (type === UnitId.MAGE) {
        newUnit = new Mage(nextId, x, y, name);
    } else if (type === UnitId.ROGUE) {
        newUnit = new Rogue(nextId, x, y, name);
    } else if (type === UnitId.BARBARIAN) {
        newUnit = new Barbarian(nextId, x, y, name);
    } else {
        newUnit = new Warrior(nextId, x, y, name);
    }
    
    setPlayerUnits(prev => [...prev, newUnit]);
    setNextId(prev => prev + 1);
  };

  const handleUpdateUnit = (updatedUnit: Unit) => {
    setPlayerUnits(prev => prev.map(u => u.id === updatedUnit.id ? updatedUnit : u));
  };

  const handleUpdateInventory = (newInventory: (Item | null)[]) => {
    setGlobalInventory(newInventory);
  };

  // --- LOGICA DEL JUEGO ---

  // Muerte Permanente: Si una unidad muere en el Canvas, se elimina de aquí
  const handleUnitDeath = (unitId: number) => {
    setPlayerUnits(prev => prev.filter(u => u.id !== unitId));
  };

  // Fin del Nivel: Victoria
  const handleLevelVictory = (rewardGold: number) => {
    setGold(prev => prev + rewardGold);
    setGameState('CHARACTER_SELECT'); // Volver a gestión
  };

  // Fin del Nivel: Derrota / Retirada
  const handleLevelExit = () => {
    setGameState('CHARACTER_SELECT');
  };

  return (
    <div className="relative w-screen h-screen bg-gray-900 overflow-hidden select-none font-sans">
      
      {gameState === 'MENU' && (
        <MainMenu onStart={() => setGameState('CHARACTER_SELECT')} />
      )}

      {gameState === 'CHARACTER_SELECT' && (
        <CharacterSelection 
            units={playerUnits} 
            inventory={globalInventory}
            gold={gold} 
            essence={essence}
            onAddUnit={handleAddUnit}
            onUpdateUnit={handleUpdateUnit} 
            onUpdateInventory={handleUpdateInventory} 
            onUpdateEssence={setEssence}
            onStartCombat={() => setGameState('PLAYING')}
            onBack={() => setGameState('MENU')}
        />
      )}

      {gameState === 'PLAYING' && (
        <div className="absolute inset-0 z-0 animate-fade-in">
          <GameCanvas 
            initialPlayerUnits={playerUnits}
            onUnitDeath={handleUnitDeath}
            onVictory={handleLevelVictory}
            onExit={handleLevelExit}
            onEssenceCollected={(amount) => setEssence(prev => prev + amount)} // NUEVO
          />
        </div>
      )}

    </div>
  );
}