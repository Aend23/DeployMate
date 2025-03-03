"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cassandraClient = exports.downloadScbFromS3 = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cassandra_driver_1 = __importDefault(require("cassandra-driver"));
const s3 = new aws_sdk_1.default.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});
const scbLocalPath = path_1.default.join(__dirname, 'scb.zip');
const scbS3Bucket = process.env.AWS_BUCKET_NAME;
const scbS3Key = "secure-connect-zaplaunch.zip";
const downloadScbFromS3 = async () => {
    const params = {
        Bucket: scbS3Bucket,
        Key: scbS3Key,
    };
    try {
        console.log(`Downloading scb.zip from S3: ${scbS3Bucket}/${scbS3Key}`);
        const { Body } = await s3.getObject(params).promise();
        fs_1.default.writeFileSync(scbLocalPath, Body);
        console.log('scb.zip successfully downloaded.');
    }
    catch (error) {
        console.error('Error downloading scb.zip from S3:', error);
        throw new Error('Failed to download scb.zip from S3.');
    }
};
exports.downloadScbFromS3 = downloadScbFromS3;
const cloud = { secureConnectBundle: path_1.default.join(__dirname, "scb.zip") };
const authProvider = new cassandra_driver_1.default.auth.PlainTextAuthProvider('token', process.env['ASTRA_DB_APPLICATION_TOKEN']);
exports.cassandraClient = new cassandra_driver_1.default.Client({ cloud, authProvider });
