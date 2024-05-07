import { getPresignedDownloadUrl } from '@/services/codeInterpreterService';
import React, { useEffect, useState } from 'react';
import { AiOutlineDownload } from 'react-icons/ai';

interface FileInfo {
  type: string;
  values: {
    file_key: string;
    presigned_url: string;
    file_size: number;
    file_key_low_res?: string;
    presigned_url_low_res?: string;
  };
}

interface Data {
    key: string;
    file_name?: string;
  }

interface ChatCodeInterpreterProps {
  file_info: FileInfo;
}

const ChatCodeInterpreter: React.FC<ChatCodeInterpreterProps> = ({ file_info }) => {
  const [fileContent, setFileContent] = useState<React.ReactNode>(<div>Loading...</div>);

  const [csvPreview, setCsvPreview] = useState<string[] | null>([]);
  const [csvOverflow, setcsvOverflow] = useState(false);
  
  const [pdfError, setPdfError] = useState(false);
  

  const downloadButton = (fileName: string, presigned_url: string) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{fileName}</span>
            <button
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={(e) => {
                    e.preventDefault();
                    const link = document.createElement('a');
                    link.href = presigned_url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }}
                title={`Download ${fileName}`}
                aria-label={`Download ${fileName}`}
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <AiOutlineDownload size={26} />
            </button>
        </div>
    );
};

  useEffect(() => {
    const fetchAndSetCsvContent = async (presignedUrl: string, fileSize: number) => {
      try {
        const response = await fetch(presignedUrl);
        if (!response.ok) throw new Error('Failed to fetch CSV content');
        const csvText = await response.text();
        
        let contentToShow =  csvText.split('\n');
        
        if (contentToShow.length > 12) {
            const previewRows = contentToShow.slice(0, 12);
            previewRows.push('...')
            setcsvOverflow(true);
            contentToShow = previewRows;
        } 
        setCsvPreview(contentToShow);
      } catch (error) {
        console.error('Error fetching or parsing CSV:', error);
        setCsvPreview(null);
      }
    };
    if (file_info.type === 'text/csv') {
        fetchAndSetCsvContent(file_info.values.presigned_url, file_info.values.file_size);
      }
  }, [file_info]);


  async function fetchPdfAndDisplay(presignedUrl: string) {
    try {
      const response = await fetch(presignedUrl);
      if (!response.ok) throw new Error('Failed to fetch PDF');
  
      const pdfBlob = await response.blob();
      return URL.createObjectURL(pdfBlob);
    
    } catch (error) {
      console.error('Error fetching or displaying PDF:', error);
      setPdfError(true);
      return ""
    }
  }
  

  const isUrlExpired = (url: string): boolean => {
    const regex = /Expires=(\d+)/;
    const matches = regex.exec(url);

    if (matches && matches[1]) {
        const expiry = matches[1];
        const expiryDate = new Date(parseInt(expiry) * 1000);
        return expiryDate <= new Date();
    }
    return true;
  };

  const getNewPresignedUrl = async (data: Data) => {
    try {
        const rawPresignedUrl = await getPresignedDownloadUrl(data);
        if (rawPresignedUrl && rawPresignedUrl.downloadUrl) { //else it failed
            return rawPresignedUrl.downloadUrl;
        }
        return null;
    } catch {
        console.log("Failed to retrieve presigned url");
        return null;
    }
  };

  useEffect(() => {
  const renderFileContent = async () => {   
    const { type, values } = file_info;
    let { presigned_url, file_key } = values;
    
    // Check for low-res image first
    let isLowRes = false;
    if (type === 'image/png' && values.presigned_url_low_res && values.file_key_low_res) { //think about download the whole file 
      presigned_url = values.presigned_url_low_res;
      file_key = values.file_key_low_res
      isLowRes = true;
    }

    const fileNameMatch = file_key.match(/-FN-([^\/]+)/);
    const fileName = fileNameMatch && fileNameMatch[1] ? fileNameMatch[1] : `Generated_${type.split('/')[1]}_file`;

    if (isUrlExpired(presigned_url)) {
      console.log("EXPIRED Presigned URL: ", presigned_url);
      //fetch new presigned url and set it 
       const urlResponse = await getNewPresignedUrl({'key': file_key, "file_name": fileName});
       if (urlResponse) {
            presigned_url = urlResponse;
            if (isLowRes) {
                file_info.values.presigned_url_low_res = urlResponse;
            } else{
                file_info.values.presigned_url = urlResponse;
            }
       }
      }

    switch (type) {
      case 'text/csv':
            const scrollableStyle: React.CSSProperties = {
                overflowX: 'auto',   
                width: '100%',       
                maxHeight: '400px',  
                display: 'block'     
            };
            
            const cellStyle: React.CSSProperties = {
                whiteSpace: 'nowrap', 
                minWidth: '80px'     
            };
            
            const renderCsvTable = () => {
                return (
                    <div style={scrollableStyle}>
                        <table>
                            <tbody>
                            {csvPreview && csvPreview.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                {row.split(',').map((cell, cellIndex) => (
                                    <td key={cellIndex} style={cellStyle}>{cell}</td>  
                                ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                );
            };
            setFileContent (
            <div>
                {downloadButton(fileName, presigned_url)}
                { !csvPreview ? <div>Loading...</div> : csvPreview.length > 0 
                            ? <div>{renderCsvTable()} {csvOverflow && <span>Download to see full content</span>} </div> 
                            : <div>Unfortunately, we are unable to display the file contents at this time...</div>}
            </div>
            );
            break;
        case 'application/pdf':
            const pdfUrl = await fetchPdfAndDisplay(presigned_url)
            setFileContent(
                <div>
                    {downloadButton(fileName, presigned_url)}
                    {pdfError ? ( <div>Unfortunately, we are unable to display the PDF at this time...</div>) 
                              : pdfUrl && pdfUrl !== "" ? 
                                        (<iframe
                                            id="Generated_PDF"
                                            width="625"
                                            height="450"
                                            src={pdfUrl}
                                            onError={() => setPdfError(true)}
                                            style={{ border: 'none' }} /> )
                                        : <div>Loading...</div>}
                             
                </div>);
                break;
        case 'binary/octet-stream': 
            setFileContent(
            <div>
                {downloadButton(fileName, presigned_url)}
                Please download to view the file contents
            </div>
            );
            break;
        case 'image/png':
            let downloadPresignedUrl = presigned_url;
            // We need to get the high quality version
            if (isLowRes) {
                if (isUrlExpired(file_info.values.presigned_url)) {
                    const urlResponse = await getNewPresignedUrl({'key': file_info.values.file_key, "file_name": fileName});
                    if (urlResponse) {
                        file_info.values.presigned_url = urlResponse;
                        downloadPresignedUrl = urlResponse;
                    }  
                }        
            }

            setFileContent(
                <div>
                {downloadButton(fileName, downloadPresignedUrl)}
                <img 
                    src={presigned_url} 
                    alt={fileName} 
                    loading="lazy" 
                    style={{ maxWidth: '100%', height: 'auto', display: 'block', marginTop: '10px' }} 
                    onError={(e) => {
                        // Display error text or handle the error as desired
                        e.currentTarget.alt = 'Unfortunately, we are unable to display the image at this time...';
                        e.currentTarget.src = ''; // Remove the broken image src or replace with a placeholder image
                    }}
                />
            </div>
            );
            break;
      default:
            setFileContent(<div>Unsupported file type</div>);
    }
  };
  renderFileContent();
}, [file_info, csvPreview]);

  return <>{fileContent}</>;
};    

export default ChatCodeInterpreter;


