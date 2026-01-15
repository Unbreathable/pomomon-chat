import { z } from "zod";
import { html } from "@config";
import Layout from "@/frontend/components/layout/Layout";
import ChatWindow from "./ChatWindow.island";
import type { AuthContext } from "@/backend/lib/auth";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { NotFound } from "../NotFound";
import { groupMessages } from "./util";
import { chatroomService } from "@/backend/services/chatrooms";
import { messageService } from "@/backend/services/messages";

/** Server-rendered chatroom page with initial messages pre-loaded. */
export const roomPage = async (c: Context<AuthContext>) => {
  const user = c.get("user");
  const sessionToken = c.get("sessionToken");
  const id = c.req.param("id");

  if (!z.uuid().safeParse(id).success) {
    return html(<NotFound />, { title: "Not Found", c });
  }

  const chatroom = await chatroomService.getById({ id, userId: user.id });
  if (!chatroom) return html(<NotFound />, { title: "Not Found", c });

  const messagesResult = await messageService.getAll({
    filters: { chatroomId: id, userId: user.id },
    page: 1,
    perPage: 100,
  });

  // Access already checked via getById, but handle edge case
  if ("error" in messagesResult) {
    return html(<NotFound />, { title: "Not Found", c });
  }

  const { messages, total } = messagesResult;
  const chronological = [...messages].reverse();
  const initialGroups = groupMessages(chronological, user.id);

  // Check if GIFs are disabled via cookie
  const gifsDisabled = getCookie(c, "disable_gifs") === "true";

  return html(
    <Layout c={c} showSearchButton={false} enableNotifications={false} noHeader>
      <div class="h-full overflow-hidden max-w-7xl mx-auto">
        <ChatWindow
          chatroomId={chatroom.id}
          sessionToken={sessionToken}
          roomName={chatroom.name}
          userId={user.id}
          groups={initialGroups}
          hasMore={total > messages.length}
          gifsDisabled={gifsDisabled}
        />
      </div>
    </Layout>,
    { title: chatroom.name, c },
  );
};
