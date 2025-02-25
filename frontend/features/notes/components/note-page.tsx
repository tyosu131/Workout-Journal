// frontend/features/notes/components/note-page.tsx

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Text,
  Spinner,
  Center,
  Button,
  useBreakpointValue,
  IconButton,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import useSWR from "swr";
import Header from "./header";
import DateInput from "./date-input";
import NoteInput from "./note-input";
import { NoteData } from "../../../types/types";
import { fetchNotesAPI } from "../api";
import useNoteHandlers from "../hooks/useNoteHandlers";

const NotePage: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;
  const containerWidth = useBreakpointValue({ base: "100%", lg: "75%" });

  const [noteData, setNoteData] = useState<NoteData | null>(null);

  // 「#」セルのホバー状態
  const [hoveredRow, setHoveredRow] = useState<{ exIndex: number; setIndex: number } | null>(null);
  // Exercise枠のホバー状態
  const [hoveredExercise, setHoveredExercise] = useState<number | null>(null);
  // メニューオープン状態
  const [openRowMenu, setOpenRowMenu] = useState<{ exIndex: number; setIndex: number } | null>(null);
  const [openExerciseMenu, setOpenExerciseMenu] = useState<number | null>(null);

  // SWR でノートを取得
  const { data } = useSWR<NoteData[]>(
    date ? String(date) : null,
    (d: string) => fetchNotesAPI(d),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  // useNoteHandlers から各ハンドラを取得（削除機能も含む）
  const {
    exerciseMenuRef,
    rowMenuRef,
    handleInputChange,
    handleNoteChange,
    handleExerciseChange,
    handleDateChange,
    handleAddSet,
    handleAddExercise,
    handleDeleteRow,
    handleDeleteExercise,
  } = useNoteHandlers(noteData, setNoteData, setOpenRowMenu, setOpenExerciseMenu);

  // ノート初期化
  useEffect(() => {
    if (!date) return;
    if (data && data.length > 0) {
      setNoteData(data[0]);
    } else if (data && data.length === 0) {
      setNoteData({
        date: String(date),
        note: "",
        exercises: [
          {
            exercise: "",
            sets: [{ weight: "", reps: "", rest: "" }],
          },
        ],
      });
    }
  }, [date, data]);

  if (!noteData) {
    return (
      <Center height="100vh">
        <Spinner size="xl" />
        <Text ml={4}>Loading...</Text>
      </Center>
    );
  }

  return (
    <Box p={4}>
      <Header />
      <Text fontSize="2xl" mb={4} textAlign="center">Note</Text>
      <Box width={containerWidth} margin="0 auto">
        <DateInput date={noteData.date} onDateChange={handleDateChange} />
        <NoteInput note={noteData.note} onNoteChange={handleNoteChange} />
      </Box>
      <Box mt={6} width={containerWidth} margin="0 auto">
        {noteData.exercises.map((exercise, eIndex) => (
          <Box key={eIndex} border="1px solid #000" borderRadius="4px" p={3} mb={4}>
            {/* "Exercise:" 行 */}
            <Box
              position="relative"
              pl="24px"
              onMouseEnter={() => setHoveredExercise(eIndex)}
              onMouseLeave={() => setHoveredExercise(null)}
            >
              <Box display="flex" alignItems="center" mb={2}>
                <Box fontWeight="bold" mr={2}>Exercise:</Box>
                <input
                  style={{ width: "100%", border: "none", outline: "none" }}
                  value={exercise.exercise}
                  onChange={(ev) => handleExerciseChange(ev, eIndex)}
                />
              </Box>
              {hoveredExercise === eIndex && openExerciseMenu !== eIndex && (
                <Box position="absolute" left="-8px" top="50%" transform="translateY(-50%)">
                  <IconButton
                    aria-label="Options"
                    icon={<HamburgerIcon />}
                    size="xs"
                    variant="ghost"
                    onClick={() => setOpenExerciseMenu(eIndex)}
                  />
                </Box>
              )}
              {openExerciseMenu === eIndex && (
                <Box
                  position="absolute"
                  left="-4px"
                  top="50%"
                  transform="translate(-100%, -50%)"
                  bg="white"
                  border="1px solid #ccc"
                  borderRadius="4px"
                  p={2}
                  zIndex={999}
                  ref={exerciseMenuRef}
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    _hover={{ bg: "red.100" }}
                    onClick={() => handleDeleteExercise(eIndex)}
                  >
                    Delete exercise
                  </Button>
                </Box>
              )}
            </Box>

            {/* セットのテーブル */}
            <Box
              as="table"
              border="1px solid #000"
              __css={{ borderCollapse: "collapse", width: "100%" }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Weight</th>
                  <th style={thStyle}>Reps</th>
                  <th style={thStyle}>Rest</th>
                </tr>
              </thead>
              <tbody>
                {exercise.sets.map((set, sIndex) => (
                  <tr key={sIndex}>
                    {/* "#"セルのみホバー判定 */}
                    <td
                      style={{ ...tdStyle, position: "relative" }}
                      onMouseEnter={() => setHoveredRow({ exIndex: eIndex, setIndex: sIndex })}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      {hoveredRow &&
                        hoveredRow.exIndex === eIndex &&
                        hoveredRow.setIndex === sIndex &&
                        !(openRowMenu &&
                          openRowMenu.exIndex === eIndex &&
                          openRowMenu.setIndex === sIndex) && (
                          <Box
                            position="absolute"
                            left="-8px"
                            top="50%"
                            transform="translateY(-50%)"
                          >
                            <IconButton
                              aria-label="Options"
                              icon={<HamburgerIcon />}
                              size="xs"
                              variant="ghost"
                              onClick={() => setOpenRowMenu({ exIndex: eIndex, setIndex: sIndex })}
                            />
                          </Box>
                        )}
                      {openRowMenu &&
                        openRowMenu.exIndex === eIndex &&
                        openRowMenu.setIndex === sIndex && (
                          <Box
                            position="absolute"
                            left="-4px"
                            top="50%"
                            transform="translate(-100%, -50%)"
                            bg="white"
                            border="1px solid #ccc"
                            borderRadius="4px"
                            p={2}
                            zIndex={999}
                            ref={rowMenuRef}
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              _hover={{ bg: "red.100" }}
                              onClick={() => handleDeleteRow(eIndex, sIndex)}
                            >
                              Delete
                            </Button>
                          </Box>
                        )}
                      {sIndex + 1}
                    </td>
                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        value={set.weight}
                        onChange={(ev) => handleInputChange(ev, eIndex, sIndex, "weight")}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        value={set.reps}
                        onChange={(ev) => handleInputChange(ev, eIndex, sIndex, "reps")}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        style={inputStyle}
                        value={set.rest}
                        onChange={(ev) => handleInputChange(ev, eIndex, sIndex, "rest")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "8px" }}>
                    <Button size="sm" onClick={() => handleAddSet(eIndex)}>
                      +Add set
                    </Button>
                  </td>
                </tr>
              </tfoot>
            </Box>
          </Box>
        ))}
        <Box textAlign="center">
          <Button onClick={handleAddExercise}>+Add Exercise</Button>
        </Box>
      </Box>
    </Box>
  );
};

export default NotePage;

/** テーブル見出し/セル */
const thStyle: React.CSSProperties = {
  border: "1px solid #000",
  padding: "8px",
  textAlign: "center",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #000",
  padding: "8px",
  textAlign: "center",
};

/** 入力欄 */
const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  outline: "none",
  textAlign: "center",
};
