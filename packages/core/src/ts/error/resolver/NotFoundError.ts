import ResolverError from "./ResolverError";

export class NotFoundError extends ResolverError {
    static override errorName = 'NotFoundError';
}

export default NotFoundError;
