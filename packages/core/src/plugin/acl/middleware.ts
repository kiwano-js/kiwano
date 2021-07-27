import { Path } from "graphql/jsutils/Path";

import defaults from "lodash/defaults";
import get from "lodash/get";

import { AclValidateConfigType, AclPlugin } from "./Acl";
import { ForbiddenError } from "../../error/resolver";
import { Middleware } from "../../common";

export interface AclMiddlewareOptions {
    rolePath?: string,
    onForbidden?: (resource: string) => void
}

export const defaultAclMiddlewareOptions: AclMiddlewareOptions = {
    rolePath: "role",
    onForbidden: resource => { throw new ForbiddenError(`No access to ${resource}`) }
}

export function expressAclMiddleware(acl: AclPlugin, config: AclValidateConfigType = null, options: AclMiddlewareOptions = null) {

    const fullOptions = getOptions(options);

    return (req, res, next) => {

        const fullPath = req.baseUrl + req.path;

        if(!config){
            config = { resource: fullPath };
        }

        const role = get(req, fullOptions.rolePath) ?? null;
        const allowed = acl.validate(config, role);

        if(!allowed){
            fullOptions.onForbidden(fullPath);
        }

        next();
    }
}

export function graphQLAclMiddleware(acl: AclPlugin, config: AclValidateConfigType = null, options: AclMiddlewareOptions = null): Middleware {

    const fullOptions = getOptions(options);

    return (resolve, root, args, context, info) => {

        const pathResource = getPathResource(info.path);
        let parsedConfig = config;

        if(!config){
            parsedConfig = { resource: pathResource };
        }

        const role = get(context, fullOptions.rolePath) ?? null;
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