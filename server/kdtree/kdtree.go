package kdtree

import (
	"math"
	"sync"
	c "lidar/constants"
	// "fmt"
)

var pointOffset int = c.PointOffset

type KDTreeNode struct {
	Left *KDTreeNode
	Right *KDTreeNode
	Count int
	Axis int 
	Data []float64
	WgtCenter []float64
	RealCentroid []float64
	Size int
	CandidateSet []*MeansInstance
}

type MeansInstance struct {
	WgtCenter []float64
	Data []float64
	Count int
}

func InitMeansInstance(dimension int, points []float64) *MeansInstance {
	wgtCenter := make([]float64, dimension)

	if points != nil && len(points) == dimension {
		copy(wgtCenter, points)
	}

	return &MeansInstance{
		WgtCenter: wgtCenter,
		Data: points,
		Count: 1,
	}
}

func (ms *MeansInstance) AddTree(kd *KDTreeNode) {
	for i := 0; i < len(kd.WgtCenter); i++ {
		ms.WgtCenter[i] += kd.WgtCenter[i]
	} 
	
	ms.Count += kd.Count
}

func (ms *MeansInstance) GetRealPoints() []float64 {
	res := make([]float64, len(ms.WgtCenter))

	for i := 0; i < len(res); i++ {
		res[i] = ms.WgtCenter[i] / float64(ms.Count)
	}

	return res
}

func (ms *MeansInstance) IsFurther(otherCentroid *MeansInstance, cells []*KDTreeNode) bool {
	if ms == otherCentroid {
		return false
	}

	cMin, cMax := make([]float64, 3), make([]float64, 3)
	copy(cMin, cells[0].Data)
	copy(cMax, cells[0].Data)
	for _, kdNode := range cells {
		for i := 0; i < 3; i++ {
			cMin[i] = math.Min(cMin[i], kdNode.Data[i])
			cMax[i] = math.Max(cMax[i], kdNode.Data[i])
		}
	}

	candProd, boxProd := 0.0, 0.0
	z, zStar := ms.GetRealPoints(), otherCentroid.GetRealPoints()
	for i := 0; i < 3; i++ {
		candCompare := z[i] - zStar[i]
		candProd += candCompare * candCompare

		if candCompare > 0 {
			boxProd += (cMax[i] - zStar[i]) * candCompare 
		} else {
			boxProd += (cMin[i] - zStar[i]) * candCompare 
		}
	}

	return candProd >= 2 * boxProd
}

func Init(point []float64, left, right *KDTreeNode, axis, size int) *KDTreeNode {
	count := 1
	// fmt.Println("INIT POINT = ", point)
	wgtCenter := make([]float64, pointOffset) 
	copy(wgtCenter, point)

	if left != nil {
		count += left.Count
		wgtCenter[0] += left.WgtCenter[0]
		wgtCenter[1] += left.WgtCenter[1] 
		wgtCenter[2] += left.WgtCenter[2] 
		wgtCenter[3] += left.WgtCenter[3] 
		wgtCenter[4] += left.WgtCenter[4] 
		wgtCenter[5] += left.WgtCenter[5] 
		wgtCenter[6] += left.WgtCenter[6] 
		wgtCenter[7] += left.WgtCenter[7] 
	}

	if right != nil {
		count += right.Count
		wgtCenter[0] += right.WgtCenter[0]
		wgtCenter[1] += right.WgtCenter[1] 
		wgtCenter[2] += right.WgtCenter[2] 
		wgtCenter[3] += right.WgtCenter[3] 
		wgtCenter[4] += right.WgtCenter[4] 
		wgtCenter[5] += right.WgtCenter[5] 
		wgtCenter[6] += right.WgtCenter[6] 
		wgtCenter[7] += right.WgtCenter[7] 
	}

	realCenter := make([]float64, pointOffset)

	for i := 0; i < pointOffset; i++ {
		realCenter[i] = wgtCenter[i] / float64(count)
	}

	node := KDTreeNode{
		Left: left,
		Right: right,
		Data: point,
		Count: count,
		Axis: axis,
		WgtCenter: wgtCenter,
		RealCentroid: realCenter,
		Size: size,
	}

	return &node
}

func (kd *KDTreeNode) IsLeaf() bool {
	return kd.Left == nil && kd.Right == nil 
}

func (kd *KDTreeNode) GetChildNodes() []*KDTreeNode {
	arr := []*KDTreeNode{}

	var helper func (*[]*KDTreeNode, *KDTreeNode)

	helper = func(arr *[]*KDTreeNode, node *KDTreeNode) {
		(*arr) = append((*arr), node)

		if node.Left != nil {
			helper(arr, node.Left)
		}

		if node.Right != nil {
			helper(arr, node.Right)
		}
	}
	helper(&arr, kd)
	return arr
}

func closestCandidate(medoidSet []*MeansInstance, meanTuple []float64) *MeansInstance {
	distance := math.Inf(1)
	var closest *MeansInstance;

	for _, set := range medoidSet {
		diffX, diffY, diffZ := set.Data[0] - meanTuple[0], set.Data[1] - meanTuple[1], set.Data[2] - meanTuple[2]
		tempDist := diffX * diffX + diffY * diffY + diffZ * diffZ
		if tempDist < distance {
			distance = tempDist
			closest = set
		}
	}
	return closest
}

