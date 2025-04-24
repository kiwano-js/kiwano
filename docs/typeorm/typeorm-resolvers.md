# TypeORM Resolvers

Kiwano's TypeORM integration provides a powerful resolver system that automatically implements CRUD operations for your TypeORM models. This system is highly customizable, allowing you to override specific parts of the resolver logic while keeping the rest of the default implementation.

## Resolver Classes

The `@kiwano/typeorm` package includes several resolver classes:

- `ModelQueryResolvers`: Implements query resolvers (all, find)
- `ModelMutationResolvers`: Implements mutation resolvers (create, update, delete, restore)
- `ModelEntityResolvers`: Implements entity field resolvers (relationships)
- `AbstractModelResolvers`: Base class for all model resolvers

These classes are automatically used by model schemas:

```typescript
import { modelSchema } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

const userSchema = modelSchema(User, dataSource)
  .all()
  .find()
  .create()
  .update()
  .delete();
```

## Query Resolvers

The `ModelQueryResolvers` class implements resolvers for query operations:

### All Resolver

The all resolver fetches all entities of a given type:

```typescript
// Generated query
type Query {
  users: [User]
}

// Default implementation
class ModelQueryResolvers {
  async users(parent, args, context, info) {
    // Create query builder
    const queryBuilder = this.createAllQuery(args, context, info);
    
    // Apply filters, sorting, pagination
    this.applyAllQueryModifiers(queryBuilder, args, context, info);
    
    // Execute query
    const response = await this.executeAllQuery(queryBuilder, args, context, info);
    
    // Transform response
    return this.transformAllResponse(response, args, context, info);
  }
}
```

### Find Resolver

The find resolver fetches a single entity by ID:

```typescript
// Generated query
type Query {
  user(id: ID!): User
}

// Default implementation
class ModelQueryResolvers {
  async user(parent, args, context, info) {
    // Create query builder
    const queryBuilder = this.createFindQuery(args, context, info);
    
    // Apply filters
    this.applyFindQueryModifiers(queryBuilder, args, context, info);
    
    // Execute query
    const response = await this.executeFindQuery(queryBuilder, args, context, info);
    
    // Transform response
    return this.transformFindResponse(response, args, context, info);
  }
}
```

## Mutation Resolvers

The `ModelMutationResolvers` class implements resolvers for mutation operations:

### Create Resolver

The create resolver creates a new entity:

```typescript
// Generated mutation
type Mutation {
  createUser(input: CreateUserInput!): User
}

// Default implementation
class ModelMutationResolvers {
  async createUser(parent, args, context, info) {
    // Create entity
    let entity = this.createEntity(args, context, info);
    
    // Apply input
    entity = this.applyCreateInput(entity, args, context, info);
    
    // Before save hook
    entity = await this.beforeCreateSave(entity, args, context, info);
    
    // Save entity
    entity = await this.saveCreateEntity(entity, args, context, info);
    
    // After save hook
    entity = await this.afterCreateSave(entity, args, context, info);
    
    // Transform response
    return this.transformCreateResponse(entity, args, context, info);
  }
}
```

### Update Resolver

The update resolver updates an existing entity:

```typescript
// Generated mutation
type Mutation {
  updateUser(id: ID!, input: UpdateUserInput!): User
}

// Default implementation
class ModelMutationResolvers {
  async updateUser(parent, args, context, info) {
    // Find entity
    let entity = await this.findEntityToUpdate(args, context, info);
    
    // Apply input
    entity = this.applyUpdateInput(entity, args, context, info);
    
    // Before save hook
    entity = await this.beforeUpdateSave(entity, args, context, info);
    
    // Save entity
    entity = await this.saveUpdateEntity(entity, args, context, info);
    
    // After save hook
    entity = await this.afterUpdateSave(entity, args, context, info);
    
    // Transform response
    return this.transformUpdateResponse(entity, args, context, info);
  }
}
```

### Delete Resolver

The delete resolver deletes an entity:

```typescript
// Generated mutation
type Mutation {
  deleteUser(id: ID!): Boolean
}

// Default implementation
class ModelMutationResolvers {
  async deleteUser(parent, args, context, info) {
    // Find entity
    const entity = await this.findEntityToDelete(args, context, info);
    
    // Before delete hook
    await this.beforeDelete(entity, args, context, info);
    
    // Delete entity
    const result = await this.deleteEntity(entity, args, context, info);
    
    // After delete hook
    await this.afterDelete(entity, result, args, context, info);
    
    // Transform response
    return this.transformDeleteResponse(result, args, context, info);
  }
}
```

### Restore Resolver

The restore resolver restores a deleted entity (for soft-delete):

