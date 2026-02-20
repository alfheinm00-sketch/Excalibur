import React, { useRef, useEffect, useState } from 'react';
import { Unit } from '../classes/Unit';
import { Slime } from '../classes/units/Slime';
import { Barbarian } from '../classes/units/Barbarian'; // NUEVO
import { Team, GroundZone } from '../types';
import { isPointInRect, distance } from '../utils/math';
import { CombatSystem } from '../modules/Combat';
import { VisualEffectsSystem, TextType } from '../modules/VisualEffects';
import { LevelManager, LevelEvent } from '../modules/LevelManager'; 
import { InputHandler, InputResult } from '../modules/InputHandler'; 
import { RenderSystem } from '../modules/RenderSystem';
import { GameIcon } from '../data/Icons';

interface GameCanvasProps {
  initialPlayerUnits: Unit[];
  onUnitDeath: (id: number) => void; 
  onVictory: (reward: number) => void;
  onExit: () => void;
  onEssenceCollected: (amount: number) => void; // NUEVO
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
    initialPlayerUnits, 
    onUnitDeath, 
    onVictory,
    onExit,
    onEssenceCollected
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // --- ESTADO DEL JUEGO (Refs mutables para el Game Loop) ---
  const unitsRef = useRef<Unit[]>([]);
  const groundZonesRef = useRef<GroundZone[]>([]);
  
  const levelManager = useRef(new LevelManager());
  const inputHandler = useRef(new InputHandler(10)); // Umbral de 10px para arrastre
  
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const nextIdRef = useRef<number>(5000); 

  // --- ESTADO DE UI (React State para renderizado de interfaz) ---
  const [selectedUnitForUI, setSelectedUnitForUI] = useState<Unit | null>(null);
  const [uiState, setUiState] = useState({ wave: 0, status: '', isVictory: false });
  // Forzamos re-render de UI (CDs, barras) periodicamente sin afectar el canvas loop
  const [, setTick] = useState(0); 
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const keysPressed = useRef<Set<string>>(new Set());

