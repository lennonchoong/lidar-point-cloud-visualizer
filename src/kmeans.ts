const MAX_ITERATIONS = 50;

const randomBetween = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min) + min);
};

// const calcMeanCentroid = (dataSet: number[], start: number, end: number) => {
//     const features = dataSet[0].length;
//     const n = end - start;
//     let mean = [];
//     for (let i = 0; i < features; i++) {
//         mean.push(0);
//     }

//     for (let i = start; i < end; i++) {
//         for (let j = 0; j < features; j++) {
//             mean[j] = mean[j] + dataSet[i][j] / n;
//         }
//     }

//     return mean;
// };

// function getRandomCentroidsNaiveSharding(dataset, k) {
//     // implementation of a variation of naive sharding centroid initialization method
//     // (not using sums or sorting, just dividing into k shards and calc mean)
//     // https://www.kdnuggets.com/2017/03/naive-sharding-centroid-initialization-method.html
//     const numSamples = dataset.length;
//     // Divide dataset into k shards:
//     const step = Math.floor(numSamples / k);
//     const centroids = [];
//     for (let i = 0; i < k; i++) {
//         const start = step * i;
//         let end = step * (i + 1);
//         if (i + 1 === k) {
//             end = numSamples;
//         }
//         centroids.push(calcMeanCentroid(dataset, start, end));
//     }
//     return centroids;
// }

const getRandomCentroids = (dataset: number[], k: number) => {
    // selects random points as centroids from the dataset
    const numSamples = dataset.length / 3;
    const centroidsIndex: number[] = [];
    let i;
    while (centroidsIndex.length < k) {
        i = randomBetween(0, numSamples);
        !centroidsIndex.includes(i) && centroidsIndex.push(i);
    }

    const centroids = [];
    for (let i = 0; i < centroidsIndex.length; i++) {
        centroids.push(
            dataset[centroidsIndex[i] * 3],
            dataset[centroidsIndex[i] * 3 + 1],
            dataset[centroidsIndex[i] * 3 + 2]
        );
    }
    return centroids;
};

const shouldStop = (
    oldCentroids: number[] | undefined,
    centroids: number[],
    iterations: number
) => {
    if (iterations > MAX_ITERATIONS) {
        return true;
    }
    if (!oldCentroids || !oldCentroids.length) {
        return false;
    }
    let sameCount = true;
    for (let i = 0; i < centroids.length; i += 3) {
        if (
            centroids[i] != oldCentroids[i] ||
            centroids[i + 1] != oldCentroids[i + 1] ||
            centroids[i + 2] != oldCentroids[i + 2]
        ) {
            sameCount = false;
        }
    }
    return sameCount;
};

// Calculate Squared Euclidean Distance
function getDistanceSQ(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number
) {
    const [xDiff, yDiff, zDiff] = [x1 - x2, y1 - y2, z1 - z2];
    return xDiff * xDiff + yDiff * yDiff + zDiff * zDiff;
}

interface PointKMeanMetadata {
    points: number[];
    centroid: number[];
}

// Returns a label for each piece of data in the dataset.
function getLabels(dataSet: number[], centroids: number[]) {
    // prep data structure:
    const labels: { [key: number]: PointKMeanMetadata } = {};

    for (let c = 0; c < centroids.length; c += 3) {
        labels[c] = {
            points: [],
            centroid: [centroids[c], centroids[c + 1], centroids[c + 2]],
        };
    }
    // For each element in the dataset, choose the closest centroid.
    // Make that centroid the element's label.
    for (let i = 0; i < dataSet.length; i += 3) {
        const [x1, y1, z1] = [dataSet[i], dataSet[i + 1], dataSet[i + 2]];
        let closestCentroidX, closestCentroidY, closestCentroidZ;
        let closestCentroidIndex = 0;
        let prevDistance = 0;

        for (let j = 0; j < centroids.length; j += 3) {
            if (j === 0) {
                closestCentroidX = centroids[j];
                closestCentroidY = centroids[j + 1];
                closestCentroidZ = centroids[j + 2];
                closestCentroidIndex = j;
                prevDistance = getDistanceSQ(
                    x1,
                    y1,
                    z1,
                    closestCentroidX,
                    closestCentroidY,
                    closestCentroidZ
                );
            } else {
                // get distance:
                const distance = getDistanceSQ(
                    x1,
                    y1,
                    z1,
                    centroids[j],
                    centroids[j + 1],
                    centroids[j + 2]
                );
                if (distance < prevDistance) {
                    prevDistance = distance;
                    closestCentroidX = centroids[j];
                    closestCentroidY = centroids[j + 1];
                    closestCentroidZ = centroids[j + 2];
                    closestCentroidIndex = j;
                }
            }
        }
        // add point to centroid labels:
        labels[closestCentroidIndex].points.push(x1, y1, z1);
    }
    return labels;
}

