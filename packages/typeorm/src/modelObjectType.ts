import { flatten, isString } from 'lodash'

import { DataSource } from "typeorm";
import { EntityMetadata } from "typeorm/metadata/EntityMetadata";

import {
    BuilderError,
    BuilderName,
    Configurator,
    EntityFieldType,
    entityFieldTypeExtensionName,
    FieldBuilder,
    FieldType,
    FinalizeContext,
    ObjectTypeBuilder,
    ObjectTypeBuilderInfo
} from "@kiwano/core";

import { resolveModelBuilderOptions } from "./util";
import { ModelBuilderOptions, ModelType, relationIsMany } from "./common";
import { resolverOptionsExtensionName } from "./modelSchema";
import { RelationResolverOptions } from "./resolver";

export interface ModelObjectTypeBuilderOptions extends ModelBuilderOptions<BuilderName> {}

export class ModelObjectTypeBuilder extends ObjectTypeBuilder {

    protected _relationFieldNames: Set<string>;

    protected _options: ModelObjectTypeBuilderOptions;
    protected _model: ModelType;
    protected _metadata: EntityMetadata;

    protected _exclude: Set<string>;

    constructor(model: ModelType, dataSource: DataSource);
    constructor(model: ModelType, options: ModelObjectTypeBuilderOptions);
    constructor(model: ModelType, optionsOrDataSource?: ModelObjectTypeBuilderOptions | DataSource);
    constructor(model: ModelType, optionsOrDataSource?: ModelObjectTypeBuilderOptions | DataSource){

        const options = resolveModelBuilderOptions<ModelObjectTypeBuilderOptions, BuilderName>(optionsOrDataSource);
        const connection = options.dataSource;
        const metadata = connection.getMetadata(model);
        const resolvedName = options.name ?? metadata.name;

        super(resolvedName);

        this._model = model;
        this._options = options;
        this._metadata = metadata;

        this._exclude = new Set<string>();
        this._relationFieldNames = new Set<string>();
    }

    exclude(...fieldNames: string[]): this {

        fieldNames.forEach(name => this._exclude.add(name));
        return this;
    }

    relationField(name: string, type: FieldType, configurator: Configurator<FieldBuilder>): this;
    relationField(name: string, type: FieldType): this;
    relationField(field: FieldBuilder): this;
    relationField(fieldOrName: FieldBuilder | string, type: FieldType, configurator: Configurator<FieldBuilder>): this;
    relationField(fieldOrName: FieldBuilder | string, type: FieldType = null, configurator: Configurator<FieldBuilder> = null): this {

        super.field(fieldOrName, type, configurator);

        let resolvedName = isString(fieldOrName) ? fieldOrName as string : (fieldOrName as FieldBuilder).name;
        this._relationFieldNames.add(resolvedName);

        return this;
    }

    async finalizeObjectType(context: FinalizeContext, info: ObjectTypeBuilderInfo): Promise<any> {

        const columns = this._metadata.columns;
        const relations = this._metadata.relations;

        const typeMapper = this._options.typeMapper;

        const queryRunner = this._options.dataSource.createQueryRunner();
        const table = await queryRunner.getTable(this._metadata.tablePath);
        await queryRunner.release();

        if(!table){
            throw new BuilderError(`Table "${this._metadata.tablePath}" for model "${this._metadata.name}" not found`);
        }

        const joinColumns = flatten(relations.map(relation => relation.joinColumns));
        const joinColumnNames = joinColumns.map(column => column.propertyName);

        const existingFieldNames = info.fields.map(field => field.name);

        // Columns
        for(let column of columns){

            const propertyName = column.propertyName;
            if(this._exclude.has(propertyName) || existingFieldNames.indexOf(propertyName) >= 0){
                continue;
            }

            const tableColumn = table.findColumnByName(column.databaseName);
            const isJoinColumn = joinColumnNames.indexOf(propertyName) >= 0

            const typeInfo = typeMapper({
                columnMetadata: column,
                tableColumn,
                isJoinColumn
            });

            const field = new FieldBuilder(propertyName, typeInfo.type);

            if(!(column.isNullable || (tableColumn && tableColumn.isNullable))){
                field.nonNull();
            }

            if(typeInfo.list || column.isArray || tableColumn?.isArray){
                field.list();
            }

            const comment = column.comment || tableColumn?.comment;
            if(comment){
                field.description(comment);
            }

            this.field(field);
        }

        // Relations
        for(let relation of relations){

            const propertyName = relation.propertyName;
            if(this._exclude.has(propertyName) || existingFieldNames.indexOf(propertyName) >= 0){
                continue;
            }

            const field = new FieldBuilder(propertyName, relation.inverseEntityMetadata.name);

            if(!relation.isNullable){
                field.nonNull();
            }

            if(relationIsMany(relation)){
                field.list();
            }

            this.relationField(field);
        }

        // Decorate relation fields
        const relationFields = this._fields.filter(field => this._relationFieldNames.has(field.name));

        for(let field of relationFields){

            field.extension(resolverOptionsExtensionName, () => ({
                dataSource: this._options.dataSource,
                model: this._model,
                fieldInfo: field.info(),
                relation: field.name,
                plugins: field.info().plugins
            } as RelationResolverOptions));

            field.extension(entityFieldTypeExtensionName, EntityFieldType.RELATION);
        }
    }
}

function modelObjectType(model: ModelType, dataSource: DataSource): ModelObjectTypeBuilder;
function modelObjectType(model: ModelType, options: ModelObjectTypeBuilderOptions): ModelObjectTypeBuilder;
function modelObjectType(model: ModelType, optionsOrDataSource?: ModelObjectTypeBuilderOptions | DataSource): ModelObjectTypeBuilder
function modelObjectType(model: ModelType, optionsOrDataSource?: ModelObjectTypeBuilderOptions | DataSource): ModelObjectTypeBuilder {

    return new ModelObjectTypeBuilder(model, optionsOrDataSource);
}

export default modelObjectType;