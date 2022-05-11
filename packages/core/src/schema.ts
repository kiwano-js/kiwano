import { isFunction, clone, compact, isString, isArray, isObjectLike } from 'lodash'

import { mergeSchemas } from "@graphql-tools/schema";
import { applyMiddleware } from "graphql-middleware";

import { GraphQLFieldResolver } from "graphql/type/definition";
import {
    GraphQLBoolean,
    GraphQLFloat,
    GraphQLID,
    GraphQLInt,
    GraphQLScalarType,
    GraphQLSchema,
    GraphQLString,
    GraphQLType
} from "graphql";

import { ObjectTypeBuilder } from "./objectType";
import { FieldBuilder, FieldType } from "./field";
import { InputObjectTypeBuilder } from "./inputObjectType";
import { EnumTypeBuilder } from "./enumType";
import { UnionTypeBuilder, UnionTypeMemberName } from "./unionType";

import { ensureInstantiated, resolveBuilder, resolveBuilderArgs } from "./util";
import Builder, { BuildContext, FinalizeContext, resolveName } from "./Builder";
import { NamingStrategy } from "./naming";
import { Plugin } from "./plugin";
import { Configurator, Middleware, OptionalPromise } from "./common";

const DefaultScalars = [GraphQLInt, GraphQLFloat, GraphQLString, GraphQLBoolean, GraphQLID];

export abstract class AbstractSchemaBuilder<NS extends NamingStrategy> {

    protected _name?: string;

    protected _plugins: Plugin[] = [];

    protected _middleware: Middleware[] = [];
    protected _subSchemas: AbstractSchemaBuilder<any>[] = [];

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

    protected _queryObject = new ObjectTypeBuilder('Query');
    protected _mutationObject?: ObjectTypeBuilder;

    protected _resolvers?: object;
    protected _queryResolvers?: object;
    protected _mutationResolvers?: object;

