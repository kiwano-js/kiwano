import type { BuilderName, FieldType } from "@kiwano/core";

import { ModelFieldBuilder } from "./modelField";
import type { DeleteResolverOptionsPartial } from "./resolver";

export class DeleteModelFieldBuilder extends ModelFieldBuilder<DeleteResolverOptionsPartial> {

    softDelete(): this;
    softDelete(softDelete: boolean): this;
    softDelete(softDelete = true): this {

        this.resolverOptions({
            softDelete
        });

        return this;
    }
}

export function deleteModelField(name: BuilderName, type: FieldType = null): DeleteModelFieldBuilder {

    return new DeleteModelFieldBuilder(name, type);
}

export default deleteModelField;
