import { SelectQueryBuilder } from "typeorm";
import { EntityMetadata } from "typeorm/metadata/EntityMetadata";

import defaults from "lodash/defaults";

import {
    BuildContext,
    camelize,
    ConstructorType,
    defaultSortPluginOptions as coreDefaultOptions,
    ensureInstantiated,
    ObjectTypeBuilder,
    OptionalPromise,
    PluginError,
    SortConfiguration,
    SortPlugin as CoreSortPlugin,
    SortPluginOptions as CoreSortPluginOptions
} from "@kiwano/core";

import { addRelationJoin, Plugin } from "../common";
import { AllResolverBaseHooks, AllResolverInfo, RelationResolverBaseHooks, RelationResolverInfo } from "../../resolver";

export interface ISortPluginHooks extends AllResolverBaseHooks<any, any>, RelationResolverBaseHooks<any, any> {}

export interface SortPluginHooksOptions {
    argumentName: string,
    relations: SortPluginRelationField[]
}

export interface SortPluginRelationField {
    relation: string
    relationField: string
    name: string
}

export interface SortPluginOptions extends CoreSortPluginOptions {
    relations?: SortPluginRelationField[]
}

export class SortPluginHooks implements ISortPluginHooks {

    constructor(protected _options: SortPluginHooksOptions) {}

    $modifyAllQuery(builder: SelectQueryBuilder<any>, info: AllResolverInfo<any>): OptionalPromise {

        const sort = info.args[this._options.argumentName] as SortConfiguration<any>

        if(sort){

            const entityMetaData = info.options.connection.getMetadata(info.options.model);

            this.beforeApplySort(builder, sort, entityMetaData, info);
            this.applySort(builder, sort, entityMetaData, info);
            this.afterApplySort(builder, sort, entityMetaData, info);
        }
    }

    $modifyRelationManyQuery(relation: string, builder: SelectQueryBuilder<object>, info: RelationResolverInfo<any>): OptionalPromise {

        const sort = info.args[this._options.argumentName] as SortConfiguration<any>

        if(sort){

            const metadata = info.options.connection.getMetadata(info.options.model);
            const relationMeta = metadata.findRelationWithPropertyPath(relation);
            const entityMetaData = relationMeta.inverseEntityMetadata;

            this.beforeApplySort(builder, sort, entityMetaData, info);
            this.applySort(builder, sort, entityMetaData, info);
            this.afterApplySort(builder, sort, entityMetaData, info);
        }
    }

    applySort(builder: SelectQueryBuilder<any>, config: SortConfiguration<any>, metadata: EntityMetadata, info: AllResolverInfo<any> | RelationResolverInfo<any>){

        const relationConfig = this._options.relations.find(relation => relation.name === config.field);

        if(relationConfig){
            this.applyRelationSort(builder, config, relationConfig, metadata);
        }
        else {
            this.applyFieldSort(builder, config, metadata);
        }
    }

    applyFieldSort(builder: SelectQueryBuilder<any>, config: SortConfiguration<any>, metadata: EntityMetadata){

        builder.addOrderBy(`${metadata.name}.${config.field}`, config.direction);
    }

    applyRelationSort(builder: SelectQueryBuilder<any>, config: SortConfiguration<any>, relationConfig: SortPluginRelationField, metadata: EntityMetadata){

        const relationMeta = metadata.findRelationWithPropertyPath(relationConfig.relation);
        if(!relationMeta){
            throw new PluginError(`Relation "${relationConfig.relation}" in "${metadata.name}" not found`);
        }

        if(!relationMeta.isManyToOne){
            throw new PluginError(`Relation "${relationConfig.relation}" not available for sorting, only many to one relations are supported`);
        }

        const joinAliasName = `SortPluginRelation${relationMeta.inverseEntityMetadata!.name}`;
        addRelationJoin(builder, relationMeta, metadata.name, joinAliasName);

        builder.addOrderBy(`${joinAliasName}.${relationConfig.relationField}`, config.direction);
    }

    beforeApplySort(builder: SelectQueryBuilder<any>, config: SortConfiguration<any>, metadata: EntityMetadata, info: AllResolverInfo<any> | RelationResolverInfo<any>){}
    afterApplySort(builder: SelectQueryBuilder<any>, config: SortConfiguration<any>, metadata: EntityMetadata, info: AllResolverInfo<any> | RelationResolverInfo<any>){}
}

export class SortPlugin extends CoreSortPlugin implements Plugin {

    protected _options: SortPluginOptions;

    protected _hooks: ISortPluginHooks | ConstructorType<ISortPluginHooks>;

    constructor(options?: SortPluginOptions){

        super();
        this._options = defaults(options || {}, coreDefaultOptions, {
            exclude: [],
            include: [],
            relations: []
        });
    }

    relation(relation: string, relationField: string): this;
    relation(relation: string, relationField: string, name: string);
    relation(relation: string, relationField: string, name: string = null): this {

        this._options.relations.push({
            relation, relationField,
            name: name || camelize(`${relation} ${relationField}`)
        });

        return this;
    }

    hooks(hooks: ISortPluginHooks | ConstructorType<ISortPluginHooks>): this {

        this._hooks = hooks;
        return this;
    }

    getAllResolverHooks(): AllResolverBaseHooks<any, any>[] {

        return [this._resolvedHooks];
    }

    getRelationResolverHooks(): RelationResolverBaseHooks<any, any, any>[] {

        return [this._resolvedHooks];
    }

    protected get _resolvedHooks(){

        const hooksOptions: SortPluginHooksOptions = {
            argumentName: this._options.argumentName,
            relations: this._options.relations
        };

        if(this._hooks){
            return ensureInstantiated(this._hooks, hooksOptions);
        }
        else {
            return new SortPluginHooks(hooksOptions)
        }
    }

    protected _getExtraEnumValues(context: BuildContext, name: string, typeName: string, targetObjectType?: ObjectTypeBuilder): Set<string> {

        if(this._options.relations){
            return new Set<string>(this._options.relations.map(relation => relation.name));
        }

        return null;
    }
}

export function sortPlugin(options?: SortPluginOptions): SortPlugin {

    return new SortPlugin(options);
}

export default sortPlugin;