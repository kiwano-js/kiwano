import { ObjectTypeBuilder } from "../objectType";
import { FieldBuilder } from "../field";
import { InputObjectTypeBuilder } from "../inputObjectType";
import { compactNamingStrategy, EntityNamingStrategy, EntityNamingStrategyBase } from "../naming";
import { BuilderName, BuilderOrConfiguratorOrName } from "../Builder";
import { AbstractSchemaBuilder } from "../schema";
import { ensureInstantiated, resolveAutoBuilderArgs, resolveBuilder } from "../util";
import { CreateInputObjectTypeBuilder } from "./createInputObjectType";
import { UpdateInputObjectTypeBuilder } from "./updateInputObjectType";
import { Configurator } from "../common";

export type EntityType = ObjectTypeBuilder | (() => ObjectTypeBuilder);

export enum EntityFieldType {
    ALL = "ALL", FIND = "FIND", CREATE = "CREATE", UPDATE = "UPDATE", DELETE = "DELETE", RELATION = "RELATION"
}

export const entityFieldTypeExtensionName = "$entityFieldType";

export abstract class AbstractEntitySchemaBuilderBase<
    NS extends EntityNamingStrategyBase,
    OT extends ObjectTypeBuilder,
    FT extends FieldBuilder
    > extends AbstractSchemaBuilder<NS> {

    protected _entityObjectType?: OT;

    protected _allField?: FT;
    protected _findField?: FT;

    protected _createField?: FT;
    protected _updateField?: FT;
    protected _deleteField?: FT;

    protected _allowedEntityRoles = new Set<string>();
    protected _deniedEntityRoles = new Set<string>();

    protected _entityResolvers?: object;

    entity(configurator: Configurator<OT>): this;
    entity(name: string, configurator: Configurator<OT>): this;
    entity(name: string): this;
    entity(builder: OT): this;
    entity(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<OT>, configurator: Configurator<OT>): this;
    entity(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<OT>, configurator: Configurator<OT> = null): this {

        let resolvedArgs = resolveAutoBuilderArgs(builderOrConfiguratorOrName, configurator, ObjectTypeBuilder);
        const defaultName = () => this.namingStrategy.entityObject(this.name);

        this._entityObjectType = resolveBuilder(resolvedArgs, name => this.createEntityObjectType(name || defaultName));

        return this;
    }

    all(): this;
    all(configurator: Configurator<FT>): this;
    all(name: string, configurator: Configurator<FT>): this;
    all(name: string): this;
    all(builder: FT): this;
    all(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<FT>, configurator: Configurator<FT>): this;
    all(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<FT> = null, configurator: Configurator<FT> = null): this {

        let resolvedArgs = resolveAutoBuilderArgs(builderOrConfiguratorOrName, configurator, FieldBuilder);
        const defaultName = () => this.namingStrategy.allField(this.name);

        this._allField = resolveBuilder(resolvedArgs, name => this.createAllField(name || defaultName));

        return this;
    }

    find(): this;
    find(configurator: Configurator<FT>): this;
    find(name: string, configurator: Configurator<FT>): this;
    find(name: string): this;
    find(builder: FT): this;
    find(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<FT>, configurator: Configurator<FT>): this;
    find(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<FT> = null, configurator: Configurator<FT> = null): this {

        let resolvedArgs = resolveAutoBuilderArgs(builderOrConfiguratorOrName, configurator, FieldBuilder);
        const defaultName = () => this.namingStrategy.findField(this.name);

        this._findField = resolveBuilder(resolvedArgs, name => this.createFindField(name || defaultName));

        return this;
    }

    create(): this;
    create(configurator: Configurator<FT>): this;
    create(name: string, configurator: Configurator<FT>): this;
    create(name: string): this;
    create(builder: FT): this;
    create(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<FT>, configurator: Configurator<FT>): this;
    create(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<FT> = null, configurator: Configurator<FT> = null): this {

        let resolvedArgs = resolveAutoBuilderArgs(builderOrConfiguratorOrName, configurator, FieldBuilder);
        const defaultName = () => this.namingStrategy.createField(this.name);

        this._createField = resolveBuilder(resolvedArgs, name => this.createCreateField(name || defaultName));

        return this;
    }

    update(): this;
    update(configurator: Configurator<FT>): this;
    update(name: string, configurator: Configurator<FT>): this;
    update(name: string): this;
    update(builder: FT): this;
    update(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<FT>, configurator: Configurator<FT>): this;
    update(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<FT> = null, configurator: Configurator<FT> = null): this {

        let resolvedArgs = resolveAutoBuilderArgs(builderOrConfiguratorOrName, configurator, FieldBuilder);
        const defaultName = () => this.namingStrategy.updateField(this.name);

        this._updateField = resolveBuilder(resolvedArgs, name => this.createUpdateField(name || defaultName));

        return this;
    }

    delete(): this;
    delete(configurator: Configurator<FT>): this;
    delete(name: string, configurator: Configurator<FT>): this;
    delete(name: string): this;
    delete(builder: FT): this;
    delete(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<FT>, configurator: Configurator<FT>): this;
    delete(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<FT> = null, configurator: Configurator<FT> = null): this {

        let resolvedArgs = resolveAutoBuilderArgs(builderOrConfiguratorOrName, configurator, FieldBuilder);
        const defaultName = () => this.namingStrategy.deleteField(this.name);

        this._deleteField = resolveBuilder(resolvedArgs, name => this.createDeleteField(name || defaultName));

        return this;
    }

    allowEntity(...roles: string[]): this {

        roles.forEach(role => this._allowedEntityRoles.add(role));
        return this;
    }

    denyEntity(...roles: string[]): this {

        roles.forEach(role => this._deniedEntityRoles.add(role));
        return this;
    }

    entityResolvers(resolvers?: object): this {

        this._entityResolvers = resolvers;
        return this;
    }

    async finalizeSchema() {

        await super.finalizeSchema();

        // Create default entity object when no object provided
        if(!this._entityObjectType){
            this._entityObjectType = this.createEntityObjectType(this.namingStrategy.entityObject(this.name));
        }

        // Add rules & plugins
        this._entityObjectType.allow(...Array.from(this._allowedEntityRoles)).deny(...Array.from(this._deniedEntityRoles));

        this.object(this._entityObjectType);

        // Set type in fields
        if(this._allField){

            this._allField.type(this._entityObjectType.name);
            this._allField.extension(entityFieldTypeExtensionName, EntityFieldType.ALL);

            this.query(this._allField);
        }

        if(this._findField){

            this._findField.type(this._entityObjectType.name);
            this._findField.extension(entityFieldTypeExtensionName, EntityFieldType.FIND);

            this.query(this._findField);
        }

        if(this._createField){

            this._createField.type(this._entityObjectType.name);
            this._createField.extension(entityFieldTypeExtensionName, EntityFieldType.CREATE);

            this.mutation(this._createField);
        }

        if(this._updateField){

            this._updateField.type(this._entityObjectType.name);
            this._updateField.extension(entityFieldTypeExtensionName, EntityFieldType.UPDATE);

            this.mutation(this._updateField);
        }

        if(this._deleteField){

            this._deleteField.extension(entityFieldTypeExtensionName, EntityFieldType.DELETE);
            this.mutation(this._deleteField);
        }

        // Entity resolvers
        if(this._entityResolvers){

            this._resolvers = {
                [this._entityObjectType.name]: ensureInstantiated(this._entityResolvers),
                ...this._resolvers
            };
        }
    }

    protected abstract createEntityObjectType(name: BuilderName): OT;

    protected abstract createAllField(name: BuilderName): FT;
    protected abstract createFindField(name: BuilderName): FT;

    protected abstract createCreateField(name: BuilderName): FT;
    protected abstract createUpdateField(name: BuilderName): FT;
    protected abstract createDeleteField(name: BuilderName): FT;
}

