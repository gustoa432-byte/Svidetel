import { useState, useRef, useEffect, useCallback } from 'react';

// Пороги (настроены по логам)
const PEAK_HIGH = 134.0;
const PEAK_LOW = 118.5;

let audioDrop: HTMLAudioElement | null = null;
let audioPeak: HTMLAudioElement | null = null;
let audioFreeze: HTMLAudioElement | null = null;
let audioMirror: HTMLAudioElement | null = null;
let audioDiamond: HTMLAudioElement | null = null;

if (typeof window !== 'undefined') {
  // Имитируем "мяу", "гав" и "кар" с помощью открытого Google TTS API для роботизированного эффекта
  audioDrop = new Audio('https://translate.google.com/translate_tts?ie=UTF-8&q=%D0%9C%D1%8F%D1%83&tl=ru&client=tw-ob'); // Мяу
  audioPeak = new Audio('https://translate.google.com/translate_tts?ie=UTF-8&q=%D0%93%D0%B0%D0%B2&tl=ru&client=tw-ob'); // Гав
  audioFreeze = new Audio('https://translate.google.com/translate_tts?ie=UTF-8&q=%D0%9A%D0%B0%D1%80&tl=ru&client=tw-ob'); // Кар
  audioMirror = new Audio('https://translate.google.com/translate_tts?ie=UTF-8&q=%D0%94%D0%B7%D0%B8%D0%BD%D1%8C&tl=ru&client=tw-ob'); // Дзинь
  audioDiamond = new Audio('https://translate.google.com/translate_tts?ie=UTF-8&q=%D0%91%D1%80%D0%B8%D0%BB%D0%BB%D0%B8%D0%B0%D0%BD%D1%82&tl=ru&client=tw-ob'); // Бриллиант

  audioDrop.load();
  audioPeak.load();
  audioFreeze.load();
  audioMirror.load();
  audioDiamond.load();
}

interface LogEntry {
  id: string;
  time: string;
  msg: string;
  type: 'freeze' | 'peak' | 'drop' | 'startstop' | 'time';
}

