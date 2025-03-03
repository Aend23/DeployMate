"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const ioredis_1 = __importDefault(require("ioredis"));
const uuidv4_1 = require("uuidv4");
const cassandraClient_1 = require("./services/cassandraClient");
const project_1 = __importDefault(require("./routes/project"));
const user_1 = __importDefault(require("./routes/user"));
const auth_1 = __importDefault(require("./routes/auth"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const passport_1 = __importDefault(require("passport"));
const passport_github2_1 = __importDefault(require("passport-github2"));
const client_1 = require("@prisma/client");
const express_session_1 = __importDefault(require("express-session"));
const ping_1 = require("./utils/ping");
dotenv_1.default.config();
const PORT = process.env.PORT || 8000;
const prismaClient = new client_1.PrismaClient();
const REDIS_URI = process.env.REDIS_URI || "";
let deploymentId = "";
async function initializeCassandra() {
    try {
        await (0, cassandraClient_1.downloadScbFromS3)();
        console.log("SCB download completed.");
        await cassandraClient_1.cassandraClient.connect();
        console.log("Cassandra Client connected Successfully!");
        await cassandraClient_1.cassandraClient.execute(`
      CREATE TABLE IF NOT EXISTS default_keyspace.Logs (
        event_id UUID,
        deployment_id TEXT,
        log TEXT,
        timestamp TIMESTAMP,
        PRIMARY KEY (event_id)
      );
    `);
        console.log("Table created or already exists");
    }
    catch (error) {
        console.error("Error initializing Cassandra:", error);
        throw error;
    }
}
async function initializeRedis() {
    const subscriber = new ioredis_1.default(REDIS_URI);
    try {
        await subscriber.psubscribe("logs:*");
        console.log("Redis subscribed to Logs Channel");
        subscriber.on("pmessage", async (pattern, channel, message) => {
            deploymentId = channel.split(":")[1];
            try {
                await cassandraClient_1.cassandraClient.execute(`INSERT INTO default_keyspace.Logs (event_id, deployment_id, log, timestamp) VALUES (?, ?, ?, toTimestamp(now()));`, [(0, uuidv4_1.uuid)(), deploymentId, message], { prepare: true });
                console.log("Inserted in Logs DB");
            }
            catch (error) {
                console.error("Error inserting log:", error);
            }
        });
    }
    catch (error) {
        console.error("Error initializing Redis:", error);
        throw error;
    }
}
async function startServer() {
    try {
        await initializeCassandra();
        await initializeRedis();
        const app = (0, express_1.default)();
        app.use((0, express_session_1.default)({
            resave: false,
            saveUninitialized: true,
            secret: process.env.SESSION_SECRET,
        }));
        app.use(passport_1.default.initialize());
        app.use(passport_1.default.session());
        passport_1.default.serializeUser((user, cb) => {
            cb(null, user);
        });
        passport_1.default.deserializeUser((obj, cb) => {
            cb(null, obj);
        });
        passport_1.default.use(new passport_github2_1.default.Strategy({
            clientID: process.env.GITHUB_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
            callbackURL: process.env.API_SERVER_URL + "/api/v1/auth/github/callback",
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await prismaClient.user.findFirst({
                    where: { githubId: profile.id },
                });
                if (!user) {
                    user = await prismaClient.user.create({
                        data: {
                            githubId: profile.id,
                            userName: profile.username || profile.login,
                            fullName: profile.displayName || profile.name || "",
                            email: profile.emails && profile.emails[0]?.value ? profile.emails[0].value : null,
                            avatarUrl: profile.photos && profile.photos[0]?.value ? profile.photos[0].value : "",
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
                    console.log("Existing user updated:", user);
                }
                return done(null, user);
            }
            catch (error) {
                console.error("Error in GitHub strategy:", error);
                return done(error);
            }
        }));
        app.use(express_1.default.json());
        app.use((0, cors_1.default)({ origin: "*" }));
        app.get("/", (req, res) => {
            res.send("Hello from launch pilot");
        });
        app.use("/api/v1/project", project_1.default);
        app.use("/api/v1/user", user_1.default);
        app.use("/api/v1/auth", auth_1.default);
        app.use("/api/v1/analytics", analytics_1.default);
        app.listen(PORT, () => {
            setInterval(ping_1.pingExternalServer, 30000);
            console.log("API server running at port " + PORT);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
startServer();
