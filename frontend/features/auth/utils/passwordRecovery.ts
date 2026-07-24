import type { SupabaseClient } from "@supabase/supabase-js";

type RecoveryClient = {
  auth: Pick<SupabaseClient["auth"], "setSession" | "updateUser" | "signOut">;
};

type RecoveryLocation = {
  hash: string;
};

type MutableRef<T> = {
  current: T;
};

const getHashParams = (hash: string) => new URLSearchParams(hash.replace(/^#/, ""));

export const startPasswordRecoveryInitialization = (
  startedRef: MutableRef<boolean>,
  initializationRef: MutableRef<Promise<void> | null>,
  initialize: () => Promise<void>
) => {
  if (!startedRef.current) {
    startedRef.current = true;
    initializationRef.current = initialize();
  }

  return initializationRef.current;
};

export const establishPasswordRecoverySession = async (
  client: RecoveryClient,
  location: RecoveryLocation
) => {
  if (!location.hash || location.hash === "#") {
    throw new Error("A password recovery link is required.");
  }

  const hashParams = getHashParams(location.hash);
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const recoveryType = hashParams.get("type");

  if (!accessToken || !refreshToken) {
    throw new Error("The recovery link is incomplete or expired.");
  }
  if (!recoveryType) {
    throw new Error("The recovery link is missing its recovery type.");
  }
  if (recoveryType !== "recovery") {
    throw new Error("The link is not a password recovery link.");
  }

  const { error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) {
    throw new Error("The recovery link is invalid or expired.");
  }
};

export const updateRecoveredPassword = async (client: RecoveryClient, password: string) => {
  const { error } = await client.auth.updateUser({ password });
  if (error) {
    throw new Error("Unable to update the password. Please request a new recovery link.");
  }

  await client.auth.signOut({ scope: "local" });
};