function getPointsMean(pointList: number[]) {
    const totalPoints = pointList.length / 3;
    const means = [0, 0, 0];
    for (let i = 0; i < pointList.length; i += 3) {
        const [x, y, z] = [pointList[i], pointList[i + 1], pointList[i + 2]];
        means[0] = means[0] + x / totalPoints;
        means[1] = means[1] + y / totalPoints;
        means[2] = means[2] + z / totalPoints;
    }
    return means;
}

function recalculateCentroids(
    dataSet: number[],
    labels: { [key: number]: PointKMeanMetadata }
) {
    // Each centroid is the geometric mean of the points that
    // have that centroid's label. Important: If a centroid is empty (no points have
    // that centroid's label) you should randomly re-initialize it.
    let newCentroid: number[] | undefined;
    const newCentroidList: number[] = [];
    for (const k in labels) {
        const centroidGroup = labels[k];
        if (centroidGroup.points.length > 0) {
            // find mean:
            newCentroid = getPointsMean(centroidGroup.points);
        } else {
            // get new random centroid
            newCentroid = getRandomCentroids(dataSet, 1).slice(3);
        }
        newCentroidList.push(newCentroid[0], newCentroid[1], newCentroid[2]);
    }
    return newCentroidList;
}

function kMeansHelper(dataset: number[], k: number) {
    if (dataset.length && dataset.length > k) {
        // Initialize book keeping variables
        let iterations = 0;
        let labels = {};
        let oldCentroids;

        // Initialize centroids randomly
        let centroids: number[] = getRandomCentroids(dataset, k);
        // Run the main k-means algorithm
        while (!shouldStop(oldCentroids, centroids, iterations)) {
            // Save old centroids for convergence test.
            oldCentroids = [...centroids];
            iterations++;
            // Assign labels to each datapoint based on centroids
            labels = getLabels(dataset, centroids);
            centroids = recalculateCentroids(dataset, labels);
        }

        return {
            labels: labels,
            centroids: centroids,
        };
    } else {
        throw new Error("Invalid dataset");
    }
}

const elbowCostFunction = (labels: PointKMeanMetadata[]) => {
    let cost = 0;
    for (const label of labels) {
        const [centroidX, centroidY, centroidZ] = label.centroid;
        const points = label.points;
        for (let i = 0; i < points.length; i += 3) {
            const [diffX, diffY, diffZ] = [
                centroidX - points[i],
                centroidY - points[i + 1],
                centroidZ - points[i + 2],
            ];

            cost += diffX * diffX + diffY * diffY + diffZ * diffZ;
        }
    }

    return cost;
};

const elbowMethod = (dataSet: number[]) => {
    const d = [0];
    const mapping: { [key: number]: { labels: {}; centroids: number[] } } = {};
    const n = dataSet.length / 3;
    let maxJ = Number.MIN_VALUE;
    let maxJIndex = 1;

    for (let i = 1; i <= n / 2; i++) {
        const clusteringResult = kMeansHelper(dataSet, i);
        mapping[i] = clusteringResult;
        d.push(elbowCostFunction(Object.values(clusteringResult.labels)));
    }

    for (let i = 0; i < n / 2 - 1; i++) {
        if (d[i] - d[i + 1] > maxJ) {
            maxJ = d[i] - d[i + 1];
            maxJIndex = i + 1;
        }
    }

    return mapping[maxJIndex];
};

const kMeansClustering = (dataSet: number[]) => {
    if (dataSet.length <= 3) {
        return { labels: {}, centroids: [] };
    }

    // return elbowMethod(dataSet);
    return kMeansHelper(dataSet, 2);
};

export default kMeansClustering;
