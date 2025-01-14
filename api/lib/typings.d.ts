export interface Logger {
  info: typeof console.info;
  error: typeof console.error;
  request: typeof console.info;
}
