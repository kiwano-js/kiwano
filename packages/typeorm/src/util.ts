import { DataSource } from "typeorm";

import { ModelBuilderOptions } from "./common";
import typeMapper from './typeMapper'

export function resolveModelBuilderOptions<OT extends ModelBuilderOptions<NT>, NT>(optionsOrDataSource?: OT | DataSource): OT {

    let options: OT = {} as OT;

    if(optionsOrDataSource instanceof DataSource){
        options = { dataSource: optionsOrDataSource } as OT;
    }
    else if(optionsOrDataSource) {
        options = optionsOrDataSource as OT;
    }

    options.typeMapper = options.typeMapper || typeMapper;

    return options;
}