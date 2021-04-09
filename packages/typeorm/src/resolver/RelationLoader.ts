import { Connection, ObjectLiteral, QueryRunner, SelectQueryBuilder } from "typeorm";
import { RelationMetadata } from "typeorm/metadata/RelationMetadata";

/**
 * COPIED from TypeORM: `query-builder/RelationLoader.ts`. Unavoidable because the TypeORM version executes the queries immediately.
 */
export class RelationLoader {

    constructor(private connection: Connection) {}

    query(relation: RelationMetadata, entityOrEntities: ObjectLiteral | ObjectLiteral[], queryRunner?: QueryRunner): SelectQueryBuilder<any> {

        if(queryRunner && queryRunner.isReleased) queryRunner = undefined; // get new one if already closed
        if(relation.isManyToOne || relation.isOneToOneOwner){
            return this.manyToOneOrOneToOneOwnerQuery(relation, entityOrEntities, queryRunner);
        }
        else if(relation.isOneToMany || relation.isOneToOneNotOwner){
            return this.oneToManyOrOneToOneNotOwnerQuery(relation, entityOrEntities, queryRunner);
        }
        else if(relation.isManyToManyOwner){
            return this.manyToManyOwnerQuery(relation, entityOrEntities, queryRunner);
        }
        else { // many-to-many non owner
            return this.manyToManyNotOwnerQuery(relation, entityOrEntities, queryRunner);
        }
    }

    /**
     * Loads data for many-to-one and one-to-one owner relations.
     *
     * (ow) post.category<=>category.post
     * loaded: category from post
     * example: SELECT category.id AS category_id, category.name AS category_name FROM category category
     *              INNER JOIN post Post ON Post.category=category.id WHERE Post.id=1
     */
    manyToOneOrOneToOneOwnerQuery(relation: RelationMetadata, entityOrEntities: ObjectLiteral | ObjectLiteral[], queryRunner?: QueryRunner): SelectQueryBuilder<any> {

        const entities = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
        const columns = relation.entityMetadata.primaryColumns;
        const joinColumns = relation.isOwning ? relation.joinColumns : relation.inverseRelation!.joinColumns;
        const mainAlias = relation.inverseEntityMetadata!.name;

        const joinAliasName = relation.entityMetadata.name;

        const conditions = joinColumns.map(joinColumn => {
            return `${joinAliasName}.${joinColumn.propertyName} = ${mainAlias}.${joinColumn.referencedColumn!.propertyName}`;
        }).join(" AND ");


        const qb = this.connection
                       .createQueryBuilder(queryRunner)
                       .select(mainAlias) // category
                       .from(relation.type, mainAlias) // Category, category
                       .innerJoin(relation.entityMetadata.target as Function, joinAliasName, conditions);

        if(columns.length === 1){

            qb.where(`${joinAliasName}.${columns[0].propertyPath} IN (:...${joinAliasName + "_" + columns[0].propertyName})`);
            qb.setParameter(joinAliasName + "_" + columns[0].propertyName, entities.map(entity => columns[0].getEntityValue(entity)));
        }
        else {

            const condition = entities.map((entity, entityIndex) => {
                return columns.map((column, columnIndex) => {
                    const paramName = joinAliasName + "_entity_" + entityIndex + "_" + columnIndex;
                    qb.setParameter(paramName, column.getEntityValue(entity));
                    return joinAliasName + "." + column.propertyPath + " = :" + paramName;
                }).join(" AND ");

            }).map(condition => "(" + condition + ")").join(" OR ");
            qb.where(condition);
        }

        return qb;
    }

