// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { FaceableBody, I18nKeys, IDocument, IShape, Property, Result, Serializer, XYZ } from "chili-core";

@Serializer.register("CircleBody", ["document", "normal", "center", "radius"])
export class CircleBody extends FaceableBody {
    readonly name: I18nKeys = "body.circle";

    private _center: XYZ;

    @Serializer.serialze()
    @Property.define("circle.center")
    get center() {
        return this._center;
    }
    set center(center: XYZ) {
        this.setPropertyAndUpdate("center", center);
    }

    private _radius: number;

    @Serializer.serialze()
    @Property.define("circle.radius")
    get radius() {
        return this._radius;
    }
    set radius(radius: number) {
        this.setPropertyAndUpdate("radius", radius);
    }

    private _normal: XYZ;

    @Serializer.serialze()
    get normal() {
        return this._normal;
    }

    constructor(document: IDocument, normal: XYZ, center: XYZ, radius: number) {
        super(document);
        this._normal = normal;
        this._center = center;
        this._radius = radius;
    }

    protected generateShape(): Result<IShape, string> {
        let circle = this.shapeFactory.circle(this.normal, this._center, this._radius);
        if (!circle.success || !this.isFace) return circle;
        let wire = this.shapeFactory.wire(circle.value);
        return wire.success ? wire.value.toFace() : circle;
    }
}
