package loader_utils

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"log"
	"time"
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