package kmeans

import (
	"math"
	"golang.org/x/exp/maps"
	"golang.org/x/exp/rand"
	"golang.org/x/exp/slices"
)

var pointOffset int = 7
var maxIterations int = 50

type ClusterLabels struct {
	points []float64
	centroids []float64
}

type ClusterResult struct {
	labels map[int]*ClusterLabels
	centroids []float64
}

func randomBetween(min, max int) int {
	return rand.Intn(max - min) + min
}

func getRandomCentroids(points []float64, k int) []float64 {
	numSamples := len(points) / pointOffset;
	centroidIndexes := [] int{}
	i := 0

	for len(centroidIndexes) < k {
		i = randomBetween(0, numSamples); 

		if (!slices.Contains(centroidIndexes, i)) {
			centroidIndexes = append(centroidIndexes, i);
		}
	}

	centroids := [] float64{}
	for _, idx := range centroidIndexes {
		centroids = append(centroids,
			points[idx * pointOffset : (idx + 1) * pointOffset]...
		)
	}

	return centroids;
} 

func shouldStop(oldCentroids, centroids []float64, iterations int) bool {
	if iterations > maxIterations {
		return true
	}

	if (len(oldCentroids) == 0) {
		return false
	}

	sameCount := true
	for i := 0; i < len(centroids); i += pointOffset {
		if (centroids[i] != oldCentroids[i] ||
		centroids[i + 1] != oldCentroids[i + 1] ||
		centroids[i + 2] != oldCentroids[i + 2]) {
			sameCount = false
		}
	}

	return sameCount
}

func getDistanceSquared(x1, y1, z1, x2, y2, z2 float64) float64 {
	xDiff := x1 - x2
	yDiff := y1 - y2
	zDiff := z1 - z2
	return xDiff * xDiff + yDiff * yDiff + zDiff * zDiff
}

func getLabels(points, centroids []float64) map[int]*ClusterLabels {
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
	newCentroid := []float64{};
	newCentroidList := []float64{};

	for _, group := range labels {
		if len(group.points) > 0 {
			newCentroid = getPointsMean(group.points);
		} else {
			newCentroid = getRandomCentroids(points, 1)[:pointOffset];
		}
		newCentroidList = append(newCentroidList, newCentroid...)
	}
	return newCentroidList
}

func kMeansHelper(points []float64, k int) *ClusterResult {
	if len(points) != 0 && len(points) > k {
		iterations := 0;
		labels := make(map[int]*ClusterLabels)
		centroids := getRandomCentroids(points, k)
		oldCentroids := make([]float64, k * pointOffset)
		for !shouldStop(oldCentroids, centroids, iterations) {
			copy(oldCentroids, centroids)
			iterations++;
			labels = getLabels(points, centroids);
			centroids = recalculateCentroids(points, labels);
		}

		return &ClusterResult{
			labels,
			centroids,
		}
	}

	return &ClusterResult{
		nil,
		[]float64 {},
	}
}

func elbowCostFunction(labels []*ClusterLabels) float64 {
	cost := 0.0
	for _, label := range labels {
		centroidX, centroidY, centroidZ := label.centroids[0], label.centroids[1], label.centroids[2]
		points := label.points

		for i := 0; i < len(points); i += pointOffset {
			diffX, diffY, diffZ := centroidX - points[i], centroidY - points[i + 1], centroidZ - points[i + 2]
			cost += diffX * diffX + diffY * diffY + diffZ * diffZ
		}
	}

	return cost
}

func elbowMethod(points []float64) *ClusterResult{
	d := []float64{0.0};
	mapping := make(map[int]*ClusterResult);
	n := len(points) / pointOffset;
	maxJ := math.Inf(-1)
	maxJIndex := 1;

	for i := 1; i <= n / 2; i++ {
		clusteringResult := kMeansHelper(points, i);
		mapping[i] = clusteringResult;
		d = append(d, elbowCostFunction(maps.Values(clusteringResult.labels)));
	}

	for i := 0; i < n / 2 - 1; i++ {
		if d[i] - d[i + 1] > maxJ {
			maxJ = d[i] - d[i + 1]
			maxJIndex = i + 1;
		}
	}

	return mapping[maxJIndex];
}

func KMeansClustering(points []float64) []float64 {
	if (len(points) <= pointOffset) {
		return points;
	}
	return elbowMethod(points).centroids;
}