// Copyright 2022-2023 the Chili authors. All rights reserved. AGPL-3.0 license.

import {
    CursorType,
    IShape,
    IShapeFilter,
    IView,
    IViewer,
    Observable,
    Plane,
    Ray,
    ShapeMeshGroup,
    ShapeType,
    VisualShapeData,
    XY,
    XYZ,
} from "chili-core";
import {
    Intersection,
    LineSegments,
    Mesh,
    Object3D,
    OrthographicCamera,
    PerspectiveCamera,
    Raycaster,
    Renderer,
    Scene,
    Vector2,
    Vector3,
    WebGLRenderer,
} from "three";
import { SelectionBox } from "three/examples/jsm/interactive/SelectionBox";
import { CameraController } from "./cameraController";
import { Constants } from "./constants";
import { ThreeHelper } from "./threeHelper";
import { ThreeShape } from "./threeShape";
import { ThreeVisualContext } from "./threeVisualContext";
import { ViewGizmo } from "./viewGizmo";

export class ThreeView extends Observable implements IView {
    private _scene: Scene;
    private _renderer: Renderer;
    private _workplane: Plane;
    private _needsUpdate: boolean = false;
    readonly #gizmo: ViewGizmo;
    readonly cameraController: CameraController;

    private _name: string;
    get name(): string {
        return this._name;
    }
    set name(name: string) {
        this._name = name;
    }

    get camera(): PerspectiveCamera | OrthographicCamera {
        return this.cameraController.camera;
    }

