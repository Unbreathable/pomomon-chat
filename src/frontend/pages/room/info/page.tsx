import { z } from "zod";
import { html } from "@config";
import Layout from "@/frontend/components/layout/Layout";
import type { AuthContext } from "@/backend/lib/auth";
import type { Context } from "hono";
import { NotFound } from "../../NotFound";
import { chatroomService } from "@/backend/services/chatrooms";
import { messageService } from "@/backend/services/messages";
import ChatroomActions from "./ChatroomActions.island";
import ImageGallery from "./ImageGallery.island";
import EditButton from "./EditButton.island";
import DeleteButton from "./DeleteButton.island";
import RemoveMemberButton from "./RemoveMemberButton.island";
import EditMemberButton from "./EditMemberButton.island";
import MemberActions from "./MemberActions.island";
import Avatar from "@/frontend/components/ui/Avatar";
import { Pagination } from "@/frontend/components/layout/Pagination";

/** Server-rendered chatroom info page with actions and image gallery. */
export const roomInfoPage = async (c: Context<AuthContext>) => {
  const user = c.get("user");
  const id = c.req.param("id");

  if (!z.uuid().safeParse(id).success) {
    return html(<NotFound />, { title: "Not Found", c });
  }

  const chatroom = await chatroomService.getById({ id, userId: user.id });
  if (!chatroom) return html(<NotFound />, { title: "Not Found", c });

  // Determine active tab from query params
  const showImages = c.req.query("images") !== undefined;
  const page = parseInt(c.req.query("page") || "1", 10);
  const perPage = 20;

  // Load data based on active tab
  let members: Awaited<ReturnType<typeof chatroomService.getMembers>> | null =
    null;
  let images: { messages: any[]; total: number } | null = null;

  if (showImages) {
    const imagesResult = await messageService.getAll({
      filters: { chatroomId: id, userId: user.id, contentType: "image" },
      page: 1,
      perPage: 100,
    });

    if ("error" in imagesResult) {
      return html(<NotFound />, { title: "Not Found", c });
    }

    images = { messages: imagesResult.messages, total: imagesResult.total };
  } else {
    const membersResult = await chatroomService.getMembers({
      chatroomId: id,
      page,
      perPage,
    });

    if ("error" in membersResult) {
      return html(<NotFound />, { title: "Not Found", c });
    }

    members = membersResult;
  }

  // Get counts for both tabs (we need them for the tab badges)
  const imageCountResult = await messageService.getAll({
    filters: { chatroomId: id, userId: user.id, contentType: "image" },
    page: 1,
    perPage: 1,
  });
  const imageCount = "error" in imageCountResult ? 0 : imageCountResult.total;

  // For townsquare, we don't show member count (all users are members)
  const isTownsquare = chatroom.is_townsquare;

  // Get member count for private rooms (need to fetch if on images tab)
  let memberCount = 0;
  if (!isTownsquare) {
    if (members && !("error" in members)) {
      memberCount = members.total;
    } else {
      const countResult = await chatroomService.getMembers({
        chatroomId: id,
        page: 1,
        perPage: 1,
      });
      memberCount = "error" in countResult ? 0 : countResult.total;
    }
  }

  const baseUrl = showImages
    ? `/room/${chatroom.id}/info?images&page=`
    : `/room/${chatroom.id}/info?page=`;

  return html(
    <Layout c={c} showSearchButton={false} enableNotifications={false}>
      <div class="container max-w-4xl mx-auto p-4">
        {/* Header */}
        <div class="flex flex-col items-center gap-4 md:gap-6 mb-6">
          <a
            href={`/room/${chatroom.id}`}
            class="paper p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Back to Chat"
          >
            <img
              src={`/api/chatrooms/${chatroom.id}/image`}
              alt={chatroom.name}
              class="w-24 h-24 rounded-xl"
            />
          </a>

          <div class="text-center w-full max-w-md mx-auto">
            <h1 class="text-2xl font-bold text-zinc-900 dark:text-zinc-100 wrap-break-word">
              {chatroom.name}
            </h1>
            {chatroom.description && (
              <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1 wrap-break-word">
                {chatroom.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <ChatroomActions chatroom={chatroom} userId={user.id} />
        </div>

        {/* Tabs and Content */}
        <div class="mt-8">
          <div class="flex flex-row flex-wrap justify-center sm:justify-start gap-2 mb-2">
            <a
              href={`/room/${chatroom.id}/info`}
              class={`paper rounded-full px-4 py-2 text-sm sm:text-md font-semibold flex items-center gap-2 ${
                !showImages
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              <i class="ti ti-users" />
              <span class="hidden sm:inline">Users</span>
              {!isTownsquare && (
                <span class="hidden sm:inline text-sm font-normal opacity-70">
                  ({memberCount})
                </span>
              )}
            </a>

            <a
              href={`/room/${chatroom.id}/info?images`}
              class={`paper rounded-full px-4 py-2 text-sm sm:text-md font-semibold flex items-center gap-2 ${
                showImages
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-black"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              <i class="ti ti-photo" />
              <span class="hidden sm:inline">Images</span>
              <span class="hidden sm:inline text-sm font-normal opacity-70">
                ({imageCount})
              </span>
            </a>

            {chatroom.can_manage && (
              <EditButton chatroom={chatroom} isAdmin={user.role === "admin"} />
            )}

            {chatroom.can_manage && <DeleteButton chatroom={chatroom} />}
          </div>

          {showImages ? (
            // Images tab content
            images && images.messages.length === 0 ? (
              <div class="text-center py-12 text-zinc-500 dark:text-zinc-400">
                <i class="ti ti-photo-off text-md mb-6" />
                <p class="text-xs">No images in this chat yet</p>
              </div>
            ) : (
              images && (
                <ImageGallery
                  chatroomId={chatroom.id}
                  initialImages={images.messages.map((m) => m.content)}
                  hasMore={images.total > images.messages.length}
                  totalCount={images.total}
                />
              )
            )
          ) : (
            // Users tab content
            <>
              {isTownsquare && (
                <div class="paper p-4 mb-4 text-center text-sm text-dimmed">
                  <i class="ti ti-world mr-2" />
                  This is a public room – all users can participate.
                </div>
              )}

              {members && (
                <>
                  {isTownsquare && members.members.length > 0 && (
                    <h3 class="text-sm font-semibold text-dimmed mb-3">
                      Room {members.members.length === 1 ? "Admin" : "Admins"}
                    </h3>
                  )}

                  {!isTownsquare &&
                    chatroom.can_manage &&
                    chatroom.join_token && (
                      <MemberActions
                        chatroomId={chatroom.id}
                        chatroomName={chatroom.name}
                        joinToken={chatroom.join_token}
                        existingMemberIds={members.members.map((m) => m.id)}
                      />
                    )}

                  {members.members.length === 0 ? (
                    !isTownsquare && (
                      <div class="text-center py-12 text-zinc-500 dark:text-zinc-400">
                        <i class="ti ti-users-off text-md mb-6" />
                        <p class="text-xs">No members in this chatroom</p>
                      </div>
                    )
                  ) : (
                    <div class="flex flex-col gap-2">
                      {members.members.map((member) => (
                        <div
                          class="paper p-2"
                          style={`view-transition-name: room-member-${member.id}`}
                        >
                          <div class="flex items-center gap-3">
                            <Avatar
                              userId={member.id}
                              username={member.username}
                              size="md"
                            />
                            <div class="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:gap-2">
                              <span class="font-semibold truncate text-sm min-w-0 shrink">
                                {member.username}
                              </span>
                              {(member.chatroom_role === "manage" ||
                                member.role === "admin") && (
                                <div class="flex items-center gap-1 mt-0.5 sm:mt-0 shrink-0">
                                  {member.chatroom_role === "manage" && (
                                    <span class="rounded bg-amber-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                                      Room Admin
                                    </span>
                                  )}
                                  {member.role === "admin" && (
                                    <span class="rounded bg-zinc-900 px-1.5 py-0.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-black">
                                      Admin
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            {chatroom.can_manage && (
                              <div class="flex items-center">
                                <EditMemberButton
                                  chatroomId={chatroom.id}
                                  userId={member.id}
                                  username={member.username}
                                  currentRole={member.chatroom_role}
                                />
                                <RemoveMemberButton
                                  chatroomId={chatroom.id}
                                  userId={member.id}
                                  username={member.username}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Pagination
                    currentPage={page}
                    totalPages={members.totalPages}
                    baseUrl={baseUrl}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>,
    { title: `${chatroom.name} - Info`, c },
  );
};
