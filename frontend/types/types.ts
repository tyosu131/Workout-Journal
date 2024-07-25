export interface Set {
    weight: string;
    reps: string;
    rest: string;
  }
  
  export interface Exercise {
    exercise: string;
    sets: Set[];
  }
  
  export interface NoteData {
    date: string;
    note: string;
    exercises: Exercise[];
  }
  