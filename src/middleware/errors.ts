import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export class AppError extends Error {
  public details?: any;
  
  constructor(
    public statusCode: number,
    message: string | { message: string; [key: string]: any },
    public isOperational = true
  ) {
    if (typeof message === 'object') {
      super(message.message || 'An error occurred');
      this.details = message;
    } else {
      super(message);
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
