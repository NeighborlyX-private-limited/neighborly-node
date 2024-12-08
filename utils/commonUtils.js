function getCity() {
  return "New Delhi";
}
function emailValidator(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function phoneValidator(phoneNumber) {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phoneNumber);
}

module.exports = {
  getCity,
  emailValidator,
  phoneValidator,
};
