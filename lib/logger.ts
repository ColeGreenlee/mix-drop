import pino from 'pino';
import { AsyncLocalStorage } from 'async_hooks';

const isDevelopment = process.env.NODE_ENV === 'development';

// Request context storage
const requestContext = new AsyncLocalStorage<{ requestId?: string; userId?: string }>();

// Get request ID from context
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

// Get user ID from context
export function getUserId(): string | undefined {
  return requestContext.getStore()?.userId;
}

// Set request context
export function setRequestContext(context: { requestId?: string; userId?: string }) {
  const store = requestContext.getStore();
  if (store) {
    Object.assign(store, context);
  }
}

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Format output based on environment
  // Development: pretty-printed for console readability
  // Production: JSON for Loki/Promtail parsing
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      }
    : undefined,

  // Base fields included in every log
  base: {
    env: process.env.NODE_ENV,
  },

  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
    ],
    remove: true,
  },

  // Serializers for common objects
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      params: req.params,
      query: req.query,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        referer: req.headers.referer,
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: res.getHeaders?.(),
    }),
  },
});

// Create child loggers with context
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

// Utility functions for common logging patterns
export function logRequest(
  method: string,
  path: string,
  context?: Record<string, unknown>
) {
  logger.info({ method, path, ...context }, `${method} ${path}`);
}

export function logResponse(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  context?: Record<string, unknown>
) {
  logger.info(
    { method, path, statusCode, duration, ...context },
    `${method} ${path} ${statusCode} - ${duration}ms`
  );
}

export function logError(
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error({ err, ...context }, err.message);
}

export function logCache(
  operation: 'get' | 'set' | 'delete' | 'pattern',
  key: string,
  hit?: boolean,
  context?: Record<string, unknown>
) {
  logger.debug(
    { cache: { operation, key, hit }, ...context },
    `Cache ${operation}: ${key}${hit !== undefined ? ` (${hit ? 'HIT' : 'MISS'})` : ''}`
  );
}

export function logDatabase(
  operation: string,
  model?: string,
  duration?: number,
  context?: Record<string, unknown>
) {
  logger.debug(
    { database: { operation, model, duration }, ...context },
    `DB ${operation}${model ? ` ${model}` : ''}${duration ? ` - ${duration}ms` : ''}`
  );
}

export function logS3(
  operation: 'upload' | 'download' | 'delete' | 'presign',
  key: string,
  size?: number,
  duration?: number,
  context?: Record<string, unknown>
) {
  logger.info(
    { s3: { operation, key, size, duration }, ...context },
    `S3 ${operation}: ${key}${size ? ` (${(size / 1024 / 1024).toFixed(2)}MB)` : ''}${duration ? ` - ${duration}ms` : ''}`
  );
}

export function logAuth(
  event: 'login' | 'logout' | 'signup' | 'session' | 'error' | 'jwt_created',
  userId?: string,
  context?: Record<string, unknown>
) {
  logger.info(
    { auth: { event, userId }, ...context },
    `Auth ${event}${userId ? ` - user:${userId}` : ''}`
  );
}

export function logRateLimit(
  endpoint: string,
  allowed: boolean,
  remaining?: number,
  context?: Record<string, unknown>
) {
  logger.warn(
    { rateLimit: { endpoint, allowed, remaining }, ...context },
    `Rate limit ${allowed ? 'passed' : 'exceeded'}: ${endpoint}${remaining !== undefined ? ` (${remaining} remaining)` : ''}`
  );
}
