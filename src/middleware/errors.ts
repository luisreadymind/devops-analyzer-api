import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export class AppError extends Error {
  public details?: any;
  public statusCode: number;
  public isOperational: boolean;

  constructor(
    statusCode: number,
    message: string | { message: string; [key: string]: any },
    isOperational = true
  ) {
    // Ensure we call the base Error constructor first with a string message
    const textMessage = typeof message === 'object' ? (message.message || 'An error occurred') : message;
    super(textMessage);

    // Now it's safe to assign to this
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    if (typeof message === 'object') {
      this.details = message;
    }

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.error({
      statusCode: err.statusCode,
      message: err.message,
      details: err.details,
      url: req.url,
      method: req.method
    });

    const response: any = {
      status: 'error',
      message: err.message
    };

    // Include additional details if available
    if (err.details) {
      response.details = err.details;
    }

    return res.status(err.statusCode).json(response);
  }

  // Unexpected errors
  logger.error({
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
};
