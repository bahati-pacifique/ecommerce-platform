/**
 * Capitalizes first letter of the string
 * @param {string} str to capitalize
 * @returns 
 */
function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateDateBasedPin(format = "YYMMDD") {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");


  const firstParts = [dd, mm, yy];
  const firstPart = firstParts[Math.floor(Math.random() * firstParts.length)];


  return firstPart + hh + ss;
}

function generateMemorablePIN() {

  const patterns = [
    // Repeated pairs (e.g., 101010, 404040)
    () => {
      const d1 = Math.floor(Math.random() * 10);
      const d2 = Math.floor(Math.random() * 10);
      return `${d1}${d2}${d1}${d2}${d1}${d2}`;
    },

    // Triple repeat (e.g., 123123, 456456)
    () => {
      const part = Math.floor(100 + Math.random() * 900); // 3-digit part
      return `${part}${part}`;
    },

    // Mirrored (e.g., 123321, 450054)
    () => {
      const part = Math.floor(100 + Math.random() * 900);
      const mirror = String(part).split('').reverse().join('');
      return `${part}${mirror}`;
    },

    // Incremental (e.g., 123456, 345678)
    () => {
      let start = Math.floor(Math.random() * 5) + 1;
      return Array.from({ length: 6 }, (_, i) => (start + i) % 10).join('');
    },

    // Repeating digits (e.g., 111222, 555000)
    () => {
      const d1 = Math.floor(Math.random() * 10);
      const d2 = Math.floor(Math.random() * 10);
      return `${String(d1).repeat(3)}${String(d2).repeat(3)}`;
    },

    // Alternating digits (e.g., 121212, 343434)
    () => {
      const d1 = Math.floor(Math.random() * 10);
      const d2 = Math.floor(Math.random() * 10);
      return Array.from({ length: 6 }, (_, i) => (i % 2 === 0 ? d1 : d2)).join('');
    },

    // Step pattern (e.g., 135791, 246802)
    () => {
      const start = Math.floor(Math.random() * 5);
      const step = Math.random() < 0.5 ? 2 : 3; // choose a step pattern
      return Array.from({ length: 6 }, (_, i) => (start + i * step) % 10).join('');
    },

    // Year-like + repeat (e.g., 202020, 198198)
    () => {
      const year = 190 + Math.floor(Math.random() * 40); // 190–229 range → looks like years
      return `${year}${year}`;
    },

    // Symmetric with center (e.g., 122221, 344443)
    () => {
      const d1 = Math.floor(Math.random() * 10);
      const d2 = Math.floor(Math.random() * 10);
      return `${d1}${d2}${d2}${d2}${d2}${d1}`;
    }
  ];

  // Pick a random pattern
  const pattern = patterns[Math.floor(Math.random() * patterns.length)];
  return pattern();
}

function formatDate(dateArg, { includeWeekday = false, includeTime = false } = {}) {
  const options = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };

  if (includeWeekday) {
    options.weekday = 'short';
  }

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  const date = dateArg instanceof Date ? dateArg : new Date(dateArg);
  return date.toLocaleDateString('en-GB', options);
}

function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return !!parsed.protocol;
  } catch (err) {
    return false;
  }
}

function formatBytes(bytes, precision = 2) {
  if (isNaN(parseFloat(bytes)) || !isFinite(bytes) || bytes < 0) {
    return '0 Bytes';
  }

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const k = 1024; // Use 1000 for decimal units (KB, MB), 1024 for binary (KiB, MiB).

  if (bytes < k) {
    return `${bytes} B`;
  }

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unitName = units[i];
  const value = (bytes / Math.pow(k, i)).toFixed(precision);

  return `${parseFloat(value)} ${unitName}`;
}

module.exports = {
  capitalize,
  generateDateBasedPin,
  generateMemorablePIN,
  formatDate,
  isValidUrl,
  formatBytes
}