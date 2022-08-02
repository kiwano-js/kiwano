import { defaults, isEqual, isNil, mapValues, pick } from "lodash";

import { AbstractSchemaBuilder, ConstructorType, ensureInstantiated, PluginError } from "@kiwano/core";

import {
    Between,
    EntityManager,
    IsNull,
    MoreThan,
    MoreThanOrEqual,
    Not,
    Repository,
    SelectQueryBuilder
} from "typeorm";
import { ObjectLiteral } from "typeorm/common/ObjectLiteral";

import { Plugin } from "../common";
import {
    AllResolverBaseHooks, AllResolverInfo,
    CreateResolverBaseHooks, CreateResolverInfo,
    DeleteResolverBaseHooks, DeleteResolverInfo,
    UpdateResolverBaseHooks, UpdateResolverInfo
} from "../../resolver";

export interface ISortIndexPluginHooks extends AllResolverBaseHooks<any, any>, CreateResolverBaseHooks<any, any>, UpdateResolverBaseHooks<any, any>, DeleteResolverBaseHooks<any, any> {}

export interface SortIndexPluginOptions {
    sortField?: string
    idField?: string
    groupFields?: string[]
}

export interface SortIndexPluginHooksOptions {
    sortField: string
    idField: string
    groupFields: string[]
}

export interface SortIndexPluginMoveOptions {
    id: number
    oldIndex?: number
    newIndex?: number
    conditions?: ObjectLiteral
}

export const defaultSortIndexPluginOptions: SortIndexPluginOptions = {
    sortField: 'sortIndex',
    idField: 'id'
}

export class SortIndexPluginHooks implements ISortIndexPluginHooks {

    constructor(protected _options: SortIndexPluginHooksOptions) {}

    $modifyAllQuery(builder: SelectQueryBuilder<any>, info: AllResolverInfo<any>, extra?: any) {

        builder.orderBy(this._options.sortField);
    }

    async $beforeInsertModel(entityManager: EntityManager, info: CreateResolverInfo<any>) {

        const input = info.input;

        const { sortField, groupFields } = this._options;

        if(isNil(input[sortField])){

            const repository = info.options.dataSource.getRepository(info.options.model);
            let conditions = null;

            if(groupFields?.length){

                conditions = {};

                for(let field of groupFields){
                    conditions[field] = !isNil(input[field]) ? input[field] : null;
                }
            }

            input[sortField] = await this.getNextSortIndex(repository, conditions);
        }
    }

    async $afterInsertModel(model: any, entityManager: EntityManager, info: CreateResolverInfo<any>) {

        const { sortField, idField } = this._options;
        const repository = entityManager.getRepository(info.options.model);

        await this.moveSortIndex(repository, {
            id: model[idField],
            newIndex: model[sortField],
            conditions: this.getModelConditions(model)
        });
    }

    async $afterUpdateModel(model: any, originalModel: any, entityManager: EntityManager, info: UpdateResolverInfo<any>) {

        const { sortField, idField, groupFields } = this._options;
        const repository = entityManager.getRepository(info.options.model);

        const oldGroupConditions = this.getModelConditions(originalModel);
        const newGroupConditions = this.getModelConditions(model);

        let groupingChanged = false;

        if(groupFields?.length){
            groupingChanged = !isEqual(oldGroupConditions, newGroupConditions);
        }

        if(groupingChanged){

            await this.moveSortIndex(repository, {
                id: model[idField],
                newIndex: model[sortField],
                conditions: newGroupConditions
            });

            await this.moveSortIndex(repository, {
                id: model[idField],
                oldIndex: originalModel[sortField],
                conditions: oldGroupConditions
            });
        }
        else if(model[sortField] != originalModel[sortField]){

            await this.moveSortIndex(repository, {
                id: model[idField],
                oldIndex: originalModel[sortField],
                newIndex: model[sortField],
                conditions: newGroupConditions
            });
        }
    }

    async $afterDeleteModel(model: any, entityManager: EntityManager, info: DeleteResolverInfo<any>) {

        const { sortField, idField } = this._options;
        const repository = entityManager.getRepository(info.options.model);

        await this.moveSortIndex(repository, {
            id: model[idField],
            oldIndex: model[sortField],
            conditions: this.getModelConditions(model)
        });
    }

    getModelConditions(model: any): ObjectLiteral {

        return this._options.groupFields?.length ? pick(model, this._options.groupFields) : null;
    }

