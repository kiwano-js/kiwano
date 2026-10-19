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

## Subscription runtimes and access checks

Subscription resolver maps can contain a `FieldRuntime` object or a method that
creates one. A subscription runtime can declare these optional access checks:

```typescript
export type FieldAccessHook = (
    input: ResolverInfo<any>
) => OptionalPromise<boolean>;

export interface FieldRuntime {
    canAccess?: FieldAccessHook;
    canSubscribe?: FieldAccessHook;
    canResolve?: FieldAccessHook;

    subscribe?: GraphQLFieldResolver<any, any>;
    resolve?: GraphQLFieldResolver<any, any>;
}
```

`ResolverInfo` contains `source`, `args`, `context` and GraphQL's `info`. Access
checks receive that single object. The existing `subscribe` and `resolve`
functions retain their four arguments: `(source, args, context, info)`.

Kiwano executes the checks in this order:

| Operation                       | Order                                            |
| ------------------------------- | ------------------------------------------------ |
| Start a subscription            | ACL → `canAccess` → `canSubscribe` → `subscribe` |
| Resolve each subscription event | `canAccess` → `canResolve` → `resolve`           |

ACL is checked at subscription start when an ACL plugin is configured. Hooks are
never added automatically: missing hooks impose no additional condition. Every declared
applicable hook must return `true`; a specific hook never replaces `canAccess`.
`canSubscribe` is only used when starting a subscription, and `canResolve` is
only used when resolving a subscription event.

Checks can be synchronous or asynchronous and are awaited in order. A refusal
raises Kiwano's standard `ForbiddenError`. A thrown or rejected error propagates
unchanged. In either case, subsequent checks and the resolver are not called.
Hook results only control access; they are never used as field results.

These hooks apply only to subscriptions. Normal query, mutation and object-type
resolvers remain resolver functions and may return ordinary objects, including
objects with properties named `resolve` or `canAccess`. Only methods in a
subscription resolver map are treated as runtime factories during schema
construction.

If a subscription's `resolve` is omitted, checks run before GraphQL's
`defaultFieldResolver`. An explicit `.resolver(...)` on the subscription field
overrides its event resolve function but retains the runtime's access checks.

### A subscription with only canAccess

```typescript
schema
    .subscription('changes', 'String')
    .subscriptionResolvers({
        changes: {
            canAccess({ context }) {
                return context.canReadChanges();
            },
            subscribe(_source, args, context) {
                return context.changeEvents(args);
            }
        }
    });
```

Here, each event contains a `changes` property, which the default resolver reads.
`canAccess` runs once before opening the stream and again before each event
result. If it performs a database query, that query therefore runs at subscription
start **and for every event**, rather than once for the lifetime of the stream.

### Common and phase-specific subscription checks

```typescript
schema
    .subscription('changes', 'String')
    .subscriptionResolvers({
        changes() {
            return {
                canAccess({ context }) {
                    return context.canReadChanges();
                },
                canSubscribe({ context }) {
                    return context.canOpenChangeStream();
                },
                canResolve({ source, context }) {
                    return context.canReadEvent(source);
                },
                subscribe(_source, args, context) {
                    return context.changeEvents(args);
                },
                resolve(event) {
                    return event.value;
                }
            };
        }
    });
```

Runtime factory methods, hooks and runtime functions retain the resolver
container as `this`, including class instances. They are not rebound to the
returned descriptor object.

Hooks may refresh the existing context object. Later checks and the resolver
observe these updates. A hook can also replace `input.context`; that replacement
is forwarded to later checks and the resolver for the current invocation. Each
invocation gets a new `ResolverInfo` object; in-place changes to the shared
context remain available to later subscription events.

Runtimes without access hooks retain their existing behavior. ACL authorization
for the subscription field is only performed when opening the stream. Use
`canAccess` or `canResolve` to check current access before each event result.

## Inputs

Both `field` and `objectType` have a counterpart used for mutations: `inputField` and `inputObjectType`.

These input variants provide the same methods as the regular ones, but lack the ability to specify access rules (`allow` and `deny`).

Example:

```typescript
schema.inputObject('CreateProjectInput', _ => _
    .field('title', 'String!')
)
```

### Optional fields that reject null

Use `.rejectNull()` on an input field to allow omission while rejecting an
explicit `null` value:

```typescript
schema.inputObject('UpdateCustomerInput', _ => _
    .field('name', 'String', field => field.rejectNull())
    .field('contactId', 'ID')
)
```

Here, `name` can be omitted or set to a string. `contactId` can additionally be
set to `null` to clear the association, if the resolver supports that operation.
Use `.rejectNull(false)` to disable the rule. Unlike `.nonNull()`, `.rejectNull()`
does not require the field to be present.

Generated update inputs automatically use this rule for non-null entity fields;
the `id` field remains required. Manually configured update fields take precedence.

Kiwano installs validation when `.build()` completes. It applies to custom and
generated resolvers, including nested input objects and lists. Subscription input
is checked before opening the stream. Invalid input raises `InvalidInputError`
before the affected resolver runs; other fields in the operation may already have
executed.

The GraphQL field type remains nullable. The rule is stored in the input field's
`extensions` under the exported `rejectNullExtensionName` key. Standard schema
introspection and GraphQL TypeScript generators do not reflect this additional
constraint automatically; custom generators can use the metadata on the built
schema or the input builder's `.info().extensions`.
