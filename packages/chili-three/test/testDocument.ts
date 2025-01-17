// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import {
    History,
    IApplication,
    IDocument,
    INode,
    INodeLinkedList,
    ISerialize,
    IView,
    PropertyChangedHandler,
    SelectionManager,
    Serialized,
} from "chili-core";
import { ThreeVisual } from "../src/threeVisual";

export class TestDocument implements IDocument, ISerialize {
    application: IApplication;
    name: string;
    currentNode: INodeLinkedList | undefined;
    id: string;
    history: History;
    selection: SelectionManager;
    visual: ThreeVisual;
    rootNode: INodeLinkedList;
    activeView: IView | undefined;
    onPropertyChanged<K extends keyof this>(handler: PropertyChangedHandler<this, K>): void {
        throw new Error("Method not implemented.");
    }
    removePropertyChanged<K extends keyof this>(handler: PropertyChangedHandler<this, K>): void {
        throw new Error("Method not implemented.");
    }
    dispose() {
        throw new Error("Method not implemented.");
    }

    close(): Promise<void> {
        return Promise.resolve();
    }

    serialize(): Serialized {
        return {
            classKey: "TestDocument",
            properties: {},
        };
    }

    constructor() {
        this.name = "test";
        this.id = "test";
        this.visual = new ThreeVisual(this);
        this.history = {} as any;
        this.selection = {} as any;
        this.rootNode = {} as any;
        this.application = {} as any;
    }
    addNode(...nodes: INode[]): void {
        throw new Error("Method not implemented.");
    }
    save(): Promise<void> {
        return Promise.resolve();
    }
}
