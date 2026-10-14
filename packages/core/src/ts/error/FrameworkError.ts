export class FrameworkError extends Error {

    static errorName = 'FrameworkError';

    developerInfo?: any;

    constructor(message?: string, developerInfo?: any) {
        super(message);
        this.name = getErrorName(this.constructor as typeof FrameworkError);
        this.developerInfo = developerInfo;
    }
}

export default FrameworkError;

function getErrorName(errorConstructor: typeof FrameworkError): string {

    if(Object.prototype.hasOwnProperty.call(errorConstructor, 'errorName')) {
        return errorConstructor.errorName;
    }

    return errorConstructor.name;
}
