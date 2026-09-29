import { useState } from 'react'

export function NewHorizonModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  onSave: (title: string, tag: string) => void
}) {
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState('')

  if (!isOpen) return null

  const handleSave = () => {
    if (title.trim() && tag.trim()) {
      onSave(title.trim(), tag.trim())
      setTitle('')
      setTag('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white rounded-[2.5rem] p-7 w-full max-w-md shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">
        <h2 className="text-xl font-medium text-black mb-6">Create New Horizon</h2>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Horizon Title (e.g. Launch Agency App)"
          className="w-full bg-gray-50 p-4 rounded-2xl text-black font-medium text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-black/10"
        />
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Target Tag (e.g. agency)"
          className="w-full bg-gray-50 p-4 rounded-2xl text-black font-medium text-sm mb-6 focus:outline-none focus:ring-1 focus:ring-black/10"
        />
        <button
          onClick={handleSave}
          className="w-full bg-black text-white text-sm font-medium py-4 rounded-full shadow-lg"
        >
          Save Horizon
        </button>
      </div>
    </div>
  )
}