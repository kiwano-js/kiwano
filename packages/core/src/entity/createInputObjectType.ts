import { InputObjectTypeBuilder, InputObjectTypeBuilderInfo } from "../inputObjectType";
import { BuilderName, FinalizeContext } from "../Builder";
import { ObjectTypeBuilder } from "../objectType";
import { InputFieldBuilder, InputFieldType } from "../inputField";
import { isFieldId, isTypeInput } from "../util";
import { EntityType } from "./entitySchema";

export class CreateInputObjectTypeBuilder extends InputObjectTypeBuilder {

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
            if(this._exclude.has(fieldInfo.name) || !isTypeInput(fieldInfo.type, context.rootSchema) || isFieldId(fieldInfo)){
                continue;
            }

            const inputField = new InputFieldBuilder(fieldInfo.name, fieldInfo.type as InputFieldType);
            if(fieldInfo.nonNull){
                inputField.nonNull();
            }

            this.field(inputField);
        }
    }
}

export function createInputObjectType(name: BuilderName, entityType: EntityType): CreateInputObjectTypeBuilder {

    return new CreateInputObjectTypeBuilder(name, entityType);
}

export default createInputObjectType;