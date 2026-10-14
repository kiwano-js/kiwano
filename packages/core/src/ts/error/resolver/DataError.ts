import ResolverError from "./ResolverError";

export class DataError extends ResolverError {
    static override errorName = 'DataError';
}

export default DataError;
