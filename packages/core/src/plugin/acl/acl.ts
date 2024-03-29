import { isArray, isString, isNumber, sortBy, escapeRegExp, defaults } from 'lodash'

import {
    AclMiddlewareOptions,
    defaultAclMiddlewareOptions,
    expressAclMiddleware,
    graphQLAclMiddleware
} from "./middleware";

import FrameworkError from "../../error/FrameworkError";
import { Plugin } from "../common";
import { SchemaBuilder } from "../../schema";
import { GraphQLSchema } from "graphql";

export type AclRoleIdentifier = string | number;

interface AclRoleConfig {
    identifier: AclRoleIdentifier
    parent?: AclRoleIdentifier
}

interface AclRuleConfig {
    name: string
    resource: string | RegExp,
    roles: Set<AclRoleIdentifier>
}

export enum AclAction {
    DENY, ALLOW
}

export interface AclValidateConfig {
    resource?: string
    allowedRoles?: AclRoleIdentifier[]
}

export type AclValidateConfigType = AclValidateConfig | AclRoleIdentifier | AclRoleIdentifier[]

export interface AclOptions extends AclMiddlewareOptions {
    defaultAction?: AclAction
    learn?: boolean
}

export const defaultAclOptions: AclOptions = {
    defaultAction: AclAction.DENY,
    learn: true
}

export class AclPlugin implements Plugin {

    protected _options: AclOptions;

    protected _roles = new Map<AclRoleIdentifier, AclRoleConfig>()
    protected _allowRules = new Map<string, AclRuleConfig>()
    protected _denyRules = new Map<string, AclRuleConfig>()

    constructor(options?: AclOptions) {

        this._options = defaults(options || {}, defaultAclMiddlewareOptions, defaultAclOptions);
    }

    defaultAction(action: AclAction): this {

        this._options.defaultAction = action;
        return this;
    }

    learn(learn: boolean = true): this {

        this._options.learn = learn;
        return this;
    }

    role(identifier: AclRoleIdentifier, parent: AclRoleIdentifier=null): this {

        this._roles.set(identifier, {
            identifier, parent
        });

        return this;
    }

    allow(resource: string, roles: AclRoleIdentifier | AclRoleIdentifier[]): this {

        const parsedRoles = new Set(isArray(roles) ? roles : [roles]);
        if(this._options.learn){
            this._learnRoles(parsedRoles);
        }

        if(this._allowRules.has(resource)){

            const config = this._allowRules.get(resource);
            parsedRoles.forEach(role => config.roles.add(role));
        }
        else {

            this._allowRules.set(resource, this._getRuleConfig(resource, parsedRoles));
        }

        return this;
    }

    deny(resource: string, roles: AclRoleIdentifier | AclRoleIdentifier[]): this {

        const parsedRoles = new Set(isArray(roles) ? roles : [roles]);
        if(this._options.learn){
            this._learnRoles(parsedRoles);
        }

        if(this._denyRules.has(resource)){

            const config = this._denyRules.get(resource);
            parsedRoles.forEach(role => config.roles.add(role));
        }
        else {

            this._denyRules.set(resource, this._getRuleConfig(resource, parsedRoles));
        }

        return this;
    }

    isAllowed(role: AclRoleIdentifier, resource: string): boolean {

        let determinedAction = this._options.defaultAction;

        const allowRules = this._findRules(resource, this._allowRules);
        const denyRules = this._findRules(resource, this._denyRules);

        const rules = sortBy([
            ...allowRules.map(rule => ({ rule, action: AclAction.ALLOW })),
            ...denyRules.map(rule => ({ rule, action: AclAction.DENY })),
        ], rule => rule.rule.name.length);

        for(let { rule, action } of rules) {

            if (this.isRoleIncluded(role, rule.roles)) {
                determinedAction = action;
            }
        }

        return determinedAction === AclAction.ALLOW;
    }

