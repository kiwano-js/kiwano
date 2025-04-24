# Filtering Plugins

Kiwano provides several filtering plugins that allow you to add filtering capabilities to your queries. These plugins generate input types and arguments that enable clients to filter the results of your queries.

## Available Filtering Plugins

Kiwano includes the following filtering plugins:

- **Equals Filter Plugin**: Allows filtering by exact value matches
- **Search Filter Plugin**: Allows searching across multiple fields

## Equals Filter Plugin

The equals filter plugin allows filtering by exact value matches.

### Basic Usage

```typescript
import { schema, equalsFilterPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('age', 'Int')
  )
  .query('users', '[User]', _ => _
    .use(equalsFilterPlugin())
  );
```

This generates:

- An input object type named `UserEqualsFilter` with fields corresponding to the fields in the `User` type
- An argument named `filter` of type `UserEqualsFilter` for the `users` query

The generated GraphQL schema will look like:

```graphql
input UserEqualsFilter {
  id: ID
  name: String
  email: String
  age: Int
}

type Query {
  users(filter: UserEqualsFilter): [User]
}
```

### Configuration Options

The equals filter plugin accepts several configuration options:

```typescript
mySchema.query('users', '[User]', _ => _
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

### Including and Excluding Fields

You can control which fields are included in the filter:

```typescript
// Include only specific fields
mySchema.query('users', '[User]', _ => _
  .use(equalsFilterPlugin().include('name', 'email'))
);

// Exclude specific fields
mySchema.query('users', '[User]', _ => _
  .use(equalsFilterPlugin().exclude('password'))
);
```

### Multiple Values

You can allow filtering by multiple values:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(equalsFilterPlugin().multi())
);
```

This generates an input type where each field is an array:

```graphql
input UserEqualsFilter {
  id: [ID]
  name: [String]
  email: [String]
  age: [Int]
}
```

### Custom Fields

You can add custom fields to the filter:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(equalsFilterPlugin()
    .field('minAge', 'Int')
    .field('maxAge', 'Int')
  )
);
```

### Manual Mode

In manual mode, the plugin doesn't automatically generate fields based on the target type:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(equalsFilterPlugin().manual()
    .field('name', 'String')
    .field('email', 'String')
  )
);
```

### Custom Argument Name

You can customize the name of the filter argument:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(equalsFilterPlugin().argumentName('where'))
);
```

### Custom Input Type Name

You can customize the name of the input type:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(equalsFilterPlugin().inputName(name => `${name}WhereInput`))
);
```

## Search Filter Plugin

The search filter plugin allows searching across multiple fields.

### Basic Usage

```typescript
import { schema, searchFilterPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('bio', 'String')
  )
  .query('users', '[User]', _ => _
    .use(searchFilterPlugin(['name', 'email', 'bio']))
  );
```

This generates:

- An argument named `search` of type `String` for the `users` query

The generated GraphQL schema will look like:

```graphql
type Query {
  users(search: String): [User]
}
```

### Configuration Options

The search filter plugin accepts several configuration options:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(searchFilterPlugin(['name', 'email'], {
    argumentName: 'search',       // Name of the search argument
    description: 'Search users'   // Description of the search argument
  }))
);
```

### Custom Argument Name

You can customize the name of the search argument:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(searchFilterPlugin(['name', 'email']).argumentName('query'))
);
```

## Combining Filtering Plugins

You can combine multiple filtering plugins:

```typescript
mySchema.query('users', '[User]', _ => _
  .use(equalsFilterPlugin())
  .use(searchFilterPlugin(['name', 'email', 'bio']))
);
```

This generates:

```graphql
input UserEqualsFilter {
  id: ID
  name: String
  email: String
  bio: String
}

type Query {
  users(filter: UserEqualsFilter, search: String): [User]
}
```

## Implementing Filter Resolvers

The filtering plugins only add the necessary types and arguments to your schema. You need to implement the filtering logic in your resolvers:

```typescript
class UserQueryResolvers {
  users(parent, { filter, search }, context, info) {
    let users = [
      { id: '1', name: 'John Doe', email: 'john@example.com', bio: 'Software Engineer' },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com', bio: 'Product Manager' },
      { id: '3', name: 'Bob Smith', email: 'bob@example.com', bio: 'Designer' }
    ];
    
    // Apply equals filter
    if (filter) {
      users = users.filter(user => {
        for (const [key, value] of Object.entries(filter)) {
          if (value !== undefined && user[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user => {
        return (
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.bio.toLowerCase().includes(searchLower)
        );
      });
    }
    
    return users;
  }
}

mySchema.queryResolvers(UserQueryResolvers);
```

## TypeORM Integration

The `@kiwano/typeorm` package provides extensions of the filtering plugins that integrate with TypeORM:

```typescript
import { modelSchema, equalsFilterPlugin, searchFilterPlugin } from '@kiwano/typeorm';
import { User } from './entities/User';

const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .use(equalsFilterPlugin())
    .use(searchFilterPlugin(['name', 'email', 'bio']))
  )
  .find()
  .create()
  .update()
  .delete();
```

The TypeORM filtering plugins not only add the necessary types and arguments to your schema but also implement the filtering logic in the resolvers.

## Complete Example

Here's a complete example of using filtering plugins:

```typescript
import { schema, equalsFilterPlugin, searchFilterPlugin } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('age', 'Int')
    .field('bio', 'String')
  )
  .query('users', '[User]', _ => _
    .use(equalsFilterPlugin({
      exclude: ['password'],
      multi: true
    }))
    .use(searchFilterPlugin(['name', 'email', 'bio']))
    .resolver((parent, { filter, search }, context, info) => {
      let users = [
        { id: '1', name: 'John Doe', email: 'john@example.com', age: 30, bio: 'Software Engineer' },
        { id: '2', name: 'Jane Doe', email: 'jane@example.com', age: 28, bio: 'Product Manager' },
        { id: '3', name: 'Bob Smith', email: 'bob@example.com', age: 35, bio: 'Designer' }
      ];
      
      // Apply equals filter
      if (filter) {
        users = users.filter(user => {
          for (const [key, value] of Object.entries(filter)) {
            if (value === undefined) continue;
            
            if (Array.isArray(value)) {
              if (!value.includes(user[key])) {
                return false;
              }
            } else if (user[key] !== value) {
              return false;
            }
          }
          return true;
        });
      }
      
      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        users = users.filter(user => {
          return (
            user.name.toLowerCase().includes(searchLower) ||
            user.email.toLowerCase().includes(searchLower) ||
            user.bio.toLowerCase().includes(searchLower)
          );
        });
      }
      
      return users;
    })
  );
```

## Next Steps

Now that you understand filtering plugins, you can explore other plugins:

- [Access Control (ACL)](acl.md): Control access to types and fields
- [Pagination](pagination.md): Add pagination capabilities to your queries
- [Sorting](sorting.md): Add sorting capabilities to your queries
- [Custom Plugins](custom-plugins.md): Create your own plugins
