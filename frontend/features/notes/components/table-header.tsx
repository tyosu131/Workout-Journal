// frontend/features/notes/components/table-header.tsx
import React from "react";
import { useBreakpointValue } from "@chakra-ui/react";

/**
 * Desktop (lg and above) uses 16 columns per row (Exercise + 5 sets × Weight, Reps, Rest).
 * Hidden on mobile and tablet (below lg).
 */
const TableHeader: React.FC = () => {
  const screenSize = useBreakpointValue({ base: "mobile", md: "tablet", lg: "pc" });

  if (screenSize !== "pc") {
    // Hidden on mobile and tablet
    return null;
  }

  // Desktop: traditional wide header
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
