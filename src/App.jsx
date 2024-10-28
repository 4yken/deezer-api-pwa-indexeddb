import React, { useState, useEffect } from 'react';

const CharlesAnsInfo = () => {
  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // Inicializar IndexedDB
  const initIndexedDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("CharlesAnsDB", 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        db.createObjectStore("artist", { keyPath: "id" });
        db.createObjectStore("topTracks", { keyPath: "id" });
      };
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = (event) => reject("Error al abrir IndexedDB:", event);
    });
  };

  // Guardar datos en IndexedDB
  const saveDataToIndexedDB = async (storeName, data) => {
    const db = await initIndexedDB();
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    store.clear(); // Limpiar datos previos
    if (Array.isArray(data)) {
      data.forEach((item) => store.add(item));
    } else {
      store.add(data);
    }
  };

  // Obtener datos de IndexedDB
  const getDataFromIndexedDB = async (storeName) => {
    const db = await initIndexedDB();
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  };

  useEffect(() => {
    const fetchArtistData = async () => {
      try {
        // Verificar datos en IndexedDB
        const storedArtist = await getDataFromIndexedDB("artist");
        const storedTracks = await getDataFromIndexedDB("topTracks");
        
        if (storedArtist.length > 0 && storedTracks.length > 0) {
          setArtist(storedArtist[0]);
          setTopTracks(storedTracks);
          setLoading(false);
          return;
        }

        const searchResponse = await fetch('/deezer/search/artist?q=charles%20ans');
        const searchData = await searchResponse.json();
        
        if (searchData.data && searchData.data.length > 0) {
          const artistId = searchData.data[0].id;
          
          const artistResponse = await fetch(`/deezer/artist/${artistId}`);
          const artistData = await artistResponse.json();
          setArtist(artistData);
          saveDataToIndexedDB("artist", artistData); // Guardamos en IndexedDB

          const tracksResponse = await fetch(`/deezer/artist/${artistId}/top?limit=5`);
          const tracksData = await tracksResponse.json();
          setTopTracks(tracksData.data);
          saveDataToIndexedDB("topTracks", tracksData.data); // Guardamos en IndexedDB
        }
        setLoading(false);
      } catch (err) {
        console.error('Error detallado:', err);
        setError('Error al cargar los datos. Por favor, intenta más tarde.');
        setLoading(false);
      }
    };

    fetchArtistData();

    // Cleanup del audio al desmontar
    return () => {
      if (audio) {
        audio.pause();
        audio.src = "";
      }
    };
  }, [audio]);

  // Manejo del evento 'beforeinstallprompt'
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault(); // Prevenir la alerta automática del navegador
      setDeferredPrompt(e); // Guardar el evento para más tarde
      setShowInstallPrompt(true); // Mostrar la alerta personalizada
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handlePlayPause = (track) => {
    if (audio) {
      audio.pause();
    }

    if (currentTrack?.id === track.id && isPlaying) {
      setIsPlaying(false);
      setCurrentTrack(null);
    } else {
      const newAudio = new Audio(track.preview);
      
      newAudio.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTrack(null);
      });

      newAudio.play();
      setAudio(newAudio);
      setCurrentTrack(track);
      setIsPlaying(true);
    }
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt(); // Mostrar la ventana de instalación
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('El usuario aceptó instalar la PWA');
        } else {
          console.log('El usuario rechazó la instalación');
        }
        setDeferredPrompt(null); // Limpiar el evento
        setShowInstallPrompt(false); // Ocultar la alerta
      });
    }
  };

  const handleAlertResponse = (response) => {
    if (response) {
      handleInstallClick(); // Si el usuario aceptó, iniciar la instalación
    } else {
      console.log('El usuario rechazó la instalación de la PWA.');
      setShowInstallPrompt(false); // Cerrar la alerta
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-semibold">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500 font-semibold">{error}</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">No se encontró información del artista</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-purple-600 to-blue-600">
          <h1 className="text-2xl font-bold text-white">Charles Ans</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          <div>
            <img 
              src={artist.picture_medium || "/api/placeholder/300/300"} 
              alt="Charles Ans"
              className="w-full rounded-lg shadow-md mb-4 object-cover"
            />
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="font-bold">Fans:</span>
                <span>{artist.nb_fan.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-bold">Álbumes:</span>
                <span>{artist.nb_album}</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Top Canciones</h2>
            <div className="space-y-3">
              {topTracks.map((track) => (
                <div 
                  key={track.id} 
                  className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <button
                    onClick={() => handlePlayPause(track)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full mr-3 ${
                      currentTrack?.id === track.id && isPlaying
                        ? 'bg-red-500 text-white'
                        : 'bg-blue-500 text-white'
                    }`}
                  >
                    {currentTrack?.id === track.id && isPlaying ? '■' : '▶'}
                  </button>
                  <div className="flex-1">
                    <p className="font-medium">{track.title}</p>
                    <p className="text-sm text-gray-600">
                      {Math.floor(track.duration / 60)}:
                      {String(track.duration % 60).padStart(2, '0')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showInstallPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center">
          <div className="alert p-4 bg-white border rounded shadow-lg">
            <p>¿Quieres instalar la PWA?</p>
            <div className="flex justify-center space-x-4 mt-4">
              <button
                onClick={() => handleAlertResponse(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-md"
              >
                Aceptar
              </button>
              <button
                onClick={() => handleAlertResponse(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharlesAnsInfo;
