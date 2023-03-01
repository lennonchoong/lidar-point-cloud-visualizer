package kmeans

import (
	// "fmt"
	"math"
	"sync"

	utils "lidar/loader_utils"
	"time"

	"github.com/puzpuzpuz/xsync"
	"golang.org/x/exp/rand"
	"lidar/kdtree"
	// "gonum.org/v1/gonum/spatial/kdtree"
)

var pointOffset int = 7
var maxIterations int = 10

var GlobalTimetracker = xsync.NewMap()

type ClusterLabels struct {
	points []float64
	centroids []float64
}

type ClusterResult struct {
	labels map[int]*ClusterLabels
	centroids []float64
	cost float64
}

func randomBetween(min, max int) int {
	if min == max {
		return min
	}

	return rand.Intn(max - min) + min
}

func generateKRandNums(min, max, k int, arr *[]int) {
	if len(*arr) == k || min > max {
		return
	}

	num := randomBetween(min, max)
	*arr = append(*arr, num)
	generateKRandNums(min, num - 1, k, arr)
	generateKRandNums(num + 1, max, k, arr)
}

func getRandomCentroids(points []float64, k int) []float64 {
	defer utils.TimeTrackMap(time.Now(), "getRandomCentroids", GlobalTimetracker)

	numSamples := len(points) / pointOffset;
	centroidIndexes := []int{}
	generateKRandNums(0, numSamples, k, &centroidIndexes)

	centroids := [] float64{}
	for _, idx := range centroidIndexes {
		centroids = append(centroids,
			points[idx * pointOffset : (idx + 1) * pointOffset]...
		)
	}

	return centroids;
} 

func shouldStop(oldCentroids, centroids []float64, iterations int) bool {
	defer utils.TimeTrackMap(time.Now(), "shouldStop", GlobalTimetracker)

	if iterations > maxIterations {
		return true
	}

	if (len(oldCentroids) == 0) {
		return false
	}

	for i := 0; i < len(centroids); i += pointOffset {
		if (centroids[i] != oldCentroids[i] ||
		centroids[i + 1] != oldCentroids[i + 1] ||
		centroids[i + 2] != oldCentroids[i + 2]) {
			return false
		}
	}

	return true
}

func getDistanceSquared(x1, y1, z1, x2, y2, z2 float64) float64 {
	xDiff := x1 - x2
	yDiff := y1 - y2
	zDiff := z1 - z2
	return xDiff * xDiff + yDiff * yDiff + zDiff * zDiff
}

func getLabels(points, centroids []float64) map[int]*ClusterLabels {
	defer utils.TimeTrackMap(time.Now(), "getLabels", GlobalTimetracker)
	labels := make(map[int]*ClusterLabels)

	for i := 0; i < len(centroids); i += pointOffset {
		labels[i] = &ClusterLabels {
			points: []float64{}, 
			centroids: centroids[i: i + pointOffset],
		}
	}
	
	for i := 0; i < len(points); i += pointOffset {
		x1, y1, z1, r1, g1, b1, alpha1 := points[i], points[i + 1], points[i + 2], points[i + 3], points[i + 4], points[i + 5], points[i + 6];
		closestCentroidX, closestCentroidY, closestCentroidZ, closestCentroidIndex, prevDistance := 0.0, 0.0, 0.0, 0 ,0.0;
		
		for j := 0; j < len(centroids); j += pointOffset {
			if j == 0 {
				closestCentroidX, closestCentroidY, closestCentroidZ, closestCentroidIndex = centroids[j], centroids[j + 1], centroids[j + 2], j;
				prevDistance = getDistanceSquared(x1, y1, z1, closestCentroidX, closestCentroidY, closestCentroidZ);
			} else {
				distance := getDistanceSquared(x1, y1, z1, centroids[j], centroids[j + 1], centroids[j + 2]);
				if distance < prevDistance {
					prevDistance = distance
					closestCentroidX, closestCentroidY, closestCentroidZ = centroids[j], centroids[j + 1], centroids[j + 2];
					closestCentroidIndex = j
				}
			}
		}
		labels[closestCentroidIndex].points = append(labels[closestCentroidIndex].points, x1, y1, z1, r1, g1, b1, alpha1)
	}

	return labels;
}

