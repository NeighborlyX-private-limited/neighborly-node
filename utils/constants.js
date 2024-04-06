const CITY_TO_COORDINATE = {
  delhi: { lat: 28.5643, lng: 77.2442 },
  noida: { lat: 28.5747, lng: 77.356 },
  gurugram: { lat: 28.4732, lng: 77.0189 },
};

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
};
