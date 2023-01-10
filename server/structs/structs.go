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

type ConcurrentCounter struct {
	Count int
	Lock sync.Mutex
	Wg sync.WaitGroup
}

type PointChunk struct {
	Event string
	Points []float64
	TotalChunks int
}

type DoneEvent struct {
	Event string
}

type LASMetaData struct {
	FormatId int32
	ScaleX float64
	OffsetX float64
	MidX float64
	ScaleY float64
	OffsetY float64
	MidY float64
	ScaleZ float64
	OffsetZ float64
	MaxZ float64
	MinZ float64
	StructSize int64
	TotalChunks int
	PointsInWindow uint32
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