import React, { useState } from 'react';
import { Seat, Student } from '../types';

interface SeatGridProps {
  seats: Seat[];
  columns: number;
  students?: Student[];
  onSeatSwap?: (seatId1: number, seatId2: number) => void;
  className?: string; // Additional class for capture styling
}

const SeatGrid: React.FC<SeatGridProps> = ({ seats, columns, students, onSeatSwap, className }) => {
  const [dragOverSeatId, setDragOverSeatId] = useState<number | null>(null);

  const getStudentGender = (studentId: number | null): 'M' | 'F' | undefined => {
    if (!studentId || !students) return undefined;
    return students.find(s => s.id === studentId)?.gender;
  };
  
  const getStudentName = (studentId: number | null): string => {
    if (!studentId || !students) return '';
    return students.find(s => s.id === studentId)?.name || '';
  };

  const handleDragStart = (e: React.DragEvent, seatId: number) => {
    e.dataTransfer.setData('text/plain', seatId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, seatId: number) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    setDragOverSeatId(seatId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverSeatId(null);
  };

  const handleDrop = (e: React.DragEvent, targetSeatId: number) => {
    e.preventDefault();
    setDragOverSeatId(null);
    const sourceSeatId = parseInt(e.dataTransfer.getData('text/plain'));
    
    if (sourceSeatId !== targetSeatId && onSeatSwap) {
      onSeatSwap(sourceSeatId, targetSeatId);
    }
  };

  return (
    <div id="classroom-capture-area" className={`bg-[#e5e7eb] p-8 rounded-xl shadow-2xl relative ${className}`}>
      {/* Blackboard Header */}
      <div className="bg-[#1a4731] border-y-8 border-x-[12px] border-[#8b5a2b] rounded-md p-4 mb-6 shadow-lg relative overflow-hidden max-w-2xl mx-auto">
        {/* Chalk dust effect */}
        <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')]"></div>
        
        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-center text-white/90 font-serif tracking-widest drop-shadow-md relative z-10">
           ✨ 우리 반 자리배치도 ✨
        </h2>
        
        {/* Decorations */}
        <div className="absolute top-2 left-4 w-12 h-1 bg-white/20 rotate-[-15deg] rounded-full blur-[1px]"></div>
        <div className="absolute bottom-2 right-12 w-2 h-2 bg-yellow-200/80 rounded-full blur-[1px]"></div>
      </div>

      {/* Teacher's Desk (Moved to Top) */}
      <div className="flex justify-center mb-10">
        <div className="px-10 py-3 bg-[#8b5a2b] text-[#f3e5ab] font-bold text-xl rounded-lg shadow-lg border-b-4 border-[#654321] relative">
          교 탁
        </div>
      </div>

      {/* Grid Container */}
      <div 
        className="grid gap-4 w-full mx-auto"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {seats.map((seat) => {
          const gender = getStudentGender(seat.studentId);
          const name = getStudentName(seat.studentId);
          
          let borderColor = 'border-[#8b5a2b]';
          let bgColor = 'bg-[#8b5a2b]'; // Brown background like the photo
          let textColor = 'text-white';
          let shadow = 'shadow-[0_4px_0_rgba(101,67,33,1)]';

          if (seat.studentId) {
             // We can keep color coding or switch to the uniform brown look.
             // To match the photo strictly, we might want uniform brown, 
             // but keeping gender colors is usually preferred for functionality.
             // I will keep the shape and style but retain subtle gender hints or use the brown style if preferred.
             // Based on "Reflect photo", the photo has uniform brown tags. 
             // Let's use the brown tag style but add a small gender indicator dot or border if needed.
             // Actually, let's keep the distinct gender colors for UX but adapt the shape/style to be more "tag-like".
              if (gender === 'M') {
                  borderColor = 'border-blue-600';
                  bgColor = 'bg-blue-500';
                  shadow = 'shadow-[0_4px_0_rgba(29,78,216,1)]';
              } else if (gender === 'F') {
                  borderColor = 'border-pink-600';
                  bgColor = 'bg-pink-500';
                  shadow = 'shadow-[0_4px_0_rgba(190,24,93,1)]';
              } else {
                  // Default brown
                  borderColor = 'border-[#8b5a2b]';
                  bgColor = 'bg-[#8b5a2b]';
                  shadow = 'shadow-[0_4px_0_rgba(101,67,33,1)]';
              }
          } else {
             // Empty Seat
             bgColor = 'bg-gray-300';
             borderColor = 'border-gray-400';
             textColor = 'text-gray-500';
             shadow = 'shadow-none';
          }
          
          const isDragOver = dragOverSeatId === seat.id;

          return (
            <div 
              key={seat.id}
              className={`
                aspect-[3/1] md:aspect-[2.5/1] rounded-lg flex flex-col items-center justify-center border-b-4 transition-all duration-200 relative overflow-hidden
                ${shadow} ${borderColor} ${bgColor} ${textColor}
                ${isDragOver ? 'ring-4 ring-yellow-400 scale-105 z-10' : ''}
                hover:transform hover:-translate-y-1
              `}
              onDragOver={(e) => handleDragOver(e, seat.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, seat.id)}
            >
              {/* Number Badge */}
              <div className="absolute top-1 left-2 bg-black/20 px-1.5 py-0.5 rounded text-[10px] md:text-xs font-bold text-white/80">
                {seat.id}번
              </div>
              
              {seat.studentId ? (
                <div 
                  draggable={!!onSeatSwap}
                  onDragStart={(e) => handleDragStart(e, seat.id)}
                  className="w-full h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing p-1 pt-4"
                >
                  <span className="font-extrabold text-lg md:text-xl truncate w-full text-center leading-none text-white drop-shadow-md">
                    {name}
                  </span>
                  {gender && (
                     <span className="absolute bottom-1 right-2 text-[10px] opacity-70">
                       {gender === 'M' ? '♂' : '♀'}
                     </span>
                  )}
                </div>
              ) : (
                 <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-500 font-bold opacity-50 text-sm">빈자리</span>
                 </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SeatGrid;