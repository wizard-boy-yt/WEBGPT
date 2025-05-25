"use client"

interface Tab {
  id: string
  label: string
  content: string
}

interface EditorProps {
  tabs: Tab[]
  activeTab: string
  setActiveTab: (id: string) => void
  updateTabContent: (id: string, content: string) => void
  isDark: boolean
}

export default function Editor({
  tabs,
  activeTab,
  setActiveTab,
  updateTabContent,
  isDark,
}: EditorProps) {
  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="flex border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 ${
              activeTab === tab.id
                ? isDark
                  ? 'bg-gray-800 text-white'
                  : 'bg-white text-gray-900'
                : isDark
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <textarea
        value={tabs.find((tab) => tab.id === activeTab)?.content || ''}
        onChange={(e) => updateTabContent(activeTab, e.target.value)}
        className={`flex-1 w-full p-4 font-mono text-sm focus:outline-none ${
          isDark
            ? 'bg-gray-900 text-gray-300'
            : 'bg-white text-gray-900'
        }`}
        spellCheck={false}
      />
    </div>
  )
}
