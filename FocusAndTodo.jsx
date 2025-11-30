import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Trash2, Check, Clock, Calendar, CheckCircle2, Circle, Mic, MicOff, Trophy } from 'lucide-react';

export default function App() {
  // --- 状态管理：番茄钟 ---
  const [timerMode, setTimerMode] = useState('focus'); // focus, shortBreak, longBreak
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0); // 番茄数统计
  
  // 颜色配置：淡雅绿色系
  const modes = {
    focus: { 
      label: '专注', 
      time: 25 * 60, 
      color: 'bg-emerald-500', 
      lightColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      btnColor: 'text-emerald-500'
    },
    shortBreak: { 
      label: '小憩', 
      time: 5 * 60, 
      color: 'bg-teal-400', 
      lightColor: 'bg-teal-50',
      textColor: 'text-teal-600',
      btnColor: 'text-teal-500'
    },
    longBreak: { 
      label: '长休', 
      time: 15 * 60, 
      color: 'bg-cyan-500', 
      lightColor: 'bg-cyan-50',
      textColor: 'text-cyan-600',
      btnColor: 'text-cyan-500'
    },
  };

  // --- 状态管理：待办事项 ---
  const [tasks, setTasks] = useState([
    { id: 1, time: '09:00', content: '晨间计划', completed: true },
    { id: 2, time: '14:00', content: '深度工作时间', completed: false },
  ]);
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isListening, setIsListening] = useState(false);

  // --- 语音识别逻辑 ---
  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        // 自动将识别结果填入内容框
        setNewTaskContent((prev) => prev ? prev + ' ' + transcript : transcript);
        
        // 尝试从语音结果中自动提取时间并设置（可选）
        const { time } = parseTimeFromText(transcript);
        if (time) setNewTaskTime(time);
      };

      recognition.start();
    } else {
      alert('您的浏览器暂不支持语音识别功能，请尝试使用 Chrome 浏览器。');
    }
  };

  // --- 智能文本识别逻辑 (一句话识别) ---
  const parseTimeFromText = (text) => {
    // 匹配格式: 18:00, 18：00, 6点30, 6点, 18点半
    const timeRegex = /(\d{1,2})[:：](\d{2})|(\d{1,2})\s*[点](?:\s*(\d{1,2}|半)\s*[分]?)?/;
    const match = text.match(timeRegex);
    
    let time = '';
    let cleanText = text;

    if (match) {
      let hour, minute;
      
      if (match[1]) {
        // 匹配 18:00
        hour = parseInt(match[1]);
        minute = parseInt(match[2]);
      } else {
        // 匹配 18点...
        hour = parseInt(match[3]);
        const minStr = match[4];
        if (minStr === '半') minute = 30;
        else if (minStr) minute = parseInt(minStr);
        else minute = 0;
      }

      // 简单的时间校验
      if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
        time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        // 从原文中移除时间字符串，让内容更干净
        cleanText = text.replace(match[0], '').trim();
      }
    }
    
    return { time, cleanText };
  };

  // --- 番茄钟逻辑 ---
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (timerMode === 'focus') {
        setCompletedPomodoros(prev => prev + 1);
      }
      // 播放提示音逻辑 (此处省略)
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, timerMode]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(modes[timerMode].time);
  };

  const switchMode = (mode) => {
    setTimerMode(mode);
    setIsActive(false);
    setTimeLeft(modes[mode].time);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 进度条计算
  const progress = ((modes[timerMode].time - timeLeft) / modes[timerMode].time) * 100;

  // --- 待办事项逻辑 ---
  const addTask = (e) => {
    e.preventDefault();
    if (!newTaskContent.trim()) return;

    let finalTime = newTaskTime;
    let finalContent = newTaskContent;

    // 如果没有手动设置时间，尝试从文本中智能解析
    if (!finalTime) {
      const parsed = parseTimeFromText(newTaskContent);
      if (parsed.time) {
        finalTime = parsed.time;
        finalContent = parsed.cleanText || newTaskContent; // 如果删减后为空，则保留原样
      }
    }

    const newTask = {
      id: Date.now(),
      time: finalTime || '--:--',
      content: finalContent,
      completed: false,
    };
    
    const updatedTasks = [...tasks, newTask].sort((a, b) => {
      if (a.time === '--:--') return 1;
      if (b.time === '--:--') return -1;
      return a.time.localeCompare(b.time);
    });

    setTasks(updatedTasks);
    setNewTaskContent('');
    setNewTaskTime('');
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 md:p-8 font-sans text-slate-700">
      <div className="bg-white w-full max-w-6xl rounded-[32px] shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[640px]">
        
        {/* --- 左侧：待办事项区域 (现在在左边) --- */}
        <div className="w-full md:w-7/12 bg-white p-6 md:p-10 flex flex-col order-2 md:order-1 relative">
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className={`text-3xl font-bold tracking-tight ${modes[timerMode].textColor}`}>今日计划</h2>
              <p className="text-gray-400 text-sm mt-1 font-medium">
                {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
              </p>
            </div>
            <div className={`p-3 rounded-2xl ${modes[timerMode].lightColor} ${modes[timerMode].textColor}`}>
               <Calendar size={24} />
            </div>
          </div>

          {/* 智能输入区域 */}
          <form onSubmit={addTask} className="bg-white p-2 pr-3 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center gap-2 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
             <div className="relative group">
                <input
                  type="time"
                  value={newTaskTime}
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  className="w-24 pl-3 pr-1 py-3 bg-gray-50 border-none rounded-xl text-xs font-mono text-gray-500 focus:bg-emerald-50 focus:text-emerald-700 outline-none transition-colors cursor-pointer"
                />
             </div>
            
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="输入任务，或直接写 '18:00 健身'..."
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
                className="w-full py-3 px-2 text-base outline-none placeholder:text-gray-300 text-gray-700 bg-transparent"
              />
            </div>

            <button 
              type="button"
              onClick={startListening}
              className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'hover:bg-gray-100 text-gray-400'}`}
              title="语音输入"
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <button 
              type="submit"
              disabled={!newTaskContent.trim()}
              className={`p-3 rounded-xl text-white font-medium transition-transform active:scale-95 shadow-md flex items-center justify-center ${
                newTaskContent.trim() ? modes[timerMode].color : 'bg-gray-200 cursor-not-allowed shadow-none'
              }`}
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          </form>

          {/* 任务列表 */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 pb-10">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} className="opacity-30" />
                </div>
                <p>享受当下，或者添加一个新的待办</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div 
                  key={task.id}
                  className={`group flex items-center p-4 rounded-2xl transition-all duration-300 hover:shadow-lg hover:shadow-emerald-50/50 border ${
                    task.completed 
                      ? 'bg-gray-50 border-transparent' 
                      : 'bg-white border-gray-100 hover:border-emerald-100'
                  }`}
                >
                  <button 
                    onClick={() => toggleTask(task.id)}
                    className={`mr-4 transition-all duration-300 transform active:scale-90 ${
                      task.completed ? 'text-gray-300' : `${modes[timerMode].textColor} hover:scale-110`
                    }`}
                  >
                    {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                  </button>
                  
                  <div className="flex-1 min-w-0 flex flex-col">
                    <span className={`text-base font-medium truncate transition-all ${
                      task.completed ? 'text-gray-400 line-through decoration-gray-300' : 'text-slate-700'
                    }`}>
                      {task.content}
                    </span>
                    {task.time !== '--:--' && (
                       <span className={`text-xs mt-1 font-mono ${task.completed ? 'text-gray-300' : 'text-emerald-500'}`}>
                         {task.time}
                       </span>
                    )}
                  </div>

                  <button 
                    onClick={() => deleteTask(task.id)}
                    className="ml-3 p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- 右侧：番茄钟区域 (现在在右边) --- */}
        <div className={`w-full md:w-5/12 ${modes[timerMode].color} transition-colors duration-700 p-8 flex flex-col justify-between text-white relative overflow-hidden order-1 md:order-2`}>
          
          {/* 装饰性背景 */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* 番茄统计 */}
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex space-x-1 p-1 bg-black/10 rounded-lg backdrop-blur-sm">
                {Object.keys(modes).map((m) => (
                <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    timerMode === m 
                        ? 'bg-white text-emerald-600 shadow-sm' 
                        : 'text-white/70 hover:bg-white/10'
                    }`}
                >
                    {modes[m].label}
                </button>
                ))}
            </div>
            
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-md">
                <Trophy size={14} className="text-yellow-300" />
                <span className="text-sm font-bold">{completedPomodoros}</span>
            </div>
          </div>

          {/* 计时器显示 & 番茄图标 */}
          <div className="flex-1 flex flex-col items-center justify-center z-10 relative mt-4">
            
            {/* 番茄 SVG 图标 */}
            <div className="mb-6 relative">
                 {/* 如果是专注模式，显示番茄，否则显示咖啡杯或者其他 */}
                 {timerMode === 'focus' ? (
                     <div className={`transition-transform duration-500 ${isActive ? 'scale-110' : 'scale-100'}`}>
                         <svg width="120" height="120" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
                             {/* 番茄身体 */}
                             <path d="M50 90C75 90 90 75 90 55C90 35 75 20 50 20C25 20 10 35 10 55C10 75 25 90 50 90Z" fill="#ff6b6b" />
                             <path d="M50 90C75 90 90 75 90 55C90 35 75 20 50 20" fill="url(#paint0_linear)" fillOpacity="0.4"/>
                             {/* 高光 */}
                             <ellipse cx="35" cy="40" rx="10" ry="5" transform="rotate(-30 35 40)" fill="white" fillOpacity="0.3"/>
                             {/* 叶子 */}
                             <path d="M50 20C50 20 45 5 35 10" stroke="#4ade80" strokeWidth="4" strokeLinecap="round"/>
                             <path d="M50 20C50 20 55 5 65 10" stroke="#4ade80" strokeWidth="4" strokeLinecap="round"/>
                             <path d="M50 20L50 5" stroke="#4ade80" strokeWidth="4" strokeLinecap="round"/>
                             <defs>
                                 <linearGradient id="paint0_linear" x1="50" y1="20" x2="50" y2="90" gradientUnits="userSpaceOnUse">
                                     <stop stopColor="white" stopOpacity="0.2"/>
                                     <stop offset="1" stopColor="black" stopOpacity="0.1"/>
                                 </linearGradient>
                             </defs>
                         </svg>
                     </div>
                 ) : (
                     <div className="bg-white/20 p-6 rounded-full">
                         <Clock size={64} className="text-white/90" />
                     </div>
                 )}
            </div>

            <div className="text-center">
                <span className="text-8xl font-bold tracking-tighter font-mono drop-shadow-sm">
                  {formatTime(timeLeft)}
                </span>
                <p className="text-white/80 mt-2 font-medium tracking-wide text-lg uppercase">
                  {isActive ? 'Keep Focusing' : 'Ready to Start?'}
                </p>
            </div>
          </div>

          {/* 进度条 (细条放在底部) */}
          <div className="absolute bottom-0 left-0 w-full h-2 bg-black/10">
              <div 
                className="h-full bg-white/50 transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              ></div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-center gap-8 z-10 mb-8 md:mb-4">
            <button 
              onClick={resetTimer}
              className="bg-white/20 hover:bg-white/30 w-14 h-14 rounded-2xl flex items-center justify-center transition-all backdrop-blur-md text-white border border-white/10"
              title="重置"
            >
              <RotateCcw size={22} />
            </button>

            <button 
              onClick={toggleTimer}
              className="bg-white text-emerald-600 w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl shadow-black/10 hover:scale-105 active:scale-95 transition-all"
            >
              {isActive ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1" />}
            </button>
          </div>
        </div>

      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #cbd5e1;
        }
      `}</style>
