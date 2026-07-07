import { useState, useEffect, useRef } from "react";
import { Camera, Loader2, Plus, X, Upload, Trash2 } from "lucide-react";
import { db, storage } from "./lib/firebase";
import { collection, query, getDocs, addDoc, orderBy, serverTimestamp, doc, updateDoc, where, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "./context/AuthContext";

export default function Gallery() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  
  // Instagram detail modal states
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  useEffect(() => {
    if (user?.uid) {
      fetchPhotos();
    }
  }, [user]);

  const fetchPhotos = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'photo_diaries'), where('studentID', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs
         .map(doc => ({ id: doc.id, ...doc.data() }))
         .sort((a, b) => {
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
         });
      setPhotos(data);
    } catch (error) {
      console.error("Error fetching photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        // Compress image to avoid large base64 strings if fallback is needed
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          setPhotoPreview(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!photoFile || !user?.uid) return;
    
    setUploading(true);
    try {
      let photoUrl = "";
      try {
        // 1. Try Upload to Storage
        const storageRef = ref(storage, `gallery/${Date.now()}_${photoFile.name}`);
        const uploadTask = uploadBytes(storageRef, photoFile).then(snap => getDownloadURL(snap.ref));
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
        photoUrl = await Promise.race([uploadTask, timeout]);
      } catch (storageError) {
        console.warn("Storage upload failed, falling back to compressed base64 preview.", storageError);
        // Fallback to compressed base64 preview
        photoUrl = photoPreview;
      }

      // 2. Save to Firestore
      await addDoc(collection(db, 'photo_diaries'), {
        photo_url: photoUrl,
        caption: newCaption,
        studentID: user.uid,
        timestamp: serverTimestamp()
      });
      
      setShowModal(false);
      setPhotoFile(null);
      setPhotoPreview("");
      setNewCaption("");
      fetchPhotos(); // Refresh grid
    } catch (error) {
      alert("Error posting photo. Please try again.");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };



  const handleDeletePhoto = async (photoId) => {
    if (!confirm("Are you sure you want to delete this photo entry from your diary?")) return;
    try {
      await deleteDoc(doc(db, 'photo_diaries', photoId));
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      setSelectedPhoto(null);
      alert("Photo entry deleted successfully!");
    } catch (error) {
      console.error("Error deleting photo entry:", error);
      alert("Failed to delete photo entry.");
    }
  };

  return (
    <div 
      className="space-y-6 p-6 pb-8 rounded-[36px] border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 relative"
      style={{ backgroundColor: "#E8DEE3", borderColor: "rgba(154, 131, 150, 0.25)" }}
    >
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-black" style={{ color: "#453643" }}>Photo Diary</h2>
         <button 
           onClick={() => setShowModal(true)}
           className="text-white p-3 rounded-2xl shadow-lg h-min transition-all active:scale-95 hover:opacity-90"
           style={{ backgroundColor: "#9A8396", boxShadow: "0 10px 15px -3px rgba(154, 131, 150, 0.25)" }}
         >
            <Camera className="w-5 h-5" />
         </button>
      </div>

      {/* Masonry Layout grid */}
      {loading ? (
         <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#9A8396" }} />
         </div>
      ) : photos.length === 0 ? (
         <div className="text-center p-12 bg-white/50 backdrop-blur-sm rounded-[32px] border border-dashed" style={{ borderColor: "rgba(154, 131, 150, 0.3)" }}>
            <p className="font-bold font-sans" style={{ color: "#453643" }}>No diary entries yet.</p>
            <button 
              onClick={() => setShowModal(true)}
              className="mt-3 text-xs font-black uppercase tracking-widest underline hover:opacity-80"
              style={{ color: "#9A8396" }}
            >
               Create your first entry
            </button>
         </div>
      ) : (
         <div className="grid grid-cols-2 gap-4">
           {photos.map((photo, index) => {
             const isTall = index % 2 === 0; // Staggered layout effect
             return (
                <div 
                  key={photo.id} 
                  onClick={() => setSelectedPhoto(photo)}
                  className={`relative group overflow-hidden rounded-[24px] bg-slate-100 border shadow-sm cursor-pointer transition-transform hover:-translate-y-0.5 duration-300 ${isTall ? 'h-64' : 'h-40'}`}
                  style={{ borderColor: "rgba(154, 131, 150, 0.2)" }}
                >
                  <img src={photo.photo_url} alt={photo.caption} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <p className="text-white text-xs font-black drop-shadow-sm mb-1 leading-normal">{photo.caption}</p>
                    <p className="text-white/60 text-[9px] font-black uppercase tracking-wider">
                       {photo.timestamp ? new Date(photo.timestamp.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now'}
                    </p>
                  </div>
                </div>
             )
           })}
         </div>
      )}

      {/* Post Photo Modal */}
      {showModal && (
         <div 
           className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl"
           style={{ backgroundColor: "rgba(69, 54, 67, 0.85)" }}
         >
            <div className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <h3 className="font-black text-xl uppercase tracking-tight font-sans" style={{ color: "#453643" }}>New Diary Entry</h3>
                  <button onClick={() => setShowModal(false)} className="text-slate-400 p-2 hover:bg-slate-50 hover:text-slate-600 rounded-full transition-all">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               <form onSubmit={handlePost} className="space-y-6">
                  <div 
                     onClick={() => fileInputRef.current?.click()}
                     className="w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all overflow-hidden group"
                  >
                    {photoPreview ? (
                       <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <div className="p-4 bg-white rounded-2xl shadow-sm mb-2 group-hover:scale-110 transition-transform" style={{ color: "#9A8396" }}>
                           <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest text-center" style={{ color: "#453643" }}>Add to Diary</p>
                      </>
                    )}
                    <input 
                       type="file" 
                       ref={fileInputRef}
                       onChange={handleFileChange}
                       accept="image/*"
                       className="hidden" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest ml-1" style={{ color: "rgba(69, 54, 67, 0.6)" }}>Diary Entry Caption</label>
                    <textarea 
                      value={newCaption} 
                      onChange={e => setNewCaption(e.target.value)} 
                      rows={3} 
                      placeholder="Write how you felt about your activity..." 
                      className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none resize-none focus:ring-2 transition-all font-medium text-slate-750 focus:ring-[#9A8396]/55"
                    ></textarea>
                  </div>
                  <button 
                    type="submit" 
                    disabled={uploading || !photoFile} 
                    className="w-full text-white font-black py-4 rounded-2xl flex justify-center items-center shadow-lg disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 text-xs uppercase tracking-widest"
                    style={{ backgroundColor: "#9A8396", boxShadow: "0 10px 15px -3px rgba(154, 131, 150, 0.3)" }}
                  >
                     {uploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <span>Save to Diary</span>}
                  </button>
               </form>
            </div>
         </div>
      )}

      {/* View Photo Modal */}
      {selectedPhoto && (
         <div 
           className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl"
           style={{ backgroundColor: "rgba(69, 54, 67, 0.85)" }}
           onClick={() => setSelectedPhoto(null)}
         >
            <div 
               className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
               onClick={(e) => e.stopPropagation()}
            >
               <div className="relative aspect-square bg-slate-100">
                  <img src={selectedPhoto.photo_url} alt={selectedPhoto.caption} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setSelectedPhoto(null)} 
                    className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-all"
                  >
                     <X className="w-4 h-4" />
                  </button>
               </div>
               <div className="p-6 space-y-3">
                  <div className="flex justify-between items-start">
                     <div className="flex-1 pr-4">
                        <p className="text-base font-black leading-relaxed font-sans" style={{ color: "#453643" }}>
                           {selectedPhoto.caption}
                        </p>
                        <p className="text-[10px] mt-2 font-black uppercase tracking-wider" style={{ color: "#9A8396" }}>
                           {selectedPhoto.timestamp ? new Date(selectedPhoto.timestamp.seconds * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now'}
                        </p>
                     </div>
                     <button
                       onClick={() => handleDeletePhoto(selectedPhoto.id)}
                       className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0 border border-transparent hover:border-red-100"
                       title="Delete Photo Entry"
                     >
                       <Trash2 className="w-5 h-5" />
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}
   </div>
  );
}
