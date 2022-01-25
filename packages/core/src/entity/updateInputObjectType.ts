import { InputObjectTypeBuilder, InputObjectTypeBuilderInfo } from "../inputObjectType";
import { BuilderName, FinalizeContext } from "../Builder";
import { ObjectTypeBuilder } from "../objectType";
import { InputFieldBuilder, InputFieldType } from "../inputField";
import { isFieldId, isTypeInput } from "../util";
import { EntityType } from "./entitySchema";

export class UpdateInputObjectTypeBuilder extends InputObjectTypeBuilder {

    protected _entityObjectType: EntityType;
    protected _exclude = new Set<string>();

    constructor(name: BuilderName, entityType: EntityType){
        super(name);
        this._entityObjectType = entityType;
    }

    exclude(...fieldNames: string[]): this {

        fieldNames.forEach(name => this._exclude.add(name));
        return this;
    }

    async finalizeInputObjectType(context: FinalizeContext, info: InputObjectTypeBuilderInfo): Promise<any>{

        await super.finalizeInputObjectType(context, info);

        const entity: ObjectTypeBuilder = this._entityObjectType instanceof ObjectTypeBuilder ? this._entityObjectType : this._entityObjectType();
        const entityInfo = entity.info();

        for(let field of entityInfo.fields){

            const fieldInfo = field.info();
            if(this._exclude.has(fieldInfo.name) || !isTypeInput(fieldInfo.type, context.rootSchema)){
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