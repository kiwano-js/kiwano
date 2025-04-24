# Types and Fields

GraphQL schemas are built around types and fields. Kiwano provides a fluent API for defining various types and their fields.

## GraphQL Type System

GraphQL has a rich type system that includes:

- **Scalar Types**: Primitive types like `String`, `Int`, `Float`, `Boolean`, and `ID`
- **Object Types**: Complex types with fields
- **Input Object Types**: Complex types used for arguments
- **Enum Types**: Types with a restricted set of values
- **Union Types**: Types that can be one of several object types
- **Interface Types**: Abstract types that define a set of fields

Kiwano supports all these types through its builder API.

## Scalar Types

Kiwano includes the standard GraphQL scalar types:

- `ID`: A unique identifier
- `String`: A UTF-8 character sequence
- `Int`: A signed 32-bit integer
- `Float`: A signed double-precision floating-point value
- `Boolean`: `true` or `false`

You can use these scalar types directly in your field definitions:

```typescript
mySchema.object('User', _ => _
  .field('id', 'ID!')
  .field('name', 'String')
  .field('age', 'Int')
  .field('height', 'Float')
  .field('isActive', 'Boolean')
);
```

### Custom Scalar Types

You can add custom scalar types to your schema:

```typescript
import { GraphQLScalarType, Kind } from 'graphql';

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

// Now you can use the Date scalar in your fields
mySchema.object('Event', _ => _
  .field('id', 'ID!')
  .field('title', 'String')
  .field('date', 'Date')
);
```

## Object Types

Object types represent the structure of your data objects. They consist of fields, each with its own type.

### Defining Object Types

```typescript
mySchema.object('User', _ => _
  .field('id', 'ID!')
  .field('name', 'String')
  .field('email', 'String')
  .field('age', 'Int')
  .field('isActive', 'Boolean')
  .field('createdAt', 'Date')
);
```

### Field Options

Fields can have additional options:

```typescript
mySchema.object('User', _ => _
  .field('id', 'ID!', _ => _
    .description('The unique identifier for the user')
  )
  .field('name', 'String', _ => _
    .description('The user\'s full name')
    .deprecationReason('Use firstName and lastName instead')
  )
  .field('firstName', 'String', _ => _
    .description('The user\'s first name')
  )
  .field('lastName', 'String', _ => _
    .description('The user\'s last name')
  )
  .field('email', 'String', _ => _
    .description('The user\'s email address')
  )
);
```

### Field Resolvers

You can add resolvers directly to fields:

```typescript
mySchema.object('User', _ => _
  .field('id', 'ID!')
  .field('name', 'String')
  .field('posts', '[Post]', _ => _
    .resolver(user => {
      // Fetch posts for this user
      return [
        { id: '1', title: 'Post 1', authorId: user.id },
        { id: '2', title: 'Post 2', authorId: user.id }
      ];
    })
  )
);
```

### Non-Null and List Types

You can define non-null and list types using the GraphQL type notation or the builder methods:

```typescript
// Using GraphQL type notation
mySchema.object('User', _ => _
  .field('id', 'ID!')        // Non-null ID
  .field('name', 'String!')  // Non-null String
  .field('posts', '[Post]')  // List of Post
  .field('tags', '[String!]') // List of non-null String
  .field('friends', '[User!]!') // Non-null list of non-null User
);

// Using builder methods
mySchema.object('User', _ => _
  .field('id', 'ID', _ => _.nonNull())
  .field('name', 'String', _ => _.nonNull())
  .field('posts', 'Post', _ => _.list())
  .field('tags', 'String', _ => _.list().itemNonNull())
  .field('friends', 'User', _ => _.list().nonNull().itemNonNull())
);
```

## Input Object Types

Input object types are used for complex arguments in queries and mutations.

### Defining Input Object Types

```typescript
mySchema.inputObject('UserInput', _ => _
  .field('name', 'String!')
  .field('email', 'String!')
  .field('age', 'Int')
  .field('isActive', 'Boolean')
);
```

### Using Input Object Types

```typescript
mySchema.mutation('createUser', 'User', _ => _
  .arg('input', 'UserInput!')
  .resolver((_, { input }) => {
    // Create a new user
    return {
      id: String(Math.floor(Math.random() * 1000)),
      ...input
    };
  })
);
```

## Enum Types

Enum types represent a set of allowed values.

### Defining Enum Types

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

### Using Enum Types

```typescript
mySchema.object('User', _ => _
  .field('id', 'ID!')
  .field('name', 'String')
  .field('role', 'UserRole')
);
```

## Union Types

Union types represent a type that could be one of several object types.

### Defining Union Types

```typescript
mySchema
  .object('Photo', _ => _
    .field('id', 'ID!')
    .field('url', 'String!')
    .field('width', 'Int')
    .field('height', 'Int')
  )
  .object('Video', _ => _
    .field('id', 'ID!')
    .field('url', 'String!')
    .field('duration', 'Int!')
  )
  .union('Media', ['Photo', 'Video']);
```

### Using Union Types

```typescript
mySchema.object('Post', _ => _
  .field('id', 'ID!')
  .field('title', 'String!')
  .field('content', 'Media')
);
```

### Resolving Union Types

You need to provide a type resolver for union types:

```typescript
mySchema.resolvers({
  Media: {
    __resolveType(obj) {
      if (obj.duration) {
        return 'Video';
      }
      return 'Photo';
    }
  }
});
```

## Type References

You can reference types by name in your field definitions:

```typescript
mySchema
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('posts', '[Post]') // Reference to Post type
  )
  .object('Post', _ => _
    .field('id', 'ID!')
    .field('title', 'String')
    .field('author', 'User') // Reference to User type
  );
```

## Next Steps

Now that you understand types and fields in Kiwano, you can explore:

- [Queries and Mutations](queries-and-mutations.md): Learn how to define operations
- [Resolvers](resolvers.md): Implement the logic for resolving fields
- [Modularization](modularization.md): Split your schema into reusable components
- [Entity Schemas](../entity-schemas/introduction.md): Use entity schemas for CRUD operations
