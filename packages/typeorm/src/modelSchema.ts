import { DataSource } from "typeorm";

import {
    AbstractEntitySchemaBuilder,
    BuilderName,
    CreateInputObjectTypeBuilder,
    EntityNamingStrategy,
    EntitySchemaBuilder,
    FieldBuilder,
    UpdateInputObjectTypeBuilder
} from "@kiwano/core";

import { ColumnTypeMapper, ModelBuilderOptions, ModelType } from "./common";
import { ModelObjectTypeBuilder } from "./modelObjectType";
import { resolveModelBuilderOptions } from "./util";

import {
    AllResolverOptions,
    CreateResolverOptions,
    DeleteResolverOptions,
    FindResolverOptions,
    UpdateResolverOptions
} from "./resolver";

import ModelQueryResolvers from "./resolver/ModelQueryResolvers";
import ModelMutationResolvers from "./resolver/ModelMutationResolvers";
import ModelEntityResolvers from "./resolver/ModelEntityResolvers";
import typeMapper from "./typeMapper";

export interface ModelSchemaBuilderOptions extends ModelBuilderOptions<string> {}

export const resolverOptionsExtensionName = "$resolverOptions";

export class ModelSchemaBuilder extends AbstractEntitySchemaBuilder<EntityNamingStrategy, ModelObjectTypeBuilder, FieldBuilder, CreateInputObjectTypeBuilder, UpdateInputObjectTypeBuilder> {

    static typeMapper: ColumnTypeMapper = typeMapper;

    protected _options: ModelSchemaBuilderOptions;
    protected _model: ModelType;

    constructor(model: ModelType, dataSource: DataSource);
    constructor(model: ModelType, options: ModelSchemaBuilderOptions);
    constructor(model: ModelType, optionsOrDataSource?: ModelSchemaBuilderOptions | DataSource);
    constructor(model: ModelType, optionsOrDataSource?: ModelSchemaBuilderOptions | DataSource){

        let options = resolveModelBuilderOptions<ModelSchemaBuilderOptions, string>(optionsOrDataSource);
        const metadata = options.dataSource.getMetadata(model);
        const resolvedName = options.name ?? metadata.name;

        super(resolvedName);
        this._defaultNamingStrategy = EntitySchemaBuilder.defaultNamingStrategy;

        this._options = options;
        this._model = model;

        // Default resolvers
        this._queryResolvers = ModelQueryResolvers;
        this._mutationResolvers = ModelMutationResolvers;
        this._entityResolvers = ModelEntityResolvers;
    }

    protected createEntityObjectType(name: BuilderName): ModelObjectTypeBuilder {

        return new ModelObjectTypeBuilder(this._model, {
            name,
            dataSource: this._options.dataSource,
            typeMapper: this._options.typeMapper
        });
    }

    protected createAllField(name: BuilderName): FieldBuilder {

        return new FieldBuilder(name).list();
    }

    protected createFindField(name: BuilderName): FieldBuilder {

        return new FieldBuilder(name);
    }

    protected createCreateField(name: BuilderName): FieldBuilder {

        return new FieldBuilder(name);
    }

    protected createUpdateField(name: BuilderName): FieldBuilder {

        return new FieldBuilder(name);
    }

    protected createDeleteField(name: BuilderName): FieldBuilder {

        return new FieldBuilder(name, 'Boolean');
    }

    protected createCreateInputObject(name: BuilderName): CreateInputObjectTypeBuilder {

        return new CreateInputObjectTypeBuilder(name, () => this._entityObjectType);
    }

    protected createUpdateInputObject(name: BuilderName): UpdateInputObjectTypeBuilder {

        return new UpdateInputObjectTypeBuilder(name, () => this._entityObjectType);
    }

    async finalizeSchema(): Promise<void> {

        await super.finalizeSchema();

        if(this._findField){

            this._findField.extension(resolverOptionsExtensionName, () => ({
                dataSource: this._options.dataSource,
                model: this._model,
                fieldInfo: this._findField.info(),
                idArgument: this.namingStrategy.findFieldIdArgument(this.name),
                plugins: this._findField.info().plugins
            } as FindResolverOptions));
        }

        if(this._allField){

            this._allField.extension(resolverOptionsExtensionName, () => ({
                dataSource: this._options.dataSource,
                model: this._model,
                fieldInfo: this._allField.info(),
                plugins: this._allField.info().plugins
            } as AllResolverOptions));
        }

        if(this._createField){

            this._createField.extension(resolverOptionsExtensionName, () => ({
                dataSource: this._options.dataSource,
                model: this._model,
                fieldInfo: this._createField.info(),
                inputArgument: this.namingStrategy.createFieldInputArgument(this.name),
                plugins: this._createField.info().plugins
            } as CreateResolverOptions));
        }

        if(this._updateField){

            this._updateField.extension(resolverOptionsExtensionName, () => ({
                dataSource: this._options.dataSource,
                model: this._model,
                fieldInfo: this._updateField.info(),
                inputArgument: this.namingStrategy.updateFieldInputArgument(this.name),
                plugins: this._updateField.info().plugins
            } as UpdateResolverOptions));
        }

        if(this._deleteField){

            this._deleteField.extension(resolverOptionsExtensionName, () => ({
                dataSource: this._options.dataSource,
                model: this._model,
                fieldInfo: this._deleteField.info(),
                idArgument: this.namingStrategy.deleteFieldIdArgument(this.name),
                plugins: this._deleteField.info().plugins
            } as DeleteResolverOptions));
        }
    }
}

function modelSchema(model: ModelType, dataSource: DataSource): ModelSchemaBuilder;
function modelSchema(model: ModelType, options: ModelSchemaBuilderOptions): ModelSchemaBuilder;
function modelSchema(model: ModelType, optionsOrDataSource?: ModelSchemaBuilderOptions | DataSource): ModelSchemaBuilder
function modelSchema(model: ModelType, optionsOrDataSource?: ModelSchemaBuilderOptions | DataSource): ModelSchemaBuilder {

    return new ModelSchemaBuilder(model, optionsOrDataSource);
}

export default modelSchema;