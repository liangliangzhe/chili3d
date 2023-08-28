// Copyright 2022-2023 the Chili authors. All rights reserved. MPL-2.0 license.

import { FaceableBody, I18nKeys, IDocument, IShape, Property, Result, Serializer, XYZ } from "chili-core";

export class PolygonBody extends FaceableBody {
    readonly name: I18nKeys = "body.polygon";

    private _points: XYZ[];
    @Serializer.property("constructor")
    @Property.define("polygon.points")
    get points() {
        return this._points;
    }
    set points(value: XYZ[]) {
        this.setPropertyAndUpdate("points", value);
    }

    constructor(document: IDocument, ...points: XYZ[]) {
        super(document);
        this._points = points;
    }

    @Serializer.deserializer()
    static from({ document, points }: { document: IDocument; points: XYZ[] }) {
        return new PolygonBody(document, ...points);
    }

    protected generateShape(): Result<IShape, string> {
        let wire = this.shapeFactory.polygon(...this._points);
        if (!wire.success || !this.isFace) return wire;
        return wire.value.toFace();
    }
}
