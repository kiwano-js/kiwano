import { isString } from "lodash";

import { getConnection } from "typeorm";

import { ModelBuilderOptions } from "./common";
import typeMapper from './typeMapper'

export function resolveModelBuilderOptions<OT extends ModelBuilderOptions<NT>, NT>(optionsOrName?: OT | NT): OT {

    let options: OT = {} as OT;
    if(isString(optionsOrName)){
        options = { name: optionsOrName as NT } as OT;
    }
    else if(optionsOrName) {
        options = optionsOrName as OT;
    }

    options.connection = options.connection || getConnection();
    options.typeMapper = options.typeMapper || typeMapper;

    return options;
}