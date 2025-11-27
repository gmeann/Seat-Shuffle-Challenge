export enum AppState {
  SETUP = 'SETUP',
  LOBBY = 'LOBBY',
  GAME = 'GAME',
  RESULT = 'RESULT',
  COMPLETE = 'COMPLETE'
}

export type Gender = 'M' | 'F';

export enum SeatMode {
  RANDOM = 'RANDOM',
  GENDER_COLUMN = 'GENDER_COLUMN' // Boys in odd columns, Girls in even columns
}

export interface Student {
  id: number;
  name: string;
  assignedSeat: number | null;
  gender?: Gender;
}

export interface GameConfig {
  totalStudents: number;
  columns: number;
  seatMode: SeatMode;
  oddColumnGender?: Gender; // Who sits in the odd columns (1, 3, 5...)?
}

export interface Seat {
  id: number;
  studentId: number | null;
}