    constructor(
        readonly viewer: IViewer,
        name: string,
        workplane: Plane,
        readonly container: HTMLElement,
        readonly content: ThreeVisualContext,
    ) {
        super();
        this._name = name;
        this._scene = content.scene;
        this._workplane = workplane;
        this.cameraController = new CameraController(this);
        this._renderer = this.initRender(container);
        this.#gizmo = new ViewGizmo(this);
        container.appendChild(this.#gizmo);
        this.animate();
    }

    get renderer(): Renderer {
        return this._renderer;
    }

    protected initRender(container: HTMLElement): Renderer {
        let renderer = new WebGLRenderer({
            antialias: true,
            logarithmicDepthBuffer: true,
            powerPreference: "high-performance",
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.append(renderer.domElement);
        return renderer;
    }

    toImage(): string {
        this._renderer.render(this._scene, this.camera);
        return this.renderer.domElement.toDataURL();
    }

    get workplane(): Plane {
        return this._workplane;
    }

    set workplane(value: Plane) {
        this.setProperty("workplane", value);
    }

    setCursor(cursorType: CursorType): void {
        if (cursorType === CursorType.Default) {
            let classes = new Array<string>();
            this.container.classList.forEach((x) => {
                if (x.includes("Cursor")) {
                    classes.push(x);
                }
            });
            this.container.classList.remove(...classes);
        }
        if (CursorType.Drawing === cursorType) this.container.classList.add("drawingCursor");
    }

    update() {
        this._needsUpdate = true;
    }

    private animate() {
        requestAnimationFrame(() => {
            this.animate();
        });
        if (this._needsUpdate) {
            this._renderer.render(this._scene, this.camera);
            this.#gizmo.update();
            this._needsUpdate = false;
        }
    }

    resize(width: number, heigth: number) {
        if (this.camera instanceof PerspectiveCamera) {
            this.camera.aspect = width / heigth;
            this.camera.updateProjectionMatrix();
        } else if (this.camera instanceof OrthographicCamera) {
            this.camera.updateProjectionMatrix();
        }
        this._renderer.setSize(width, heigth);
        this.update();
    }

    get width(): number {
        return this.container.clientWidth;
    }

    get heigth(): number {
        return this.container.clientHeight;
    }

    screenToCameraRect(mx: number, my: number) {
        return {
            x: (mx / this.width) * 2 - 1,
            y: -(my / this.heigth) * 2 + 1,
        };
    }

    rayAt(mx: number, my: number): Ray {
        let { position, direction } = this.directionAt(mx, my);
        return new Ray(ThreeHelper.toXYZ(position), ThreeHelper.toXYZ(direction));
    }

    private directionAt(mx: number, my: number) {
        let position = this.mouseToWorld(mx, my);
        let direction = new Vector3();
        if (this.camera instanceof PerspectiveCamera) {
            direction = position.clone().sub(this.camera.position).normalize();
        } else if (this.camera instanceof OrthographicCamera) {
            this.camera.getWorldDirection(direction);
        }
        return { position, direction };
    }

    screenToWorld(mx: number, my: number): XYZ {
        let vec = this.mouseToWorld(mx, my);
        return ThreeHelper.toXYZ(vec);
    }

    worldToScreen(point: XYZ): XY {
        let cx = this.width / 2;
        let cy = this.heigth / 2;
        let vec = new Vector3(point.x, point.y, point.z).project(this.camera);
        return new XY(Math.round(cx * vec.x + cx), Math.round(-cy * vec.y + cy));
    }

    direction(): XYZ {
        const vec = new Vector3();
        this.camera.getWorldDirection(vec);
        return ThreeHelper.toXYZ(vec);
    }

    up(): XYZ {
        return ThreeHelper.toXYZ(this.camera.up);
    }

    private mouseToWorld(mx: number, my: number, z: number = 0.5) {
        let { x, y } = this.screenToCameraRect(mx, my);
        return new Vector3(x, y, z).unproject(this.camera);
    }

    rectDetected(
        shapeType: ShapeType,
        mx1: number,
        my1: number,
        mx2: number,
        my2: number,
        shapeFilter?: IShapeFilter,
    ) {
        const selectionBox = new SelectionBox(this.camera, this._scene);
        const start = this.screenToCameraRect(mx1, my1);
        const end = this.screenToCameraRect(mx2, my2);
        selectionBox.startPoint.set(start.x, start.y, 0.5);
        selectionBox.endPoint.set(end.x, end.y, 0.5);
        let detecteds: VisualShapeData[] = [];
        let containsCache = new Map<string, boolean>();
        for (const shape of selectionBox.select()) {
            this.addDetectedShape(detecteds, containsCache, shapeType, shape, shapeFilter);
        }
        return detecteds;
    }

    private addDetectedShape(
        detecteds: VisualShapeData[],
        cache: Map<string, boolean>,
        shapeType: ShapeType,
        shape: Mesh | LineSegments,
        shapeFilter?: IShapeFilter,
    ) {
        if (!(shape.parent instanceof ThreeShape) || !shape.parent.visible) return;
        if (shapeType === ShapeType.Shape && shape instanceof LineSegments) {
            if (shapeFilter && !shapeFilter.allow(shape.parent.shape)) return;
            detecteds.push({
                shape: shape.parent.shape,
                owner: shape.parent,
                indexes: [],
            });
        }
    }

    detected(shapeType: ShapeType, mx: number, my: number, shapeFilter?: IShapeFilter): VisualShapeData[] {
        let intersections = this.findIntersections(shapeType, mx, my);
        return shapeType === ShapeType.Shape
            ? this.detectThreeShapes(intersections, shapeFilter)
            : this.detectSubShapes(shapeType, intersections, shapeFilter);
    }

    private detectThreeShapes(intersections: Intersection<Object3D>[], shapeFilter?: IShapeFilter) {
        let result: VisualShapeData[] = [];
        for (const element of intersections) {
            const parent = element.object.parent;
            if (!(parent instanceof ThreeShape) || (shapeFilter && !shapeFilter.allow(parent.shape))) {
                continue;
            }
            result.push({
                owner: parent,
                shape: parent.shape,
                indexes: [],
            });
        }
        return result;
    }

    private detectSubShapes(
        shapeType: ShapeType,
        intersections: Intersection<Object3D>[],
        shapeFilter?: IShapeFilter,
    ) {
        let result: VisualShapeData[] = [];
        for (const intersected of intersections) {
            const visualShape = intersected.object.parent;
            if (!(visualShape instanceof ThreeShape)) continue;
            let { shape, indexes } = this.getShape(shapeType, visualShape, intersected);
            if (!shape || (shapeFilter && !shapeFilter.allow(shape))) {
                continue;
            }
            result.push({
                owner: visualShape,
                shape: shape,
                indexes,
            });
        }
        return result;
    }

    private getShape(
        shapeType: ShapeType,
        parent: ThreeShape,
        element: Intersection,
    ): {
        shape: IShape | undefined;
        indexes: number[];
    } {
        let { shape, index, groups } = this.findShapeAndIndex(parent, element);
        if (!shape) return { shape: undefined, indexes: [] };
        if (ShapeType.hasWire(shapeType)) {
            let wire = this.getWireAndIndexes(shape, groups!, parent);
            if (wire.shape) return wire;
        }
        // TODO: other type

        return { shape, indexes: [index!] };
    }

    private getWireAndIndexes(shape: IShape, groups: ShapeMeshGroup[], parent: ThreeShape) {
        let wire = shape.findAncestor(ShapeType.Wire, parent.shape).at(0);
        let indexes: number[] = [];
        if (wire) {
            let edges = wire.findSubShapes(ShapeType.Edge, true);
            for (const edge of edges) {
                for (let i = 0; i < groups.length; i++) {
                    if (edge.isEqual(groups[i].shape)) {
                        indexes.push(i);
                    }
                }
            }
        }
        return { shape: wire, indexes };
    }

    private findShapeAndIndex(parent: ThreeShape, element: Intersection) {
        let shape: IShape | undefined = undefined;
        let index: number | undefined = undefined;
        let groups: ShapeMeshGroup[] | undefined = undefined;
        if (element.faceIndex !== null) {
            groups = parent.shape.mesh.faces?.groups;
            if (groups) {
                index = ThreeHelper.findGroupIndex(groups, element.faceIndex! * 3)!;
                shape = groups[index].shape;
            }
        } else if (element.index !== null) {
            groups = parent.shape.mesh.edges?.groups;
            if (groups) {
                index = ThreeHelper.findGroupIndex(groups, element.index!)!;
                shape = groups[index].shape;
            }
        }
        return { shape, index, groups };
    }

    private findIntersections(shapeType: ShapeType, mx: number, my: number) {
        let raycaster = this.initRaycaster(mx, my);
        let shapes = this.initIntersectableObjects(shapeType);
        return raycaster.intersectObjects(shapes, false);
    }

    private initIntersectableObjects(shapeType: ShapeType) {
        let shapes = new Array<Object3D>();
        const addObject = (obj: Object3D | undefined) => {
            if (obj !== undefined) shapes.push(obj);
        };
        this.viewer.visual.context.shapes().forEach((x) => {
            if (!(x instanceof ThreeShape) || !x.visible) return;
            if (
                shapeType === ShapeType.Shape ||
                ShapeType.hasCompound(shapeType) ||
                ShapeType.hasCompoundSolid(shapeType) ||
                ShapeType.hasSolid(shapeType)
            ) {
                addObject(x.faces());
                addObject(x.edges());
                return;
            }
            if (ShapeType.hasFace(shapeType) || ShapeType.hasShell(shapeType)) {
                addObject(x.faces());
            }
            if (ShapeType.hasEdge(shapeType) || ShapeType.hasWire(shapeType)) {
                addObject(x.edges());
            }
            // TODO: vertex
        });
        return shapes;
    }

    private initRaycaster(mx: number, my: number) {
        let raycaster = new Raycaster();
        let scale = this.cameraController.target.distanceTo(this.camera.position) / 1000.0;
        let threshold = Constants.RaycasterThreshold * scale;
        let { x, y } = this.screenToCameraRect(mx, my);
        let mousePos = new Vector2(x, y);
        raycaster.setFromCamera(mousePos, this.camera);
        raycaster.params = { Line: { threshold }, Points: { threshold } };
        return raycaster;
    }
}
