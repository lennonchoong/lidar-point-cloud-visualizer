package octree

import (
	"lidar/kmeans"
)

type OctreeNode struct {
	points []float64
	children []*OctreeNode
	size int
	x1 float64
	x2 float64
	y1 float64
	y2 float64
	z1 float64
	z2 float64
}

func GenerateOctree(x1, x2, y1, y2, z1, z2 float64, depth, granularity int) *OctreeNode {
	root := &OctreeNode{
		x1: x1, 
		x2: x2, 
		y1: y1, 
		y2: y2, 
		z1: z1, 
		z2: z2, 
		size: 0,
		points: []float64{},
	}

	midX := x1 + (x2 - x1) / 2;
	midY := y1 + (y2 - y1) / 2;
	midZ := z1 + (z2 - z1) / 2;

	if (depth < granularity) {
		root.children = [] *OctreeNode{
			GenerateOctree(x1, midX, y1, midY, z1, midZ, depth + 1, granularity),
			GenerateOctree(x1, midX, midY, y2, z1, midZ, depth + 1, granularity),
			GenerateOctree(x1, midX, y1, midY, midZ, z2, depth + 1, granularity),
			GenerateOctree(x1, midX, midY, y2, midZ, z2, depth + 1, granularity),
			GenerateOctree(midX, x2, y1, midY, midZ, z2, depth + 1, granularity),
			GenerateOctree(midX, x2, y1, midY, z1, midZ, depth + 1, granularity),
			GenerateOctree(midX, x2, midY, y2, z1, midZ, depth + 1, granularity),
			GenerateOctree(midX, x2, midY, y2, midZ, z2, depth + 1, granularity),
		}
	}

	return root;
}

func AddPoint(x, y, z, r, g, b, alpha float64, depth, granularity int, node *OctreeNode) {
	if (depth == granularity) {
		node.points = append(node.points, x, y, z, r, g, b, alpha);
	}

	node.size += 1

	for _, child := range node.children {
		if (
			child.x1 <= x && x <= child.x2 &&
			child.y1 <= y && y <= child.y2 &&
			child.z1 <= z && z <= child.z2) {
			AddPoint(x, y, z, r, g, b, alpha, depth + 1, granularity, child);
			break;
		}
	}
}

func GetPoints(root *OctreeNode, arr *[]float64) {
	if (len(root.children) <= 0) {
		*arr = append(*arr, root.points...);
	}

	for _, child := range root.children {
		if (child.size > 0) {
			GetPoints(child, arr);
		}
	}
} 

func ClusterPoints(root *OctreeNode) {
	if (len(root.children) <= 0) {
		root.points = kmeans.KMeansClustering(root.points);
		return
	}

	for _, child := range root.children {
		if (child.size > 0) {
			ClusterPoints(child);
		}
	}
}