    isRoleIncluded(role: AclRoleIdentifier, compareRoles: Set<AclRoleIdentifier>): boolean {

        const roleConfig = this._roles.get(role);
        if(!roleConfig){
           throw new FrameworkError(`Role "${role}" not registered`);
        }

        if(compareRoles.has(role)){
            return true;
        }

        const roleList = this._getRoleList(roleConfig);

        for(let candidate of compareRoles){

            if(roleList.indexOf(candidate) >= 0){
                return true;
            }
        }

        return false;
    }

    validate(config: AclValidateConfigType, role: string=null){

        let parsedConfig: AclValidateConfig;

        if(isArray(config)){
            parsedConfig = { allowedRoles: config };
        }
        else if(isString(config) || isNumber(config)){
            parsedConfig = { allowedRoles: [config] };
        }
        else if(config) {
            parsedConfig = config as AclValidateConfig;
        }

        let allowed = this._options.defaultAction === AclAction.ALLOW;

        if(role){

            if(parsedConfig.allowedRoles){

                allowed = this.isRoleIncluded(role, new Set(parsedConfig.allowedRoles));
            }
            else if(parsedConfig.resource){

                allowed = this.isAllowed(role, parsedConfig.resource);
            }
        }

        return allowed;
    }

    middleware(config: AclValidateConfigType = null) {

        return expressAclMiddleware(this, config, this._options);
    }

    rolePath(path: string): this {

        this._options.rolePath = path;
        return this;
    }

    onForbidden(handler: (resource: string) => void): this {

        this._options.onForbidden = handler;
        return this;
    }

    beforeBuildSchema(builder: SchemaBuilder, rootBuilder: SchemaBuilder) {

        // Add middleware
        builder.use(graphQLAclMiddleware(this, rootBuilder.name || rootBuilder.tag.toString(), this._options));
    }

    afterBuildSchema(builder: SchemaBuilder, schema: GraphQLSchema, rootBuilder: SchemaBuilder) {

        // Add rules
        const schemaId = rootBuilder.name || rootBuilder.tag.toString();

        for(let type of builder.getObjectTypes()){

            const typeInfo = type.info();
            this.addRules(`${schemaId}:${type.name}.*`, typeInfo.allowedRoles, typeInfo.deniedRoles);

            for(let field of type.info().fields){

                const fieldInfo = field.info()
                this.addRules(`${schemaId}:${type.name}.${field.name}`, fieldInfo.allowedRoles, fieldInfo.deniedRoles);
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

    protected _findRules(resource: string, collection: Map<string, AclRuleConfig>): AclRuleConfig[] {

        const allRules = Array.from(collection.values());

        return allRules.filter(rule => {

            if(isString(rule.resource)){
                return rule.resource === resource;
            }
            else if(rule.resource instanceof RegExp) {
                return rule.resource.test(resource);
            }

            return false;
        })
    }

    protected _learnRoles(roles: Set<AclRoleIdentifier>){

        for(let role of roles){

            if(!this._roles.has(role)){
                this.role(role);
            }
        }
    }

    protected _getRoleList(roleConfig: AclRoleConfig): AclRoleIdentifier[] {

        if(!roleConfig){
            return [];
        }

        if(!roleConfig.parent){
            return [roleConfig.identifier];
        }

        return [
            roleConfig.identifier,
            ...this._getRoleList(this._roles.get(roleConfig.parent))
        ]
    }

    protected _getRuleConfig(name: string, roles: Set<AclRoleIdentifier>): AclRuleConfig {

        let resource: string | RegExp = name;

        if(name.indexOf('*') >= 0){

            const pattern = escapeRegExp(name).replace('\\*', '(.*)');
            resource = new RegExp(`^${pattern}$`);
        }

        return {
            name,
            resource,
            roles
        }
    }
}

export function aclPlugin(options?: AclOptions){

    return new AclPlugin(options);
}

export default aclPlugin;