  // 1. INICIALIZACIÓN
  useEffect(() => {
    // Listener para cambios de pantalla completa
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    // Listeners de Teclado
    const handleKeyDown = (e: KeyboardEvent) => {
        const key = e.key.toUpperCase();
        keysPressed.current.add(key);
        
        // 1. Selección de Unidades (1-5)
        if (['1', '2', '3', '4', '5'].includes(key)) {
            const index = parseInt(key) - 1;
            const playerUnits = unitsRef.current.filter(u => u.team === Team.PLAYER);
            
            if (playerUnits[index]) {
                // Deseleccionar todas
                unitsRef.current.forEach(u => u.isSelected = false);
                // Seleccionar la nueva
                playerUnits[index].isSelected = true;
                // Actualizar UI
                setSelectedUnitForUI(playerUnits[index]);
                return; // Importante: Salir para no procesar comandos de la unidad anterior
            }
        }

        // Buscar la unidad seleccionada actual directamente del Ref (Fuente de verdad)
        const currentSelectedUnit = unitsRef.current.find(u => u.isSelected && u.team === Team.PLAYER);

        // 2. Comandos para unidad seleccionada
        if (currentSelectedUnit) {
            const now = performance.now();

            // Habilidades (Q, W, E, R)
            if (key === 'Q') currentSelectedUnit.castSkill(0, unitsRef.current, now);
            if (key === 'W') currentSelectedUnit.castSkill(1, unitsRef.current, now);
            if (key === 'E') currentSelectedUnit.castSkill(2, unitsRef.current, now);
            if (key === 'R') currentSelectedUnit.castSkill(3, unitsRef.current, now);

            // Consumibles (Z, X, C, V, B)
            if (key === 'Z') currentSelectedUnit.usePotion(0);
            if (key === 'X') currentSelectedUnit.usePotion(1);
            if (key === 'C') currentSelectedUnit.usePotion(2);
            if (key === 'V') currentSelectedUnit.usePotion(3);
            if (key === 'B') currentSelectedUnit.usePotion(4);

            // Stop / Hold Position (S)
            if (key === 'S') {
                currentSelectedUnit.stop();
                currentSelectedUnit.isHoldingPosition = true; // Activar Hold Position
                VisualEffectsSystem.spawnText(currentSelectedUnit.position.x, currentSelectedUnit.position.y, "✋ HOLD", TextType.NORMAL);
            }
        }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.current.delete(e.key.toUpperCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Preparar unidades
    unitsRef.current = initialPlayerUnits.map(u => {
        u.target = null; u.targetUnit = null; u.isMoving = false; u.isSelected = false;
        u.position.x = 200 + (Math.random() * 100);
        u.position.y = window.innerHeight / 2 + (Math.random() * 200 - 100);
        return u;
    });
    groundZonesRef.current = [];
    levelManager.current.reset();

    // Configurar Canvas
    const resizeCanvas = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Iniciar Loop
    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // 2. GAME LOOP PRINCIPAL
  const animate = (time: number) => {
    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    update(time, deltaTime);
    draw();

    // Actualizar UI a 10 FPS aprox para optimizar React
    if (time % 100 < 16) setTick(time); 

    requestRef.current = requestAnimationFrame(animate);
  };

  // 3. ACTUALIZACIÓN LÓGICA (UPDATE)
  const update = (time: number, deltaTime: number) => {
    // Usamos la referencia directa para permitir que los métodos pusheen nuevas unidades (spawns)
    const currentUnits = unitsRef.current;
    const enemiesCount = currentUnits.filter(u => u.team === Team.ENEMY && u.health > 0).length;
    
    // A. Gestión de Niveles
    const levelEvent = levelManager.current.update(deltaTime, enemiesCount);
    if (levelEvent === LevelEvent.SPAWN_WAVE) spawnWave();
    if (levelEvent === LevelEvent.VICTORY && !uiState.isVictory) setUiState(prev => ({ ...prev, isVictory: true }));

    // Actualizar texto de estado UI ocasionalmente
    if (Math.random() < 0.05) {
        setUiState(prev => ({
            ...prev,
            wave: levelManager.current.getWave(),
            status: levelManager.current.getStatusText(enemiesCount)
        }));
    }

    // B. Sistemas de Juego (Pasamos currentUnits para que las muertes/invocaciones afecten al array)
    CombatSystem.update(currentUnits, time);
    VisualEffectsSystem.update();
    updateGroundZones(deltaTime);

    // C. Actualización Individual de Unidades
    // Creamos un snapshot para iterar con seguridad, pero las unidades modifican 'currentUnits'
    const snapshotUnits = [...currentUnits];
    
    snapshotUnits.forEach(u => {
        // Ignorar muertos que aún no han sido limpiados
        if (u.health <= 0) return;

        // Comportamientos específicos (pueden invocar minions -> push a currentUnits)
        if (u instanceof Slime && u.isBoss) u.updateBossBehavior(currentUnits, time);
        if (u.team === Team.PLAYER) u.updateSkills(currentUnits, time);
        
        // Física y Estado General
        u.update(currentUnits, deltaTime);
    });

    // D. Limpieza y Persistencia
    // Filtramos currentUnits (que ahora tiene las nuevas invocaciones)
    const nextFrameUnits: Unit[] = [];
    currentUnits.forEach(u => {
        if (u.health > 0) {
            nextFrameUnits.push(u);
        } else {
            handleUnitDeath(u);
        }
    });
    
    // Actualizamos la referencia para el siguiente frame
    unitsRef.current = nextFrameUnits;
  };

  const spawnWave = () => {
      const config = levelManager.current.getCurrentWaveConfig();
      if (!config || !canvasRef.current) return;
      
      for (let i = 0; i < config.count; i++) {
          const x = canvasRef.current.width - 100 - (Math.random() * 200);
          const y = 100 + Math.random() * (canvasRef.current.height - 200);
          unitsRef.current.push(new Slime(nextIdRef.current++, x, y, config.type as any));
      }
  };

  const updateGroundZones = (deltaTime: number) => {
      groundZonesRef.current = groundZonesRef.current.filter(z => z.timeLeft > 0);
      groundZonesRef.current.forEach(zone => {
          zone.timeLeft -= deltaTime;
          
          // Lógica específica de zonas
          if (zone.type === 'SLIME_GOO') {
              unitsRef.current.forEach(u => {
                  if (u.team === Team.PLAYER && distance(u.position, zone.position) < zone.radius) {
                      u.addModifier({
                          id: `goo_slow_${u.id}`, stat: 'speed', value: -(u.velocity * 0.6), duration: 200, timeRemaining: 200
                      });
                  }
              });
          } else if (zone.type === 'ESSENCE_DROP') {
              // Recolección de Esencia
              const collector = unitsRef.current.find(u => u.team === Team.PLAYER && distance(u.position, zone.position) < u.radius + zone.radius);
              if (collector) {
                  const amount = zone.value || 1;
                  onEssenceCollected(amount);
                  VisualEffectsSystem.spawnText(zone.position.x, zone.position.y, `+${amount} 🔘`, TextType.HEAL); // Usamos HEAL para color verde/positivo
                  zone.timeLeft = 0; // Consumir
              }
          }
      });
  };

  const handleUnitDeath = (u: Unit) => {
      if (u.team === Team.PLAYER) {
          onUnitDeath(u.id);
          if (selectedUnitForUI?.id === u.id) setSelectedUnitForUI(null);
      } else if (u instanceof Slime) {
          // Al morir un slime, deja baba
          groundZonesRef.current.push({
              id: nextIdRef.current++,
              position: { ...u.position },
              radius: u.radius * 2.5,
              timeLeft: 15000,
              type: 'SLIME_GOO'
          });

          // DROP DE ESENCIA
          let essenceAmount = 0;
          const slime = u as Slime; // Casteo seguro ya que comprobamos instanceof
          
          if (slime.isBoss) { // Slime Bastardo
             essenceAmount = Math.floor(Math.random() * (200 - 150 + 1)) + 150; // 150-200
             VisualEffectsSystem.spawnText(u.position.x, u.position.y - 40, "¡BOSS DROP!", TextType.CRITICAL);
          } else if (slime.canSplit) { // Slime Normal (que se divide)
             essenceAmount = Math.floor(Math.random() * 2) + 1; // 1-2
          }
          
          if (essenceAmount > 0) {
              groundZonesRef.current.push({
                  id: nextIdRef.current++,
                  position: { x: u.position.x + (Math.random() * 20 - 10), y: u.position.y + (Math.random() * 20 - 10) },
                  radius: 50, // Radio de recolección
                  timeLeft: 30000, // 30 segundos para recoger
                  type: 'ESSENCE_DROP',
                  value: essenceAmount
              });
          }
      }
  };

  // 4. RENDERIZADO (DRAW)
  const draw = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    RenderSystem.renderGame(
        ctx,
        canvasRef.current.width,
        canvasRef.current.height,
        unitsRef.current,
        groundZonesRef.current,
        inputHandler.current.getSelectionRect()
    );
  };

  // 5. GESTIÓN DE ENTRADA (POINTER EVENTS)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return; // Solo click izq o toque
    
    // Hack: Castear a MouseEvent porque InputHandler es compatible estructuralmente
    const pos = InputHandler.getRelativePos(e as unknown as React.MouseEvent, canvasRef.current);
    inputHandler.current.start(pos.x, pos.y);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    const pos = InputHandler.getRelativePos(e as unknown as React.MouseEvent, canvasRef.current);
    inputHandler.current.move(pos.x, pos.y);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const result = inputHandler.current.end();
    processInputResult(result);
  };

  const processInputResult = (result: InputResult) => {
      // A. SELECCIÓN DE CAJA
      if (result.type === 'BOX' && result.rect) {
          unitsRef.current.forEach(u => {
              if (u.team === Team.PLAYER) u.isSelected = isPointInRect(u.position, result.rect!);
          });
          setSelectedUnitForUI(null);
      } 
      // B. CLIC / TAP INDIVIDUAL (IZQUIERDO)
      else if (result.type === 'TAP' && result.position) {
          const { x, y } = result.position;
          
          // Buscar unidad bajo el cursor (inverso para z-index)
          const clickedUnit = [...unitsRef.current].reverse().find(u => 
              distance({x, y}, u.position) <= u.radius + 15
          );

          const hasSelection = unitsRef.current.some(u => u.isSelected);

          if (clickedUnit) {
              // Clic en unidad -> Seleccionar esta y deseleccionar las demás
              unitsRef.current.forEach(u => u.isSelected = false);
              
              // Solo marcamos isSelected si es del jugador para controlarla
              if (clickedUnit.team === Team.PLAYER) {
                  clickedUnit.isSelected = true;
              }
              // Siempre mostramos UI
              setSelectedUnitForUI(clickedUnit);
          } else {
              // Clic en vacío
              if (hasSelection) {
                  // Si había selección -> Deseleccionar todo
                  unitsRef.current.forEach(u => u.isSelected = false);
                  setSelectedUnitForUI(null);
              } else {
                  // Si no había selección -> No pasa nada
              }
          }
      }
  };

  const executeActionCommand = (x: number, y: number, target: Unit | null) => {
      // Detectar modificador de Attack Move (Tecla A)
      const isAttackMoveCommand = keysPressed.current.has('A');

      // Clic derecho: Interacciones Inteligentes
      unitsRef.current.forEach(u => {
          if (u.isSelected && u.team === Team.PLAYER) {
              if (target) {
                  if (target.team === Team.ENEMY) {
                      // Clic en enemigo -> Atacar
                      u.setAttackTarget(target);
                      VisualEffectsSystem.spawnText(target.position.x, target.position.y - 20, "⚔️", TextType.NORMAL);
                  } else if (target.team === Team.PLAYER) {
                      // Clic en aliado
                      const isHealer = u.equipment.rightHand?.weaponStats?.isHealer || u.equipment.leftHand?.weaponStats?.isHealer;
                      
                      if (isHealer) {
                          // Si tiene arma sanadora -> Sanar (Atacar aliado)
                          u.setAttackTarget(target);
                          VisualEffectsSystem.spawnText(target.position.x, target.position.y - 20, "➕", TextType.HEAL);
                      } else {
                          // Si no -> Moverse a la posición
                          u.moveTo(target.position.x, target.position.y);
                          if (isAttackMoveCommand) u.isAttackMoving = true; // Aplicar Attack Move incluso si es sobre aliado (raro pero posible)
                          VisualEffectsSystem.spawnText(target.position.x, target.position.y, "📍", TextType.NORMAL);
                      }
                  }
              } else {
                  // Clic en vacío -> Moverse
                  u.moveTo(x, y);
                  
                  if (isAttackMoveCommand) {
                      u.isAttackMoving = true;
                      VisualEffectsSystem.spawnText(x, y, "⚔️ A-Move", TextType.CRITICAL); // Feedback visual distinto
                  } else {
                      VisualEffectsSystem.spawnText(x, y, "📍", TextType.NORMAL);
                  }
              }
          }
      });
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault(); // Evitar menú navegador
      if (!canvasRef.current) return;
      const pos = InputHandler.getRelativePos(e, canvasRef.current);
      
      // Buscar objetivo preciso para click derecho (inverso para z-index)
      const target = [...unitsRef.current].reverse().find(u => 
          distance(pos, u.position) <= u.radius + 10
      ) || null;

      executeActionCommand(pos.x, pos.y, target);
  };

  // --- INTERFAZ DE USUARIO (HANDLERS) ---
  
  const handleCastSkill = (index: number) => selectedUnitForUI?.castSkill(index, unitsRef.current, performance.now());
  const handleToggleAutoCast = (index: number) => {
      if (selectedUnitForUI?.skills[index]) selectedUnitForUI.skills[index].isAutoCast = !selectedUnitForUI.skills[index].isAutoCast;
  };
  const handleUsePotion = (index: number) => selectedUnitForUI?.usePotion(index);

  // Renderizado UI JSX
  return (
    <>
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair bg-stone-900 select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
      />
      
      {/* HUD HEADER */}
      <div className="absolute top-0 w-full p-4 pointer-events-none flex justify-center z-10">
          <div className="bg-black/60 backdrop-blur-sm border-b-2 border-green-600 px-8 py-2 rounded-b-xl flex gap-8 items-center shadow-lg text-white">
              <div className="text-center">
                  <div className="text-xs text-green-400 font-bold uppercase tracking-wider">Praderas Esmeralda</div>
                  <div className="text-2xl font-bold font-mono">Oleada {uiState.wave}/{levelManager.current.getTotalWaves()}</div>
              </div>
              <div className="h-8 w-px bg-white/20"></div>
              <div className="text-xl font-bold text-yellow-400 min-w-[150px] text-center">{uiState.status}</div>
          </div>
      </div>

      <button onClick={onExit} className="absolute top-4 left-4 z-20 bg-red-900/50 hover:bg-red-700 text-white border border-red-500 px-4 py-2 rounded font-bold pointer-events-auto">
         ← Retirada
      </button>

      <button 
          onClick={toggleFullscreen} 
          className="absolute top-4 right-4 z-20 bg-stone-800/80 hover:bg-stone-700 text-white border border-stone-600 px-3 py-2 rounded font-bold pointer-events-auto flex items-center gap-2 shadow-lg backdrop-blur-sm transition-all active:scale-95"
          title={isFullscreen ? "Salir de Pantalla Completa" : "Pantalla Completa"}
      >
         {isFullscreen ? '🔽 Salir' : '⛶ Pantalla Completa'}
      </button>

      {/* PANEL VICTORIA */}
      {uiState.isVictory && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
              <div className="bg-stone-900 border-2 border-yellow-500 p-10 rounded-xl text-center max-w-md w-full">
                  <div className="text-6xl mb-4">🏆</div>
                  <h2 className="text-4xl font-extrabold text-yellow-500 mb-2 uppercase">¡Victoria!</h2>
                  <p className="text-stone-400 mb-8">Has purgado la zona.</p>
                  <button onClick={() => onVictory(250)} className="w-full py-4 bg-green-700 hover:bg-green-600 text-white font-bold rounded text-xl shadow-lg">
                      Reclamar Recompensa (+250 📀)
                  </button>
              </div>
          </div>
      )}

      {/* BARRA DE HABILIDADES */}
      {selectedUnitForUI && selectedUnitForUI.health > 0 && !uiState.isVictory && (
        <>
            {/* BARRA CENTRAL: INFO + SKILLS */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex items-end gap-4 pointer-events-none animate-fade-in-up">
                {/* Info Unidad */}
                <div className="bg-stone-900/90 border border-stone-600 rounded-lg p-3 flex items-center gap-3 text-white shadow-xl pointer-events-auto backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center overflow-hidden bg-black shadow-inner" style={{ borderColor: selectedUnitForUI.color }}>
                        <GameIcon icon={selectedUnitForUI.icon} className="w-full h-full scale-75" />
                    </div>
                    <div>
                        <div className="font-bold text-base leading-none text-stone-100">{selectedUnitForUI.name}</div>
                        <div className="text-xs text-blue-400 mt-1 font-mono">{Math.floor(selectedUnitForUI.energy)} MP</div>
                    </div>
                </div>
    
                {/* Skills */}
                <div className="flex gap-3 pointer-events-auto p-1 bg-black/20 rounded-xl backdrop-blur-sm">
                    {selectedUnitForUI.skills.map((skill, idx) => {
                        const remaining = Math.max(0, (skill.lastUsed + skill.cooldown) - performance.now());
                        const canCast = remaining <= 0 && selectedUnitForUI.energy >= skill.energyCost;
                        return (
                            <button
                                key={skill.id}
                                onClick={() => handleCastSkill(idx)}
                                onContextMenu={(e) => { e.preventDefault(); handleToggleAutoCast(idx); }}
                                onTouchStart={() => { longPressTimerRef.current = setTimeout(() => handleToggleAutoCast(idx), 500); }}
                                onTouchEnd={() => { if(longPressTimerRef.current) clearTimeout(longPressTimerRef.current); }}
                                className={`relative w-16 h-16 rounded-lg border-2 flex items-center justify-center text-3xl shadow-lg transition-all transform hover:scale-105 active:scale-95
                                    ${canCast ? 'bg-stone-800 border-stone-500 hover:border-yellow-400 hover:shadow-yellow-900/20' : 'bg-stone-900 border-stone-800 opacity-60 grayscale'}
                                    ${skill.isAutoCast ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black' : ''}`}
                            >
                                <span>{skill.icon}</span>
                                {remaining > 0 && (
                                    <div className="absolute inset-0 bg-black/80 rounded-lg flex items-center justify-center text-white text-lg font-bold font-mono">
                                        {(remaining/1000).toFixed(1)}
                                    </div>
                                )}
                                <div className="absolute -top-2 -right-2 bg-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-black text-white shadow-sm">{skill.energyCost}</div>
                                {skill.isAutoCast && <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-[9px] font-bold px-1.5 rounded border border-black text-white shadow-sm tracking-tighter">AUTO</div>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* CINTURÓN DE POCIONES (DERECHA) */}
            <div className="absolute bottom-8 right-8 z-20 flex flex-col gap-2 pointer-events-auto animate-fade-in-right">
                <div className="bg-stone-900/90 border border-stone-600 p-3 rounded-xl shadow-2xl backdrop-blur-md flex gap-2">
                    {selectedUnitForUI.equipment.potions.map((p, i) => (
                        <button 
                            key={i} 
                            onClick={() => handleUsePotion(i)} 
                            disabled={!p} 
                            className={`relative w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl transition-all transform hover:scale-110
                            ${p ? 'bg-stone-800 border-stone-500 hover:border-green-400 hover:shadow-green-900/30' : 'bg-black/40 border-stone-800 border-dashed opacity-40'}`}
                            title={p ? p.name : "Vacío"}
                        >
                            {p?.icon}
                            {p && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-stone-700 rounded-full text-[10px] flex items-center justify-center border border-stone-500">1</div>}
                        </button>
                    ))}
                </div>
                <div className="text-center text-[10px] text-stone-500 font-bold uppercase tracking-widest bg-black/40 rounded py-0.5">Cinturón</div>
            </div>
        </>
      )}
    </>
  );
};