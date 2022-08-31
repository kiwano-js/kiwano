import { lcFirst, ucFirst, pluralize } from "./util";
import { EntityNamingStrategy } from "./common";

export class CompactNamingStrategy implements EntityNamingStrategy {

    entityObject(schemaName: string): string {
        return ucFirst(schemaName);
    }

    allField(schemaName: string): string {
        return pluralize(lcFirst(schemaName));
    }

    findField(schemaName: string): string {
        return lcFirst(schemaName);
    }

    createField(schemaName: string): string {
        return `create${ucFirst(schemaName)}`;
    }

    updateField(schemaName: string): string {
        return `update${ucFirst(schemaName)}`;
    }

    deleteField(schemaName: string): string {
        return `delete${ucFirst(schemaName)}`;
    }

    restoreField(schemaName: string): string {
        return `restore${ucFirst(schemaName)}`;
    }

    findFieldIdArgument(schemaName: string): string {
        return 'id';
    }

    deleteFieldIdArgument(schemaName: string): string {
        return 'id';
    }

    restoreFieldIdArgument(schemaName: string): string {
        return 'id';
    }

    createInputObject(schemaName: string): string {
        return `Create${ucFirst(schemaName)}Input`;
    }

    createFieldInputArgument(schemaName: string): string {
        return 'input';
    }

    updateInputObject(schemaName: string): string {
        return `Update${ucFirst(schemaName)}Input`;
    }

    updateFieldInputArgument(schemaName: string): string {
        return 'input'
    }
}

export function compactNamingStrategy(): CompactNamingStrategy {

    return new CompactNamingStrategy();
}

export default compactNamingStrategy;