/**
 * Professional Terminal Logger for LMS Backend
 * Zero external dependencies — Uses standard ANSI escape sequences & Node.js built-ins.
 * Gracefully handles NO_COLOR and non-TTY environments.
 */

const isColorSupported =
  process.env.NO_COLOR === undefined &&
  (Boolean(process.stdout.isTTY) || process.env.FORCE_COLOR !== undefined);

const c = {
  reset: isColorSupported ? '\x1b[0m' : '',
  bold: isColorSupported ? '\x1b[1m' : '',
  dim: isColorSupported ? '\x1b[2m' : '',

  red: isColorSupported ? '\x1b[31m' : '',
  green: isColorSupported ? '\x1b[32m' : '',
  yellow: isColorSupported ? '\x1b[33m' : '',
  blue: isColorSupported ? '\x1b[34m' : '',
  magenta: isColorSupported ? '\x1b[35m' : '',
  cyan: isColorSupported ? '\x1b[36m' : '',
  white: isColorSupported ? '\x1b[37m' : '',
  gray: isColorSupported ? '\x1b[90m' : '',

  bgRed: isColorSupported ? '\x1b[41m' : '',
  bgGreen: isColorSupported ? '\x1b[42m' : '',
  bgYellow: isColorSupported ? '\x1b[43m' : '',
  bgBlue: isColorSupported ? '\x1b[44m' : '',
};

const getTimestamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const logger = {
  colors: c,

  getTimestamp,

  info: (message, ...args) => {
    console.log(
      `${c.gray}[${getTimestamp()}]${c.reset} ${c.cyan}${c.bold}[INFO]${c.reset}  ${message}`,
      ...args
    );
  },

  success: (message, ...args) => {
    console.log(
      `${c.gray}[${getTimestamp()}]${c.reset} ${c.green}${c.bold}[SUCCESS]${c.reset} ${message}`,
      ...args
    );
  },

  warn: (message, ...args) => {
    console.warn(
      `${c.gray}[${getTimestamp()}]${c.reset} ${c.yellow}${c.bold}[WARN]${c.reset}  ${message}`,
      ...args
    );
  },

  error: (message, ...args) => {
    console.error(
      `${c.gray}[${getTimestamp()}]${c.reset} ${c.red}${c.bold}[ERROR]${c.reset} ${message}`,
      ...args
    );
  },

  /**
   * Log completed HTTP request in structured UTSAV style
   */
  http: (method, url, statusCode, durationMs) => {
    let statusColor = c.green;
    let levelTag = `${c.cyan}${c.bold}[INFO]${c.reset} `;

    if (statusCode >= 500) {
      statusColor = c.red;
      levelTag = `${c.red}${c.bold}[ERROR]${c.reset}`;
    } else if (statusCode >= 400) {
      statusColor = c.yellow;
      levelTag = `${c.yellow}${c.bold}[WARN]${c.reset} `;
    } else if (statusCode >= 300) {
      statusColor = c.cyan;
    }

    console.log(
      `${c.gray}[${getTimestamp()}]${c.reset} ${levelTag} ${c.bold}${method}${c.reset} ${url} ${statusColor}${statusCode}${c.reset} - ${c.gray}${durationMs}ms${c.reset}`
    );
  },

  /**
   * Render professional UTSAV-style startup banner
   */
  banner: ({
    appName = 'LMS — Learning Management System API',
    environment = 'development',
    port = 5000,
    healthPath = '/api/health',
    clientUrl = 'http://localhost:5173',
    dbStatus = 'Connected',
    dbHost = 'MongoDB Atlas',
    isDbConnected = true,
  }) => {
    const divider = '═'.repeat(60);
    const subDivider = '─'.repeat(60);
    const baseUrl = `http://localhost:${port}`;
    const healthUrl = `${baseUrl}${healthPath}`;

    const dbIndicator = isDbConnected
      ? `${c.green}●${c.reset} ${c.bold}Database:${c.reset} ${dbHost} ${c.green}${dbStatus}${c.reset}`
      : `${c.red}○${c.reset} ${c.bold}Database:${c.reset} ${dbHost} ${c.red}${dbStatus}${c.reset}`;

    console.log('');
    console.log(`${c.cyan}${divider}${c.reset}`);
    console.log(` ${c.bold}${c.white}${appName}${c.reset}`);
    console.log(` ${c.gray}Environment:${c.reset} ${c.yellow}${environment}${c.reset} ${c.gray}|${c.reset} ${c.gray}Node:${c.reset} ${c.cyan}${process.version}${c.reset} ${c.gray}|${c.reset} ${c.gray}PID:${c.reset} ${c.magenta}${process.pid}${c.reset}`);
    console.log(`${c.cyan}${subDivider}${c.reset}`);
    console.log(`  ${c.green}●${c.reset} ${c.bold}Server:${c.reset}   ${c.blue}${baseUrl}${c.reset}`);
    console.log(`  ${c.green}●${c.reset} ${c.bold}Health:${c.reset}   ${c.blue}${healthUrl}${c.reset}`);
    console.log(`  ${dbIndicator}`);
    console.log(`  ${c.green}●${c.reset} ${c.bold}Frontend:${c.reset} ${c.blue}${clientUrl}${c.reset}`);
    console.log(`${c.cyan}${divider}${c.reset}`);
    console.log('');
  },

  /**
   * Port conflict diagnostic
   */
  portInUse: (port) => {
    const divider = '─'.repeat(60);
    console.error('');
    console.error(`${c.red}${divider}${c.reset}`);
    console.error(`${c.red}${c.bold}[PORT CONFLICT ERROR]${c.reset}`);
    console.error(`Port ${c.yellow}${port}${c.reset} is already in use by another active process.`);
    console.error(`${c.dim}Troubleshooting steps:${c.reset}`);
    console.error(` 1. Stop the running instance using port ${port}.`);
    console.error(` 2. Or configure a different port in ${c.bold}backend/.env${c.reset} (e.g. PORT=5001).`);
    console.error(` 3. On Windows, locate the PID using: ${c.cyan}netstat -ano | findstr :${port}${c.reset}`);
    console.error(`${c.red}${divider}${c.reset}`);
    console.error('');
  },
};

module.exports = {
  logger,
  c,
};
