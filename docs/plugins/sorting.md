# Sorting Plugin

The sorting plugin in Kiwano allows you to add sorting capabilities to your queries. It generates the necessary types and arguments to sort the results of your queries.

## Basic Usage

To use the sorting plugin, first import it and add it to your query:

```typescript
import { schema, sortPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('createdAt', 'Date')
  )
  .query('users', '[User]', _ => _
    .use(sortPlugin(['name', 'email', 'createdAt']))
  );
```

This generates:

- An enum type named `UserSortField` with values for each sortable field
- An enum type named `SortDirection` with `ASC` and `DESC` values
- An input object type named `UserSort` with `field` and `direction` fields
- An argument named `sort` of type `UserSort` for the `users` query

The generated GraphQL schema will look like:

```graphql
enum UserSortField {
  name
  email
  createdAt
}

enum SortDirection {
  ASC
  DESC
}

input UserSort {
  field: UserSortField!
  direction: SortDirection!
}

type Query {
  users(sort: UserSort): [User]
}
```

## Configuration Options

The sort plugin accepts several configuration options:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(sortPlugin(['name', 'email', 'createdAt'], {
    argumentName: 'sort',         // Name of the sort argument
    inputName: typeName => `${typeName}Sort`, // Function to generate the input type name
    fieldEnumName: typeName => `${typeName}SortField`, // Function to generate the field enum name
    directionEnumName: 'SortDirection', // Name of the direction enum
    multi: false                  // Allow sorting by multiple fields
  }))
);
```

## Sortable Fields

You can specify which fields are sortable:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(sortPlugin(['name', 'email', 'createdAt']))
);
```

You can also use an object to specify custom names for the enum values:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(sortPlugin({
    name: 'NAME',
    email: 'EMAIL',
    createdAt: 'CREATED_AT'
  }))
);
```

This generates an enum like:

```graphql
enum UserSortField {
  NAME
  EMAIL
  CREATED_AT
}
```

## Multiple Sort Fields

You can allow sorting by multiple fields:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(sortPlugin(['name', 'email', 'createdAt']).multi())
);
```

This changes the `sort` argument to accept an array:

```graphql
input UserSort {
  field: UserSortField!
  direction: SortDirection!
}

type Query {
  users(sort: [UserSort!]): [User]
}
```

## Custom Argument Name

You can customize the name of the sort argument:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(sortPlugin(['name', 'email']).argumentName('orderBy'))
);
```

## Custom Type Names

You can customize the names of the generated types:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(sortPlugin(['name', 'email'])
    .inputName(typeName => `${typeName}OrderBy`)
    .fieldEnumName(typeName => `${typeName}OrderByField`)
    .directionEnumName('OrderDirection')
  )
);
```

This generates:

```graphql
enum UserOrderByField {
  name
  email
}

enum OrderDirection {
  ASC
  DESC
}

input UserOrderBy {
  field: UserOrderByField!
  direction: OrderDirection!
}

type Query {
  users(sort: UserOrderBy): [User]
}
```

## Implementing Sort Resolvers

The sorting plugin only adds the necessary types and arguments to your schema. You need to implement the sorting logic in your resolvers:

```typescript
class UserQueryResolvers {
  users(parent, { sort }, context, info) {
    let users = [
      { id: '1', name: 'John Doe', email: 'john@example.com', createdAt: new Date('2023-01-01') },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com', createdAt: new Date('2023-01-02') },
      { id: '3', name: 'Bob Smith', email: 'bob@example.com', createdAt: new Date('2023-01-03') }
    ];
    
    // Apply sorting
    if (sort) {
      users = [...users].sort((a, b) => {
        const { field, direction } = sort;
        const aValue = a[field.toLowerCase()];
        const bValue = b[field.toLowerCase()];
        
        if (aValue < bValue) {
          return direction === 'ASC' ? -1 : 1;
        }
        if (aValue > bValue) {
          return direction === 'ASC' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return users;
  }
}

mySchema.queryResolvers(UserQueryResolvers);
```

