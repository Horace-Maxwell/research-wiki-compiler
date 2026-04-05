export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode = 500,
    readonly code = "internal_error",
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function getErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: error.code,
        message: error.message,
        details: error.details,
      },
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: 500,
      body: {
        error: "internal_error",
        message: error.message,
      },
    };
  }

  return {
    statusCode: 500,
    body: {
      error: "internal_error",
      message: "An unknown error occurred.",
    },
  };
}

