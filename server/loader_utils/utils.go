package loader_utils

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"lidar/structs"
	"log"
	"mime/multipart"
	"time"

	"github.com/puzpuzpuz/xsync"
)

const (
	Uint32Array = 4
	Uint8Array = 1
	Uint16Array = 2
	Float64Array = 8
)

func ReadUint32Single(buf []byte, offset int64) uint32 {
	return binary.LittleEndian.Uint32(buf[offset : offset + Uint32Array])
}

func ReadInt32Single(buf []byte, offset int64) int32 {
	var value int32
	value |= int32(buf[0 + offset])
	value |= int32(buf[1 + offset]) << 8
	value |= int32(buf[2 + offset]) << 16
	value |= int32(buf[3 + offset]) << 24
	return value;
}

func ReadInt16Single(buf []byte, offset int64) int16 {
	var value int16
	value |= int16(buf[0 + offset])
	value |= int16(buf[1 + offset]) << 8
	return value;
}

func ReadInt8Single(buf []byte, offset int64) int8 {
	var value int8
	value |= int8(buf[0 + offset])
	return value;
}

func ReadUint32Multiple(buf []byte, offset int64, repeat int) []uint32 {
	res := []uint32{}
	for i := 0; i < repeat; i++ {
		temp := binary.LittleEndian.Uint32(buf[offset + int64(i * Uint32Array): offset + int64((i + 1) * Uint32Array)])
		res = append(res, temp);
	}

	return res;
}

func ReadUint16Single(buf []byte, offset int64) uint16 {
	return binary.LittleEndian.Uint16(buf[offset : offset + Uint16Array])
}

func ReadUint16Multiple(buf []byte, offset int64, repeat int) []uint16 {
	res := []uint16{}
	for i := 0; i < repeat; i++ {
		temp := binary.LittleEndian.Uint16(buf[offset + int64(i * Uint16Array): offset + int64((i + 1) * Uint16Array)])
		res = append(res, temp);
	}

	return res;
}

func ReadUint8Single(buf []byte, offset int64) uint8 {
	var res uint8;
	bufReader := bytes.NewReader(buf[offset : offset + Uint8Array])
	err := binary.Read(bufReader, binary.LittleEndian, &res)
	if err != nil {
		fmt.Println("binary.Read failed:", err)
	}
	return res
}

func ReadUint8Multiple(buf []byte, offset int64, repeat int) []uint8 {
	res := []uint8{}
	for i := 0; i < repeat; i++ {
		bufSlice := buf[offset + int64(i * Uint8Array): offset + int64((i + 1) * Uint8Array)]
		res = append(res, ReadUint8Single(bufSlice, 0));
	}

	return res;
}

func ReadFloat64Single(buf []byte, offset int64) float64 {
	var res float64;
	bufReader := bytes.NewReader(buf[offset : offset + Float64Array])
	err := binary.Read(bufReader, binary.LittleEndian, &res)
	if err != nil {
		fmt.Println("binary.Read failed:", err)
	}
	return res;
}

func ReadFloat64Multiple(buf []byte, offset int64, repeat int) []float64 {
	res := []float64{}
	for i := 0; i < repeat; i++ {
		bufSlice := buf[offset + int64(i * Float64Array): offset + int64((i + 1) * Float64Array)]
		res = append(res, ReadFloat64Single(bufSlice, 0));
	}

	return res;
}

func TimeTrack(start time.Time, name string) {
    elapsed := time.Since(start)
    log.Printf("%s took %s", name, elapsed)
}

func TimeTrackMap(start time.Time, name string, mapping *xsync.Map) {
    elapsed := time.Since(start)

	val, ok := (*mapping).Load(name)
	if ok {
		(*mapping).Store(name, elapsed.Milliseconds() + val.(int64))
	} else {
		(*mapping).Store(name, int64(0))
	}
}

func MinInt64(a int64, b int64) int64 {
	if a > b {
		return b
	}
	return a
}

func MinUInt32(a, b uint32) uint32 {
	if a > b {
		return b
	}
	return a
}

func PrintFilePartStruct(part *structs.FilePart) {
	fmt.Println(
		part.ChunkNumber,
		part.TotalChunks,
		part.UploaderId,
		part.File.Filename,
		part.File.Header,
		part.File.Size,
	)
}

func PrintLoadError(e error) {
	if e != nil {
		fmt.Println(e)
	}
}

func ReadNextBytes(file *multipart.File, number int) []byte {
	bytes := make([]byte, number)

	_, err := (*file).Read(bytes)
	if err != nil {
		log.Fatal(err)
	}

	return bytes
}

func CheckFileErrors(e error) {
	if e != nil {
		log.Fatal(e)
	}
}

func DetermineColor(color uint16, classification uint8, idx int) float64 {
	if color != 0 {
		return float64(color) / 255;
	}

	if classification > 0 && classification >= 2 {
		return ColorClassifications[classification][idx] / 255;
	}

	return 1.0;
}

func SendProgress(message string, socket *structs.ConcurrentSocket) {
	go func() {
		socket.Lock.Lock()
		defer socket.Lock.Unlock()
		socket.Conn.WriteJSON(structs.ProgressEvent{
			Event: "progress",
			Message: message,
		})
	}()
}

var ColorClassifications [][3]float64 = [][3]float64{
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