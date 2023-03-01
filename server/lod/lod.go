package lod

import (
	"fmt"
	"lidar/kmeans"
	"lidar/octree"
	"lidar/structs"
	"sync"

	"github.com/emirpasic/gods/sets/hashset"
)

func GenerateAndSendLod(socket *structs.ConcurrentSocket, leaves []*octree.OctreeNode, m *structs.LASMetaData) {
	mediumLod := generateLod(leaves)
	lowLod := generateLod(mediumLod)

	sendLod(socket, mediumLod, 200, m, "medium")
	sendLod(socket, lowLod, 400, m, "low")
}

func sendLod(
	socket *structs.ConcurrentSocket, 
	pointChunks []*octree.OctreeNode, 
	renderDistance float64, 
	m *structs.LASMetaData,
	label string,
) {
	go func() {
		points := []float64{}

		for _, chunk := range pointChunks {
			nodePoints := make([]float64, len(chunk.Points))

			copy(nodePoints, chunk.Points)

			points = append(points, nodePoints...)
		}

		fmt.Println("LOD POINT LENGTH ", len(points) / 7)

		socket.Lock.Lock()
		socket.Conn.WriteJSON(structs.LODChunk{
			Event: "lod-points",
			Points: points,
			TotalChunks: 0,
			RenderDistance: renderDistance,
			Label: label,
		})
		socket.Lock.Unlock()
	}()
}

func generateLod(leaves []*octree.OctreeNode) []*octree.OctreeNode {
	parents := hashset.New()
	for _, leaf := range leaves {
		parents.Add(leaf.Parent)
	}

	res := make([]*octree.OctreeNode, parents.Size())

	wg := sync.WaitGroup{}
	
	wg.Add(parents.Size())

	for i, parent := range parents.Values() {
		castedParent := parent.(*octree.OctreeNode)

		for _, child := range castedParent.Children {
			castedParent.Points = append(castedParent.Points, child.Points...)
		}

		go func(i int) {
			defer wg.Done()
			castedParent.Points = kmeans.KMeansClustering(castedParent.Points)
			res[i] = castedParent
		}(i)
	}

	wg.Wait()

	return res
}