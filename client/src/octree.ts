import kMeansClustering from "./kmeans";

class Octree {
    granularity = 1;
    root = new OctreeNode(0, 0, 0, 0, 0, 0);
    x1 = 0;
    x2 = 0;
    y1 = 0;
    y2 = 0;
    z1 = 0;
    z2 = 0;
    maxAlpha = 0;

    constructor(
        granularity: number,
        x1: number,
        x2: number,
        y1: number,
        y2: number,
        z1: number,
        z2: number
    ) {
        this.granularity = granularity;
        this.root = this.generate(x1, x2, y1, y2, z1, z2, 0);

        // let [l, b, h] = [Math.abs(z1 - z2), Math.abs(x1 - x2), Math.abs(y1 - y2)]
        // let side = gcd(l, gcd(b, h));
        // let num = l / side;
        // num = (num * b / side);
        // num = (num * h / side);
        // console.log(side, num);
    }

    generate(
        x1: number,
        x2: number,
        y1: number,
        y2: number,
        z1: number,
        z2: number,
        depth: number
    ) {
        const node = new OctreeNode(x1, x2, y1, y2, z1, z2);
        const midX = x1 + (x2 - x1) / 2;
        const midY = y1 + (y2 - y1) / 2;
        const midZ = z1 + (z2 - z1) / 2;
        if (depth < this.granularity) {
            node.children = [
                this.generate(x1, midX, y1, midY, z1, midZ, depth + 1),
                this.generate(x1, midX, midY, y2, z1, midZ, depth + 1),
                this.generate(x1, midX, y1, midY, midZ, z2, depth + 1),
                this.generate(x1, midX, midY, y2, midZ, z2, depth + 1),
                this.generate(midX, x2, y1, midY, midZ, z2, depth + 1),
                this.generate(midX, x2, y1, midY, z1, midZ, depth + 1),
                this.generate(midX, x2, midY, y2, z1, midZ, depth + 1),
                this.generate(midX, x2, midY, y2, midZ, z2, depth + 1),
            ];
        }
        return node;
    }

    addPoint(x: number, y: number, z: number, r: number, g: number, b: number, alpha: number) {
        this.maxAlpha = Math.max(this.maxAlpha, alpha);
        this.addPointHelper(x, y, z, r, g, b, alpha, this.root, 0);
    }

    addPointHelper(
        x: number,
        y: number,
        z: number,
        r: number,
        g: number,
        b: number,
        alpha: number,
        node: OctreeNode,
        depth: number
    ) {
        if (depth === this.granularity) {
            node.points.push(x, y, z, r, g, b, alpha);
        }

        node.length += 1

        for (let c of node.children) {
            if (
                c.x1 <= x &&
                x <= c.x2 &&
                c.y1 <= y &&
                y <= c.y2 &&
                c.z1 <= z &&
                z <= c.z2
            ) {
                this.addPointHelper(x, y, z, r, g, b, alpha, c, depth + 1);
                break;
            }
        }
    }

    // pruneOctree() {

    // }

    getPoints(): number[] {
        const points: number[] = [];
        this.getPointsHelper(this.root, points);
        return points;
    }

    getPointsHelper(node: OctreeNode, points: number[]) {
        if (!node.children.length) {
            node.points.forEach((e) => points.push(e));
        }

        for (const child of node.children) {
            if (child.length > 0) {
                this.getPointsHelper(child, points);
            }
        }
    }

    optimize() {
        this.clusterPoints(this.root);
    }

    clusterPoints(node: OctreeNode) {
        if (!node.children.length) {
            node.points = kMeansClustering(node.points).centroids;
        }

        for (const child of node.children) {
            if (child.length > 0) {
                this.clusterPoints(child);
            }
        }
    }
}

class OctreeNode {
    points: number[] = [];
    children: OctreeNode[] = [];
    length: number = 0;
    x1 = 0;
    x2 = 0;
    y1 = 0;
    y2 = 0;
    z1 = 0;
    z2 = 0;

    constructor(
        x1: number,
        x2: number,
        y1: number,
        y2: number,
        z1: number,
        z2: number
    ) {
        this.x1 = x1;
        this.x2 = x2;
        this.y1 = y1;
        this.y2 = y2;
        this.z1 = z1;
        this.z2 = z2;
    }
}

export default Octree;