    constructor(name: string=null) {

        this._name = name;
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

        return compact([this._queryObject, this._mutationObject, ...Array.from(this._objectTypes.values())]);
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

    merge(schema: AbstractSchemaBuilder<any>): this {

        this._subSchemas.push(schema);
        return this;
    }

    use(...plugins: Plugin[]): this;
    use(...middleware: Middleware[]): this;
    use(...middlewareOrPlugins: Middleware[] | Plugin[]): this {

        for(let item of middlewareOrPlugins){

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
        else {

            type = this._objectTypes.get(name)
                ?? this._inputObjectTypes.get(name)
                ?? this._enumTypes.get(name)
                ?? this._unionTypes.get(name)
                ?? this._scalarTypes.get(name)
                ?? null;
        }

        if(!type && deep){

            for(let sub of this._subSchemas){

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

    findResolver(typeName: string, fieldName: string): GraphQLFieldResolver<any, any> {

        const resolvers = this.compiledResolvers;
        let resolver: GraphQLFieldResolver<any, any> = null;

        const typeResolvers = resolvers[typeName];
        if(typeResolvers && typeResolvers[fieldName]){
            resolver = typeResolvers[fieldName].bind(typeResolvers);
        }

        return resolver;
    }

    get name(): string {

        return resolveName(this._name);
    }

    async finalize(rootSchema?: AbstractSchemaBuilder<any>){

        const resolvedRootSchema = rootSchema || this;

        // Assign naming strategy to sub schemas as default
        if(this._namingStrategy){

            for(let subSchema of this._subSchemas){
                subSchema.setDefaultNamingStrategy(this._namingStrategy);
            }
        }

        // Attach plugins, middleware & acl rules to sub schemas
        for(let subSchema of this._subSchemas){

            this._plugins.forEach(plugin => subSchema.use(plugin));
            this._middleware.forEach(middleware => subSchema.use(middleware));

            subSchema.allow(...Array.from(this._allowedRoles));
            subSchema.deny(...Array.from(this._deniedRoles));

            subSchema.allowQuery(...Array.from(this._allowedQueryRoles));
            subSchema.denyQuery(...Array.from(this._deniedQueryRoles));

            subSchema.allowMutation(...Array.from(this._allowedMutationRoles));
            subSchema.denyMutation(...Array.from(this._deniedMutationRoles));
        }

        await this._executePlugins('beforeFinalizeSchema', plugin => plugin.beforeFinalizeSchema(this));

        await this.finalizeSchema();

        await this._executePlugins('afterFinalizeSchema', plugin => plugin.afterFinalizeSchema(this));

        // Attach plugins to members
        for(let objectType of this.getObjectTypes()){
            this._plugins.forEach(plugin => objectType.use(plugin));
        }

        for(let inputObject of this._inputObjectTypes.values()){
            this._plugins.forEach(plugin => inputObject.use(plugin));
        }

        for(let unionType of this._unionTypes.values()){
            this._plugins.forEach(plugin => unionType.use(plugin));
        }

        for(let enumType of this._enumTypes.values()){
            this._plugins.forEach(plugin => enumType.use(plugin));
        }

        // Apply rules
        for(let objectType of this.getObjectTypes()){
            objectType.allow(...Array.from(this._allowedRoles)).deny(...Array.from(this._deniedRoles));
        }

        for(let queryField of this._queryObject.info().fields){
            queryField.allow(...Array.from(this._allowedQueryRoles)).deny(...Array.from(this._deniedQueryRoles));
        }

        if(this._mutationObject){

            for(let mutationField of this._mutationObject.info().fields){
                mutationField.allow(...Array.from(this._allowedMutationRoles)).deny(...Array.from(this._deniedMutationRoles));
            }
        }

        // Finalize types
        const finalizeContext = new FinalizeContext(this, resolvedRootSchema);

        for(let objectType of this.getObjectTypes()){
            await objectType.finalize(finalizeContext);
        }

        for(let inputObjectType of this._inputObjectTypes.values()){
            await inputObjectType.finalize(finalizeContext);
        }

        for(let unionType of this._unionTypes.values()){
            await unionType.finalize(finalizeContext);
        }

        for(let enumType of this._enumTypes.values()){
            await enumType.finalize(finalizeContext);
        }

        // Finalize sub schemas
        for(let subSchema of this._subSchemas){
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

        this._executePluginsSync('beforeBuildSchema', plugin => plugin.beforeBuildSchema(this));

        const resolvedRootSchema = rootSchema || this;
        const context = new BuildContext(this, resolvedRootSchema, resolvedTypes);

        // Schema
        const schemaConfig = {
            query: this._queryObject.build(context)
        };

        if(this._mutationObject){
            schemaConfig['mutation'] = this._mutationObject.build(context);
        }

        const schema = new GraphQLSchema(schemaConfig);

        // Create full schema
        const fullSchema = applyMiddleware(schema, ...this._middleware);

        const builtSubSchemas = [];
        for(let subSchema of this._subSchemas){

            const builtSchema = await subSchema.buildSchema(resolvedTypes, resolvedRootSchema);
            builtSubSchemas.push(builtSchema);
        }

        const mergedSchema = mergeSchemas({
            schemas: [fullSchema, ...builtSubSchemas]
        });

        this._executePluginsSync('afterBuildSchema', plugin => plugin.afterBuildSchema(this, mergedSchema));

        return mergedSchema;
    }

    get compiledResolvers() {

        let resolvers: any = this._resolvers ? clone(this._resolvers) : {};

        if(this._queryResolvers){
            resolvers['Query'] = ensureInstantiated(this._queryResolvers);
        }

        if(this._mutationResolvers && this._mutationObject){
            resolvers['Mutation'] = ensureInstantiated(this._mutationResolvers);
        }

        for(let objectType of this._objectTypes.values()){

            const objectResolvers = objectType.getResolvers();
            if(objectResolvers){
                resolvers[objectType.name] = objectResolvers;
            }
        }

        return resolvers;
    }

    protected async _executePlugins(methodName: string, fn: (plugin: Plugin) => OptionalPromise){

        for(let plugin of this._plugins){

            if(plugin[methodName]){
                await fn(plugin);
            }
        }
    }

    protected _executePluginsSync(methodName: string, fn: (plugin: Plugin) => void){

        for(let plugin of this._plugins){

            if(plugin[methodName]){
                fn(plugin);
            }
        }
    }

    protected _addDefaultScalars(){

        DefaultScalars.forEach(scalar => this.scalar(scalar));
    }
}

export class SchemaBuilder extends AbstractSchemaBuilder<NamingStrategy> {}

export function schema(name: string = null): SchemaBuilder {

    return new SchemaBuilder(name);
}

export default schema;