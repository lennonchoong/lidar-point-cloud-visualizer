package loader

import (
	// "bytes"
	// "encoding/binary"
	"fmt"
	"io"
	"sort"
	"sync"

	"math"

	// "io"
	"lidar/constants"
	"lidar/kmeans"
	utils "lidar/loader_utils"
	"lidar/octree"
	"lidar/structs"
	"time"
)


func GetLASHeaders(part *structs.FilePart) *structs.LASHeaders {
	chunk, err := part.File.Open() 
	utils.PrintLoadError(err)

	buf, err := io.ReadAll(chunk)
	utils.PrintLoadError(err)

	defer chunk.Close()

	pointOffset := utils.ReadUint32Single(buf, 32 * 3);
	formatId := utils.ReadUint8Single(buf, 32 * 3 + 8);
	structSize := utils.ReadUint16Single(buf, 32 * 3 + 9);
	pointCount := utils.ReadUint32Single(buf, 32 * 3 + 11);
	scale := utils.ReadFloat64Multiple(buf, 32 * 3 + 35, 3);
	offset := utils.ReadFloat64Multiple(buf, 32 * 3 + 59, 3);
	bounds := utils.ReadFloat64Multiple(buf, 32 * 3 + 83, 6);

	fmt.Println(
		pointOffset,
		formatId, 
		structSize, 
		pointCount, 
		scale, 
		offset,
		[]float64{bounds[0], bounds[2], bounds[4]},
		[]float64{bounds[1], bounds[3], bounds[5]},
	)

	header := structs.LASHeaders{
		Event: "headers",
		PointOffset: pointOffset,
		FormatId: formatId, 
		StructSize: structSize, 
		PointCount: pointCount, 
		Scale: scale, 
		Offset: offset,
		MaximumBounds: []float64{bounds[0], bounds[2], bounds[4]},
		MinimumBounds: []float64{bounds[1], bounds[3], bounds[5]},
	}

	return &header;
}

func SendHeaders(socket *structs.ConcurrentSocket, h structs.LASHeaders) {
	socket.Lock.Lock()
	defer socket.Lock.Unlock()
	socket.Conn.WriteJSON(h)
}

func sendDone(socket *structs.ConcurrentSocket) {
	socket.Lock.Lock()
	defer socket.Lock.Unlock()
	socket.Conn.WriteJSON(structs.DoneEvent{
		Event: "done",
	})
}

func LoadData(socket *structs.ConcurrentSocket, buf []byte, m *structs.LASMetaData, o *octree.Octree, wg *sync.WaitGroup) {
	// o.Mutex.Lock()
	// defer o.Mutex.Unlock()
	defer wg.Done()
	var i int64 = 0;
	bufferLen := int64(len(buf))
	for i < bufferLen {
		pointFormatReader(
			o,
			buf,
			i, 
			m.FormatId, 
			m.ScaleX, 
			m.OffsetX, 
			m.ScaleY, 
			m.OffsetY, 
			m.ScaleZ, 
			m.OffsetZ,
		);
		i += m.StructSize;
	}
}

func pointFormatReader(o *octree.Octree, buffer []byte, offset int64, formatId int32, scaleX, offsetX, scaleY, offsetY, scaleZ, offsetZ float64) {
	var r, g, b uint16;
	x := utils.ReadInt32Single(buffer, offset + 0);
	y := utils.ReadInt32Single(buffer, offset + 4);
	z := utils.ReadInt32Single(buffer, offset + 8);
	intensity := utils.ReadUint16Single(buffer, offset + 12)
	classification := utils.ReadUint8Single(buffer, offset + 15)

	if formatId == 2 {
		r = utils.ReadUint16Single(buffer, offset + 20)
		g = utils.ReadUint16Single(buffer, offset + 22)
		b = utils.ReadUint16Single(buffer, offset + 24)
	} else if (formatId == 3) {
		r = utils.ReadUint16Single(buffer, offset + 28)
		g = utils.ReadUint16Single(buffer, offset + 30)
		b = utils.ReadUint16Single(buffer, offset + 32)
	}

	octree.AddPoint(
		float64(x) * scaleX,
		float64(z) * scaleZ,
		float64(y) * scaleY,
		utils.DetermineColor(r, classification, 0),
		utils.DetermineColor(g, classification, 1),
		utils.DetermineColor(b, classification, 2),
		float64(intensity),
		0,
		o.Granularity, 
		o.Root,
		o,
	)
}

func getFileMetaData(headers *structs.LASHeaders) *structs.LASMetaData {
	formatId := int32(headers.FormatId)
	scaleX, scaleY, scaleZ := headers.Scale[0], headers.Scale[1], headers.Scale[2]
	minX, minY, minZ := headers.MinimumBounds[0], headers.MinimumBounds[1], headers.MinimumBounds[2]
	maxX, maxY, maxZ := headers.MaximumBounds[0], headers.MaximumBounds[1], headers.MaximumBounds[2]
	midX, midY := (maxX - minX) / 2, (maxY - minY) / 2
	offsetX, offsetY, offsetZ := -midX - minX, -midY - minY, -minZ

	pointsInWindow := utils.MinUInt32(100000, headers.PointCount)

	noChunkFromWindow := math.Ceil(float64(pointsInWindow) * 7.0 / float64(constants.SocketChunkSize)) * math.Floor(float64(headers.PointCount) / float64(pointsInWindow))
	noResidualChunk := math.Ceil(float64(headers.PointCount % pointsInWindow) * 7.0 / float64(constants.SocketChunkSize));
	totalSocketChunks := int(noChunkFromWindow + noResidualChunk) 

	return &structs.LASMetaData{
		ScaleX: scaleX,
		ScaleY: scaleY,
		ScaleZ: scaleZ,
		OffsetX: offsetX,
		OffsetY: offsetY,
		OffsetZ: offsetZ,
		MidX: midX,
		MidY: midY,
		MinZ: minZ,
		MaxZ: maxZ,
		FormatId: formatId,
		StructSize: int64(headers.StructSize),
		TotalChunks: totalSocketChunks,
		PointsInWindow: pointsInWindow,
	}
}

