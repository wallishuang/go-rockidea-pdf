import './FileDropZone.css';
import React, { useState } from 'react';
import axios from 'axios';
import { FormattedMessage } from "react-intl";

function MergeTab() {
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  function handleMultipleChange(event) {
    const currentFiles = [...files];
    for (let i = 0; i < event.target.files.length; i++) {
      currentFiles.push(event.target.files[i]);
    }
    setFiles(currentFiles);
  }

  function handleMultipleSubmit(event) {
    event.preventDefault();
    const url = 'http://localhost:8080/merge';
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('file', file);
    });

    const config = {
      headers: {
        'content-type': 'multipart/form-data',
      },
      responseType: 'blob',
    };

    axios.post(url, formData, config)
      .then((response) => {
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'output.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        setUploadedFiles([]);
      })
      .catch((error) => {
        console.error('Error uploading files:', error);
        let errorMessage = 'processing file error:';
        if (error.response) {
          errorMessage += ': ' + error.response.data.error;
        } else {
          errorMessage += ': ' + error.message;
        }
        alert(errorMessage);
      });
  }

  function handleDragStart(event, index) {
    event.dataTransfer.setData('index', index.toString());
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFiles = [...event.dataTransfer.files];
    const newFiles = [...files, ...droppedFiles];
    setFiles(newFiles);
  };

  function handleSortDrop(event, dropIndex) {
    event.preventDefault();
    const dragIndex = parseInt(event.dataTransfer.getData('index'));
    const updatedFiles = [...files];
    const draggedFile = updatedFiles[dragIndex];
    updatedFiles.splice(dragIndex, 1);
    updatedFiles.splice(dropIndex, 0, draggedFile);
    setFiles(updatedFiles);
  }

  function handleDeleteFile(index) {
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);
  }

  function handleClearFiles() {
    setFiles([]);
  }

  return (
    <div className="container">
      <form onSubmit={handleMultipleSubmit}>
        <h1><FormattedMessage
          id="merge.tab"
          defaultMessage="合併檔案"
        /></h1>
        <p><FormattedMessage
          id="merge.desc"
          defaultMessage="請選擇要合併的檔案，並依照合併的檔案順序排序"
        /></p>
        <div
          className="dropzone"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, files.length)}
        >
          <input type="file" multiple onChange={handleMultipleChange} />
          <p><FormattedMessage
            id="common.file.dropzone"
            defaultMessage="或將檔案拖拉到此處"
          /></p>
        </div>
        <ul className="file-list">
          {files.map((file, index) => (
            <li
              key={index}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleSortDrop(e, index)}
            >
              {file && file.name}
              <button type="button" className=".clear-button" onClick={() => handleDeleteFile(index)}><FormattedMessage
                id="common.delete.button"
                defaultMessage="删除"
              /></button>
            </li>
          ))}
        </ul>
        <button type="submit"><FormattedMessage
          id="merge.submit"
          defaultMessage="合併"
        /></button>
        <button className="clear-button" type="button" onClick={handleClearFiles}><FormattedMessage
          id="common.clear.button"
          defaultMessage="清除"
        /></button>
      </form>
      <div className="uploaded-files">
        {uploadedFiles.map((file, index) => (
          <img key={index} src={file} alt={`Uploaded content ${index}`} />
        ))}
      </div>
    </div>
  );
}

export default MergeTab;
