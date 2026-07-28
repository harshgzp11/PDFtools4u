import React, { useState, useRef, useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Download, RotateCw } from 'lucide-react';
import DragDropZone from '../components/ui/DragDropZone';

export default function ImageCropRotate() {
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [rotation, setRotation] = useState(0);
  const [resultImg, setResultImg] = useState('');

  const onSelectFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setCrop(undefined); // Reset crop
      setRotation(0);
      setResultImg('');
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  useEffect(() => {
    // Generate new image whenever crop or rotation changes
    if (imgSrc && imgRef.current && completedCrop?.width && completedCrop?.height) {
      const canvas = document.createElement('canvas');
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
      
      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle rotation and drawing
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      const isRotated = rotation === 90 || rotation === 270;
      const drawWidth = isRotated ? canvas.height : canvas.width;
      const drawHeight = isRotated ? canvas.width : canvas.height;

      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        (canvas.width - drawWidth) / 2,
        (canvas.height - drawHeight) / 2,
        drawWidth,
        drawHeight
      );

      setResultImg(canvas.toDataURL('image/png'));
    } else if (imgSrc && imgRef.current && rotation !== 0) {
       // Just rotation, no crop
       const canvas = document.createElement('canvas');
       const isRotated = rotation === 90 || rotation === 270;
       
       canvas.width = isRotated ? imgRef.current.naturalHeight : imgRef.current.naturalWidth;
       canvas.height = isRotated ? imgRef.current.naturalWidth : imgRef.current.naturalHeight;
       
       const ctx = canvas.getContext('2d');
       if (!ctx) return;

       ctx.translate(canvas.width / 2, canvas.height / 2);
       ctx.rotate((rotation * Math.PI) / 180);
       ctx.drawImage(
         imgRef.current,
         -imgRef.current.naturalWidth / 2,
         -imgRef.current.naturalHeight / 2
       );
       
       setResultImg(canvas.toDataURL('image/png'));
    }
  }, [completedCrop, rotation, imgSrc]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Crop & Rotate Image</h2>
        <p className="text-gray-500">Easily crop specific areas or rotate your images.</p>
      </div>

      {!imgSrc && (
        <div className="max-w-xl mx-auto">
           <DragDropZone 
              accept="image/*"
              onFileSelect={onSelectFile}
              label="Drag & drop an image here"
            />
        </div>
      )}

      {imgSrc && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
               <span className="text-sm font-medium text-gray-700">Editor</span>
               <div className="flex gap-2">
                 <button onClick={handleRotate} className="px-3 py-1.5 bg-white border border-gray-300 rounded shadow-sm text-sm font-medium hover:bg-gray-50 flex items-center gap-1">
                   <RotateCw className="w-4 h-4" /> Rotate 90°
                 </button>
                 <button onClick={() => setImgSrc('')} className="px-3 py-1.5 bg-white border border-gray-300 rounded shadow-sm text-sm font-medium hover:bg-gray-50 text-red-600">
                   Clear
                 </button>
               </div>
            </div>

            <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center min-h-[300px]">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imgSrc}
                  style={{ transform: `rotate(${rotation}deg)`, maxHeight: '500px' }}
                  className="transition-transform duration-200"
                />
              </ReactCrop>
            </div>
            <p className="text-xs text-gray-500 text-center">Drag to select area to crop</p>
          </div>

          <div className="space-y-4">
             <div className="p-3">
               <span className="text-sm font-medium text-gray-700">Result Preview</span>
             </div>
             
             <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center min-h-[300px] p-4">
               {resultImg ? (
                 <img src={resultImg} alt="Cropped" className="max-w-full max-h-[500px] object-contain drop-shadow-md" />
               ) : (
                 <span className="text-gray-400 text-sm">Select an area to crop or rotate the image</span>
               )}
             </div>

             {resultImg && (
               <a 
                 href={resultImg}
                 download="modified_image.png"
                 className="w-full px-6 py-3 bg-blue-600 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white hover:bg-blue-700 flex items-center justify-center gap-2"
               >
                 <Download className="w-5 h-5"/> Download Image
               </a>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
