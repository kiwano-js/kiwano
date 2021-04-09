import pluralize from 'pluralize'

export function ucFirst(input: string): string {

    if(input === null || input.length === 0){
        return null;
    }

    return input.charAt(0).toUpperCase() + input.slice(1);
}

export function lcFirst(input: string): string {

    if(input === null || input.length === 0){
        return null;
    }

    return input.charAt(0).toLowerCase() + input.slice(1);
}

export {
    pluralize
}