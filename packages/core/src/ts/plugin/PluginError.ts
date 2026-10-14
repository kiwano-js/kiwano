import FrameworkError from "../error/FrameworkError";

export class PluginError extends FrameworkError {
    static override errorName = 'PluginError';
}

export default PluginError;
