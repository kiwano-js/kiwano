# Schema Customization

Kiwano provides numerous ways to customize your GraphQL schema. This guide explores advanced schema customization techniques that allow you to tailor your schema to your specific needs.

## Custom Schema Configuration

You can provide custom configuration for the GraphQL schema:

```typescript
import { schema } from '@kiwano/core';

const mySchema = schema()
  .customConfig({
    description: 'My GraphQL API',
    assumeValid: true,
    assumeValidSDL: true
  });
```

The `customConfig` method accepts any options that can be passed to the GraphQL schema constructor.

## Custom Scalar Types

You can add custom scalar types to your schema:

```typescript
import { schema } from '@kiwano/core';
import { GraphQLScalarType, Kind } from 'graphql';
import { DateTimeResolver, EmailAddressResolver, JSONResolver } from 'graphql-scalars';

// Create a custom scalar type
const PositiveIntScalar = new GraphQLScalarType({
  name: 'PositiveInt',
  description: 'A positive integer',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    if (typeof value !== 'number' || value <= 0 || !Number.isInteger(value)) {
      throw new Error('PositiveInt must be a positive integer');
    }
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.INT) {
      throw new Error('PositiveInt must be a positive integer');
    }
    const value = parseInt(ast.value, 10);
    if (value <= 0) {
      throw new Error('PositiveInt must be a positive integer');
    }
    return value;
  }
});

// Add scalar types to the schema
const mySchema = schema()
  .scalar(DateTimeResolver)
  .scalar(EmailAddressResolver)
  .scalar(JSONResolver)
  .scalar(PositiveIntScalar)
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'EmailAddress')
    .field('age', 'PositiveInt')
    .field('createdAt', 'DateTime')
    .field('metadata', 'JSON')
  );
```

## Custom Directives

You can add custom directives to your schema:

```typescript
import { schema } from '@kiwano/core';
import { GraphQLDirective, DirectiveLocation, GraphQLString } from 'graphql';

// Create a custom directive
const deprecatedDirective = new GraphQLDirective({
  name: 'deprecated',
  description: 'Marks a field as deprecated',
  locations: [DirectiveLocation.FIELD_DEFINITION],
  args: {
    reason: {
      type: GraphQLString,
      description: 'The reason for the deprecation'
    }
  }
});

// Add the directive to the schema
const mySchema = schema()
  .directive(deprecatedDirective)
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('oldField', 'String', _ => _
      .deprecationReason('Use newField instead')
    )
  );
```

## Schema Extensions

You can extend the schema with additional types and fields:

```typescript
import { schema } from '@kiwano/core';

// Create a base schema
const baseSchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
  )
  .query('users', '[User]');

// Extend the schema
const extendedSchema = schema()
  .merge(baseSchema)
  .object('User', _ => _
    .field('age', 'Int')
    .field('createdAt', 'Date')
  )
  .object('Post', _ => _
    .field('id', 'ID!')
    .field('title', 'String')
    .field('content', 'String')
    .field('author', 'User')
  )
  .query('post', 'Post', _ => _
    .arg('id', 'ID!')
  )
  .query('posts', '[Post]');
```

## Schema Middleware

You can add middleware to your schema:

```typescript
import { schema } from '@kiwano/core';
import { applyMiddleware } from 'graphql-middleware';

// Create a logging middleware
const loggingMiddleware = async (resolve, root, args, context, info) => {
  console.log(`Resolving ${info.fieldName}`);
  const result = await resolve(root, args, context, info);
  console.log(`Resolved ${info.fieldName}`);
  return result;
};

// Create an error handling middleware
const errorHandlingMiddleware = async (resolve, root, args, context, info) => {
  try {
    return await resolve(root, args, context, info);
  } catch (error) {
    console.error(`Error in ${info.fieldName}:`, error);
    throw error;
  }
};

// Add middleware to the schema
const mySchema = schema()
  .use(loggingMiddleware)
  .use(errorHandlingMiddleware)
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
  )
  .query('users', '[User]');
```

## Field-Level Middleware

You can add middleware to specific fields:

```typescript
import { schema } from '@kiwano/core';

// Create a field-level middleware
const authMiddleware = async (resolve, root, args, context, info) => {
  if (!context.user) {
    throw new Error('Unauthorized');
  }
  return resolve(root, args, context, info);
};

// Add middleware to specific fields
const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String', _ => _
      .use(authMiddleware)
    )
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
    .use(authMiddleware)
  )
  .query('users', '[User]', _ => _
    .use(authMiddleware)
  );
```

