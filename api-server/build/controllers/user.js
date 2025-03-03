"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserDetails = void 0;
const AsyncHandler_1 = require("../utils/AsyncHandler");
const ApiError_1 = require("../utils/ApiError");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.getUserDetails = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const user = await prisma.user.findFirst({ where: { id: userId } });
    if (!user)
        throw new ApiError_1.ApiError(404, "User not found");
    res.json({ user }).status(200);
});
