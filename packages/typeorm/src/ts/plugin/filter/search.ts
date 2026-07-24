import { defaults, isArray, isString } from 'es-toolkit/compat';

import { GraphQLString } from "graphql";

import { Brackets, type SelectQueryBuilder, type EntityMetadata } from "typeorm";

import {
    type BuildContext,
    type ConstructorType,
    defaultSearchFilterPluginOptions as coreDefaultOptions,
    ensureInstantiated,
    type FieldBuilder,
    type FieldType,
    type FieldBuilderInfo,
    ObjectTypeBuilder,
    type OptionalPromise,
    PluginError,
    SearchFilterPlugin as CoreSearchFilterPlugin,
    type SearchFilterPluginOptions as CoreSearchFilterPluginOptions
} from "@kiwano/core";

import { addRelationJoin, type Plugin } from "../common";
import type { AllResolverBaseHooks, AllResolverInfo, RelationResolverBaseHooks, RelationResolverInfo } from "../../resolver";
import { getDatabaseType } from "../../util";

export const searchPluginOriginalTypeExtensionName = "$searchPluginOriginalType";

export enum SearchMode {
    CONTAINS = 0, STARTS = 1, ENDS = 2,

    /**
     * @deprecated Use `fullText` in options instead
     */
    FULL_TEXT = 3
}

export enum SearchFullTextModifier {
    BOOLEAN = 0, NATURAL_LANGUAGE = 1
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
    mode?: SearchMode
    fullText?: boolean
    maxSearchTerms?: number
    modifier?: SearchFullTextModifier
    sortRelevance?: boolean
    sortLength?: boolean
}

export const defaultOptions: SearchFilterPluginOptions = {}

export const allowedSearchTypes: FieldType[] = ['String', GraphQLString];