## Custom Resolvers

You can implement custom resolvers for your schema:

```typescript
import { schema } from '@kiwano/core';

// Create a schema with custom resolvers
const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('fullName', 'String', _ => _
      .resolver(user => `${user.firstName} ${user.lastName}`)
    )
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
    .resolver(async (_, { id }, context) => {
      return await context.dataSources.userAPI.getUser(id);
    })
  )
  .query('users', '[User]', _ => _
    .resolver(async (_, __, context) => {
      return await context.dataSources.userAPI.getAllUsers();
    })
  );
```

## Resolver Classes

You can organize resolvers in classes:

```typescript
import { schema } from '@kiwano/core';

// Create resolver classes
class UserQueryResolvers {
  async user(_, { id }, context) {
    return await context.dataSources.userAPI.getUser(id);
  }
  
  async users(_, __, context) {
    return await context.dataSources.userAPI.getAllUsers();
  }
}

class UserMutationResolvers {
  async createUser(_, { input }, context) {
    return await context.dataSources.userAPI.createUser(input);
  }
  
  async updateUser(_, { id, input }, context) {
    return await context.dataSources.userAPI.updateUser(id, input);
  }
  
  async deleteUser(_, { id }, context) {
    return await context.dataSources.userAPI.deleteUser(id);
  }
}

class UserResolvers {
  async posts(user, _, context) {
    return await context.dataSources.postAPI.getPostsByAuthor(user.id);
  }
}

// Add resolver classes to the schema
const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('posts', '[Post]')
  )
  .object('Post', _ => _
    .field('id', 'ID!')
    .field('title', 'String')
    .field('content', 'String')
    .field('author', 'User')
  )
  .queryResolvers(UserQueryResolvers)
  .mutationResolvers(UserMutationResolvers)
  .resolvers({
    User: UserResolvers
  });
```

## Schema Validation

You can validate your schema before building it:

```typescript
import { schema } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
  )
  .query('users', '[User]');

// Validate the schema
try {
  await mySchema.validate();
  console.log('Schema is valid');
} catch (error) {
  console.error('Schema validation failed:', error);
}

// Build the schema
const graphQLSchema = await mySchema.build();
```

## Schema Introspection

You can introspect your schema to get information about its types and fields:

```typescript
import { schema } from '@kiwano/core';
import { printSchema } from 'graphql';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
  )
  .query('users', '[User]');

// Build the schema
const graphQLSchema = await mySchema.build();

// Print the schema
const schemaString = printSchema(graphQLSchema);
console.log(schemaString);
```

## Schema Transformation

You can transform your schema before building it:

```typescript
import { schema } from '@kiwano/core';
import { transformSchema } from '@graphql-tools/schema';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
  )
  .query('users', '[User]');

// Build the schema
let graphQLSchema = await mySchema.build();

// Transform the schema
graphQLSchema = transformSchema(graphQLSchema, {
  // Add transformations here
});
```

## Schema Stitching

You can stitch multiple schemas together:

```typescript
import { schema } from '@kiwano/core';
import { stitchSchemas } from '@graphql-tools/stitch';

// Create user schema
const userSchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
  )
  .query('users', '[User]');

// Create post schema
const postSchema = schema()
  .object('Post', _ => _
    .field('id', 'ID!')
    .field('title', 'String')
    .field('content', 'String')
    .field('authorId', 'ID!')
  )
  .query('post', 'Post', _ => _
    .arg('id', 'ID!')
  )
  .query('posts', '[Post]');

// Build the schemas
const userGraphQLSchema = await userSchema.build();
const postGraphQLSchema = await postSchema.build();

// Stitch the schemas together
const stitchedSchema = stitchSchemas({
  subschemas: [
    { schema: userGraphQLSchema },
    { schema: postGraphQLSchema }
  ],
  // Add resolvers to connect the schemas
  resolvers: {
    Post: {
      author: {
        selectionSet: '{ authorId }',
        resolve(post, args, context, info) {
          return info.mergeInfo.delegateToSchema({
            schema: userGraphQLSchema,
            operation: 'query',
            fieldName: 'user',
            args: { id: post.authorId },
            context,
            info
          });
        }
      }
    },
    User: {
      posts: {
        selectionSet: '{ id }',
        resolve(user, args, context, info) {
          return info.mergeInfo.delegateToSchema({
            schema: postGraphQLSchema,
            operation: 'query',
            fieldName: 'posts',
            args: { authorId: user.id },
            context,
            info
          });
        }
      }
    }
  }
});
```

