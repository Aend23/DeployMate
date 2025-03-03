"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCountryInfo = exports.getGeographicalDistribution = exports.getVisitTrends = void 0;
const client_1 = require("@prisma/client");
const ApiError_1 = require("../utils/ApiError");
const AsyncHandler_1 = require("../utils/AsyncHandler");
const node_ipinfo_1 = __importStar(require("node-ipinfo"));
const prisma = new client_1.PrismaClient();
const ipinfo = new node_ipinfo_1.default(process.env.IPINFO_ACCESS_TOKEN);
exports.getVisitTrends = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const projectName = req.params.projectName;
    const { fromDate, toDate } = req.query;
    if (!fromDate || !toDate) {
        throw new ApiError_1.ApiError(400, "fromDate and toDate are required query parameters");
    }
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new ApiError_1.ApiError(400, "Invalid date format. Please use ISO 8601 format (YYYY-MM-DD)");
    }
    // Adjust the endDate to include the entire day
    endDate.setHours(23, 59, 59, 999);
    const dailyTrends = await getDailyTrends(projectName, startDate, endDate);
    const totalVisits = dailyTrends.reduce((sum, day) => sum + day.count, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await getTodayCount(projectName, today);
    res.json({
        todayCount,
        totalVisits,
        dailyTrends,
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
    });
});
async function getTodayCount(projectName, today) {
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    const todayVisits = await prisma.request.count({
        where: {
            projectName,
            createdAt: {
                gte: today,
                lte: endOfDay,
            },
        },
    });
    return todayVisits;
}
async function getDailyTrends(projectName, startDate, endDate) {
    const visits = await prisma.request.groupBy({
        by: ["createdAt"],
        where: {
            projectName,
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        },
        _count: {
            id: true,
        },
    });
    const visitsMap = visits.reduce((acc, visit) => {
        const dateStr = visit.createdAt.toISOString().split("T")[0];
        acc.set(dateStr, (acc.get(dateStr) || 0) + visit._count.id);
        return acc;
    }, new Map());
    const allDates = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        allDates.push(new Date(d));
    }
    return allDates.map((date) => ({
        date: date.toISOString().split("T")[0],
        count: visitsMap.get(date.toISOString().split("T")[0]) || 0,
    }));
}
exports.getGeographicalDistribution = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const projectName = req.params.projectName;
    const requestsWithoutCountry = await prisma.request.findMany({
        where: {
            projectName,
            country: undefined,
        },
        select: {
            id: true,
            ipAddress: true,
        },
    });
    if (requestsWithoutCountry.length > 0) {
        const updatePromises = requestsWithoutCountry.map(async (request) => {
            try {
                const ipDetails = await ipinfo.lookupIp(request.ipAddress || "");
                console.log(ipDetails);
                const country = ipDetails.country || "Unknown";
                return prisma.request.update({
                    where: { id: request.id },
                    data: { country },
                });
            }
            catch (error) {
                console.error(`Failed to update request ${request.id}:`, error);
                return null;
            }
        });
        await Promise.all(updatePromises);
    }
    const distribution = await prisma.request.groupBy({
        by: ["country"],
        where: { projectName },
        _count: {
            country: true,
        },
    });
    const result = distribution.reduce((acc, item) => {
        acc[item.country ?? "Unknown"] = item._count.country;
        return acc;
    }, {});
    res.json(result);
});
exports.updateCountryInfo = (0, AsyncHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const request = await prisma.request.findUnique({ where: { id } });
    if (!request) {
        throw new ApiError_1.ApiError(404, "Request not found");
    }
    if (!request.country && request.ipAddress) {
        try {
            const ipDetails = await ipinfo.lookupIp(request.ipAddress);
            const country = ipDetails.country || "Unknown";
            await prisma.request.update({
                where: { id },
                data: { country },
            });
            res.json({ message: "Country information updated successfully" });
        }
        catch (err) {
            if (err instanceof node_ipinfo_1.ApiLimitError) {
                throw new ApiError_1.ApiError(429, "API Limit Exceeded");
            }
            else {
                throw new ApiError_1.ApiError(500, "Internal Server Error");
            }
        }
    }
    else {
        res.json({
            message: "Country information already exists or IP address is missing",
        });
    }
});
