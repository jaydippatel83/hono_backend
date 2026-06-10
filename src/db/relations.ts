import { defineRelations } from "drizzle-orm";
import * as schema from "./schema.ts";

export const relations = defineRelations(schema, r => ({
    ApiKeysTable: {
        user: r.one.UserTable({
            from: r.ApiKeysTable.userId,
            to: r.UserTable.id,
        }) 
    },
    AuthorTable: {
        books: r.many.BookTable(),
    },
    BooksTable: {
        author: r.one.AuthorTable({
            from: r.BookTable.authorId,
            to: r.AuthorTable.id,
        }),
        addedByUser: r.one.UserTable({
            from: r.BookTable.addedBy,
            to: r.UserTable.id,
        })
    },
    UserTable: {
        apiKeys: r.many.ApiKeysTable(),
        booksAdded: r.many.BookTable()
    }
}));