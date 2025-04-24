# TypeORM Plugins

The `@kiwano/typeorm` package provides TypeORM-specific versions of the core plugins. These plugins not only add the necessary types and arguments to your schema but also implement the filtering, sorting, and pagination logic in the resolvers.

## Available TypeORM Plugins

The `@kiwano/typeorm` package includes the following plugins:

- **Equals Filter Plugin**: Allows filtering by exact value matches
- **Search Filter Plugin**: Allows searching across multiple fields
- **Sort Plugin**: Allows sorting by fields
- **Sort Index Plugin**: Allows sorting by related fields
- **Offset-Limit Pagination Plugin**: Traditional pagination with offset and limit
- **First-After Pagination Plugin**: Cursor-based pagination with first and after
- **Relay Pagination Plugin**: Relay-style cursor-based pagination with connections
- **Simple Pagination Plugin**: Simple pagination with page and pageSize
- **Items Pagination Plugin**: Pagination that returns only the items
- **Connection Pagination Plugin**: Pagination that returns a connection object

## Equals Filter Plugin

The equals filter plugin allows filtering by exact value matches:

```typescript
import { modelSchema, equalsFilterPlugin } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .use(equalsFilterPlugin())
  )
  .find()
  .create()
  .update()
  .delete();
```

This generates:

- An input object type named `UserEqualsFilter` with fields corresponding to the fields in the `User` type
- An argument named `filter` of type `UserEqualsFilter` for the `users` query

The TypeORM equals filter plugin automatically implements the filtering logic in the resolver:

```typescript
class ModelQueryResolvers {
  applyAllQueryModifiers(queryBuilder, args, context, info) {
    // Apply equals filter
    if (args.filter) {
      for (const [key, value] of Object.entries(args.filter)) {
        if (value !== undefined) {
          queryBuilder.andWhere(`entity.${key} = :${key}`, { [key]: value });
        }
      }
    }
  }
}
```

### Configuration Options

The equals filter plugin accepts several configuration options:

```typescript
userSchema.all(_ => _
  .use(equalsFilterPlugin({
    argumentName: 'filter',       // Name of the filter argument
    inputName: name => `${name}Filter`, // Function to generate the input type name
    multi: true,                  // Allow filtering by multiple values
    manual: false,                // Manual mode (don't auto-generate fields)
    exclude: ['password'],        // Fields to exclude
    include: ['name', 'email']    // Fields to include (if specified, only these fields are included)
  }))
);
```

## Search Filter Plugin

The search filter plugin allows searching across multiple fields:

```typescript
import { modelSchema, searchFilterPlugin } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .use(searchFilterPlugin(['name', 'email', 'bio']))
  )
  .find()
  .create()
  .update()
  .delete();
```

This generates:

- An argument named `search` of type `String` for the `users` query

The TypeORM search filter plugin automatically implements the search logic in the resolver:

```typescript
class ModelQueryResolvers {
  applyAllQueryModifiers(queryBuilder, args, context, info) {
    // Apply search filter
    if (args.search) {
      const searchConditions = [];
      const searchFields = ['name', 'email', 'bio'];
      
      for (const field of searchFields) {
        searchConditions.push(`entity.${field} LIKE :search`);
      }
      
      queryBuilder.andWhere(`(${searchConditions.join(' OR ')})`, {
        search: `%${args.search}%`
      });
    }
  }
}
```

### Configuration Options

The search filter plugin accepts several configuration options:

```typescript
userSchema.all(_ => _
  .use(searchFilterPlugin(['name', 'email', 'bio'], {
    argumentName: 'search',       // Name of the search argument
    description: 'Search users'   // Description of the search argument
  }))
);
```

## Sort Plugin

The sort plugin allows sorting by fields:

```typescript
import { modelSchema, sortPlugin } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .use(sortPlugin(['name', 'email', 'createdAt']))
  )
  .find()
  .create()
  .update()
  .delete();
```

This generates:

- An enum type named `UserSortField` with values for each sortable field
- An enum type named `SortDirection` with `ASC` and `DESC` values
- An input object type named `UserSort` with `field` and `direction` fields
- An argument named `sort` of type `UserSort` for the `users` query

The TypeORM sort plugin automatically implements the sorting logic in the resolver:

```typescript
class ModelQueryResolvers {
  applyAllQueryModifiers(queryBuilder, args, context, info) {
    // Apply sorting
    if (args.sort) {
      const { field, direction } = args.sort;
      queryBuilder.orderBy(`entity.${field.toLowerCase()}`, direction);
    }
  }
}
```

### Configuration Options

The sort plugin accepts several configuration options:

```typescript
userSchema.all(_ => _
  .use(sortPlugin(['name', 'email', 'createdAt'], {
    argumentName: 'sort',         // Name of the sort argument
    inputName: typeName => `${typeName}Sort`, // Function to generate the input type name
    fieldEnumName: typeName => `${typeName}SortField`, // Function to generate the field enum name
    directionEnumName: 'SortDirection', // Name of the direction enum
    multi: false                  // Allow sorting by multiple fields
  }))
);
```

## Sort Index Plugin

The sort index plugin allows sorting by related fields:

```typescript
import { modelSchema, sortPlugin, sortIndexPlugin } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .use(sortPlugin(['name', 'email', 'createdAt']))
    .use(sortIndexPlugin('posts.title'))
  )
  .find()
  .create()
  .update()
  .delete();
```

This allows sorting users by the title of their posts.

## Offset-Limit Pagination Plugin

The offset-limit pagination plugin is a traditional pagination approach that uses offset and limit parameters:

```typescript
import { modelSchema, offsetLimitPaginationPlugin } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .use(offsetLimitPaginationPlugin())
  )
  .find()
  .create()
  .update()
  .delete();
```

This generates:

- An input object type named `OffsetLimitPagination` with `offset` and `limit` fields
- An argument named `pagination` of type `OffsetLimitPagination` for the `users` query

The TypeORM offset-limit pagination plugin automatically implements the pagination logic in the resolver:

```typescript
class ModelQueryResolvers {
  applyAllQueryModifiers(queryBuilder, args, context, info) {
    // Apply pagination
    if (args.pagination) {
      const { offset = 0, limit = 10 } = args.pagination;
      queryBuilder.skip(offset).take(limit);
    }
  }
}
```

### Configuration Options

The offset-limit pagination plugin accepts several configuration options:

```typescript
userSchema.all(_ => _
  .use(offsetLimitPaginationPlugin({
    argumentName: 'pagination',   // Name of the pagination argument
    inputName: 'OffsetLimitPagination', // Name of the input type
    defaultLimit: 10,             // Default limit value
    maxLimit: 100                 // Maximum limit value
  }))
);
```

## Relay Pagination Plugin