func getPointsMean(points []float64) []float64 {
	defer utils.TimeTrackMap(time.Now(), "getPointsMean", GlobalTimetracker)

	totalPoints := float64(len(points) / pointOffset);
	means := []float64{0, 0, 0, 0, 0, 0, 0}

	for i := 0; i < len(points); i += pointOffset {
		means[0] = means[0] + points[i] / totalPoints;
		means[1] = means[1] + points[i + 1] / totalPoints;
		means[2] = means[2] + points[i + 2] / totalPoints;
		means[3] = means[3] + points[i + 3] / totalPoints;
		means[4] = means[4] + points[i + 4] / totalPoints;
		means[5] = means[5] + points[i + 5] / totalPoints;
		means[6] = math.Max(means[6], points[i + 6]);
	}

	return means;
}

func recalculateCentroids(points []float64, labels map[int]*ClusterLabels) []float64 {
	defer utils.TimeTrackMap(time.Now(), "recalculateCentroids", GlobalTimetracker)
	newCentroidList := []float64{};
	newCentroid := []float64{}
	for _, group := range labels {
		if len(group.points) > 0 {
			newCentroid = getPointsMean(group.points);
		} else {
			newCentroid = getRandomCentroids(points, 1)[:pointOffset];
		}

		newCentroidList = append(newCentroidList, newCentroid...);
	}

	return newCentroidList
}

func kMeansHelper(points []float64, k int) *ClusterResult {
	defer utils.TimeTrackMap(time.Now(), "kMeansHelper", GlobalTimetracker)
	if len(points) != 0 && len(points) > k {
		iterations := 0;
		labels := make(map[int]*ClusterLabels)
		centroids := getRandomCentroids(points, k)
		oldCentroids := make([]float64, k * pointOffset)
		for !shouldStop(oldCentroids, centroids, iterations) {
			iterations++;
			labels = getLabels(points, centroids);
			oldCentroids = centroids
			centroids = recalculateCentroids(points, labels);
		}

		return &ClusterResult{
			labels,
			centroids,
			elbowCostFunction(labels),
		}
	}

	return &ClusterResult{
		nil,
		[]float64 {},
		0,
	}
}

func elbowCostFunction(labels map[int]*ClusterLabels) float64 {
	defer utils.TimeTrackMap(time.Now(), "elbowCostFunction", GlobalTimetracker)

	cost := 0.0
	for _, label := range labels {
		centroidX, centroidY, centroidZ := label.centroids[0], label.centroids[1], label.centroids[2]
		points := label.points

		for i := 0; i < len(points); i += pointOffset {
			cost += getDistanceSquared(centroidX, centroidY, centroidZ, points[i], points[i + 1], points[i + 2])
		}
	}

	return cost
}

func elbowMethod(points []float64) *ClusterResult {
	defer utils.TimeTrackMap(time.Now(), "elbowMethod", GlobalTimetracker)

	n := len(points) / pointOffset;
	maxJ := math.Inf(-1)
	maxJIndex := 1;
	d := make([]float64, n / 2 + 1);
	mapping := make([]*ClusterResult, n / 2 + 1);
	d[0] = 0.0
	skip := 3

	wg := sync.WaitGroup{}

	j := 0
	for i := 1; i <= n / 2; i += skip {
		wg.Add(1)
		go func(i int) {
			clusteringResult := kMeansHelper(points, i);
			mapping[i] = clusteringResult;
			d[i] = clusteringResult.cost
			wg.Done()
		}(i)
		j++;
	}

	wg.Wait()

	for i := 0; i < len(d) - 1; i += skip {
		if i + 1 + skip < len(d) && math.Abs(d[i] - d[i + 1 + skip]) > maxJ {
			maxJ = math.Abs(d[i] - d[i + 1 + skip])
			maxJIndex = i + 1 + skip;
		}
	}

	return mapping[maxJIndex]
}

