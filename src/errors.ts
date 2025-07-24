// Error types and codes module

export enum ErrorType {
  MaximumTileCountExceeded = "MaximumTileCountExceeded",
  UnknownTask = "UnknownTask",
  MissingInputField = "MissingInputField",
  // Add more error types here as needed
}

export const ErrorCodes: Record<ErrorType, number> = {
  [ErrorType.MaximumTileCountExceeded]: 1001,
  [ErrorType.UnknownTask]: 1002,
  [ErrorType.MissingInputField]: 1003,
  // Add more error codes here as needed
};

export class GeobaseError extends Error {
  public readonly type: ErrorType;
  public readonly code: number;

  constructor(type: ErrorType, message?: string) {
    super(message || type);
    this.type = type;
    this.code = ErrorCodes[type];
    this.name = "GeobaseError";
  }
}
