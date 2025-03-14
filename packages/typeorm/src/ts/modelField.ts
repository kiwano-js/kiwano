import { FieldBuilder } from "@kiwano/core";

export class ModelFieldBuilder<ROT> extends FieldBuilder {

    protected _resolverOptions: ROT;

    resolverOptions(options: ROT): this {

        this._resolverOptions = {
            ...(this._resolverOptions || {}),
            ...options
        };

        return this;
    }

    getResolverOptions(): ROT {

        return this._resolverOptions;
    }
}