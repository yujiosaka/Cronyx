/**
 * @public
 */
export class CronyxError extends Error {
  /**
   * @internal
   */
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }

  /**
   * @internal
   */
  get [Symbol.toStringTag](): string {
    return this.constructor.name;
  }
}

/**
 * @public
 */
export class JobLockNotFoundError extends Error {}
