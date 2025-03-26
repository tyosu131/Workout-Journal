import { useEffect } from "react";

const useAutosizeTextAreaEffect = (textAreaRef: HTMLTextAreaElement | null, value: string) => {
  useEffect(() => {
    if (textAreaRef) {
      textAreaRef.style.height = "auto";
      textAreaRef.style.height = `${textAreaRef.scrollHeight}px`;
    }
  }, [textAreaRef, value]);
};

export default useAutosizeTextAreaEffect;
