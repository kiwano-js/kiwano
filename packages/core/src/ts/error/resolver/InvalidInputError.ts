import ResolverError from "./ResolverError";

export class InvalidInputError extends ResolverError {
    static override errorName = 'InvalidInputError';
}

export default InvalidInputError;
