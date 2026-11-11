'use client'
import { useEffect, useRef, useState } from 'react'
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
} from 'lucide-react'

interface PDFViewerProps {
  documentUrl: string
  documentName?: string
}

export default function PDFViewer({
  documentUrl,
  documentName = 'Dokumen',
}: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pdfDocRef = useRef<any>(null)
  const renderTaskRef = useRef<any>(null)
  const fitScaleRef = useRef<number>(1.0)
  const isUserZoomedRef = useRef<boolean>(false)

  const [numPages, setNumPages] = useState<number>(1)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [rotation, setRotation] = useState<number>(0)
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<boolean>(false)

  // Panning state (drag to pan when zoomed in)
  const [isPanning, setIsPanning] = useState<boolean>(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Listen to fullscreen changes
  useEffect(() => {
    function onFullscreenChange() {
      setIsFullScreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Load PDF document using pdfjs-dist
  useEffect(() => {
    let cancelled = false

    async function loadPdf() {
      try {
        setLoading(true)
        setError(false)
        setPanOffset({ x: 0, y: 0 })
        isUserZoomedRef.current = false

        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs')
        if (typeof window !== 'undefined') {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        }

        const loadingTask = pdfjsLib.getDocument(documentUrl)
        const doc = await loadingTask.promise

        if (cancelled) return
        pdfDocRef.current = doc
        setNumPages(doc.numPages)
        setCurrentPage(1)

        // Hitung skala agar pas (fit) dengan dimensi kontainer saat pertama tampil
        const firstPage = await doc.getPage(1)
        const unscaledVp = firstPage.getViewport({ scale: 1, rotation: 0 })
        const container = containerRef.current
        let initialScale = 1.0
        if (container && container.clientWidth > 0) {
          const availW = Math.max(200, container.clientWidth - 40)
          const availH = Math.max(300, (container.clientHeight || 500) - 70)
          const fitW = availW / unscaledVp.width
          const fitH = availH / unscaledVp.height
          initialScale = Math.min(fitW, fitH)
          initialScale = Math.max(0.3, Math.min(1.5, Number(initialScale.toFixed(2))))
        }
        fitScaleRef.current = initialScale
        setScale(initialScale)
        setLoading(false)
      } catch (err: any) {
        if (!cancelled) {
          console.error('Gagal memuat PDF via PDF.js, beralih ke pratinjau cadangan:', err)
          setError(true)
          setLoading(false)
        }
      }
    }

    loadPdf()
    return () => {
      cancelled = true
    }
  }, [documentUrl])

  // ResizeObserver untuk menyesuaikan skala jika kontainer berubah ukuran dan pengguna belum zoom manual
  useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      if (!pdfDocRef.current || isUserZoomedRef.current || error || loading) return
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width <= 0 || height <= 0) return

      pdfDocRef.current
        .getPage(currentPage)
        .then((page: any) => {
          const vp = page.getViewport({ scale: 1, rotation })
          const availW = Math.max(200, width - 40)
          const availH = Math.max(300, height - 70)
          let fit = Math.min(availW / vp.width, availH / vp.height)
          fit = Math.max(0.3, Math.min(1.5, Number(fit.toFixed(2))))
          fitScaleRef.current = fit
          setScale(fit)
        })
        .catch(() => {})
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [currentPage, rotation, error, loading])

  // Render current page when page, scale, or rotation changes
  useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current || error || loading) return

    let isCurrent = true

    async function renderPage() {
      try {
        const page = await pdfDocRef.current.getPage(currentPage)
        if (!isCurrent) return

        const canvas = canvasRef.current
        if (!canvas) return
        const context = canvas.getContext('2d')
        if (!context) return

        const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
        const viewport = page.getViewport({ scale: scale * dpr, rotation })

        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.style.width = `${viewport.width / dpr}px`
        canvas.style.height = `${viewport.height / dpr}px`

        // Batalkan tugas render sebelumnya bila masih berjalan
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel()
          } catch {
            // Abaikan pembatalan
          }
        }

        const task = page.render({ canvasContext: context, viewport })
        renderTaskRef.current = task
        await task.promise
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Galat saat merender halaman:', err)
        }
      }
    }

    renderPage()
    return () => {
      isCurrent = false
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel()
        } catch {
          // Abaikan pembatalan
        }
      }
    }
  }, [currentPage, scale, rotation, error, loading])

  function handleMouseDown(e: React.MouseEvent) {
    if (scale <= 1) return
    setIsPanning(true)
    setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isPanning) return
    setPanOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
  }

  function handleMouseUp() {
    setIsPanning(false)
  }

  function toggleFullScreen() {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error)
    } else {
      document.exitFullscreen().catch(console.error)
    }
  }

  function zoomIn() {
    isUserZoomedRef.current = true
    setScale((s) => Math.min(2.5, Number((s + 0.2).toFixed(1))))
  }

  function zoomOut() {
    isUserZoomedRef.current = true
    setScale((s) => Math.max(0.3, Number((s - 0.2).toFixed(1))))
  }

  function resetZoom() {
    isUserZoomedRef.current = false
    setScale(fitScaleRef.current || 1.0)
    setRotation(0)
    setPanOffset({ x: 0, y: 0 })
  }

  function rotateClockwise() {
    setRotation((r) => (r + 90) % 360)
  }

  return (
    <div
      ref={containerRef}
      className={`pdf-viewer${isFullScreen ? ' pdf-viewer--fullscreen' : ''}`}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className={`pdf-viewport${scale > 1 ? ' pdf-viewport--panning' : ''}${
          isPanning ? ' pdf-viewport--active-pan' : ''
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        {loading && (
          <div className="pdf-loading">
            <Loader2 className="pdf-loading-spin" size={28} />
            <span>Memuat {documentName}...</span>
          </div>
        )}

        {error && (
          <div className="pdf-error">
            <iframe
              src={documentUrl}
              title={`Pratinjau ${documentName}`}
              className="pratinjau-iframe"
              allow="autoplay"
            />
          </div>
        )}

        {!error && (
          <div
            className="pdf-canvas-wrap"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              display: loading ? 'none' : 'inline-block',
            }}
          >
            <canvas ref={canvasRef} className="pdf-canvas" />
          </div>
        )}
      </div>

      {/* Floating Toolbar Pill */}
      {!loading && !error && (
        <div className="pdf-toolbar" role="toolbar" aria-label="Alat penampil dokumen">
          {numPages > 1 && (
            <>
              <button
                type="button"
                className="pdf-toolbar-btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                title="Halaman sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="pdf-toolbar-page">
                {currentPage} / {numPages}
              </span>
              <button
                type="button"
                className="pdf-toolbar-btn"
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                title="Halaman berikutnya"
              >
                <ChevronRight size={16} />
              </button>
              <div className="pdf-toolbar-divider" />
            </>
          )}

          <button
            type="button"
            className="pdf-toolbar-btn"
            onClick={rotateClockwise}
            title="Putar 90° searah jarum jam"
          >
            <RotateCw size={15} />
          </button>

          <button
            type="button"
            className="pdf-toolbar-btn"
            onClick={zoomOut}
            disabled={scale <= 0.3}
            title="Perkecil"
          >
            <ZoomOut size={15} />
          </button>

          <input
            type="range"
            min="0.3"
            max="2.5"
            step="0.05"
            value={scale}
            onChange={(e) => {
              isUserZoomedRef.current = true
              setScale(parseFloat(e.target.value))
            }}
            className="pdf-toolbar-slider"
            title="Skala perbesaran"
          />

          <button
            type="button"
            className="pdf-toolbar-btn"
            onClick={zoomIn}
            disabled={scale >= 2.5}
            title="Perbesar"
          >
            <ZoomIn size={15} />
          </button>

          <button
            type="button"
            className="pdf-toolbar-badge"
            onClick={resetZoom}
            title="Klik untuk kembalikan ke 100%"
          >
            {Math.round(scale * 100)}%
          </button>

          <div className="pdf-toolbar-divider" />

          <button
            type="button"
            className="pdf-toolbar-btn"
            onClick={toggleFullScreen}
            title={isFullScreen ? 'Keluar layar penuh' : 'Layar penuh'}
          >
            {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      )}
    </div>
  )
}
