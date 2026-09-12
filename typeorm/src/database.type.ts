import type { EntitySchemaOptions } from "typeorm";

export type TypeORMEntitySchemaOptions<T = any> = EntitySchemaOptions<T>;
export type TypeORMMigration = Function | string;
export type TypeORMSubscriber = Function | string;
export type TypeORMSeed = Function | string;
