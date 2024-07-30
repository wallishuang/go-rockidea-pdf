package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"pdf-tool/util"
	"runtime"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pdfcpu/pdfcpu/pkg/api"
	"github.com/pdfcpu/pdfcpu/pkg/pdfcpu/model"
	"github.com/spf13/viper"
	"golang.org/x/sys/windows/registry"
)

type Message struct {
	JsonUrl     string `json:"jsonUrl"`
	ExtensionId string `json:"extensionId"`
}

func main() {
	log.Println("**************************************")
	log.Println("*          Version: v1.0.0           *")
	log.Println("*         Author: Wallis Huang       *")
	log.Println("*        Email: c70015@gmail.com     *")
	log.Println("**************************************")
	log.Println("Is Chrome:", Chrome)

	if Chrome == "true" {
		decoder := json.NewDecoder(os.Stdin)
		var msg Message
		err := decoder.Decode(&msg)
		if err != nil {
			log.Fatalf("Failed to decode message: %v", err)
		}

		err = RegisterKey(msg.ExtensionId, msg.JsonUrl)
		if err != nil {
			log.Fatalf("Failed to register registry key: %v", err)
		}

		log.Println("Native messaging host registered successfully")
	}

	RestApi()
}

/* *****************************************************
 *	                 註冊機碼
 * *****************************************************/
func RegisterKey(extensionID string, jsonUrl string) error {
	key, _, err := registry.CreateKey(registry.CURRENT_USER,
		`Software\Google\Chrome\NativeMessagingHosts\com.rockidea.pdf`, registry.SET_VALUE)
	if err != nil {
		return err
	}
	defer key.Close()

	err = key.SetStringValue("", jsonUrl)
	if err != nil {
		return err
	}

	return nil
}

/* *****************************************************
 *	                  打開index.html
 * *****************************************************/
func OpenHTML() {
	var cmd *exec.Cmd
	if runtime.GOOS == "windows" {
		cmd = exec.Command("cmd", "/c", "start", "", "build/index.html")
	}
	err := cmd.Run()
	if err != nil {
		log.Fatalf("Failed to open HTML file: %v", err)
	}
}

/* *****************************************************
 *	                  嵌入靜態檔案
 * *****************************************************/
var (
	//go:embed ui/build
	UI embed.FS

	Chrome string
)

/* *****************************************************
 *	                   WEB UI 使用
 * *****************************************************/
func RestApi() {
	router := gin.Default()

	// CORS middleware
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusOK)
			return
		}
		c.Next()
	})

	if Chrome != "true" {
		EmbedStaticFiles("http://localhost:8080", router)
	}

	router.POST("/shutdown", func(c *gin.Context) {
		log.Println("Received stop command")
		os.Exit(0)
	})

	router.POST("/merge", func(c *gin.Context) {
		handleFileOperation(c, "merge")
	})

	router.POST("/split", func(c *gin.Context) {
		handleFileOperation(c, "split")
	})

	router.Run(":8080")
}

func EmbedStaticFiles(url string, router *gin.Engine) {
	// read static files
	st, _ := fs.Sub(UI, "ui/build")
	router.StaticFS("/", http.FS(st))

	// 打開瀏覽器
	var err error
	switch runtime.GOOS {
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin": // macOS
		err = exec.Command("open", url).Start()
	default: // Linux or other Unix-like systems
		err = exec.Command("xdg-open", url).Start()
	}

	if err != nil {
		log.Println(err)
	}

}

