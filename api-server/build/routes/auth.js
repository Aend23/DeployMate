"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "";
const client_1 = require("@prisma/client");
const prismaClient = new client_1.PrismaClient();
const router = express_1.default.Router();
router.get("/guestLogin", async (req, res) => {
    try {
        const guestUser = await prismaClient.user.findFirst({
            where: { githubId: process.env.GUEST_USER_ID },
        });
        if (!guestUser) {
            return res.status(404).json({ error: "Guest user not found" });
        }
        const token = generateToken(guestUser);
        res.json({ guestUser, token });
    }
    catch (error) {
        console.error("Error in guest login:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/github", passport_1.default.authenticate("github"));
router.get("/github/callback", passport_1.default.authenticate("github", { session: true }), (req, res) => {
    const token = generateToken(req.user);
    res.redirect(`https://zaplaunch.tech/auth-callback?token=${token}`);
    // res.redirect(`http://localhost:5173/auth-callback?token=${token}`);
});
router.get('/signout', (req, res) => {
    try {
        req.session.destroy(function (err) {
            console.log('session destroyed.');
        });
        res.send('Done');
    }
    catch (err) {
        res.status(400).send({ message: 'Failed to sign out fb user' });
    }
});
const generateToken = (user) => {
    return jsonwebtoken_1.default.sign({
        id: user.id,
    }, JWT_SECRET, { expiresIn: "7d" });
};
exports.default = router;