## Complete Example

Here's a complete example of schema customization:

```typescript
import { schema } from '@kiwano/core';
import { GraphQLScalarType, Kind } from 'graphql';
import { DateTimeResolver, EmailAddressResolver, JSONResolver } from 'graphql-scalars';

// Create a custom scalar type
const PositiveIntScalar = new GraphQLScalarType({
  name: 'PositiveInt',
  description: 'A positive integer',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    if (typeof value !== 'number' || value <= 0 || !Number.isInteger(value)) {
      throw new Error('PositiveInt must be a positive integer');
    }
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind !== Kind.INT) {
      throw new Error('PositiveInt must be a positive integer');
    }
    const value = parseInt(ast.value, 10);
    if (value <= 0) {
      throw new Error('PositiveInt must be a positive integer');
    }
    return value;
  }
});

// Create middleware
const loggingMiddleware = async (resolve, root, args, context, info) => {
  console.log(`Resolving ${info.fieldName}`);
  const result = await resolve(root, args, context, info);
  console.log(`Resolved ${info.fieldName}`);
  return result;
};

const authMiddleware = async (resolve, root, args, context, info) => {
  if (!context.user) {
    throw new Error('Unauthorized');
  }
  return resolve(root, args, context, info);
};

// Create resolver classes
class UserQueryResolvers {
  async user(_, { id }, context) {
    return await context.dataSources.userAPI.getUser(id);
  }
  
  async users(_, __, context) {
    return await context.dataSources.userAPI.getAllUsers();
  }
}

class UserMutationResolvers {
  async createUser(_, { input }, context) {
    return await context.dataSources.userAPI.createUser(input);
  }
  
  async updateUser(_, { id, input }, context) {
    return await context.dataSources.userAPI.updateUser(id, input);
  }
  
  async deleteUser(_, { id }, context) {
    return await context.dataSources.userAPI.deleteUser(id);
  }
}

class UserResolvers {
  async posts(user, _, context) {
    return await context.dataSources.postAPI.getPostsByAuthor(user.id);
  }
}

// Create the schema
const mySchema = schema()
  .customConfig({
    description: 'My GraphQL API'
  })
  .scalar(DateTimeResolver)
  .scalar(EmailAddressResolver)
  .scalar(JSONResolver)
  .scalar(PositiveIntScalar)
  .use(loggingMiddleware)
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'EmailAddress')
    .field('age', 'PositiveInt')
    .field('createdAt', 'DateTime')
    .field('metadata', 'JSON')
    .field('posts', '[Post]')
    .field('fullName', 'String', _ => _
      .resolver(user => `${user.firstName} ${user.lastName}`)
    )
  )
  .object('Post', _ => _
    .field('id', 'ID!')
    .field('title', 'String')
    .field('content', 'String')
    .field('author', 'User')
    .field('createdAt', 'DateTime')
  )
  .inputObject('CreateUserInput', _ => _
    .field('name', 'String!')
    .field('email', 'EmailAddress!')
    .field('age', 'PositiveInt')
  )
  .inputObject('UpdateUserInput', _ => _
    .field('name', 'String')
    .field('email', 'EmailAddress')
    .field('age', 'PositiveInt')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
    .use(authMiddleware)
  )
  .query('users', '[User]', _ => _
    .use(authMiddleware)
  )
  .mutation('createUser', 'User', _ => _
    .arg('input', 'CreateUserInput!')
    .use(authMiddleware)
  )
  .mutation('updateUser', 'User', _ => _
    .arg('id', 'ID!')
    .arg('input', 'UpdateUserInput!')
    .use(authMiddleware)
  )
  .mutation('deleteUser', 'Boolean', _ => _
    .arg('id', 'ID!')
    .use(authMiddleware)
  )
  .queryResolvers(UserQueryResolvers)
  .mutationResolvers(UserMutationResolvers)
  .resolvers({
    User: UserResolvers
  });

// Build the schema
const graphQLSchema = await mySchema.build();
```

## Next Steps

Now that you understand schema customization, you can explore:

- [Performance Optimization](performance-optimization.md): Learn how to optimize your GraphQL API
- [Error Handling](error-handling.md): Implement robust error handling
- [Testing](testing.md): Test your GraphQL API
- [Best Practices](best-practices.md): Learn best practices for building GraphQL APIs with Kiwano