export const defaultMaxSearchTerms = 10;

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

        const paramNameBase = 'searchQuery';
        const searchTerms = this.getSearchTerms(searchQuery);
        if(!searchTerms.length){
            return;
        }

        const relations = new Set(
            Array.from(fields)
                 .filter(field => !!field.relation)
                 .map(field => field.relation.relation)
        );

        const relationAliasMap = new Map<string, string>();

        // Add joins
        for(const relation of relations){

            const alias = this.addRelationJoin(builder, relation, metadata);
            relationAliasMap.set(relation, alias);
        }

        let sorts: { clause: string, paramName?: string, paramValue?: string, direction: 'ASC' | 'DESC' }[] = [];
        let fieldIndex = 1;

        builder.andWhere(new Brackets(qb => {

            for(const field of fields){

                const resolvedField = this.resolveField(field, metadata, relationAliasMap);
                if(!resolvedField){
                    continue;
                }

                const useFullText = this.shouldUseFullText(field.options, info);

                if(useFullText){

                    const paramName = `${paramNameBase}FullText${fieldIndex}`;
                    const fieldSearchQuery = this.modifySearchQuery(searchQuery, field, metadata, info);
                    const clause = this.getWhereClause(resolvedField.alias, resolvedField.fields, paramName, field.options, info, true);

                    qb.orWhere(clause, { [paramName]: fieldSearchQuery });

                    if(field.options?.sortRelevance === true){

                        const sortClause = this.getFullTextRelevanceClause(resolvedField.alias, resolvedField.fields, paramName, field.options, info);
                        if(sortClause){
                            sorts.push({ clause: sortClause, paramName, paramValue: fieldSearchQuery, direction: 'DESC' });
                        }
                    }
                }
                else {

                    const fieldSearchTerms = this.getSearchTerms(searchQuery, field.options);

                    qb.orWhere(new Brackets(termQb => {

                        let termIndex = 1;

                        for(const term of fieldSearchTerms){

                            const paramName = `${paramNameBase}${fieldIndex}_${termIndex}`;
                            const clause = this.getWhereClause(resolvedField.alias, resolvedField.fields, paramName, field.options, info);
                            const fieldSearchQuery = this.getLikeSearchQuery(term, field.options);

                            termQb.andWhere(clause, { [paramName]: fieldSearchQuery });
                            termIndex++;
                        }
                    }));
                }

                if(field.options?.sortLength === true){

                    const concatFields = this.getFieldsConcat(resolvedField.alias, resolvedField.fields, info)
                    sorts.push({ clause: `LENGTH(${concatFields})`, direction: 'ASC' });
                }

                fieldIndex++;
            }
        }))

        for(const sort of sorts){

            builder.addOrderBy(sort.clause, sort.direction);

            if(sort.paramName) {
                builder.setParameter(sort.paramName, sort.paramValue);
            }
        }
    }

    resolveField(field: SearchFieldConfig, metadata: EntityMetadata, relationAliasMap: Map<string, string>): { alias: string, fields: string[] } {

        if(field.relation){

            return {
                alias: relationAliasMap.get(field.relation.relation),
                fields: field.relation.relationFields
            };
        }
        else if(field.fields) {

            return {
                alias: metadata.name,
                fields: field.fields
            };
        }
    }

    getSearchTerms(searchQuery: string, options?: SearchFieldOptions): string[] {

        if(!searchQuery){
            return [];
        }

        const terms = searchQuery
            .split(/[^\p{L}\p{N}]+/u)
            .map(term => term.trim())
            .filter(term => !!term)
            .slice(0, this.getMaxSearchTerms(options));

        return Array.from(new Set(terms));
    }

    getMaxSearchTerms(options?: SearchFieldOptions): number {

        const configuredMaxSearchTerms = Math.floor(options?.maxSearchTerms);
        if(Number.isFinite(configuredMaxSearchTerms) && configuredMaxSearchTerms > 0){
            return configuredMaxSearchTerms;
        }

        return defaultMaxSearchTerms;
    }

    modifySearchQuery(searchQuery: string, field: SearchFieldConfig, metadata: EntityMetadata, info: AllResolverInfo<any> | RelationResolverInfo<any>){

        const isFullText = this.isOptionsFullText(field.options);
        const mode = field.options?.mode;

        if(isFullText && field.options?.modifier === SearchFullTextModifier.BOOLEAN && ['mysql', 'mariadb'].includes(this.getDatabaseType(info))){

            const terms = this.getSearchTerms(searchQuery, field.options);

            if(mode === SearchMode.STARTS){

                return terms.map(word => `+${word}*`).join(' ');
            }
            else {

                return terms.map(word => `+${word}`).join(' ');
            }
        }

        if(isFullText){
            return this.getSearchTerms(searchQuery, field.options).join(' ');
        }

        return searchQuery;
    }

    isOptionsFullText(options: SearchFieldOptions){

        return options?.mode === SearchMode.FULL_TEXT || options?.fullText == true;
    }

    shouldUseFullText(options: SearchFieldOptions, info: AllResolverInfo<any> | RelationResolverInfo<any>): boolean {

        return this.isOptionsFullText(options) && this.supportsFullText(info);
    }

    supportsFullText(info: AllResolverInfo<any> | RelationResolverInfo<any>): boolean {

        return ['mysql', 'mariadb', 'postgres'].includes(this.getDatabaseType(info));
    }

    getDatabaseType(info: AllResolverInfo<any> | RelationResolverInfo<any>): string {

        return getDatabaseType(info.options.dataSource);
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

    getWhereClause(alias: string, fields: string[], paramName: string, options?: SearchFieldOptions, info?: AllResolverInfo<any> | RelationResolverInfo<any>, forceFullText = false){

        const fullTextMode = forceFullText || (info ? this.shouldUseFullText(options, info) : this.isOptionsFullText(options));

        if(fullTextMode){

            return this.getFullTextWhereClause(alias, fields, paramName, options, info);
        }
        else {

            const fieldClauses = fields.map(field => `LOWER(${this.getWhereClauseField(alias, field)}) LIKE LOWER(:${paramName}) ESCAPE '\\\\'`);
            return `(${fieldClauses.join(' OR ')})`;
        }
    }

    getFullTextWhereClause(alias: string, fields: string[], paramName: string, options?: SearchFieldOptions, info?: AllResolverInfo<any> | RelationResolverInfo<any>){

        const databaseType = info ? this.getDatabaseType(info) : 'mysql';
        const fieldMatches = fields.map(field => this.getWhereClauseField(alias, field));

        if(databaseType === 'postgres'){

            const document = this.getPostgresTextSearchDocument(alias, fields);
            return `to_tsvector('simple', ${document}) @@ plainto_tsquery('simple', :${paramName})`;
        }

        const againstValue = this.getMysqlAgainstValue(paramName, options);
        return `MATCH (${fieldMatches.join(', ')}) AGAINST (${againstValue})`
    }

    getFullTextRelevanceClause(alias: string, fields: string[], paramName: string, options?: SearchFieldOptions, info?: AllResolverInfo<any> | RelationResolverInfo<any>): string {

        const databaseType = info ? this.getDatabaseType(info) : 'mysql';

        if(databaseType === 'postgres'){

            const document = this.getPostgresTextSearchDocument(alias, fields);
            return `ts_rank_cd(to_tsvector('simple', ${document}), plainto_tsquery('simple', :${paramName}))`;
        }

        const fieldMatches = fields.map(field => this.getWhereClauseField(alias, field));
        return `MATCH (${fieldMatches.join(', ')}) AGAINST (${this.getMysqlAgainstValue(paramName, options)})`;
    }

    getMysqlAgainstValue(paramName: string, options?: SearchFieldOptions): string {

        const modifier = options?.modifier;

        if(modifier === SearchFullTextModifier.BOOLEAN){
            return `:${paramName} IN BOOLEAN MODE`;
        }
        else if(modifier === SearchFullTextModifier.NATURAL_LANGUAGE){
            return `:${paramName} IN NATURAL LANGUAGE MODE`;
        }

        return `:${paramName}`;
    }

    getLikeSearchQuery(searchQuery: string, options?: SearchFieldOptions): string {

        const escapedSearchQuery = this.escapeLikeSearchQuery(searchQuery);
        const searchMode = options?.mode || SearchMode.CONTAINS;

        if(searchMode === SearchMode.STARTS){
            return `${escapedSearchQuery}%`;
        }
        else if(searchMode === SearchMode.ENDS){
            return `%${escapedSearchQuery}`;
        }

        return `%${escapedSearchQuery}%`;
    }

    escapeLikeSearchQuery(searchQuery: string): string {

        return searchQuery.replace(/[\\%_]/g, value => `\\${value}`);
    }

    getWhereClauseField(alias: string, field: string){

        return `${alias}.${field}`;
    }

    getFieldsConcat(alias: string, fieldNames: string[], info?: AllResolverInfo<any> | RelationResolverInfo<any>): string {

        let concatFields: string = null;

        if(fieldNames.length === 1){
            concatFields = this.getWhereClauseField(alias, fieldNames[0]);
        }
        else {

            const leftParts: string[] = [];

            for(let [index, field] of fieldNames.entries()){

                if(index > 0) {
                    leftParts.push("' '");
                }

                leftParts.push(`COALESCE(${this.getWhereClauseField(alias, field)}, '')`);
            }

            if(info && this.getDatabaseType(info) === 'sqlite'){
                concatFields = leftParts.join(' || ');
            }
            else {
                concatFields = `CONCAT(${leftParts.join(', ')})`;
            }
        }

        return concatFields;
    }

    getPostgresTextSearchDocument(alias: string, fieldNames: string[]): string {

        return fieldNames
            .map(field => `COALESCE(${this.getWhereClauseField(alias, field)}, '')`)
            .join(" || ' ' || ");
    }

    beforeApplySearch(builder: SelectQueryBuilder<any>, fields: Set<SearchFieldConfig>, searchQuery: string, metadata: EntityMetadata, info: AllResolverInfo<any> | RelationResolverInfo<any>){}
    afterApplySearch(builder: SelectQueryBuilder<any>, fields: Set<SearchFieldConfig>, searchQuery: string, metadata: EntityMetadata, info: AllResolverInfo<any> | RelationResolverInfo<any>){}
}

export class SearchFilterPlugin extends CoreSearchFilterPlugin implements Plugin {

    declare protected _options: SearchFilterPluginOptions;
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

    override beforeBuildField(builder: FieldBuilder, context: BuildContext, info: FieldBuilderInfo) {

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

            for(const field of targetObjectType.info().fields){

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

export function searchFilterPlugin(options?: SearchFilterPluginOptions): SearchFilterPlugin {

    return new SearchFilterPlugin(options);
}

export default searchFilterPlugin;
