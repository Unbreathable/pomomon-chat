import { html } from "@config";
import LoginForm from "./LoginForm.island";
import RegisterForm from "./RegisterForm.island";
import PasswordResetForm from "./PasswordResetForm.island";
import type { Context } from "hono";

export const loginPage = (c: Context) => {
  return html(
    <div class="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div class="flex flex-col items-center gap-4 w-full max-w-sm">
        <div class="paper w-full p-8">
          <h1 class="text-2xl font-bold text-center mb-8">Sign In</h1>
          <LoginForm />
          <p class="mt-6 text-center text-sm text-dimmed">
            Don't have an account?{" "}
            <a
              href="/auth/register"
              class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Register
            </a>
          </p>
        </div>
        <div class="text-center text-xs text-dimmed">
          <a href="/impressum" target="_blank" class="hover:text-primary">
            Impressum
          </a>
          {" · "}
          <a href="/datenschutz" target="_blank" class="hover:text-primary">
            Datenschutz
          </a>
          {" · "}
          <a href="/agb" target="_blank" class="hover:text-primary">
            AGB
          </a>
        </div>
      </div>
    </div>,
    { title: "Login", c },
  );
};

export const registerPage = (c: Context, token?: string) => {
  return html(
    <div class="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div class="flex flex-col items-center gap-4 w-full max-w-sm">
        <div class="paper w-full p-8">
          <h1 class="text-2xl font-bold text-center mb-8">Register</h1>
          <RegisterForm token={token} />
          <p class="mt-6 text-center text-sm text-dimmed">
            Already have an account?{" "}
            <a
              href="/auth/login"
              class="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Sign In
            </a>
          </p>
        </div>
        <div class="text-center text-xs text-dimmed">
          <a href="/impressum" target="_blank" class="hover:text-primary">
            Impressum
          </a>
          {" · "}
          <a href="/datenschutz" target="_blank" class="hover:text-primary">
            Datenschutz
          </a>
          {" · "}
          <a href="/agb" target="_blank" class="hover:text-primary">
            AGB
          </a>
        </div>
      </div>
    </div>,
    { title: "Registrieren", c },
  );
};

export const resetPasswordPage = (c: Context, token: string) => {
  return html(
    <div class="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <div class="paper w-full max-w-sm p-8">
        <h1 class="text-2xl font-bold text-center mb-8">Reset Password</h1>
        <PasswordResetForm token={token} />
      </div>
    </div>,
    { title: "Passwort zurücksetzen", c },
  );
};
