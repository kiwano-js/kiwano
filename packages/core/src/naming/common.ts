export interface NamingStrategy {}

export interface EntityNamingStrategyBase extends NamingStrategy {

    entityObject(schemaName: string): string;

    allField(schemaName: string): string;
    findField(schemaName: string): string;

    createField(schemaName: string): string;
    updateField(schemaName: string): string;
    deleteField(schemaName: string): string;
}

export interface EntityNamingStrategy extends EntityNamingStrategyBase {

    findFieldIdArgument(schemaName: string): string;
    deleteFieldIdArgument(schemaName: string): string;

    createInputObject(schemaName: string): string;
    createFieldInputArgument(schemaName: string): string;

    updateInputObject(schemaName: string): string;
    updateFieldInputArgument(schemaName: string): string;
}