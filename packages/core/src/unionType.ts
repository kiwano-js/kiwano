import { GraphQLUnionType } from "graphql/type/definition";
import { GraphQLOutputType } from "graphql";

import { isString, clone } from 'lodash'

import Builder, { BuildContext, builderInfoExtensionName, BuilderName, FinalizeContext } from "./Builder";
import { Plugin } from "./plugin";

export interface UnionTypeBuilderInfo {
    name: string
    types: Set<UnionTypeMemberName>
    description?: string
    extensions: Map<string, any>
    plugins: Plugin[]
}

export type UnionTypeMemberName = string | GraphQLOutputType;

export class UnionTypeBuilder extends Builder<GraphQLUnionType> {

    protected _types: Set<UnionTypeMemberName>;
    protected _description?: string;
    protected _extensions = new Map<string, any>();

    constructor(name: BuilderName, types: UnionTypeMemberName[] = null) {

        super(name);
        this._types = new Set<UnionTypeMemberName>(types || []);
    }

    type(...types: UnionTypeMemberName[]): this {

        types.forEach(role => this._types.add(role));
        return this;
    }

    description(description?: string): this {

        this._description = description;
        return this;
    }

    extension(name: string, value: any): this {

        this._extensions.set(name, value);
        return this;
    }

    async finalizeBuilder(context: FinalizeContext){

        const info = this.info();

        await this._executePlugins('beforeFinalizeUnionType', plugin => plugin.beforeFinalizeUnionType(this, context, info));

        await this.finalizeUnionType(context, info);

        await this._executePlugins('afterFinalizeUnionType', plugin => plugin.afterFinalizeUnionType(this, context, info));
    }

    async finalizeUnionType(context: FinalizeContext, info: UnionTypeBuilderInfo){}

    build(context: BuildContext): GraphQLUnionType {

        const info = this.info();

        this._executePluginsSync('beforeBuildUnionType', plugin => plugin.beforeBuildUnionType(this, context, info));

        // Resolve types
        const unionType = new GraphQLUnionType({
            name: this.name,
            description: this._description,
            types: () => {

                let resolvedTypes = [];

                for(let type of this._types){

                    if(isString(type)){

                        const resolved = context.getType(type as string);
                        resolvedTypes.push(resolved);
                    }
                    else {
                        resolvedTypes.push(type);
                    }
                }

                return resolvedTypes;
            },
            extensions: {
                [builderInfoExtensionName]: this.info(),
                ...Object.fromEntries(this._extensions)
            }
        });

        this._executePluginsSync('afterBuildUnionType', plugin => plugin.afterBuildUnionType(this, context, info, unionType));

        return unionType;
    }

    info(): UnionTypeBuilderInfo {

        return {
            name: this.name,
            types: new Set(this._types),
            description: this._description,
            extensions: new Map(this._extensions),
            plugins: clone(this._plugins)
        }
    }
}

export function unionType(name: BuilderName, types: UnionTypeMemberName[] = null): UnionTypeBuilder {

    return new UnionTypeBuilder(name, types);
}

export default unionType;