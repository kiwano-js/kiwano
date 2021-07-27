# Concepts

## Elements
GraphQL consists of a schema which contains several types and fields. 
Kiwano provides representations of these elements, which can be built as their official GraphQL counterpart.
Therefore, the Kiwano elements can be considered as **builders**, because they enable you to configure the element and subsequently build it as GraphQL element.

Both schemas and schema members can be built using the `build()` method. 
However, in practice you will only need to use the build-method on the root schema, since schema members and merged schemas will be automatically built and added to the generated GraphQL schema.

> Almost every builder method returns the builder itself, enabling you to chain.

### Schema
The `schema` builder is the main element of Kiwano, providing an interface to configure your GraphQL schema.

Schemas may contain:
- Members like object types, enums, scalars etc;
- A naming strategy;
- `query` and `mutation` fields;
- Resolvers, bundled in query-resolvers and mutation-resolvers (and entity-resolvers for entity schemas);
- Access rules (ACL);
- Sub-schemas;
- Plug-ins;
- Middleware.

> See the [Schema](basics/schema.md) section for more details about schemas.

### Schema members
Schema member like object type or enums can be added to the schema using the corresponding methods.
For example, to add an object-type to a schema, use the `object()` method:

```typescript
schema.object('User')
```

Kiwano supports the following schema members:
- Object type
- Scalar type
- Enum type and enum values
- Fields and arguments
- Input object type and input fields
- Union type

> See [Object types & fields](basics/types.md) and [Enums](basics/enums.md) for more details about schema members.

### Resolvers
GraphQL enables you to assign a resolver to each field, this resolver is executed when the user queries the corresponding field, and should return the value for the field.

With Kiwano you can assign a resolver function to a field, using the `resolver()` method.
However, Kiwano additionally enables you to bundle resolvers into an object or a resolver-class.
You can either bundle all schema resolvers, or choose to bundle both query-resolvers, mutation-resolvers and object-resolvers.

> See the [Resolvers](basics/resolvers.md) section for more details about resolvers.

### Access rules
Schemas, object types and field may contain access rules. 
These rules specify which user-roles have access to the resource, or are specifically denied a particular resource.

For example, to allow users with the role `admin` to execute the mutation `createProject`, call the `allow` method on the type:

```typescript
createProjectMutation.allow('admin')
```

When a schema or schema member is built to their GraphQL counterpart, Kiwano will add the following extensions: `allowedRoles` and `deniedRoles`.
These contain an array with the roles that are specified in the builder.
In the example above, the mutation field will contain the value `['admin']` for the `allowedRoles` extension.

By default, you are responsible to enforce the access rules in you resolvers or using middleware. 
The Kiwano builders only enable you to configure access rules, but don't do anything to check whether a user has access to a particular resolver.

However, Kiwano also provides an [Access control (ACL)](plugins/acl.md) plugin that will enforce access rules automatically for you.

### Sub-schemas

### Plug-ins & middleware

## Instantiation
Builder functions that return Builder class etc

## Providing elements

### Configurators

### Pass elements directly

## Naming
> Automatic naming is only supported for `entitySchema` or derivatives like `modelSchema`

### Automatic

### Manual