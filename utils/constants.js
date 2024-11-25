const AWS = require("aws-sdk");
const dotenv = require("dotenv");
dotenv.config({ path: "./config/config.env" });

// AWS configuration settings
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const S3 = new AWS.S3();
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const CITY_TO_COORDINATE = {
  delhi: [28.5643, 77.2442],
  noida: [28.5747, 77.356],
  gurugram: [28.4732, 77.0189],
  "new delhi": [28.6139, 77.2088],
};
const AVAILABLE_CITIES = ["delhi", "noida", "gurugram"];

const EXPIRATION_TIME_FOR_REDIS_CACHE = 300;

const COORDINATE_TO_CITY = {
  "28.6139,77.2088": "new delhi",
  "28.7041,77.1025": "delhi",
  "28.5747,77.3560": "noida",
  "28.4732,77.0189": "gurugram",
};

const CITY_RADIUS = {
  delhi: 21.9,
  noida: 8.56,
  gurugram: 10.06,
};

const VALIDAWARDTYPES = new Set([
  "Local Legend",
  "Sunflower",
  "Streetlight",
  "Park Bench",
  "Map",
  // Add more awards here as needed
]);
const SPECIFIC_AWARD_COST = 25;
const RANDOM_AWARD_COST = 20;

const DELETED_USER_DP = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const MESSAGE_TEMPLATE = `Dear User, 

Your OTP for login is {{otp}}. This is valid for 15 minutes. Please do not share this OTP. 

Regards,
NeighborlyX Private Limited`;
const MESSAGE_API_ENDPOINT = `https://api.textlocal.in/send/?apiKey=<apiKey>&sender=NEIBOR&numbers=<phoneNumber>&message=<message>`;

module.exports = {
  CITY_TO_COORDINATE,
  COORDINATE_TO_CITY,
  CITY_RADIUS,
  AVAILABLE_CITIES,
  S3,
  S3_BUCKET_NAME,
  VALIDAWARDTYPES,
  MESSAGE_TEMPLATE,
  MESSAGE_API_ENDPOINT,
  DELETED_USER_DP,
  EXPIRATION_TIME_FOR_REDIS_CACHE,
  SPECIFIC_AWARD_COST,
  RANDOM_AWARD_COST,
};
