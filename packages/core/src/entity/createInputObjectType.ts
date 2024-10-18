import { InputObjectTypeBuilder, InputObjectTypeBuilderInfo } from "../inputObjectType";
import { BuilderName, FinalizeContext } from "../Builder";
import { ObjectTypeBuilder } from "../objectType";
import { InputFieldBuilder, InputFieldType } from "../inputField";
import { isFieldId, isTypeInput } from "../util";
import { EntityType } from "./entitySchema";

export class CreateInputObjectTypeBuilder extends InputObjectTypeBuilder {

    protected _entityObjectType: EntityType;

    protected _exclude = new Set<string>();
    protected _include = new Set<string>();

    constructor(name: BuilderName, entityType: EntityType){
        super(name);
        this._entityObjectType = entityType;
    }

    exclude(...fieldNames: string[]): this {

        fieldNames.forEach(name => this._exclude.add(name));
        return this;
    }

    include(...fieldNames: string[]): this {

        fieldNames.forEach(name => this._include.add(name));
        return this;
    }

    async finalizeInputObjectType(context: FinalizeContext, info: InputObjectTypeBuilderInfo): Promise<any>{

        await super.finalizeInputObjectType(context, info);

        const entity: ObjectTypeBuilder = this._entityObjectType instanceof ObjectTypeBuilder ? this._entityObjectType : this._entityObjectType();
        const entityInfo = entity.info();

        const existingFieldNames = info.fields.map(field => field.name);

        for(let field of entityInfo.fields){

            const fieldInfo = field.info();

            if(!isTypeInput(fieldInfo.type, context.rootSchema) || isFieldId(fieldInfo) || existingFieldNames.indexOf(fieldInfo.name) >= 0){
                continue;
            }

            if(this._exclude.has(fieldInfo.name) || (this._include.size > 0 && !this._include.has(fieldInfo.name))){
                continue;
            }

            const inputField = new InputFieldBuilder(fieldInfo.name, fieldInfo.type as InputFieldType);

            if(fieldInfo.nonNull){
                inputField.nonNull();
            }

            if(fieldInfo.list){
                inputField.list();
            }

            if(fieldInfo.nonNullList){
                inputField.nonNullList();
            }

            this.field(inputField);
        }
    }
}

export function createInputObjectType(name: BuilderName, entityType: EntityType): CreateInputObjectTypeBuilder {

    return new CreateInputObjectTypeBuilder(name, entityType);
}

export default createInputObjectType;