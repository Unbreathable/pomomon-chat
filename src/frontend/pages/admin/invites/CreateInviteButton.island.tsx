import { api } from "@/frontend/lib/client-utils";
import { copyToClipboard } from "@/frontend/lib/client-utils";
import { createMutation } from "@/frontend/lib/mutation";
import { prompts } from "@/frontend/components/ui/prompts";
import { generate } from "lean-qr/nano";
import { toSvgDataURL } from "lean-qr/extras/svg";

/** Button to create a new invite with QR code display. */
export default function CreateInviteButton() {
  const mutation = createMutation({
    mutation: async () => {
      const data = await prompts.form({
        title: "Create Invite",
        icon: "ti ti-user-plus",
        fields: {
          realName: {
            label: "Name",
            description: "Real name of the new user",
            type: "text",
            required: true,
          },
        },
      });
      if (!data) return null;

      const res = await api.admin.invites.$post({
        json: { real_name: data.realName.trim() },
      });

      if (!res.ok) throw new Error("Error creating invite");

      return await res.json();
    },
    onError: async (error) => {
      await prompts.error(error.message);
    },
    onSuccess: async (data) => {
      if (!data) return;

      const svg = toSvgDataURL(generate(data.invite_url), {
        on: "black",
        off: "white",
      });

      await copyToClipboard(data.invite_url);

      await prompts.dialog(
        (close) => {
          return (
            <div class="flex flex-col gap-4 no-scrollbar">
              <img
                class="aspect-square h-auto w-full overflow-hidden rounded ring-2 ring-green-500 dark:ring-0"
                src={svg}
                alt="Invite URL"
              />

              <p class="text-dimmed text-xs md:text-sm">
                The{" "}
                <a
                  class="underline"
                  href={data.invite_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  invitation URL
                </a>{" "}
                was copied to clipboard. This URL is valid until{" "}
                {new Date(data.expires_at).toLocaleString()}
              </p>
            </div>
          );
        },
        { title: "Invitation Created" },
      );
    },
  });

  return (
    <button
      class="btn-primary justify-center"
      onClick={() => mutation.mutate({})}
      disabled={mutation.loading()}
    >
      {mutation.loading() ? (
        <i class="ti ti-loader-2 animate-spin" />
      ) : (
        <>
          <i class="ti ti-user-plus" />
          <span>Create</span>
        </>
      )}
    </button>
  );
}
