# Error Handling

Proper error handling is crucial for building robust GraphQL APIs. This guide explores techniques for handling errors in your Kiwano GraphQL API.

## GraphQL Error Types

GraphQL has two main types of errors:

1. **Syntax Errors**: Errors in the GraphQL query syntax
2. **Validation Errors**: Errors that occur when a query doesn't match the schema
3. **Execution Errors**: Errors that occur during the execution of resolvers

Syntax and validation errors are handled automatically by the GraphQL engine. Execution errors need to be handled by your resolvers.

## Kiwano Error Classes

Kiwano provides several error classes that you can use in your resolvers:

```typescript
import { 
  NotFoundError, 
  ForbiddenError, 
  InvalidInputError, 
  UnauthorizedError,
  ConflictError,
  InternalError
} from '@kiwano/core';

// Example usage
const resolver = async (parent, args, context, info) => {
  // Not found error
  if (!user) {
    throw new NotFoundError(`User with ID ${id} not found`);
  }
  
  // Forbidden error
  if (!hasPermission(context.user, 'view', user)) {
    throw new ForbiddenError('You do not have permission to view this user');
  }
  
  // Invalid input error
  if (!isValidEmail(args.email)) {
    throw new InvalidInputError('Invalid email address');
  }
  
  // Unauthorized error
  if (!context.user) {
    throw new UnauthorizedError('You must be logged in to perform this action');
  }
  
  // Conflict error
  if (userExists(args.email)) {
    throw new ConflictError('A user with this email already exists');
  }
  
  // Internal error
  if (somethingWentWrong()) {
    throw new InternalError('Something went wrong');
  }
};
```

## Error Formatting

You can customize how errors are formatted in the response:

```typescript
import { ApolloServer } from 'apollo-server';
import { schema } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
    .resolver((_, { id }, context) => {
      if (!context.user) {
        throw new Error('Unauthorized');
      }
      
      const user = context.dataSources.userAPI.getUser(id);
      if (!user) {
        throw new Error('User not found');
      }
      
      return user;
    })
  );

const server = new ApolloServer({
  schema: await mySchema.build(),
  formatError: (error) => {
    // Log the error
    console.error('GraphQL Error:', error);
    
    // Format the error
    return {
      message: error.message,
      code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
      path: error.path,
      locations: error.locations,
      // Add custom fields
      timestamp: new Date().toISOString()
    };
  }
});
```

## Error Extensions

You can add additional information to errors using extensions:

```typescript
import { ApolloError } from 'apollo-server';

const resolver = async (parent, args, context, info) => {
  try {
    // Some code that might throw an error
    const result = await someOperation();
    return result;
  } catch (error) {
    // Add extensions to the error
    throw new ApolloError(
      'An error occurred',
      'CUSTOM_ERROR',
      {
        timestamp: new Date().toISOString(),
        details: error.message,
        // Add any other relevant information
      }
    );
  }
};
```

## Error Handling Middleware

You can use middleware to handle errors:

```typescript
import { schema } from '@kiwano/core';

// Create an error handling middleware
const errorHandlingMiddleware = async (resolve, root, args, context, info) => {
  try {
    return await resolve(root, args, context, info);
  } catch (error) {
    // Log the error
    console.error(`Error in ${info.fieldName}:`, error);
    
    // Rethrow the error
    throw error;
  }
};

// Add middleware to the schema
const mySchema = schema()
  .use(errorHandlingMiddleware)
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
  );
```

## Field-Level Error Handling

You can handle errors at the field level:

```typescript
import { schema } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String', _ => _
      .resolver((user) => {
        try {
          return user.email;
        } catch (error) {
          console.error('Error fetching email:', error);
          return null; // Return a fallback value
        }
      })
    )
  );
```

## Partial Results

GraphQL allows you to return partial results when some fields fail:

```typescript
import { schema } from '@kiwano/core';

const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('posts', '[Post]', _ => _
      .resolver((user, args, context) => {
        try {
          return context.dataSources.postAPI.getPostsByAuthor(user.id);
        } catch (error) {
          console.error('Error fetching posts:', error);
          return null; // Return null for this field
        }
      })
    )
  );
```

