import { DataSource } from "typeorm";

import { ModelBuilderOptions } from "./common";
import { ModelSchemaBuilder } from "./modelSchema";
import typeMapper from './typeMapper'

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