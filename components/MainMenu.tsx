import React from 'react';

interface MainMenuProps {
  onStart: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStart }) => {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-950 text-white select-none">
      
      {/* Contenedor del Título */}
      <div className="mb-16 text-center transform hover:scale-105 transition-transform duration-700">
        {/* EXCALIBUR: Dorado Neón */}
        <h1 
          className="text-7xl md:text-9xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-2"
          style={{ 
            textShadow: '0 0 15px rgba(234, 179, 8, 0.6), 0 0 30px rgba(234, 179, 8, 0.4)',
            filter: 'drop-shadow(0 0 10px rgba(250, 204, 21, 0.8))'
          }}
        >
          EXCALIBUR
        </h1>
        
        {/* world: Verde pequeño */}
        <h2 
          className="text-2xl md:text-3xl font-mono text-green-500 tracking-[0.6em] uppercase mt-[-10px]"
          style={{ textShadow: '0 0 8px rgba(34, 197, 94, 0.8)' }}
        >
          world
        </h2>
      </div>

      {/* Botón de Inicio */}
      <button
        onClick={onStart}
        className="group relative px-12 py-4 bg-stone-900 border-2 border-stone-700 rounded hover:border-yellow-500 hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all duration-300 active:scale-95"
      >
        <span className="text-xl font-bold text-stone-300 group-hover:text-yellow-400 tracking-wider">
          JUGAR
        </span>
        
        {/* Efecto decorativo en esquinas del botón */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-stone-500 group-hover:border-yellow-400 transition-colors"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-stone-500 group-hover:border-yellow-400 transition-colors"></div>
      </button>

      <div className="absolute bottom-4 text-stone-600 text-sm">
        v0.0.2 - Pre-Alpha
      </div>
    </div>
  );
};