func handleFileOperation(c *gin.Context, operationType string) {
	// Multipart form
	form, _ := c.MultipartForm()
	files := form.File["file"]
	var tmpfiles []string

	currentTime := time.Now().Format("20060102150405")
	// Ensure tmp directory exists or create it
	tmpDir := "tmp_" + currentTime
	if _, err := os.Stat(tmpDir); os.IsNotExist(err) {
		err := os.Mkdir(tmpDir, 0755)
		if err != nil {
			log.Println("Error creating tmp directory:", err)
			c.String(http.StatusInternalServerError, "Failed to create tmp directory")
			return
		}
	}

	// Save uploaded files to tmp directory
	for _, inFile := range files {
		tmpfilePath := filepath.Join(tmpDir, inFile.Filename)
		tmpfiles = append(tmpfiles, tmpfilePath)
		err := c.SaveUploadedFile(inFile, tmpfilePath)
		if err != nil {
			log.Println("SaveUploadedFile error:", err.Error())
			c.String(http.StatusInternalServerError, fmt.Sprintf("Failed to save file %s", inFile.Filename))
			return
		}
	}

	// Ensure output directory exists or create it
	outputDir := "output_" + currentTime
	if _, err := os.Stat(outputDir); os.IsNotExist(err) {
		err := os.Mkdir(outputDir, 0755)
		if err != nil {
			log.Println("Error creating output directory:", err)
			c.String(http.StatusInternalServerError, "Failed to create output directory")
			return
		}
	}

	// Determine output path based on operation type
	var outputPath string
	switch operationType {
	case "merge":
		outputPath = filepath.Join(outputDir, "output.pdf")
		err := api.MergeCreateFile(tmpfiles, outputPath, false, nil)
		if err != nil {
			log.Println("Merge PDF error:", err.Error())
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
	case "split":
		outputPath = filepath.Join(tmpDir, "split_output.zip")
		for i, tmpfile := range tmpfiles {
			pages := strings.Split(form.Value["pages"][i], ",")
			err := api.ExtractPagesFile(tmpfile, outputDir, pages, nil)
			if err != nil {
				log.Println("split pdf error.", err.Error())
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
		}

		err := util.Zip(outputPath, outputDir)
		if err != nil {
			log.Fatal("zip files error:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

	default:
		c.String(http.StatusBadRequest, "Unknown operation type")
		return
	}

	// Return the processed file as a response
	c.File(outputPath)

	// Cleanup: delete tmp directory and its contents
	defer func() {
		err := os.RemoveAll(tmpDir)
		if err != nil {
			log.Println("Error deleting tmp directory:", err)
		}
	}()

	// Cleanup: delete output directory and its contents
	defer func() {
		err := os.RemoveAll(outputDir)
		if err != nil {
			log.Println("Error deleting output directory:", err)
		}
	}()
}

/* *****************************************************
 *	                     單機使用
 * *****************************************************/
type Config struct {
	Operation string
	Merge     MergeInfo
	Split     SplitInfo
}

type MergeInfo struct {
	InputFolder  string
	OutputFolder string
	OutputFile   string
}

type SplitInfo struct {
	InputFile    string
	Pages        []string
	OutputFolder string
}

func getConf() *Config {
	viper.AddConfigPath(".")
	viper.SetConfigName("config")
	err := viper.ReadInConfig()

	if err != nil {
		fmt.Printf("read config toml error: %v", err)
	}

	conf := &Config{}
	err = viper.Unmarshal(conf)
	if err != nil {
		fmt.Printf("unable to decode into config struct, %v", err)
	}

	return conf
}

func GoWork() {
	config := getConf()
	if config.Operation == "merge" {
		MergeCreateFile(config)
	} else if config.Operation == "split" {
		SplitFile(config)
	} else if config.Operation == "both" {
		MergeCreateFile(config)
		SplitFile(config)
	} else {
		fmt.Println("no such operation. ", config.Operation)
	}
	time.Sleep(3000)
}

func SplitFile(config *Config) {
	var conf *model.Configuration
	pages := config.Split.Pages
	outFolder := config.Split.OutputFolder
	if _, err := os.Stat(outFolder); os.IsNotExist(err) {
		err := os.MkdirAll(outFolder, 0755)
		if err != nil {
			fmt.Println("create new folder error. ", err.Error())
		}
	}

	err := api.ExtractPagesFile(config.Split.InputFile, outFolder, pages, conf)
	if err != nil {
		fmt.Println("split pdf error.", err.Error())
	}

	fmt.Println("Split file ok.")
}

func MergeCreateFile(config *Config) {
	var conf *model.Configuration
	inFiles := []string{}
	files, _ := ioutil.ReadDir(config.Merge.InputFolder)

	for _, file := range files {
		inFiles = append(inFiles, config.Merge.InputFolder+"/"+file.Name())
	}

	outputFolder := config.Merge.OutputFolder
	if _, err := os.Stat(outputFolder); os.IsNotExist(err) {
		err := os.MkdirAll(outputFolder, 0755)
		if err != nil {
			fmt.Println(err.Error())
		}
	}

	err := api.MergeCreateFile(inFiles, outputFolder+"/"+config.Merge.OutputFile, false, conf)
	if err != nil {
		fmt.Println("merge pdf error.", err.Error())
	}

	fmt.Println("Merge file ok.")
}
