// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

export type Result<T, E = string> = {
    unwrap(): T;
    getValue(): T | undefined;
    expect(msg: string): T;
} & (
    | {
          readonly success: true;
          readonly status: "success";
          readonly value: T;
      }
    | {
          readonly success: false;
          readonly status: "error";
          readonly error: E;
      }
);

export namespace Result {
    export function success<T>(value: T): Result<T, never> {
        return {
            status: "success",
            value,
            unwrap: () => value,
            success: true,
            getValue: () => value,
            expect: (msg: string) => value,
        };
    }

    export function error<E>(error: E): Result<never, E> {
        return {
            status: "error",
            error,
            unwrap: () => {
                throw error;
            },
            success: false,
            getValue: () => undefined,
            expect: (msg: string) => {
                throw new Error(msg);
            },
        };
    }
}
