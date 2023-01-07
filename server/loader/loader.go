package loader

import (
	// "bytes"
	// "encoding/binary"
	"fmt"
	"io"
	"sort"

	"github.com/gorilla/websocket"

	// "math"

	// "io"
	"lidar/loader_utils"
	"log"
	"mime/multipart"
	"time"
)

type FilePart struct {
	File *multipart.FileHeader
	UploaderId string
	ChunkNumber int
	TotalChunks int
}
type LASHeaders struct {
	pointOffset uint32
	formatId uint8
	structSize uint16
	pointCount uint32
	scale []float64
	offset []float64
	maximumBounds []float64
	minimumBounds []float64
}

func readNextBytes(file *multipart.File, number int) []byte {
	bytes := make([]byte, number)

	_, err := (*file).Read(bytes)
	if err != nil {
		log.Fatal(err)
	}

	return bytes
}

func checkFileErrors(e error) {
	if e != nil {
		log.Fatal(e)
	}
}

func GetLASHeaders(buf []byte) *LASHeaders {
	pointOffset := loader_utils.ReadUint32Single(buf, 32 * 3);
	formatId := loader_utils.ReadUint8Single(buf, 32 * 3 + 8);
	structSize := loader_utils.ReadUint16Single(buf, 32 * 3 + 9);
	pointCount := loader_utils.ReadUint32Single(buf, 32 * 3 + 11);
	scale := loader_utils.ReadFloat64Multiple(buf, 32 * 3 + 35, 3);
	offset := loader_utils.ReadFloat64Multiple(buf, 32 * 3 + 59, 3);
	bounds := loader_utils.ReadFloat64Multiple(buf, 32 * 3 + 83, 6);

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

	return &LASHeaders{
		pointOffset,
		formatId, 
		structSize, 
		pointCount, 
		scale, 
		offset,
		[]float64{bounds[0], bounds[2], bounds[4]},
		[]float64{bounds[1], bounds[3], bounds[5]},
	}
}

func pointFormatReader(arr *[]float64, buffer []byte, offset int64, formatId int32, scaleX, offsetX, scaleY, offsetY, scaleZ, offsetZ float64) {
	var r, g, b int16;
	x := loader_utils.ReadInt32Single(buffer, offset + 0);
	y := loader_utils.ReadInt32Single(buffer, offset + 4);
	z := loader_utils.ReadInt32Single(buffer, offset + 8);
	intensity := loader_utils.ReadInt16Single(buffer, offset + 12)
	classification := loader_utils.ReadInt8Single(buffer, offset + 15)

	if formatId == 2 {
		r = loader_utils.ReadInt16Single(buffer, offset + 20)
		g = loader_utils.ReadInt16Single(buffer, offset + 22)
		b = loader_utils.ReadInt16Single(buffer, offset + 24)
	} else if (formatId == 3) {
		r = loader_utils.ReadInt16Single(buffer, offset + 28)
		g = loader_utils.ReadInt16Single(buffer, offset + 30)
		b = loader_utils.ReadInt16Single(buffer, offset + 32)
	}

	*arr = append(*arr,		
		float64(x) * scaleX + offsetX,
		float64(y) * scaleY + offsetY,
		float64(z) * scaleZ + offsetZ,
		determineColor(r, classification, 0),
		determineColor(g, classification, 1),
		determineColor(b, classification, 2),
		float64(intensity),
	)
}

var colorClassifications [][3]float64 = [][3]float64{
	{0, 0, 0},
	{0, 0, 0},
	{161, 82, 46},
	{0, 255, 1},
	{0, 204, 0},
	{0, 153, 0},
	{255, 168, 0},
	{255, 0, 255},
	{0, 0, 255},
	{255, 255, 0},
	{255, 255, 255},
	{255, 255, 0},
	{255, 255, 0},
	{255, 255, 0},
	{255, 255, 0},
	{255, 255, 0},
	{255, 255, 0},
}

func determineColor(color int16, classification int8, idx int) float64 {
	if color != 0 {
		return float64(color) / 255;
	}

	if classification > 0 && classification >= 2 {
		return colorClassifications[classification][idx] / 255;
	}

	return 1.0;
}

type PointEvent struct {
	Event string
	Points []float64
}

type LASMetaData struct {
	formatId int32
	scaleX float64
	offsetX float64
	scaleY float64
	offsetY float64
	scaleZ float64
	offsetZ float64
	structSize int64
}

// func LoadData(socket *websocket.Conn, buf []byte, startOffset int64, m *LASMetaData) {
// 	arr := []float64{}
// 	var i int64 = startOffset;
// 	bufferLen := int64(len(buf))
// 	for i < bufferLen {
// 		pointFormatReader(
// 			&arr,
// 			buf,
// 			i, 
// 			m.formatId, 
// 			m.scaleX, 
// 			m.offsetX, 
// 			m.scaleY, 
// 			m.offsetY, 
// 			m.scaleZ, 
// 			m.offsetZ,
// 		);
// 		i += m.structSize;
// 	}

// 	// fmt.Println(arr[:200])
// 	// socket.WriteJSON(PointEvent{
// 	// 	Event: "points",
// 	// 	Points: arr[:100],
// 	// })
// }

