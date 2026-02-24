import { useState } from 'react'
import DashboardPage from './pages/DashboardPage'
import BoardPage from './pages/BoardPage'

function App(): JSX.Element {
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null)

  if (currentBoardId) {
    return (
      <BoardPage
        boardId={currentBoardId}
        onBack={() => setCurrentBoardId(null)}
      />
    )
  }

  return <DashboardPage onOpenBoard={(id) => setCurrentBoardId(id)} />
}

export default App
