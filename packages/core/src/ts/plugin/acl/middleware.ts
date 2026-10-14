import { defaults, get } from "es-toolkit/compat";

import type { AclValidateConfigType, AclPlugin } from "./acl";
import { ForbiddenError } from "../../error/resolver";
import type { Middleware } from "../../common";

export interface AclMiddlewareOptions {
    rolePath?: string,
    onForbidden?: (resource: string) => void
}

export const defaultAclMiddlewareOptions: AclMiddlewareOptions = {
    rolePath: "role",
    onForbidden: resource => { throw new ForbiddenError(`No access to ${resource}`) }
}

export function honoAclMiddleware(acl: AclPlugin, config: AclValidateConfigType = null, options: AclMiddlewareOptions = null) {

    const fullOptions = getOptions(options);

    return async (c, next) => {

        const fullPath = c.req.path;

        if(!config){
            config = { resource: fullPath };
        }

        const role =  c.get(fullOptions.rolePath) ?? null;
        const allowed = acl.validate(config, role);

        if(!allowed){
            fullOptions.onForbidden(fullPath);
        }

        return await next();
    }
}

export function graphQLAclMiddleware(acl: AclPlugin, schemaName: string, options: AclMiddlewareOptions = null): Middleware {

    const fullOptions = getOptions(options);

    return (resolve, root, args, context, info) => {

        const fieldResource = `${info.parentType.name}.${info.fieldName}`;
        const parsedConfig = { resource: `${schemaName}:${fieldResource}` };

        const role = get(context, fullOptions.rolePath) ?? null;
        const allowed = acl.validate(parsedConfig, role);

        if(!allowed){
            fullOptions.onForbidden(fieldResource);
        }

        return resolve(root, args, context, info);
    }
}

function getOptions(options: AclMiddlewareOptions): AclMiddlewareOptions {

    return defaults({}, options || {}, defaultAclMiddlewareOptions);
}
