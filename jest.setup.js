// Make Node.js crypto module available globally for tests
// This is needed for @nestjs/typeorm v11 which expects crypto to be global
global.crypto = require('crypto');
