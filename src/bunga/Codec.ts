import { Book, BookInfo, Character, Dataset, DetailData, DictionaryEntry, Field, HierarchicalItem, State, Taxon } from "./datatypes";
import { standardBooks } from "./stdcontent";
import { createDataset } from "./Dataset";
import { createDetailData } from './DetailData';
import { createHierarchicalItem, hydrateChildren } from './HierarchicalItem';
import { createTaxon, taxonDescriptions } from './Taxon';
import { createCharacter } from './Character';

interface EncodedDataset {
	id: string
	taxons: ReturnType<typeof encodeTaxon>[];
	characters: ReturnType<typeof encodeCharacter>[];
	states: State[];
	books: Book[];
	extraFields: Field[];
	dictionaryEntries: DictionaryEntry[]|Record<string, DictionaryEntry>;
}

interface AlreadyEncodedDataset extends Omit<EncodedDataset, "characters"> {
	descriptors?: ReturnType<typeof encodeCharacter>[]; // Legacy name of characters
	characters?: ReturnType<typeof encodeCharacter>[];
}

function encodeHierarchicalItem<T extends DetailData>(item: HierarchicalItem<T>) {
	const children = new Set<string>();
	const order = item.childrenOrder ?? Object.values(item.children);

	for (const childId of order) {
		children.add(childId);
	}
	return {
		type: item.type,
		parentId: item.parentId,
		topLevel: item.topLevel,
		children: [...children],
		...createDetailData(item),
	};
}

function encodeDescription(descriptorId: string, statesIds: string[]) {
	return { descriptorId, statesIds };
}

function encodeTaxon(taxon: Taxon, characters: Iterable<Character>) {
	return {
		bookInfoByIds: taxon.bookInfoByIds,
		descriptions: taxonDescriptions(taxon, characters).map(d => encodeDescription(d.character.id, d.states.map(s => s.id))),
		...encodeHierarchicalItem(taxon),
	};
}

function encodeCharacter(character: Character) {
	return {
		states: character.states.map(s => s.id),
		inapplicableStatesIds: character.inapplicableStates.map(s => s.id),
		...encodeHierarchicalItem(character),
	};
}

function getAllStates(dataset: Dataset): State[] {
	let states: State[] = [];
	for (const character of Object.values(dataset.characters)) {
		states = states.concat(character.states);
	}
	return states;
}

export function encodeDataset(dataset: Dataset): EncodedDataset {
	const characters = Object.values(dataset.characters);
	return {
		id: dataset.id,
		taxons: Object.values(dataset.taxons).map(taxon => encodeTaxon(taxon, characters)),
		characters: characters.map(character => encodeCharacter(character)),
		states: getAllStates(dataset),
		books: dataset.books,
		extraFields: dataset.extraFields,
		dictionaryEntries: dataset.dictionaryEntries,
	};
}

function decodeHierarchicalItem<T>(item: ReturnType<typeof encodeHierarchicalItem>): HierarchicalItem<T> {
	return createHierarchicalItem({...item, childrenIds: item.children});
}

function decodeTaxon(encodedTaxon: ReturnType<typeof encodeTaxon>, characters: Record<string, Character>, states: Record<string, State>, books: Book[]): Taxon {
	const bookInfoByIds = (typeof encodedTaxon.bookInfoByIds !== "undefined") ? encodedTaxon.bookInfoByIds : {};

	if (Object.keys(bookInfoByIds).length === 0) {
		for (const book of standardBooks) {
			const info:BookInfo = {
				fasc: (book.id === "fmc") ? "" + encodedTaxon.fasc : "",
				page: (book.id === "fmc") ? encodedTaxon.page : undefined,
				detail: ""
			};
			bookInfoByIds[book.id] = info;
		}
	}
	const item = decodeHierarchicalItem(encodedTaxon);
	const statesSelection: Record<string, boolean> = {};
    for (const character of Object.values(characters)) {
        for (const state of character.states) {
            statesSelection[state.id] = false;
        }
    }
    for (const description of encodedTaxon.descriptions) {
        for (const stateId of description.statesIds) {
            statesSelection[stateId] = true;
        }
    }
	return createTaxon({
		...item,
		childrenIds: item.childrenOrder,
		statesSelection: statesSelection,
		bookInfoByIds,
	});
}

function decodeCharacter(character: ReturnType<typeof encodeCharacter>, states: Record<string, State>): Character {
	const item = decodeHierarchicalItem(character);
	return createCharacter({
		...item,
		childrenIds: item.childrenOrder,
		states: character.states.map(id => states[id]),
		inapplicableStates: character.inapplicableStatesIds?.map(id => states[id]) ?? [],
		
	});
}

export function decodeDataset(dataset: AlreadyEncodedDataset): Dataset {
	const states: Record<string, State> = {};
	const characters: Record<string, Character> = {};
	const taxons: Record<string, Taxon> = {};
	const books = standardBooks.slice();

	for (const state of dataset.states) {
		states[state.id] = state;
	}
	for (const descriptor of (dataset.characters ?? dataset.descriptors ?? [])) {
		characters[descriptor.id] = decodeCharacter(descriptor, states);
	}
	for (const taxon of dataset.taxons) {
		taxons[taxon.id] = decodeTaxon(taxon, characters, states, books);
	}
	for (const descriptor of Object.values(characters)) {
		hydrateChildren(descriptor, characters);
	}
	for (const taxon of Object.values(taxons)) {
		hydrateChildren(taxon, taxons);
	}
	return createDataset(
		dataset.id,
		taxons,
		characters,
		books,
		dataset.extraFields,
		dataset.dictionaryEntries,
	);
}