## Error Boundaries

You can create error boundaries to isolate errors:

```typescript
import { schema } from '@kiwano/core';

// Create an error boundary
const withErrorBoundary = (resolver) => {
  return async (parent, args, context, info) => {
    try {
      return await resolver(parent, args, context, info);
    } catch (error) {
      console.error(`Error in ${info.fieldName}:`, error);
      return null; // Return a fallback value
    }
  };
};

// Use the error boundary
const mySchema = schema()
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
    .field('posts', '[Post]', _ => _
      .resolver(withErrorBoundary((user, args, context) => {
        return context.dataSources.postAPI.getPostsByAuthor(user.id);
      }))
    )
  );
```

## Validation Errors

You can handle validation errors in your resolvers:

```typescript
import { schema, InvalidInputError } from '@kiwano/core';

// Create a validation function
const validateEmail = (email) => {
  if (!email) {
    throw new InvalidInputError('Email is required');
  }
  
  if (!email.includes('@')) {
    throw new InvalidInputError('Invalid email address');
  }
};

// Use the validation function in a resolver
const mySchema = schema()
  .inputObject('CreateUserInput', _ => _
    .field('name', 'String!')
    .field('email', 'String!')
  )
  .mutation('createUser', 'User', _ => _
    .arg('input', 'CreateUserInput!')
    .resolver((_, { input }, context) => {
      // Validate input
      validateEmail(input.email);
      
      // Create user
      return context.dataSources.userAPI.createUser(input);
    })
  );
```

## Error Logging

You can log errors for debugging and monitoring:

```typescript
import { schema } from '@kiwano/core';
import winston from 'winston';

// Create a logger
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log' })
  ]
});

// Create an error logging middleware
const errorLoggingMiddleware = async (resolve, root, args, context, info) => {
  try {
    return await resolve(root, args, context, info);
  } catch (error) {
    // Log the error
    logger.error({
      message: error.message,
      path: info.fieldName,
      args,
      stack: error.stack
    });
    
    // Rethrow the error
    throw error;
  }
};

// Add middleware to the schema
const mySchema = schema()
  .use(errorLoggingMiddleware)
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
  );
```

## Error Monitoring

You can integrate with error monitoring services:

```typescript
import { schema } from '@kiwano/core';
import * as Sentry from '@sentry/node';

// Initialize Sentry
Sentry.init({
  dsn: 'https://your-sentry-dsn.ingest.sentry.io/project-id'
});

// Create an error monitoring middleware
const sentryMiddleware = async (resolve, root, args, context, info) => {
  try {
    return await resolve(root, args, context, info);
  } catch (error) {
    // Capture the error
    Sentry.captureException(error, {
      extra: {
        path: info.fieldName,
        args,
        user: context.user?.id
      }
    });
    
    // Rethrow the error
    throw error;
  }
};

// Add middleware to the schema
const mySchema = schema()
  .use(sentryMiddleware)
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
  );
```

## TypeORM Error Handling

When using TypeORM, you can handle database errors:

```typescript
import { modelSchema, ModelMutationResolvers } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';
import { QueryFailedError } from 'typeorm';
import { ConflictError, InvalidInputError, InternalError } from '@kiwano/core';

class CustomUserMutationResolvers extends ModelMutationResolvers {
  async saveCreateEntity(entity, args, context, info) {
    try {
      return await super.saveCreateEntity(entity, args, context, info);
    } catch (error) {
      // Handle specific database errors
      if (error instanceof QueryFailedError) {
        // Check for unique constraint violation
        if (error.message.includes('duplicate key')) {
          throw new ConflictError('A user with this email already exists');
        }
        
        // Check for foreign key constraint violation
        if (error.message.includes('foreign key constraint')) {
          throw new InvalidInputError('Invalid reference to a related entity');
        }
      }
      
      // Log and rethrow other errors
      console.error('Database error:', error);
      throw new InternalError('An error occurred while saving the entity');
    }
  }
}

const userSchema = modelSchema(User, dataSource)
  .mutationResolvers(CustomUserMutationResolvers)
  .all()
  .find()
  .create()
  .update()
  .delete();
```

