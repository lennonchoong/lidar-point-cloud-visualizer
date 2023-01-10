package octree

import (
	"lidar/kmeans"
	"lidar/structs"
	utils "lidar/loader_utils"
	"time"
	"sync"
)

type Octree struct {
	Root *OctreeNode
	Leaves []*OctreeNode
	Granularity int
	Mutex sync.Mutex
}

type OctreeNode struct {
	Points []float64
	Mutex sync.Mutex
	Children []*OctreeNode
	X1 float64
	X2 float64
	Y1 float64
	Y2 float64
	Z1 float64
	Z2 float64
	Active bool
}

type OctreeDimensions struct {
	X1 float64
	X2 float64
	Y1 float64
	Y2 float64
	Z1 float64
	Z2 float64
	Granularity int
}

func GenerateOctree(dimensions *OctreeDimensions, c chan *Octree) *Octree {
	defer utils.TimeTrack(time.Now(), "GenerateOctree")

	// fmt.Println("OCTREE DIMENSINS", dimensions.X1, dimensions.X2, dimensions.Y1, dimensions.Y2, dimensions.Z1, dimensions.Z2)
	root := GenerateOctreeNodes(
		dimensions.X1, 
		dimensions.X2,
		dimensions.Y1,
		dimensions.Y2,
		dimensions.Z1,
		dimensions.Z2,
		0, 
		dimensions.Granularity,
	)
	
	ptr := &Octree{
		Root: root,
		Leaves: []*OctreeNode{},
		Granularity: dimensions.Granularity,
	}
	// c <- ptr
	return ptr
}

// Create concurrent wrapper to handle generation of each of 8 child from root

func GenerateOctreeNodes(x1, x2, y1, y2, z1, z2 float64, depth, granularity int) *OctreeNode {
	root := &OctreeNode{
		X1: x1, 
		X2: x2, 
		Y1: y1, 
		Y2: y2, 
		Z1: z1, 
		Z2: z2, 
		Points: []float64{},
		Mutex: sync.Mutex{},
	}

	midX := x1 + (x2 - x1) / 2.0;
	midY := y1 + (y2 - y1) / 2.0;
	midZ := z1 + (z2 - z1) / 2.0;

	if (depth < granularity) {
		root.Children = [] *OctreeNode{
			GenerateOctreeNodes(x1, midX, y1, midY, z1, midZ, depth + 1, granularity),
			GenerateOctreeNodes(x1, midX, midY, y2, z1, midZ, depth + 1, granularity),
			GenerateOctreeNodes(x1, midX, y1, midY, midZ, z2, depth + 1, granularity),
			GenerateOctreeNodes(x1, midX, midY, y2, midZ, z2, depth + 1, granularity),
			GenerateOctreeNodes(midX, x2, y1, midY, midZ, z2, depth + 1, granularity),
			GenerateOctreeNodes(midX, x2, y1, midY, z1, midZ, depth + 1, granularity),
			GenerateOctreeNodes(midX, x2, midY, y2, z1, midZ, depth + 1, granularity),
			GenerateOctreeNodes(midX, x2, midY, y2, midZ, z2, depth + 1, granularity),
		}
	}

	return root;
}

type CounterLock struct {
	Count int 
	M sync.Mutex
}

func AddPoint(x, y, z, r, g, b, alpha float64, depth, granularity int, node *OctreeNode, tree *Octree) {
	if (depth == granularity) {
		node.Mutex.Lock()
		node.Points = append(node.Points, x, y, z, r, g, b, alpha);
		node.Mutex.Unlock()

		if (!node.Active) {
			tree.Mutex.Lock()
			node.Active = true; // Needs another mutex
			tree.Leaves = append(tree.Leaves, node)
			tree.Mutex.Unlock()
		}
	}

	node.Active = true;

	for _, child := range node.Children {
		if (
			child.X1 <= x && x <= child.X2 &&
			child.Y1 <= y && y <= child.Y2 &&
			child.Z1 <= z && z <= child.Z2) {
			AddPoint(x, y, z, r, g, b, alpha, depth + 1, granularity, child, tree);
			break;
		}
	}
}

func GetPoints(root *OctreeNode, arr *[]float64) {
	if (len(root.Children) <= 0) {
		// fmt.Println("GETTING POINTS", root.Points);
		*arr = append(*arr, root.Points...);
	}

	for _, child := range root.Children {
		if (child.Active) {
			GetPoints(child, arr);
		}
	}
} 

func ClusterPoints(socket *structs.ConcurrentSocket, leaves *[]*OctreeNode, m *structs.LASMetaData, wg *sync.WaitGroup) {
	defer utils.TimeTrack(time.Now(), "ClusterPoints")

	for _, leaf := range *leaves {
		wg.Add(1)
		go func(leaf *OctreeNode) {
			defer wg.Done()

			leaf.Points = kmeans.KMeansClustering(leaf.Points);

			for i := 0; i < len(leaf.Points); i += 7 {
				leaf.Points[i] = leaf.Points[i] + m.OffsetX
				leaf.Points[i + 1] = leaf.Points[i + 1] + m.OffsetZ
				leaf.Points[i + 2] = leaf.Points[i + 2] + m.OffsetY
			}
		}(leaf)
	}
}
