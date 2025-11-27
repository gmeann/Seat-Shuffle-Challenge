import React, { useState } from 'react';
import { Student } from '../types';

interface RosterEditorProps {
  students: Student[];
  onSave: (updatedStudents: Student[]) => void;
  onCancel: () => void;
}

const RosterEditor: React.FC<RosterEditorProps> = ({ students, onSave, onCancel }) => {
  const [localStudents, setLocalStudents] = useState<Student[]>(students);

  const handleChange = (id: number, newName: string) => {
    setLocalStudents(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-dark-card w-full max-w-5xl max-h-[90vh] rounded-2xl border border-gray-700 flex flex-col shadow-2xl animate-fade-in-up">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800/50 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            ✏️ 학생 명단 수정
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {localStudents.map(student => (
              <div key={student.id} className="flex flex-col gap-1 group">
                <label className="text-xs text-gray-500 font-mono group-hover:text-neon-blue transition-colors">
                   No. {student.id}
                </label>
                <input
                  type="text"
                  value={student.name}
                  onChange={(e) => handleChange(student.id, e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-neon-blue outline-none transition-all focus:bg-gray-700"
                  placeholder={`학생 ${student.id}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end gap-3 bg-gray-800/50 rounded-b-2xl">
          <button 
            onClick={onCancel} 
            className="px-6 py-3 rounded-lg text-gray-300 font-bold hover:bg-gray-700 transition-colors"
          >
            취소
          </button>
          <button 
            onClick={() => onSave(localStudents)}
            className="px-8 py-3 rounded-lg bg-gradient-to-r from-neon-blue to-blue-600 text-white font-bold hover:from-cyan-400 hover:to-blue-500 shadow-lg transform transition-all active:scale-95"
          >
            저장하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default RosterEditor;