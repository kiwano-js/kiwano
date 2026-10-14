import ResolverError from "./ResolverError";

export class ForbiddenError extends ResolverError {
    static override errorName = 'ForbiddenError';
}

export default ForbiddenError;
