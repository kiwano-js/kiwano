# Schema
The `schema` builder is the main element of Kiwano, providing an interface to configure your GraphQL schema.

Schemas builders can be created by using the `schema()` factory function. 
You can optionally provide a name for your schema as an argument, but this name is only used for [Entity Schemas](entity-schema/entity-schema.md)

```typescript
import { schema } from '@kiwano/core'

const mySchema = schema();
```

> Note that the result of the `schema()` function is not a GraphQL schema for use in other libraries yet, use the `build()` method to generate the GraphQL schema for your configured builder.

Your schema can be configured using the methods below, 
Most importantly, elements can be added to you schema, like object types, query fields, input object types etc.
Please make sure you've read the [Concepts](basics/concepts.md) section first for information about different ways to add elements to your schema.

#### Object, InputObject, Union

`.object(name, [configurator])` or `.object(objectType)`

Adds an object-type to the schema.

`.inputObject(name, [configurator])` or `.inputObject(objectType)`

Adds an input object-type to the schema.

`.union(name, types)`, `.union(name, [configurator])` or `.union(unionType)`

Adds a union-type to the schema. The types in the union can be specified in two ways:

```typescript
schema.union('Animal', ['Dog', 'Cat'])
```

Or using a configurator / passing the type:

```typescript
schema.union('Animal', _ => _.type('Dog', 'Cat'))
// OR
schema.union(unionType('Animal').type('Dog', 'Cat'))
```

#### Enum

`.enum(name, enum)`, `.enum(name, [configurator])` or `.enum(enumType)`

Adds an enum-type to the schema, enum-types can be configured manually or automatically. 
When using an automatic enum-type, the values of the passed enum object are added by Kiwano:

```typescript
enum ProjectState {
    CONCEPT, PUBLISHED, ARCHIVED
}

schema.enum('ProjectState', ProjectState)
```

However, you can always choose to configure te enum-type manually:

```typescript
schema.enum('ProjectState', _ => _
    .value('CONCEPT', 0)
    .value('PUBLISHED', 1)
    .value('ARCHIVED', 2, _ => _.description('Project is archived'))
)
```

As you can see, values can be configured as well. This enables you to add descriptions or extensions to enum values.

#### Scalar

`.scalar(scalarType)`

Use the `scalar()` method to add a scalar to your schema. 
You should pass a [GraphQLScalarType](https://graphql.org/graphql-js/type/#graphqlscalartype) here, which you can create manually or use a scalar provided by an external package.

#### Query, Mutation

`.query(name, type, [configurator])` or `.query(queryField)`

Adds a `Query` field to the schema, like this:

```typescript
schema.query('users', '[User]', _ => _.description('Returns all users'))
```

`.mutation(name, type, [configurator])` or `.mutation(mutationField)`

Adds a `Mutation` field to the schema. 
The root `Mutation` type is added to your schema automatically when you add one or more mutation fields to the schema.

#### Resolvers, QueryResolvers, MutationResolvers

These methods allow you to add a collection of resolvers to the schema. 
In addition to defining a resolver per field, you can bundle resolvers into a resolver class or object.
This resolver class/object contains methods corresponding to the field names.
You can specify all resolvers in one class and pass it to the `resolvers()` method, but you will likely use a specific class for both query-resolvers and mutation-resolvers.

For all resolver methods, you can both use a class or an object:

```typescript
class ProjectQueryResolvers {
    
    users(){
        // TODO: Implement
    }
}

schema.queryResolvers(ProjectQueryResolvers)

// OR

schema.queryResolvers({

    users(){
        // TODO: Implement
    }
})
```

`.queryResolvers(resolvers)`

Adds query resolvers to the schema, method names in the resolvers object/class should correspond with query-fields in the schema.

`.mutationResolvers(resolvers)`

Adds mutation resolvers to the schema, method names in the resolvers object/class should correspond with mutation-fields in the schema.

`.resolvers(resolvers)`

Adds all resolvers to the schema:

```typescript
schema.resolvers({
    Query: {
        users(){
            // TODO: Implement
        }
    },
    Mutation: {
        createUser(){
            // TODO: Implement
        }
    }
})
```

#### Access rules

The access-rule methods allow you to define which user roles have access to the schema.
This can be specified for all fields, query-fields and/or mutation-fields.
All access-rule methods can receive as many arguments as you want, all provided roles are added to the specific list.
The methods can be called multiple times, doing this doesn't replace existing roles but just adds the passed roles instead.

Rules defined in specific object-types or fields take precedence over schema-defined rules. 
This allows you for example to first deny the entire schema to users with a specific role, but allow a specific field to that same role.
In that case users with this role will only be able to use that specific field.

> See the [Access rules](basics/concepts.md#access-rules) section for more information about access rules

`.allow(...rules)` and `.deny(...rules)`

Specify which user roles do or don't have access to the entire schema.

`.allowQuery(...rules)` and `.denyQuery(...rules)`

Specify which user roles do or don't have access to all query-fields in the schema.

`.allowMutation(...rules)` and `.denyMutation(...rules)`

Specify which user roles do or don't have access to all mutation-fields in the schema.

#### Use

The `use()` method can be used to either add a plug-in or middleware.

> See the [Plug-ins & middleware](basics/concepts.md#plug-ins-amp-middleware) section for more info

#### Build & Finalize

`.build()`

The build method generates an official GraphQL schema, which can be used to pass to any runtime library.
This method returns a promise to support asynchronous operations in plug-ins and other parts of the ecosystem.

You should call this method only once, and you don't have to call this method on potential sub-schemas.

`.finalize()`

Parts of your schema will need to be finalized before building. 
When using the TypeORM schema for example, fields in object types need to be generated based on the specified model.
You shouldn't need to call this method yourself, Kiwano executes the `finalize()` method on all schema-elements automatically before building.

#### Naming

Kiwano provides automatic naming for schema elements, this is used extensively in [Entity Schemas](entity-schema/entity-schema.md) for example.
The default schema however requires you to pass element names explicitly, so the provided naming strategy is not used by default. 

`.naming(strategy)`

Attaches a naming strategy to the schema. 
This strategy is automatically added to all merged sub-schemas as well, so you just have to provide it once in the root-schema.

> See [Naming](entity-schema/naming.md) for more information about naming strategies