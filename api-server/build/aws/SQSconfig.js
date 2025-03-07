"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSQSConfig = void 0;
const getSQSConfig = () => {
    return {
        apiVersion: '2012-11-05',
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    };
};
exports.getSQSConfig = getSQSConfig;
