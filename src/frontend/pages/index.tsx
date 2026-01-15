import { Hono } from "hono";
import { auth, type AuthContext } from "@/backend/lib/auth";
import { NotFound } from "./NotFound";
import { homePage } from "./home/page";
import { roomPage } from "./room/page";
import { roomInfoPage } from "./room/info/page";
import { joinPage } from "./room/join/page";
import { adminPage } from "./admin/page";
import { invitesPage } from "./admin/invites/page";
import { demoPage } from "./demo/page";
import { loginPage, registerPage, resetPasswordPage } from "./auth/page";
import { mePage } from "./me/page";
import { agbPage } from "./legal/agb";
import { datenschutzPage } from "./legal/datenschutz";
import { impressumPage } from "./legal/impressum";

const pages = new Hono<AuthContext>()
  .get("/", auth.middleware.redirectIfNotAuthenticated, homePage)
  .get("/room/:id", auth.middleware.redirectIfNotAuthenticated, roomPage)
  .get(
    "/room/:id/info",
    auth.middleware.redirectIfNotAuthenticated,
    roomInfoPage,
  )
  .get("/room/:id/join", auth.middleware.redirectIfNotAuthenticated, joinPage)
  .get(
    "/admin",
    auth.middleware.redirectIfNotAuthenticated,
    auth.middleware.requireAdmin,
    adminPage,
  )
  .get(
    "/admin/invites",
    auth.middleware.redirectIfNotAuthenticated,
    auth.middleware.requireAdmin,
    invitesPage,
  )
  .get("/me", auth.middleware.redirectIfNotAuthenticated, mePage)
  .get("/demo", demoPage)
  // Auth routes
  .get("/auth/login", auth.middleware.redirectIfAuthenticated, loginPage)
  .get("/auth/register", auth.middleware.redirectIfAuthenticated, (c) =>
    registerPage(c),
  )
  .get("/auth/register/:token", auth.middleware.redirectIfAuthenticated, (c) =>
    registerPage(c, c.req.param("token")),
  )
  .get("/auth/reset/:token", auth.middleware.redirectIfAuthenticated, (c) =>
    resetPasswordPage(c, c.req.param("token")),
  )
  // Legal routes
  .get("/agb", agbPage)
  .get("/datenschutz", datenschutzPage)
  .get("/impressum", impressumPage);

export default pages;
export { NotFound };
