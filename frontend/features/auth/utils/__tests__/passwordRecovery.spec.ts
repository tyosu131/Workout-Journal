/// <reference types="jest" />

const createClient = () => ({
  auth: {
    setSession: jest.fn(),
    updateUser: jest.fn(),
    signOut: jest.fn(),
  },
});

const {
  establishPasswordRecoverySession,
  startPasswordRecoveryInitialization,
  updateRecoveredPassword,
} = require("../passwordRecovery") as typeof import("../passwordRecovery");

describe("password recovery", () => {
  it("starts recovery initialization only once when effect setup runs twice", async () => {
    const startedRef = { current: false };
    const initializationRef: { current: Promise<void> | null } = { current: null };
    const initialize = jest.fn().mockResolvedValue(undefined);

    const firstInitialization = startPasswordRecoveryInitialization(
      startedRef,
      initializationRef,
      initialize
    );
    const secondInitialization = startPasswordRecoveryInitialization(
      startedRef,
      initializationRef,
      initialize
    );

    await expect(firstInitialization).resolves.toBeUndefined();
    expect(secondInitialization).toBe(firstInitialization);
    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it("establishes an implicit recovery session only for a recovery fragment", async () => {
    const client = createClient();
    client.auth.setSession.mockResolvedValue({ error: null });

    await establishPasswordRecoverySession(client, {
      hash: "#access_token=recovery-access&refresh_token=recovery-refresh&type=recovery",
    });

    expect(client.auth.setSession).toHaveBeenCalledWith({
      access_token: "recovery-access",
      refresh_token: "recovery-refresh",
    });
  });

  it("rejects a fragment without a recovery type", async () => {
    const client = createClient();

    await expect(
      establishPasswordRecoverySession(client, {
        hash: "#access_token=recovery-access&refresh_token=recovery-refresh",
      })
    ).rejects.toThrow("missing its recovery type");

    expect(client.auth.setSession).not.toHaveBeenCalled();
  });

  it("rejects a non-recovery fragment", async () => {
    const client = createClient();

    await expect(
      establishPasswordRecoverySession(client, {
        hash: "#access_token=recovery-access&refresh_token=recovery-refresh&type=signup",
      })
    ).rejects.toThrow("not a password recovery link");

    expect(client.auth.setSession).not.toHaveBeenCalled();
  });

  it.each([
    "#access_token=recovery-access&type=recovery",
    "#refresh_token=recovery-refresh&type=recovery",
  ])("rejects an incomplete recovery fragment: %s", async (hash) => {
    const client = createClient();

    await expect(establishPasswordRecoverySession(client, { hash })).rejects.toThrow(
      "incomplete or expired"
    );

    expect(client.auth.setSession).not.toHaveBeenCalled();
  });

  it("treats a setSession error as an invalid or expired recovery link", async () => {
    const client = createClient();
    client.auth.setSession.mockResolvedValue({ error: new Error("expired") });

    await expect(
      establishPasswordRecoverySession(client, {
        hash: "#access_token=recovery-access&refresh_token=recovery-refresh&type=recovery",
      })
    ).rejects.toThrow("invalid or expired");
  });

  it("rejects a missing recovery fragment", async () => {
    const client = createClient();

    await expect(establishPasswordRecoverySession(client, { hash: "" })).rejects.toThrow(
      "password recovery link is required"
    );

    expect(client.auth.setSession).not.toHaveBeenCalled();
  });

  it("updates the password and clears the temporary local session", async () => {
    const client = createClient();
    client.auth.updateUser.mockResolvedValue({ error: null });
    client.auth.signOut.mockResolvedValue({ error: null });

    await updateRecoveredPassword(client, "new-password");

    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: "new-password" });
    expect(client.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("does not sign out when the password update fails", async () => {
    const client = createClient();
    client.auth.updateUser.mockResolvedValue({ error: new Error("update failed") });

    await expect(updateRecoveredPassword(client, "new-password")).rejects.toThrow(
      "Unable to update the password"
    );

    expect(client.auth.signOut).not.toHaveBeenCalled();
  });
});
