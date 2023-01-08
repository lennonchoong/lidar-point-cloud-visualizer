package loader

import (
	// "bytes"
	// "encoding/binary"
	"fmt"
	"io"
	"sort"

	"math"

	// "io"
	"lidar/structs"
	utils "lidar/loader_utils"
	"time"
)

const socketChunkSize int = 490;

func GetLASHeaders(buf []byte) *structs.LASHeaders {
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
		MinimumBounds: []float64{bounds[0], bounds[2], bounds[4]},
		MaximumBounds: []float64{bounds[1], bounds[3], bounds[5]},
	}

	return &header;
}

func sendHeaders(socket *structs.ConcurrentSocket, h structs.LASHeaders) {
	socket.Lock.Lock()
	defer socket.Lock.Unlock()
	socket.Conn.WriteJSON(h)
}

func pointFormatReader(arr *[]float64, buffer []byte, offset int64, formatId int32, scaleX, offsetX, scaleY, offsetY, scaleZ, offsetZ float64) {
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

	*arr = append(*arr,		
		float64(x) * scaleX + offsetX,
		float64(z) * scaleZ + offsetZ,
		float64(y) * scaleY + offsetY,
		utils.DetermineColor(r, classification, 0),
		utils.DetermineColor(g, classification, 1),
		utils.DetermineColor(b, classification, 2),
		float64(intensity),
	)
}

func LoadData(socket *structs.ConcurrentSocket, buf []byte, m *structs.LASMetaData) {
	arr := []float64{}
	var i int64 = 0;
	bufferLen := int64(len(buf))
	for i < bufferLen {
		pointFormatReader(
			&arr,
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

	j := 0; 

	socket.Lock.Lock()
	defer socket.Lock.Unlock()
	for j + socketChunkSize < len(arr) {
		socket.Conn.WriteJSON(structs.PointChunk{
			Event: "points",
			Points: arr[j : j + socketChunkSize],
			TotalChunks: m.TotalChunks, 
		})
		j += socketChunkSize
	}

	if j < len(arr) {
		socket.Conn.WriteJSON(structs.PointChunk{
			Event: "points",
			Points: arr[j :],
			TotalChunks: m.TotalChunks, 
		})
	}
}

func ProcessFileParts(parts []*structs.FilePart, socket *structs.ConcurrentSocket) {
	defer utils.TimeTrack(time.Now(), "ProcessFileParts")

	sort.Slice(parts, func(i, j int) bool {
		return parts[i].ChunkNumber < parts[j].ChunkNumber
	})

	var totalSize int64 = 0

	firstChunk, err := parts[0].File.Open() 
	utils.PrintLoadError(err)

	buf, err := io.ReadAll(firstChunk)
	utils.PrintLoadError(err)
	
	headers := GetLASHeaders(buf)
	sendHeaders(socket, *headers);
	defer firstChunk.Close()
	
	formatId := int32(headers.FormatId)
	scaleX, scaleY, scaleZ := headers.Scale[0], headers.Scale[1], headers.Scale[2]
	minX, minY, minZ := headers.MinimumBounds[0], headers.MinimumBounds[1], headers.MinimumBounds[2]
	maxX, maxY := headers.MaximumBounds[0], headers.MaximumBounds[1]
	midX, midY := (maxX - minX) / 2, (maxY - minY) / 2
	offsetX, offsetY, offsetZ := -midX - minX, -midY - minY, -minZ

	pointsInWindow := utils.MinUInt32(100000, headers.PointCount)
	windowSize := int64(pointsInWindow * uint32(headers.StructSize)) // no. of points
	startBP := int64(headers.PointOffset) // SOMETHING WRONG HERE
	
	noChunkFromWindow := math.Ceil(float64(pointsInWindow) * 7.0 / float64(socketChunkSize)) * math.Floor(float64(headers.PointCount) / float64(pointsInWindow))
	noResidualChunk := math.Ceil(float64(headers.PointCount % pointsInWindow) * 7.0 / float64(socketChunkSize));
	totalSocketChunks := int(noChunkFromWindow + noResidualChunk) 
	
	fmt.Println("totalSocketChunks: ", totalSocketChunks);

	metadata := &structs.LASMetaData{
		ScaleX: scaleX,
		ScaleY: scaleY,
		ScaleZ: scaleZ,
		OffsetX: offsetX,
		OffsetY: offsetY,
		OffsetZ: offsetZ,
		FormatId: formatId,
		StructSize: int64(headers.StructSize),
		TotalChunks: totalSocketChunks,
	}

	var lastSeek int64 = 0

	for i := 0; i < len(parts); i++ { // SOMETHING WRONG HERE 
		startPart := parts[i]
		fileSize := startPart.File.Size
		file, _ := startPart.File.Open()
		file.Seek(startBP, 0)
		totalSize += fileSize;

		for startBP + windowSize < fileSize {
			chunk := make([]byte, windowSize)
			file.Read(chunk)
			go LoadData(socket, chunk, metadata)
			file.Seek(startBP + windowSize, 0)
			startBP += windowSize
		}
		
		if startBP == fileSize {
			startBP = 0
			defer file.Close()
			continue
		}

		if startBP < fileSize && i + 1 < len(parts) { // SOME PROBLEM HERE
			prevSize := fileSize - startBP
			nextSize := windowSize - prevSize

			nextFile, _ := parts[i + 1].File.Open()
			nextChunk := make([]byte, nextSize)
			nextFile.Read(nextChunk)

			file.Seek(startBP, 0)
			prevChunk := make([]byte, prevSize)
			file.Read(prevChunk)

			prevChunk = append(prevChunk, nextChunk...)
			go LoadData(socket, prevChunk, metadata)
			startBP = nextSize

			defer file.Close()
			defer nextFile.Close()
		} else {
			fmt.Println(startBP, lastSeek, fileSize);

			chunkSize := fileSize - startBP
			chunk := make([]byte, chunkSize)
			file.Read(chunk)
			go LoadData(socket, chunk, metadata)
			defer file.Close()
		}
	}
}