func LoadData(socket *websocket.Conn, buf []byte, m *LASMetaData, src int) {
	arr := []float64{}
	var i int64 = 0;
	bufferLen := int64(len(buf))
	for i < bufferLen {
		pointFormatReader(
			&arr,
			buf,
			i, 
			m.formatId, 
			m.scaleX, 
			m.offsetX, 
			m.scaleY, 
			m.offsetY, 
			m.scaleZ, 
			m.offsetZ,
		);
		i += m.structSize;
	}
	fmt.Println("SOURCE", src, " # POINTS :", len(arr) / 7)
	// socket.WriteJSON(PointEvent{
	// 	Event: "points",
	// 	Points: arr[:100],
	// })
}

func minInt64(a int64, b int64) int64 {
	if a > b {
		return b
	}
	return a
}

func minUInt32(a, b uint32) uint32 {
	if a > b {
		return b
	}
	return a
}

func printFilePartStruct(part *FilePart) {
	fmt.Println(
		part.ChunkNumber,
		part.TotalChunks,
		part.UploaderId,
		part.File.Filename,
		part.File.Header,
		part.File.Size,
	)
}

func printLoadError(e error) {
	if e != nil {
		fmt.Println(e)
	}
}

func ProcessFileParts(parts []*FilePart, socket *websocket.Conn) {
	defer loader_utils.TimeTrack(time.Now(), "ProcessFileParts")

	sort.Slice(parts, func(i, j int) bool {
		return parts[i].ChunkNumber < parts[j].ChunkNumber
	})


	// // ################ TEST #######################
	// totalBuf := []byte{}

	// for _, part := range parts {
	// 	file, _ := part.File.Open()
	// 	buf, _ := io.ReadAll(file)
	// 	totalBuf = append(totalBuf, buf...)
	// 	file.Close()
	// }

	// fmt.Println(len(totalBuf));
	// headers := GetLASHeaders(totalBuf)

	// formatId := int32(headers.formatId)
	// scaleX, scaleY, scaleZ := headers.scale[0], headers.scale[1], headers.scale[2]
	// minX, minY, minZ := headers.minimumBounds[0], headers.minimumBounds[1], headers.minimumBounds[2]
	// maxX, maxY := headers.maximumBounds[0], headers.maximumBounds[1]
	// midX, midY := (maxX - minX) / 2, (maxY - minY) / 2
	// offsetX, offsetY, offsetZ := -midX - minX, -midY - minY, -minZ

	// LoadData(socket, totalBuf, int64(headers.pointOffset), &LASMetaData{
	// 	scaleX: scaleX,
	// 	scaleY: scaleY,
	// 	scaleZ: scaleZ,
	// 	offsetX: offsetX,
	// 	offsetY: offsetY,
	// 	offsetZ: offsetZ,
	// 	formatId: formatId,
	// 	structSize: int64(headers.structSize),
	// })

	// // ################ TEST END #######################


	var totalSize int64 = 0

	firstChunk, err := parts[0].File.Open() 
	printLoadError(err)

	buf, err := io.ReadAll(firstChunk)
	printLoadError(err)
	
	headers := GetLASHeaders(buf)
	defer firstChunk.Close()
	
	formatId := int32(headers.formatId)
	scaleX, scaleY, scaleZ := headers.scale[0], headers.scale[1], headers.scale[2]
	minX, minY, minZ := headers.minimumBounds[0], headers.minimumBounds[1], headers.minimumBounds[2]
	maxX, maxY := headers.maximumBounds[0], headers.maximumBounds[1]
	midX, midY := (maxX - minX) / 2, (maxY - minY) / 2
	offsetX, offsetY, offsetZ := -midX - minX, -midY - minY, -minZ

	
	pointsInWindow := minUInt32(100000, headers.pointCount)
	windowSize := int64(pointsInWindow * uint32(headers.structSize)) // no. of points
	startBP := int64(headers.pointOffset) // SOMETHING WRONG HERE
	
	metadata := &LASMetaData{
		scaleX: scaleX,
		scaleY: scaleY,
		scaleZ: scaleZ,
		offsetX: offsetX,
		offsetY: offsetY,
		offsetZ: offsetZ,
		formatId: formatId,
		structSize: int64(headers.structSize),
	}

	var lastSeek int64 = 0

	for i := 0; i < len(parts); i++ { // SOMETHING WRONG HERE 
		startPart := parts[i]
		fileSize := startPart.File.Size
		file, _ := startPart.File.Open()
		fmt.Println(startBP, fileSize);
		off, _ := file.Seek(startBP, 0)
		fmt.Println("LAST SEEK: ", off)
		totalSize += fileSize;

		for startBP + windowSize < fileSize {
			chunk := make([]byte, windowSize)
			file.Read(chunk)
			go LoadData(socket, chunk, metadata, 1)
			off, _ := file.Seek(startBP + windowSize, 0)
			fmt.Println("LAST SEEK: ", off)
			lastSeek = off;
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

			file.Seek(prevSize, 2)
			prevChunk := make([]byte, prevSize)
			file.Read(prevChunk)

			prevChunk = append(prevChunk, nextChunk...)
			go LoadData(socket, prevChunk, metadata, 2)
			startBP = nextSize

			defer file.Close()
			defer nextFile.Close()
		} else {
			fmt.Println(startBP, lastSeek, fileSize);

			chunkSize := fileSize - startBP
			chunk := make([]byte, chunkSize)
			file.Read(chunk)
			go LoadData(socket, chunk, metadata, 3)
			defer file.Close()
		}
	}
}

// func batchProcess(batch )

// ProcessFileParts took 591.173647ms for points(2)