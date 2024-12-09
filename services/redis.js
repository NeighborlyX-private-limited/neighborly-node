const redis = require("redis");
let client;

const createRedisClient = async () => {
  if (!client) {
    client = redis.createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    client.on("connect", () => {
      console.log("Connected to Redis!");
    });

    client.on("ready", () => {
      console.log("Redis client is ready!");
    });

    client.on("error", (err) => {
      console.error("Redis error:", err);
    });

    client.on("end", () => {
      console.log("Redis connection closed.");
    });

    await client.connect();
  }
  return client;
};

// Initialize the client on module load and export it
(async () => {
  await createRedisClient();
})();

module.exports = client;
