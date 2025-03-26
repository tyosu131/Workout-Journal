// portfolio real\frontend\types\types.ts

export interface Set {
  weight: string;
  reps: string;
  rest: string;
}

export interface Exercise {
  exercise: string;
  note?: string;
  sets: Set[];
}

export interface NoteData {
  date: string;
  note: string;
  exercises: Exercise[];
  tags?: string[];
}
