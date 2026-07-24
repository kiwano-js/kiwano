import { DataSource } from "typeorm";

import type { ModelBuilderOptions } from "./common";
import { ModelSchemaBuilder } from "./modelSchema";
import typeMapper from './typeMapper'

export function getDatabaseType(dataSource: DataSource): string {

    return String(dataSource.options?.type || (dataSource as any).driver?.options?.type || (dataSource as any).driver?.type || '').toLowerCase();
}

export function resolveModelBuilderOptions<OT extends ModelBuilderOptions<NT>, NT>(optionsOrDataSource?: OT | DataSource): OT {

    let options: OT = {} as OT;

    if(optionsOrDataSource instanceof DataSource){
        options = { dataSource: optionsOrDataSource } as OT;
    }
    else if(optionsOrDataSource) {
        options = optionsOrDataSource as OT;
    }

    options.typeMapper = options.typeMapper || ModelSchemaBuilder.typeMapper || typeMapper;

    return options;
}
