import { createSignal } from "solid-js";
import { api } from "@/frontend/lib/client-utils";
import TextInput from "@/frontend/components/ui/forms/TextInput";
import { createMutation } from "@/frontend/lib/mutation";

/** Registration form with invite token support. */
export default function RegisterForm(props: { token?: string }) {
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [passwordConfirm, setPasswordConfirm] = createSignal("");
  const [inviteToken, setInviteToken] = createSignal(props.token || "");
  const [acceptTerms, setAcceptTerms] = createSignal(false);

  const mutation = createMutation({
    mutation: async () => {
      const res = await api.auth.register.$post({
        json: {
          invite_token: inviteToken(),
          username: username(),
          password: password(),
          passwordConfirm: passwordConfirm(),
          acceptTerms: acceptTerms(),
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          "message" in data ? data.message : "Registration failed",
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
        placeholder="Username"
        icon="ti ti-user"
        value={username}
        onChange={setUsername}
        description="3-20 characters, letters, numbers and underscores only"
      />

      <TextInput
        icon="ti ti-lock"
        placeholder="Password"
        password
        value={password}
        onChange={setPassword}
        description="8-128 characters, at least one letter and one number or special character"
      />

      <TextInput
        icon="ti ti-lock"
        placeholder="Confirm Password"
        password
        value={passwordConfirm}
        onChange={setPasswordConfirm}
      />

      <hr class="border-gray-200 dark:border-gray-700" />

      <TextInput
        icon="ti ti-lock-password"
        placeholder="Invite Token"
        value={inviteToken}
        onChange={setInviteToken}
      />

      <label class="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={acceptTerms()}
          onChange={(e) => setAcceptTerms(e.target.checked)}
          class="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800"
        />
        <span class="text-sm text-secondary">
          I accept the{" "}
          <a href="/agb" target="_blank" class="underline hover:text-primary">
            Terms of Service
          </a>{" "}
          (incl. Privacy Policy)
        </span>
      </label>

      {mutation.error() && (
        <div class="info-block-danger">
          <span>{mutation.error()?.message}</span>
        </div>
      )}

      <button
        type="submit"
        class="btn-primary w-full justify-center py-2"
        disabled={mutation.loading()}
      >
        {mutation.loading() ? (
          <i class="ti ti-loader-2 animate-spin" />
        ) : (
          <>
            <i class="ti ti-user-plus" />
            <span>Register</span>
          </>
        )}
      </button>
    </form>
  );
}
