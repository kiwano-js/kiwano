# Pagination Plugins

Kiwano provides several pagination plugins that allow you to add pagination capabilities to your queries. These plugins generate the necessary types and arguments to paginate the results of your queries.

## Available Pagination Plugins

Kiwano includes the following pagination plugins:

- **Offset-Limit Pagination**: Traditional pagination with offset and limit
- **First-After Pagination**: Cursor-based pagination with first and after
- **Relay Pagination**: Relay-style cursor-based pagination with connections
- **Simple Pagination**: Simple pagination with page and pageSize
- **Items Pagination**: Pagination that returns only the items
- **Connection Pagination**: Pagination that returns a connection object

## Offset-Limit Pagination

The offset-limit pagination plugin is a traditional pagination approach that uses offset and limit parameters.

### Basic Usage

```typescript
import { schema, offsetLimitPaginationPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('users', '[User]', _ => _
    .use(offsetLimitPaginationPlugin())
  );
```

This generates:

- An input object type named `OffsetLimitPagination` with `offset` and `limit` fields
- An argument named `pagination` of type `OffsetLimitPagination` for the `users` query

The generated GraphQL schema will look like:

```graphql
input OffsetLimitPagination {
  offset: Int
  limit: Int
}

type Query {
  users(pagination: OffsetLimitPagination): [User]
}
```

### Configuration Options

The offset-limit pagination plugin accepts several configuration options:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(offsetLimitPaginationPlugin({
    argumentName: 'pagination',   // Name of the pagination argument
    inputName: 'OffsetLimitPagination', // Name of the input type
    defaultLimit: 10,             // Default limit value
    maxLimit: 100                 // Maximum limit value
  }))
);
```

### Custom Argument Name

You can customize the name of the pagination argument:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(offsetLimitPaginationPlugin().argumentName('paging'))
);
```

### Custom Input Type Name

