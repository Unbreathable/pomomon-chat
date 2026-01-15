import { createSignal } from "solid-js";
import { api } from "@/frontend/lib/client-utils";
import TextInput from "@/frontend/components/ui/forms/TextInput";
import { createMutation } from "@/frontend/lib/mutation";

/** Login form with username and password fields. */
export default function LoginForm() {
  const [username, setUsername] = createSignal("");
  const [password, setPassword] = createSignal("");

  const mutation = createMutation({
    mutation: async () => {
      const res = await api.auth.login.$post({
        json: { username: username(), password: password() },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error("message" in data ? data.message : "Login failed");
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
      />

      <TextInput
        placeholder="Password"
        icon="ti ti-lock"
        password
        value={password}
        onChange={setPassword}
      />

      {mutation.error() && (
        <div class="info-block-danger">
          <span>{mutation.error()?.message}</span>
        </div>
      )}

      <button
        type="submit"
        class="btn-primary w-full justify-center py-2"
        disabled={mutation.loading()}
        style={{ "min-height": "32px" }}
      >
        {mutation.loading() ? (
          <i class="ti ti-loader-2 animate-spin" />
        ) : (
          <>
            <i class="ti ti-login" />
            <span>Sign In</span>
          </>
        )}
      </button>
    </form>
  );
}
