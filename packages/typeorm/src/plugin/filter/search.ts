import { defaults, isArray, isString } from 'lodash';

import { GraphQLString } from "graphql";

import { Brackets, SelectQueryBuilder } from "typeorm";
import { EntityMetadata } from "typeorm/metadata/EntityMetadata";

import {
    BuildContext,
    ConstructorType,
    defaultSearchFilterPluginOptions as coreDefaultOptions,
    ensureInstantiated,
    FieldBuilder,
    FieldType,
    FieldBuilderInfo,
    ObjectTypeBuilder,
    OptionalPromise,
    PluginError,
    SearchFilterPlugin as CoreSearchFilterPlugin,
    SearchFilterPluginOptions as CoreSearchFilterPluginOptions
} from "@kiwano/core";

import { addRelationJoin, Plugin } from "../common";
import { AllResolverBaseHooks, AllResolverInfo, RelationResolverBaseHooks, RelationResolverInfo } from "../../resolver";

export const searchPluginOriginalTypeExtensionName = "$searchPluginOriginalType";

export enum SearchMode {
    CONTAINS, STARTS, ENDS, FULL_TEXT
}

export interface ISearchFilterPluginHooks extends AllResolverBaseHooks<any, any>, RelationResolverBaseHooks<any, any> {}

export interface SearchFilterPluginRelationField {
    relation: string
    relationFields: string[]
}

export interface SearchFilterPluginHooksOptions {
    argumentName: string
    typeFields: Map<string, Set<SearchFieldConfig>>
}

export interface SearchFilterPluginOptions extends CoreSearchFilterPluginOptions {
    configs?: SearchFieldConfig[]
    exclude?: string[]
    include?: string[]

}

export interface SearchFieldConfig {
    fields?: string[]
    relation?: SearchFilterPluginRelationField
    options?: SearchFieldOptions
}

export interface SearchFieldOptions {
    mode: SearchMode
    sortRelevance?: boolean
}

export const defaultOptions: SearchFilterPluginOptions = {}

export const allowedSearchTypes: FieldType[] = ['String', GraphQLString];

export class SearchFilterPluginHooks implements ISearchFilterPluginHooks {

    constructor(protected _options: SearchFilterPluginHooksOptions) {}

    $modifyAllQuery(builder: SelectQueryBuilder<any>, info: AllResolverInfo<any>): OptionalPromise {

        const searchQuery = info.args[this._options.argumentName];

        if(searchQuery){

            const entityMetaData = info.options.dataSource.getMetadata(info.options.model);
            const fieldInfo = info.options.fieldInfo;
            const typeName = fieldInfo.extensions.get(searchPluginOriginalTypeExtensionName) || fieldInfo.type;

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

            const metadata = info.options.dataSource.getMetadata(info.options.model);
            const fieldInfo = info.options.fieldInfo;
            const relationMeta = metadata.findRelationWithPropertyPath(relation);
            const entityMetaData = relationMeta.inverseEntityMetadata;

            const typeName = fieldInfo.extensions.get(searchPluginOriginalTypeExtensionName) || fieldInfo.type;
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

        let sorts: string[] = [];

        builder.andWhere(new Brackets(qb => {

            for(let field of fields){

                let clause = null;

                if(field.relation){
                    clause = this.getWhereClause(relationAliasMap.get(field.relation.relation), field.relation.relationFields, paramName, field.options);
                }
                else if(field.fields) {
                    clause = this.getWhereClause(metadata.name, field.fields, paramName, field.options);
                }

                if(clause){

                    qb.orWhere(clause, { [paramName]: searchQuery });

                    if(field.options?.sortRelevance === true && field.options?.mode === SearchMode.FULL_TEXT){
                        sorts.push(clause);
                    }
                }
            }
        }))

        for(let sort of sorts){

            builder.addOrderBy(sort, 'DESC');
            builder.setParameter(paramName, searchQuery);
        }
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

    getWhereClause(alias: string, fields: string[], paramName: string, options?: SearchFieldOptions){

        const searchMode = options?.mode || SearchMode.CONTAINS;

        if(searchMode === SearchMode.FULL_TEXT){

            const fieldMatches = fields.map(field => this.getWhereClauseField(alias, field));

            return `MATCH (${fieldMatches.join(', ')}) AGAINST (:${paramName})`
        }
        else {

            let searchValue = `CONCAT('%', :${paramName}, '%')`;

            if(searchMode === SearchMode.STARTS) {
                searchValue = `CONCAT(:${paramName}, '%')`;
            }
            else if(searchMode === SearchMode.ENDS) {
                searchValue = `CONCAT('%', :${paramName})`;
            }

            let likeFields = null;

            if(fields.length === 1){
                likeFields = this.getWhereClauseField(alias, fields[0]);
            }
            else {

                const leftParts: string[] = [];

                for(let [index, field] of fields.entries()){

                    if(index > 0) {
                        leftParts.push('" "');
                    }

                    leftParts.push(this.getWhereClauseField(alias, field));
                }

                likeFields = `CONCAT(${leftParts.join(', ')})`;
            }

            return `${likeFields} LIKE ${searchValue}`;
        }
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
            include: []
        });
    }

    hooks(hooks: ISearchFilterPluginHooks | ConstructorType<ISearchFilterPluginHooks>): this {

        this._hooks = hooks;
        return this;
    }

    field(fieldNames: string|string[], options?: SearchFieldOptions): this {

        if(!this._options.configs){
            this._options.configs = [];
        }

        const fields = isArray(fieldNames) ? fieldNames : [fieldNames];
        this._options.configs.push({ fields, options });

        return this;
    }

    relation(relation: string, relationFields: string|string[], options?: SearchFieldOptions): this {

        if(!this._options.configs){
            this._options.configs = [];
        }

        const fields: string[] = isArray(relationFields) ? relationFields : [relationFields];

        const relationConfig: SearchFilterPluginRelationField = { relation, relationFields: fields };
        this._options.configs.push({ relation: relationConfig, options });

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

    beforeBuildField(builder: FieldBuilder, context: BuildContext, info: FieldBuilderInfo) {

        super.beforeBuildField(builder, context, info);

        if(!info.list){
            return;
        }

        const typeName = info.type.toString();

        let targetObjectType: ObjectTypeBuilder;

        if(!this._options.configs){

            targetObjectType = context.rootSchema.findType(typeName, true) as ObjectTypeBuilder;
            if(!targetObjectType){
                throw new PluginError(`Search target object ${typeName} not found`);
            }

            if(!(targetObjectType instanceof ObjectTypeBuilder)){
                throw new PluginError(`Search target ${typeName} is not an object type`);
            }
        }

        let configs: SearchFieldConfig[] = [...(this._options.configs || [])];

        if(targetObjectType){

            for(let field of targetObjectType.info().fields){

                const fieldInfo = field.info();
                if(!fieldInfo.list && allowedSearchTypes.indexOf(fieldInfo.type) >= 0){
                    configs.push({ fields: [field.name] });
                }
            }
        }

        if(this._options.include){
            this._options.include.forEach(field => configs.push({ fields: [field] }));
        }

        if(this._options.exclude){
            configs = configs.filter(conf => !conf.fields?.some(field => this._options.exclude.includes(field)));
        }

        const typeFields = new Set<SearchFieldConfig>(configs);
        this._typeFields.set(typeName, typeFields);

        builder.extension(searchPluginOriginalTypeExtensionName, typeName);
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