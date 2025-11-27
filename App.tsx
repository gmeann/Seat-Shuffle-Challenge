import React, { useState, useEffect } from 'react';
import Setup from './components/Setup';
import Game from './components/Game';
import SeatGrid from './components/SeatGrid';
import RosterEditor from './components/RosterEditor';
import { AppState, GameConfig, Seat, Student, SeatMode, Gender } from './types';
import { generateSeatAnnouncement } from './services/geminiService';

const App = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [announcement, setAnnouncement] = useState<string>('');
  const [loadingResult, setLoadingResult] = useState(false);
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  
  // New States
  const [isEditingRoster, setIsEditingRoster] = useState(false);

  // Initialize Game Data
  const handleSetupComplete = (newConfig: GameConfig) => {
    setConfig(newConfig);
    
    // Create Seats based on Rows * Cols
    const rows = newConfig.columns > 0 ? Math.ceil(newConfig.totalStudents / newConfig.columns) : 1; 
    // Wait, rows was added to GameConfig in previous step but I should handle it safely
    // Actually let's trust the props passed or calculate defaults.
    // The previous prompt added 'rows' to setup but maybe not to type def in my memory, 
    // let's assume specific rows input from setup if available, else calc.
    // However, I see I modified Setup to just pass config.
    // Let's rely on standard logic:
    
    // In the previous turn I updated App.tsx to use local calculation because I didn't update types.ts
    // Let's stick to using config props if they exist, or fallback.
    // The Setup component passes { totalStudents, columns, ... }.
    // Let's assume we want a fixed grid if rows are provided, or dynamic.
    // For now, let's just use a calculated row count to ensure all students fit + some buffer if needed.
    const calculatedRows = Math.ceil(newConfig.totalStudents / newConfig.columns);
    // If the user entered explicit rows in Setup (which was added in previous turn), we should use it.
    // Since I can't see the exact `Setup.tsx` change from 2 turns ago in this context window perfectly, 
    // I will use a safe approach:
    const finalRows = (newConfig as any).rows || calculatedRows;
    const totalGridSeats = finalRows * newConfig.columns;
    
    const newSeats: Seat[] = Array.from({ length: totalGridSeats }, (_, i) => ({
      id: i + 1,
      studentId: null
    }));
    setSeats(newSeats);

    // Create Students
    const newStudents: Student[] = Array.from({ length: newConfig.totalStudents }, (_, i) => ({
      id: i + 1,
      name: `학생 ${i + 1}`,
      assignedSeat: null
    }));
    setStudents(newStudents);

    setAppState(AppState.LOBBY);
  };

  const handleStartGame = () => {
    if (!selectedGender) {
      alert("성별을 선택해주세요!");
      return;
    }
    setAppState(AppState.GAME);
  };

  const handleGameSuccess = async () => {
    setLoadingResult(true);
    setAppState(AppState.RESULT);

    // Seat Selection Logic
    const availableSeats = seats.filter(s => s.studentId === null);
    
    if (availableSeats.length === 0) {
      setAnnouncement("모든 자리가 찼습니다!");
      setLoadingResult(false);
      return;
    }

    let candidateSeats = availableSeats;

    // Apply Gender Logic if enabled
    if (config?.seatMode === SeatMode.GENDER_COLUMN && selectedGender) {
      const oddGender = config.oddColumnGender || 'M';

      const genderRestrictedSeats = availableSeats.filter(seat => {
        const colCount = config.columns;
        const colIndex = (seat.id - 1) % colCount + 1;
        const isOddCol = colIndex % 2 !== 0;
        
        if (selectedGender === oddGender) return isOddCol; 
        return !isOddCol; 
      });

      if (genderRestrictedSeats.length > 0) {
        candidateSeats = genderRestrictedSeats;
      } else {
         console.warn("Preferred gender seats full, assigning random.");
      }
    }

    const randomIndex = Math.floor(Math.random() * candidateSeats.length);
    const selectedSeat = candidateSeats[randomIndex];

    const currentStudent = students[currentStudentIndex];
    const text = await generateSeatAnnouncement(currentStudent.name, selectedSeat.id);
    setAnnouncement(text);

    const updatedSeats = seats.map(s => 
      s.id === selectedSeat.id ? { ...s, studentId: currentStudent.id } : s
    );
    const updatedStudents = students.map(s => 
      s.id === currentStudent.id ? { ...s, assignedSeat: selectedSeat.id, gender: selectedGender! } : s
    );

    setSeats(updatedSeats);
    setStudents(updatedStudents);
    setLoadingResult(false);
  };

  const handleGameFail = () => {
    alert("미션 실패! 순서가 맨 뒤로 밀려납니다. 다시 도전하세요!");
    const currentStudent = students[currentStudentIndex];
    const otherStudents = students.filter((_, idx) => idx !== currentStudentIndex);
    const reorderedStudents = [...otherStudents, currentStudent];
    setStudents(reorderedStudents);
    setSelectedGender(null);
    setAppState(AppState.LOBBY);
  };

  const nextStudent = () => {
    setSelectedGender(null);
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(prev => prev + 1);
      setAppState(AppState.LOBBY);
      setAnnouncement('');
    } else {
      setAppState(AppState.COMPLETE);
    }
  };

  const handleSeatSwap = (seatId1: number, seatId2: number) => {
    const seat1 = seats.find(s => s.id === seatId1);
    const seat2 = seats.find(s => s.id === seatId2);
    if (!seat1 || !seat2) return;

    const studentId1 = seat1.studentId;
    const studentId2 = seat2.studentId;

    const updatedSeats = seats.map(s => {
      if (s.id === seatId1) return { ...s, studentId: studentId2 };
      if (s.id === seatId2) return { ...s, studentId: studentId1 };
      return s;
    });

    const updatedStudents = students.map(s => {
      if (s.id === studentId1 && studentId1 !== null) return { ...s, assignedSeat: seatId2 };
      if (s.id === studentId2 && studentId2 !== null) return { ...s, assignedSeat: seatId1 };
      return s;
    });

    setSeats(updatedSeats);
    setStudents(updatedStudents);
  };

  // Roster Editor Handlers
  const handleRosterSave = (updatedStudents: Student[]) => {
    setStudents(updatedStudents);
    setIsEditingRoster(false);
  };

  const handleSaveImage = async () => {
    if (typeof window === 'undefined') return;
    const html2canvas = (window as any).html2canvas;
    if (!html2canvas) {
      alert("이미지 저장 라이브러리를 로드하는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const element = document.getElementById('classroom-capture-area');
    if (element) {
      try {
        const canvas = await html2canvas(element, { 
           backgroundColor: '#2d3748', // Match background color
           scale: 2 // High res
        });
        const data = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = data;
        link.download = `자리배치도_${new Date().toLocaleDateString()}.png`;
        link.click();
      } catch (err) {
        console.error("Save failed:", err);
        alert("이미지 저장에 실패했습니다.");
      }
    }
  };

  if (appState === AppState.SETUP) {
    return <Setup onComplete={handleSetupComplete} />;
  }

  if (appState === AppState.GAME) {
    return (
      <Game 
        onSuccess={handleGameSuccess} 
        onFail={handleGameFail} 
        studentName={students[currentStudentIndex].name}
      />
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white flex flex-col p-4 md:p-8 font-sans">
      {/* Roster Modal */}
      {isEditingRoster && (
        <RosterEditor 
          students={students} 
          onSave={handleRosterSave} 
          onCancel={() => setIsEditingRoster(false)} 
        />
      )}

      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-blue to-neon-green">
          자리 바꾸기 대작전
        </h1>
        <div className="flex items-center gap-4">
           <div className="text-gray-400 text-sm hidden md:block">
              {config && `진행: ${students.filter(s => s.assignedSeat !== null).length}/${config.totalStudents}`}
           </div>
           <button 
             onClick={() => setIsEditingRoster(true)}
             className="bg-gray-800 hover:bg-gray-700 text-neon-blue border border-gray-600 px-3 py-2 rounded text-sm font-bold flex items-center gap-2"
           >
             📝 명단 수정
           </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center max-w-6xl mx-auto w-full">
        
        {appState === AppState.LOBBY && (
          <div className="w-full max-w-lg bg-dark-card p-8 rounded-2xl border border-gray-700 shadow-2xl text-center mb-12">
             <div className="flex justify-center items-center gap-2 mb-2">
               <h2 className="text-gray-400 uppercase tracking-widest text-sm">현재 순서</h2>
             </div>
             <div className="text-5xl font-black text-white mb-6 animate-pulse-slow">
               {students[currentStudentIndex].name}
             </div>
             
             <div className="space-y-6">
                <p className="text-lg text-gray-300">
                  10초 동안 미션을 수행하고 새로운 자리를 획득하세요!
                </p>

                {/* Gender Selection */}
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                  <p className="text-sm text-gray-400 mb-3 font-bold">성별을 선택하세요</p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setSelectedGender('M')}
                      className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all border-2 ${
                        selectedGender === 'M' 
                        ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                        : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      👦 남학생
                    </button>
                    <button
                      onClick={() => setSelectedGender('F')}
                      className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all border-2 ${
                        selectedGender === 'F' 
                        ? 'bg-pink-600 border-pink-400 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]' 
                        : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      👧 여학생
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleStartGame}
                  disabled={!selectedGender}
                  className={`w-full font-bold py-4 px-8 rounded-lg text-xl transition-all transform hover:scale-105 ${
                    selectedGender 
                    ? 'bg-neon-blue hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,243,255,0.4)] cursor-pointer'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  게임 시작 (START)
                </button>
             </div>
          </div>
        )}

        {appState === AppState.RESULT && (
          <div className="w-full max-w-2xl bg-dark-card p-8 rounded-2xl border border-neon-green shadow-[0_0_50px_rgba(0,255,0,0.2)] text-center mb-8 animate-fade-in-up">
            {loadingResult ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xl animate-pulse">최적의 자리를 찾는 중...</p>
              </div>
            ) : (
              <>
                <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-3xl font-bold text-white mb-4">미션 성공!</h2>
                <p className="text-xl text-neon-green font-mono mb-8 border-l-4 border-neon-green pl-4 text-left italic">
                  "{announcement}"
                </p>
                <button 
                  onClick={nextStudent}
                  className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                >
                  다음 학생
                </button>
              </>
            )}
          </div>
        )}

        {appState === AppState.COMPLETE && (
          <div className="w-full text-center mb-12">
            <h2 className="text-4xl font-bold text-neon-pink mb-4">자리 배정 완료!</h2>
            <p className="text-gray-400 mb-6">모든 학생의 자리가 정해졌습니다.</p>
            <button 
              onClick={handleSaveImage}
              className="bg-neon-green text-black font-bold py-3 px-8 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-2 mx-auto"
            >
              📷 자리배치도 이미지 저장
            </button>
          </div>
        )}

        {/* Seat Map */}
        <div className="w-full">
           <div className="flex justify-between items-end mb-4 px-4 max-w-4xl mx-auto">
             <div className="flex items-center gap-2">
                <h3 className="text-gray-500 uppercase tracking-widest text-xs font-bold">교실 배치도</h3>
                <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded">드래그하여 이동 가능</span>
             </div>
             <div className="flex gap-2">
                {appState !== AppState.COMPLETE && (
                  <button 
                    onClick={handleSaveImage}
                    className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white flex items-center gap-1 transition-colors"
                  >
                    💾 저장
                  </button>
                )}
                {config?.seatMode === SeatMode.GENDER_COLUMN && (
                  <span className="text-xs text-neon-yellow border border-neon-yellow px-2 py-1 rounded hidden sm:inline-block">
                    {config.oddColumnGender === 'M' ? '남:홀수 / 여:짝수' : '여:홀수 / 남:짝수'}
                  </span>
                )}
             </div>
           </div>
           
           <SeatGrid 
             seats={seats} 
             columns={config?.columns || 5} 
             students={students} 
             onSeatSwap={handleSeatSwap}
           />
        </div>
      </div>
    </div>
  );
};

export default App;