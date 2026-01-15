import { onMount } from "solid-js";
import { createWs } from "@/frontend/lib/websocket";
import type { WsServerMessage } from "@/shared/schemas";
import { showDesktopNotification } from "@/frontend/lib/client-utils";

/**
 * Client-side component that listens for global WebSocket notifications.
 * Shows desktop notifications for new messages when user is not in a specific room.
 */
export default function GlobalNotifications(props: { sessionToken: string }) {
  onMount(() => {
    createWs<WsServerMessage, never>({
      uri: `/api/ws?session_token=${props.sessionToken}`,
      autoReconnect: true,
      onMessage: (msg) => {
        if (msg.type !== "message") return;
        if (msg.data.content_type === "info") return;

        const {
          content_type,
          content,
          content_meta,
          chatroom_name,
          chatroom_id,
          created_by_username,
        } = msg.data;

        const getBody = () => {
          if (content_type === "image")
            return content_meta ? `Image: ${content_meta}` : "Sent an image";
          if (content_type === "gif")
            return content_meta ? `GIF: ${content_meta}` : "Sent a GIF";
          return content;
        };

        // For images/gifs, use the content as both icon and image
        const isMedia = content_type === "image" || content_type === "gif";
        const mediaUrl = isMedia ? content : undefined;

        showDesktopNotification({
          body: getBody(),
          title: `${created_by_username} in ${chatroom_name}`,
          icon: mediaUrl || `/api/chatrooms/${chatroom_id}/image`,
          image: mediaUrl,
          href: `/room/${chatroom_id}`,
          id: chatroom_id,
        });
      },
    });
  });

  return null;
}