```typescript
// Generated mutation
type Mutation {
  restoreUser(id: ID!): User
}

// Default implementation
class ModelMutationResolvers {
  async restoreUser(parent, args, context, info) {
    // Find entity
    let entity = await this.findEntityToRestore(args, context, info);
    
    // Before restore hook
    entity = await this.beforeRestore(entity, args, context, info);
    
    // Restore entity
    entity = await this.restoreEntity(entity, args, context, info);
    
    // After restore hook
    entity = await this.afterRestore(entity, args, context, info);
    
    // Transform response
    return this.transformRestoreResponse(entity, args, context, info);
  }
}
```

## Entity Resolvers

The `ModelEntityResolvers` class implements resolvers for entity fields, particularly relationships:

```typescript
// Entity with relationships
type User {
  id: ID!
  name: String!
  posts: [Post]
}

// Default implementation
class ModelEntityResolvers {
  async posts(user, args, context, info) {
    // Load relation
    return await this.loadRelation('posts', user, args, context, info);
  }
}
```

## Customizing Resolvers

You can customize the default resolvers by extending the resolver classes:

```typescript
import { ModelQueryResolvers, ModelMutationResolvers } from '@kiwano/typeorm';

// Custom query resolvers
class CustomUserQueryResolvers extends ModelQueryResolvers {
  // Override the transformAllResponse method
  async transformAllResponse(response, args, context, info) {
    // Transform the response before returning it
    return response.map(user => ({
      ...user,
      name: user.name.toUpperCase()
    }));
  }
  
  // Override the applyAllQueryModifiers method
  applyAllQueryModifiers(queryBuilder, args, context, info) {
    // Call the parent method
    super.applyAllQueryModifiers(queryBuilder, args, context, info);
    
    // Add custom query modifiers
    queryBuilder.andWhere('user.isActive = :isActive', { isActive: true });
  }
}

// Custom mutation resolvers
class CustomUserMutationResolvers extends ModelMutationResolvers {
  // Override the beforeCreateSave method
  async beforeCreateSave(entity, args, context, info) {
    // Modify the entity before saving it
    entity.createdBy = context.currentUser?.id;
    entity.createdAt = new Date();
    
    return entity;
  }
  
  // Override the beforeUpdateSave method
  async beforeUpdateSave(entity, args, context, info) {
    // Modify the entity before saving it
    entity.updatedBy = context.currentUser?.id;
    entity.updatedAt = new Date();
    
    return entity;
  }
}

// Use custom resolvers
const userSchema = modelSchema(User, dataSource)
  .queryResolvers(CustomUserQueryResolvers)
  .mutationResolvers(CustomUserMutationResolvers)
  .all()
  .find()
  .create()
  .update()
  .delete();
```

## Resolver Hooks

The resolver classes provide numerous hooks that you can override to customize the behavior:

### Query Resolver Hooks

- **All Resolver**:
  - `createAllQuery`: Creates the query builder for the all query
  - `applyAllQueryModifiers`: Applies filters, sorting, and pagination to the query
  - `executeAllQuery`: Executes the query
  - `transformAllResponse`: Transforms the response before returning it

- **Find Resolver**:
  - `createFindQuery`: Creates the query builder for the find query
  - `applyFindQueryModifiers`: Applies filters to the query
  - `executeFindQuery`: Executes the query
  - `transformFindResponse`: Transforms the response before returning it

### Mutation Resolver Hooks

- **Create Resolver**:
  - `createEntity`: Creates a new entity instance
  - `applyCreateInput`: Applies the input to the entity
  - `beforeCreateSave`: Hook called before saving the entity
  - `saveCreateEntity`: Saves the entity
  - `afterCreateSave`: Hook called after saving the entity
  - `transformCreateResponse`: Transforms the response before returning it

- **Update Resolver**:
  - `findEntityToUpdate`: Finds the entity to update
  - `applyUpdateInput`: Applies the input to the entity
  - `beforeUpdateSave`: Hook called before saving the entity
  - `saveUpdateEntity`: Saves the entity
  - `afterUpdateSave`: Hook called after saving the entity
  - `transformUpdateResponse`: Transforms the response before returning it

- **Delete Resolver**:
  - `findEntityToDelete`: Finds the entity to delete
  - `beforeDelete`: Hook called before deleting the entity
  - `deleteEntity`: Deletes the entity
  - `afterDelete`: Hook called after deleting the entity
  - `transformDeleteResponse`: Transforms the response before returning it

- **Restore Resolver**:
  - `findEntityToRestore`: Finds the entity to restore
  - `beforeRestore`: Hook called before restoring the entity
  - `restoreEntity`: Restores the entity
  - `afterRestore`: Hook called after restoring the entity
  - `transformRestoreResponse`: Transforms the response before returning it

### Entity Resolver Hooks

- `loadRelation`: Loads a relation

## Resolver Options

You can configure resolver options when creating model schemas:

