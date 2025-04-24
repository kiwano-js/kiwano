# Naming Strategies

Naming strategies in Kiwano allow you to customize how types and fields are named in your GraphQL schema. This is particularly useful for entity schemas, where many types and fields are generated automatically.

## What is a Naming Strategy?

A naming strategy is an object that defines how different elements of your schema should be named. It provides methods for generating names for:

- Entity object types
- Input object types
- Query fields
- Mutation fields
- Arguments
- And more

## Built-in Naming Strategies

Kiwano provides two built-in naming strategies:

### Compact Naming Strategy

The compact naming strategy generates concise names:

```typescript
import { entitySchema, compactNamingStrategy } from '@kiwano/core';

const userSchema = entitySchema('User')
  .naming(compactNamingStrategy())
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
  )
  .all()
  .find()
  .create()
  .update()
  .delete();
```

This generates names like:

- Entity object type: `User`
- All field: `users`
- Find field: `user`
- Create field: `createUser`
- Update field: `updateUser`
- Delete field: `deleteUser`
- Create input type: `CreateUserInput`
- Update input type: `UpdateUserInput`

### Descriptive Naming Strategy

The descriptive naming strategy generates more verbose, descriptive names:

```typescript
import { entitySchema, descriptiveNamingStrategy } from '@kiwano/core';

const userSchema = entitySchema('User')
  .naming(descriptiveNamingStrategy())
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
  )
  .all()
  .find()
  .create()
  .update()
  .delete();
```

This generates names like:

- Entity object type: `User`
- All field: `allUsers`
- Find field: `findUser`
- Create field: `createUser`
- Update field: `updateUser`
- Delete field: `deleteUser`
- Create input type: `CreateUserInput`
- Update input type: `UpdateUserInput`

## Default Naming Strategy

By default, entity schemas use the compact naming strategy. You can change the default naming strategy for all entity schemas:

```typescript
import { EntitySchemaBuilder, descriptiveNamingStrategy } from '@kiwano/core';

// Set the default naming strategy for all entity schemas
EntitySchemaBuilder.defaultNamingStrategy = descriptiveNamingStrategy();
```

## Custom Naming Strategies

You can create custom naming strategies by implementing the `EntityNamingStrategy` interface:

```typescript
import { EntityNamingStrategy } from '@kiwano/core';

const customNamingStrategy: EntityNamingStrategy = {
  // Entity object type
  entityObject: (entityName) => entityName,
  
  // Query fields
  allField: (entityName) => `get${entityName}s`,
  findField: (entityName) => `get${entityName}`,
  
  // Mutation fields
  createField: (entityName) => `add${entityName}`,
  updateField: (entityName) => `modify${entityName}`,
  deleteField: (entityName) => `remove${entityName}`,
  restoreField: (entityName) => `undelete${entityName}`,
  
  // Input object types
  createInputObject: (entityName) => `Add${entityName}Input`,
  updateInputObject: (entityName) => `Modify${entityName}Input`,
  
  // Arguments
  findFieldIdArgument: (entityName) => 'id',
  deleteFieldIdArgument: (entityName) => 'id',
  restoreFieldIdArgument: (entityName) => 'id',
  createFieldInputArgument: (entityName) => 'input',
  updateFieldInputArgument: (entityName) => 'input',
};

const userSchema = entitySchema('User')
  .naming(customNamingStrategy)
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
  )
  .all()
  .find()
  .create()
  .update()
  .delete();
```

This generates names like:

- Entity object type: `User`
- All field: `getUsers`
- Find field: `getUser`
- Create field: `addUser`
- Update field: `modifyUser`
- Delete field: `removeUser`
- Create input type: `AddUserInput`
- Update input type: `ModifyUserInput`

## Extending Naming Strategies

You can extend existing naming strategies to customize only specific aspects:

```typescript
import { compactNamingStrategy } from '@kiwano/core';

const customNamingStrategy = {
  ...compactNamingStrategy(),
  
  // Override only specific methods
  allField: (entityName) => `getAll${entityName}s`,
  findField: (entityName) => `getOne${entityName}`,
};

const userSchema = entitySchema('User')
  .naming(customNamingStrategy)
  .entity(_ => _
    .field('id', 'ID!')
    .field('name', 'String')
  )
  .all()
  .find()
  .create()
  .update()
  .delete();
```

This generates names like:

- All field: `getAllUsers`
- Find field: `getOneUser`
- Create field: `createUser` (from compact naming strategy)
- Update field: `updateUser` (from compact naming strategy)
- Delete field: `deleteUser` (from compact naming strategy)

## Naming Strategy Methods

The `EntityNamingStrategy` interface defines the following methods:

### Entity Object Type

- `entityObject(entityName: string): string`: Generates the name for the entity object type

### Query Fields

- `allField(entityName: string): string`: Generates the name for the all field
- `findField(entityName: string): string`: Generates the name for the find field

### Mutation Fields

- `createField(entityName: string): string`: Generates the name for the create field
- `updateField(entityName: string): string`: Generates the name for the update field
- `deleteField(entityName: string): string`: Generates the name for the delete field
- `restoreField(entityName: string): string`: Generates the name for the restore field

### Input Object Types

- `createInputObject(entityName: string): string`: Generates the name for the create input object type
- `updateInputObject(entityName: string): string`: Generates the name for the update input object type

### Arguments

- `findFieldIdArgument(entityName: string): string`: Generates the name for the ID argument of the find field
- `deleteFieldIdArgument(entityName: string): string`: Generates the name for the ID argument of the delete field
- `restoreFieldIdArgument(entityName: string): string`: Generates the name for the ID argument of the restore field
- `createFieldInputArgument(entityName: string): string`: Generates the name for the input argument of the create field
- `updateFieldInputArgument(entityName: string): string`: Generates the name for the input argument of the update field

## Next Steps

Now that you understand naming strategies, you can explore:

- [Entity Resolvers](entity-resolvers.md): Implement resolvers for entity operations
- [Plugins](../plugins/overview.md): Extend your schema with powerful plugins
- [TypeORM Integration](../typeorm/getting-started.md): Connect your entity schemas to a database with TypeORM
- [Advanced Topics](../advanced/schema-customization.md): Explore advanced schema customization techniques