You can customize the name of the input type:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(offsetLimitPaginationPlugin().inputName('Pagination'))
);
```

## First-After Pagination

The first-after pagination plugin is a cursor-based pagination approach that uses first and after parameters.

### Basic Usage

```typescript
import { schema, firstAfterPaginationPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('users', '[User]', _ => _
    .use(firstAfterPaginationPlugin())
  );
```

This generates:

- An input object type named `FirstAfterPagination` with `first` and `after` fields
- An argument named `pagination` of type `FirstAfterPagination` for the `users` query

The generated GraphQL schema will look like:

```graphql
input FirstAfterPagination {
  first: Int
  after: String
}

type Query {
  users(pagination: FirstAfterPagination): [User]
}
```

### Configuration Options

The first-after pagination plugin accepts several configuration options:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(firstAfterPaginationPlugin({
    argumentName: 'pagination',   // Name of the pagination argument
    inputName: 'FirstAfterPagination', // Name of the input type
    defaultFirst: 10,             // Default first value
    maxFirst: 100                 // Maximum first value
  }))
);
```

## Relay Pagination

The relay pagination plugin implements the [Relay Cursor Connections Specification](https://relay.dev/graphql/connections.htm).

### Basic Usage

```typescript
import { schema, relayPaginationPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('users', 'User', _ => _
    .use(relayPaginationPlugin())
  );
```

This generates:

- A `PageInfo` object type with `hasNextPage`, `hasPreviousPage`, `startCursor`, and `endCursor` fields
- A `UserEdge` object type with `node` and `cursor` fields
- A `UserConnection` object type with `edges`, `pageInfo`, and `totalCount` fields
- An input object type named `RelayPagination` with `first`, `after`, `last`, and `before` fields
- An argument named `pagination` of type `RelayPagination` for the `users` query

The generated GraphQL schema will look like:

```graphql
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type UserEdge {
  node: User
  cursor: String!
}

type UserConnection {
  edges: [UserEdge]
  pageInfo: PageInfo!
  totalCount: Int
}

input RelayPagination {
  first: Int
  after: String
  last: Int
  before: String
}

type Query {
  users(pagination: RelayPagination): UserConnection
}
```

### Configuration Options

The relay pagination plugin accepts several configuration options:

```typescript
mySchema.query('users', 'User', _ => _
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

## Simple Pagination

The simple pagination plugin is a traditional pagination approach that uses page and pageSize parameters.

### Basic Usage

```typescript
import { schema, simplePaginationPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('users', '[User]', _ => _
    .use(simplePaginationPlugin())
  );
```

This generates:

- An input object type named `SimplePagination` with `page` and `pageSize` fields
- An argument named `pagination` of type `SimplePagination` for the `users` query

The generated GraphQL schema will look like:

```graphql
input SimplePagination {
  page: Int
  pageSize: Int
}

type Query {
  users(pagination: SimplePagination): [User]
}
```

## Items Pagination

The items pagination plugin returns only the items, without any pagination metadata.

### Basic Usage

```typescript
import { schema, itemsPaginationPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('users', '[User]', _ => _
    .use(itemsPaginationPlugin())
  );
```

This generates:

- An input object type named `ItemsPagination` with pagination parameters
- An argument named `pagination` of type `ItemsPagination` for the `users` query

## Connection Pagination

The connection pagination plugin returns a connection object with items and pagination metadata.

### Basic Usage

```typescript
import { schema, connectionPaginationPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('users', 'User', _ => _
    .use(connectionPaginationPlugin())
  );
```

This generates:

- A `UserConnection` object type with `items`, `pageInfo`, and `totalCount` fields
- An input object type named `ConnectionPagination` with pagination parameters
- An argument named `pagination` of type `ConnectionPagination` for the `users` query

## Implementing Pagination Resolvers

The pagination plugins only add the necessary types and arguments to your schema. You need to implement the pagination logic in your resolvers:

```typescript
class UserQueryResolvers {
  users(parent, { pagination }, context, info) {
    const allUsers = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com' },
      { id: '3', name: 'Bob Smith', email: 'bob@example.com' },
      // ... more users
    ];
    
    // Offset-Limit Pagination
    if (pagination) {
      const { offset = 0, limit = 10 } = pagination;
      return allUsers.slice(offset, offset + limit);
    }
    
    return allUsers;
  }
}

mySchema.queryResolvers(UserQueryResolvers);
```

For Relay pagination, the resolver is more complex:

```typescript
class UserQueryResolvers {
  users(parent, { pagination }, context, info) {
    const allUsers = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com' },
      { id: '3', name: 'Bob Smith', email: 'bob@example.com' },
      // ... more users
    ];
    
    // Relay Pagination
    if (pagination) {
      const { first = 10, after } = pagination;
      
      // Decode cursor
      let startIndex = 0;
      if (after) {
        const decodedCursor = Buffer.from(after, 'base64').toString('utf-8');
        startIndex = parseInt(decodedCursor, 10) + 1;
      }
      
      // Get items
      const items = allUsers.slice(startIndex, startIndex + first);
      
      // Create edges
      const edges = items.map((item, index) => {
        const cursor = Buffer.from(`${startIndex + index}`).toString('base64');
        return {
          node: item,
          cursor
        };
      });
      
      // Create page info
      const pageInfo = {
        hasNextPage: startIndex + first < allUsers.length,
        hasPreviousPage: startIndex > 0,
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null
      };
      
      return {
        edges,
        pageInfo,
        totalCount: allUsers.length
      };
    }
    
    // Default: return all users
    return {
      edges: allUsers.map((item, index) => ({
        node: item,
        cursor: Buffer.from(`${index}`).toString('base64')
      })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: allUsers.length > 0 ? Buffer.from('0').toString('base64') : null,
        endCursor: allUsers.length > 0 ? Buffer.from(`${allUsers.length - 1}`).toString('base64') : null
      },
      totalCount: allUsers.length
    };
  }
}

mySchema.queryResolvers(UserQueryResolvers);
```

## TypeORM Integration

The `@kiwano/typeorm` package provides extensions of the pagination plugins that integrate with TypeORM:

```typescript
import { modelSchema, offsetLimitPaginationPlugin, relayPaginationPlugin } from '@kiwano/typeorm';
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

The TypeORM pagination plugins not only add the necessary types and arguments to your schema but also implement the pagination logic in the resolvers.

## Combining Pagination with Other Plugins

You can combine pagination plugins with other plugins:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(equalsFilterPlugin())
  .use(sortPlugin(['name', 'createdAt']))
  .use(offsetLimitPaginationPlugin())
);
```

This generates:

```graphql
input UserEqualsFilter {
  id: ID
  name: String
  email: String
}

input UserSort {
  field: UserSortField!
  direction: SortDirection!
}

enum UserSortField {
  name
  createdAt
}

enum SortDirection {
  ASC
  DESC
}

input OffsetLimitPagination {
  offset: Int
  limit: Int
}

type Query {
  users(filter: UserEqualsFilter, sort: UserSort, pagination: OffsetLimitPagination): [User]
}
```

## Next Steps

Now that you understand pagination plugins, you can explore other plugins:

- [Access Control (ACL)](acl.md): Control access to types and fields
- [Filtering](filtering.md): Add filtering capabilities to your queries
- [Sorting](sorting.md): Add sorting capabilities to your queries
- [Custom Plugins](custom-plugins.md): Create your own plugins
