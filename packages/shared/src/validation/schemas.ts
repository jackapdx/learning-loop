import { type } from "arktype";

export const User = type({
  id: "string.uuid",
  name: "0 < string <=100",
  email: "string.email",
  createdAt: "Date",
});
export type User = typeof User.infer;

export const HelloRequest = type({
  "name?": "string",
});
export type HelloRequest = typeof HelloRequest.infer;

/**
 * Generic API response wrapper with a type parameter for the data field.
 * Instantiate with a type argument to create a validated response schema.
 *
 * Usage:
 *   const UserResponse = ApiResponseOf(User);
 *   const result = UserResponse({ success: true, data: { ... } });
 */
export const ApiResponseOf = type("<t>", {
  success: "boolean",
  "data?": "t",
  "error?": "string",
  timestamp: "Date",
});

/**
 * TypeScript utility type for API responses.
 * Defaults to `unknown` for the data payload.
 *
 * Usage:
 *   type UserResponse = ApiResponse<User>;
 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
};
