import { useState } from 'react'

interface NewHorizonModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    title: string
    description?: string
    targetTag: string
    horizonType: 'PROJECT' | 'QUARTERLY'
    quarter?: string
    startDate?: string
    targetDate?: string
    keyResults: string[]
  }) => void
}

function currentQuarter(): string {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3) + 1
  return `${now.getFullYear()}-Q${q}`
}

function quarterStart(): string {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3)
  const start = new Date(now.getFullYear(), q * 3, 1)
  return start.toISOString().slice(0, 10)
}

function quarterEnd(): string {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3)
  const end = new Date(now.getFullYear(), q * 3 + 3, 0)
  return end.toISOString().slice(0, 10)
}

export function NewHorizonModal({ isOpen, onClose, onSave }: NewHorizonModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [targetTag, setTargetTag] = useState('')
  const [horizonType, setHorizonType] = useState<'PROJECT' | 'QUARTERLY'>('PROJECT')
  const [quarter, setQuarter] = useState(currentQuarter())
  const [startDate, setStartDate] = useState(quarterStart())
  const [targetDate, setTargetDate] = useState(quarterEnd())
  const [keyResults, setKeyResults] = useState<string[]>([''])
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const addKeyResult = () => setKeyResults((prev) => [...prev, ''])
  const removeKeyResult = (i: number) =>
    setKeyResults((prev) => prev.filter((_, idx) => idx !== i))
  const updateKeyResult = (i: number, value: string) =>
    setKeyResults((prev) => prev.map((kr, idx) => (idx === i ? value : kr)))

  const handleSave = () => {
    if (!title.trim() || !targetTag.trim()) {
      setError('Title and target tag are required.')
      return
    }

    const cleanKeyResults = keyResults.map((kr) => kr.trim()).filter(Boolean)

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      targetTag: targetTag.trim().toLowerCase(),
      horizonType,
      quarter: horizonType === 'QUARTERLY' ? quarter : undefined,
      startDate: horizonType === 'QUARTERLY' ? startDate : undefined,
      targetDate: horizonType === 'QUARTERLY' ? targetDate : undefined,
      keyResults: cleanKeyResults,
    })

    setTitle('')
    setDescription('')
    setTargetTag('')
    setHorizonType('PROJECT')
    setKeyResults([''])
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-5">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-[2.5rem] p-7 w-full max-w-md shadow-2xl relative z-10 animate-in slide-in-from-bottom-10 fade-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-black tracking-tight">New Horizon</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-black/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-black/5 p-1 rounded-2xl flex mb-5">
          {(['PROJECT', 'QUARTERLY'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setHorizonType(type)}
              className={`flex-1 py-2.5 text-[12px] font-semibold rounded-xl transition-all ${
                horizonType === type ? 'bg-black text-white shadow-sm' : 'text-black/50'
              }`}
            >
              {type === 'PROJECT' ? 'Project' : 'Quarterly Goal'}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Horizon title (e.g. Launch agency site)"
          className="w-full bg-gray-50 p-4 rounded-2xl text-black font-medium text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-black/10"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Why does this matter? (optional)"
          rows={2}
          className="w-full bg-gray-50 p-4 rounded-2xl text-black font-medium text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-black/10 resize-none"
        />

        <input
          type="text"
          value={targetTag}
          onChange={(e) => setTargetTag(e.target.value)}
          placeholder="Target tag (e.g. agency)"
          className="w-full bg-gray-50 p-4 rounded-2xl text-black font-medium text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-black/10"
        />

        {horizonType === 'QUARTERLY' && (
          <div className="mb-4 bg-[#F4F3F0] rounded-2xl p-4">
            <input
              type="text"
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              placeholder="2026-Q4"
              className="w-full bg-white p-3 rounded-xl text-black font-medium text-sm mb-3 focus:outline-none focus:ring-1 focus:ring-black/10"
            />
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 bg-white p-3 rounded-xl text-black font-medium text-xs focus:outline-none"
              />
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="flex-1 bg-white p-3 rounded-xl text-black font-medium text-xs focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="mb-5">
          <div className="flex items-center justify-between mb-2 px-1">
            <label className="text-[11px] font-medium text-black/40 uppercase tracking-wider">
              Key Results
            </label>
            <button
              type="button"
              onClick={addKeyResult}
              className="text-[11px] font-semibold text-black bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-full transition-colors"
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {keyResults.map((kr, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={kr}
                  onChange={(e) => updateKeyResult(i, e.target.value)}
                  placeholder={`Key result ${i + 1}`}
                  className="flex-1 bg-gray-50 p-3 rounded-xl text-black font-medium text-sm focus:outline-none focus:ring-1 focus:ring-black/10"
                />
                {keyResults.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeKeyResult(i)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-black/40 flex items-center justify-center transition-colors shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-[12px] font-medium text-rose-600 mb-3 text-center">{error}</p>
        )}

        <button
          onClick={handleSave}
          className="w-full bg-black text-white text-[15px] font-medium py-4 rounded-full shadow-lg hover:bg-black/90 transition-colors"
        >
          Save Horizon
        </button>
      </div>
    </div>
  )
}