import FrameworkError from "../FrameworkError";

export class ResolverError extends FrameworkError {
    static override errorName = 'ResolverError';
}

export default ResolverError;
