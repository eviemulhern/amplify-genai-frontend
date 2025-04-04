import { getFileDownloadUrl } from "@/services/fileService";
import { DataSource } from "@/types/chat";
import { IMAGE_FILE_TYPES } from "./const";

export const downloadDataSourceFile = async (dataSource: DataSource, groupId: string | undefined = undefined) => {
    const response = await getFileDownloadUrl(dataSource.id, groupId); // support images too 
    if (!response.success) {
        alert("Error downloading file. Please try again.");
        return;
    }
    if (dataSource.type && IMAGE_FILE_TYPES.includes(dataSource.type)) {
        downloadImageFromPresignedUrl(response.downloadUrl, dataSource.name || 'image', dataSource.type || '');
    } else {
        const link = document.createElement('a');
        link.href = response.downloadUrl;
        link.download = dataSource.name || 'File';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


async function downloadImageFromPresignedUrl(presignedUrl: string, filename: string, fileType: string): Promise<void> {
    try {
      const response = await fetch(presignedUrl);
      if (!response.ok) throw new Error('Network response was not ok');

      const base64Data = await response.text(); 
  
      const byteCharacters = window.atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileType }); 
  
      // Trigger the download
      const blobUrl = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.setAttribute('download', filename);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Cleanup
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }
  

  export async function fetchFile(presignedUrl: string) {
    if (!presignedUrl) return null;
    try {
      const response = await fetch(presignedUrl);
      if (!response.ok) throw new Error('Failed to fetch file');
  
      const fileBlob = await response.blob();

      return URL.createObjectURL(fileBlob);
    } catch (error) {
      console.error('Error fetching or displaying file:', error);
      return "";
    }
  }