    /**
     * Loads data for one-to-many and one-to-one not owner relations.
     *
     * SELECT post
     * FROM post post
     * WHERE post.[joinColumn.name] = entity[joinColumn.referencedColumn]
     */
    oneToManyOrOneToOneNotOwnerQuery(relation: RelationMetadata, entityOrEntities: ObjectLiteral | ObjectLiteral[], queryRunner?: QueryRunner): SelectQueryBuilder<any> {

        const entities = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
        const aliasName = relation.inverseRelation!.entityMetadata.name;
        const columns = relation.inverseRelation!.joinColumns;

        const qb = this.connection
                       .createQueryBuilder(queryRunner)
                       .select(aliasName)
                       .from(relation.inverseRelation!.entityMetadata.target, aliasName);

        if(columns.length === 1){

            qb.where(`${aliasName}.${columns[0].propertyPath} IN (:...${aliasName + "_" + columns[0].propertyName})`);
            qb.setParameter(aliasName + "_" + columns[0].propertyName, entities.map(entity => columns[0].referencedColumn!.getEntityValue(entity)));

        }
        else {

            const condition = entities.map((entity, entityIndex) => {
                return columns.map((column, columnIndex) => {
                    const paramName = aliasName + "_entity_" + entityIndex + "_" + columnIndex;
                    qb.setParameter(paramName, column.referencedColumn!.getEntityValue(entity));
                    return aliasName + "." + column.propertyPath + " = :" + paramName;
                }).join(" AND ");

            }).map(condition => "(" + condition + ")").join(" OR ");
            qb.where(condition);
        }

        return qb;
    }

    /**
     * Loads data for many-to-many owner relations.
     *
     * SELECT category
     * FROM category category
     * INNER JOIN post_categories post_categories
     * ON post_categories.postId = :postId
     * AND post_categories.categoryId = category.id
     */
    manyToManyOwnerQuery(relation: RelationMetadata, entityOrEntities: ObjectLiteral | ObjectLiteral[], queryRunner?: QueryRunner): SelectQueryBuilder<any> {

        const entities = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
        const mainAlias = relation.inverseEntityMetadata!.name;
        const joinAlias = relation.junctionEntityMetadata!.name;

        const joinColumnConditions = relation.joinColumns.map(joinColumn => {
            return `${joinAlias}.${joinColumn.propertyName} IN (:...${joinColumn.propertyName})`;
        });

        const inverseJoinColumnConditions = relation.inverseJoinColumns.map(inverseJoinColumn => {
            return `${joinAlias}.${inverseJoinColumn.propertyName}=${mainAlias}.${inverseJoinColumn.referencedColumn!.propertyName}`;
        });

        const parameters = relation.joinColumns.reduce((parameters, joinColumn) => {
            parameters[joinColumn.propertyName] = entities.map(entity => joinColumn.referencedColumn!.getEntityValue(entity));
            return parameters;
        }, {} as ObjectLiteral);

        return this.connection
                   .createQueryBuilder(queryRunner)
                   .select(mainAlias)
                   .from(relation.type, mainAlias)
                   .innerJoin(joinAlias, joinAlias, [...joinColumnConditions, ...inverseJoinColumnConditions].join(" AND "))
                   .setParameters(parameters);
    }

    /**
     * Loads data for many-to-many not owner relations.
     *
     * SELECT post
     * FROM post post
     * INNER JOIN post_categories post_categories
     * ON post_categories.postId = post.id
     * AND post_categories.categoryId = post_categories.categoryId
     */
    manyToManyNotOwnerQuery(relation: RelationMetadata, entityOrEntities: ObjectLiteral | ObjectLiteral[], queryRunner?: QueryRunner): SelectQueryBuilder<any> {

        const entities = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
        const mainAlias = relation.inverseEntityMetadata.name;
        const joinAlias = relation.junctionEntityMetadata!.name;

        const joinColumnConditions = relation.inverseRelation!.joinColumns.map(joinColumn => {
            return `${joinAlias}.${joinColumn.propertyName} = ${mainAlias}.${joinColumn.referencedColumn!.propertyName}`;
        });

        const inverseJoinColumnConditions = relation.inverseRelation!.inverseJoinColumns.map(inverseJoinColumn => {
            return `${joinAlias}.${inverseJoinColumn.propertyName} IN (:...${inverseJoinColumn.propertyName})`;
        });

        const parameters = relation.inverseRelation!.inverseJoinColumns.reduce((parameters, joinColumn) => {
            parameters[joinColumn.propertyName] = entities.map(entity => joinColumn.referencedColumn!.getEntityValue(entity));
            return parameters;
        }, {} as ObjectLiteral);

        return this.connection
                   .createQueryBuilder(queryRunner)
                   .select(mainAlias)
                   .from(relation.type, mainAlias)
                   .innerJoin(joinAlias, joinAlias, [...joinColumnConditions, ...inverseJoinColumnConditions].join(" AND "))
                   .setParameters(parameters);
    }
}