    async getLatestSortIndex(repository: Repository<any>, conditions?: ObjectLiteral): Promise<number> {

        const { sortField } = this._options;
        const sortColumn = repository.metadata.findColumnWithPropertyName(sortField);
        if(!sortColumn){
            throw new PluginError(`Sort field "${sortField}" not found in "${repository.metadata.name}"`);
        }

        const query = repository
            .createQueryBuilder('model')
            .select(`MAX(model.${sortColumn.databaseName})`, 'max');

        if(conditions){

            const fixedConditions = mapValues(conditions, val => isNil(val) ? IsNull() : val);
            query.where(fixedConditions);
        }

        const result = await query.getRawOne();
        return result.max;
    }

    async getNextSortIndex(repository: Repository<any>, conditions?: ObjectLiteral): Promise<number> {

        const latestSortIndex = await this.getLatestSortIndex(repository, conditions);
        return (latestSortIndex || 0) + 1;
    }

    async moveSortIndex(repository: Repository<any>, options: SortIndexPluginMoveOptions): Promise<void> {

        let { newIndex, oldIndex, conditions } = options;
        const { sortField, idField } = this._options;

        const latestSortIndex = await this.getLatestSortIndex(repository, conditions);

        if(!isNil(newIndex)){

            newIndex = Math.max(newIndex, 1);
            newIndex = Math.min(newIndex, (latestSortIndex || 1));
        }

        if(newIndex == oldIndex){
            return;
        }

        const sortColumn = repository.metadata.findColumnWithPropertyName(sortField);
        if(!sortColumn){
            throw new PluginError(`Sort field "${sortField}" not found in "${repository.metadata.name}"`);
        }

        let operator = null;
        let sortCondition = null

        if(!isNil(newIndex) && !isNil(oldIndex)){

            operator = newIndex < oldIndex ? '+' : '-';
            sortCondition = Between(Math.min(newIndex, oldIndex), Math.max(newIndex, oldIndex))
        }
        else if(!isNil(newIndex)){

            operator = '+';
            sortCondition = MoreThanOrEqual(newIndex);
        }
        else if(!isNil(oldIndex)){

            operator = '-';
            sortCondition = MoreThan(oldIndex);
        }

        if(!operator || !sortCondition){
            return;
        }

        const query = repository
            .createQueryBuilder()
            .update()
            .set({
                [sortField]: () => `${sortColumn.databaseName} ${operator} 1`
            })
            .where({
                [sortField]: sortCondition,
                [idField]: Not(options.id)
            });

        if(conditions){

            const fixedConditions = mapValues(conditions, val => isNil(val) ? IsNull() : val);
            query.andWhere(fixedConditions);
        }

        await query.execute();
    }
}

export class SortIndexPlugin implements Plugin {

    protected _options: SortIndexPluginOptions;

    protected _hooks: ISortIndexPluginHooks | ConstructorType<ISortIndexPluginHooks>;

    constructor(options?: SortIndexPluginOptions){

        this._options = defaults(options || {}, defaultSortIndexPluginOptions, {
            groupFields: []
        });
    }

    beforeBuildSchema(builder: AbstractSchemaBuilder<any>): any {
        // Empty function to conform to Plugin interface
    }

    sortField(fieldName: string): this {

        this._options.sortField = fieldName;
        return this;
    }

    idField(fieldName: string): this {

        this._options.idField = fieldName;
        return this;
    }

    groupBy(...fieldNames: string[]): this {

        fieldNames.forEach(name => this._options.groupFields.push(name));
        return this;
    }

    hooks(hooks: ISortIndexPluginHooks | ConstructorType<ISortIndexPluginHooks>): this {

        this._hooks = hooks;
        return this;
    }

    getAllResolverHooks(): AllResolverBaseHooks<any, any>[] {

        return [this._resolvedHooks];
    }

    getCreateResolverHooks(): CreateResolverBaseHooks<any, any>[] {

        return [this._resolvedHooks];
    }

    getUpdateResolverHooks(): UpdateResolverBaseHooks<any, any>[] {

        return [this._resolvedHooks];
    }

    getDeleteResolverHooks(): DeleteResolverBaseHooks<any, any>[] {

        return [this._resolvedHooks];
    }

    protected get _resolvedHooks(){

        const hooksOptions: SortIndexPluginHooksOptions = {
            sortField: this._options.sortField,
            idField: this._options.idField,
            groupFields: this._options.groupFields || []
        };

        if(this._hooks){
            return ensureInstantiated(this._hooks, hooksOptions);
        }
        else {
            return new SortIndexPluginHooks(hooksOptions)
        }
    }
}

export function sortIndexPlugin(options?: SortIndexPluginOptions): SortIndexPlugin {

    return new SortIndexPlugin(options);
}

export default sortIndexPlugin;