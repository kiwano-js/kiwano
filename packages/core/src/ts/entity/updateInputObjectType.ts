import { InputObjectTypeBuilder, type InputObjectTypeBuilderInfo } from "../inputObjectType";
import type { BuilderName, FinalizeContext } from "../Builder";
import { ObjectTypeBuilder } from "../objectType";
import { InputFieldBuilder, type InputFieldType } from "../inputField";
import { isFieldId, isTypeInput } from "../util";
import type { EntityType } from "./entitySchema";

export class UpdateInputObjectTypeBuilder extends InputObjectTypeBuilder {

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

    override async finalizeInputObjectType(context: FinalizeContext, info: InputObjectTypeBuilderInfo): Promise<any>{

        await super.finalizeInputObjectType(context, info);

        const entity: ObjectTypeBuilder = this._entityObjectType instanceof ObjectTypeBuilder ? this._entityObjectType : this._entityObjectType();
        const entityInfo = entity.info();

        const existingFieldNames = info.fields.map(field => field.name);

        for(const field of entityInfo.fields){

            const fieldInfo = field.info();

            if(!isTypeInput(fieldInfo.type, context.rootSchema) || existingFieldNames.indexOf(fieldInfo.name) >= 0){
                continue;
            }

            if(this._exclude.has(fieldInfo.name) || (this._include.size > 0 && !this._include.has(fieldInfo.name))){
                continue;
            }

            const inputField = new InputFieldBuilder(fieldInfo.name, fieldInfo.type as InputFieldType);
            if(isFieldId(fieldInfo)){
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

export function updateInputObjectType(name: BuilderName, entityType: EntityType): UpdateInputObjectTypeBuilder {

    return new UpdateInputObjectTypeBuilder(name, entityType);
}

export default updateInputObjectType;
