// Validate email format
const isValidEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// Validate phone number (basic check for 10-15 digits)
const isValidPhone = (phone) => {
    const regex = /^[0-9]{10,15}$/;
    return regex.test(phone);
};

// Format date to YYYY-MM-DD
const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Generate a random 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Check if a value is empty
const isEmpty = (value) => {
    return value === undefined || value === null || value.trim() === '';
};

module.exports = {
    isValidEmail,
    isValidPhone,
    formatDate,
    generateOTP,
    isEmpty
};
