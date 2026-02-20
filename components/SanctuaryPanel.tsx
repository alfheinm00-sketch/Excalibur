import React, { useState } from 'react';
import { Unit } from '../classes/Unit';
import { GameIcon } from '../data/Icons';

interface SanctuaryPanelProps {
  units: Unit[];
  essence: number;
  onUpdateUnit: (unit: Unit) => void;
  onUpdateEssence: (newEssence: number) => void;
  onClose: () => void;
}

export const SanctuaryPanel: React.FC<SanctuaryPanelProps> = ({
  units,
  essence,
  onUpdateUnit,
  onUpdateEssence,
  onClose
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(units.length > 0 ? units[0].id : null);

  const selectedUnit = units.find(u => u.id === selectedUnitId);

  // Lógica de Coste: Base 100, Incremento 50 cada 5 niveles
  const calculateCost = (currentValue: number) => {
    const baseCost = 100;
    const increment = 50;
    const multiplier = Math.floor(currentValue / 5);
    return baseCost + (multiplier * increment);
  };

  const handleUpgrade = (attribute: 'strength' | 'constitution' | 'willpower' | 'agility' | 'dexterity' | 'intelligence') => {
    if (!selectedUnit) return;

    const currentVal = selectedUnit[attribute];
    const cost = calculateCost(currentVal);

    if (essence >= cost) {
      // 1. Deducir Esencia
      onUpdateEssence(essence - cost);

      // 2. Incrementar Atributo
      selectedUnit[attribute] += 1;

      // 3. Recalcular Stats Derivadas
      selectedUnit.recalculateStats();

      // 4. Notificar Actualización
      onUpdateUnit(selectedUnit);
    }
  };

  const AttributeRow = ({ label, attr, icon, color }: { label: string, attr: 'strength' | 'constitution' | 'willpower' | 'agility' | 'dexterity' | 'intelligence', icon: string, color: string }) => {
    if (!selectedUnit) return null;
    const value = selectedUnit[attr];
    const cost = calculateCost(value);
    const canAfford = essence >= cost;

    return (
      <div className="flex items-center justify-between bg-stone-800 p-3 rounded border border-stone-700 mb-2">
        <div className="flex items-center gap-3">
          <div className="text-2xl w-8 text-center">{icon}</div>
          <div>
            <div className={`font-bold ${color}`}>{label}</div>
            <div className="text-xs text-stone-500 font-mono">Nivel {value}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            <div className="text-right">
                <div className="text-xs text-stone-400 uppercase">Siguiente Nivel</div>
                <div className={`font-mono font-bold ${canAfford ? 'text-white' : 'text-red-500'}`}>
                    {cost} 🔘
                </div>
            </div>
            <button
                onClick={() => handleUpgrade(attr)}
                disabled={!canAfford}
                className={`
                    px-4 py-2 rounded font-bold text-sm transition-all
                    ${canAfford 
                        ? 'bg-purple-700 hover:bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.3)]' 
                        : 'bg-stone-700 text-stone-500 cursor-not-allowed'}
                `}
            >
                MEJORAR
            </button>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-6xl bg-stone-900 border-2 border-purple-900 rounded-xl shadow-[0_0_50px_rgba(88,28,135,0.3)] overflow-hidden flex flex-col md:flex-row h-[80vh]">
        
        {/* Columna Izquierda: Lista de Unidades */}
        <div className="w-full md:w-1/3 bg-stone-950 border-r border-stone-800 flex flex-col">
            <div className="p-6 border-b border-stone-800 bg-purple-900/10">
                <h2 className="text-2xl font-bold text-purple-400 uppercase tracking-widest flex items-center gap-3">
                    <span>🔮</span> Santuario
                </h2>
                <p className="text-stone-400 text-xs mt-1">Canaliza esencia para fortalecer a tus héroes.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {units.map(unit => (
                    <div 
                        key={unit.id}
                        onClick={() => setSelectedUnitId(unit.id)}
                        className={`
                            p-3 rounded border flex items-center gap-3 cursor-pointer transition-all
                            ${selectedUnitId === unit.id 
                                ? 'bg-purple-900/20 border-purple-500 shadow-[inset_0_0_10px_rgba(168,85,247,0.2)]' 
                                : 'bg-stone-900 border-stone-800 hover:border-stone-600 hover:bg-stone-800'}
                        `}
                    >
                        <div className="w-10 h-10 rounded-full bg-stone-800 border border-stone-600 flex items-center justify-center overflow-hidden">
                             <GameIcon icon={unit.icon} className="w-full h-full" />
                        </div>
                        <div>
                            <div className={`font-bold ${selectedUnitId === unit.id ? 'text-white' : 'text-stone-400'}`}>{unit.name}</div>
                            <div className="text-[10px] text-stone-500 uppercase">Nvl 1 • {unit.constructor.name}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-stone-800 bg-stone-900">
                <div className="flex justify-between items-center bg-black/50 p-3 rounded border border-purple-900/30">
                    <span className="text-stone-400 text-sm uppercase font-bold">Esencia Disponible</span>
                    <span className="text-purple-400 font-mono font-bold text-xl flex items-center gap-2">
                        {essence} <span>🔘</span>
                    </span>
                </div>
            </div>
        </div>

        {/* Columna Derecha: Atributos */}
        <div className="w-full md:w-2/3 bg-stone-900 flex flex-col relative">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-stone-500 hover:text-white text-2xl z-10"
            >
                &times;
            </button>

            {selectedUnit ? (
                <div className="p-8 flex-1 overflow-y-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-20 h-20 rounded-full border-2 border-purple-500 bg-stone-800 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                            <GameIcon icon={selectedUnit.icon} className="w-full h-full" />
                        </div>
                        <div>
                            <h3 className="text-3xl font-bold text-white">{selectedUnit.name}</h3>
                            <div className="text-purple-400 text-sm uppercase tracking-widest font-bold">Mejora de Atributos</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <AttributeRow label="Fuerza" attr="strength" icon="💪🏻" color="text-red-400" />
                        <AttributeRow label="Constitución" attr="constitution" icon="💗" color="text-green-400" />
                        <AttributeRow label="Voluntad" attr="willpower" icon="✊🏻" color="text-blue-300" />
                        <AttributeRow label="Agilidad" attr="agility" icon="🦶🏻" color="text-teal-200" />
                        <AttributeRow label="Destreza" attr="dexterity" icon="👌🏻" color="text-yellow-200" />
                        <AttributeRow label="Inteligencia" attr="intelligence" icon="🧠" color="text-purple-400" />
                    </div>

                    <div className="mt-8 p-4 bg-purple-900/10 border border-purple-900/30 rounded text-xs text-purple-300 italic text-center">
                        "El poder verdadero no se encuentra, se forja con la esencia de los caídos."
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-stone-600 italic">
                    Selecciona un héroe para comenzar el ritual.
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
