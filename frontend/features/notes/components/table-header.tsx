// frontend/features/notes/components/table-header.tsx
import React from "react";
import { useBreakpointValue } from "@chakra-ui/react";

/**
 * PC (lg以上) では 1行=16列 (Exercise + 5セット × (Weight, Reps, Rest))
 * モバイル/タブレット (lg未満) は表示しない
 */
const TableHeader: React.FC = () => {
  const screenSize = useBreakpointValue({ base: "mobile", md: "tablet", lg: "pc" });

  if (screenSize !== "pc") {
    // モバイル/タブレットは非表示
    return null;
  }

  // PC: 従来の横長ヘッダー
  return (
    <thead>
      <tr>
        <th style={thStyle}>Exercise</th>
        {[...Array(5)].map((_, i) => (
          <React.Fragment key={i}>
            <th style={thStyle}>Weight</th>
            <th style={thStyle}>Reps</th>
            <th style={thStyle}>Rest</th>
          </React.Fragment>
        ))}
      </tr>
    </thead>
  );
};

export default TableHeader;

const thStyle: React.CSSProperties = {
  border: "1px solid #000",
  padding: "4px",
  textAlign: "center",
  whiteSpace: "nowrap",
};
