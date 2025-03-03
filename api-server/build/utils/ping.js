"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pingExternalServer = void 0;
const axios_1 = __importDefault(require("axios"));
const pingExternalServer = async () => {
    try {
        const response = await axios_1.default.get("https://ping.zaplaunch.tech");
        console.log('Keep-alive ping sent to external server. Response status:', response.status);
    }
    catch (error) {
        // console.error('Error sending keep-alive ping to external server:', error.message);
    }
};
exports.pingExternalServer = pingExternalServer;
