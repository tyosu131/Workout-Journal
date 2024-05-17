import { memo, } from "react";
import { PrimaryButton } from "../Atoms/Buttons/PrimaryButton";

// eslint-disable-next-line react/display-name
export const TOP = memo(() => {
  return <p>TOP</p>;
});

const onClickUpdate = () => alert();
<PrimaryButton onClick={onClickUpdate}>作成</PrimaryButton>