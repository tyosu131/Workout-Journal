import React, { memo } from 'react';
import { PrimaryButton } from '../Atoms/Buttons/PrimaryButton';

export const TOP: React.FC = memo(() => {
  const onClickUpdate = () => alert();

  return (
    <div>
      <p>TOP</p>
      <PrimaryButton onClick={onClickUpdate}>作成</PrimaryButton>
    </div>
  );
});
