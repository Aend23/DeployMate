"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const project_1 = __importDefault(require("./routes/project"));
const user_1 = __importDefault(require("./routes/user"));
const auth_1 = __importDefault(require("./routes/auth"));
const analytics_1 = __importDefault(require("./routes/analytics"));
dotenv_1.default.config();
exports.app = (0, express_1.default)();
exports.app.use(passport_1.default.initialize());
exports.app.get("/", (req, res) => {
    res.send("Hello from launch pilot");
});
exports.app.use(express_1.default.json());
exports.app.use((0, cors_1.default)({ origin: "*" }));
exports.app.use("/api/v1/project", project_1.default);
exports.app.use("/api/v1/user", user_1.default);
exports.app.use("/api/v1/auth", auth_1.default);
exports.app.use("/api/v1/analytics", analytics_1.default);
