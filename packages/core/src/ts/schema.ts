import { isFunction, clone, compact, isString, isArray, isObjectLike } from 'es-toolkit/compat'

import { mergeSchemas } from "@graphql-tools/schema";
import { applyMiddleware } from "graphql-middleware";

import type { GraphQLSchemaConfig } from "graphql/type/schema";
import type { GraphQLFieldResolver } from "graphql/type/definition";
import {
    GraphQLBoolean,
    GraphQLFloat,
    GraphQLID,
    GraphQLInt,
    type GraphQLScalarType,
    GraphQLSchema,
    GraphQLString,
    type GraphQLType
} from "graphql";

import { ObjectTypeBuilder } from "./objectType";
import type { FieldBuilder, FieldType } from "./field";
import { InputObjectTypeBuilder } from "./inputObjectType";
import { EnumTypeBuilder } from "./enumType";
import { UnionTypeBuilder, type UnionTypeMemberName } from "./unionType";

import { ensureInstantiated, resolveBuilder, resolveBuilderArgs } from "./util";
import type Builder from "./Builder";
import { BuildContext, BuilderError, FinalizeContext, resolveName } from "./Builder";
import type { NamingStrategy } from "./naming";
import type { Plugin } from "./plugin";
import type { Configurator, FieldRuntime, Middleware, OptionalPromise } from "./common";

const DefaultScalars = [GraphQLInt, GraphQLFloat, GraphQLString, GraphQLBoolean, GraphQLID];

export abstract class AbstractSchemaBuilder<NS extends NamingStrategy> {

    protected _name?: string;
    protected _tag: number;

    protected _plugins: Plugin[] = [];

    protected _middleware: Middleware[] = [];
    protected _subSchemas: AbstractSchemaBuilder<any>[] = [];

    protected _customConfig?: Readonly<GraphQLSchemaConfig>

    protected _defaultNamingStrategy?: NS;
    protected _namingStrategy?: NS;

    protected _objectTypes = new Map<string, ObjectTypeBuilder>();
    protected _inputObjectTypes = new Map<string, InputObjectTypeBuilder>();
    protected _enumTypes = new Map<string, EnumTypeBuilder>();
    protected _unionTypes = new Map<string, UnionTypeBuilder>();
    protected _scalarTypes = new Map<string, GraphQLScalarType>();

    protected _allowedRoles = new Set<string>();
    protected _deniedRoles = new Set<string>();

    protected _allowedQueryRoles = new Set<string>();
    protected _deniedQueryRoles = new Set<string>();

    protected _allowedMutationRoles = new Set<string>();
    protected _deniedMutationRoles = new Set<string>();

    protected _allowedSubscriptionRoles = new Set<string>();
    protected _deniedSubscriptionRoles = new Set<string>();

    protected _queryObject = new ObjectTypeBuilder('Query');
    protected _mutationObject?: ObjectTypeBuilder;
    protected _subscriptionObject?: ObjectTypeBuilder;

    protected _resolvers?: object;
    protected _queryResolvers?: object;
    protected _mutationResolvers?: object;
    protected _subscriptionResolvers?: object;

    protected _compiledResolvers: object;

    constructor(name: string=null) {

        this._name = name;
        this._tag = Math.round(Math.random() * 1000000);

        this._addDefaultScalars();
    }

    naming(strategy: NS): this {

        this._namingStrategy = strategy;
        return this;
    }

    setDefaultNamingStrategy(strategy: NS) {

        this._defaultNamingStrategy = strategy;
    }

    get namingStrategy(): NS {

        return this._namingStrategy || this._defaultNamingStrategy;
    }

    customConfig(config: Readonly<GraphQLSchemaConfig>): this {

        this._customConfig = config;
        return this;
    }

    object(name: string, configurator: Configurator<ObjectTypeBuilder>): this;
    object(name: string): this;
    object(object: ObjectTypeBuilder): this;
    object(objectOrName: ObjectTypeBuilder | string, configurator: Configurator<ObjectTypeBuilder>);
    object(objectOrName: ObjectTypeBuilder | string, configurator: Configurator<ObjectTypeBuilder> = null): this {

