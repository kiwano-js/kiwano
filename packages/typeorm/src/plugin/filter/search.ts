import { GraphQLString } from "graphql";

import { Brackets, SelectQueryBuilder } from "typeorm";
import { EntityMetadata } from "typeorm/metadata/EntityMetadata";

import defaults from "lodash/defaults";
import isString from "lodash/isString";

import {
    BuildContext,
    ConstructorType,
    defaultSearchFilterPluginOptions as coreDefaultOptions,
    ensureInstantiated,
    FieldBuilder,
    FieldType,
    ObjectTypeBuilder,
    OptionalPromise,
    PluginError,
    SearchFilterPlugin as CoreSearchFilterPlugin,
    SearchFilterPluginOptions as CoreSearchFilterPluginOptions
} from "@kiwano/core";

import { addRelationJoin, Plugin } from "../common";
import { AllResolverBaseHooks, AllResolverInfo, RelationResolverBaseHooks, RelationResolverInfo } from "../../resolver";

export enum SearchMode {
    CONTAINS, STARTS, ENDS
}

export interface ISearchFilterPluginHooks extends AllResolverBaseHooks<any, any>, RelationResolverBaseHooks<any, any> {}

export interface SearchFilterPluginRelationField {
    relation: string
    relationField: string
}

export interface SearchFilterPluginHooksOptions {
    argumentName: string
    typeFields: Map<string, Set<SearchFieldConfig>>
    searchMode: SearchMode
}

export interface SearchFilterPluginOptions extends CoreSearchFilterPluginOptions {
    fields?: string[]
    relations?: SearchFilterPluginRelationField[]
    exclude?: string[]
    include?: string[]
    searchMode?: SearchMode
}

export interface SearchFieldConfig {
    field?: string,
    relation?: SearchFilterPluginRelationField
}

export const defaultOptions: SearchFilterPluginOptions = {
    searchMode: SearchMode.CONTAINS
}

export const allowedSearchTypes: FieldType[] = ['String', GraphQLString];

export class SearchFilterPluginHooks implements ISearchFilterPluginHooks {

    constructor(protected _options: SearchFilterPluginHooksOptions) {}

    $modifyAllQuery(builder: SelectQueryBuilder<any>, info: AllResolverInfo<any>): OptionalPromise {

        const searchQuery = info.args[this._options.argumentName];

        if(searchQuery){

            const entityMetaData = info.options.connection.getMetadata(info.options.model);
            const typeName = info.options.fieldInfo.type;
            if(!isString(typeName)){
                return;
            }

            const fields = this._options.typeFields.get(typeName as string);
            if(!fields){
                throw new PluginError(`No search fields defined for "${typeName}"`);
            }

            this.beforeApplySearch(builder, fields, searchQuery, entityMetaData, info);
            this.applySearch(builder, fields, searchQuery, entityMetaData, info);
            this.afterApplySearch(builder, fields, searchQuery, entityMetaData, info);
        }
    }

    $modifyRelationManyQuery(relation: string, builder: SelectQueryBuilder<object>, info: RelationResolverInfo<any>): OptionalPromise {

        const searchQuery = info.args[this._options.argumentName];

        if(searchQuery){

            const metadata = info.options.connection.getMetadata(info.options.model);
            const relationMeta = metadata.findRelationWithPropertyPath(relation);
            const entityMetaData = relationMeta.inverseEntityMetadata;

            const typeName = info.options.fieldInfo.type;
            if(!isString(typeName)){
                return;
            }

            const fields = this._options.typeFields.get(typeName as string);
            if(!fields){
                throw new PluginError(`No search fields defined for "${typeName}"`);
            }

            this.beforeApplySearch(builder, fields, searchQuery, entityMetaData, info);
            this.applySearch(builder, fields, searchQuery, entityMetaData, info);
            this.afterApplySearch(builder, fields, searchQuery, entityMetaData, info);
        }
    }

    applySearch(builder: SelectQueryBuilder<any>, fields: Set<SearchFieldConfig>, searchQuery: string, metadata: EntityMetadata, info: AllResolverInfo<any> | RelationResolverInfo<any>){

        const paramName = 'searchQuery';

        const relations = new Set(
            Array.from(fields)
                 .filter(field => !!field.relation)
                 .map(field => field.relation.relation)
        );

        const relationAliasMap = new Map<string, string>();

        // Add joins
        for(let relation of relations){

            const alias = this.addRelationJoin(builder, relation, metadata);
            relationAliasMap.set(relation, alias);
        }

        builder.andWhere(new Brackets(qb => {

            for(let field of fields){

                let clause = null;

                if(field.relation){
                    clause = this.getWhereClause(relationAliasMap.get(field.relation.relation), field.relation.relationField, paramName);
                }
                else if(field.field) {
                    clause = this.getWhereClause(metadata.name, field.field, paramName);
                }

                if(clause){
                    qb.orWhere(clause, { [paramName]: searchQuery });
                }
            }
        }))
    }

    addRelationJoin(builder: SelectQueryBuilder<any>, relation: string, metadata: EntityMetadata){

        const relationMeta = metadata.findRelationWithPropertyPath(relation);
        if(!relationMeta){
            throw new PluginError(`Relation "${relation}" in "${metadata.name}" not found`);
        }

        if(!relationMeta.isManyToOne){
            throw new PluginError(`Relation "${relation}" not available for searching, only many to one relations are supported`);
        }

        const joinAliasName = `SearchFilterPluginRelation${relationMeta.inverseEntityMetadata!.name}`;
        addRelationJoin(builder, relationMeta, metadata.name, joinAliasName);

        return joinAliasName;
    }

