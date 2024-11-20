const redis = require("redis");
let client;

const createRedisClient = async () => {
  client = redis.createClient();
  client.on("connect", () => {});
  client.on("error", (err) => {
    console.error("Redis error:", err);
  });
  await client.connect();
};
createRedisClient();

client.on("error", (err) => {
  console.error("Redis error:", err);
});

module.exports = client;
