"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteS3Folder = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const ApiError_1 = require("../utils/ApiError");
const s3Client = new client_s3_1.S3Client({ region: process.env.AWS_REGION });
const deleteS3Folder = async (bucketName, folderPrefix) => {
    try {
        const listCommand = new client_s3_1.ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: folderPrefix,
        });
        const { Contents } = await s3Client.send(listCommand);
        if (!Contents || Contents.length === 0) {
            console.log("No objects found in the specified folder.");
            return;
        }
        const deleteParams = {
            Bucket: bucketName,
            Delete: {
                Objects: Contents.map((object) => ({ Key: object.Key })),
            },
        };
        const deleteCommand = new client_s3_1.DeleteObjectsCommand(deleteParams);
        await s3Client.send(deleteCommand);
        console.log(`Folder ${folderPrefix} and its objects deleted successfully`);
    }
    catch (error) {
        console.error("Error deleting S3 folder:", error);
        throw new ApiError_1.ApiError(500, "Failed to delete S3 folder");
    }
};
exports.deleteS3Folder = deleteS3Folder;
