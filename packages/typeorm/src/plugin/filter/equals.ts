import { Brackets, SelectQueryBuilder } from "typeorm";
import { EntityMetadata } from "typeorm/metadata/EntityMetadata";

import isArray from 'lodash/isArray'
import defaults from "lodash/defaults";
import isString from "lodash/isString";

import {
    BuildContext,
    camelize,
    ConstructorType,
    defaultEqualsFilterPluginOptions as coreDefaultOptions,
    ensureInstantiated,
    EqualsFilterPlugin as CoreEqualsFilterPlugin,
    EqualsFilterPluginFieldConfig,
    EqualsFilterPluginOptions as CoreEqualsFilterPluginOptions,
    InputFieldType,
    isTypeInput,
    ObjectTypeBuilder,
    OptionalPromise,
    PluginError
} from "@kiwano/core";

import { addRelationJoin, Plugin } from "../common";
import { AllResolverBaseHooks, AllResolverInfo, RelationResolverBaseHooks, RelationResolverInfo } from "../../resolver";

export interface IEqualsFilterPluginHooks extends AllResolverBaseHooks<any, any>, RelationResolverBaseHooks<any, any> {}

export interface EqualsFilterPluginRelationField {
    relation: string
    relationField: string
    name: string
}

export interface EqualsFilterPluginHooksOptions {
    argumentName: string
    relations: EqualsFilterPluginRelationField[]
}

export interface EqualsFilterPluginOptions extends CoreEqualsFilterPluginOptions {
    relations?: EqualsFilterPluginRelationField[]
}

export interface FilterFieldConfig<ValueType> {
    key: string
    value: ValueType
    relation?: EqualsFilterPluginRelationField
}

export class EqualsFilterPluginHooks implements IEqualsFilterPluginHooks {

    constructor(protected _options: EqualsFilterPluginHooksOptions) {}

    $modifyAllQuery(builder: SelectQueryBuilder<any>, info: AllResolverInfo<any>): OptionalPromise {

        const filter = info.args[this._options.argumentName];

        if(filter){

            const entityMetaData = info.options.connection.getMetadata(info.options.model);

            this.beforeApplyFilter(builder, filter, entityMetaData, info);
            this.applyFilter(builder, filter, entityMetaData, info);
            this.afterApplyFilter(builder, filter, entityMetaData, info);
        }
    }

    $modifyRelationManyQuery(relation: string, builder: SelectQueryBuilder<object>, info: RelationResolverInfo<any>): OptionalPromise {

        const filter = info.args[this._options.argumentName];

        if(filter){

            const metadata = info.options.connection.getMetadata(info.options.model);
            const relationMeta = metadata.findRelationWithPropertyPath(relation);
            const entityMetaData = relationMeta.inverseEntityMetadata;

            this.beforeApplyFilter(builder, filter, entityMetaData, info);
            this.applyFilter(builder, filter, entityMetaData, info);
            this.afterApplyFilter(builder, filter, entityMetaData, info);
        }
    }

    applyFilter(builder: SelectQueryBuilder<any>, filter: object, metadata: EntityMetadata, info: AllResolverInfo<any> | RelationResolverInfo<any>){

        for(let key of Object.keys(filter)){

            const value = filter[key];

            if(value !== null){

                const relationConfig = this._options.relations.find(relation => relation.name === key);
                const filterConfig: FilterFieldConfig<any | any[]> = { key, value, relation: relationConfig || null }

                this.addCondition(builder, filterConfig, filter, metadata);
            }
        }
    }

    addCondition(builder: SelectQueryBuilder<any>, config: FilterFieldConfig<any | any[]>, filter: object, metadata: EntityMetadata){

        if(isArray(config.value)){

            if(config.value){
                this.addMultiCondition(builder, config, filter, metadata);
            }
        }
        else {
            this.addSingleCondition(builder, config, filter, metadata);
        }
    }

    addSingleCondition(builder: SelectQueryBuilder<any>, config: FilterFieldConfig<any>, filter: object, metadata: EntityMetadata){

        const paramName = `filterValue_${config.key}`;
        let whereClause = null;

        if(config.relation){

            const joinAlias = this.addRelationJoin(builder, config.relation, metadata);
            whereClause = this.getWhereClause(joinAlias, config.relation.relationField, paramName);
        }
        else {
            whereClause = this.getWhereClause(metadata.name, config.key, paramName);
        }

        builder.andWhere(whereClause, { [paramName]: config.value });
    }