For multi-field sorting:

```typescript
class UserQueryResolvers {
  users(parent, { sort }, context, info) {
    let users = [
      { id: '1', name: 'John Doe', email: 'john@example.com', createdAt: new Date('2023-01-01') },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com', createdAt: new Date('2023-01-02') },
      { id: '3', name: 'Bob Smith', email: 'bob@example.com', createdAt: new Date('2023-01-03') }
    ];
    
    // Apply multi-field sorting
    if (sort && sort.length > 0) {
      users = [...users].sort((a, b) => {
        for (const { field, direction } of sort) {
          const aValue = a[field.toLowerCase()];
          const bValue = b[field.toLowerCase()];
          
          if (aValue < bValue) {
            return direction === 'ASC' ? -1 : 1;
          }
          if (aValue > bValue) {
            return direction === 'ASC' ? 1 : -1;
          }
        }
        return 0;
      });
    }
    
    return users;
  }
}

mySchema.queryResolvers(UserQueryResolvers);
```

## TypeORM Integration

The `@kiwano/typeorm` package provides an extension of the sorting plugin that integrates with TypeORM:

```typescript
import { modelSchema, sortPlugin } from '@kiwano/typeorm';
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

The TypeORM sorting plugin not only adds the necessary types and arguments to your schema but also implements the sorting logic in the resolvers.

## Sort Index Plugin

The TypeORM package also provides a sort index plugin that allows sorting by related fields:

```typescript
import { modelSchema, sortPlugin, sortIndexPlugin } from '@kiwano/typeorm';
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

## Combining Sorting with Other Plugins

You can combine the sorting plugin with other plugins:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(equalsFilterPlugin())
  .use(sortPlugin(['name', 'email', 'createdAt']))
  .use(offsetLimitPaginationPlugin())
);
```

This generates:

```graphql
input UserEqualsFilter {
  id: ID
  name: String
  email: String
  createdAt: Date
}

enum UserSortField {
  name
  email
  createdAt
}

enum SortDirection {
  ASC
  DESC
}

input UserSort {
  field: UserSortField!
  direction: SortDirection!
}

input OffsetLimitPagination {
  offset: Int
  limit: Int
}

type Query {
  users(filter: UserEqualsFilter, sort: UserSort, pagination: OffsetLimitPagination): [User]
}
```

## Complete Example

Here's a complete example of using the sorting plugin:

```typescript
import { schema, sortPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('createdAt', 'Date')
  )
  .query('users', '[User]', _ => _
    .use(sortPlugin(['name', 'email', 'createdAt']).multi())
    .resolver((parent, { sort }, context, info) => {
      let users = [
        { id: '1', name: 'John Doe', email: 'john@example.com', createdAt: new Date('2023-01-01') },
        { id: '2', name: 'Jane Doe', email: 'jane@example.com', createdAt: new Date('2023-01-02') },
        { id: '3', name: 'Bob Smith', email: 'bob@example.com', createdAt: new Date('2023-01-03') }
      ];
      
      // Apply multi-field sorting
      if (sort && sort.length > 0) {
        users = [...users].sort((a, b) => {
          for (const { field, direction } of sort) {
            const aValue = a[field.toLowerCase()];
            const bValue = b[field.toLowerCase()];
            
            if (aValue < bValue) {
              return direction === 'ASC' ? -1 : 1;
            }
            if (aValue > bValue) {
              return direction === 'ASC' ? 1 : -1;
            }
          }
          return 0;
        });
      }
      
      return users;
    })
  );
```

## Next Steps

Now that you understand the sorting plugin, you can explore other plugins:

- [Access Control (ACL)](acl.md): Control access to types and fields
- [Filtering](filtering.md): Add filtering capabilities to your queries
- [Pagination](pagination.md): Add pagination capabilities to your queries
- [Custom Plugins](custom-plugins.md): Create your own plugins
