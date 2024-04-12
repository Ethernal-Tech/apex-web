// example:
//
// type A = {
// 	sava: string,
// 	pera: number
// }

// propertyOf<A>('pera')

export const propertyOf = <TObj>(name: keyof TObj) => name;
