// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { IConverter, IDisposable, IPropertyChanged, PubSub, Result } from "chili-core";

export type Key = string | number | symbol;

export class Binding<T extends IPropertyChanged = IPropertyChanged, K extends keyof T = any>
    implements IDisposable
{
    static #bindings = new WeakMap<IPropertyChanged, Set<Binding>>();
    #cache = new Map<object, Set<Key>>();

    constructor(
        readonly dataContext: T,
        readonly path: K,
        readonly converter?: IConverter,
    ) {
        this.cacheBinding(dataContext);
        this.dataContext.onPropertyChanged(this.onPropertyChanged);
    }

    get value() {
        return this.dataContext[this.path];
    }

    private cacheBinding(dataContext: T) {
        if (Binding.#bindings.has(dataContext)) {
            Binding.#bindings.get(dataContext)!.add(this);
        } else {
            Binding.#bindings.set(dataContext, new Set([this]));
        }
    }

    private removeBindings(dataContext: T) {
        if (Binding.#bindings.has(dataContext)) {
            Binding.#bindings.get(dataContext)!.forEach((binding) => binding.dispose());
            Binding.#bindings.delete(dataContext);
        }
    }

    add<T extends object, K extends keyof T>(target: T, key: K) {
        if (!this.#cache.has(target)) {
            this.#cache.set(target, new Set());
        }
        this.#cache.get(target)!.add(key);
        this.setValue(target, this.#cache.get(target)!);
    }

    remove<T extends object, K extends keyof T>(target: T, key: K) {
        this.#cache.get(target)?.delete(key);
    }

    private onPropertyChanged = (prop: K) => {
        if (prop === this.path) {
            this.#cache.forEach((keys, target) => {
                this.setValue(target, keys);
            });
        }
    };

    private setValue<T extends object>(target: T, keys: Set<Key>) {
        let value: any = this.dataContext[this.path];
        if (this.converter) {
            let result = this.converter.convert(value);
            if (!result.success) {
                PubSub.default.pub("showToast", "toast.converter.error");
                return;
            }
            value = result.value;
        }
        keys.forEach((key) => {
            let scope: any = target;
            if (value !== scope[key] && key in scope) scope[key] = value;
        });
    }

    dispose() {
        this.dataContext.removePropertyChanged(this.onPropertyChanged);
        this.#cache.clear();
    }
}

export function bind<T extends IPropertyChanged>(dataContext: T, path: keyof T, converter?: IConverter) {
    return new Binding(dataContext, path, converter);
}
