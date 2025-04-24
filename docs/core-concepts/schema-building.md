# Schema Building

The schema is the foundation of your GraphQL API. In Kiwano, you build schemas programmatically using the builder pattern.

## Creating a Schema

To create a schema, use the `schema()` function:

```typescript
import { schema } from '@kiwano/core';

const mySchema = schema();
```

You can optionally provide a name for the schema:

```typescript
const userSchema = schema('UserSchema');
```

## Adding Types

A schema consists of various types. Here's how to add different types to your schema:

### Object Types

Object types represent the structure of your data objects:

```typescript
mySchema.object('User', _ => _
  .field('id', 'ID!')
  .field('name', 'String')
  .field('email', 'String')
  .field('age', 'Int')
  .field('isActive', 'Boolean')
);
```

### Input Object Types

Input object types are used for complex arguments:

```typescript
mySchema.inputObject('UserInput', _ => _
  .field('name', 'String!')
  .field('email', 'String!')
  .field('age', 'Int')
  .field('isActive', 'Boolean')
);
```

### Enum Types

Enum types represent a set of allowed values:

```typescript
mySchema.enum('UserRole', _ => _
  .value('ADMIN', { description: 'Administrator' })
  .value('USER', { description: 'Regular user' })
  .value('GUEST', { description: 'Guest user' })
);
```

You can also define enums using an object:

```typescript
mySchema.enum('UserRole', {
  ADMIN: { description: 'Administrator' },
  USER: { description: 'Regular user' },
  GUEST: { description: 'Guest user' }
});
```

### Union Types

Union types represent a type that could be one of several object types:

```typescript
mySchema
  .object('Photo', _ => _
    .field('id', 'ID!')
    .field('url', 'String!')
  )
  .object('Video', _ => _
    .field('id', 'ID!')
    .field('url', 'String!')
    .field('duration', 'Int!')
  )
  .union('Media', ['Photo', 'Video']);
```

### Scalar Types

Kiwano includes the standard GraphQL scalar types (`ID`, `String`, `Int`, `Float`, `Boolean`). You can add custom scalar types:

```typescript
import { GraphQLScalarType } from 'graphql';

const DateScalar = new GraphQLScalarType({
  name: 'Date',
  description: 'Date custom scalar type',
  serialize(value) {
    return value.getTime();
  },
  parseValue(value) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.INT) {
      return new Date(parseInt(ast.value, 10));
    }
    return null;
  },
});

mySchema.scalar(DateScalar);
```

## Adding Operations

GraphQL APIs expose operations through queries and mutations.

### Queries

Queries are used to fetch data:

```typescript
mySchema.query('user', 'User', _ => _
  .arg('id', 'ID!')
  .resolver((_, { id }) => {
    // Fetch user by ID
    return { id, name: 'John Doe', email: 'john@example.com' };
  })
);

mySchema.query('users', '[User]', _ => _
  .resolver(() => {
    // Fetch all users
    return [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Doe', email: 'jane@example.com' }
    ];
  })
);
```

### Mutations

Mutations are used to modify data:

```typescript
mySchema.mutation('createUser', 'User', _ => _
  .arg('input', 'UserInput!')
  .resolver((_, { input }) => {
    // Create a new user
    const newUser = {
      id: String(Math.floor(Math.random() * 1000)),
      ...input
    };
    return newUser;
  })
);

mySchema.mutation('updateUser', 'User', _ => _
  .arg('id', 'ID!')
  .arg('input', 'UserInput!')
  .resolver((_, { id, input }) => {
    // Update user
    return { id, ...input };
  })
);

mySchema.mutation('deleteUser', 'Boolean', _ => _
  .arg('id', 'ID!')
  .resolver((_, { id }) => {
    // Delete user
    return true;
  })
);
```

## Adding Resolvers

Resolvers implement the logic for resolving fields. You can add resolvers in several ways:

### Inline Resolvers

You can add resolvers directly to fields:

```typescript
mySchema.query('user', 'User', _ => _
  .arg('id', 'ID!')
  .resolver((_, { id }) => {
    // Resolver implementation
    return { id, name: 'John Doe' };
  })
);
```

### Resolver Classes

You can organize resolvers in classes:

```typescript
class UserQueryResolvers {
  user(_, { id }) {
    // Resolver implementation
    return { id, name: 'John Doe' };
  }
  
  users() {
    // Resolver implementation
    return [
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Doe' }
    ];
  }
}

mySchema.queryResolvers(UserQueryResolvers);
```

### Object Type Resolvers

You can add resolvers for fields within object types:

```typescript
class UserResolvers {
  posts(user) {
    // Resolver implementation
    return [
      { id: '1', title: 'Post 1', authorId: user.id },
      { id: '2', title: 'Post 2', authorId: user.id }
    ];
  }
}

mySchema.resolvers({
  User: new UserResolvers()
});
```

## Building the Schema

After defining your schema, you need to build it to generate a GraphQL schema:

```typescript
const graphQLSchema = await mySchema.build();
```

The `build()` method returns a Promise that resolves to a GraphQL schema, which you can use with your GraphQL server:

```typescript
import { ApolloServer } from 'apollo-server';

const server = new ApolloServer({
  schema: graphQLSchema
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
```

## Schema Customization

You can customize the schema with additional options:

### Custom Configuration

You can provide custom configuration for the GraphQL schema:

```typescript
mySchema.customConfig({
  // Custom GraphQL schema configuration
  description: 'My GraphQL API'
});
```

### Middleware

You can add middleware to your schema:

```typescript
import { applyMiddleware } from 'graphql-middleware';

mySchema.use((resolve, root, args, context, info) => {
  // Middleware logic
  console.log(`Resolving ${info.fieldName}`);
  return resolve(root, args, context, info);
});
```

## Next Steps

Now that you understand how to build schemas in Kiwano, you can explore:

- [Types and Fields](types-and-fields.md): Learn more about the different types and fields
- [Queries and Mutations](queries-and-mutations.md): Dive deeper into defining operations
- [Resolvers](resolvers.md): Explore advanced resolver patterns
- [Modularization](modularization.md): Learn how to split your schema into reusable components