func optimizedElbowMethod(points []float64) *ClusterResult{
	n := len(points) / pointOffset;

	if n <= 1 {
		return &ClusterResult{
			nil,
			points,
			0,
		}
	}

	d := n / 2 + 1
	clusters := make([]*ClusterResult, d)
	diff := make([]float64, d);
	diff[0] = 0.0
	l, r := 1, len(diff)

	if l >= r {
		return kMeansHelper(points, l)
	}

	for l < r {
		mid := l + (r - l) / 2

		if mid > 1 && mid < d && diff[mid] == 0 {
			if clusters[mid - 1] == nil {
				clusters[mid - 1] = kMeansHelper(points, mid - 1)
			}
			if clusters[mid] == nil {
				clusters[mid] = kMeansHelper(points, mid)
			}

			diff[mid] = math.Abs(clusters[mid - 1].cost - clusters[mid].cost)
		}

		if mid > 3 && mid - 1 < d && diff[mid - 1] == 0 {
			if clusters[mid - 2] == nil {
				clusters[mid - 2] = kMeansHelper(points, mid - 2)
			}
			if clusters[mid - 1] == nil {
				clusters[mid - 1] = kMeansHelper(points, mid - 1)
			}

			diff[mid - 1] = math.Abs(clusters[mid - 2].cost - clusters[mid - 1].cost)
		}

		if mid + 1 < d && mid > 0 && diff[mid + 1] == 0 {
			if clusters[mid + 1] == nil {
				clusters[mid + 1] = kMeansHelper(points, mid + 1)
			}
			if clusters[mid] == nil {
				clusters[mid] = kMeansHelper(points, mid)
			}

			diff[mid + 1] = math.Abs(clusters[mid + 1].cost - clusters[mid].cost)
		}

		if (mid > 0 && diff[mid - 1] < diff[mid]) &&
		(mid < d - 1 && diff[mid] > diff[mid + 1]) {
			return clusters[mid]
		} else if (
			mid > 0 && mid < d - 1 && 
			diff[mid - 1] >= diff[mid] &&
			diff[mid] >= diff[mid + 1]) {
			r = mid - 1
		} else {
			l = mid + 1
		}
	}
	
	// last := int(math.Min(float64(r), float64(len(clusters) - 1)))

	// if clusters[d] == nil {
	// 	clusters[d] = 
	// }

	return kMeansHelper(points, d)
}

func kdElbowCostFunction(centroids, points []float64) float64 {
	total := 0.0

	for i := 0; i < len(points); i += pointOffset {
		curMin := math.MaxFloat64

		for j := 0; j < len(centroids); j += pointOffset {
			diffX, diffY, diffZ := points[i] - centroids[j], points[i + 1] - centroids[j + 1], points[i + 2] - centroids[j + 2]
			curMin = math.Min(curMin, diffX * diffX + diffY * diffY + diffZ * diffZ)
		}
		total += curMin
	}
	return total / float64(len(centroids))
}

func kdElbowMethod(points []float64) *ClusterResult {
	defer utils.TimeTrackMap(time.Now(), "kdElbowMethod", GlobalTimetracker)
	n := len(points) / pointOffset;
	maxJ := math.Inf(1)
	maxJIndex := 1;
	d := make([]float64, n / 2 + 1);
	mapping := make([]*[]float64, n / 2 + 1);
	d[0] = 0.0
	
	_, tree := kdtree.ConstructTree(points, 0)

	wg := sync.WaitGroup{}

	for i := 1; i <= n / 2; i++ {
		wg.Add(1)
		go func(i int) {
			randomCentroids := getRandomCentroids(points, i)
			candidateSet := []*kdtree.MeansInstance{}	
			for i := 0; i < len(randomCentroids); i += pointOffset {
				candidateSet = append(candidateSet, kdtree.InitMeansInstance(pointOffset, points[i : i + pointOffset]))
			}
			tree.CopyTree().Filter(candidateSet)
			centroids := []float64{}
			for _, candidate := range candidateSet {
				centroids = append(centroids, candidate.GetRealPoints()...)
			}

			labels := getLabels(points, centroids)
			d[i] = elbowCostFunction(labels)
			mapping[i] = &centroids
			wg.Done()
		}(i)
	}

	wg.Wait()

	for i := 1; i < len(d); i++ {
		if d[i] < maxJ {
			maxJ = d[i]
			maxJIndex = i 
		}
	}
	
	return &ClusterResult{
		nil, 
		*mapping[maxJIndex],
		0,
	}
}

type Point struct {
	X []float64
	Y int
}

// Dist returns the Euclidean distance between two points
func (a Point) Dist(b Point) float64 {
	var sum float64
	for i := range a.X {
		sum += (a.X[i] - b.X[i]) * (a.X[i] - b.X[i])
	}
	return math.Sqrt(sum)
}


func kdTreeKMeansClustering(points []float64, k int) {
}

func KMeansClustering(points []float64) []float64 {
	if (len(points) <= pointOffset) {
		return points;
	}
	// res := optimizedElbowMethod(points).centroids;

	return kdElbowMethod(points).centroids;
	// return elbowMethod(points).centroids;
	// return kMeansHelper(points, 2).centroids
}