export abstract class AbstractEntitySchemaBuilder<
    NS extends EntityNamingStrategy,
    OT extends ObjectTypeBuilder,
    FT extends FieldBuilder,
    CIT extends InputObjectTypeBuilder,
    UIT extends InputObjectTypeBuilder
    > extends AbstractEntitySchemaBuilderBase<NS, OT, FT> {

    protected _createInputObject?: CIT;
    protected _updateInputObject?: UIT;

    createInput(): this;
    createInput(configurator: Configurator<CIT>): this;
    createInput(name: string, configurator: Configurator<CIT>): this;
    createInput(name: string): this;
    createInput(builder: CIT): this;
    createInput(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<CIT>, configurator: Configurator<CIT>): this;
    createInput(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<CIT> = null, configurator: Configurator<CIT> = null): this {

        let resolvedArgs = resolveAutoBuilderArgs(builderOrConfiguratorOrName, configurator, FieldBuilder);
        const defaultName = () => this.namingStrategy.createInputObject(this.name);

        this._createInputObject = resolveBuilder(resolvedArgs, name => this.createCreateInputObject(name || defaultName));

        return this;
    }

    updateInput(): this;
    updateInput(configurator: Configurator<UIT>): this;
    updateInput(name: string, configurator: Configurator<UIT>): this;
    updateInput(name: string): this;
    updateInput(builder: UIT): this;
    updateInput(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<UIT>, configurator: Configurator<UIT>): this;
    updateInput(builderOrConfiguratorOrName: BuilderOrConfiguratorOrName<UIT> = null, configurator: Configurator<UIT> = null): this {

        let resolvedArgs = resolveAutoBuilderArgs(builderOrConfiguratorOrName, configurator, FieldBuilder);
        const defaultName = () => this.namingStrategy.updateInputObject(this.name);

        this._updateInputObject = resolveBuilder(resolvedArgs, name => this.createUpdateInputObject(name || defaultName));

        return this;
    }

    async finalizeSchema() {

        await super.finalizeSchema();

        if(this._findField){
            this._findField.arg(this.namingStrategy.findFieldIdArgument(this.name), 'ID', _ => _.nonNull())
        }

        if(this._deleteField){
            this._deleteField.arg(this.namingStrategy.deleteFieldIdArgument(this.name), 'ID', _ => _.nonNull());
        }

        if(this._createField){

            if(!this._createInputObject){
                this._createInputObject = this.createCreateInputObject(this.namingStrategy.createInputObject(this.name));
            }

            this.inputObject(this._createInputObject);

            this._createField.arg(this.namingStrategy.createFieldInputArgument(this.name), this._createInputObject.name, _ => _.nonNull());
        }

        if(this._updateField){

            if(!this._updateInputObject){
                this._updateInputObject = this.createUpdateInputObject(this.namingStrategy.updateInputObject(this.name));
            }

            this.inputObject(this._updateInputObject);

            this._updateField.arg(this.namingStrategy.updateFieldInputArgument(this.name), this._updateInputObject.name, _ => _.nonNull());
        }
    }

    protected abstract createCreateInputObject(name: BuilderName): CIT;
    protected abstract createUpdateInputObject(name: BuilderName): UIT;
}

export class EntitySchemaBuilder extends AbstractEntitySchemaBuilder<EntityNamingStrategy, ObjectTypeBuilder, FieldBuilder, CreateInputObjectTypeBuilder, UpdateInputObjectTypeBuilder> {

    public static defaultNamingStrategy: EntityNamingStrategy = compactNamingStrategy();

    constructor(name: string=null){

        super(name);
        this._defaultNamingStrategy = EntitySchemaBuilder.defaultNamingStrategy;
    }

    protected createEntityObjectType(name: BuilderName): ObjectTypeBuilder {

        return new ObjectTypeBuilder(name);
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
}

export function entitySchema(name: string): EntitySchemaBuilder {

    return new EntitySchemaBuilder(name);
}

export default entitySchema;