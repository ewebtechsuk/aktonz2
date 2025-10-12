import { useCallback, useEffect, useRef, useState } from 'react';
import styles from '../../styles/Account.module.css';

const DEFAULT_CENTER = [51.5074, -0.1278];

function normalisePoint(point) {
  if (!point || typeof point !== 'object') {
    return null;
  }
  const lat = Number(point.lat ?? point.latitude ?? (Array.isArray(point) ? point[0] : null));
  const lng = Number(point.lng ?? point.longitude ?? (Array.isArray(point) ? point[1] : null));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

function createAreaId(prefix = 'area') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function NeighbourhoodMap({
  value = [],
  onChange,
  mapId = 'neighbourhood-map',
  editingAreaId = null,
  onCancelEdit,
  onEditingComplete,
}) {
  const [mode, setMode] = useState('idle');
  const [draftPoints, setDraftPoints] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');

  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const layersRef = useRef(new Map());
  const draftLayerRef = useRef(null);
  const modeRef = useRef('idle');
  const valueRef = useRef(value);
  const editingAreaIdRef = useRef(editingAreaId);
  const onChangeRef = useRef(onChange);
  const onCancelEditRef = useRef(onCancelEdit);
  const onEditingCompleteRef = useRef(onEditingComplete);
  const draftPointsRef = useRef(draftPoints);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    editingAreaIdRef.current = editingAreaId;
  }, [editingAreaId]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onCancelEditRef.current = onCancelEdit;
  }, [onCancelEdit]);

  useEffect(() => {
    onEditingCompleteRef.current = onEditingComplete;
  }, [onEditingComplete]);

  useEffect(() => {
    draftPointsRef.current = draftPoints;
  }, [draftPoints]);

  const handleProcessClick = useCallback(
    ({ lat, lng }) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }
      const currentMode = modeRef.current;
      const currentValue = valueRef.current || [];
      const editingId = editingAreaIdRef.current;

      if (currentMode === 'pin') {
        const id = createAreaId('pin');
        const next = [...currentValue, { id, type: 'pin', coordinates: [{ lat, lng }] }];
        onChangeRef.current?.(next);
        setMode('idle');
        modeRef.current = 'idle';
        setStatusMessage('');
        return;
      }

      if (currentMode === 'edit-pin' && editingId) {
        const next = currentValue.map((area) => {
          if (area.id !== editingId) {
            return area;
          }
          return { ...area, coordinates: [{ lat, lng }] };
        });
        onChangeRef.current?.(next);
        setMode('idle');
        modeRef.current = 'idle';
        setStatusMessage('');
        onEditingCompleteRef.current?.(editingId);
        return;
      }

      if (currentMode === 'polygon' || currentMode === 'polygon-edit') {
        setDraftPoints((prev) => [...prev, { lat, lng }]);
      }
    },
    []
  );

  const handleLeafletClick = useCallback(
    (event) => {
      const latlng = event?.latlng;
      if (!latlng) {
        return;
      }
      handleProcessClick({ lat: latlng.lat, lng: latlng.lng });
    },
    [handleProcessClick]
  );

  useEffect(() => {
    let cancelled = false;
    async function initMap() {
      if (typeof window === 'undefined') {
        return;
      }
      const container = document.getElementById(mapId);
      if (!container) {
        return;
      }
      const { default: L } = await import('leaflet');
      if (cancelled) {
        return;
      }
      leafletRef.current = L;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      const map = L.map(mapId, { preferCanvas: true }).setView(DEFAULT_CENTER, 12);
      mapRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.on('click', handleLeafletClick);
    }

    initMap();

    return () => {
      cancelled = true;
      const map = mapRef.current;
      if (map) {
        map.off('click', handleLeafletClick);
        map.remove();
        mapRef.current = null;
      }
      layersRef.current.forEach((entry) => {
        entry.layer?.remove?.();
      });
      layersRef.current.clear();
      if (draftLayerRef.current) {
        draftLayerRef.current.remove?.();
        draftLayerRef.current = null;
      }
      leafletRef.current = null;
    };
  }, [handleLeafletClick, mapId]);

  const refreshLayers = useCallback(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) {
      return;
    }

    const seen = new Set();
    const editingId = editingAreaIdRef.current;

    (valueRef.current || []).forEach((area) => {
      if (!area || typeof area !== 'object') {
        return;
      }
      const id = area.id;
      if (!id) {
        return;
      }
      seen.add(id);
      const existing = layersRef.current.get(id);
      if (area.type === 'pin') {
        const point = normalisePoint(area.coordinates?.[0]);
        if (!point) {
          if (existing) {
            existing.layer?.remove?.();
            layersRef.current.delete(id);
          }
          return;
        }
        if (existing && existing.type === 'pin') {
          existing.layer.setLatLng([point.lat, point.lng]);
        } else {
          existing?.layer?.remove?.();
          const marker = L.marker([point.lat, point.lng]);
          marker.addTo(map);
          layersRef.current.set(id, { type: 'pin', layer: marker });
        }
        return;
      }

      if (area.type === 'polygon') {
        const points = Array.isArray(area.coordinates)
          ? area.coordinates.map((entry) => normalisePoint(entry)).filter(Boolean)
          : [];
        if (points.length < 3) {
          if (existing) {
            existing.layer?.remove?.();
            layersRef.current.delete(id);
          }
          return;
        }
        const latlngs = points.map((point) => [point.lat, point.lng]);
        const color = id === editingId ? '#ff6b4a' : '#1b2840';
        if (existing && existing.type === 'polygon') {
          existing.layer.setLatLngs(latlngs);
          existing.layer.setStyle?.({ color, fillColor: color });
        } else {
          existing?.layer?.remove?.();
          const polygon = L.polygon(latlngs, {
            color,
            fillColor: color,
            fillOpacity: 0.1,
            weight: 2,
          });
          polygon.addTo(map);
          layersRef.current.set(id, { type: 'polygon', layer: polygon });
        }
      }
    });

    Array.from(layersRef.current.keys()).forEach((id) => {
      if (!seen.has(id)) {
        const entry = layersRef.current.get(id);
        entry?.layer?.remove?.();
        layersRef.current.delete(id);
      }
    });
  }, []);

  useEffect(() => {
    refreshLayers();
  }, [value, refreshLayers]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) {
      return;
    }
    const points = draftPointsRef.current || [];
    if (!points.length) {
      if (draftLayerRef.current) {
        draftLayerRef.current.remove?.();
        draftLayerRef.current = null;
      }
      return;
    }
    const latlngs = points.map((point) => [point.lat, point.lng]);
    if (!draftLayerRef.current) {
      draftLayerRef.current = L.polyline(latlngs, {
        color: '#ff6b4a',
        weight: 2,
        dashArray: '6 8',
      }).addTo(map);
      return;
    }
    draftLayerRef.current.setLatLngs(latlngs);
  }, [draftPoints]);

  const setModeWithStatus = useCallback((nextMode) => {
    modeRef.current = nextMode;
    setMode(nextMode);
    switch (nextMode) {
      case 'pin':
        setStatusMessage('Click on the map to drop a pin.');
        break;
      case 'polygon':
        setStatusMessage('Click to outline the neighbourhood. Add at least three points then finish.');
        break;
      case 'edit-pin':
        setStatusMessage('Click a new location for your pin.');
        break;
      case 'polygon-edit':
        setStatusMessage('Adjust the area by clicking to add points then choose Finish area.');
        break;
      default:
        setStatusMessage('');
    }
  }, []);

  const startPinMode = useCallback(() => {
    onCancelEditRef.current?.();
    setDraftPoints([]);
    setModeWithStatus('pin');
  }, [setModeWithStatus]);

  const startPolygonMode = useCallback(() => {
    onCancelEditRef.current?.();
    setDraftPoints([]);
    setModeWithStatus('polygon');
  }, [setModeWithStatus]);

  const resetDraft = useCallback(
    (notifyCancel = false) => {
      setDraftPoints([]);
      if (draftLayerRef.current) {
        draftLayerRef.current.remove?.();
        draftLayerRef.current = null;
      }
      const currentMode = modeRef.current;
      if ((currentMode === 'polygon' || currentMode === 'polygon-edit') && notifyCancel) {
        onCancelEditRef.current?.();
      }
      if (currentMode === 'polygon' || currentMode === 'polygon-edit') {
        setModeWithStatus('idle');
      }
    },
    [setModeWithStatus]
  );

  const cancelDraft = useCallback(() => {
    resetDraft(true);
  }, [resetDraft]);

  const finishPolygon = useCallback(() => {
    const points = draftPointsRef.current || [];
    if (points.length < 3) {
      return;
    }
    const editingId = editingAreaIdRef.current;
    const currentValue = valueRef.current || [];
    const payload = points.map((point) => ({ lat: point.lat, lng: point.lng }));
    let next;
    if (modeRef.current === 'polygon-edit' && editingId) {
      next = currentValue.map((area) => {
        if (area.id !== editingId) {
          return area;
        }
        return { ...area, coordinates: payload };
      });
      onChangeRef.current?.(next);
      onEditingCompleteRef.current?.(editingId);
    } else {
      const id = createAreaId('polygon');
      next = [...currentValue, { id, type: 'polygon', coordinates: payload }];
      onChangeRef.current?.(next);
    }
    resetDraft(false);
    setModeWithStatus('idle');
  }, [resetDraft, setModeWithStatus]);

  useEffect(() => {
    const editingId = editingAreaId;
    if (!editingId) {
      if (modeRef.current === 'edit-pin' || modeRef.current === 'polygon-edit') {
        setModeWithStatus('idle');
        setDraftPoints([]);
      }
      return;
    }
    const target = (value || []).find((area) => area.id === editingId);
    if (!target) {
      setModeWithStatus('idle');
      setDraftPoints([]);
      return;
    }
    if (target.type === 'pin') {
      setDraftPoints([]);
      setModeWithStatus('edit-pin');
      return;
    }
    if (target.type === 'polygon') {
      const points = Array.isArray(target.coordinates)
        ? target.coordinates.map((entry) => normalisePoint(entry)).filter(Boolean)
        : [];
      setDraftPoints(points);
      setModeWithStatus('polygon-edit');
    }
  }, [editingAreaId, value, setModeWithStatus]);

  const handleContainerClick = useCallback(
    (event) => {
      if (mapRef.current) {
        return;
      }
      const bounds = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const lat = DEFAULT_CENTER[0] + (y / Math.max(bounds.height, 1) - 0.5) * 0.1;
      const lng = DEFAULT_CENTER[1] + (x / Math.max(bounds.width, 1) - 0.5) * 0.1;
      handleProcessClick({ lat, lng });
    },
    [handleProcessClick]
  );

  const polygonActive = mode === 'polygon' || mode === 'polygon-edit';
  const hasDraft = draftPoints.length > 0;

  const finishDisabled = !(draftPoints.length >= 3);

  return (
    <div className={styles.mapSurface}>
      <div className={styles.mapToolbar}>
        <button
          type="button"
          className={`${styles.mapMode} ${mode === 'pin' ? styles.mapModeActive : ''}`}
          onClick={startPinMode}
        >
          Drop pin
        </button>
        <button
          type="button"
          className={`${styles.mapMode} ${polygonActive ? styles.mapModeActive : ''}`}
          onClick={startPolygonMode}
        >
          Draw area
        </button>
        {(polygonActive && hasDraft) || mode === 'polygon-edit' ? (
          <>
            <button
              type="button"
              className={`${styles.mapMode} ${styles.mapActionButton}`}
              onClick={finishPolygon}
              disabled={finishDisabled}
            >
              Finish area
            </button>
            <button
              type="button"
              className={`${styles.mapMode} ${styles.mapActionButton}`}
              onClick={cancelDraft}
            >
              Cancel
            </button>
          </>
        ) : null}
        {mode === 'edit-pin' ? (
          <button
            type="button"
            className={`${styles.mapMode} ${styles.mapActionButton}`}
            onClick={() => {
              onCancelEditRef.current?.();
              setModeWithStatus('idle');
            }}
          >
            Cancel edit
          </button>
        ) : null}
      </div>
      <div
        id={mapId}
        data-testid="area-map-canvas"
        className={styles.mapCanvas}
        role="application"
        onClick={handleContainerClick}
      />
      {statusMessage ? <div className={styles.mapStatus}>{statusMessage}</div> : null}
    </div>
  );
}
