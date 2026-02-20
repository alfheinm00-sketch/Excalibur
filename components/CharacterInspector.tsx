import React, { useState, useEffect } from 'react';
import { Unit } from '../classes/Unit';
import { Item } from '../data/ItemTypes';
import { Skill } from '../data/SkillTypes'; 
import { GameIcon } from '../data/Icons';

interface CharacterInspectorProps {
  unit: Unit | null;
  onClose: () => void;
}

// Discriminador de Tipo para el Tooltip
type ContextData = 
  | { type: 'ITEM', data: Item }
  | { type: 'SKILL', data: Skill };

export const CharacterInspector: React.FC<CharacterInspectorProps> = ({ unit, onClose }) => {
  const [activeTab, setActiveTab] = useState<'STATS' | 'SKILLS' | 'EQUIPMENT'>('STATS');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; content: ContextData } | null>(null);

  // Cerrar tooltip al hacer click en cualquier lado
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleRightClickItem = (e: React.MouseEvent, item: Item | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (item) {
        setContextMenu({ x: e.clientX, y: e.clientY, content: { type: 'ITEM', data: item } });
    }
  };

  const handleRightClickSkill = (e: React.MouseEvent, skill: Skill) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, content: { type: 'SKILL', data: skill } });
  };

  if (!unit) return null;

  // Determinar tipo basado en color (LÓGICA ACTUALIZADA)
  const isWarrior = unit.color === '#f97316'; 
  const isMage = unit.color === '#3b82f6'; 
  const isRogue = unit.color === '#2dd4bf';
  
  let classTitle = 'Guerrero';
  let themeColor = 'text-orange-400';
  let themeBorder = 'border-orange-500';

  if (!isWarrior) {
      if (isMage) {
          classTitle = 'Mago'; themeColor = 'text-blue-400'; themeBorder = 'border-blue-500';
      } else if (isRogue) {
          classTitle = 'Pícaro'; themeColor = 'text-teal-400'; themeBorder = 'border-teal-400';
      } else {
          classTitle = 'Sacerdote'; themeColor = 'text-yellow-400'; themeBorder = 'border-yellow-500';
      }
  }

  // CÁLCULO VISUAL: Mostramos TIEMPO (segundos)
  const attackInterval = (unit.attackCooldown / 1000).toFixed(2);

  // Helper Components definitions for Stats
  const AttributeBlock: React.FC<{ label: string, value: number, icon: string, color: string }> = ({ label, value, icon, color }) => (
      <div className="bg-stone-800 border border-stone-700 rounded p-2 flex flex-col items-center justify-center shadow-sm">
          <div className="text-2xl mb-1">{icon}</div>
          <div className={`text-xl font-bold font-mono ${color}`}>{value}</div>
          <div className="text-[10px] text-stone-500 uppercase font-bold tracking-wider">{label}</div>
      </div>
  );

  const SimpleStat: React.FC<{ label: string, value: number | string, icon: string, color?: string }> = ({ label, value, icon, color = 'text-white' }) => (
      <div className="flex justify-between items-center bg-stone-800/50 p-2 rounded border border-stone-700/50">
          <div className="flex items-center gap-2">
              <span className="text-lg">{icon}</span>
              <span className="text-stone-400 text-xs font-bold uppercase">{label}</span>
          </div>
          <span className={`font-mono font-bold ${color}`}>{value}</span>
      </div>
  );

  // Componente Slot local para el Inspector con soporte para Click Derecho
  const Slot: React.FC<{ label: string, item: Item | null, size?: 'sm' | 'md' | 'lg' }> = ({ label, item, size = 'md' }) => {
      let sizeClass = 'w-16 h-16';
      if (size === 'sm') sizeClass = 'w-10 h-10';
      if (size === 'lg') sizeClass = 'w-24 h-24';

      return (
        <div 
            onContextMenu={(e) => handleRightClickItem(e, item)}
            className={`
            bg-stone-950 border border-stone-700 flex flex-col items-center justify-center text-center relative
            ${sizeClass}
            rounded hover:border-stone-500 transition-colors cursor-help shadow-inner
        `}>
            {!item && <span className="text-[8px] text-stone-600 uppercase font-bold absolute pointer-events-none select-none">{label}</span>}
            {item && <span className="text-2xl pointer-events-none select-none">{item.icon}</span>}
        </div>
      );
  };

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="min-h-full flex items-center justify-center p-4">
        <div 
            className="relative w-full max-w-5xl bg-stone-900 border-2 border-stone-600 rounded-xl shadow-2xl flex flex-col md:flex-row"
            onClick={(e) => { e.stopPropagation(); setContextMenu(null); }} 
        >
        
        {/* Columna Izquierda: Avatar y Resumen */}
        <div className="w-full md:w-1/4 bg-stone-800 p-6 flex flex-col items-center border-b md:border-b-0 md:border-r border-stone-700">
            {/* AVATAR GRANDE */}
            <div className={`w-40 h-40 rounded-full border-4 ${themeBorder} flex items-center justify-center bg-stone-900 mb-6 shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden`}>
                <GameIcon icon={unit.icon} className="w-full h-full" />
            </div>
            
            <h2 className="text-3xl font-bold text-white text-center break-words w-full mb-2">{unit.name}</h2>
            <div className={`text-base font-mono uppercase tracking-widest mb-8 ${themeColor}`}>
                {classTitle} • Nvl 1
            </div>

            <div className="w-full bg-black/30 p-4 rounded text-xs font-mono text-stone-400 mt-auto">
                <div className="flex justify-between mb-2">
                    <span>ID:</span> <span className="text-white">{unit.id}</span>
                </div>
                <div className="flex justify-between">
                    <span>NET:</span> <span className="text-green-500">{unit.ip}</span>
                </div>
            </div>
        </div>

        {/* Columna Derecha: Contenido con Pestañas */}
        <div className="w-full md:w-3/4 flex flex-col min-h-[600px]">
            
            {/* Header y Botón cerrar */}
            <div className="p-6 md:p-8 pb-0 flex justify-between items-start">
                 <div className="flex gap-6 border-b border-stone-700 w-full">
                    <button onClick={() => setActiveTab('STATS')} className={`pb-3 px-4 font-bold uppercase text-sm md:text-base tracking-wider transition-colors whitespace-nowrap ${activeTab === 'STATS' ? 'text-white border-b-2 border-white' : 'text-stone-500 hover:text-stone-300'}`}>Estadísticas</button>
                    <button onClick={() => setActiveTab('SKILLS')} className={`pb-3 px-4 font-bold uppercase text-sm md:text-base tracking-wider transition-colors whitespace-nowrap ${activeTab === 'SKILLS' ? 'text-white border-b-2 border-white' : 'text-stone-500 hover:text-stone-300'}`}>Habilidades</button>
                    <button onClick={() => setActiveTab('EQUIPMENT')} className={`pb-3 px-4 font-bold uppercase text-sm md:text-base tracking-wider transition-colors whitespace-nowrap ${activeTab === 'EQUIPMENT' ? 'text-white border-b-2 border-white' : 'text-stone-500 hover:text-stone-300'}`}>Equipo</button>
                 </div>
                 <button onClick={onClose} className="ml-6 -mt-2 text-stone-500 hover:text-white transition-colors text-3xl leading-none">&times;</button>
            </div>

            <div className="p-6 md:p-8 pt-8 flex-1 bg-stone-900/50">
                
                {/* CONTENIDO STATS */}
                {activeTab === 'STATS' && (
                    <div className="animate-fade-in space-y-8">
                        
                        {/* SECCIÓN CARACTERÍSTICAS (ATRIBUTOS BASE) */}
                        <div>
                            <h4 className="text-sm uppercase text-stone-500 font-bold mb-4 border-b border-stone-800 pb-2">Características</h4>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                <AttributeBlock label="Fuerza" value={unit.strength} icon="💪🏻" color="text-red-400" />
                                <AttributeBlock label="Constitución" value={unit.constitution} icon="💗" color="text-green-400" />
                                <AttributeBlock label="Voluntad" value={unit.willpower} icon="✊🏻" color="text-blue-300" />
                                <AttributeBlock label="Agilidad" value={unit.agility} icon="🦶🏻" color="text-teal-200" />
                                <AttributeBlock label="Destreza" value={unit.dexterity} icon="👌🏻" color="text-yellow-200" />
                                <AttributeBlock label="Inteligencia" value={unit.intelligence} icon="🧠" color="text-purple-400" />
                            </div>
                        </div>

                        {/* SECCIÓN ESTADÍSTICAS DERIVADAS */}
                        <div>
                            <h4 className="text-sm uppercase text-stone-500 font-bold mb-4 border-b border-stone-800 pb-2">Estadísticas de Combate</h4>
                            
                            {/* Vitalidad */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="bg-stone-950/50 p-4 rounded-lg flex justify-between items-center border border-stone-800">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">❤️</span>
                                        <span className="text-stone-400 text-sm font-bold uppercase">Salud</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-green-500 text-xl font-mono font-bold">{Math.floor(unit.health)} / {unit.maxHealth}</div>
                                        <div className="text-xs text-stone-600">Regen: +{unit.healthRegen.toFixed(1)}/s</div>
                                    </div>
                                </div>
                                <div className="bg-stone-950/50 p-4 rounded-lg flex justify-between items-center border border-stone-800">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">⚡</span>
                                        <span className="text-stone-400 text-sm font-bold uppercase">Energía</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-blue-500 text-xl font-mono font-bold">{Math.floor(unit.energy)} / {unit.maxEnergy}</div>
                                        <div className="text-xs text-stone-600">Regen: +{unit.energyRegen.toFixed(1)}/s</div>
                                    </div>
                                </div>
                            </div>

                            {/* Grid de Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <SimpleStat label="Daño Físico" value={unit.physicalDamage.toFixed(0)} icon="⚔️" />
                                <SimpleStat label="Daño Mágico" value={unit.magicDamage.toFixed(0)} icon="✨" color="text-purple-400" />
                                <SimpleStat label="Armadura" value={unit.armor.toFixed(1)} icon="🛡️" color="text-stone-300" />
                                <SimpleStat label="Res. Mágica" value={unit.magicResist.toFixed(1)} icon="💠" color="text-blue-300" />
                                
                                <SimpleStat label="Vel. Ataque" value={`${attackInterval}s`} icon="⏱️" />
                                <SimpleStat label="Crítico" value={`${(unit.criticalChance * 100).toFixed(1)}%`} icon="💥" color="text-yellow-400" />
                                <SimpleStat label="Evasión" value={`${(unit.evasionChance * 100).toFixed(1)}%`} icon="💨" color="text-teal-400" />
                                <SimpleStat label="Velocidad" value={unit.velocity.toFixed(2)} icon="👟" />
                            </div>
                        </div>
                    </div>
                )}

                {/* CONTENIDO SKILLS */}
                {activeTab === 'SKILLS' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                        {unit.skills.length === 0 && (
                            <div className="col-span-2 text-stone-500 text-center py-12 italic text-lg">Sin habilidades aprendidas.</div>
                        )}
                        {unit.skills.map(skill => (
                            <div 
                                key={skill.id} 
                                onContextMenu={(e) => handleRightClickSkill(e, skill)}
                                className="bg-stone-800 border border-stone-700 rounded-lg p-5 flex gap-5 hover:border-stone-500 transition-colors cursor-help shadow-lg"
                            >
                                <div className="w-16 h-16 bg-stone-900 rounded-lg border border-stone-600 flex items-center justify-center text-3xl shrink-0">
                                    {skill.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-white text-lg truncate">{skill.name} <span className="text-xs text-stone-400 ml-1 font-normal">Nvl {skill.level}</span></h4>
                                        <div className="text-xs text-blue-400 font-mono bg-blue-900/30 px-2 py-1 rounded border border-blue-900/50 whitespace-nowrap">{skill.energyCost} MP</div>
                                    </div>
                                    <p className="text-sm text-stone-400 leading-snug line-clamp-2 mb-2">{skill.description}</p>
                                    <div className="text-xs text-stone-500 flex items-center gap-1">
                                        <span>⏳</span> {skill.cooldown / 1000}s Enfriamiento
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="col-span-1 md:col-span-2 text-xs text-stone-500 mt-4 italic text-center border-t border-stone-800 pt-4">
                            💡 Haz Click Derecho en una habilidad para ver detalles técnicos
                        </div>
                    </div>
                )}

                {/* CONTENIDO EQUIPAMIENTO */}
                {activeTab === 'EQUIPMENT' && (
                    <div className="animate-fade-in flex flex-col h-full items-center justify-center">
                        <div className="flex justify-center items-start gap-8 mb-8">
                            {/* Lado Izquierdo: Arma y Anillos */}
                            <div className="flex flex-col gap-4 items-end">
                                <Slot label="M. Der" item={unit.equipment.rightHand} size="lg" />
                                <div className="h-4"></div>
                                <div className="grid grid-cols-2 gap-3">
                                    {unit.equipment.rings.slice(0, 2).map((r, i) => (
                                        <Slot key={i} label={`A${i+1}`} item={r} size="sm" />
                                    ))}
                                </div>
                            </div>

                            {/* Centro: Armadura (Columna Vertical) */}
                            <div className="flex flex-col gap-3 items-center bg-stone-950/30 p-4 rounded-xl border border-stone-800/50">
                                <Slot label="Cabeza" item={unit.equipment.head} size="md" />
                                <Slot label="Camisa" item={unit.equipment.shirt} size="md" />
                                <Slot label="Pantalón" item={unit.equipment.pants} size="md" />
                                <Slot label="Botas" item={unit.equipment.boots} size="md" />
                            </div>

                            {/* Lado Derecho: Offhand, Collar y Anillos */}
                            <div className="flex flex-col gap-4 items-start">
                                <Slot label="M. Izq" item={unit.equipment.leftHand} size="lg" />
                                <Slot label="Collar" item={unit.equipment.necklace} size="md" />
                                <div className="grid grid-cols-2 gap-3">
                                    {unit.equipment.rings.slice(2, 5).map((r, i) => (
                                        <Slot key={i} label={`A${i+3}`} item={r} size="sm" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Abajo: Pociones */}
                        <div className="w-full max-w-md border-t border-stone-800 pt-6 mt-4">
                            <h4 className="text-[10px] text-stone-500 font-bold mb-4 uppercase text-center tracking-widest">Cinturón de Pociones</h4>
                            <div className="flex justify-center gap-3">
                                {unit.equipment.potions.map((p, i) => (
                                    <Slot key={i} label={`P${i+1}`} item={p} size="sm" />
                                ))}
                            </div>
                        </div>
                        
                        <div className="text-xs text-stone-500 mt-8 italic text-center">
                            💡 Haz Click Derecho en un objeto para ver detalles
                        </div>
                    </div>
                )}

            </div>

            <div className="mt-auto px-6 pb-6 md:hidden">
                <button onClick={onClose} className="w-full py-3 bg-stone-700 text-white rounded font-bold">Cerrar Panel</button>
            </div>
        </div>
      </div>
      </div>

      {/* TOOLTIP / INSPECTOR FLOTANTE */}
      {contextMenu && (
            <div 
                className="fixed z-[100] w-64 bg-stone-950 border border-stone-500 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.8)] p-4 animate-fade-in text-white pointer-events-none"
                style={{ 
                    left: Math.min(contextMenu.x + 15, window.innerWidth - 270), 
                    top: Math.min(contextMenu.y + 15, window.innerHeight - 200) 
                }}
            >
                {/* TOOLTIP DE ITEM */}
                {contextMenu.content.type === 'ITEM' && (
                    <>
                        <div className="flex items-center gap-3 border-b border-stone-800 pb-3 mb-3">
                            <div className="w-10 h-10 bg-stone-900 rounded border border-stone-700 flex items-center justify-center text-xl">
                                {contextMenu.content.data.icon}
                            </div>
                            <div>
                                <h4 className="font-bold text-yellow-500 leading-tight">{contextMenu.content.data.name}</h4>
                                <div className="text-[10px] uppercase tracking-wider text-stone-500">Objeto</div>
                            </div>
                        </div>

                        {contextMenu.content.data.weaponStats && (
                            <div className="space-y-1 mb-3 text-sm font-mono">
                                {contextMenu.content.data.weaponStats.physicalDamage > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-stone-400">Daño Físico</span>
                                        <span className="text-red-400 font-bold">{contextMenu.content.data.weaponStats.physicalDamage}</span>
                                    </div>
                                )}
                                {contextMenu.content.data.weaponStats.magicDamage > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-stone-400">Daño Mágico</span>
                                        <span className="text-purple-400 font-bold">{contextMenu.content.data.weaponStats.magicDamage}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-stone-400">Rango</span>
                                    <span className="text-yellow-200">{contextMenu.content.data.weaponStats.range}</span>
                                </div>
                                {contextMenu.content.data.weaponStats.cooldownModifier !== 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-stone-400">T. Recarga</span>
                                        <span className={contextMenu.content.data.weaponStats.cooldownModifier > 0 ? "text-red-500" : "text-green-500"}>
                                            {contextMenu.content.data.weaponStats.cooldownModifier > 0 ? '+' : ''}{(contextMenu.content.data.weaponStats.cooldownModifier / 1000)}s
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        <p className="text-xs text-stone-400 italic leading-relaxed">
                            "{contextMenu.content.data.description}"
                        </p>
                    </>
                )}

                {/* TOOLTIP DE SKILL (NUEVO) */}
                {contextMenu.content.type === 'SKILL' && (
                    <>
                        <div className="flex items-center gap-3 border-b border-stone-800 pb-3 mb-3">
                            <div className="w-10 h-10 bg-stone-900 rounded border border-blue-500 flex items-center justify-center text-xl shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                                {contextMenu.content.data.icon}
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-400 leading-tight">{contextMenu.content.data.name}</h4>
                                <div className="text-[10px] uppercase tracking-wider text-stone-500">Habilidad Activa</div>
                            </div>
                        </div>

                        <div className="space-y-2 mb-3 text-sm font-mono bg-stone-900/50 p-2 rounded">
                             <div className="flex justify-between">
                                <span className="text-stone-400">Nivel</span>
                                <span className="text-white font-bold">{contextMenu.content.data.level}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-stone-400">Coste Energía</span>
                                <span className="text-blue-400 font-bold">{contextMenu.content.data.energyCost}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-stone-400">Enfriamiento</span>
                                <span className="text-stone-300">{contextMenu.content.data.cooldown / 1000}s</span>
                            </div>
                        </div>

                        <p className="text-xs text-stone-300 italic leading-relaxed">
                            {contextMenu.content.data.description}
                        </p>
                        
                        <div className="mt-3 pt-2 border-t border-stone-800 text-[10px] text-stone-500 text-center uppercase tracking-widest">
                            {contextMenu.content.data.isAutoCast ? 'Auto-Cast: Activado' : 'Auto-Cast Disponible'}
                        </div>
                    </>
                )}
            </div>
        )}
      </div>
  );
};