        const resolvedArgs = resolveBuilderArgs(objectOrName, configurator, ObjectTypeBuilder);
        const resolvedBuilder = resolveBuilder(resolvedArgs, name => new ObjectTypeBuilder(name));

        this._objectTypes.set(resolvedBuilder.name, resolvedBuilder);
        return this;
    }

    getObjectTypes(): ObjectTypeBuilder[] {

        return compact([this._queryObject, this._mutationObject, this._subscriptionObject, ...Array.from(this._objectTypes.values())]);
    }

    inputObject(name: string, configurator: Configurator<InputObjectTypeBuilder>): this;
    inputObject(name: string): this;
    inputObject(object: InputObjectTypeBuilder): this;
    inputObject(objectOrName: InputObjectTypeBuilder | string, configurator: Configurator<InputObjectTypeBuilder>);
    inputObject(objectOrName: InputObjectTypeBuilder | string, configurator: Configurator<InputObjectTypeBuilder> = null): this {

        const resolvedArgs = resolveBuilderArgs(objectOrName, configurator, InputObjectTypeBuilder);
        const resolvedBuilder = resolveBuilder(resolvedArgs, name => new InputObjectTypeBuilder(name));

        this._inputObjectTypes.set(resolvedBuilder.name, resolvedBuilder);
        return this;
    }

    getInputObjectTypes(): InputObjectTypeBuilder[] {

        return Array.from(this._inputObjectTypes.values());
    }

    enum(name: string, valuesObject: object): this;
    enum(name: string, configurator: Configurator<EnumTypeBuilder>): this;
    enum(name: string): this;
    enum(builder: EnumTypeBuilder): this;
    enum(enumOrName: EnumTypeBuilder | string, configuratorOrValuesObject: Configurator<EnumTypeBuilder> | object);
    enum(enumOrName: EnumTypeBuilder | string, configuratorOrValuesObject: Configurator<EnumTypeBuilder> | object = null): this {

        let builder: EnumTypeBuilder = null;
        let name: string = null;
        let configurator: Configurator<EnumTypeBuilder> = null;
        let valuesObject: object = null;

        if(enumOrName instanceof EnumTypeBuilder) {

            builder = enumOrName as EnumTypeBuilder;

            if(isFunction(configuratorOrValuesObject)){
                configurator = configuratorOrValuesObject as Configurator<EnumTypeBuilder>;
            }
        }
        else if(isString(enumOrName)){

            name = enumOrName as string;

            if(isFunction(configuratorOrValuesObject)){
                configurator = configuratorOrValuesObject as Configurator<EnumTypeBuilder>;
            }
            else {
                valuesObject = configuratorOrValuesObject;
            }
        }

        const resolvedArgs = { builder, name, configurator }
        const resolvedBuilder = resolveBuilder(resolvedArgs, name => new EnumTypeBuilder(name, valuesObject));

        this._enumTypes.set(resolvedBuilder.name, resolvedBuilder);
        return this;
    }

    getEnumTypes(): EnumTypeBuilder[] {

        return Array.from(this._enumTypes.values());
    }

    union(name: string, types: UnionTypeMemberName[]): this;
    union(name: string, configurator: Configurator<UnionTypeBuilder>): this;
    union(name: string): this;
    union(object: UnionTypeBuilder): this;
    union(objectOrName: UnionTypeBuilder | string, configuratorOrTypes: Configurator<UnionTypeBuilder> | UnionTypeMemberName[]);
    union(objectOrName: UnionTypeBuilder | string, configuratorOrTypes: Configurator<UnionTypeBuilder> | UnionTypeMemberName[] = null): this {

        let builder: UnionTypeBuilder = null;
        let name: string = null;
        let configurator: Configurator<UnionTypeBuilder> = null;
        let resolvedTypes: UnionTypeMemberName[] = null;

