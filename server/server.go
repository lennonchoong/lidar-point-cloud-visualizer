package main

import (
	"strconv"
	"sync"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"fmt"
	"lidar/loader"
	"lidar/structs"
	"net/http"
)

type SessionIdEvent struct {
	Event string 
	SessionId string
}

func main() {
	socketMapping := make(map[string]*structs.ConcurrentSocket)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
        AllowOrigins:     []string{"*"},
        AllowMethods:     []string{"POST", "OPTIONS"},
        AllowHeaders:     []string{"*"},
        ExposeHeaders:    []string{"Content-Length"},
        AllowCredentials: true,
    }))

	userFiles := make(map[string][]*structs.FilePart)

	r.GET("/ws", func(c *gin.Context) {
		ws, err := websocket.Upgrade(c.Writer, c.Request, nil, 1024 * 32, 1024 * 32);
		if err != nil {
			fmt.Println(err)
		}

		sessionId := uuid.NewString()
		socketMapping[sessionId] = &structs.ConcurrentSocket{
			Conn: ws,
			Lock: sync.Mutex{},
		};

		err = ws.WriteJSON(SessionIdEvent{
			Event: "sessionId",
			SessionId: sessionId,
		})

		if err != nil {
			fmt.Println(err)
		}
	})

	r.POST("/upload", func(c *gin.Context) {
		uploadFile, _ := c.FormFile("file")
		uploaderId := c.Request.Header.Get("Uploader-File-Id")
		chunkNumber, _ := strconv.Atoi(c.Request.Header.Get("Uploader-Chunk-Number"))
		totalChunks, _ := strconv.Atoi(c.Request.Header.Get("Uploader-Chunks-Total"))
		sessionId := c.Request.Header.Get("Sessionid")
		filePart := structs.FilePart{
			File: uploadFile,
			UploaderId: uploaderId,
			ChunkNumber: chunkNumber,
			TotalChunks: totalChunks,
		}

		_, exists := userFiles[uploaderId]

		if !exists {
			fmt.Println(c.Request.Header)
			userFiles[uploaderId] = []*structs.FilePart{}
		}

		userFiles[uploaderId] = append(userFiles[uploaderId], &filePart)

		if (len(userFiles[uploaderId]) == totalChunks) {
			go loader.ProcessFileParts(
				uploaderId,
				&userFiles, 
				socketMapping[sessionId], 
				&structs.ProcessingOptions{
					Clustering: c.Request.Header.Get("Clustering"),
					Subsample: c.Request.Header.Get("Subsample"),
					Lod: c.Request.Header.Get("Lod"),
					Density: c.Request.Header.Get("Density"),
				},
			)
		}
		c.String(http.StatusOK, "Data received");
	})

	r.StaticFile("/test", "./test.txt")

	r.StaticFile("/test2", "./test2.txt")

	r.Run() // listen and serve on 0.0.0.0:8080
}
