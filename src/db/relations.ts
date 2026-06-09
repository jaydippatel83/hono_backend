import { defineRelations } from "drizzle-orm";
import * as schema from "./schema.ts";

export const relations = defineRelations(schema, r => ({
    ApiKeysTable: {
        user: r.one.UserTable({
            from: r.ApiKeysTable.userId,
            to: r.UserTable.id,
        }) 
    },
    UserTable: {
        apiKeys: r.many.ApiKeysTable(),
    }
}));