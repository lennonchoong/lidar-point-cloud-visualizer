package octree

import (
	"lidar/kmeans"
	utils "lidar/loader_utils"
	"lidar/structs"
	"sync"
	"time"

	"github.com/golang-collections/collections/stack"
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
	Level int
	Parent *OctreeNode
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

func GenerateOctree(dimensions *OctreeDimensions) *Octree {
	defer utils.TimeTrack(time.Now(), "GenerateOctree")

	// fmt.Println("OCTREE DIMENSINS", dimensions.X1, dimensions.X2, dimensions.Y1, dimensions.Y2, dimensions.Z1, dimensions.Z2)
	root := GenerateOctreeNodes(
		dimensions.X1, 
		dimensions.X2,
		dimensions.Y1,
		dimensions.Y2,
		dimensions.Z1,
		dimensions.Z2,
		dimensions.Granularity,
		nil,
	)
	
	ptr := &Octree{
		Root: root,
		Leaves: []*OctreeNode{},
		Granularity: dimensions.Granularity,
	}
	// c <- ptr
	return ptr
}

func GenerateOctreeNodes(x1, x2, y1, y2, z1, z2 float64, granularity int, parent *OctreeNode) *OctreeNode {
	root := &OctreeNode{
		X1: x1, 
		X2: x2, 
		Y1: y1, 
		Y2: y2, 
		Z1: z1, 
		Z2: z2, 
		Points: []float64{},
		Mutex: sync.Mutex{},
		Parent: parent,
	}

	midX := x1 + (x2 - x1) / 2.0;
	midY := y1 + (y2 - y1) / 2.0;
	midZ := z1 + (z2 - z1) / 2.0;
	concurrencyLevel := 3

	if (granularity == concurrencyLevel) {
		root.Children = make([]*OctreeNode, 8)
		wg := sync.WaitGroup{}
		helper := func(x1, x2, y1, y2, z1, z2 float64, granularity, i int) {
			root.Children[i] = GenerateOctreeNodesConcurrent(x1, x2, y1, y2, z1, z2, granularity, root)
			wg.Done()
		}
		wg.Add(8)
		go helper(x1, midX, y1, midY, z1, midZ, granularity - 1, 0)
		go helper(x1, midX, midY, y2, z1, midZ, granularity - 1, 1)
		go helper(x1, midX, y1, midY, midZ, z2, granularity - 1, 2)
		go helper(x1, midX, midY, y2, midZ, z2, granularity - 1, 3)
		go helper(midX, x2, y1, midY, midZ, z2, granularity - 1, 4)
		go helper(midX, x2, y1, midY, z1, midZ, granularity - 1, 5)
		go helper(midX, x2, midY, y2, z1, midZ, granularity - 1, 6)
		go helper(midX, x2, midY, y2, midZ, z2, granularity - 1, 7)
		wg.Wait()
	} else if (granularity > concurrencyLevel) {
		root.Children = [] *OctreeNode{
			GenerateOctreeNodes(x1, midX, y1, midY, z1, midZ, granularity - 1, root),
			GenerateOctreeNodes(x1, midX, midY, y2, z1, midZ, granularity - 1, root),
			GenerateOctreeNodes(x1, midX, y1, midY, midZ, z2, granularity - 1, root),
			GenerateOctreeNodes(x1, midX, midY, y2, midZ, z2, granularity - 1, root),
			GenerateOctreeNodes(midX, x2, y1, midY, midZ, z2, granularity - 1, root),
			GenerateOctreeNodes(midX, x2, y1, midY, z1, midZ, granularity - 1, root),
			GenerateOctreeNodes(midX, x2, midY, y2, z1, midZ, granularity - 1, root),
			GenerateOctreeNodes(midX, x2, midY, y2, midZ, z2, granularity - 1, root),
		}
	}

	return root;
}

func GenerateOctreeNodesConcurrent(x1, x2, y1, y2, z1, z2 float64, granularity int, parent *OctreeNode) *OctreeNode {
	root := &OctreeNode{
		X1: x1, 
		X2: x2, 
		Y1: y1, 
		Y2: y2, 
		Z1: z1, 
		Z2: z2, 
		Points: []float64{},
		Mutex: sync.Mutex{},
		Level: granularity,
		Parent: parent,
	}

	stack := stack.New()

	stack.Push(root)

	for stack.Len() > 0 {
		popped := stack.Pop().(*OctreeNode)

		if popped.Level <= 0 {
			continue
		}

		midX := popped.X1 + (popped.X2 - popped.X1) / 2.0;
		midY := popped.Y1 + (popped.Y2 - popped.Y1) / 2.0;
		midZ := popped.Z1 + (popped.Z2 - popped.Z1) / 2.0;

		c1 := &OctreeNode{X1: popped.X1, X2: midX, Y1: popped.Y1, Y2: midY, Z1: popped.Z1, Z2: midZ, Points: []float64{}, Mutex: sync.Mutex{}, Level: popped.Level - 1, Parent: popped}
		c2 := &OctreeNode{X1: popped.X1, X2: midX, Y1: midY, Y2: popped.Y2, Z1: popped.Z1, Z2: midZ, Points: []float64{}, Mutex: sync.Mutex{}, Level: popped.Level - 1, Parent: popped}
		c3 := &OctreeNode{X1: popped.X1, X2: midX, Y1: popped.Y1, Y2: midY, Z1: midZ, Z2: popped.Z2, Points: []float64{}, Mutex: sync.Mutex{}, Level: popped.Level - 1, Parent: popped}
		c4 := &OctreeNode{X1: popped.X1, X2: midX, Y1: midY, Y2: popped.Y2, Z1: midZ, Z2: popped.Z2, Points: []float64{}, Mutex: sync.Mutex{}, Level: popped.Level - 1, Parent: popped}
		c5 := &OctreeNode{X1: midX, X2: popped.X2, Y1: popped.Y1, Y2: midY, Z1: midZ, Z2: popped.Z2, Points: []float64{}, Mutex: sync.Mutex{}, Level: popped.Level - 1, Parent: popped}
		c6 := &OctreeNode{X1: midX, X2: popped.X2, Y1: popped.Y1, Y2: midY, Z1: popped.Z1, Z2: midZ, Points: []float64{}, Mutex: sync.Mutex{}, Level: popped.Level - 1, Parent: popped}
		c7 := &OctreeNode{X1: midX, X2: popped.X2, Y1: midY, Y2: popped.Y2, Z1: popped.Z1, Z2: midZ, Points: []float64{}, Mutex: sync.Mutex{}, Level: popped.Level - 1, Parent: popped}
		c8 := &OctreeNode{X1: midX, X2: popped.X2, Y1: midY, Y2: popped.Y2, Z1: midZ, Z2: popped.Z2, Points: []float64{}, Mutex: sync.Mutex{}, Level: popped.Level - 1, Parent: popped}

		popped.Children = []*OctreeNode{c1, c2, c3, c4, c5, c6, c7, c8}

		for _, child := range popped.Children {
			stack.Push(child)
		}
	}

	return root
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
			node.Active = true;
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

func ClusterPoints(socket *structs.ConcurrentSocket, leaves *[]*OctreeNode, wg *sync.WaitGroup) {
	defer utils.TimeTrack(time.Now(), "ClusterPoints")

	for _, leaf := range *leaves {
		wg.Add(1)
		go func(leaf *OctreeNode) {
			defer wg.Done()
			leaf.Points = kmeans.KMeansClustering(leaf.Points);
		}(leaf)
	}
}
