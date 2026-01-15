import { z } from "zod";
import { html } from "@config";
import Layout from "@/frontend/components/layout/Layout";
import type { AuthContext } from "@/backend/lib/auth";
import type { Context } from "hono";
import { NotFound } from "../../NotFound";
import { chatroomService } from "@/backend/services/chatrooms";

/** Server-rendered join page for chatroom invites. */
export const joinPage = async (c: Context<AuthContext>) => {
  const user = c.get("user");
  const id = c.req.param("id");
  const token = c.req.query("token");

  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(token).success) {
    return html(<NotFound />, { title: "Not Found", c });
  }

  // Try to join directly - this validates the token
  const result = await chatroomService.joinByToken({
    chatroomId: id,
    userId: user.id,
    joinToken: token!,
  });

  if (!result.success) {
    return html(<NotFound />, { title: "Not Found", c });
  }

  // Get chatroom info now that user has access
  const chatroom = await chatroomService.getById({ id, userId: user.id });
  if (!chatroom) {
    return html(<NotFound />, { title: "Not Found", c });
  }

  return html(
    <Layout c={c}>
      <div class="h-full flex items-center justify-center p-4">
        <div
          class="paper p-6 max-w-md w-full text-center border-green-500"
          style="box-shadow: 0 0 20px rgba(34, 197, 94, 0.4)"
        >
          <h1
            class="text-xl font-bold mb-2 bg-clip-text text-transparent"
            style="background-image: linear-gradient(135deg, #22c55e, #10b981)"
          >
            Joined!
          </h1>
          <p class="text-dimmed mb-4">
            You are now a member of <strong>{chatroom.name}</strong>
          </p>
          <a href={`/room/${id}`} class="btn-primary px-4 py-2">
            Open
          </a>
        </div>
      </div>
    </Layout>,
    { title: `Joined ${chatroom.name}`, c },
  );
};
