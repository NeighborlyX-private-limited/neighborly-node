const CITY_TO_COORDINATE = {
  delhi: [28.5643, 77.2442],
  noida: [28.5747, 77.356],
  gurugram: [28.4732, 77.0189],
};
const AVAILABLE_CITIES = ["delhi", "noida", "gurugram"];

const COORDINATE_TO_CITY = {
  "28.5643,77.2442": "delhi",
  "28.5747,77.3560": "noida",
  "28.4732,77.0189": "gurugram",
};

const CITY_RADIUS = {
  delhi: 21.9,
  noida: 8.56,
  gurugram: 10.06,
};

module.exports = {
  CITY_TO_COORDINATE,
  COORDINATE_TO_CITY,
  CITY_RADIUS,
  AVAILABLE_CITIES,
};
