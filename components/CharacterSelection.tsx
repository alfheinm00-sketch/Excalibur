import React, { useState } from 'react';
import { Unit } from '../classes/Unit';
import { UnitId } from '../data/UnitTypes';
import { CharacterInspector } from './CharacterInspector'; 
import { InventoryModal } from './InventoryModal'; 
import { SanctuaryPanel } from './SanctuaryPanel'; // NUEVO
import { Item } from '../data/ItemTypes';
import { GameIcon } from '../data/Icons'; // NUEVO

interface CharacterSelectionProps {
  units: Unit[];
  inventory: (Item | null)[];
  gold: number; 
  essence: number; // NUEVO
  onAddUnit: (type: UnitId, name: string) => void;
  onUpdateUnit: (unit: Unit) => void; 
  onUpdateInventory: (inv: (Item | null)[]) => void; 
  onUpdateEssence: (newEssence: number) => void; // NUEVO
  onStartCombat: () => void;
  onBack: () => void;
}

export const CharacterSelection: React.FC<CharacterSelectionProps> = ({ 
  units, 
  inventory,
  gold,
  essence,
  onAddUnit,
  onUpdateUnit,
  onUpdateInventory,
  onUpdateEssence,
  onStartCombat, 
  onBack 
}) => {
  // Estado del Modal de Creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<UnitId>(UnitId.WARRIOR);
  const [characterName, setCharacterName] = useState('');

  // Estado del Inspector, Inventario y Santuario
  const [inspectingUnit, setInspectingUnit] = useState<Unit | null>(null);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isSanctuaryOpen, setIsSanctuaryOpen] = useState(false); // NUEVO

  const RECRUIT_COST = 100;
  const canAffordRecruit = gold >= RECRUIT_COST;

  const openModal = () => {
    if (!canAffordRecruit) return;
    setCharacterName(`Héroe ${Math.floor(Math.random() * 1000)}`);
    setSelectedClass(UnitId.WARRIOR);
    setIsModalOpen(true);
  };

  const handleConfirmAdd = () => {
    if (characterName.trim() === '') return;
    if (gold < RECRUIT_COST) return; 
    onAddUnit(selectedClass, characterName);
    setIsModalOpen(false);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center bg-gray-900 text-white select-none p-8 overflow-hidden">
      
      {/* Header */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-8 border-b border-stone-700 pb-4">
        <div className="flex items-center gap-6">
            <button 
                onClick={onBack}
                className="text-stone-400 hover:text-white transition-colors"
            >
                ← Volver
            </button>
            <h2 className="text-3xl font-bold text-yellow-500 tracking-widest uppercase hidden md:block" style={{ textShadow: '0 0 10px rgba(234, 179, 8, 0.3)' }}>
                Cuartel General
            </h2>
        </div>
        
        <div className="flex items-center gap-4">
            {/* Display de ORO */}
            <div className="bg-black/50 border border-yellow-900/50 px-4 py-2 rounded flex items-center gap-2 shadow-inner">
                <span className="text-2xl">📀</span>
                <span className="font-mono font-bold text-yellow-400 text-xl">{gold}</span>
            </div>

            {/* Display de ESENCIA (NUEVO) */}
            <div className="bg-black/50 border border-purple-900/50 px-4 py-2 rounded flex items-center gap-2 shadow-inner">
                <span className="text-2xl">🔘</span>
                <span className="font-mono font-bold text-purple-400 text-xl">{essence}</span>
            </div>

            {/* Botón de Santuario (NUEVO) */}
            <button 
                onClick={() => setIsSanctuaryOpen(true)}
                className="flex items-center gap-2 bg-stone-800 border border-stone-600 px-4 py-2 rounded hover:border-purple-500 hover:text-purple-400 transition-colors"
            >
                <span className="text-xl">🔮</span>
                <span className="font-bold text-sm uppercase tracking-wider hidden sm:inline">Santuario</span>
            </button>

            {/* Botón de Inventario General */}
            <button 
                onClick={() => setIsInventoryOpen(true)}
                className="flex items-center gap-2 bg-stone-800 border border-stone-600 px-4 py-2 rounded hover:border-yellow-500 hover:text-yellow-400 transition-colors"
            >
                <span className="text-xl">🎒</span>
                <span className="font-bold text-sm uppercase tracking-wider hidden sm:inline">Inventario</span>
            </button>
        </div>
      </div>

      {/* Grid de Personajes */}
      <div className="flex-1 w-full max-w-5xl overflow-y-auto mb-8 pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Tarjeta de Crear Nuevo */}
            <button 
                onClick={openModal}
                disabled={!canAffordRecruit}
                className={`
                    h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-all group relative
                    ${canAffordRecruit 
                        ? 'border-stone-600 hover:border-green-500 hover:bg-stone-800 cursor-pointer' 
                        : 'border-red-900/30 bg-red-900/5 opacity-50 cursor-not-allowed'}
                `}
            >
                <div className={`text-4xl mb-2 ${canAffordRecruit ? 'text-stone-500 group-hover:text-green-500' : 'text-red-900'}`}>+</div>
                <span className={`${canAffordRecruit ? 'text-stone-400 group-hover:text-white' : 'text-stone-600'} font-bold`}>Reclutar Héroe</span>
                
                {/* Etiqueta de Precio */}
                <div className={`mt-2 text-sm font-mono px-2 py-1 rounded ${canAffordRecruit ? 'bg-black/50 text-yellow-500' : 'bg-red-900/20 text-red-500'}`}>
                    {RECRUIT_COST} 📀
                </div>
            </button>

            {/* Lista de Unidades */}
            {units.map((unit, index) => {
                // Lógica actualizada para nombres de clase (solo para UI texto)
                const isWarrior = unit.color === '#f97316'; 
                const isMage = unit.color === '#3b82f6'; 
                const isRogue = unit.color === '#2dd4bf';
                
                let classNameStr = 'Guerrero';
                if (!isWarrior) {
                    if (isMage) { classNameStr = 'Mago'; }
                    else if (isRogue) { classNameStr = 'Pícaro'; }
                    else { classNameStr = 'Sacerdote'; }
                }

                return (
                <div 
                    key={unit.id} 
                    onClick={() => setInspectingUnit(unit)}
                    className="relative h-40 bg-stone-800 border border-stone-600 rounded-lg p-4 flex items-center shadow-lg hover:border-yellow-500 hover:bg-stone-700 hover:scale-[1.02] transition-all cursor-pointer group"
                >
                    {/* Avatar Simulado con GameIcon */}
                    <div 
                        className="w-16 h-16 rounded-full bg-stone-900 border-2 flex items-center justify-center mr-4 shadow-lg group-hover:shadow-[0_0_15px_currentColor] overflow-hidden p-2"
                        style={{ borderColor: unit.color, color: unit.color }}
                    >
                        <GameIcon icon={unit.icon} className="text-3xl w-full h-full flex items-center justify-center" />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 overflow-hidden">
                        <h3 className="font-bold text-lg text-white truncate group-hover:text-yellow-400 transition-colors">{unit.name}</h3>
                        <div className="text-xs text-stone-400 mb-2 uppercase tracking-wider">{classNameStr} • Lvl 1</div>
                        
                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                            <div className="text-green-400 text-xs">HP: {unit.maxHealth}</div>
                            {/* Mostrar ambos daños o el principal */}
                            <div className="text-red-400 text-xs">DMG: {unit.physicalDamage + unit.magicDamage}</div>
                        </div>
                    </div>

                    {/* Hint de "Inspeccionar" */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-stone-500 bg-stone-900 px-1 rounded">INFO</span>
                    </div>
                </div>
            )})}
        </div>
      </div>

      {/* Footer / Acción */}
      <div className="w-full max-w-5xl flex justify-center pt-4 border-t border-stone-700">
        <button
            onClick={onStartCombat}
            disabled={units.length === 0}
            className={`
                px-16 py-4 rounded font-bold text-xl tracking-wider transition-all
                ${units.length === 0 
                    ? 'bg-stone-800 text-stone-600 cursor-not-allowed' 
                    : 'bg-red-700 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(185,28,28,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] active:scale-95'}
            `}
        >
            IR AL COMBATE
        </button>
      </div>

      {/* MODAL DE CREACIÓN */}
      {isModalOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-stone-900 border border-stone-600 p-8 rounded-xl shadow-2xl w-full max-w-xl">
                <h3 className="text-2xl font-bold text-yellow-500 mb-2 text-center uppercase tracking-widest">Nuevo Recluta</h3>
                <div className="text-center text-stone-400 mb-6 text-sm">Coste: <span className="text-yellow-400 font-bold">{RECRUIT_COST} 📀</span></div>
                
                {/* Selector de Clase - COLORES ACTUALIZADOS Y USO DE GameIcon */}
                <div className="grid grid-cols-5 gap-2 mb-6">
                    {/* GUERRERO - NARANJA */}
                    <button 
                        onClick={() => setSelectedClass(UnitId.WARRIOR)}
                        className={`p-4 rounded border-2 flex flex-col items-center gap-2 transition-all ${selectedClass === UnitId.WARRIOR ? 'border-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'border-stone-700 hover:border-stone-500'}`}
                    >
                        {/* Usamos el ID del icono directamente aquí para el botón */}
                        <GameIcon icon="class_warrior" className="text-4xl w-12 h-12" />
                        <span className={`font-bold text-xs ${selectedClass === UnitId.WARRIOR ? 'text-orange-400' : 'text-stone-500'}`}>Guerrero</span>
                    </button>
                    
                    {/* SACERDOTE - AMARILLO */}
                    <button 
                        onClick={() => setSelectedClass(UnitId.PRIEST)}
                        className={`p-4 rounded border-2 flex flex-col items-center gap-2 transition-all ${selectedClass === UnitId.PRIEST ? 'border-yellow-500 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-stone-700 hover:border-stone-500'}`}
                    >
                        <GameIcon icon="class_priest" className="text-4xl w-12 h-12 flex items-center justify-center" />
                        <span className={`font-bold text-xs ${selectedClass === UnitId.PRIEST ? 'text-yellow-400' : 'text-stone-500'}`}>Sacerdote</span>
                    </button>

                    {/* MAGO - AZUL */}
                    <button 
                        onClick={() => setSelectedClass(UnitId.MAGE)}
                        className={`p-4 rounded border-2 flex flex-col items-center gap-2 transition-all ${selectedClass === UnitId.MAGE ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-stone-700 hover:border-stone-500'}`}
                    >
                        <GameIcon icon="class_mage" className="text-4xl w-12 h-12 flex items-center justify-center" />
                        <span className={`font-bold text-xs ${selectedClass === UnitId.MAGE ? 'text-blue-400' : 'text-stone-500'}`}>Mago</span>
                    </button>

                    {/* PÍCARO - CYAN/TEAL */}
                    <button 
                        onClick={() => setSelectedClass(UnitId.ROGUE)}
                        className={`p-4 rounded border-2 flex flex-col items-center gap-2 transition-all ${selectedClass === UnitId.ROGUE ? 'border-teal-400 bg-teal-500/10 shadow-[0_0_15px_rgba(45,212,191,0.3)]' : 'border-stone-700 hover:border-stone-500'}`}
                    >
                        <GameIcon icon="class_rogue" className="text-4xl w-12 h-12 flex items-center justify-center" />
                        <span className={`font-bold text-xs ${selectedClass === UnitId.ROGUE ? 'text-teal-400' : 'text-stone-500'}`}>Pícaro</span>
                    </button>

                    {/* BÁRBARO - ROJO */}
                    <button 
                        onClick={() => setSelectedClass(UnitId.BARBARIAN)}
                        className={`p-4 rounded border-2 flex flex-col items-center gap-2 transition-all ${selectedClass === UnitId.BARBARIAN ? 'border-red-600 bg-red-600/10 shadow-[0_0_15px_rgba(220,38,38,0.3)]' : 'border-stone-700 hover:border-stone-500'}`}
                    >
                        <GameIcon icon="class_barbarian" className="text-4xl w-12 h-12 flex items-center justify-center" />
                        <span className={`font-bold text-xs ${selectedClass === UnitId.BARBARIAN ? 'text-red-500' : 'text-stone-500'}`}>Bárbaro</span>
                    </button>
                </div>

                {/* Input Nombre */}
                <div className="mb-8">
                    <label className="block text-stone-400 text-sm mb-2 font-mono">NOMBRE DEL RECLUTA</label>
                    <input 
                        type="text" 
                        value={characterName}
                        onChange={(e) => setCharacterName(e.target.value)}
                        className="w-full bg-black border border-stone-600 rounded p-3 text-white focus:border-green-500 focus:outline-none font-bold text-lg text-center"
                        autoFocus
                    />
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 py-3 rounded border border-stone-600 text-stone-400 hover:bg-stone-800 hover:text-white transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirmAdd}
                        className="flex-1 py-3 rounded bg-green-700 hover:bg-green-600 text-white font-bold shadow-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <span>Pagar y Reclutar</span>
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* INSPECTOR DE PERSONAJE (MODAL) */}
      <CharacterInspector 
        unit={inspectingUnit} 
        onClose={() => setInspectingUnit(null)} 
      />

      {/* INVENTARIO GENERAL (MODAL) */}
      {isInventoryOpen && (
          <InventoryModal 
            units={units}
            inventory={inventory}
            onUpdateUnit={onUpdateUnit}
            onUpdateInventory={onUpdateInventory}
            onClose={() => setIsInventoryOpen(false)}
          />
      )}

      {/* SANTUARIO (MODAL) */}
      {isSanctuaryOpen && (
          <SanctuaryPanel 
            units={units}
            essence={essence}
            onUpdateUnit={onUpdateUnit}
            onUpdateEssence={onUpdateEssence}
            onClose={() => setIsSanctuaryOpen(false)}
          />
      )}

    </div>
  );
};