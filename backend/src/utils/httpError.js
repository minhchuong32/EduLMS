class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

const createHttpError = (status, message) => new HttpError(status, message);

module.exports = { HttpError, createHttpError };
