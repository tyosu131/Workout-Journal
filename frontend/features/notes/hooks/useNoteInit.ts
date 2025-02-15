// frontend/features/notes/hooks/useNoteInit.ts
import { useState, useEffect } from "react";
import useSWR from "swr";
import { useBreakpointValue } from "@chakra-ui/react";
import { fetchNotesAPI } from "../api";
import { NoteData } from "../../../types/types";

/**
 * 指定した日付に応じたノートデータを取得または初期化するフック
 * - DBにノートがあればそのまま返す
 * - 存在しない場合、すべてのデバイスで初期は「1 Exercise × 1 Set」とする
 */
export function useNoteInit(dateParam: string | undefined) {
  const [noteData, setNoteData] = useState<NoteData | null>(null);
  const { data, error } = useSWR<NoteData[]>(
    dateParam ? dateParam : null,
    (d: string) => fetchNotesAPI(d),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  );

  useEffect(() => {
    if (!dateParam) return;
    if (data && data.length > 0) {
      setNoteData(data[0]);
    } else if (data && data.length === 0) {
      // 新規の場合、初期は1 Exercise × 1 Set
      setNoteData({
        date: dateParam,
        note: "",
        exercises: [
          {
            exercise: "",
            sets: [
              {
                weight: "",
                reps: "",
                rest: "",
              },
            ],
          },
        ],
      });
    }
  }, [dateParam, data]);

  const isLoading = !data && !error;
  return { noteData, setNoteData, isLoading, error };
}
