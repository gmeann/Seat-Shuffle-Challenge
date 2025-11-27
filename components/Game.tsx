import React, { useEffect, useRef, useState, useCallback } from 'react';
import { calculateMotion } from '../utils/motionDetection';

interface GameProps {
  onSuccess: () => void;
  onFail: () => void;
  studentName: string;
}

enum MissionType {
  FREEZE = 'FREEZE',
  SHAKE = 'SHAKE',
  TOUCH = 'TOUCH',
  DODGE = 'DODGE',
  SIDE_STEP = 'SIDE_STEP',
}

interface TouchTarget {
  id: number;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
}

interface Zone {
  x: number; // Percentage
  y: number; // Percentage
  w: number; // Percentage
  h: number; // Percentage
  active: boolean;
}

const Game: React.FC<GameProps> = ({ onSuccess, onFail, studentName }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const requestRef = useRef<number | null>(null);
  
  // Timers refs to avoid dependency loops in useEffect
  const lastZoneUpdateRef = useRef<number>(0);
  
  const [timeLeft, setTimeLeft] = useState(10);
  const [motionScore, setMotionScore] = useState(0);
  const [currentMission, setCurrentMission] = useState<MissionType>(MissionType.SHAKE);
  const [missionText, setMissionText] = useState("준비하세요...");
  const [gameState, setGameState] = useState<'PREPARE' | 'PLAYING' | 'ENDED'>('PREPARE');
  const [health, setHealth] = useState(100);
  
  // Mission Specific States
  const [targets, setTargets] = useState<TouchTarget[]>([]); // For TOUCH
  const [activeZone, setActiveZone] = useState<Zone | null>(null); // For DODGE / SIDE_STEP
  const [zoneType, setZoneType] = useState<'LEFT' | 'RIGHT' | 'CENTER' | null>(null);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 640, height: 480, facingMode: 'user' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        alert("카메라 권한이 필요합니다!");
        onFail();
      }
    };
    startCamera();

    return () => {
      // Cleanup stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createTarget = (): TouchTarget => ({
    id: Date.now() + Math.random(),
    x: 15 + Math.random() * 70, 
    y: 15 + Math.random() * 70,
  });

  const spawnTouchTargets = () => {
    const newTargets = Array.from({ length: 3 }, createTarget);
    setTargets(newTargets);
    setActiveZone(null);
  };

  const updateZoneMission = (type: 'DODGE' | 'SIDE_STEP') => {
    const r = Math.random();
    let zone: Zone;
    let zType: 'LEFT' | 'RIGHT' | 'CENTER';

    if (r < 0.33) {
      zType = 'LEFT';
      zone = { x: 0, y: 0, w: 35, h: 100, active: true };
    } else if (r < 0.66) {
      zType = 'RIGHT';
      zone = { x: 65, y: 0, w: 35, h: 100, active: true };
    } else {
      zType = 'CENTER';
      // Narrower center zone (was w:40) to make it easier to dodge
      zone = { x: 35, y: 0, w: 30, h: 100, active: true };
    }
    
    setZoneType(zType);
    setActiveZone(zone);
    setTargets([]);

    // Logic for Korean post-positions (조사)
    const label = zType === 'LEFT' ? '왼쪽' : zType === 'RIGHT' ? '오른쪽' : '가운데';
    
    if (type === 'DODGE') {
      setMissionText(`🚨 ${label} 피하세요! 🚨`);
    } else {
      // Fix: '왼쪽으로', '오른쪽으로', '가운데로'
      const direction = zType === 'CENTER' ? '가운데로' : `${label}으로`;
      setMissionText(`👉 ${direction} 이동! 👈`);
    }
  };

  // Check motion in a specific rectangular area
  const getMotionInRect = (
    current: ImageData, 
    prev: ImageData, 
    rect: Zone
  ): number => {
    const w = 320;
    const h = 240;
    
    // Convert % to pixels
    const startX = Math.floor((rect.x / 100) * w);
    const startY = Math.floor((rect.y / 100) * h);
    const endX = Math.min(w, startX + Math.floor((rect.w / 100) * w));
    const endY = Math.min(h, startY + Math.floor((rect.h / 100) * h));

    const data1 = current.data;
    const data2 = prev.data;
    let diffSum = 0;
    let pixelCount = 0;

    for (let y = startY; y < endY; y += 4) {
      for (let x = startX; x < endX; x += 4) {
        const i = (y * w + x) * 4;
        const rDiff = Math.abs(data1[i] - data2[i]);
        const gDiff = Math.abs(data1[i + 1] - data2[i + 1]);
        const bDiff = Math.abs(data1[i + 2] - data2[i + 2]);
        
        // Lower threshold for zone detection (more sensitive)
        if (rDiff + gDiff + bDiff > 20) {
          diffSum += rDiff + gDiff + bDiff;
        }
        pixelCount++;
      }
    }

    if (pixelCount === 0) return 0;
    const avgDiff = diffSum / pixelCount;
    return (avgDiff / 30) * 100; // Normalize
  };

  const checkTouchTarget = (
    current: ImageData, 
    prev: ImageData, 
    targetXPercent: number, 
    targetYPercent: number
  ): boolean => {
    // Increased hit box size for easier touching
    const zone: Zone = {
       x: Math.max(0, targetXPercent - 12), 
       y: Math.max(0, targetYPercent - 12),
       w: 24,
       h: 24,
       active: true
    };
    // Very sensitive threshold for touch (hand wave)
    return getMotionInRect(current, prev, zone) > 8;
  };

  // Game Logic Loop
  const loop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (ctx && video.readyState === 4) {
      // Draw video frame
      canvas.width = 320; // Lower res for performance
      canvas.height = 240;
      
      ctx.save();
      ctx.scale(-1, 1); // Mirror
      ctx.drawImage(video, -320, 0, 320, 240);
      ctx.restore();

      const currentFrame = ctx.getImageData(0, 0, 320, 240);
      
      // Calculate Global Motion
      const score = calculateMotion(currentFrame, prevFrameRef.current);
      setMotionScore(score);

      // Game Rules Check
      if (gameState === 'PLAYING' && prevFrameRef.current) {
        
        // Dynamic Updates for Dodge/SideStep
        const now = Date.now();
        if ((currentMission === MissionType.DODGE || currentMission === MissionType.SIDE_STEP) && now - lastZoneUpdateRef.current > 1500) {
           updateZoneMission(currentMission === MissionType.DODGE ? 'DODGE' : 'SIDE_STEP');
           lastZoneUpdateRef.current = now;
        }

        switch (currentMission) {
          case MissionType.FREEZE:
            // Don't Move
            if (score > 10) setHealth(h => Math.max(0, h - 2.5)); 
            else setHealth(h => Math.min(100, h + 0.3));
            break;

          case MissionType.SHAKE:
            // Move a lot
            if (score < 15) setHealth(h => Math.max(0, h - 0.5));
            else setHealth(h => Math.min(100, h + 0.5)); 
            break;

          case MissionType.TOUCH:
            // Logic: 1-for-1 Respawn
            let clearedCount = 0;
            const remainingTargets = targets.filter(t => {
              const hit = checkTouchTarget(currentFrame, prevFrameRef.current!, t.x, t.y);
              if (hit) clearedCount++;
              return !hit;
            });

            if (clearedCount > 0) {
               // Reward for clearing
               setHealth(h => Math.min(100, h + (clearedCount * 8)));
               // Respawn immediately to keep game active
               const newItems = Array.from({length: clearedCount}, createTarget);
               setTargets([...remainingTargets, ...newItems]);
            } else {
               // Time decay
               setHealth(h => Math.max(0, h - 0.15)); 
            }
            break;

          case MissionType.DODGE:
            // Avoid active zone
            if (activeZone) {
              const zoneMotion = getMotionInRect(currentFrame, prevFrameRef.current!, activeZone);
              // High penalty for touching obstacle
              // Reduced sensitivity: Threshold > 25 (was 15)
              // Reduced damage: h - 0.6 (was 3) to prevent instant death
              if (zoneMotion > 25) {
                setHealth(h => Math.max(0, h - 0.6)); 
              } else {
                setHealth(h => Math.min(100, h + 0.2));
              }
            }
            break;

          case MissionType.SIDE_STEP:
            // Move inside active zone
            if (activeZone) {
              const zoneMotion = getMotionInRect(currentFrame, prevFrameRef.current!, activeZone);
              if (zoneMotion > 15) {
                 setHealth(h => Math.min(100, h + 0.8));
              } else {
                 setHealth(h => Math.max(0, h - 0.5));
              }
            }
            break;
        }
      }

      prevFrameRef.current = currentFrame;
    }
    
    requestRef.current = requestAnimationFrame(loop);
  }, [currentMission, gameState, activeZone, targets]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [loop]);

  const chooseNewMission = () => {
    const r = Math.random();
    
    // Probabilities:
    if (r < 0.20) {
      setCurrentMission(MissionType.FREEZE);
      setMissionText("🛑 얼음! 멈추세요! 🛑");
      setTargets([]);
      setActiveZone(null);
    } else if (r < 0.45) {
      setCurrentMission(MissionType.SHAKE);
      setMissionText("💃 댄스! 더 격렬하게! 💃");
      setTargets([]);
      setActiveZone(null);
    } else if (r < 0.65) {
      setCurrentMission(MissionType.TOUCH);
      setMissionText("🌟 도형 위에서 손을 흔드세요! 🌟"); // Improved text
      spawnTouchTargets();
    } else if (r < 0.85) {
      setCurrentMission(MissionType.SIDE_STEP);
      updateZoneMission('SIDE_STEP');
      lastZoneUpdateRef.current = Date.now();
    } else {
      setCurrentMission(MissionType.DODGE);
      updateZoneMission('DODGE');
      lastZoneUpdateRef.current = Date.now();
    }
  };

  // 1. Game State Management
  useEffect(() => {
    if (gameState === 'PREPARE') {
      setTimeout(() => {
        setGameState('PLAYING');
        setMissionText("시작!");
        chooseNewMission();
      }, 3000); 
    }
  }, [gameState]);

  // 2. Health & End Condition Check (Runs on health/time update)
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    if (health <= 0) {
      setGameState('ENDED');
      onFail();
    } else if (timeLeft <= 0) {
      setGameState('ENDED');
      onSuccess();
    }
  }, [health, timeLeft, gameState, onFail, onSuccess]);

  // 3. Independent Timer (Fixes the bug where time doesn't decrease because of frequent re-renders)
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]); // Only depends on gameState, NOT health

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black overflow-hidden font-sans">
       {/* Background Video */}
       <div className="absolute inset-0 z-0 opacity-60">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover transform -scale-x-100" 
        />
       </div>
       <canvas ref={canvasRef} className="hidden" />

       {/* Overlays for different missions */}
       {gameState === 'PLAYING' && (
         <div className="absolute inset-0 z-10 pointer-events-none">
           {/* TOUCH Targets */}
           {currentMission === MissionType.TOUCH && targets.map(target => (
             <div 
               key={target.id}
               className="absolute w-24 h-24 border-4 border-neon-yellow bg-neon-yellow/30 rounded-full animate-pulse flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110"
               style={{ left: `${target.x}%`, top: `${target.y}%` }}
             >
               <span className="text-4xl">👋</span>
             </div>
           ))}

           {/* DODGE Zone (Danger) */}
           {currentMission === MissionType.DODGE && activeZone && (
             <div 
               className="absolute bg-red-600/40 border-4 border-red-500 flex items-center justify-center animate-pulse transition-all duration-300"
               style={{ 
                 left: `${activeZone.x}%`, 
                 top: `${activeZone.y}%`, 
                 width: `${activeZone.w}%`, 
                 height: `${activeZone.h}%` 
               }}
             >
               <div className="bg-red-900 text-white font-black text-2xl px-4 py-2 rounded transform -rotate-12">
                 DANGER!
               </div>
             </div>
           )}

           {/* SIDE_STEP Zone (Goal) */}
           {currentMission === MissionType.SIDE_STEP && activeZone && (
             <div 
               className="absolute bg-green-500/30 border-4 border-neon-green flex items-center justify-center transition-all duration-300"
               style={{ 
                 left: `${activeZone.x}%`, 
                 top: `${activeZone.y}%`, 
                 width: `${activeZone.w}%`, 
                 height: `${activeZone.h}%` 
               }}
             >
               <div className="text-neon-green font-black text-6xl animate-bounce">
                  {activeZone.x < 30 ? '⬅️' : activeZone.x > 50 ? '➡️' : '⬇️'}
               </div>
             </div>
           )}
         </div>
       )}

       {/* UI Overlay */}
       <div className="relative z-20 w-full max-w-2xl p-6 flex flex-col items-center space-y-8">
          
          {/* Header */}
          <div className="w-full flex justify-between items-center text-white bg-black/60 backdrop-blur-md p-4 rounded-xl border border-gray-700 shadow-xl">
            <div className="text-xl font-bold text-neon-blue">{studentName}</div>
            <div className="text-4xl font-black font-mono text-white drop-shadow-md">{timeLeft}초</div>
            <div className={`text-xl font-bold flex items-center gap-2 ${health < 30 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
              <span>❤️</span> {Math.floor(health)}%
            </div>
          </div>

          {/* Mission Instruction */}
          <div className="text-center">
            {gameState === 'PREPARE' ? (
              <h2 className="text-6xl font-black text-white animate-bounce drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">
                준비하세요!
              </h2>
            ) : (
              <div className={`transform transition-all duration-300 ${currentMission === MissionType.FREEZE ? 'scale-110' : 'scale-100'}`}>
                 <h2 className={`text-5xl md:text-6xl font-black text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] leading-tight break-keep
                    ${currentMission === MissionType.FREEZE || currentMission === MissionType.DODGE ? 'text-red-500' : 'text-neon-blue'}`}>
                    {missionText}
                 </h2>
              </div>
            )}
          </div>

          {/* Motion Meter */}
          <div className="w-full max-w-lg">
             <div className="flex justify-between text-xs font-bold text-gray-400 mb-1 px-1">
                <span>가만히...</span>
                <span>움직임!</span>
             </div>
             <div className="w-full h-10 bg-gray-900 rounded-full overflow-hidden border-2 border-gray-600 relative shadow-inner">
                {/* Visual Threshold Markers */}
                {currentMission === MissionType.SHAKE && (
                  <div className="absolute left-[15%] top-0 bottom-0 w-1 bg-white z-10 opacity-50 flex flex-col items-center"></div>
                )}
                {currentMission === MissionType.FREEZE && (
                  <div className="absolute left-[10%] top-0 bottom-0 w-1 bg-red-500 z-10 opacity-70 flex flex-col items-center"></div>
                )}

                <div 
                  className={`h-full transition-all duration-100 ease-out flex items-center justify-end px-2 
                    ${(currentMission === MissionType.FREEZE || currentMission === MissionType.DODGE)
                      ? 'bg-red-500' 
                      : (currentMission === MissionType.SIDE_STEP ? 'bg-green-500' : 'bg-blue-500')
                    }`} 
                  style={{ width: `${Math.min(100, motionScore)}%` }}
                >
                </div>
             </div>
             
             {/* Text Feedback */}
             {gameState === 'PLAYING' && (
                <div className="text-center mt-2 h-6 font-bold text-yellow-300 text-lg drop-shadow-md">
                   {currentMission === MissionType.DODGE && activeZone && (
                      <span className="text-red-400">장애물을 피하세요!</span>
                   )}
                   {currentMission === MissionType.SIDE_STEP && activeZone && (
                      <span className="text-green-400">화살표 방향으로!</span>
                   )}
                   {currentMission === MissionType.TOUCH && (
                      "도형을 터치하여 없애세요!"
                   )}
                   {currentMission === MissionType.FREEZE && motionScore > 10 && "⚠️ 움직임 감지!"}
                </div>
             )}
          </div>
       </div>
    </div>
  );
};

export default Game;