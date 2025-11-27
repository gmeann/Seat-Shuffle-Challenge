import React, { useState } from 'react';
import { GameConfig, SeatMode, Gender } from '../types';

interface SetupProps {
  onComplete: (config: GameConfig) => void;
}

const Setup: React.FC<SetupProps> = ({ onComplete }) => {
  const [totalStudents, setTotalStudents] = useState(20);
  const [columns, setColumns] = useState(5);
  const [seatMode, setSeatMode] = useState<SeatMode>(SeatMode.RANDOM);
  const [oddColumnGender, setOddColumnGender] = useState<Gender>('M');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ totalStudents, columns, seatMode, oddColumnGender });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-dark-bg p-6 text-white font-sans">
      <div className="max-w-md w-full bg-dark-card p-8 rounded-2xl shadow-2xl border border-gray-700">
        <h1 className="text-4xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink">
          자리 바꾸기 대작전
        </h1>
        <p className="text-gray-400 mb-8 text-center">
          학급 설정을 완료하고 게임을 시작하세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-neon-blue mb-2">
              전체 학생 수
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={totalStudents}
              onChange={(e) => setTotalStudents(parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-neon-blue transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neon-pink mb-2">
              가로 줄 수 (열 개수)
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={columns}
              onChange={(e) => setColumns(parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-neon-pink transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neon-green mb-2">
              배치 방식
            </label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setSeatMode(SeatMode.RANDOM)}
                className={`p-3 rounded-lg border text-sm font-bold transition-all ${
                  seatMode === SeatMode.RANDOM
                    ? 'bg-neon-green text-black border-neon-green'
                    : 'bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-500'
                }`}
              >
                완전 랜덤
              </button>
              <button
                type="button"
                onClick={() => setSeatMode(SeatMode.GENDER_COLUMN)}
                className={`p-3 rounded-lg border text-sm font-bold transition-all ${
                  seatMode === SeatMode.GENDER_COLUMN
                    ? 'bg-neon-green text-black border-neon-green'
                    : 'bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-500'
                }`}
              >
                남녀 분단 구분
              </button>
            </div>

            {seatMode === SeatMode.GENDER_COLUMN && (
              <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-600 animate-fade-in-up">
                <label className="block text-xs font-bold text-gray-400 mb-2">
                  1분단(홀수열) 앉을 성별:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOddColumnGender('M')}
                    className={`flex-1 py-2 rounded text-sm font-bold transition-all border ${
                      oddColumnGender === 'M'
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-transparent border-gray-600 text-gray-500'
                    }`}
                  >
                    남학생 (홀수열)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOddColumnGender('F')}
                    className={`flex-1 py-2 rounded text-sm font-bold transition-all border ${
                      oddColumnGender === 'F'
                        ? 'bg-pink-600 border-pink-400 text-white'
                        : 'bg-transparent border-gray-600 text-gray-500'
                    }`}
                  >
                    여학생 (홀수열)
                  </button>
                </div>
                <p className="text-[10px] text-gray-500 mt-2 text-center">
                  * 선택하지 않은 성별은 짝수열에 배치됩니다.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-neon-blue to-neon-purple-500 hover:from-blue-400 hover:to-purple-400 text-black font-bold py-4 rounded-lg shadow-lg transform transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
          >
            설정 완료 및 시작
          </button>
        </form>
      </div>
    </div>
  );
};

export default Setup;