import type { GraphQLResolveInfo, SelectionNode, SelectionSetNode } from "graphql";

export function hasSelectedField(info: GraphQLResolveInfo, fieldName: string): boolean {

    return getSelectedFieldNames(info).has(fieldName);
}

export function getSelectedFieldNames(info: GraphQLResolveInfo): Set<string> {

    const visitedFragments = new Set<string>();
    const fieldNames = new Set<string>();

    function collectSelectionSetFieldNames(selectionSet: SelectionSetNode) {

        for(const selection of selectionSet.selections){
            collectSelectionFieldNames(selection, visitedFragments);
        }
    }

    function collectSelectionFieldNames(selection: SelectionNode, visitedFragments: Set<string>) {

        switch(selection.kind){

            case 'Field':
                fieldNames.add(selection.name.value);
                return;

            case 'InlineFragment':
                collectSelectionSetFieldNames(selection.selectionSet);
                return;

            case 'FragmentSpread':

                if(visitedFragments.has(selection.name.value)){
                    return;
                }

                visitedFragments.add(selection.name.value);

                const fragment = info.fragments[selection.name.value];
                if(fragment){
                    collectSelectionSetFieldNames(fragment.selectionSet);
                }
        }
    }

    for(const fieldNode of info.fieldNodes){

        if(fieldNode.selectionSet){
            collectSelectionSetFieldNames(fieldNode.selectionSet);
        }
    }

    return fieldNames;
}
