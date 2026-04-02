declare namespace Express {
  interface Request {
    /** The authenticated user's Azure OID (or dev-generated UUID). */
    userId: string;
  }
}
