import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const NotFound = React.memo(() => {
  const [gameStarted, setGameStarted] = useState(false);
  const [target, setTarget] = useState(null);
  const [message, setMessage] = useState("Guess a number between 1-100!");
  const [attempts, setAttempts] = useState(0);

  const startGame = () => {
    setTarget(Math.floor(Math.random() * 100) + 1);
    setGameStarted(true);
    setAttempts(0);
    setMessage("I've picked a number (1-100). Good luck! 🎯");
  };

  const handleGuess = (num) => {
    setAttempts(prev => prev + 1);
    if (num === target) {
      setMessage(`Boom! It was ${target}. You found it in ${attempts + 1} tries! 🎉`);
    } else {
      setMessage(num < target ? "Too low! ⬆️" : "Too high! ⬇️");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-[120px] font-black text-indigo-600 leading-none">404</h1>
      <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-8">Page Not Found</p>

      {!gameStarted ? (
        <div 
          className="cursor-pointer p-8 bg-white dark:bg-[#1e293b] shadow-xl rounded-3xl hover:scale-105 transition-all border border-indigo-100" 
          onClick={startGame}
        >
          <span className="text-5xl">🎮</span>
          <p className="mt-4 font-bold text-indigo-600">Play: Guess (1-100)</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1e293b] p-6 rounded-3xl shadow-2xl w-full max-w-md border border-indigo-100">
          <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Guess the Number (1-100)</h3>
          
          {/* Input field for 1-100 to keep it clean */}
          <div className="flex gap-2 justify-center mb-4">
             <input 
               type="number" 
               placeholder="Enter 1-100"
               className="w-32 p-2 border rounded-lg text-center dark:bg-slate-800 dark:text-white"
               onKeyDown={(e) => {
                 if (e.key === 'Enter') handleGuess(parseInt(e.target.value));
               }}
             />
             <button 
               onClick={(e) => handleGuess(parseInt(e.target.previousSibling.value))}
               className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold"
             >
               Guess
             </button>
          </div>

          <p className="font-semibold text-indigo-600 text-sm h-12 flex items-center justify-center bg-indigo-50 dark:bg-slate-800 rounded-xl px-4">
            {message}
          </p>

          <button onClick={() => setGameStarted(false)} className="mt-4 text-xs text-slate-400 underline">Quit</button>
        </div>
      )}

    <Link to="/" className="mt-12 px-8 py-3 bg-indigo-600 text-white font-bold rounded-full shadow-lg hover:bg-indigo-700 transition-all">
      Back Home
      </Link>
    </div>
  );
});

export default NotFound;