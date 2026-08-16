// frontend/features/notes/components/table-body.tsx
import React from "react";
import { Tr, Td, Input, Button, useBreakpointValue } from "@chakra-ui/react";
import type { Exercise, SetTextField } from "../../../types/types";

interface TableBodyProps {
  exercises: Exercise[];
  onExerciseChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    exerciseIndex: number
  ) => void;
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    exerciseIndex: number,
    setIndex: number,
    field: SetTextField
  ) => void;
  onAddSet: (exerciseIndex: number) => void;
}

const TableBody: React.FC<TableBodyProps> = ({
  exercises,
  onExerciseChange,
  onInputChange,
  onAddSet,
}) => {
  const screenSize = useBreakpointValue({ base: "mobile", md: "tablet", lg: "pc" });

  if (!Array.isArray(exercises)) {
    return null;
  }

  // ============================
  // Desktop (lg and above): traditional wide table
  // ============================
  if (screenSize === "pc") {
    return (
      <tbody>
        {exercises.map((exercise, exerciseIndex) => (
          <React.Fragment key={exerciseIndex}>
            <Tr>
              {/* Exercise cell */}
              <Td border="1px solid #000">
                <Input
                  value={exercise.exercise}
                  onChange={(e) => onExerciseChange(e, exerciseIndex)}
                  width="100%"
                />
              </Td>

              {[...Array(5)].map((_, setIndex) => {
                const currentSet = exercise.sets[setIndex];
                if (!currentSet) {
                  return (
                    <React.Fragment key={setIndex}>
                      <Td border="1px solid #000" />
                      <Td border="1px solid #000" />
                      <Td border="1px solid #000" />
                    </React.Fragment>
                  );
                }
                return (
                  <React.Fragment key={setIndex}>
                    <Td border="1px solid #000">
                      <Input
                        value={currentSet.weight}
                        onChange={(e) =>
                          onInputChange(e, exerciseIndex, setIndex, "weight")
                        }
                        width="60px"
                      />
                    </Td>
                    <Td border="1px solid #000">
                      <Input
                        value={currentSet.reps}
                        onChange={(e) =>
                          onInputChange(e, exerciseIndex, setIndex, "reps")
                        }
                        width="50px"
                      />
                    </Td>
                    <Td border="1px solid #000">
                      <Input
                        value={currentSet.rest}
                        onChange={(e) =>
                          onInputChange(e, exerciseIndex, setIndex, "rest")
                        }
                        width="50px"
                      />
                    </Td>
                  </React.Fragment>
                );
              })}
            </Tr>

            <Tr>
              <Td
                border="1px solid #000"
                colSpan={16}
                textAlign="center"
                style={{ padding: "8px" }}
              >
                <Button size="sm" onClick={() => onAddSet(exerciseIndex)}>
                  +Add set
                </Button>
              </Td>
            </Tr>
          </React.Fragment>
        ))}
      </tbody>
    );
  }

  // ============================
  // Mobile and tablet
  // ============================
  return (
    <tbody>
      {exercises.map((exercise, eIndex) => (
        <React.Fragment key={eIndex}>
          {/* Exercise row */}
          <Tr>
            <Td border="1px solid #000" colSpan={3} style={{ fontWeight: "bold" }}>
              <label>Exercise:</label>
              <Input
                ml={2}
                width="100%"
                value={exercise.exercise}
                onChange={(ev) => onExerciseChange(ev, eIndex)}
              />
            </Td>
          </Tr>

          {/* Header row for #, Weight, and Reps */}
          <Tr>
            <Td border="1px solid #000" textAlign="center" fontWeight="bold">
              #
            </Td>
            <Td border="1px solid #000" textAlign="center" fontWeight="bold">
              Weight
            </Td>
            <Td border="1px solid #000" textAlign="center" fontWeight="bold">
              Reps
            </Td>
          </Tr>

          {/* Set row */}
          {exercise.sets.map((set, sIndex) => (
            <Tr key={sIndex}>
              {/* # */}
              <Td border="1px solid #000" textAlign="center">
                {sIndex + 1}
              </Td>
              {/* Weight */}
              <Td border="1px solid #000">
                <Input
                  width="100%"
                  value={set.weight}
                  onChange={(ev) => onInputChange(ev, eIndex, sIndex, "weight")}
                />
              </Td>
              {/* Reps */}
              <Td border="1px solid #000">
                <Input
                  width="100%"
                  value={set.reps}
                  onChange={(ev) => onInputChange(ev, eIndex, sIndex, "reps")}
                />
              </Td>
            </Tr>
          ))}

          {/* Add-set button row */}
          <Tr>
            <Td border="1px solid #000" colSpan={3} textAlign="center">
              <Button size="sm" onClick={() => onAddSet(eIndex)}>
                +Add set
              </Button>
            </Td>
          </Tr>
        </React.Fragment>
      ))}
    </tbody>
  );
};

export default TableBody;