## Complete Example

Here's a complete example of error handling:

```typescript
import { schema, NotFoundError, ForbiddenError, InvalidInputError, UnauthorizedError, ConflictError, InternalError } from '@kiwano/core';
import { modelSchema, ModelQueryResolvers, ModelMutationResolvers } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';
import { ApolloServer } from 'apollo-server';
import * as Sentry from '@sentry/node';
import winston from 'winston';

// Initialize Sentry
Sentry.init({
  dsn: 'https://your-sentry-dsn.ingest.sentry.io/project-id'
});

// Create a logger
const logger = winston.createLogger({
  level: 'error',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log' })
  ]
});

// Create middleware
const errorHandlingMiddleware = async (resolve, root, args, context, info) => {
  try {
    return await resolve(root, args, context, info);
  } catch (error) {
    // Log the error
    logger.error({
      message: error.message,
      path: info.fieldName,
      args,
      stack: error.stack
    });
    
    // Capture the error
    Sentry.captureException(error, {
      extra: {
        path: info.fieldName,
        args,
        user: context.user?.id
      }
    });
    
    // Rethrow the error
    throw error;
  }
};

// Create custom resolvers
class CustomUserQueryResolvers extends ModelQueryResolvers {
  async user(parent, { id }, context, info) {
    // Check authentication
    if (!context.user) {
      throw new UnauthorizedError('You must be logged in to view users');
    }
    
    // Find the user
    const user = await super.user(parent, { id }, context, info);
    
    // Check if the user exists
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    
    // Check permissions
    if (!hasPermission(context.user, 'view', user)) {
      throw new ForbiddenError('You do not have permission to view this user');
    }
    
    return user;
  }
}

class CustomUserMutationResolvers extends ModelMutationResolvers {
  async beforeCreateSave(entity, args, context, info) {
    // Check authentication
    if (!context.user) {
      throw new UnauthorizedError('You must be logged in to create users');
    }
    
    // Check permissions
    if (!hasPermission(context.user, 'create', 'user')) {
      throw new ForbiddenError('You do not have permission to create users');
    }
    
    // Validate input
    if (!isValidEmail(entity.email)) {
      throw new InvalidInputError('Invalid email address');
    }
    
    // Check for conflicts
    const existingUser = await context.dataSources.userAPI.getUserByEmail(entity.email);
    if (existingUser) {
      throw new ConflictError('A user with this email already exists');
    }
    
    // Set default values
    entity.createdBy = context.user.id;
    entity.createdAt = new Date();
    
    return entity;
  }
  
  async saveCreateEntity(entity, args, context, info) {
    try {
      return await super.saveCreateEntity(entity, args, context, info);
    } catch (error) {
      // Handle specific database errors
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw new ConflictError('A user with this email already exists');
      }
      
      // Log and rethrow other errors
      console.error('Database error:', error);
      throw new InternalError('An error occurred while saving the user');
    }
  }
}

// Create model schema
const userSchema = modelSchema(User, dataSource)
  .queryResolvers(CustomUserQueryResolvers)
  .mutationResolvers(CustomUserMutationResolvers)
  .all()
  .find()
  .create()
  .update()
  .delete();

// Create main schema
const mainSchema = schema()
  .use(errorHandlingMiddleware)
  .merge(userSchema);

// Create a GraphQL server
const server = new ApolloServer({
  schema: await mainSchema.build(),
  context: ({ req }) => {
    // Create a new context for each request
    return {
      user: getUserFromRequest(req),
      dataSources: {
        userAPI: new UserAPI()
      }
    };
  },
  formatError: (error) => {
    // Format the error
    return {
      message: error.message,
      code: error.extensions?.code || 'INTERNAL_SERVER_ERROR',
      path: error.path,
      locations: error.locations,
      // Add custom fields
      timestamp: new Date().toISOString()
    };
  }
});

// Start the server
server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
```

## Next Steps

Now that you understand error handling, you can explore:

- [Testing](testing.md): Test your GraphQL API
- [Best Practices](best-practices.md): Learn best practices for building GraphQL APIs with Kiwano