export default function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [freezes, setFreezes] = useState(0);
  const [peaks, setPeaks] = useState(0);
  const [minEnt, setMinEnt] = useState(999);
  const [singularities, setSingularities] = useState(0);
  const [diamonds, setDiamonds] = useState(0);
  const [signalValue, setSignalValue] = useState("-");
  const [signalReason, setSignalReason] = useState("ОЖИДАНИЕ");
  const [isSignalActive, setIsSignalActive] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hasData, setHasData] = useState(false);

  // Refs for loop and stats (to avoid dependency cycles and strict mode double-renders)
  const fullLogsRef = useRef<LogEntry[]>([]);
  const isRunningRef = useRef(false);
  const previousSumRef = useRef<number | null>(null);
  const signalTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const freezesRef = useRef(0);
  const peaksRef = useRef(0);
  const minEntRef = useRef(999);
  const singularitiesRef = useRef(0);
  const diamondsRef = useRef(0);

  const getTimestamp = () => {
    const now = new Date();
    return `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
  };

  const addLog = useCallback((msg: string, type: LogEntry['type']) => {
    const newEntry = { id: Math.random().toString(36).substring(2), time: getTimestamp(), msg, type };
    fullLogsRef.current.push(newEntry);
    setLogs((prev) => {
      const newLogs = [newEntry, ...prev];
      if (newLogs.length > 50) return newLogs.slice(0, 50);
      return newLogs;
    });
  }, []);

  const triggerSignal = useCallback((reason: string) => {
    setSignalValue("1");
    setSignalReason(reason);
    setIsSignalActive(true);

    if (signalTimeoutRef.current) clearTimeout(signalTimeoutRef.current);
    signalTimeoutRef.current = setTimeout(() => {
      if (isRunningRef.current) {
        setSignalValue("0");
        setSignalReason("БЕЛЫЙ ШУМ (dS/dt норма)");
        setIsSignalActive(false);
      }
    }, 200);
  }, []);

  const scanMatrix = useCallback(async () => {
    const buffer = new Uint8Array(1024);
    let intHistory: number[] = [];

    const loop = async () => {
      if (!isRunningRef.current) return;

      crypto.getRandomValues(buffer);
      
      let sum = 0;
      for (let i = 0; i < 1024; i++) sum += buffer[i];
      let mean = sum / 1024;

      if (mean < minEntRef.current) {
        minEntRef.current = mean;
        setMinEnt(mean);
      }

      const prevSum = previousSumRef.current;
      
      if (prevSum !== null && sum === prevSum) {
        freezesRef.current++;
        setFreezes(freezesRef.current);
        triggerSignal(`ЗАМОРОЗКА КАДРА (dS=0): ${mean.toFixed(2)}`);
        addLog(`Сингулярность: dS=0 (${mean.toFixed(2)})`, 'freeze');
        if (audioFreeze) {
          audioFreeze.currentTime = 0;
          audioFreeze.play().catch(() => {});
        }
      } else if (mean > PEAK_HIGH) {
        peaksRef.current++;
        setPeaks(peaksRef.current);
        triggerSignal(`ЭНЕРГО-ПИК: ${mean.toFixed(2)}`);
        addLog(`Выброс энергии: ${mean.toFixed(2)}`, 'peak');
        if (audioPeak) {
          audioPeak.currentTime = 0;
          audioPeak.play().catch(() => {});
        }
      } else if (mean < PEAK_LOW) {
        triggerSignal(`ГЛУБОКИЙ СРЫВ: ${mean.toFixed(2)}`);
        addLog(`Пробой поля: ${mean.toFixed(2)}`, 'drop');
        if (audioDrop) {
          audioDrop.currentTime = 0;
          audioDrop.play().catch(() => {});
        }
      }

      let intMean = Math.round(mean);
      intHistory.push(intMean);

      if (intHistory.length > 7) {
          intHistory.shift();
      }

      if (intHistory.length === 7) {
          let [a, b, c, d, e, f, g] = intHistory;

          if (a === g && b === f && c === e && a !== b && b !== c && c !== d) {
              singularitiesRef.current++;
              setSingularities(singularitiesRef.current);
              diamondsRef.current++;
              setDiamonds(diamondsRef.current);
              triggerSignal(`💎 БРИЛЛИАНТ: ${a}-${b}-${c}-${d}-${e}-${f}-${g}`);
              addLog(`Сингулярный Бриллиант 7D: ${a}-${b}-${c}-${d}-${e}-${f}-${g}`, 'freeze');
              
              if (audioDiamond) {
                  audioDiamond.currentTime = 0;
                  audioDiamond.play().catch(() => {});
              }
              intHistory = []; 
          }
          else if (c === g && d === f && c !== d && d !== e) {
              singularitiesRef.current++;
              setSingularities(singularitiesRef.current);
              triggerSignal(`МАКРО-ЗЕРКАЛО: ${c}-${d}-${e}-${f}-${g}`);
              addLog(`Симметрия 5D: ${c}-${d}-${e}-${f}-${g}`, 'time');
              
              if (audioMirror) {
                  audioMirror.currentTime = 0;
                  audioMirror.play().catch(() => {});
              }
              intHistory = [];
          }
          else if (e === g && e !== f) {
              // printLog(`Микро-пульс: ${e}-${f}-${g}`, 'time'); 
          }
      }

      previousSumRef.current = sum;

      // Micro-pause to allow UI render
      await new Promise((r) => setTimeout(r, 0));
      
      if (isRunningRef.current) {
         requestAnimationFrame(loop);
      }
    };

    loop();
  }, [addLog, triggerSignal]);

  const exportCSV = useCallback(() => {
    if (fullLogsRef.current.length === 0) return;
    const headers = ['Time', 'Type', 'Message'];
    const rows = fullLogsRef.current.map(log => `"${log.time}","${log.type}","${log.msg}"`);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `singularity_session_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleStart = () => {
    setIsRunning(true);
    isRunningRef.current = true;
    previousSumRef.current = null;
    fullLogsRef.current = [];
    setHasData(true);
    
    setSignalValue("0");
    setSignalReason("БЕЛЫЙ ШУМ (dS/dt норма)");
    setIsSignalActive(false);
    
    addLog("Сканирование матрицы запущено...", "startstop");
    scanMatrix();
  };

  const handleStop = () => {
    setIsRunning(false);
    isRunningRef.current = false;
    setSignalValue("-");
    setSignalReason("ОЖИДАНИЕ");
    setIsSignalActive(false);
    if (signalTimeoutRef.current) clearTimeout(signalTimeoutRef.current);
    addLog("Сканирование остановлено.", "startstop");
  };

  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      if (signalTimeoutRef.current) clearTimeout(signalTimeoutRef.current);
    };
  }, []);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'freeze': return 'text-[#0ff] font-bold';
      case 'peak': return 'text-[#ff0] font-bold';
      case 'drop': return 'text-[#f0f] font-bold';
      case 'time': return 'text-[#88ff88]';
      default: return 'text-[#0f0]';
    }
  };

  return (
    <div className="bg-[#050505] text-[#0f0] font-mono p-5 m-0 flex flex-col h-screen box-border overflow-hidden">
      <h2 className="text-center text-[#55ff55] m-0 mb-2 md:mb-4 text-sm md:text-[1.2rem] font-bold tracking-wider">
        СВИДЕТЕЛЬ v2.0 (Сингулярность)
      </h2>
      
      <div className="flex gap-2.5 mb-5 md:mb-8 shrink-0">
        <button 
          onClick={handleStart}
          disabled={isRunning}
          className={`flex-1 p-[15px] text-base font-bold border-none rounded md:rounded-md cursor-pointer transition-colors active:bg-white select-none
            ${isRunning 
              ? 'bg-[#333] text-[#888] pointer-events-none' 
              : 'bg-[#0f0] text-black hover:bg-[#20ff20]'}`}
        >
          ЗАПУСК
        </button>
        <button 
          onClick={handleStop}
          disabled={!isRunning}
          className={`flex-1 p-[15px] text-base font-bold border-none rounded md:rounded-md cursor-pointer transition-colors select-none
            ${!isRunning 
              ? 'bg-[#333] text-[#888] pointer-events-none' 
              : 'bg-[#f00] text-white active:bg-white hover:bg-[#ff3333]'}`}
        >
          СТОП
        </button>
      </div>

      {!isRunning && hasData && (
        <button 
          onClick={exportCSV}
          className="w-full p-2.5 mb-5 md:mb-8 text-sm md:text-base font-bold border border-[#00aa88] rounded md:rounded-md cursor-pointer transition-colors bg-[#00221a] text-[#00ffcc] hover:bg-[#003326] active:bg-[#00ffcc] active:text-black shrink-0"
        >
          ВЫГРУЗИТЬ ДАННЫЕ О СЕССИИ (CSV)
        </button>
      )}

      <div 
        className={`text-center p-5 border-2 rounded-lg mb-5 bg-[#0a0a0a] transition-all duration-100 shrink-0
          ${isSignalActive 
            ? 'text-[#f0f] border-[#f0f] shadow-[0_0_20px_rgba(255,0,255,0.5)] bg-[#200020]' 
            : 'text-[#0f0] border-[#0f0] shadow-none'}`}
      >
        <div className="text-[60px] md:text-[80px] font-bold leading-none my-2.5">
          {signalValue}
        </div>
        <div className="text-sm text-[#ccc] min-h-[20px]">
          {signalReason}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[10px] md:text-xs text-[#aaa] mb-2.5 shrink-0 justify-center">
        <div className="bg-[#111] p-2 rounded flex-1 min-w-[28%] text-center flex flex-col justify-between">
          <span className="leading-tight">Заморозки</span>
          <span className="text-base md:text-lg text-white font-bold mt-1">{freezes}</span>
        </div>
        <div className="bg-[#111] p-2 rounded flex-1 min-w-[28%] text-center flex flex-col justify-between">
          <span className="leading-tight">Энерго-пики</span>
          <span className="text-base md:text-lg text-white font-bold mt-1">{peaks}</span>
        </div>
        <div className="bg-[#111] p-2 rounded flex-1 min-w-[28%] text-center flex flex-col justify-between">
          <span className="leading-tight">Абсолютное дно</span>
          <span className="text-base md:text-lg text-white font-bold mt-1">{minEnt === 999 ? '999' : minEnt.toFixed(2)}</span>
        </div>
        <div className="bg-[#111] p-2 rounded flex-1 min-w-[45%] text-center flex flex-col justify-between">
          <span className="leading-tight">Сингулярности (5D)</span>
          <span className="text-base md:text-lg text-white font-bold mt-1">{singularities}</span>
        </div>
        <div className="bg-[#111] p-2 rounded flex-[2] min-w-[45%] text-center flex flex-col justify-between border border-[#0ff]/30 shadow-[0_0_10px_rgba(0,255,255,0.1)]">
          <span className="leading-tight text-[#0ff]">💎 Бриллианты 7D</span>
          <span className="text-base md:text-lg text-[#0ff] font-bold mt-1">{diamonds}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-black p-2.5 border border-[#222] rounded text-[10px] md:text-xs flex flex-col gap-1 pr-[5px]">
        {logs.map((log) => (
          <div key={log.id} className="border-b border-[#111] pb-0.5 break-words">
            [{' '}<span className="text-[#88ff88]">{log.time}</span>{' '}] 
            <span className={`ml-1 ${getLogColor(log.type)}`}>
              {log.msg}
            </span>
          </div>
        ))}
        {logs.length === 0 && (
          <div className="text-[#555] italic text-center mt-4 border-b-0">
            Ожидание запуска квантового сканирования...
          </div>
        )}
      </div>
    </div>
  );
}

