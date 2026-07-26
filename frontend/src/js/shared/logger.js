export const logger = Object.freeze({
  debug(message, details) {
    if (window.location.hostname === 'localhost') console.debug(message, details);
  },
  error(message, details) {
    console.error(message, details);
  }
});
