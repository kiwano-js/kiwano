# Access Control (ACL) Plugin

The Access Control List (ACL) plugin in Kiwano allows you to control access to types and fields based on roles. This is a powerful way to implement authorization in your GraphQL API.

## Basic Usage

To use the ACL plugin, first import it and add it to your schema:

```typescript
import { schema, aclPlugin } from '@kiwano/core';

const mySchema = schema()
  .use(aclPlugin());
```

Then, you can define access rules for types and fields:

```typescript
mySchema
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String', _ => _
      .allow('ADMIN')
      .deny('GUEST')
    )
    .field('role', 'String')
    .allow('ADMIN', 'USER')
    .deny('GUEST')
  )
  .query('users', '[User]', _ => _
    .allow('ADMIN')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
    .allow('ADMIN', 'USER')
  );
```

## Access Rules

The ACL plugin provides several methods for defining access rules:

### Allow Rules

The `allow` method specifies which roles are allowed to access a type or field:

```typescript
// Allow ADMIN role to access the User type
mySchema.object('User', _ => _
  .allow('ADMIN')
);

// Allow ADMIN and USER roles to access the name field
mySchema.object('User', _ => _
  .field('name', 'String', _ => _
    .allow('ADMIN', 'USER')
  )
);
```

### Deny Rules

The `deny` method specifies which roles are denied access to a type or field:

```typescript
// Deny GUEST role access to the User type
mySchema.object('User', _ => _
  .deny('GUEST')
);

// Deny GUEST role access to the email field
mySchema.object('User', _ => _
  .field('email', 'String', _ => _
    .deny('GUEST')
  )
);
```

### Rule Precedence

When both allow and deny rules are specified, the deny rules take precedence:

```typescript
// GUEST is denied access even though USER is allowed
mySchema.object('User', _ => _
  .allow('ADMIN', 'USER')
  .deny('GUEST', 'USER')
);
```

### Rule Inheritance

Rules defined at a higher level are inherited by lower levels:

```typescript
// The User type and all its fields allow ADMIN and deny GUEST
mySchema.object('User', _ => _
  .allow('ADMIN')
  .deny('GUEST')
  .field('id', 'ID!')
  .field('name', 'String')
  .field('email', 'String')
);

// The email field overrides the inherited rules
mySchema.object('User', _ => _
  .allow('ADMIN')
  .deny('GUEST')
  .field('id', 'ID!')
  .field('name', 'String')
  .field('email', 'String', _ => _
    .allow('ADMIN', 'USER')
    .deny('GUEST')
  )
);
```

## Schema-Level Rules

You can define access rules at the schema level, which will be inherited by all types and fields:

```typescript
const mySchema = schema()
  .use(aclPlugin())
  .allow('ADMIN')
  .deny('GUEST');
```

You can also define rules specifically for queries and mutations:

```typescript
const mySchema = schema()
  .use(aclPlugin())
  .allowQuery('ADMIN', 'USER')
  .denyQuery('GUEST')
  .allowMutation('ADMIN')
  .denyMutation('USER', 'GUEST');
```

## Entity Schema Rules

For entity schemas, you can define rules for the entity type:

```typescript
import { entitySchema, aclPlugin } from '@kiwano/core';

const userSchema = entitySchema('User')
  .use(aclPlugin())
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String')
  )
  .allowEntity('ADMIN', 'USER')
  .denyEntity('GUEST')
  .all(_ => _
    .allow('ADMIN')
  )
  .find(_ => _
    .allow('ADMIN', 'USER')
  )
  .create(_ => _
    .allow('ADMIN')
  )
  .update(_ => _
    .allow('ADMIN')
  )
  .delete(_ => _
    .allow('ADMIN')
  );
```

## ACL Middleware

The ACL plugin adds middleware to your schema that checks access rules at runtime. The middleware expects a `roles` array in the context:

```typescript
import { ApolloServer } from 'apollo-server';

const server = new ApolloServer({
  schema: await mySchema.build(),
  context: ({ req }) => {
    // Get roles from the request (e.g., from JWT token)
    const roles = getRolesFromRequest(req);
    
    return {
      roles
    };
  }
});
```

If a user doesn't have the required roles to access a field, the middleware will throw a `ForbiddenError`.

## Custom ACL Plugin

You can create a custom ACL plugin with specific options:

```typescript
import { aclPlugin } from '@kiwano/core';

const customAclPlugin = aclPlugin({
  // Custom options
  contextPath: 'user.roles', // Path to roles in the context
  defaultAllow: true,        // Default allow behavior
  defaultDeny: false         // Default deny behavior
});

const mySchema = schema()
  .use(customAclPlugin);
```

### ACL Plugin Options

The ACL plugin accepts the following options:

- `contextPath`: The path to the roles array in the context (default: `'roles'`)
- `defaultAllow`: Whether to allow access by default if no allow rules are specified (default: `false`)
- `defaultDeny`: Whether to deny access by default if no deny rules are specified (default: `false`)

## Complete Example

Here's a complete example of using the ACL plugin:

```typescript
import { schema, aclPlugin } from '@kiwano/core';
import { ApolloServer } from 'apollo-server';

// Create a schema with ACL
const mySchema = schema()
  .use(aclPlugin())
  
  // Schema-level rules
  .allow('ADMIN')
  .denyQuery('GUEST')
  .allowMutation('ADMIN')
  .denyMutation('USER', 'GUEST')
  
  // User type
  .object('User', _ => _
    .field('id', 'ID!')
    .field('name', 'String')
    .field('email', 'String', _ => _
      .allow('ADMIN', 'USER')
      .deny('GUEST')
    )
    .field('role', 'String', _ => _
      .allow('ADMIN')
    )
    .allow('ADMIN', 'USER')
    .deny('GUEST')
  )
  
  // Post type
  .object('Post', _ => _
    .field('id', 'ID!')
    .field('title', 'String')
    .field('content', 'String')
    .field('author', 'User')
    .allow('ADMIN', 'USER', 'GUEST')
  )
  
  // Queries
  .query('users', '[User]', _ => _
    .allow('ADMIN')
  )
  .query('user', 'User', _ => _
    .arg('id', 'ID!')
    .allow('ADMIN', 'USER')
  )
  .query('posts', '[Post]', _ => _
    .allow('ADMIN', 'USER', 'GUEST')
  )
  
  // Mutations
  .mutation('createUser', 'User', _ => _
    .arg('input', 'CreateUserInput!')
    .allow('ADMIN')
  )
  .mutation('updateUser', 'User', _ => _
    .arg('id', 'ID!')
    .arg('input', 'UpdateUserInput!')
    .allow('ADMIN')
  )
  .mutation('deleteUser', 'Boolean', _ => _
    .arg('id', 'ID!')
    .allow('ADMIN')
  );

// Create a server with context
const server = new ApolloServer({
  schema: await mySchema.build(),
  context: ({ req }) => {
    // Get roles from the request
    const roles = getRolesFromRequest(req);
    
    return {
      roles
    };
  }
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
```

## Next Steps

Now that you understand the ACL plugin, you can explore other plugins:

- [Filtering](filtering.md): Add filtering capabilities to your queries
- [Pagination](pagination.md): Add pagination capabilities to your queries
- [Sorting](sorting.md): Add sorting capabilities to your queries
- [Custom Plugins](custom-plugins.md): Create your own plugins