    addMultiCondition(builder: SelectQueryBuilder<any>, config: FilterFieldConfig<any[]>, filter: object, metadata: EntityMetadata){

        let joinAlias = null;

        if(config.relation){
            joinAlias = this.addRelationJoin(builder, config.relation, metadata);
        }

        builder.andWhere(new Brackets((qb => {

            let valueCounter = 1;

            for(let value of config.value){

                const paramName = `filterValue_${config.key}_${valueCounter}`;
                let whereClause = null;

                if(config.relation){
                    whereClause = this.getWhereClause(joinAlias, config.relation.relationField, paramName);
                }
                else {
                    whereClause = this.getWhereClause(metadata.name, config.key, paramName);
                }

                qb.orWhere(whereClause, { [paramName]: value });

                valueCounter++
            }
        })));
    }

    addRelationJoin(builder: SelectQueryBuilder<any>, relationConfig: EqualsFilterPluginRelationField, metadata: EntityMetadata){

        const relationMeta = metadata.findRelationWithPropertyPath(relationConfig.relation);
        if(!relationMeta){
            throw new PluginError(`Relation "${relationConfig.relation}" in "${metadata.name}" not found`);
        }

        if(!relationMeta.isManyToOne){
            throw new PluginError(`Relation "${relationConfig.relation}" not available for filtering, only many to one relations are supported`);
        }

        const joinAliasName = `EqualsFilterPluginRelation${relationMeta.inverseEntityMetadata!.name}`;
        addRelationJoin(builder, relationMeta, metadata.name, joinAliasName);

        return joinAliasName;
    }

    getWhereClause(alias: string, field: string, paramName: string){

        return `${alias}.${field} = :${paramName}`;
    }

    beforeApplyFilter(builder: SelectQueryBuilder<any>, filter: object, metadata: EntityMetadata, info: AllResolverInfo<any> | RelationResolverInfo<any>){}
    afterApplyFilter(builder: SelectQueryBuilder<any>, filter: object, metadata: EntityMetadata, info: AllResolverInfo<any> | RelationResolverInfo<any>){}
}

export class EqualsFilterPlugin extends CoreEqualsFilterPlugin implements Plugin {

    protected _options: EqualsFilterPluginOptions;

    protected _hooks: IEqualsFilterPluginHooks | ConstructorType<IEqualsFilterPluginHooks>;

    constructor(options?: EqualsFilterPluginOptions){

        super();
        this._options = defaults(options || {}, coreDefaultOptions, {
            exclude: [],
            include: [],
            relations: []
        });
    }

    hooks(hooks: IEqualsFilterPluginHooks | ConstructorType<IEqualsFilterPluginHooks>): this {

        this._hooks = hooks;
        return this;
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

    getAllResolverHooks(): AllResolverBaseHooks<any, any>[] {

        return [this._resolvedHooks];
    }

    getRelationResolverHooks(): RelationResolverBaseHooks<any, any, any>[] {

        return [this._resolvedHooks];
    }

    protected get _resolvedHooks(){

        const hooksOptions: EqualsFilterPluginHooksOptions = {
            argumentName: this._options.argumentName,
            relations: this._options.relations
        };

        if(this._hooks){
            return ensureInstantiated(this._hooks, hooksOptions);
        }
        else {
            return new EqualsFilterPluginHooks(hooksOptions)
        }
    }

    protected _getExtraFieldConfigs(context: BuildContext, name: string, targetObjectType?: ObjectTypeBuilder): Set<EqualsFilterPluginFieldConfig> {

        const fields = new Set<EqualsFilterPluginFieldConfig>();

        if(this._options.relations && targetObjectType){

            const targetInfo = targetObjectType.info();

            for(let relation of this._options.relations){

                const relationField = targetInfo.fields.find(field => field.name === relation.relation);
                if(!relationField){
                    throw new PluginError(`Relation "${relation.relation}" in "${targetInfo.name}" not found`);
                }

                const relationTypeName = relationField.info().type;
                if(!isString(relationTypeName)){
                    throw new PluginError(`Relation "${relation.relation}" in "${targetInfo.name}" has unsupported type`);
                }

                const relationType = context.rootSchema.findType(relationTypeName, true) as ObjectTypeBuilder;
                if(!relationType){
                    throw new PluginError(`Object type "${relationTypeName}" has not found`);
                }

                const relationFieldType = relationType.info().fields.find(field => field.name === relation.relationField);
                if(!relationFieldType){
                    throw new PluginError(`Field "${relation.relationField}" in "${relationTypeName}" not found`);
                }

                const relationFieldTypeName = relationFieldType.info().type;
                if(!isTypeInput(relationFieldTypeName, context.rootSchema)){
                    throw new PluginError(`Field "${relation.relationField}" in relation "${relation.relation}" has unsupported type`);
                }

                fields.add({
                    name: relation.name,
                    type: relationFieldTypeName as InputFieldType
                });
            }
        }

        return fields;
    }
}

export function equalsFilterPlugin(options?: EqualsFilterPluginHooksOptions): EqualsFilterPlugin {

    return new EqualsFilterPlugin(options);
}

export default equalsFilterPlugin;