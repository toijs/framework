import { EntitySchema } from "typeorm";

export type TypeORMEntity = Function | string | EntitySchema;
export type TypeORMMigration = Function | string;
export type TypeORMSubscriber = Function | string;
export type TypeORMSeed = Function | string;
