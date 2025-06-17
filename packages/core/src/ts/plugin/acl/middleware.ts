import type { Path } from "graphql/jsutils/Path";

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

        const pathResource = getPathResource(info.path);
        const parsedConfig = { resource: `${schemaName}:${pathResource}` };

        const role = context.get(fullOptions.rolePath) ?? null;
        const allowed = acl.validate(parsedConfig, role);

        if(!allowed){
            fullOptions.onForbidden(pathResource);
        }

        return resolve(root, args, context, info);
    }
}

export function getPathResource(path: Path): string {

    return [path.typename, path.key].join('.');
}

function getOptions(options: AclMiddlewareOptions): AclMiddlewareOptions {

    return defaults({}, options || {}, defaultAclMiddlewareOptions);
}
