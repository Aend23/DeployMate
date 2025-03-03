"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_github2_1 = __importDefault(require("passport-github2"));
const client_1 = require("@prisma/client");
const prismaClient = new client_1.PrismaClient();
passport_1.default.use(new passport_github2_1.default.Strategy({
    clientID: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    callbackURL: process.env.API_SERVER_URL + "/api/v1/auth/github/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await prismaClient.user.findFirst({
            where: { githubId: profile.githubId },
        });
        if (!user) {
            user = await prismaClient.user.create({
                data: {
                    githubId: profile.id,
                    userName: profile.username || profile.login,
                    fullName: profile.displayName || profile.name || "",
                    email: profile.emails && profile.emails[0]?.value
                        ? profile.emails[0].value
                        : null,
                    avatarUrl: profile.photos && profile.photos[0]?.value
                        ? profile.photos[0].value
                        : "",
                    profileUrl: profile.profileUrl || profile._json.html_url,
                    bio: profile._json.bio || "",
                    location: profile._json.location || "",
                    company: profile._json.company || "",
                    blog: profile._json.blog || "",
                    githubCreatedAt: new Date(profile._json.created_at),
                    githubAccessToken: accessToken || "",
                },
            });
        }
        else {
            user = await prismaClient.user.update({
                where: { id: user.id },
                data: {
                    githubAccessToken: accessToken,
                },
            });
        }
        return done(null, user);
    }
    catch (error) {
        return done(error);
    }
}));