        if(objectOrName instanceof UnionTypeBuilder) {

            builder = objectOrName as UnionTypeBuilder;

            if(isFunction(configuratorOrTypes)){
                configurator = configuratorOrTypes as Configurator<UnionTypeBuilder>;
            }
        }
        else if(isString(objectOrName)){

            name = objectOrName as string;

            if(isFunction(configuratorOrTypes)){
                configurator = configuratorOrTypes as Configurator<UnionTypeBuilder>;
            }
            else if(isArray(configuratorOrTypes)) {
                resolvedTypes = configuratorOrTypes;
            }
        }

        const resolvedArgs = { builder, name, configurator }
        const resolvedBuilder = resolveBuilder(resolvedArgs, name => new UnionTypeBuilder(name, resolvedTypes));

        this._unionTypes.set(resolvedBuilder.name, resolvedBuilder);
        return this;
    }

    getUnionTypes(): UnionTypeBuilder[] {

        return Array.from(this._unionTypes.values());
    }

    scalar(scalar: GraphQLScalarType): this {

        this._scalarTypes.set(scalar.name, scalar);
        return this;
    }

    query(name: string, type: FieldType, configurator: Configurator<FieldBuilder>): this;
    query(name: string, type: FieldType): this;
    query(field: FieldBuilder): this;
    query(fieldOrName: FieldBuilder | string, type: FieldType, configurator: Configurator<FieldBuilder>);
    query(fieldOrName: FieldBuilder | string, type: FieldType = null, configurator: Configurator<FieldBuilder> = null): this {

        this._queryObject.field(fieldOrName, type, configurator);
        return this;
    }

    mutation(name: string, type: FieldType, configurator: Configurator<FieldBuilder>): this;
    mutation(name: string, type: FieldType): this;
    mutation(field: FieldBuilder): this;
    mutation(fieldOrName: FieldBuilder | string, type: FieldType, configurator: Configurator<FieldBuilder>);
    mutation(fieldOrName: FieldBuilder | string, type: FieldType = null, configurator: Configurator<FieldBuilder> = null): this {

        if(!this._mutationObject){
            this._mutationObject = new ObjectTypeBuilder('Mutation');
        }

        this._mutationObject.field(fieldOrName, type, configurator);
        return this;
    }

    subscription(name: string, type: FieldType, configurator: Configurator<FieldBuilder>): this;
    subscription(name: string, type: FieldType): this;
    subscription(field: FieldBuilder): this;
    subscription(fieldOrName: FieldBuilder | string, type: FieldType, configurator: Configurator<FieldBuilder>);
    subscription(fieldOrName: FieldBuilder | string, type: FieldType = null, configurator: Configurator<FieldBuilder> = null): this {

        if(!this._subscriptionObject){
            this._subscriptionObject = new ObjectTypeBuilder('Subscription');
        }

        this._subscriptionObject.field(fieldOrName, type, configurator);
        return this;
    }

    resolvers(resolvers: object): this {

        this._resolvers = resolvers;
        return this;
    }

    queryResolvers(resolvers: object): this {

        this._queryResolvers = resolvers;
        return this;
    }

    mutationResolvers(resolvers: object): this {

        this._mutationResolvers = resolvers;
        return this;
    }

    subscriptionResolvers(resolvers: object): this {

        this._subscriptionResolvers = resolvers;
        return this;
    }

    allow(...roles: string[]): this {

        roles.forEach(role => this._allowedRoles.add(role));
        return this;
    }

    deny(...roles: string[]): this {

        roles.forEach(role => this._deniedRoles.add(role));
        return this;
    }

    allowQuery(...roles: string[]): this {

        roles.forEach(role => this._allowedQueryRoles.add(role));
        return this;
    }

    denyQuery(...roles: string[]): this {

        roles.forEach(role => this._deniedQueryRoles.add(role));
        return this;
    }

    allowMutation(...roles: string[]): this {

        roles.forEach(role => this._allowedMutationRoles.add(role));
        return this;
    }

