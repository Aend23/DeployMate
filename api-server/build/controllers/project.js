"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProject = exports.updateIsLive = exports.getBranches = exports.getRepos = exports.getLogs = exports.checkProjectExists = exports.changeStatus = exports.getDeploymentsByProjectID = exports.getProjectById = exports.getAllProjects = exports.deployProject = exports.updateEnvFields = exports.updateProject = exports.createProject = void 0;
const AsyncHandler_1 = require("../utils/AsyncHandler");
const ApiResponse_1 = require("../utils/ApiResponse");
const client_1 = require("@prisma/client");
const ApiError_1 = require("../utils/ApiError");
const cassandraClient_1 = require("../services/cassandraClient");
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const SQSconfig_1 = require("../aws/SQSconfig");
const axios_1 = __importDefault(require("axios"));
const S3_1 = require("../aws/S3");
const prismaClient = new client_1.PrismaClient();
exports.createProject = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const { gitUrl, projectName } = req.body;
    const userId = req.userId;
    const existingProject = await prismaClient.project.findFirst({
        where: {
            projectName,
        },
    });
    if (existingProject) {
        throw new ApiError_1.ApiError(400, "Project with this name already exists");
    }
    const [owner, repo] = gitUrl.replace("https://github.com/", "").split("/");
    const user = await prismaClient.user.findFirst({ where: { id: userId } });
    if (!user)
        throw new ApiError_1.ApiError(404, "User not found");
    let defaultBranch = "";
    try {
        const repoResponse = await axios_1.default.get(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
                Authorization: `token ${user.githubAccessToken}`,
                Accept: "application/vnd.github.v3+json",
            },
        });
        defaultBranch = repoResponse.data?.default_branch;
    }
    catch (e) {
        console.log(e);
    }
    const project = await prismaClient.project.create({
        data: {
            projectName,
            gitUrl,
            userId,
            branch: defaultBranch,
            env: ""
        },
    });
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, "Project created successfully", { projectId: project.id }, true));
});
exports.updateProject = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const { buildCommand, installCommand, projectId, branch, srcDir } = req.body;
    const existingProject = await prismaClient.project.findFirst({
        where: {
            id: projectId,
        },
    });
    if (existingProject && existingProject?.id !== projectId) {
        throw new ApiError_1.ApiError(409, "Project Name already taken");
    }
    const updatedProject = await prismaClient.project.update({
        where: { id: projectId }, data: { buildCommand, installCommand, branch, lastModified: new Date(), srcDir }
    });
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, "Project updated successfully", { projectId: updatedProject.id }, true));
});
exports.updateEnvFields = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const { env, projectId } = req.body;
    console.log(projectId);
    const updatedProject = await prismaClient.project.update({
        where: { id: projectId }, data: { env }
    });
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, "Project env updated successfully", { projectId: updatedProject.id }, true));
});
exports.deployProject = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const projectId = req.params.projectId;
    const project = await prismaClient.project.findUnique({
        where: {
            id: projectId,
        },
        include: {
            user: true,
        },
    });
    if (!project)
        throw new ApiError_1.ApiError(404, "Project not found");
    const token = project.user.githubAccessToken;
    if (!token) {
        throw new ApiError_1.ApiError(401, "User's GitHub access token not found");
    }
    const repoUrlParts = project.gitUrl.split("/");
    const owner = repoUrlParts[repoUrlParts.length - 2];
    const repo = repoUrlParts[repoUrlParts.length - 1].replace(".git", "");
    let latestCommitMessage = "No commit message";
    try {
        const commitResponse = await axios_1.default.get(`https://api.github.com/repos/${owner}/${repo}/commits?sha=${project.branch}`, {
            headers: {
                Authorization: `token ${token}`,
            },
        });
        latestCommitMessage =
            commitResponse.data[0]?.commit?.message || "No commit message";
    }
    catch (error) {
        console.error("Error fetching the latest commit:", error.message);
        throw new ApiError_1.ApiError(500, "Error fetching the latest commit message");
    }
    const deployment = await prismaClient.deployment.create({
        data: {
            projectId: projectId,
            title: latestCommitMessage,
            status: "QUEUED",
        },
    });
    const sqsClient = new aws_sdk_1.default.SQS((0, SQSconfig_1.getSQSConfig)());
    const paramsSendMessage = {
        MessageBody: JSON.stringify({
            gitUrl: project.gitUrl,
            projectName: project.projectName,
            deploymentId: deployment.id,
            env: project.env,
            branch: project.branch,
            installCommand: project.installCommand,
            buildCommand: project.buildCommand,
            token,
            srcDir: project.srcDir
        }),
        QueueUrl: process.env.AWS_SQS_URL,
    };
    sqsClient.sendMessage(paramsSendMessage, (err, data) => {
        if (err) {
            console.log("Error", err);
        }
        else {
            console.log("Successfully added message", data.MessageId);
        }
    });
    await prismaClient.project.update({
        where: { id: projectId }, data: { lastDeployed: new Date() }
    });
    res.json({
        message: "QUEUED",
        data: {
            title: latestCommitMessage,
            projectId,
            status: "QUEUED",
            url: `http://${project.projectName}.localhost:3000`, // Example project URL
            id: deployment.id,
        },
    });
});
exports.getAllProjects = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const userIdProvided = req.params.userId;
    if (userId !== userIdProvided) {
        throw new ApiError_1.ApiError(403, "Forbidden");
    }
    const projects = await prismaClient.project.findMany({
        where: {
            userId,
        },
    });
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, "Fetched Projects", { projects }, true));
});
exports.getProjectById = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const projectId = req.params.projectId;
    const project = await prismaClient.project.findFirst({
        where: {
            id: projectId,
        },
    });
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, "Fetched Projects", { project }, true));
});
exports.getDeploymentsByProjectID = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const projectId = req.params.projectId;
    const deployments = await prismaClient.deployment.findMany({
        where: {
            projectId,
        },
        orderBy: {
            createdAt: "desc",
        },
    });
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, "Fetched Deployments", { deployments }, true));
});
exports.changeStatus = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const deploymentId = req.params.deployId;
    const status = req.body.status;
    const updatedDeployment = await prismaClient.deployment.update({
        where: {
            id: deploymentId,
        },
        data: {
            status,
        },
    });
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, "Status updated", { updatedDeployment }, true));
});
exports.checkProjectExists = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const projectId = req.params.projectId;
    const exists = await prismaClient.project.findFirst({
        where: {
            id: projectId,
        },
    });
    if (exists)
        throw new ApiError_1.ApiError(400, "Project Already exists");
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, "Project does not exists", {}, true));
});
exports.getLogs = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const deployId = req.params.deployId;
    // Validate deployId
    if (!deployId || typeof deployId !== 'string') {
        throw new ApiError_1.ApiError(400, "Invalid deployment ID");
    }
    const deployment = await prismaClient.deployment.findUnique({
        where: {
            id: deployId,
        },
    });
    if (!deployment) {
        throw new ApiError_1.ApiError(404, "Deployment does not exist");
    }
    try {
        const result = await cassandraClient_1.cassandraClient.execute(`
      SELECT * FROM default_keyspace.Logs WHERE deployment_id = ? ALLOW FILTERING;
      `, [deployId], { prepare: true });
        const logs = result.rows.map((row) => ({
            log: row.log,
            timestamp: row.timestamp
        }));
        res.status(200).json(new ApiResponse_1.ApiResponse(200, "Logs retrieved successfully", { deploymentStatus: deployment.status, logs }, true));
    }
    catch (error) {
        console.error("Error retrieving logs:", error);
        throw new ApiError_1.ApiError(500, `Internal Server Error: ${error.message}`);
    }
});
exports.getRepos = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const user = await prismaClient.user.findFirst({ where: { id: userId } });
    if (!user)
        throw new ApiError_1.ApiError(404, "User not found");
    try {
        console.log("user");
        console.log(user);
        const response = await axios_1.default.get("https://api.github.com/user/repos", {
            headers: {
                Authorization: `token ${user.githubAccessToken}`,
                Accept: "application/vnd.github.v3+json",
            },
            params: {
                sort: "updated",
                per_page: 100, // Adjust as needed
            },
        });
        const repos = response.data.map((repo) => ({
            id: repo.id,
            name: repo.name,
            private: repo.private,
            description: repo.description,
            html_url: repo.html_url,
            updated_at: repo.updated_at,
        }));
        res.status(200).json(repos);
    }
    catch (error) {
        console.error("Error fetching GitHub repos:", error);
        res.status(500).json({ message: "Failed to fetch repositories" });
    }
});
exports.getBranches = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.userId;
    const projectId = req.params.projectId;
    const project = await prismaClient.project.findFirst({
        where: { id: projectId },
    });
    if (!project) {
        throw new ApiError_1.ApiError(404, "Project not found");
    }
    const githubUrl = project.gitUrl;
    if (!githubUrl) {
        throw new ApiError_1.ApiError(400, "Project does not have a valid GitHub URL");
    }
    const [owner, repo] = githubUrl
        .replace("https://github.com/", "")
        .split("/");
    const user = await prismaClient.user.findFirst({ where: { id: userId } });
    if (!user) {
        throw new ApiError_1.ApiError(404, "User not found");
    }
    try {
        const repoResponse = await axios_1.default.get(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: {
                Authorization: `token ${user.githubAccessToken}`,
                Accept: "application/vnd.github.v3+json",
            },
        });
        const defaultBranch = repoResponse.data.default_branch;
        const branchesResponse = await axios_1.default.get(`https://api.github.com/repos/${owner}/${repo}/branches`, {
            headers: {
                Authorization: `token ${user.githubAccessToken}`,
                Accept: "application/vnd.github.v3+json",
            },
            params: {
                per_page: 100,
            },
        });
        const branches = branchesResponse.data.map((branch) => ({
            name: branch.name,
            commitSha: branch.commit.sha,
            protected: branch.protected,
            isDefault: branch.name === defaultBranch,
        }));
        res.status(200).json(branches);
    }
    catch (error) {
        console.error("Error fetching GitHub branches:", error);
        res.status(500).json({ message: "Failed to fetch branches" });
    }
});
exports.updateIsLive = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const projectId = req.params.projectId;
    const { isLive } = req.body;
    console.log(projectId);
    console.log(isLive);
    const updatedProject = await prismaClient.project.updateMany({
        where: { projectName: projectId }, data: { isLive }
    });
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, "Project updated successfully", { projectId: updatedProject }, true));
});
exports.deleteProject = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const projectId = req.params.projectId;
    const existingProject = await prismaClient.project.findFirst({
        where: {
            id: projectId,
        },
    });
    if (!existingProject) {
        throw new ApiError_1.ApiError(404, "Project not found");
    }
    const bucketName = process.env.AWS_BUCKET_NAME;
    const s3Key = `/outputs/${existingProject.projectName}`;
    await (0, S3_1.deleteS3Folder)(bucketName, s3Key);
    await prismaClient.deployment.deleteMany({ where: { projectId } });
    await prismaClient.request.deleteMany({ where: { projectName: existingProject.projectName } });
    await prismaClient.project.delete({ where: { id: projectId } });
    res
        .status(200)
        .json(new ApiResponse_1.ApiResponse(200, "Project deleted successfully", {}, true));
});
