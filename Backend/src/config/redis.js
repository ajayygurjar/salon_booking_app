const Redis = require("ioredis");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.warn("[REDIS] Connection error (running without cache):", err.message);
});

redis.on("connect", () => console.log("[REDIS] Connected"));

const connectRedis = async () => {
  try {
    await redis.connect();
  } catch {
    console.warn("[REDIS] Not available — running without cache");
  }
};

module.exports = { redis, connectRedis };