    denyMutation(...roles: string[]): this {

        roles.forEach(role => this._deniedMutationRoles.add(role));
        return this;
    }

    allowSubscription(...roles: string[]): this {

        roles.forEach(role => this._allowedSubscriptionRoles.add(role));
        return this;
    }

    denySubscription(...roles: string[]): this {

        roles.forEach(role => this._deniedSubscriptionRoles.add(role));
        return this;
    }

    merge(schema: AbstractSchemaBuilder<any>): this {

        this._subSchemas.push(schema);
        return this;
    }

    use(...plugins: Plugin[]): this;
    use(...middleware: Middleware[]): this;
    use(...middlewareOrPlugins: Middleware[] | Plugin[]): this {

        for(const item of middlewareOrPlugins){

            if(isObjectLike(item)){
                this._plugins.push(item as Plugin);
            }
            else if(isFunction(item)){
                this._middleware.push(item as Middleware);
            }
        }

        return this;
    }

    findType(name: string, deep = false): Builder<any> | GraphQLScalarType {

        return this.locateType(name, deep)?.type;
    }

    locateType(name: string, deep = false): { schema: SchemaBuilder, type: Builder<any> | GraphQLScalarType } {

        let type: Builder<any> | GraphQLScalarType = null;

        if(name === this._queryObject.name){
            type = this._queryObject;
        }
        else if(name === this._mutationObject?.name){
            type = this._mutationObject;
        }
        else if(name === this._subscriptionObject?.name){
            type = this._subscriptionObject;
        }
        else {

            type = this._objectTypes.get(name)
                ?? this._inputObjectTypes.get(name)
                ?? this._enumTypes.get(name)
                ?? this._unionTypes.get(name)
                ?? this._scalarTypes.get(name)
                ?? null;
        }

        if(!type && deep){

            for(const sub of this._subSchemas){

                const result = sub.locateType(name, true);
                if(result){
                    return result;
                }
            }
        }

        return type ? { schema: this, type } : null;
    }

    hasType(name: string, deep = false): boolean {

        return !!this.findType(name, deep);
    }

    findFieldRuntime(typeName: string, fieldName: string): FieldRuntime {

        const resolvers = this.compiledResolvers as any;
        const typeResolvers = resolvers[typeName];
        if(!typeResolvers){
            return null;
        }

        if(typeName === this._subscriptionObject?.name){
            return this._resolveSubscriptionFieldRuntime(typeResolvers, fieldName);
        }

        const fieldResolver = typeResolvers[fieldName];
        if(!isFunction(fieldResolver)){
            return null;
        }

        return {
            resolve: fieldResolver.bind(typeResolvers)
        };
    }

    get name(): string {

        return resolveName(this._name);
    }

    get tag(): number {

        return this._tag;
    }

