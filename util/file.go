package util

import (
	"archive/zip"
	"io"
	"os"
	"path/filepath"
	"strings"
)

func Zip(zipFileName string, srcDir string) error {
	// 预防：旧文件无法覆盖
	os.RemoveAll(zipFileName)

	// 创建：zip文件
	zipfile, err := os.Create(zipFileName)
	if err != nil {
		return err
	}
	defer zipfile.Close()

	// 打开：zip文件
	archive := zip.NewWriter(zipfile)
	defer archive.Close()

	// 遍历路径信息
	err = filepath.Walk(srcDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// 排除：源路径本身，不处理
		if path == srcDir {
			return nil
		}

		// 获取：文件头信息
		header, err := zip.FileInfoHeader(info)
		if err != nil {
			return err
		}

		// 设置：zip中的文件路径
		relPath, err := filepath.Rel(srcDir, path)
		if err != nil {
			return err
		}
		header.Name = strings.ReplaceAll(relPath, "\\", "/")

		// 排除：文件夹，只处理文件
		if !info.Mode().IsRegular() {
			return nil
		}

		// 设置：zip的文件压缩算法
		header.Method = zip.Deflate

		// 创建：压缩包头部信息
		writer, err := archive.CreateHeader(header)
		if err != nil {
			return err
		}

		// 拷贝文件内容到zip中
		file, err := os.Open(path)
		if err != nil {
			return err
		}
		defer file.Close()

		_, err = io.Copy(writer, file)
		if err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return err
	}

	return nil
}
