// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { IDocument, XYZ } from "chili-core";
import { LineBody } from "../bodys";
import { Dimension, PointSnapper, Snapper } from "../snap";
import { EditorEventHandler, FeaturePoint } from "./eventHandler";

export class LineEditorEventHandler extends EditorEventHandler {
    constructor(
        document: IDocument,
        readonly line: LineBody,
    ) {
        super(document);
    }

    protected getSnapper(point: FeaturePoint): Snapper {
        return new PointSnapper({
            dimension: Dimension.D1D2D3,
            refPoint: point.point,
            preview: point.preview,
        });
    }

    protected featurePoints(): FeaturePoint[] {
        return [
            {
                point: this.line.start,
                tip: "line.start",
                preview: (x) => this.linePreview(x, this.line.end),
                setter: (point) => (this.line.start = point),
                displayed: this.showPoint(this.line.start),
            },
            {
                point: this.line.end,
                tip: "line.end",
                preview: (x) => this.linePreview(this.line.start, x),
                setter: (p) => (this.line.end = p),
                displayed: this.showPoint(this.line.end),
            },
        ];
    }

    private linePreview = (s: XYZ, e: XYZ) => {
        return [this.document.application.shapeFactory.line(s, e).unwrap().mesh.edges!];
    };
}
