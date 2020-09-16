import { HierarchicalItem } from "./datatypes";
import { createDetailData, DetailDataInit } from "./DetailData";

export interface HierarchicalItemInit extends DetailDataInit { type: string, parentId: string|undefined, childrenIds: readonly string[] }

export function createHierarchicalItem<T>(init : HierarchicalItemInit): HierarchicalItem<T> {
	return Object.assign({
		type: init.type,
		parentId: init.parentId,
		topLevel: typeof init.parentId === "undefined",
		hidden: false,
		children: {},
		childrenOrder: init.childrenIds.slice(),
	}, createDetailData(init));
}

export function hydrateChildren<T extends HierarchicalItem<T>>(item: HierarchicalItem<T>, hierarchyById: Record<string, T>) {
	for (const id of item.childrenOrder) {
		const child = hierarchyById[id];
		if (typeof child === "undefined" || child == null) {
			console.log(`Child not found: ${name} > ${id}`);
		} else if (!id) {
			console.log(`Child with no id: ${child.name}`);
		}else {
			item.children[id] = hierarchyById[id];
		}
	}
}
