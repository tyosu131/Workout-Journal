import { ReactNode, VFC } from "react";
import { Button } from "@chakra-ui/react";

type Props = {
  children: ReactNode;
  isFullWidth?: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  loading?: boolean;
  onClick: () => void;
};

export const PrimaryButton: VFC<Props> = (props) => {
  const {
    children,
    isFullWidth = false,
    disabled = false,
    loading = false,
    isLoading = false,
    onClick,
  } = props;

  return (
    <Button
      bg="teal.400"
      color="white"
      isFullWidth={isFullWidth}
      disabled={disabled || isLoading}
      isLoading={loading}
      _hover={{ opacity: 0.8 }}
      onClick={onClick}
    >
      {children}
    </Button>
  );
};
