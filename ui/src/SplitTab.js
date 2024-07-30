import './FileDropZone.css';
import React, { useState } from 'react';
import axios from 'axios';
import { FormattedMessage, useIntl } from 'react-intl';

function SplitTab() {
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [pageRanges, setPageRanges] = useState([]);
  const intl = useIntl(); // Using useIntl hook to access intl object

  function handleMultipleChange(event) {
    const currentFiles = [...files];
    for (let i = 0; i < event.target.files.length; i++) {
      currentFiles.push(event.target.files[i]);
    }
    setFiles(currentFiles);

    // Initialize pageRanges for new files
    const newPageRanges = Array(event.target.files.length).fill('');
    setPageRanges((prevPageRanges) => [...prevPageRanges, ...newPageRanges]);
  }

  function handleMultipleSubmit(event) {
    event.preventDefault();
    const url = 'http://localhost:8080/split';
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('file', file);
      formData.append('pages', pageRanges[index]);
    });

    const config = {
      headers: {
        'content-type': 'multipart/form-data',
      },
      responseType: 'blob',
    };

    axios.post(url, formData, config)
      .then((response) => {
        const blob = new Blob([response.data], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'split_output.zip';
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

    // Initialize pageRanges for dropped files
    const newPageRanges = Array(droppedFiles.length).fill('');
    setPageRanges((prevPageRanges) => [...prevPageRanges, ...newPageRanges]);
  };

  function handleSortDrop(event, dropIndex) {
    event.preventDefault();
    const dragIndex = parseInt(event.dataTransfer.getData('index'));
    const updatedFiles = [...files];
    const updatedPageRanges = [...pageRanges];

    const draggedFile = updatedFiles[dragIndex];
    updatedFiles.splice(dragIndex, 1);
    updatedFiles.splice(dropIndex, 0, draggedFile);

    const draggedPageRange = updatedPageRanges[dragIndex];
    updatedPageRanges.splice(dragIndex, 1);
    updatedPageRanges.splice(dropIndex, 0, draggedPageRange);

    setFiles(updatedFiles);
    setPageRanges(updatedPageRanges);
  }

  function handleDeleteFile(index) {
    const updatedFiles = [...files];
    updatedFiles.splice(index, 1);
    setFiles(updatedFiles);

    const updatedPageRanges = [...pageRanges];
    updatedPageRanges.splice(index, 1);
    setPageRanges(updatedPageRanges);
  }

  function handleClearFiles() {
    setFiles([]);
    setPageRanges([]);
  }

  function handlePageRangeChange(event, index) {
    const updatedPageRanges = [...pageRanges];
    updatedPageRanges[index] = event.target.value;
    setPageRanges(updatedPageRanges);
  }

  return (
    <div className="container">
      <form onSubmit={handleMultipleSubmit}>
        <h1><FormattedMessage
          id="split.tab"
          defaultMessage="拆分檔案"
        /></h1>
        <p><FormattedMessage
          id="split.desc" values={{br: <br/>}}
          defaultMessage="說明：請選擇要拆分的檔案，並輸入拆分頁碼範圍{br}例如：1,2-3,9，則會拆成4份檔案，一頁一個檔案{br}page1為第一份；page2-3為第2份及第3份，page 9為第4份檔案"
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
              <input
                type="text"
                value={pageRanges[index]}
                onChange={(e) => handlePageRangeChange(e, index)}
                placeholder={intl.formatMessage({ id: 'split.pages.placeholder' })}
              />
              <button type="button" className="clear-button" onClick={() => handleDeleteFile(index)}><FormattedMessage
                id="common.delete.button"
                defaultMessage="删除"
              /></button>
            </li>
          ))}
        </ul>
        <button type="submit"><FormattedMessage
          id="split.submit"
          defaultMessage="拆分"
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

export default SplitTab;
