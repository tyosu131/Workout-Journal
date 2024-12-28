import React from "react";
import { Tr, Th } from "@chakra-ui/react";

const TableHeader: React.FC = () => (
  <thead>
    <Tr>
      <Th border="1px solid #000">Exercise</Th>
      <Th border="1px solid #000">Weight</Th>
      <Th border="1px solid #000">Reps</Th>
      <Th border="1px solid #000">Rest</Th>
      <Th border="1px solid #000">Weight</Th>
      <Th border="1px solid #000">Reps</Th>
      <Th border="1px solid #000">Rest</Th>
      <Th border="1px solid #000">Weight</Th>
      <Th border="1px solid #000">Reps</Th>
      <Th border="1px solid #000">Rest</Th>
      <Th border="1px solid #000">Weight</Th>
      <Th border="1px solid #000">Reps</Th>
      <Th border="1px solid #000">Rest</Th>
      <Th border="1px solid #000">Weight</Th>
      <Th border="1px solid #000">Reps</Th>
      <Th border="1px solid #000">Rest</Th>
    </Tr>
  </thead>
);

TableHeader.displayName = "TableHeader";
export default TableHeader;
