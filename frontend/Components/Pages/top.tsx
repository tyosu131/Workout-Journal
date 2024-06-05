import React from 'react';
import PrimaryButton from '../Atoms/Buttons/PrimaryButton';

const TOP: React.FC = () => {
  const onClickUpdate = () => alert('Button clicked');

  return (
    <div>
      <p>TOP</p>
      <PrimaryButton onClick={onClickUpdate}>作成</PrimaryButton>
    </div>
  );
};

TOP.displayName = 'TOP';

export default React.memo(TOP);
