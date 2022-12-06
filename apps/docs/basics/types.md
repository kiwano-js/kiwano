# Object types & Fields
Every schema consists of one or more Object types and Fields.
Kiwano provides the `objectType` and `field` builders to configure these elements.

All Kiwano type builders extend from the main `Builder` type. 
As a result, every builder constructor allows you to specify the name of the type you are creating.
This name can ben either a string or a function that generates the name during build time.

## Object type
A Kiwano `objectType` represents a GraphQL [Object type](https://graphql.org/graphql-js/object-types), consisting of one or more Fields.
You can create an Object type by either using the `objectType` builder or adding it to your schema directly:

```typescript
import { objectType } from '@kiwano/core'

const project = objectType('Project');
// OR
schema.object('Project');
```

The Kiwano `objectType` provides the following methods to configure your Object:

`.field(name, type, [configurator])` or `.field(field)`

Adds a Field to the Object type. Example:

```typescript
project
    .field('title', 'String!', _ => _.description('Title of the project'))
    .field('createdAt', 'Date!', _ => _.description('Title of the project').deny('User'))
```

`.use(...plugins)`

Adds plugins to the type, these plugins will be applied to the Fields of the Object type as well.

`.description(description)`

Provides a description for the Object type

`.extension(name, value)`

Adds an extension to the type

`.resolvers(object)`

Overrides the default resolvers with custom resolvers for each field:

```typescript
project.resolvers({
    
    title(source){
        return source.title.toLowerCase()
    },
    
    createdAt(source){
        return source.createdAt
    }
})
```

`.allow(...roles)`

Allows the specified roles to access the type

`.deny(...roles)`

Denies the specified roles to access the type

`.info()`

Returns info about the type

## Field

Represents a GraphQL Field, which can be added to an Object type.
You can create a Field by either using the `field` builder or adding it to your Object type directly:

```typescript
import { field } from '@kiwano/core'

const projectTitle = field('title', 'String!');
// OR
project.field('title', 'String!');
```

The Kiwano `field` provides the following methods to configure your Field:

`.arg(name, type, [configurator])` or `.arg(argument)`

Adds an argument to the Field. Example:

```typescript
projectTitle.arg('abbreviated', 'Boolean')
```

`.use(...plugins)`

Adds plugins to the Field

`.description(description)`

Provides a description for the Field

`.extension(name, value)`

Adds an extension to the Field

`.resolver(resolverFn)`

Overrides the default resolver with a custom one:

`.type(typeName)`

Sets the type of the field. The type can be provided in the constructor as well.

`.nonNull([nonNull])`, `.list([list])` and `.nonNullList([nonNullList])`

Specifies whether the Field is non-null, a list or a non-null list. 
Calling this method without an argument implies a default value of `true`.

`.allow(...roles)`

Allows the specified roles to access the type

`.deny(...roles)`

Denies the specified roles to access the type

`.info()`

Returns info about the type

## Inputs

Both `field` and `objectType` have a counterpart used for mutations: `inputField` and `inputObjectType`.

These input variants provide the same methods as the regular ones, but lack the ability to specify access rules (`allow` and `deny`).

Example:

```typescript
schema.inputObject('CreateProjectInput', _ => _
    .field('title', 'String!')
)
```