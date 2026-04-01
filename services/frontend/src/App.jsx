import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import useContestStore from './store/contestStore'
import useProblemStore from './store/problemStore'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Problems from './pages/Problems'
import ProblemSolver from './pages/ProblemSolver'
import Profile from './pages/Profile'
import Connections from './pages/Connections'
import Settings from './pages/Settings'
import TopicStats from './pages/TopicStats'
import ListPage from './pages/ListPage'
import Notes from './pages/Notes'
import Contests from './pages/Contests'
import ContestDetail from './pages/ContestDetail'
import ContestArena from './pages/ContestArena'

function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isHydrating = useAuthStore((s) => s.isHydrating)
  if (isHydrating) return null
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

export default function App() {
  const hydrateSession = useAuthStore((state) => state.hydrateSession)
  const syncUsersDirectory = useAuthStore((state) => state.syncUsersDirectory)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isHydrating = useAuthStore((state) => state.isHydrating)
  const user = useAuthStore((state) => state.user)
  const syncContests = useContestStore((state) => state.syncContests)
  const syncProblems = useProblemStore((state) => state.syncProblems)
  const syncUserSubmissions = useProblemStore((state) => state.syncUserSubmissions)

  useEffect(() => {
    hydrateSession()
  }, [hydrateSession])

  useEffect(() => {
    if (isAuthenticated && user?.username) {
      syncUsersDirectory()
      syncProblems(user.username)
      syncContests()
      syncUserSubmissions(user.username)
    }
  }, [isAuthenticated, syncContests, syncProblems, syncUserSubmissions, syncUsersDirectory, user?.username])

  if (isHydrating) {
    return null
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/problems" element={<ProtectedRoute><Problems /></ProtectedRoute>} />
      <Route path="/problems/:id" element={<ProtectedRoute><ProblemSolver /></ProtectedRoute>} />
      <Route path="/profile/:username/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
      <Route path="/profile/:username" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
      <Route path="/topic/:topicName" element={<ProtectedRoute><TopicStats /></ProtectedRoute>} />
      <Route path="/list/:listId" element={<ProtectedRoute><ListPage /></ProtectedRoute>} />
      <Route path="/contests" element={<ProtectedRoute><Contests /></ProtectedRoute>} />
      <Route path="/contests/:contestId" element={<ProtectedRoute><ContestDetail /></ProtectedRoute>} />
      <Route path="/contests/:contestId/arena" element={<ProtectedRoute><ContestArena /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
