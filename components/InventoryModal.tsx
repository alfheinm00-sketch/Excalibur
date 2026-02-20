import React, { useState, useEffect } from 'react';
import { Unit } from '../classes/Unit';
import { Item, EquipmentSlotType } from '../data/ItemTypes';
import { GameIcon } from '../data/Icons'; // NUEVO

interface InventoryModalProps {
  units: Unit[];
  inventory: (Item | null)[];
  onUpdateUnit: (unit: Unit) => void;
  onUpdateInventory: (inv: (Item | null)[]) => void;
  onClose: () => void;
}

// Estructura para saber qué objeto estamos "sosteniendo" (cursor)
type HandState = {
    source: 'INVENTORY' | 'EQUIPMENT';
    indexOrKey: number | string; 
    item: Item;
} | null;

// Estructura del menú contextual (Tooltip)
type ContextMenuState = {
    x: number;
    y: number;
    item: Item;
} | null;

export const InventoryModal: React.FC<InventoryModalProps> = ({ 
    units, 
    inventory, 
    onUpdateUnit, 
    onUpdateInventory, 
    onClose 
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(units.length > 0 ? units[0].id : null);
  const [hand, setHand] = useState<HandState>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  
  const selectedUnit = units.find(u => u.id === selectedUnitId);

  // Cerrar el context menu si hacemos clic en cualquier lado global (fallback)
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // --- LOGICA DEL MENU CONTEXTUAL ---
  const handleRightClick = (e: React.MouseEvent, item: Item | null) => {
      e.preventDefault();
      e.stopPropagation();
      if (!item) {
          setContextMenu(null);
          return;
      }
      setContextMenu({
          x: e.clientX,
          y: e.clientY,
          item: item
      });
  };

  // Handler para el contenedor principal del modal
  const handleModalContentClick = (e: React.MouseEvent) => {
      // Detenemos la propagación para que no cierre el modal completo (overlay)
      e.stopPropagation(); 
      // PERO cerramos el tooltip explícitamente
      setContextMenu(null);
  };

  // --- LOGICA DE MOVIMIENTO DE ITEMS ---

  const handleInventorySlotClick = (index: number) => {
    const clickedItem = inventory[index];

    // 1. Si no tenemos nada en la mano
    if (!hand) {
        if (clickedItem) {
            setHand({ source: 'INVENTORY', indexOrKey: index, item: clickedItem });
        }
        return;
    }

    // 2. Si tenemos algo en la mano
    if (hand) {
        const newInventory = [...inventory];
        
        if (hand.source === 'INVENTORY') {
            const originIndex = hand.indexOrKey as number;
            newInventory[originIndex] = clickedItem; 
            newInventory[index] = hand.item; 
            onUpdateInventory(newInventory);
        } 
        else if (hand.source === 'EQUIPMENT' && selectedUnit) {
            const newUnit = removeEquipmentFromUnit(selectedUnit, hand.indexOrKey as string);
            
            if (clickedItem) {
                if (canEquipItem(clickedItem, hand.indexOrKey as string)) {
                    equipItemToUnit(newUnit, clickedItem, hand.indexOrKey as string);
                    newInventory[index] = hand.item; 
                    onUpdateUnit(newUnit);
                    onUpdateInventory(newInventory);
                }
            } else {
                newInventory[index] = hand.item;
                onUpdateUnit(newUnit); 
                onUpdateInventory(newInventory);
            }
        }
        setHand(null);
    }
  };

  const handleEquipmentSlotClick = (slotKey: string, arrayIndex?: number) => {
    if (!selectedUnit) return;

    const fullKey = arrayIndex !== undefined ? `${slotKey}-${arrayIndex}` : slotKey;

    let currentItem: Item | null = null;
    if (arrayIndex !== undefined) {
        const list = (selectedUnit.equipment as any)[slotKey] as (Item | null)[];
        currentItem = list[arrayIndex];
    } else {
        currentItem = (selectedUnit.equipment as any)[slotKey];
    }

    if (!hand) {
        if (currentItem) {
            setHand({ source: 'EQUIPMENT', indexOrKey: fullKey, item: currentItem });
        }
        return;
    }

    if (hand) {
        let targetSlotType: EquipmentSlotType | null = null;
        if (slotKey === 'rightHand' || slotKey === 'leftHand') targetSlotType = 'hand';
        else if (slotKey === 'rings') targetSlotType = 'ring';
        else if (slotKey === 'potions') targetSlotType = 'potion';
        else targetSlotType = slotKey as EquipmentSlotType;

        if (hand.item.validSlots.includes(targetSlotType)) {
            let tempInventory = [...inventory];
            let tempUnit = createUnitCopy(selectedUnit);

            if (hand.source === 'INVENTORY') {
                tempInventory[hand.indexOrKey as number] = null; 
            } else if (hand.source === 'EQUIPMENT') {
                tempUnit = removeEquipmentFromUnit(tempUnit, hand.indexOrKey as string);
            }

            const swappedItem = currentItem;
            
            if (arrayIndex !== undefined) {
                (tempUnit.equipment as any)[slotKey][arrayIndex] = hand.item;
            } else {
                (tempUnit.equipment as any)[slotKey] = hand.item;
            }

            tempUnit.recalculateStats();

            if (swappedItem) {
                if (hand.source === 'INVENTORY') {
                    tempInventory[hand.indexOrKey as number] = swappedItem;
                } else if (hand.source === 'EQUIPMENT') {
                    equipItemToUnit(tempUnit, swappedItem, hand.indexOrKey as string);
                }
            }

            onUpdateInventory(tempInventory);
            onUpdateUnit(tempUnit);
            setHand(null);
        }
    }
  };


  // Helpers
  const createUnitCopy = (u: Unit): Unit => {
      const copy = Object.assign(Object.create(Object.getPrototypeOf(u)), u);
      copy.equipment = {
          ...u.equipment,
          rings: [...u.equipment.rings],
          potions: [...u.equipment.potions]
      };
      return copy;
  };

  const removeEquipmentFromUnit = (u: Unit, key: string): Unit => {
      const copy = createUnitCopy(u);
      if (key.includes('-')) {
          const [prop, idxStr] = key.split('-');
          const idx = parseInt(idxStr);
          (copy.equipment as any)[prop][idx] = null;
      } else {
          (copy.equipment as any)[key] = null;
      }
      copy.recalculateStats();
      return copy;
  };

  const equipItemToUnit = (u: Unit, item: Item, key: string) => {
      if (key.includes('-')) {
          const [prop, idxStr] = key.split('-');
          const idx = parseInt(idxStr);
          (u.equipment as any)[prop][idx] = item;
      } else {
          (u.equipment as any)[key] = item;
      }
      u.recalculateStats();
  };

  const canEquipItem = (item: Item, key: string): boolean => {
      let targetSlotType: EquipmentSlotType | null = null;
      if (key.includes('rightHand') || key.includes('leftHand')) targetSlotType = 'hand';
      else if (key.includes('rings')) targetSlotType = 'ring';
      else if (key.includes('potions')) targetSlotType = 'potion';
      else targetSlotType = key as EquipmentSlotType; 
      
      return item.validSlots.includes(targetSlotType!);
  };

  // --- RENDERIZADO ---

  const ItemSlot: React.FC<{ label?: string, item?: Item | null, slotKey?: string, arrayIndex?: number, isSmall?: boolean }> = ({ label, item, slotKey, arrayIndex, isSmall = false }) => {
    
    let isValidTarget = false;
    let isHeldOrigin = false;

    if (hand && slotKey) {
        const myKey = arrayIndex !== undefined ? `${slotKey}-${arrayIndex}` : slotKey;
        if (hand.source === 'EQUIPMENT' && hand.indexOrKey === myKey) {
            isHeldOrigin = true;
        } else {
            isValidTarget = canEquipItem(hand.item, myKey);
        }
    }

    let borderClass = 'border-stone-600';
    if (isHeldOrigin) borderClass = 'border-blue-500 opacity-50';
    else if (hand && isValidTarget) borderClass = 'border-green-500 bg-green-900/20';
    else if (hand && !isValidTarget && slotKey) borderClass = 'border-red-900 opacity-50'; 
    else if (!hand) borderClass = 'hover:border-white cursor-pointer';

    return (
        <div 
            onClick={() => slotKey && handleEquipmentSlotClick(slotKey, arrayIndex)}
            onContextMenu={(e) => handleRightClick(e, item || null)}
            className={`
                relative bg-stone-900 border ${borderClass} 
                ${isSmall ? 'w-10 h-10' : 'w-14 h-14'} 
                flex flex-col items-center justify-center transition-all group
            `}
        >
            {label && !item && <span className="text-[9px] text-stone-500 uppercase font-bold text-center leading-none pointer-events-none select-none">{label}</span>}
            {item && <span className="text-xl select-none pointer-events-none">{item.icon}</span>}
        </div>
    );
  };

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in p-8" onClick={onClose}>
      <div 
        className="relative w-full max-w-5xl bg-stone-800 border-2 border-stone-600 rounded-xl shadow-2xl flex flex-col h-[80vh]"
        onClick={handleModalContentClick} 
      >
        
        {/* Header */}
        <div className="p-6 border-b border-stone-700 flex justify-between items-center bg-stone-900/50">
            <h2 className="text-2xl font-bold text-yellow-500 tracking-widest uppercase flex items-center gap-3">
                <span>📦</span> Gestión de Inventario
            </h2>
            <div className="flex gap-4 items-center">
                {hand && (
                    <div className="text-sm text-yellow-400 animate-pulse font-mono">
                        SOSTENIENDO: {hand.item.name} ({hand.item.icon})
                    </div>
                )}
                <button onClick={onClose} className="text-stone-400 hover:text-white text-2xl font-bold">&times;</button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
            
            {/* COLUMNA IZQUIERDA: EQUIPAMIENTO DEL PERSONAJE */}
            <div className="w-1/2 p-6 border-r border-stone-700 overflow-y-auto bg-stone-800/50">
                {/* Selector de personaje */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {units.map(unit => (
                        <button 
                            key={unit.id}
                            onClick={() => { setSelectedUnitId(unit.id); setHand(null); }}
                            className={`flex items-center gap-2 px-3 py-2 rounded border transition-all ${selectedUnitId === unit.id ? 'bg-stone-700 border-yellow-500 text-white' : 'bg-stone-900 border-stone-700 text-stone-400 hover:border-stone-500'}`}
                        >
                            {/* Icono de unidad con GameIcon */}
                            <div className="w-6 h-6 rounded-full border flex items-center justify-center overflow-hidden" style={{ borderColor: unit.color, backgroundColor: unit.color }}>
                                <GameIcon icon={unit.icon} className="text-xs w-full h-full flex items-center justify-center" />
                            </div>
                            <span className="font-bold text-sm">{unit.name}</span>
                        </button>
                    ))}
                </div>

                {selectedUnit ? (
                    <div className="flex flex-col items-center select-none h-full">
                        <div className="flex-1 w-full flex flex-col items-center justify-center bg-stone-900/30 rounded-lg p-4 gap-6">
                            
                            {/* ZONA SUPERIOR: EQUIPO PRINCIPAL */}
                            <div className="flex justify-center items-start gap-6">
                                {/* COLUMNA IZQUIERDA: ARMA + ACCESORIOS */}
                                <div className="flex flex-col gap-3 items-end">
                                    <ItemSlot label="M. Der" item={selectedUnit.equipment.rightHand} slotKey="rightHand" />
                                    <div className="h-2"></div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {selectedUnit.equipment.rings.slice(0, 2).map((item, i) => (
                                            <ItemSlot key={`ring-${i}`} label={`A${i+1}`} item={item} isSmall slotKey="rings" arrayIndex={i} />
                                        ))}
                                    </div>
                                </div>

                                {/* COLUMNA CENTRAL: ARMADURA */}
                                <div className="flex flex-col gap-2 items-center bg-stone-950/50 p-3 rounded-xl border border-stone-800">
                                    <ItemSlot label="Cabeza" item={selectedUnit.equipment.head} slotKey="head" />
                                    <ItemSlot label="Camisa" item={selectedUnit.equipment.shirt} slotKey="shirt" />
                                    <ItemSlot label="Pantalón" item={selectedUnit.equipment.pants} slotKey="pants" />
                                    <ItemSlot label="Botas" item={selectedUnit.equipment.boots} slotKey="boots" />
                                </div>

                                {/* COLUMNA DERECHA: OFFHAND + ACCESORIOS */}
                                <div className="flex flex-col gap-3 items-start">
                                    <ItemSlot label="M. Izq" item={selectedUnit.equipment.leftHand} slotKey="leftHand" />
                                    <ItemSlot label="Collar" item={selectedUnit.equipment.necklace} isSmall slotKey="necklace" />
                                    <div className="grid grid-cols-2 gap-2">
                                        {selectedUnit.equipment.rings.slice(2, 5).map((item, i) => (
                                            <ItemSlot key={`ring-${i+2}`} label={`A${i+3}`} item={item} isSmall slotKey="rings" arrayIndex={i+2} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* ZONA INFERIOR: POCIONES */}
                            <div className="flex flex-col items-center gap-2 w-full border-t border-stone-800 pt-4">
                                <span className="text-[10px] uppercase text-stone-600 font-bold tracking-widest">Cinturón</span>
                                <div className="flex gap-2">
                                    {selectedUnit.equipment.potions.map((item, i) => (
                                        <ItemSlot key={`potion-${i}`} label={`P${i+1}`} item={item} isSmall slotKey="potions" arrayIndex={i} />
                                    ))}
                                </div>
                            </div>

                        </div>
                        
                        <div className="mt-4 grid grid-cols-3 gap-4 text-xs text-stone-400 font-mono bg-stone-950 p-3 rounded-lg border border-stone-800 w-full text-center">
                           <div className="flex flex-col"><span className="text-[10px] text-stone-600 uppercase">Físico</span><span className="text-red-400 font-bold text-lg">{Math.round(selectedUnit.physicalDamage)}</span></div>
                           <div className="flex flex-col"><span className="text-[10px] text-stone-600 uppercase">Mágico</span><span className="text-purple-400 font-bold text-lg">{Math.round(selectedUnit.magicDamage)}</span></div>
                           <div className="flex flex-col"><span className="text-[10px] text-stone-600 uppercase">Defensa</span><span className="text-blue-400 font-bold text-lg">{Math.round(selectedUnit.armor)}</span></div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-stone-500 mt-20">Selecciona un personaje.</div>
                )}
            </div>

            {/* COLUMNA DERECHA: INVENTARIO GENERAL (6x5) */}
            <div className="w-1/2 p-6 bg-stone-900/80 select-none">
                <h3 className="text-stone-400 font-bold mb-4 uppercase text-sm tracking-wider">Mochila Compartida (0/30)</h3>
                
                <div className="grid grid-cols-6 gap-2">
                    {inventory.map((item, index) => {
                        const isSelected = hand?.source === 'INVENTORY' && hand.indexOrKey === index;
                        return (
                            <div 
                                key={index}
                                onClick={() => handleInventorySlotClick(index)} 
                                onContextMenu={(e) => handleRightClick(e, item)}
                                className={`
                                    aspect-square bg-stone-800 border-2 rounded flex items-center justify-center transition-all cursor-pointer relative
                                    ${isSelected ? 'border-blue-500 bg-blue-900/20 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'border-stone-700 hover:border-stone-500'}
                                    ${hand && !isSelected ? 'hover:bg-stone-700' : ''}
                                `}
                            >
                                {item ? (
                                    <span className="text-2xl" title={item.name}>{item.icon}</span>
                                ) : (
                                    <span className="text-stone-700 text-xs font-mono">{index + 1}</span>
                                )}

                                {isSelected && (
                                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full border border-white animate-ping"></div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 p-4 bg-stone-800/50 rounded border border-stone-700 text-sm text-stone-500">
                    <p>💡 <b>Clic Izquierdo:</b> Mover/Equipar objeto.</p>
                    <p>🔍 <b>Clic Derecho:</b> Inspeccionar detalles del objeto.</p>
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
                <div className="flex items-center gap-3 border-b border-stone-800 pb-3 mb-3">
                    <div className="w-10 h-10 bg-stone-900 rounded border border-stone-700 flex items-center justify-center text-xl">
                        {contextMenu.item.icon}
                    </div>
                    <div>
                        <h4 className="font-bold text-yellow-500 leading-tight">{contextMenu.item.name}</h4>
                        <div className="text-[10px] uppercase tracking-wider text-stone-500">Objeto Común</div>
                    </div>
                </div>

                {contextMenu.item.weaponStats && (
                    <div className="space-y-1 mb-3 text-sm font-mono">
                         {contextMenu.item.weaponStats.physicalDamage > 0 && (
                            <div className="flex justify-between">
                                <span className="text-stone-400">Daño Físico</span>
                                <span className="text-red-400 font-bold">{contextMenu.item.weaponStats.physicalDamage}</span>
                            </div>
                        )}
                        {contextMenu.item.weaponStats.magicDamage > 0 && (
                            <div className="flex justify-between">
                                <span className="text-stone-400">Daño Mágico</span>
                                <span className="text-purple-400 font-bold">{contextMenu.item.weaponStats.magicDamage}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-stone-400">Rango</span>
                            <span className="text-yellow-200">{contextMenu.item.weaponStats.range}</span>
                        </div>
                        {contextMenu.item.weaponStats.cooldownModifier !== 0 && (
                            <div className="flex justify-between">
                                <span className="text-stone-400">T. Recarga</span>
                                <span className={contextMenu.item.weaponStats.cooldownModifier > 0 ? "text-red-500" : "text-green-500"}>
                                    {/* Si es mayor a 0, penaliza (rojo) con +. Si es menor, bonifica (verde) con - */}
                                    {contextMenu.item.weaponStats.cooldownModifier > 0 ? '+' : ''}{(contextMenu.item.weaponStats.cooldownModifier / 1000)}s
                                </span>
                            </div>
                        )}
                        {contextMenu.item.weaponStats.isHealer && (
                            <div className="text-green-400 text-xs mt-1 text-center border border-green-900 bg-green-900/20 rounded px-1">
                                ✨ Permite Sanación
                            </div>
                        )}
                    </div>
                )}

                <p className="text-xs text-stone-400 italic leading-relaxed">
                    "{contextMenu.item.description}"
                </p>
            </div>
        )}
      </div>
    </div>
  );
};