```typescript
import { modelSchema } from '@kiwano/typeorm';

const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .resolverOptions({
      relations: ['posts'], // Relations to eager load
      softDelete: true,     // Enable soft delete
      withDeleted: false    // Include deleted entities
    })
  )
  .find(_ => _
    .resolverOptions({
      relations: ['posts'], // Relations to eager load
      softDelete: true,     // Enable soft delete
      withDeleted: false    // Include deleted entities
    })
  )
  .create(_ => _
    .resolverOptions({
      relations: ['posts'], // Relations to eager load
      softDelete: true,     // Enable soft delete
    })
  )
  .update(_ => _
    .resolverOptions({
      relations: ['posts'], // Relations to eager load
      softDelete: true,     // Enable soft delete
    })
  )
  .delete(_ => _
    .resolverOptions({
      softDelete: true,     // Enable soft delete
    })
  );
```

## Plugin Integration

The TypeORM resolvers integrate with plugins to provide additional functionality:

```typescript
import { modelSchema, equalsFilterPlugin, sortPlugin, offsetLimitPaginationPlugin } from '@kiwano/typeorm';

const userSchema = modelSchema(User, dataSource)
  .all(_ => _
    .use(equalsFilterPlugin())
    .use(sortPlugin(['name', 'email', 'age']))
    .use(offsetLimitPaginationPlugin())
  )
  .find()
  .create()
  .update()
  .delete();
```

The TypeORM plugins not only add the necessary types and arguments to your schema but also implement the filtering, sorting, and pagination logic in the resolvers.

## Complete Example

Here's a complete example of customizing resolvers:

```typescript
import { modelSchema, ModelQueryResolvers, ModelMutationResolvers } from '@kiwano/typeorm';
import { dataSource } from './data-source';
import { User } from './entities/User';

// Custom query resolvers
class CustomUserQueryResolvers extends ModelQueryResolvers {
  // Override the createAllQuery method
  createAllQuery(args, context, info) {
    const queryBuilder = super.createAllQuery(args, context, info);
    
    // Add joins
    queryBuilder.leftJoinAndSelect('user.posts', 'posts');
    
    return queryBuilder;
  }
  
  // Override the applyAllQueryModifiers method
  applyAllQueryModifiers(queryBuilder, args, context, info) {
    // Call the parent method
    super.applyAllQueryModifiers(queryBuilder, args, context, info);
    
    // Add custom query modifiers
    queryBuilder.andWhere('user.isActive = :isActive', { isActive: true });
  }
  
  // Override the transformAllResponse method
  async transformAllResponse(response, args, context, info) {
    // Transform the response before returning it
    return response.map(user => ({
      ...user,
      name: user.name.toUpperCase()
    }));
  }
}

// Custom mutation resolvers
class CustomUserMutationResolvers extends ModelMutationResolvers {
  // Override the beforeCreateSave method
  async beforeCreateSave(entity, args, context, info) {
    // Validate input
    if (!entity.email.includes('@')) {
      throw new Error('Invalid email address');
    }
    
    // Set default values
    entity.createdBy = context.currentUser?.id;
    entity.createdAt = new Date();
    
    return entity;
  }
  
  // Override the beforeUpdateSave method
  async beforeUpdateSave(entity, args, context, info) {
    // Validate input
    if (entity.email && !entity.email.includes('@')) {
      throw new Error('Invalid email address');
    }
    
    // Set default values
    entity.updatedBy = context.currentUser?.id;
    entity.updatedAt = new Date();
    
    return entity;
  }
  
  // Override the afterCreateSave method
  async afterCreateSave(entity, args, context, info) {
    // Perform additional actions after saving
    await this.sendWelcomeEmail(entity);
    
    return entity;
  }
  
  // Custom method
  async sendWelcomeEmail(user) {
    // Send welcome email
    console.log(`Sending welcome email to ${user.email}`);
  }
}

// Use custom resolvers
const userSchema = modelSchema(User, dataSource)
  .queryResolvers(CustomUserQueryResolvers)
  .mutationResolvers(CustomUserMutationResolvers)
  .all(_ => _
    .resolverOptions({
      relations: ['posts'],
      softDelete: true
    })
  )
  .find(_ => _
    .resolverOptions({
      relations: ['posts'],
      softDelete: true
    })
  )
  .create()
  .update()
  .delete();
```

## Next Steps

Now that you understand TypeORM resolvers, you can explore:

- [Relationship Handling](relationship-handling.md): Learn how relationships are handled
- [TypeORM Plugins](typeorm-plugins.md): Discover TypeORM-specific plugins
- [Advanced Topics](../advanced/schema-customization.md): Explore advanced schema customization techniques
- [Best Practices](../advanced/best-practices.md): Learn best practices for building GraphQL APIs with Kiwano
