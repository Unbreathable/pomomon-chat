import { createSignal } from "solid-js";
import { api } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import TextInput from "@/frontend/components/ui/forms/TextInput";

/** Form to reset password using a reset token. */
export default function PasswordResetForm(props: { token: string }) {
  const [password, setPassword] = createSignal("");
  const [confirmPassword, setConfirmPassword] = createSignal("");

  const mutation = createMutation({
    mutation: async () => {
      const res = await api.auth["reset-password"].$post({
        json: {
          reset_token: props.token,
          password: password(),
          passwordConfirm: confirmPassword(),
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Error resetting password",
        );
      }
    },
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate({});
      }}
      class="flex flex-col gap-4"
    >
      <TextInput
        password
        icon="ti ti-key"
        value={password}
        onChange={setPassword}
        label="New Password"
        placeholder="New password"
        description="8-128 characters, at least one letter and one number or special character"
        required
      />

      <TextInput
        password
        icon="ti ti-key"
        value={confirmPassword}
        onChange={setConfirmPassword}
        label="Confirm Password"
        placeholder="Repeat password"
        required
      />

      {mutation.error() && (
        <div class="info-block-danger">
          <span>{mutation.error()?.message}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={mutation.loading()}
        class="btn-primary px-4 py-2 justify-center"
      >
        {mutation.loading() ? (
          <>
            <i class="ti ti-loader-2 animate-spin" />
            <span>Resetting...</span>
          </>
        ) : (
          <>
            <i class="ti ti-key" />
            <span>Reset Password</span>
          </>
        )}
      </button>
    </form>
  );
}
