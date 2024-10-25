export function addElement(collection: any[], elem: any) {
  collection.push(elem);
}

export function editElement(collection: any[], index: number, elem: any) {
  collection[index] = elem;
}

export function deleteElement(collection: any[], index: number) {
  collection.splice(index, 1);
}