The relay pagination plugin implements the [Relay Cursor Connections Specification](https://relay.dev/graphql/connections.htm):

```typescript
import { modelSchema, relayPaginationPlugin } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .use(relayPaginationPlugin())
  )
  .find()
  .create()
  .update()
  .delete();
```

This generates:

- A `PageInfo` object type with `hasNextPage`, `hasPreviousPage`, `startCursor`, and `endCursor` fields
- A `UserEdge` object type with `node` and `cursor` fields
- A `UserConnection` object type with `edges`, `pageInfo`, and `totalCount` fields
- An input object type named `RelayPagination` with `first`, `after`, `last`, and `before` fields
- An argument named `pagination` of type `RelayPagination` for the `users` query

The TypeORM relay pagination plugin automatically implements the pagination logic in the resolver.

### Configuration Options

The relay pagination plugin accepts several configuration options:

```typescript
userSchema.all(_ => _
  .use(relayPaginationPlugin({
    argumentName: 'pagination',   // Name of the pagination argument
    inputName: 'RelayPagination', // Name of the input type
    defaultFirst: 10,             // Default first value
    maxFirst: 100,                // Maximum first value
    defaultLast: 10,              // Default last value
    maxLast: 100                  // Maximum last value
  }))
);
```

## Combining Plugins

You can combine multiple plugins:

```typescript
import { modelSchema, equalsFilterPlugin, searchFilterPlugin, sortPlugin, offsetLimitPaginationPlugin } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .use(equalsFilterPlugin())
    .use(searchFilterPlugin(['name', 'email', 'bio']))
    .use(sortPlugin(['name', 'email', 'createdAt']))
    .use(offsetLimitPaginationPlugin())
  )
  .find()
  .create()
  .update()
  .delete();
```

The TypeORM plugins will automatically implement the filtering, sorting, and pagination logic in the resolver:

```typescript
class ModelQueryResolvers {
  applyAllQueryModifiers(queryBuilder, args, context, info) {
    // Apply equals filter
    if (args.filter) {
      for (const [key, value] of Object.entries(args.filter)) {
        if (value !== undefined) {
          queryBuilder.andWhere(`entity.${key} = :${key}`, { [key]: value });
        }
      }
    }
    
    // Apply search filter
    if (args.search) {
      const searchConditions = [];
      const searchFields = ['name', 'email', 'bio'];
      
      for (const field of searchFields) {
        searchConditions.push(`entity.${field} LIKE :search`);
      }
      
      queryBuilder.andWhere(`(${searchConditions.join(' OR ')})`, {
        search: `%${args.search}%`
      });
    }
    
    // Apply sorting
    if (args.sort) {
      const { field, direction } = args.sort;
      queryBuilder.orderBy(`entity.${field.toLowerCase()}`, direction);
    }
    
    // Apply pagination
    if (args.pagination) {
      const { offset = 0, limit = 10 } = args.pagination;
      queryBuilder.skip(offset).take(limit);
    }
  }
}
```

## Custom TypeORM Plugins

You can create custom TypeORM plugins:

```typescript
import { Plugin, FieldBuilder, BuildContext, FieldBuilderInfo } from '@kiwano/core';
import { ModelQueryResolvers } from '@kiwano/typeorm';

export interface SoftDeletePluginOptions {
  argumentName?: string;
}

export class SoftDeletePlugin implements Plugin {
  protected _options: SoftDeletePluginOptions;
  
  constructor(options?: SoftDeletePluginOptions) {
    this._options = {
      argumentName: 'withDeleted',
      ...options
    };
  }
  
  beforeBuildField(builder: FieldBuilder, context: BuildContext, info: FieldBuilderInfo) {
    // Add an argument to the field
    builder.arg(this._options.argumentName, 'Boolean');
  }
}

export function softDeletePlugin(options?: SoftDeletePluginOptions): SoftDeletePlugin {
  return new SoftDeletePlugin(options);
}

// Custom query resolvers that implement the plugin logic
class CustomUserQueryResolvers extends ModelQueryResolvers {
  applyAllQueryModifiers(queryBuilder, args, context, info) {
    // Call the parent method
    super.applyAllQueryModifiers(queryBuilder, args, context, info);
    
    // Apply soft delete filter
    if (args.withDeleted) {
      queryBuilder.withDeleted();
    }
  }
}

// Use the custom plugin and resolvers
const userSchema = modelSchema(User, dataSource)
  .queryResolvers(CustomUserQueryResolvers)
  .all(_ => _
    .use(softDeletePlugin())
  )
  .find()
  .create()
  .update()
  .delete();
```

## Complete Example

Here's a complete example of using TypeORM plugins:

```typescript
import { schema } from '@kiwano/core';
import { modelSchema, equalsFilterPlugin, searchFilterPlugin, sortPlugin, offsetLimitPaginationPlugin } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';
import { Post } from './entities/Post';

// User model schema
const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .use(equalsFilterPlugin())
    .use(searchFilterPlugin(['name', 'email', 'bio']))
    .use(sortPlugin(['name', 'email', 'createdAt']))
    .use(offsetLimitPaginationPlugin())
  )
  .find()
  .create()
  .update()
  .delete();

// Post model schema
const postSchema = modelSchema(Post, dataSource)
  .all(_ => _
    .use(equalsFilterPlugin())
    .use(searchFilterPlugin(['title', 'content']))
    .use(sortPlugin(['title', 'createdAt']))
    .use(offsetLimitPaginationPlugin())
  )
  .find()
  .create()
  .update()
  .delete();

// Main schema
const mainSchema = schema()
  .merge(userSchema)
  .merge(postSchema);

// Build the schema
const graphQLSchema = await mainSchema.build();
```

## Next Steps

Now that you understand TypeORM plugins, you can explore:

- [Advanced Topics](../advanced/schema-customization.md): Explore advanced schema customization techniques
- [Best Practices](../advanced/best-practices.md): Learn best practices for building GraphQL APIs with Kiwano
- [Examples](../examples/typeorm-integration.md): See complete examples of TypeORM integration