    async finalize(rootSchema?: AbstractSchemaBuilder<any>){

        const resolvedRootSchema = rootSchema || this;

        // Assign naming strategy to sub schemas as default
        if(this._namingStrategy){

            for(const subSchema of this._subSchemas){
                subSchema.setDefaultNamingStrategy(this._namingStrategy);
            }
        }

        // Attach plugins, middleware & acl rules to sub schemas
        for(const subSchema of this._subSchemas){

            this._plugins.forEach(plugin => subSchema.use(plugin));
            this._middleware.forEach(middleware => subSchema.use(middleware));

            subSchema.allow(...Array.from(this._allowedRoles));
            subSchema.deny(...Array.from(this._deniedRoles));

            subSchema.allowQuery(...Array.from(this._allowedQueryRoles));
            subSchema.denyQuery(...Array.from(this._deniedQueryRoles));

            subSchema.allowMutation(...Array.from(this._allowedMutationRoles));
            subSchema.denyMutation(...Array.from(this._deniedMutationRoles));

            subSchema.allowSubscription(...Array.from(this._allowedSubscriptionRoles));
            subSchema.denySubscription(...Array.from(this._deniedSubscriptionRoles));
        }

        await this._executePlugins('beforeFinalizeSchema', plugin => plugin.beforeFinalizeSchema(this));

        await this.finalizeSchema();

        await this._executePlugins('afterFinalizeSchema', plugin => plugin.afterFinalizeSchema(this));

        // Attach plugins to members
        for(const objectType of this.getObjectTypes()){
            this._plugins.forEach(plugin => objectType.use(plugin));
        }

        for(const inputObject of this._inputObjectTypes.values()){
            this._plugins.forEach(plugin => inputObject.use(plugin));
        }

        for(const unionType of this._unionTypes.values()){
            this._plugins.forEach(plugin => unionType.use(plugin));
        }

        for(const enumType of this._enumTypes.values()){
            this._plugins.forEach(plugin => enumType.use(plugin));
        }

        // Apply rules
        for(const objectType of Array.from(this._objectTypes.values())){
            objectType.allow(...Array.from(this._allowedRoles)).deny(...Array.from(this._deniedRoles));
        }

        const fullAllowedQueryRoles = [...Array.from(this._allowedRoles), ...Array.from(this._allowedQueryRoles)];
        const fullDeniedQueryRoles = [...Array.from(this._deniedRoles), ...Array.from(this._deniedQueryRoles)];

        for(const queryField of this._queryObject.info().fields){
            queryField.allow(...fullAllowedQueryRoles).deny(...fullDeniedQueryRoles);
        }

        if(this._mutationObject){

            const fullAllowedMutationRoles = [...Array.from(this._allowedRoles), ...Array.from(this._allowedMutationRoles)];
            const fullDeniedMutationRoles = [...Array.from(this._deniedRoles), ...Array.from(this._deniedMutationRoles)];

            for(const mutationField of this._mutationObject.info().fields){
                mutationField.allow(...fullAllowedMutationRoles).deny(...fullDeniedMutationRoles);
            }
        }

        if(this._subscriptionObject){

            const fullAllowedSubscriptionRoles = [...Array.from(this._allowedRoles), ...Array.from(this._allowedSubscriptionRoles)];
            const fullDeniedSubscriptionRoles = [...Array.from(this._deniedRoles), ...Array.from(this._deniedSubscriptionRoles)];

            for(const subscriptionField of this._subscriptionObject.info().fields){
                subscriptionField.allow(...fullAllowedSubscriptionRoles).deny(...fullDeniedSubscriptionRoles);
            }
        }

        // Finalize types
        const finalizeContext = new FinalizeContext(this, resolvedRootSchema);

        for(const objectType of this.getObjectTypes()){
            await objectType.finalize(finalizeContext);
        }

        for(const inputObjectType of this._inputObjectTypes.values()){
            await inputObjectType.finalize(finalizeContext);
        }

        for(const unionType of this._unionTypes.values()){
            await unionType.finalize(finalizeContext);
        }

        for(const enumType of this._enumTypes.values()){
            await enumType.finalize(finalizeContext);
        }

        // Finalize sub schemas
        for(const subSchema of this._subSchemas){
            await subSchema.finalize(resolvedRootSchema);
        }
    }

    async finalizeSchema(){}

    async build(): Promise<GraphQLSchema> {

        // Finalize schema
        await this.finalize();

        // Build schema
        this._executePluginsSync('beforeBuild', plugin => plugin.beforeBuild(this));

        const resolvedTypes = new Map<string, GraphQLType>();
        const schema = await this.buildSchema(resolvedTypes);

        this._executePluginsSync('afterBuild', plugin => plugin.afterBuild(this, schema));

        return schema;
    }