func ConstructTree(points []float64, axis int) (int, *KDTreeNode) {
	if len(points) == 0 {		
		return 0, nil
	}
	points = mergeSort(points, func(i, j []float64) bool {
		return i[axis] < j[axis]
	})

	next_axis := (axis + 1) % 3  
	median := (len(points) / (2 * pointOffset)) * pointOffset
	loc := points[median : median + pointOffset]
	leftCount, left := ConstructTree(points[:median], next_axis)
	rightCount, right := ConstructTree(points[median + pointOffset:], next_axis)

	return (leftCount + rightCount + 1), Init(loc, left, right, next_axis, leftCount + rightCount + 1)
}

func (kd *KDTreeNode) CopyTree() *KDTreeNode {
	if kd == nil {
		return nil
	}
	
	left, right := kd.Left.CopyTree(), kd.Right.CopyTree()

	return Init(kd.Data, left, right, kd.Axis, kd.Size)
}

type KDStack struct {
	arr *[]*KDTreeNode
	size int
	ptr int
	mutex sync.Mutex
	curIter int
	maxIter int
}

func InitKDStack(size, maxIter int) *KDStack {
	arr := make([]*KDTreeNode, size)

	return &KDStack{
		arr: &arr,
		size: 0,
		ptr: 0,
		mutex: sync.Mutex{},
		curIter: 0,
		maxIter: maxIter,
	}
}

func (stack *KDStack) Push(node *KDTreeNode) {
	if len(*stack.arr) >= stack.size {
		return 
	}

	stack.size++
	stack.ptr++
	(*stack.arr)[stack.ptr] = node
}

func (stack *KDStack) Pop() *KDTreeNode {
	if stack.size == 0 {
		return nil
	}
	
	stack.size--
	stack.ptr--
	popped := (*stack.arr)[stack.ptr]
	return popped
}

func (stack *KDStack) IsEmpty() bool {
	return stack.size == 0
}

func (root *KDTreeNode) Filter(candidateCentroids []*MeansInstance) {
	stack := InitKDStack(root.Size, 50)
	stack.Push(root)
	root.CandidateSet = candidateCentroids

	helper := func() {
		for !stack.IsEmpty() && stack.curIter < stack.maxIter {
			stack.mutex.Lock()
			kd := stack.Pop()
			stack.curIter++
			stack.mutex.Unlock()
	
			if kd.IsLeaf() {
				zStar := closestCandidate(kd.CandidateSet, kd.RealCentroid)
				zStar.AddTree(kd)
				kd.CandidateSet = []*MeansInstance{zStar}
				// kd.CandidateCenters.Store(strconv.Itoa(threadID), []*MeansInstance{zStar})
			} else {
				zStar := closestCandidate(kd.CandidateSet, kd.RealCentroid)
				newCandidates := []*MeansInstance{}
		
				for _, z := range kd.CandidateSet {
					if !z.IsFurther(zStar, kd.GetChildNodes()) {
						newCandidates = append(newCandidates, z)
					}
				}
		
				if len(newCandidates) == 1 {
					zStar.AddTree(kd)
				} else {
					stack.mutex.Lock()
					if kd.Left != nil {
						// newCandidates
						kd.Left.CandidateSet = newCandidates
						stack.Push(kd.Left)
					}
		
					if kd.Right != nil {
						kd.Right.CandidateSet = newCandidates
						stack.Push(kd.Right)
						// kd.Right.Filter(newCandidates)
					}
					stack.mutex.Unlock()
				}
			}
		}
	}

	go helper()
	go helper()
	go helper()
	go helper()
	go helper()
}

func mergeSort(items []float64, lambda func([]float64, []float64) bool) []float64 {
    points := len(items) / pointOffset
	
    if points == 1 {
        return items
    }
	
    mid := (points / 2) * pointOffset
	
    return merge(mergeSort(items[:mid], lambda), mergeSort(items[mid:], lambda), lambda)
}

func merge(left, right []float64, lambda func([]float64, []float64) bool) (result []float64) {
    result = make([]float64, len(left) + len(right))

    i, l, r := 0, 0, 0
    for l < len(left) && r < len(right) {
        if lambda(left[l : l + pointOffset], right[r : r + pointOffset]) {
            result[i] = left[l]
			result[i + 1] = left[l + 1]
			result[i + 2] = left[l + 2]
			result[i + 3] = left[l + 3]
			result[i + 4] = left[l + 4]
			result[i + 5] = left[l + 5]
			result[i + 6] = left[l + 6]
			result[i + 7] = left[l + 7]
			l += pointOffset
        } else {
            result[i] = right[r]
			result[i + 1] = right[r + 1]
			result[i + 2] = right[r + 2]
			result[i + 3] = right[r + 3]
			result[i + 4] = right[r + 4]
			result[i + 5] = right[r + 5]
			result[i + 6] = right[r + 6]
			result[i + 7] = right[r + 7]
			r += pointOffset
		}
        i += pointOffset
    }

    for l < len(left) {
		result[i] = left[l]
		result[i + 1] = left[l + 1]
		result[i + 2] = left[l + 2]
		result[i + 3] = left[l + 3]
		result[i + 4] = left[l + 4]
		result[i + 5] = left[l + 5]
		result[i + 6] = left[l + 6]
		result[i + 7] = left[l + 7]
        i += pointOffset
		l += pointOffset
    }

	for r < len(right) {
		result[i] = right[r]
		result[i + 1] = right[r + 1]
		result[i + 2] = right[r + 2]
		result[i + 3] = right[r + 3]
		result[i + 4] = right[r + 4]
		result[i + 5] = right[r + 5]
		result[i + 6] = right[r + 6]
		result[i + 7] = right[r + 7]
        i += pointOffset
		r += pointOffset
    }
    return
}