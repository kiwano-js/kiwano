export class FrameworkError extends Error {

    developerInfo?: any;

    constructor(message?: string, developerInfo?: any) {
        super(message);
        this.name = this.constructor.name;
        this.developerInfo = developerInfo;
    }
}

export default FrameworkError;