func sendClusteredPoints(socket *structs.ConcurrentSocket, o *octree.Octree, wg *sync.WaitGroup) {
	defer utils.TimeTrack(time.Now(), "sendClusteredPoints")

	collector := []float64{}
	pointsAfter := 0
	for _, leaf := range o.Leaves { // NEED TO WRITE BETTER SLIDING WINDOW ALGO, FORGETTING TAIL END
		p := leaf.Points
		pointsAfter += len(p)
		collector = append(collector, p...)
	}


	i := 0

	for i + constants.SocketChunkSize < len(collector) {
		wg.Add(1)
		go func(chunk []float64) {
			socket.Lock.Lock()
			defer socket.Lock.Unlock()
			defer wg.Done()
			socket.Conn.WriteJSON(structs.PointChunk{
				Event: "points",
				Points: chunk,
				TotalChunks: 0, 
			})
		}(collector[i : i + constants.SocketChunkSize])

		i += constants.SocketChunkSize
	}

	if i < len(collector) {
		wg.Add(1)
		go func(chunk []float64) {
			socket.Lock.Lock()
			defer socket.Lock.Unlock()
			defer wg.Done()
			socket.Conn.WriteJSON(structs.PointChunk{
				Event: "points",
				Points: chunk,
				TotalChunks: 0, 
			})
		}(collector[i:])
	}

	fmt.Println("POINTS AFTER ", pointsAfter / 7)
}

func ProcessFileParts(
	uploaderId string, 
	filePartMapping *map[string][]*structs.FilePart,
	socket *structs.ConcurrentSocket, 
) {
	defer utils.TimeTrack(time.Now(), "ProcessFileParts")

	parts := (*filePartMapping)[uploaderId]

	sort.Slice(parts, func(i, j int) bool {
		return parts[i].ChunkNumber < parts[j].ChunkNumber
	})

	headers := GetLASHeaders(parts[0])

	SendHeaders(socket, *headers)

	metadata := getFileMetaData(headers);

	startBP := int64(headers.PointOffset)
	windowSize := int64(metadata.PointsInWindow * uint32(headers.StructSize)) // no. of points

	o := octree.GenerateOctree(
		&octree.OctreeDimensions{
			X1: headers.MinimumBounds[0],
			X2: headers.MaximumBounds[0],
			Y1: headers.MinimumBounds[2],
			Y2: headers.MaximumBounds[2],
			Z1: headers.MinimumBounds[1],
			Z2: headers.MaximumBounds[1],
			Granularity: 7,
		},
		nil,
	)

	fmt.Println("OCTREE DIMENSIONS", o.Root.X1, o.Root.X2, o.Root.Y1, o.Root.Y2, o.Root.Z1, o.Root.Z2)

	pointBeforeTree := 0

	var wg sync.WaitGroup;

	for i := 0; i < len(parts); i++ {
		startPart := parts[i]
		fileSize := startPart.File.Size
		file, _ := startPart.File.Open()
		file.Seek(startBP, 0)

		for startBP + windowSize < fileSize {
			chunk := make([]byte, windowSize)
			file.Read(chunk)
			pointBeforeTree += len(chunk)
			wg.Add(1);
			go LoadData(socket, chunk, metadata, o, &wg)
			file.Seek(startBP + windowSize, 0)
			startBP += windowSize
		}
		
		if startBP == fileSize {
			startBP = 0
			defer file.Close()
			continue
		}

		if startBP < fileSize && i + 1 < len(parts) {
			prevSize := fileSize - startBP
			nextSize := windowSize - prevSize

			nextFile, _ := parts[i + 1].File.Open()
			nextChunk := make([]byte, nextSize)
			nextFile.Read(nextChunk)

			file.Seek(startBP, 0)
			prevChunk := make([]byte, prevSize)
			file.Read(prevChunk)

			prevChunk = append(prevChunk, nextChunk...)
			wg.Add(1);
			pointBeforeTree += len(prevChunk)
			go LoadData(socket, prevChunk, metadata, o, &wg)
			startBP = nextSize

			defer file.Close()
			defer nextFile.Close()
		} else {
			chunkSize := fileSize - startBP
			chunk := make([]byte, chunkSize)
			file.Read(chunk)
			wg.Add(1);
			pointBeforeTree += len(chunk)
			go LoadData(socket, chunk, metadata, o, &wg)
			defer file.Close()
		}
	}

	wg.Wait()
	fmt.Println("WAIT GROUP DONE")


	fmt.Println("POINT BEFORE ADDED TO TREE ", pointBeforeTree / int(headers.StructSize))

	totalPoints := 0

	for _, leaf := range o.Leaves {
		totalPoints += len(leaf.Points)
	}

	fmt.Println("POINTS BEFORE CLUSTERING", totalPoints / 7);

	clusteringWg := sync.WaitGroup{}

	octree.ClusterPoints(socket, &o.Leaves, metadata, &clusteringWg);

	clusteringWg.Wait()

	fmt.Println("DONE CLUSTERING")

	kmeans.GlobalTimetracker.Range(func(key string, value interface{}) bool {
		fmt.Println(key, value);
		return true

	});


	sendingWg := sync.WaitGroup{}

	sendClusteredPoints(socket, o, &sendingWg)

	sendingWg.Wait()
	
	fmt.Println("DONE SENDING CLUSTERED CHUNKS")

	sendDone(socket);

	delete((*filePartMapping), uploaderId)
}