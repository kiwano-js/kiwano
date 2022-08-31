import { ucFirst, pluralize } from "./util";
import { EntityNamingStrategy } from "./common";

export class DescriptiveNamingStrategy implements EntityNamingStrategy {

    entityObject(schemaName: string): string {
        return ucFirst(schemaName);
    }

    allField(schemaName: string): string {
        return `all${pluralize(ucFirst(schemaName))}`;
    }

    findField(schemaName: string): string {
        return `find${ucFirst(schemaName)}`;
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

export function descriptiveNamingStrategy(): DescriptiveNamingStrategy {

    return new DescriptiveNamingStrategy();
}

export default descriptiveNamingStrategy;