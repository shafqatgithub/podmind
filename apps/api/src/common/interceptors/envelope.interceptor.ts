import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { map, type Observable } from "rxjs";
import { successEnvelope } from "../filters/all-exceptions.filter";

/**
 * Wraps every controller return value in the documented success envelope.
 * Controllers stay envelope-free: they return plain data; the transport
 * concern lives here exactly once.
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { id?: string }>();
    const requestId = String(request.id ?? "unknown");
    http.getResponse<Response>().setHeader("x-request-id", requestId);
    return next.handle().pipe(map((data) => successEnvelope(data ?? null, requestId)));
  }
}
