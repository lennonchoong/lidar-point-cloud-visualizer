package structs

import (
	"mime/multipart"
	"sync"

	"github.com/gorilla/websocket"
)

type ConcurrentSocket struct {
	Conn *websocket.Conn
	Lock sync.Mutex
}

type PointChunk struct {
	Event string
	Points []float64
	TotalChunks int
}

type LASMetaData struct {
	FormatId int32
	ScaleX float64
	OffsetX float64
	ScaleY float64
	OffsetY float64
	ScaleZ float64
	OffsetZ float64
	StructSize int64
	TotalChunks int
}

type FilePart struct {
	File *multipart.FileHeader
	UploaderId string
	ChunkNumber int
	TotalChunks int
}
type LASHeaders struct {
	Event string
	PointOffset uint32
	FormatId uint8
	StructSize uint16
	PointCount uint32
	Scale []float64
	Offset []float64
	MaximumBounds []float64
	MinimumBounds []float64
}