    getWhereClause(alias: string, field: string, paramName: string){

        const searchMode = this._options.searchMode;
        let searchValue = `CONCAT('%', :${paramName}, '%')`;

        if(searchMode === SearchMode.STARTS){
            searchValue = `CONCAT(:${paramName}, '%')`;
        }
        else if(searchMode === SearchMode.ENDS){
            searchValue = `CONCAT('%', :${paramName})`;
        }

        return `${this.getWhereClauseField(alias, field)} LIKE ${searchValue}`;
    }

    getWhereClauseField(alias: string, field: string){

        return `${alias}.${field}`;
    }

    beforeApplySearch(builder: SelectQueryBuilder<any>, fields: Set<SearchFieldConfig>, searchQuery: string, metadata: EntityMetadata, info: AllResolverInfo<any> | RelationResolverInfo<any>){}
    afterApplySearch(builder: SelectQueryBuilder<any>, fields: Set<SearchFieldConfig>, searchQuery: string, metadata: EntityMetadata, info: AllResolverInfo<any> | RelationResolverInfo<any>){}
}

export class SearchFilterPlugin extends CoreSearchFilterPlugin implements Plugin {

    protected _options: SearchFilterPluginOptions;
    protected _hooks: ISearchFilterPluginHooks | ConstructorType<ISearchFilterPluginHooks>;

    protected _typeFields = new Map<string, Set<SearchFieldConfig>>();

    constructor(options?: SearchFilterPluginOptions){

        super();
        this._options = defaults(options || {}, defaultOptions, coreDefaultOptions, {
            exclude: [],
            include: [],
            relations: []
        });
    }

    hooks(hooks: ISearchFilterPluginHooks | ConstructorType<ISearchFilterPluginHooks>): this {

        this._hooks = hooks;
        return this;
    }

    field(...fieldNames: string[]): this {

        if(!this._options.fields){
            this._options.fields = [];
        }

        fieldNames.forEach(name => this._options.fields.push(name));
        return this;
    }

    relation(relation: string, relationField: string): this {

        this._options.relations.push({ relation, relationField });
        return this;
    }

    exclude(...fieldNames: string[]): this {

        fieldNames.forEach(name => this._options.exclude.push(name));
        return this;
    }

    include(...fieldNames: string[]): this {

        fieldNames.forEach(name => this._options.include.push(name));
        return this;
    }

    searchMode(mode: SearchMode): this {

        this._options.searchMode = mode;
        return this;
    }

    starts(): this {

        this.searchMode(SearchMode.STARTS);
        return this;
    }

    ends(): this {

        this.searchMode(SearchMode.ENDS);
        return this;
    }

    contains(): this {

        this.searchMode(SearchMode.CONTAINS);
        return this;
    }

    beforeBuildField(builder: FieldBuilder, context: BuildContext) {

        super.beforeBuildField(builder, context);

        const info = builder.info();
        if(!info.list){
            return;
        }

        const typeName = info.type.toString();

        let targetObjectType: ObjectTypeBuilder;

        if(!this._options.fields){

            targetObjectType = context.rootSchema.findType(typeName, true) as ObjectTypeBuilder;
            if(!targetObjectType){
                throw new PluginError(`Search target object ${typeName} not found`);
            }

            if(!(targetObjectType instanceof ObjectTypeBuilder)){
                throw new PluginError(`Search target ${typeName} is not an object type`);
            }
        }

        let fieldNames = new Set<string>()

        if(targetObjectType){

            for(let field of targetObjectType.info().fields){

                const fieldInfo = field.info();
                if(!fieldInfo.list && allowedSearchTypes.indexOf(fieldInfo.type) >= 0){
                    fieldNames.add(field.name);
                }
            }
        }
        else if(this._options.fields){
            this._options.fields.forEach(field => fieldNames.add(field));
        }

        if(this._options.include){
            this._options.include.forEach(field => fieldNames.add(field));
        }

        if(this._options.exclude){
            this._options.exclude.forEach(field => fieldNames.delete(field));
        }

        const fieldConfigs: SearchFieldConfig[] = Array.from(fieldNames).map(fieldName => ({ field: fieldName }));
        const typeFields = new Set<SearchFieldConfig>(fieldConfigs);

        if(this._options.relations){
            this._options.relations.forEach(relation => typeFields.add({ relation }));
        }

        this._typeFields.set(typeName, typeFields);
    }

    getAllResolverHooks(): AllResolverBaseHooks<any, any>[] {

        return [this._resolvedHooks];
    }

    getRelationResolverHooks(): RelationResolverBaseHooks<any, any, any>[] {

        return [this._resolvedHooks];
    }

    protected get _resolvedHooks(){

        const hooksOptions: SearchFilterPluginHooksOptions = {
            argumentName: this._options.argumentName,
            searchMode: this._options.searchMode,
            typeFields: this._typeFields
        };

        if(this._hooks){
            return ensureInstantiated(this._hooks, hooksOptions);
        }
        else {
            return new SearchFilterPluginHooks(hooksOptions)
        }
    }
}

export function searchFilterPlugin(options?: SearchFilterPluginHooksOptions): SearchFilterPlugin {

    return new SearchFilterPlugin(options);
}

export default searchFilterPlugin;