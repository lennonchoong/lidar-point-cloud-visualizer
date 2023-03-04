package filewriter

import (
	"encoding/binary"
	"fmt"
	"lidar/octree"
	"lidar/structs"
	c "lidar/constants"
	"log"
	"os"

	"github.com/google/uuid"
)

func CreateOptimisedFile(socket *structs.ConcurrentSocket, parts []*structs.FilePart, nodes []*octree.OctreeNode, header *structs.LASHeaders) {
	points := []float64{}

	for _, node := range nodes {
		points = append(points, node.Points...)
	}

	byteParts := make([]byte, header.PointOffset)
	var total int64 = 0 

	for _, part := range parts {
		file, _ := part.File.Open()
		file.Read(byteParts)
		total += part.File.Size

		if total >= int64(header.PointOffset) {
			break
		}
	}

	uuid := uuid.NewString()
	path := "/files/" + uuid + ".las"
	f, err := os.Create("." + path)

	if err != nil {
		log.Fatal(err)
	}

	defer f.Close()

	headerBuff := byteParts

	pointCountOffset := 32 * 3 + 11

	structSize := int(header.StructSize)
	pointBuff := []byte{}

	scaleX, scaleY, scaleZ := header.Scale[0], header.Scale[1], header.Scale[2]

	fmt.Println("POINTS LENGTH = ", len(points) / c.PointOffset)

	for i := 0; i < len(points); i += c.PointOffset {
		if points[i] < header.MinimumBounds[0] ||
		points[i + 1] < header.MinimumBounds[2] ||
		points[i + 2] < header.MinimumBounds[1] {
			continue
		}

		x, y, z, intensity := 
		int32ToBytes(int32(points[i] / scaleX)), 
		int32ToBytes(int32(points[i + 1] / scaleY)), 
		int32ToBytes(int32(points[i + 2] / scaleZ)), 
		uint16ToBytes(uint16(points[i + 6]))

		pointChunk := make([]byte, structSize)

		pointChunk[0] = x[0]
		pointChunk[1] = x[1]
		pointChunk[2] = x[2]
		pointChunk[3] = x[3]

		pointChunk[4] = z[0]
		pointChunk[5] = z[1]
		pointChunk[6] = z[2]
		pointChunk[7] = z[3]

		pointChunk[8] = y[0]
		pointChunk[9] = y[1]
		pointChunk[10] = y[2]
		pointChunk[11] = y[3]

		pointChunk[12] = intensity[0]
		pointChunk[13] = intensity[1]

		pointChunk[15] = 2

		pointBuff = append(pointBuff, pointChunk...)
	}

	pointCountBytes := uint32ToBytes(uint32(len(pointBuff) / structSize))
	headerBuff[pointCountOffset] = pointCountBytes[0]
	headerBuff[pointCountOffset + 1] = pointCountBytes[1]
	headerBuff[pointCountOffset + 2] = pointCountBytes[2]
	headerBuff[pointCountOffset + 3] = pointCountBytes[3]

	headerBuff = append(headerBuff, pointBuff...)

	f.Write(headerBuff)

	socket.Lock.Lock()
	socket.Conn.WriteJSON(structs.FileReadyEvent{
		Event: "file-ready",
		FilePath: "http://localhost:8080" + path,
	})
	socket.Lock.Unlock()
} 

func maxInt32(a, b int32) int32 {
	if a < b {
		return b
	}
	return a 
}


func minInt32(a, b int32) int32 {
	if a < b {
		return a
	}
	return b 
}


func uint32ToBytes(i uint32) []byte {
	a := make([]byte, 4)
	binary.LittleEndian.PutUint32(a, i)
	return a
}

func int32ToBytes(i int32) []byte {
	a := make([]byte, 4)
	a[0] = byte(i >> 0)
	a[1] = byte(i >> 8)
	a[2] = byte(i >> 16)
	a[3] = byte(i >> 24)
	return a
}

func uint16ToBytes(i uint16) []byte {
	a := make([]byte, 2)
	binary.LittleEndian.PutUint16(a, i)
	return a
}
