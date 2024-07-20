import React from "react";
import { Tr, Td, Input } from "@chakra-ui/react";

interface Set {
  weight: string;
  reps: string;
  rest: string;
}

interface Exercise {
  exercise: string;
  sets: Set[];
}

interface TableBodyProps {
  exercises: Exercise[];
  onExerciseChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => void;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    exerciseIndex: number,
    setIndex: number,
    field: keyof Set
  ) => void;
}

const TableBody: React.FC<TableBodyProps> = ({
  exercises,
  onExerciseChange,
  onInputChange,
}) => {
  if (!Array.isArray(exercises)) {
    return null; // exercisesが配列でない場合はnullを返す
  }

  return (
    <tbody>
      {exercises.map((exercise, exerciseIndex) => (
        <Tr key={exerciseIndex}>
          <Td border="1px solid #000">
            <Input
              value={exercise.exercise}
              onChange={(e) => onExerciseChange(e, exerciseIndex)}
              width="175px"
            />
          </Td>
          {exercise.sets.map((set, setIndex) => (
            <React.Fragment key={setIndex}>
              <Td border="1px solid #000">
                <Input
                  value={set.weight}
                  onChange={(e) =>
                    onInputChange(e, exerciseIndex, setIndex, "weight")
                  }
                  width="60px"
                />
              </Td>
              <Td border="1px solid #000">
                <Input
                  value={set.reps}
                  onChange={(e) =>
                    onInputChange(e, exerciseIndex, setIndex, "reps")
                  }
                  width="50px"
                />
              </Td>
              <Td border="1px solid #000">
                <Input
                  value={set.rest}
                  onChange={(e) =>
                    onInputChange(e, exerciseIndex, setIndex, "rest")
                  }
                  width="50px"
                />
              </Td>
            </React.Fragment>
          ))}
        </Tr>
      ))}
    </tbody>
  );
};

TableBody.displayName = "TableBody";
export default TableBody;
