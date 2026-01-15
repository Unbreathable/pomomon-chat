"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var hono_1 = require("hono");
var bun_1 = require("hono/bun");
var hono_2 = require("@valentinkolb/ssr/adapter/hono");
var logger_1 = require("hono/logger");
var _config_1 = require("@config");
var backend_1 = require("@/backend");
var pages_1 = require("@/frontend/pages");
// ==========================
// Main App
// ==========================
var redactSensitive = function (str) {
    return str.replace(/session_token=[^&\s]+/g, "session_token=[REDACTED]");
};
var app = new hono_1.Hono()
    .use((0, logger_1.logger)(function (str) {
    var rest = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        rest[_i - 1] = arguments[_i];
    }
    console.log.apply(console, __spreadArray([redactSensitive(str)], rest, false));
}))
    .route("/_ssr", (0, hono_2.routes)(_config_1.config))
    .route("/api", backend_1.default)
    .get("/llms.txt", function (c) { return c.text(backend_1.llms_txt); })
    .use("/public/*", (0, bun_1.serveStatic)({ root: "./" }))
    .route("/", pages_1.default)
    .notFound(function (c) { return (0, _config_1.html)(<pages_1.NotFound />, { title: "Not Found", c: c }); })
    .onError(function (err, c) {
    console.log(err);
    return c.text("Internal Server Error", 500);
});
// ==========================
// Server with WebSocket Support
// ==========================
exports.default = {
    port: parseInt((_a = process.env.PORT) !== null && _a !== void 0 ? _a : "3000", 10),
    fetch: app.fetch,
    websocket: backend_1.websocket,
};
