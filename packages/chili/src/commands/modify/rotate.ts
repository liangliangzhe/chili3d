// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import { Matrix4, ShapeMeshData, XYZ, command } from "chili-core";
import { Dimension, SnapPointData } from "../../snap";
import { AngleStep, IStep, PointStep } from "../../step";
import { TransformedCommand } from "./transformedCommand";

@command({
    name: "modify.rotate",
    display: "command.rotate",
    icon: "icon-rotate",
})
export class Rotate extends TransformedCommand {
    protected override transfrom(point: XYZ): Matrix4 {
        let normal = this.stepDatas[0].view.workplane.normal;
        let center = this.stepDatas[0].point!;
        let p1 = this.stepDatas[1].point!;
        let v1 = p1.sub(center);
        let v2 = point.sub(center);
        let angle = v1.angleOnPlaneTo(v2, this.stepDatas[0].view.workplane.normal)!;
        return Matrix4.createRotationAt(this.stepDatas[0].point!, normal, angle);
    }

    getSteps(): IStep[] {
        let firstStep = new PointStep("operate.pickFistPoint");
        let secondStep = new PointStep("operate.pickNextPoint", this.getSecondPointData);
        let thirdStep = new AngleStep(
            "operate.pickNextPoint",
            () => this.stepDatas[0].point!,
            () => this.stepDatas[1].point!,
            this.getThirdPointData,
        );
        return [firstStep, secondStep, thirdStep];
    }

    private getSecondPointData = (): SnapPointData => {
        return {
            refPoint: this.stepDatas[0].point!,
            dimension: Dimension.D1D2D3,
            preview: this.linePreview,
            validators: [(p) => p.distanceTo(this.stepDatas[0].point!) > 1e-6],
        };
    };

    private getThirdPointData = (): SnapPointData => {
        return {
            dimension: Dimension.D1D2,
            preview: this.rotatePreview,
            plane: this.stepDatas[0].view.workplane,
            validators: [
                (p) => {
                    return (
                        p.distanceTo(this.stepDatas[0].point!) > 1e-3 &&
                        p.distanceTo(this.stepDatas[1].point!) > 1e-3
                    );
                },
            ],
        };
    };

    private rotatePreview = (point: XYZ): ShapeMeshData[] => {
        let shape = this.transformPreview(point);
        let l1 = this.getRayData(this.stepDatas[1].point!);
        let l2 = this.getRayData(point);
        return [shape, l1, l2];
    };

    private getRayData(end: XYZ) {
        let start = this.stepDatas[0].point!;
        let e = start.add(end.sub(start).normalize()!.multiply(1e6));
        return this.getTempLineData(start, e);
    }

    private linePreview = (point: XYZ): ShapeMeshData[] => {
        return [this.getTempLineData(this.stepDatas[0].point!, point)];
    };
}
