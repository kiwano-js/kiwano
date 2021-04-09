import defaults from "lodash/defaults";

import { SchemaBuilder } from "../../schema";
import { AbstractAcl, AclOptions, defaultAclOptions } from "./Acl";
import { defaultAclMiddlewareOptions, graphQLAclMiddleware, AclMiddlewareOptions } from "./middleware";
import { Plugin } from "../common";

export interface AclPluginOptions extends AclMiddlewareOptions, AclOptions {}

export class AclPlugin extends AbstractAcl<AclPluginOptions> implements Plugin {

    constructor(options?: AclPluginOptions) {

        super();
        this._options = defaults(options || {}, defaultAclMiddlewareOptions, defaultAclOptions);
    }

    rolePath(path: string): this {

        this._options.rolePath = path;
        return this;
    }

    onForbidden(handler: (resource: string) => void): this {

        this._options.onForbidden = handler;
        return this;
    }

    beforeBuildSchema(builder: SchemaBuilder) {

        // Add middleware
        builder.use(graphQLAclMiddleware(this, null, this._options));

        // Add rules
        for(let type of builder.getObjectTypes()){

            const typeInfo = type.info();
            this.addRules(`${type.name}.*`, typeInfo.allowedRoles, typeInfo.deniedRoles);

            for(let field of type.info().fields){

                const fieldInfo = field.info()
                this.addRules(`${type.name}.${field.name}`, fieldInfo.allowedRoles, fieldInfo.deniedRoles);
            }
        }
    }

    protected addRules(resource: string, allowed: Set<string>, denied: Set<string>){

        if(allowed.size > 0){
            this.allow(resource, Array.from(allowed));
        }

        if(denied.size > 0){
            this.deny(resource, Array.from(denied));
        }
    }
}

export function aclPlugin(options?: AclPluginOptions): AclPlugin {

    return new AclPlugin(options);
}

export default aclPlugin;