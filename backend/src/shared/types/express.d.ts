declare namespace Express {
  interface Request {
    /** User id from the `x-user-id` header (dev-generated UUID). */
    userId: string;
  }
}
