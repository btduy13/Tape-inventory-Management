// Result shape returned by auth Server Actions to useActionState.
export type AuthActionState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export const IDLE: AuthActionState = { status: "idle" };

export const fail = (message: string): AuthActionState => ({ status: "error", message });
export const ok = (message: string): AuthActionState => ({ status: "success", message });
