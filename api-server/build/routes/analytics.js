"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const analytics_1 = require("../controllers/analytics");
const router = express_1.default.Router();
router.get("/visitTrend/:projectName", auth_1.authenticateToken, analytics_1.getVisitTrends);
router.get("/geo/:projectName", auth_1.authenticateToken, analytics_1.getGeographicalDistribution);
router.patch("/updateCountry/:id", auth_1.authenticateToken, analytics_1.updateCountryInfo);
exports.default = router;
