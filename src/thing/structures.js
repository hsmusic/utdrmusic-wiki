// Generic structure utilities common across various Thing types.

export function validateReference(type = '') {
    return ref => {
        if (typeof ref !== 'string')
            throw new TypeError(`Expected a string, got ${ref}`);

        if (type) {
            if (!ref.includes(':'))
                throw new TypeError(`Expected ref to begin with "${type}:", but no type specified (ref: ${ref})`);

            const typePart = ref.split(':')[0];
            if (typePart !== type)
                throw new TypeError(`Expected ref to begin with "${type}:", got "${typePart}:" (ref: ${ref})`);
        }
    };
}
