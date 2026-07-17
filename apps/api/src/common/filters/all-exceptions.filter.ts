import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { API_VERSION, type ApiErrorBody, type ApiResponse } from "@podmind/types";

/** Build the documented success envelope (30-API-SDK-Plan §API Response Format). */
export function successEnvelope<T>(data: T, requestId: string): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    request_id: requestId,
    timestamp: new Date().toISOString(),
    version: API_VERSION,
  };
}

/** Map HTTP status → default UPPER_SNAKE error code. */
const STATUS_CODES: Record<number, string> = {
  400: "INVALID_REQUEST",
  401: "UNAUTHORIZED",
  402: "INSUFFICIENT_CREDITS",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_FAILED",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
  502: "UPSTREAM_ERROR",
  503: "SERVICE_UNAVAILABLE",
};

/**
 * Global exception filter — every error leaves the API in the documented
 * error envelope. Unknown errors are logged with the request id and never
 * leak internals to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();
    const requestId = String(request.id ?? "unknown");

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error: ApiErrorBody = { code: "INTERNAL_ERROR", message: "Internal server error" };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      const fallbackCode = STATUS_CODES[status] ?? "ERROR";

      if (typeof body === "string") {
        error = { code: fallbackCode, message: body };
      } else {
        const b = body as Record<string, unknown>;
        const message = Array.isArray(b.message)
          ? (b.message as string[]).join("; ")
          : typeof b.message === "string"
            ? b.message
            : exception.message;
        error = {
          code: typeof b.code === "string" ? b.code : fallbackCode,
          message,
          details:
            Array.isArray(b.message) && b.message.length > 0
              ? { errors: b.message }
              : undefined,
        };
      }
    } else {
      // Unknown/unexpected — log full detail server-side only.
      this.logger.error(
        { request_id: requestId, err: exception },
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    if (status >= 500 && exception instanceof HttpException) {
      this.logger.error({ request_id: requestId, code: error.code, message: error.message });
    }

    const payload: ApiResponse<never> = {
      success: false,
      data: null,
      error,
      request_id: requestId,
      timestamp: new Date().toISOString(),
      version: API_VERSION,
    };
    response.setHeader("x-request-id", requestId);
    response.status(status).json(payload);
  }
}