    async buildSchema(resolvedTypes: Map<string, GraphQLType>, rootSchema?: AbstractSchemaBuilder<any>): Promise<GraphQLSchema> {

        const resolvedRootSchema = rootSchema || this;

        this._executePluginsSync('beforeBuildSchema', plugin => plugin.beforeBuildSchema(this, resolvedRootSchema));

        const context = new BuildContext(this, resolvedRootSchema, resolvedTypes);

        // Schema
        const schemaConfig = {
            ...(this._customConfig || {}),
            query: this._queryObject.build(context)
        };

        if(this._mutationObject){
            schemaConfig['mutation'] = this._mutationObject.build(context);
        }

        if(this._subscriptionObject){
            schemaConfig['subscription'] = this._subscriptionObject.build(context);
        }

        const schema = new GraphQLSchema(schemaConfig);

        // Create full schema
        const fullSchema = applyMiddleware(schema, ...this._middleware);

        const builtSubSchemas = [];
        for(const subSchema of this._subSchemas){

            const builtSchema = await subSchema.buildSchema(resolvedTypes, resolvedRootSchema);
            builtSubSchemas.push(builtSchema);
        }

        const mergedSchema = mergeSchemas({
            schemas: [fullSchema, ...builtSubSchemas]
        });

        this._executePluginsSync('afterBuildSchema', plugin => plugin.afterBuildSchema(this, mergedSchema, resolvedRootSchema));

        return mergedSchema;
    }

    get compiledResolvers(): object {

        if(this._compiledResolvers){
            return this._compiledResolvers;
        }

        const resolvers: any = this._resolvers ? clone(this._resolvers) : {};

        if(this._queryResolvers){
            resolvers['Query'] = ensureInstantiated(this._queryResolvers);
        }

        if(this._mutationResolvers && this._mutationObject){
            resolvers['Mutation'] = ensureInstantiated(this._mutationResolvers);
        }

        if(this._subscriptionResolvers && this._subscriptionObject){
            resolvers['Subscription'] = ensureInstantiated(this._subscriptionResolvers);
        }

        for(const objectType of this._objectTypes.values()){

            const objectResolvers = objectType.getResolvers();
            if(objectResolvers){
                resolvers[objectType.name] = objectResolvers;
            }
        }

        this._compiledResolvers = resolvers;
        return resolvers;
    }

    protected async _executePlugins(methodName: string, fn: (plugin: Plugin) => OptionalPromise){

        for(const plugin of this._plugins){

            if(plugin[methodName]){
                await fn(plugin);
            }
        }
    }

    protected _executePluginsSync(methodName: string, fn: (plugin: Plugin) => void){

        for(const plugin of this._plugins){

            if(plugin[methodName]){
                fn(plugin);
            }
        }
    }

    protected _addDefaultScalars(){

        DefaultScalars.forEach(scalar => this.scalar(scalar));
    }

    protected _resolveSubscriptionFieldRuntime(typeResolvers: any, fieldName: string): FieldRuntime {

        const fieldResolver = typeResolvers[fieldName];
        if(!fieldResolver){
            return null;
        }

        if(isFunction(fieldResolver)){
            return this._normalizeSubscriptionFieldRuntime(fieldResolver.call(typeResolvers), fieldName, typeResolvers);
        }

        if(isObjectLike(fieldResolver)){
            return this._normalizeSubscriptionFieldRuntime(fieldResolver as FieldRuntime, fieldName, typeResolvers);
        }

        throw new BuilderError(`Subscription resolver "${fieldName}" must be an object with a subscribe function or a method returning one`);
    }

    protected _normalizeSubscriptionFieldRuntime(input: FieldRuntime, fieldName: string, context: any): FieldRuntime {

        if(!isObjectLike(input)){
            throw new BuilderError(`Subscription resolver "${fieldName}" must return an object with a subscribe function`);
        }

        if(!isFunction(input.subscribe)){
            throw new BuilderError(`Subscription resolver "${fieldName}" must define a subscribe function`);
        }

        if(input.resolve && !isFunction(input.resolve)){
            throw new BuilderError(`Subscription resolver "${fieldName}" must define resolve as a function`);
        }

        return {
            subscribe: input.subscribe.bind(context),
            resolve: input.resolve?.bind(context)
        };
    }
}

export class SchemaBuilder extends AbstractSchemaBuilder<NamingStrategy> {}

export function schema(name: string = null): SchemaBuilder {

    return new SchemaBuilder(name);
}

export default schema;
